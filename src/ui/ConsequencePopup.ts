import Phaser from 'phaser';
import { getPalette } from './pixelArt';
import type { StatDelta } from '../data/stats';

// M5 文字完整性：弹窗高度随正文自动调整，过长则整体等比缩小，保证不裁切。
const POP_W = 600;
const MAX_H = 420;

export class ConsequencePopup {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private stage: string;
  private pendingKeys: (Phaser.Input.Keyboard.Key | undefined)[] = [];

  constructor(scene: Phaser.Scene, stage: string) {
    this.scene = scene;
    this.stage = stage;
  }

  show(text: string, _delta: StatDelta, onDone: () => void) {
    for (const k of this.pendingKeys) k?.removeAllListeners();
    this.pendingKeys = [];
    if (this.container) this.container.destroy();
    const pal = getPalette(this.stage);
    const scene = this.scene;

    const body = scene.add.text(0, 0, text, {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#eeeeee',
      wordWrap: { width: POP_W - 40 }, lineSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0);

    const padTop = 30, gap = 18, btnH = 24, padBottom = 14;
    const naturalH = padTop + body.height + gap + btnH + padBottom;
    const H = Math.min(naturalH, MAX_H);

    this.container = scene.add.container(960 / 2, 540 / 2 + 20);
    this.container.setDepth(60);

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.92);
    bg.fillRoundedRect(-POP_W / 2, -H / 2, POP_W, H, 10);
    bg.lineStyle(2, pal.accent, 1);
    bg.strokeRoundedRect(-POP_W / 2, -H / 2, POP_W, H, 10);

    body.setPosition(0, -H / 2 + padTop);

    const btnText = scene.add.text(0, H / 2 - 20, '继续 [ 点击 / 空格 / 回车 ]', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const hitArea = scene.add.rectangle(0, H / 2 - 16, 160, 24, 0x000000, 0)
      .setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => this.dismiss(onDone));

    this.container.add([bg, body, btnText, hitArea]);

    if (naturalH > MAX_H) this.container.setScale(MAX_H / naturalH);

    // 键盘：空格 / 回车 均可继续（监听在 dismiss 时清理，避免跨弹窗泄漏）
    const spaceKey = scene.input.keyboard?.addKey('SPACE');
    const enterKey = scene.input.keyboard?.addKey('ENTER');
    const onKey = () => this.dismiss(onDone);
    spaceKey?.once('down', onKey);
    enterKey?.once('down', onKey);
    this.pendingKeys = [spaceKey, enterKey];

    this.container.setAlpha(0);
    scene.tweens.add({ targets: this.container, alpha: 1, duration: 150 });
  }

  private dismiss(onDone: () => void) {
    if (!this.container) return;
    for (const k of this.pendingKeys) k?.removeAllListeners();
    this.pendingKeys = [];
    this.scene.tweens.add({
      targets: this.container, alpha: 0, duration: 100,
      onComplete: () => { this.container?.destroy(); this.container = null; onDone(); },
    });
  }
}
