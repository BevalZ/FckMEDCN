import Phaser from 'phaser';
import { getPalette } from './pixelArt';
import type { PaletteName } from './pixelArt';

// 底部滚动新闻条。展示 gameState.newsLog 中的最新头条，循环从右向左滚动。
// 所有公共头条都是游戏内趋势推演或匿名综合改写，不是实时新闻或医学事实来源。
//
// 修复：滚动文字曾与"快讯"栏目条（同一 depth，且文字后添加）互相穿插导致
// 字符被栏目条"切碎"。现在：
//   1) 给滚动文字加 GeometryMask，只允许在 labelW..960 区域渲染；
//   2) 把"快讯"栏目条（cyan 块 + 文字）放到最高 depth，永不被打断。
export class NewsTicker {
  private scene: Phaser.Scene;
  private text!: Phaser.GameObjects.Text;
  private labelText!: Phaser.GameObjects.Text;
  private maskSrc!: Phaser.GameObjects.Graphics;
  private headlines: string[] = [];
  private idx = 0;
  private tween?: Phaser.Tweens.Tween;
  private readonly y = 506;
  private readonly labelW = 104;
  private readonly tickerH = 34;

  constructor(scene: Phaser.Scene, paletteName: PaletteName) {
    this.scene = scene;
    const pal = getPalette(paletteName);

    // 1) 全宽背景（最底层）
    const bg = scene.add.graphics().setDepth(89);
    bg.fillStyle(pal.panel, 0.92).fillRect(0, this.y, 960, this.tickerH);

    // 2) 滚动文字（被遮罩裁剪到栏目条右侧）
    this.text = scene.add.text(960, this.y + 9, '', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#f0f0f0',
    }).setOrigin(0, 0).setDepth(91);

    // 遮罩源图形：覆盖栏目条右侧的滚动区域
    this.maskSrc = scene.add.graphics().setVisible(false);
    this.maskSrc.fillRect(this.labelW, this.y, 960 - this.labelW, this.tickerH);
    this.text.setMask(this.maskSrc.createGeometryMask());

    // 3) "快讯" 栏目条（置于最上层，覆盖任何可能溢出的文字边沿）
    const labelBg = scene.add.graphics().setDepth(95);
    labelBg.fillStyle(pal.accent, 1).fillRect(0, this.y, this.labelW, this.tickerH);
    this.labelText = scene.add.text(6, this.y + 9, '游戏内推演', {
      fontFamily: '"Courier New", monospace', fontSize: '13px',
      color: '#0a0a0f', fontStyle: 'bold',
    }).setDepth(96);
  }

  refresh(headlines: string[]) {
    const nextHeadlines = [...new Set(headlines.filter(Boolean))];
    const unchanged = nextHeadlines.length === this.headlines.length
      && nextHeadlines.every((headline, index) => headline === this.headlines[index]);
    if (unchanged && this.tween) return;

    this.headlines = nextHeadlines;
    this.idx = 0;
    this.tween?.remove();
    this.showNext();
  }

  private showNext() {
    if (this.headlines.length === 0) {
      this.text.setText('');
      return;
    }
    const h = this.headlines[this.idx % this.headlines.length];
    this.idx++;
    this.text.setText(h);
    // 从右侧视口外滑入，向左滑到完全离开左侧视口外（期间被遮罩裁剪）
    this.text.setX(960);
    const distance = 960 + this.text.width;
    const duration = Math.min(12000, Math.max(5500, distance * 7));
    this.tween = this.scene.tweens.add({
      targets: this.text,
      x: -this.text.width,
      duration,
      ease: 'Linear',
      onComplete: () => this.showNext(),
    });
  }

  destroy() {
    this.tween?.remove();
    this.text.destroy();
    this.labelText.destroy();
    this.maskSrc.destroy();
  }
}
