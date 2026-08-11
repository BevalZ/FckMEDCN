import Phaser from 'phaser';
import { getPalette } from './pixelArt';
import type { StatDelta } from '../data/stats';
import { takePendingBadges } from '../data/badges';
import { renderGendered } from '../data/gender';

// M5 文字完整性：弹窗高度随正文自动调整，过长则整体等比缩小，保证不裁切。
const POP_W = 600;
const MAX_H = 420;

export class ConsequencePopup {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private stage: string;
  private onDone: (() => void) | null = null;
  private onCancel: (() => void) | null = null;
  private escapeMode: 'dismiss' | 'cancel' = 'dismiss';

  constructor(scene: Phaser.Scene, stage: string) {
    this.scene = scene;
    this.stage = stage;

    // 键盘 handler 在构造时注册一次，show/dismiss 只存取状态。
    // 不采用"show 时 addKey 后 dismiss 时 removeAllListeners"——多个弹窗/场景共用
    // 同一 KeyboardPlugin，Key 实例监听会被其它弹窗的 removeAllListeners 误清。
    // 这里 handler 常驻，仅当有弹窗展示（container 非空）时才响应。
    scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!this.container) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.dismiss(this.onDone);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (this.escapeMode === 'cancel') this.cancel(); else this.dismiss(this.onDone);
      }
    });
  }

  /** 是否有弹窗正在展示（供"重新开档"等全局快捷键防重复触发） */
  get busy(): boolean { return this.container !== null; }

  // opts.escape：
  //  - 'dismiss'（默认）：ESC 与 空格/回车 等价，继续（调用 onDone）
  //  - 'cancel'：ESC 仅关闭弹窗、不调用 onDone（用于"重新开档"等需要可反悔的确认）
  show(
    text: string,
    _delta: StatDelta,
    onDone: () => void,
    opts?: {
      escape?: 'dismiss' | 'cancel';
      actionLabel?: string;
      onCancel?: () => void;
    },
  ) {
    if (this.container) this.container.destroy();
    this.onDone = onDone;
    this.onCancel = opts?.onCancel ?? null;
    this.escapeMode = opts?.escape ?? 'dismiss';
    const pal = getPalette(this.stage);
    const scene = this.scene;

    // 里程碑达成提示：本选择新达成的徽章，金色行显示在正文上方
    const badgeTitles = takePendingBadges();
    const badgeLine = badgeTitles.length > 0 ? '★ 达成里程碑：' + badgeTitles.join(' · ') : '';

    const body = scene.add.text(0, 0, renderGendered(text), {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#eeeeee',
      wordWrap: { width: POP_W - 40 }, lineSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0);

    let padTop = 30;
    const badgeText = badgeLine ? scene.add.text(0, 0, badgeLine, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffc107', fontStyle: 'bold',
      wordWrap: { width: POP_W - 40 }, align: 'center',
    }).setOrigin(0.5, 0) : null;

    const gap = 18, btnH = 24, padBottom = 14;
    const headerH = badgeText ? badgeText.height + 10 : 0;
    const naturalH = padTop + headerH + body.height + gap + btnH + padBottom;
    const H = Math.min(naturalH, MAX_H);

    this.container = scene.add.container(960 / 2, 540 / 2 + 20);
    this.container.setDepth(60);

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.92);
    bg.fillRoundedRect(-POP_W / 2, -H / 2, POP_W, H, 10);
    bg.lineStyle(2, pal.accent, 1);
    bg.strokeRoundedRect(-POP_W / 2, -H / 2, POP_W, H, 10);

    let y = -H / 2 + padTop;
    if (badgeText) {
      badgeText.setPosition(0, y);
      y += badgeText.height + 10;
    }
    body.setPosition(0, y);

    const cancellable = this.escapeMode === 'cancel';
    const actionLabel = opts?.actionLabel ?? (cancellable ? '确认 [ 点击 / 空格 / 回车 ]' : '继续 [ 点击 / 空格 / 回车 ]');
    const actionX = cancellable ? 50 : 0;
    const btnText = scene.add.text(actionX, H / 2 - 20, actionLabel, {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    const hitArea = scene.add.rectangle(actionX, H / 2 - 16, Math.max(160, Math.min(320, actionLabel.length * 8 + 24)), 24, 0x000000, 0)
      .setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => this.dismiss(onDone));

    const cancelText = cancellable
      ? scene.add.text(-220, H / 2 - 20, '取消 [ 点击 / ESC ]', {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#b0bec5',
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' })
      : null;
    cancelText?.on('pointerdown', () => this.cancel());

    this.container.add([
      bg, body, btnText, hitArea, ...(cancelText ? [cancelText] : []), ...(badgeText ? [badgeText] : []),
    ]);

    if (naturalH > MAX_H) this.container.setScale(MAX_H / naturalH);

    this.container.setAlpha(0);
    scene.tweens.add({ targets: this.container, alpha: 1, duration: 150 });
  }

  private dismiss(onDone: (() => void) | null) {
    if (!this.container) return;
    const c = this.container;
    this.container = null;
    this.onDone = null;
    this.onCancel = null;
    this.scene.tweens.add({
      targets: c, alpha: 0, duration: 100,
      onComplete: () => { c.destroy(); onDone?.(); },
    });
  }

  /** 仅关闭弹窗、不执行 onDone（用于"重新开档"确认的 ESC 取消） */
  private cancel() {
    if (!this.container) return;
    const c = this.container;
    const onCancel = this.onCancel;
    this.container = null;
    this.onDone = null;
    this.onCancel = null;
    c.destroy();
    onCancel?.();
  }
}
