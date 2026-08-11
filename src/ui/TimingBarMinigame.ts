import Phaser from 'phaser';
import type { MinigameResult } from './minigameTypes';

// 缝合时机条小游戏（M4）。
// 游标在横条上来回移动，玩家在绿区内按空格/回车/E 即成功。
// 输出仍是 StatDelta + flag，与现有事件系统无缝对接——不引入新状态机。

export class TimingBarMinigame {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private cursor!: Phaser.GameObjects.Rectangle;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;
  private dir = 1;
  private x = 0;
  private readonly barX: number;
  private readonly barW = 420;
  private readonly greenL: number;
  private readonly greenR: number;
  private readonly speed: number;

  constructor(
    scene: Phaser.Scene,
    opts?: { title?: string; speed?: number; greenWidth?: number },
  ) {
    this.scene = scene;
    this.speed = opts?.speed ?? 220;
    const greenW = opts?.greenWidth ?? 70;
    this.barX = 480 - this.barW / 2;
    // 绿区偏右一点：完全居中会太容易靠节奏预测
    this.greenL = this.barW * 0.55 - greenW / 2;
    this.greenR = this.greenL + greenW;

    this.root = scene.add.container(0, 0).setDepth(200);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.72);
    g.fillRect(0, 0, 960, 540);
    g.fillStyle(0x1a2333, 0.96);
    g.fillRoundedRect(180, 140, 600, 240, 8);
    g.lineStyle(2, 0x4fc3f7, 0.9);
    g.strokeRoundedRect(180, 140, 600, 240, 8);
    this.root.add(g);

    const title = scene.add.text(480, 160, opts?.title ?? '缝合 · 在绿区落针', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    const touch = scene.sys.game.device.input.touch;
    const hint = scene.add.text(480, 190, touch ? '观察游标位置，点击下方“落针”' : '空格 / 回车 / E  ·  落针', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#9aa0b5',
    }).setOrigin(0.5, 0);
    this.root.add([title, hint]);

    // 横条背景
    const barY = 280;
    const bar = scene.add.graphics();
    bar.fillStyle(0x2a3550, 1);
    bar.fillRect(this.barX, barY, this.barW, 18);
    // 绿区
    bar.fillStyle(0x69f0ae, 0.95);
    bar.fillRect(this.barX + this.greenL, barY, greenW, 18);
    // 完美中心线
    bar.fillStyle(0xffffff, 0.7);
    bar.fillRect(this.barX + (this.greenL + this.greenR) / 2 - 1, barY - 3, 2, 24);
    this.root.add(bar);

    this.cursor = scene.add.rectangle(this.barX, barY + 9, 6, 28, 0xffeb3b).setOrigin(0.5);
    this.root.add(this.cursor);

    const legend = scene.add.text(480, 330, '绿区命中 = 成功缝合　　偏出 = 打结失败', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#cfd8e8',
    }).setOrigin(0.5, 0);
    this.root.add(legend);

    if (touch) {
      const touchButton = scene.add.text(480, 362, '落针', {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#ffffff',
        backgroundColor: '#1976d2', padding: { x: 30, y: 8 },
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      touchButton.on('pointerdown', () => this.resolve());
      this.root.add(touchButton);
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        this.resolve();
      }
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  update(_time: number, delta: number) {
    if (this.closed) return;
    this.x += this.dir * this.speed * (delta / 1000);
    if (this.x <= 0) { this.x = 0; this.dir = 1; }
    if (this.x >= this.barW) { this.x = this.barW; this.dir = -1; }
    this.cursor.x = this.barX + this.x;
  }

  private resolve() {
    if (this.closed) return;
    this.closed = true;
    const pos = this.x;
    const mid = (this.greenL + this.greenR) / 2;
    let result: MinigameResult;
    if (pos >= this.greenL && pos <= this.greenR) {
      const perfect = Math.abs(pos - mid) <= 8;
      if (perfect) {
        result = {
          grade: 'perfect',
          delta: { clinical: 6, knowledge: 3, reputation: 2, stamina: -4 },
          flagSet: 'suture_perfect',
          consequence: '针脚匀称，带教点头："这手，稳。"',
        };
      } else {
        result = {
          grade: 'good',
          delta: { clinical: 4, knowledge: 2, stamina: -5 },
          flagSet: 'suture_done',
          consequence: '缝上了。不漂亮，但结实。',
        };
      }
    } else {
      result = {
        grade: 'miss',
        delta: { clinical: 1, reputation: -1, stamina: -6, sanity: -3 },
        flagSet: 'suture_failed',
        consequence: '线头打成死结。带教接过针持："看着，再来一次。"',
      };
    }
    this.onDone?.(result);
    this.destroy();
  }

  private onDone: ((r: MinigameResult) => void) | null = null;

  play(): Promise<MinigameResult> {
    return new Promise(resolve => { this.onDone = resolve; });
  }

  destroy() {
    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.root.destroy(true);
  }
}
