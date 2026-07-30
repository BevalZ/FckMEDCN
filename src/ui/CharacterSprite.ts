import Phaser from 'phaser';
import { getPalette, CLOTHING, createCharTexture, expressionForSanity } from './pixelArt';
import type { PaletteName, Clothing, Expression } from './pixelArt';

// 左侧舞台中的像素角色：放置于左栏，带待机浮动动画，表情随心理健康变化
export class CharacterSprite {
  private scene: Phaser.Scene;
  private image!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private clothing: Clothing;
  private expr: Expression = 'happy';
  private readonly baseScale = 1.6;

  constructor(scene: Phaser.Scene, stage: string, x = 54, y = 230) {
    this.scene = scene;
    this.clothing = CLOTHING[stage] ?? 'casual';
    const pal = getPalette(stage as PaletteName);

    (['happy', 'tired', 'anxious'] as const).forEach((e) => {
      createCharTexture(scene, `char_${this.clothing}_${e}`, this.clothing, e, pal);
    });

    // 入场：从左侧滑入
    const startX = x - 34;
    this.image = scene.add.image(startX, y, `char_${this.clothing}_happy`).setDepth(40).setScale(this.baseScale);
    // 地面投影，增强立体感
    this.shadow = scene.add.ellipse(startX, y + 62, 34, 9, 0x000000, 0.35).setDepth(39);

    scene.tweens.add({ targets: [this.image, this.shadow], x, duration: 480, ease: 'Sine.easeOut' });
    // 待机浮动
    scene.tweens.add({
      targets: this.image, y: y - 6, duration: 1600,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // 轻微摆动（用 angle，避免与 setSanity 的 scale 挤压动画冲突）
    scene.tweens.add({
      targets: this.image, angle: { from: -1.4, to: 1.4 }, duration: 2000,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  setSanity(sanity: number) {
    const next = expressionForSanity(sanity);
    if (next === this.expr) return;
    this.expr = next;
    this.image.setTexture(`char_${this.clothing}_${next}`);
    this.scene.tweens.add({
      targets: this.image,
      scaleX: this.baseScale * 1.12, scaleY: this.baseScale * 0.92,
      duration: 120, yoyo: true,
    });
  }

  destroy() { this.image.destroy(); this.shadow.destroy(); }
}
