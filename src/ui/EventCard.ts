import Phaser from 'phaser';
import type { GameEvent, EventChoice, EventCategory } from '../data/events';
import { hasFlag } from '../data/gameState';
import { renderGendered } from '../data/gender';
import { getPalette } from './pixelArt';

export type ChoiceCallback = (choice: EventChoice, index: number) => void;

// M5 文字完整性：卡片按内容自动增高，若超过可视区域则整体等比缩小，
// 保证标题/正文/选项文字任何长度都不会被裁切或压到彼此上面。
const CARD_W = 740;
const MAX_H = 432; // 540 画布 - 顶部HUD(54) - 底部快讯(34) - 边距

// M5 分类徽章：颜色 + 中文标签，便于一眼识别事件类型
const CATEGORY_META: Record<EventCategory, { label: string; color: number }> = {
  study: { label: '学习', color: 0x4fc3f7 },
  clinical: { label: '临床', color: 0xff5252 },
  social: { label: '人际', color: 0xffb74d },
  financial: { label: '财务', color: 0xffd600 },
  mental: { label: '心理', color: 0xba68c8 },
  career: { label: '职业', color: 0x81c784 },
  news: { label: '快讯', color: 0x90a4ae },
  system: { label: '系统', color: 0x78909c },
  personal: { label: '个人', color: 0xf48fb1 },
};

