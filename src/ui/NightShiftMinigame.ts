import Phaser from 'phaser';
import type { MinigameResult } from './minigameTypes';
import { sound } from '../audio/sound';

// 夜班呼叫铃（M4）：打地鼠式。
// 随机位置亮起呼叫，限时内按对应数字键响应；漏接扣分。
// 映射：成功响应 → 体力消耗但声望/临床；漏接过多 → 心理与声望双杀。

const DURATION_MS = 18000;
const SPAWN_EVERY = 1400;
const CALL_TTL = 1600;
const SLOTS = [
  { x: 280, y: 230, key: '1' },
  { x: 480, y: 230, key: '2' },
  { x: 680, y: 230, key: '3' },
  { x: 380, y: 330, key: '4' },
  { x: 580, y: 330, key: '5' },
];

type Call = {
  slot: number;
  born: number;
  node: Phaser.GameObjects.Container;
  alive: boolean;
};

export class NightShiftMinigame {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;
  private startedAt = 0;
  private nextSpawn = 0;
  private calls: Call[] = [];
  private handled = 0;
  private missed = 0;
  private status!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, opts?: { title?: string }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(200);

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.72);
    g.fillRect(0, 0, 960, 540);
    g.fillStyle(0x101820, 0.96);
    g.fillRoundedRect(160, 100, 640, 340, 8);
    g.lineStyle(2, 0xffd600, 0.9);
    g.strokeRoundedRect(160, 100, 640, 340, 8);
    this.root.add(g);

    const title = scene.add.text(480, 118, opts?.title ?? '夜班 · 呼叫铃', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    const touch = scene.sys.game.device.input.touch;
    const hint = scene.add.text(480, 148, touch ? '点击亮起的床位响应呼叫 · 漏接会扣分' : '数字键 1–5 响应对应床位呼叫 · 漏接会扣分', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#9aa0b5',
    }).setOrigin(0.5, 0);
    this.root.add([title, hint]);

    // 床位占位
    SLOTS.forEach((s, slot) => {
      const bed = scene.add.rectangle(s.x, s.y, 100, 64, 0x1e2a38).setStrokeStyle(1, 0x455a64);
      if (touch) {
        bed.setInteractive({ cursor: 'pointer' });
        bed.on('pointerdown', () => this.tryHandle(slot));
      }
      const lab = scene.add.text(s.x, s.y + 28, `[${s.key}]`, {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#78909c',
      }).setOrigin(0.5, 0);
      this.root.add([bed, lab]);
    });

    this.status = scene.add.text(480, 390, '待命中……', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffe082',
    }).setOrigin(0.5, 0);
    this.timerBar = scene.add.rectangle(180, 420, 600, 10, 0xffd600).setOrigin(0, 0.5);
    this.root.add([this.status, scene.add.rectangle(480, 420, 600, 10, 0x2a3550).setOrigin(0.5), this.timerBar]);

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed) return;
      const n = e.code.startsWith('Digit') ? e.code.slice(5) : '';
      if (!n) return;
      const slot = SLOTS.findIndex(s => s.key === n);
      if (slot < 0) return;
      e.preventDefault();
      this.tryHandle(slot);
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    this.startedAt = performance.now();
    this.nextSpawn = this.startedAt + 500;
  }

  update(_time: number, _delta: number) {
    if (this.closed) return;
    const now = performance.now();
    const elapsed = now - this.startedAt;
    const left = Math.max(0, 1 - elapsed / DURATION_MS);
    this.timerBar.width = 600 * left;
    if (left < 0.25) this.timerBar.setFillStyle(0xff5252);

    // 过期呼叫
    for (const c of this.calls) {
      if (!c.alive) continue;
      if (now - c.born > CALL_TTL) {
        c.alive = false;
        c.node.destroy(true);
        this.missed++;
        this.status.setText(`漏接！  响应 ${this.handled} · 漏接 ${this.missed}`).setColor('#ff8a80');
        sound.bad();
      }
    }
    this.calls = this.calls.filter(c => c.alive);

    if (elapsed >= DURATION_MS) { this.finish(); return; }

    if (now >= this.nextSpawn) {
      this.spawn(now);
      this.nextSpawn = now + SPAWN_EVERY * (0.75 + Math.random() * 0.5);
    }
  }

  private spawn(now: number) {
    // 找空槽
    const busy = new Set(this.calls.map(c => c.slot));
    const free = SLOTS.map((_, i) => i).filter(i => !busy.has(i));
    if (free.length === 0) return;
    const slot = free[Math.floor(Math.random() * free.length)];
    const s = SLOTS[slot];

    const node = this.scene.add.container(s.x, s.y);
    const ring = this.scene.add.circle(0, 0, 36, 0xff5252, 0.35).setStrokeStyle(3, 0xff8a80);
    const txt = this.scene.add.text(0, 0, '呼叫!', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    node.add([ring, txt]);
    this.root.add(node);
    this.scene.tweens.add({
      targets: ring, scaleX: 1.25, scaleY: 1.25, alpha: 0.15,
      duration: 400, yoyo: true, repeat: -1,
    });
    this.calls.push({ slot, born: now, node, alive: true });
    sound.news();
  }

  private tryHandle(slot: number) {
    const c = this.calls.find(x => x.alive && x.slot === slot);
    if (!c) return;
    c.alive = false;
    c.node.destroy(true);
    this.handled++;
    this.status.setText(`已响应  响应 ${this.handled} · 漏接 ${this.missed}`).setColor('#c8e6c9');
    sound.click();
  }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    for (const c of this.calls) c.node.destroy(true);
    this.calls = [];

    const total = this.handled + this.missed;
    const rate = total === 0 ? 0 : this.handled / total;
    let result: MinigameResult;
    if (rate >= 0.85 && this.missed <= 1) {
      result = {
        grade: 'perfect',
        delta: { clinical: 5, reputation: 4, stamina: -14, sanity: -4 },
        flagSet: 'night_shift_ace',
        consequence: `一晚响应 ${this.handled} 次呼叫，只漏 ${this.missed} 次。交班时护士说："今晚有你，稳。"`,
      };
    } else if (rate >= 0.55) {
      result = {
        grade: 'good',
        delta: { clinical: 3, reputation: 1, stamina: -16, sanity: -6 },
        flagSet: 'night_shift_done',
        consequence: `响应 ${this.handled}、漏接 ${this.missed}。天亮时你靠墙站了一会儿。`,
      };
    } else {
      result = {
        grade: 'miss',
        delta: { clinical: 0, reputation: -3, stamina: -18, sanity: -10 },
        flagSet: 'night_shift_mess',
        consequence: `漏接 ${this.missed} 次。晨会上带教没点名，但你知道那几眼是给你的。`,
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
