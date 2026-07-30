import Phaser from 'phaser';
import type { Spot } from '../data/campusMap';
import { getPalette } from './pixelArt';

// 地点标牌 + 事件标记 + 靠近时的操作提示。
// 标牌常驻（让玩家知道每栋楼是什么），'!' 只在该地点本季有可领事件时出现。

const NEAR_DIST = 40;

interface SpotVisual {
  spot: Spot;
  world: { x: number; y: number };
  bang: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
}

export class InteractPrompt {
  private visuals: SpotVisual[] = [];
  private hint: Phaser.GameObjects.Text;
  private hintBg: Phaser.GameObjects.Graphics;
  private currentId: string | null = null;

  constructor(
    scene: Phaser.Scene, stage: string, spots: readonly Spot[],
    tileCenter: (col: number, row: number) => { x: number; y: number },
  ) {
    const pal = getPalette(stage);
    const accent = `#${pal.accent.toString(16).padStart(6, '0')}`;

    for (const spot of spots) {
      const world = tileCenter(spot.door[0], spot.door[1]);

      const name = scene.add.text(world.x, world.y - 30, spot.label, {
        fontFamily: '"Courier New", monospace', fontSize: '11px',
        color: '#e8f4ff', backgroundColor: '#0a0a0fcc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1).setDepth(20);

      const bang = scene.add.text(world.x, world.y - 48, '!', {
        fontFamily: '"Courier New", monospace', fontSize: '20px',
        color: accent, fontStyle: 'bold',
      }).setOrigin(0.5, 1).setDepth(21).setVisible(false);

      scene.tweens.add({
        targets: bang, y: world.y - 54, duration: 620,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.visuals.push({ spot, world, bang, name });
    }

    this.hintBg = scene.add.graphics().setDepth(20).setVisible(false);
    this.hint = scene.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5, 1).setDepth(21).setVisible(false);
  }

  /** 刷新各地点的 '!'：availability[spotId] = 本季此处是否有可领事件 */
  setAvailability(availability: Record<string, boolean>) {
    for (const v of this.visuals) v.bang.setVisible(!!availability[v.spot.id]);
  }

  clearAllBangs() {
    for (const v of this.visuals) v.bang.setVisible(false);
  }

  /** 返回玩家当前可交互的地点（无则 null），并更新提示浮字 */
  update(px: number, py: number, textFor: (spot: Spot) => string): Spot | null {
    let best: SpotVisual | null = null;
    let bestD = NEAR_DIST;
    for (const v of this.visuals) {
      const d = Phaser.Math.Distance.Between(px, py, v.world.x, v.world.y);
      if (d < bestD) { bestD = d; best = v; }
    }

    if (!best) {
      if (this.currentId !== null) {
        this.currentId = null;
        this.hint.setVisible(false);
        this.hintBg.setVisible(false);
      }
      return null;
    }

    const label = textFor(best.spot);
    if (this.currentId !== best.spot.id || this.hint.text !== label) {
      this.currentId = best.spot.id;
      this.hint.setText(label);
      this.hint.setPosition(best.world.x, best.world.y + 34);
      const w = this.hint.width + 12, h = this.hint.height + 6;
      this.hintBg.clear();
      this.hintBg.fillStyle(0x0a0a0f, 0.85);
      this.hintBg.fillRoundedRect(best.world.x - w / 2, best.world.y + 34 - h, w, h, 4);
      this.hint.setVisible(true);
      this.hintBg.setVisible(true);
    }
    return best.spot;
  }

  destroy() {
    for (const v of this.visuals) { v.bang.destroy(); v.name.destroy(); }
    this.hint.destroy();
    this.hintBg.destroy();
    this.visuals = [];
  }
}