export class EventCard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private onChoice: ChoiceCallback;
  private stage: string;

  // 键盘导航状态
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private choices: EventChoice[] = [];
  private drawFns: ((hovered: boolean) => void)[] = [];
  private labelTexts: Phaser.GameObjects.Text[] = [];
  private focusedIndex = 0;
  // 可选的"取消"回调：仅可行走场景传入，允许 ESC 不做选择直接退出。
  // 卡片式阶段不传，因为那里事件即本回合，取消会导致回合无法推进。
  private onCancel: (() => void) | null = null;
  private cancelHint: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, stage: string, onChoice: ChoiceCallback) {
    this.scene = scene;
    this.stage = stage;
    this.onChoice = onChoice;
  }

  /** 事件卡是否正在展示（供全局快捷键守卫） */
  get busy(): boolean { return this.container !== null; }

  show(event: GameEvent, onCancel?: () => void) {
    this.onCancel = onCancel ?? null;
    this.hide();
    const pal = getPalette(this.stage);
    const scene = this.scene;

    // 选项级门槛：flagRequire / flagExclude 决定该选项是否对玩家可见。
    // 若过滤后为空（配置失误），退回展示全部选项，避免出现无选项的死卡。
    const gated = event.choices.filter(c =>
      !c.hidden &&
      !(c.flagRequire && !hasFlag(c.flagRequire)) &&
      !(c.flagExclude && hasFlag(c.flagExclude))
    );
    const visibleChoices = gated.length > 0 ? gated : event.choices;

    // —— 先创建并测量所有文本，计算所需高度（性别占位符在此统一渲染）——
    const title = scene.add.text(0, 0, renderGendered(event.title), {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      wordWrap: { width: CARD_W - 40 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0);

    const body = scene.add.text(0, 0, renderGendered(event.body), {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#dddddd',
      wordWrap: { width: CARD_W - 40 }, lineSpacing: 5,
    }).setOrigin(0, 0);

    const labels = visibleChoices.map((choice, i) =>
      scene.add.text(0, 0, `${String.fromCharCode(65 + i)}. ${renderGendered(choice.text)}`, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#f0f0f0',
        wordWrap: { width: CARD_W - 64 }, lineSpacing: 3,
      }).setOrigin(0, 0)
    );
    const btnHeights = labels.map(l => Math.max(36, Math.ceil(l.height) + 12));

    const padTop = 30, gapTitle = 12, gapBody = 14, gapChoice = 8, padBottom = 14;
    const naturalH =
      padTop + title.height + gapTitle + body.height + gapBody +
      btnHeights.reduce((a, b) => a + b + gapChoice, 0) - gapChoice + padBottom;

    const H = Math.min(naturalH, MAX_H);

    // —— 构建卡片 ——
    this.container = scene.add.container(960 / 2, 540 / 2 + 20);
    this.container.setDepth(50);

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-CARD_W / 2, -H / 2, CARD_W, H, 12);
    bg.lineStyle(2, pal.accent, 0.8);
    bg.strokeRoundedRect(-CARD_W / 2, -H / 2, CARD_W, H, 12);

    // 分类徽章（左上角）
    const meta = CATEGORY_META[event.category] ?? CATEGORY_META.system;
    const badgeW = meta.label.length * 11 + 14;
    const badge = scene.add.graphics();
    badge.fillStyle(meta.color, 0.95);
    badge.fillRoundedRect(-CARD_W / 2 + 20, -H / 2 + 12, badgeW, 16, 4);
    const badgeText = scene.add.text(-CARD_W / 2 + 27, -H / 2 + 13, meta.label, {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#0a0a0f', fontStyle: 'bold',
    });

    title.setPosition(0, -H / 2 + padTop);
    body.setPosition(-CARD_W / 2 + 20, -H / 2 + padTop + title.height + gapTitle);

    const children: Phaser.GameObjects.GameObject[] = [bg, badge, badgeText, title, body];

    // 键盘导航所需的可变状态初始化
    this.choices = visibleChoices;
    this.drawFns = [];
    this.labelTexts = [];
    this.focusedIndex = 0;

    let cy = -H / 2 + padTop + title.height + gapTitle + body.height + gapBody;
    visibleChoices.forEach((_choice, i) => {
      const bh = btnHeights[i];
      const btnY = cy;
      const btnBg = scene.add.graphics();
      const drawBtn = (hovered: boolean) => {
        btnBg.clear();
        btnBg.fillStyle(hovered ? 0x2a2a52 : 0x1a1a2e, hovered ? 0.98 : 0.9);
        btnBg.fillRoundedRect(-CARD_W / 2 + 16, btnY, CARD_W - 32, bh, 6);
        btnBg.lineStyle(hovered ? 2 : 1, pal.accent, hovered ? 0.95 : 0.4);
        btnBg.strokeRoundedRect(-CARD_W / 2 + 16, btnY, CARD_W - 32, bh, 6);
      };
      drawBtn(false);

      const lh = labels[i].height;
      labels[i].setPosition(-CARD_W / 2 + 28, btnY + Math.max(4, (bh - lh) / 2));

      const hitArea = scene.add.rectangle(0, btnY + bh / 2, CARD_W - 32, bh, 0x000000, 0)
        .setInteractive({ cursor: 'pointer' });
      hitArea.on('pointerover', () => this.setFocus(i));
      hitArea.on('pointerout', () => {
        if (this.focusedIndex !== i) { drawBtn(false); labels[i].setColor('#f0f0f0'); }
      });
      hitArea.on('pointerdown', () => this.commit(i));

      children.push(btnBg, labels[i], hitArea);
      this.drawFns.push(drawBtn);
      this.labelTexts.push(labels[i]);
      cy += bh + gapChoice;
    });

    // ESC 取消提示：仅可行走场景（传入 onCancel）显示，放右上角与徽章同高
    if (this.onCancel) {
      this.cancelHint = scene.add.text(CARD_W / 2 - 20, -H / 2 + 13, 'ESC 离开', {
        fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#9aa0b5',
      }).setOrigin(1, 0);
      children.push(this.cancelHint);
    }

    this.container.add(children);

    // 内容超出可视高度 → 整体等比缩小，确保文字完整可见（不会裁切）
    if (naturalH > MAX_H) {
      this.container.setScale(MAX_H / naturalH);
    }

    // 默认高亮第一个选项（键盘/鼠标焦点一致）
    this.applyFocus();
    this.registerKeyboard();
    // 场景切换/关闭时确保键盘监听被移除，避免泄漏或重复触发
    this.scene.events.once('shutdown', () => this.removeKeyboard());

    this.container.setAlpha(0);
    scene.tweens.add({ targets: this.container, alpha: 1, duration: 180 });
  }

  // —— 键盘导航 ——
  private registerKeyboard() {
    this.removeKeyboard(); // 防御性：避免重复注册
    this.keyHandler = (e: KeyboardEvent) => {
      const n = this.choices.length;
      if (n === 0) return;

      switch (e.key) {
        case 'Escape':
          // 仅当调用方提供了取消回调（可行走场景）时才允许 ESC 退出对话。
          // 卡片式阶段里事件即本回合，允许取消会使回合无法推进，故不提供。
          if (this.onCancel) {
            e.preventDefault();
            this.cancel();
          }
          return;
        case 'ArrowDown':
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault();
          this.setFocus((this.focusedIndex + 1) % n);
          return;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          this.setFocus((this.focusedIndex - 1 + n) % n);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.commit(this.focusedIndex);
          return;
      }

      // 数字键 1..9 直接选择（受选项数量限制）
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && num <= n) {
        e.preventDefault();
        this.commit(num - 1);
        return;
      }
      // 字母键 A..I 直接选择
      const code = e.key.toUpperCase().charCodeAt(0) - 65; // A => 0
      if (code >= 0 && code < n) {
        e.preventDefault();
        this.commit(code);
      }
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  private removeKeyboard() {
    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  private setFocus(i: number) {
    if (i === this.focusedIndex) return;
    this.drawFns[this.focusedIndex]?.(false);
    this.labelTexts[this.focusedIndex]?.setColor('#f0f0f0');
    this.focusedIndex = i;
    this.applyFocus();
  }

  private applyFocus() {
    const i = this.focusedIndex;
    this.drawFns[i]?.(true);
    this.labelTexts[i]?.setColor('#ffffff');
  }

  private commit(i: number) {
    const choice = this.choices[i];
    if (!choice) return;
    this.removeKeyboard();
    this.onChoice(choice, i);
  }

  private cancel() {
    this.removeKeyboard();
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.onCancel?.();
  }

  hide() {
    this.removeKeyboard();
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
