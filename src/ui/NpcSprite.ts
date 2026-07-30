import Phaser from 'phaser';
import type { NpcDef } from '../data/npc';
import { getAffinity, TRUST_AT, DISTANT_AT } from '../data/npc';

const W = 24, H = 36;

// NPC 立牌：与 Walker 同尺寸的静态像素小人 + 头顶名牌与好感度心形。
// 复用 Walker 的生成思路（pixelArt: false，故必须按最终显示尺寸生成贴图，不能缩放）。
export function createNpcTexture(scene: Phaser.Scene, npc: NpcDef) {
  const key = `npc_${npc.id}`;
  if (scene.textures.exists(key)) return key;

  const g = scene.add.graphics();
  const px = (x: number, y: number, w: number, h: number, c: number, a = 1) => {
    g.fillStyle(c, a); g.fillRect(x, y, w, h);
  };

  // 影子
  px(5, H - 3, 14, 3, 0x000000, 0.25);
  // 腿
  px(8, 26, 3, 8, 0x2b3550);
  px(13, 26, 3, 8, 0x2b3550);
  // 身体（白大褂/便服由 color 决定）
  px(6, 15, 12, 12, npc.color);
  px(6, 15, 12, 2, npc.color, 0.7);
  // 手臂
  px(4, 16, 2, 9, npc.color);
  px(18, 16, 2, 9, npc.color);
  // 脖子 + 头
  px(10, 12, 4, 3, 0xe8b48a);
  px(7, 4, 10, 9, 0xe8b48a);
  // 头发
  px(7, 3, 10, 4, npc.hairColor);
  px(6, 5, 2, 4, npc.hairColor);
  px(16, 5, 2, 4, npc.hairColor);
  // 眼睛
  px(9, 8, 2, 2, 0x1a1a1a);
  px(13, 8, 2, 2, 0x1a1a1a);

  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}

export class NpcSprite {
  readonly def: NpcDef;
  private sprite: Phaser.GameObjects.Image;
  private plate: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Text;
  private bang?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, npc: NpcDef, x: number, y: number) {
    this.def = npc;
    const key = createNpcTexture(scene, npc);
    this.sprite = scene.add.image(x, y, key).setDepth(y);

    this.plate = scene.add.text(x, y - H / 2 - 20, `${npc.name}·${npc.role}`, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '10px',
      color: '#e8eef8', backgroundColor: '#00000099', padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(900);

    this.hearts = scene.add.text(x, y - H / 2 - 8, '', {
      fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#ff8a95',
    }).setOrigin(0.5, 1).setDepth(900);

    this.refresh();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  /** 好感度心形：满心=信任，空心=疏远 */
  refresh() {
    const aff = getAffinity(this.def.id);
    const filled = Math.max(0, Math.min(5, Math.round(aff / 20)));
    this.hearts.setText('♥'.repeat(filled) + '♡'.repeat(5 - filled));
    this.hearts.setColor(aff >= TRUST_AT ? '#ff8a95' : aff <= DISTANT_AT ? '#78909c' : '#ffab91');
  }

  setBang(scene: Phaser.Scene, on: boolean) {
    if (on && !this.bang) {
      this.bang = scene.add.text(this.sprite.x, this.sprite.y - H / 2 - 30, '!', {
        fontFamily: '"Courier New", monospace', fontSize: '16px',
        color: '#ffd54f', fontStyle: 'bold',
      }).setOrigin(0.5, 1).setDepth(901);
      scene.tweens.add({
        targets: this.bang, y: this.bang.y - 5,
        duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else if (!on && this.bang) {
      this.bang.destroy();
      this.bang = undefined;
    }
  }

  destroy() {
    this.sprite.destroy();
    this.plate.destroy();
    this.hearts.destroy();
    this.bang?.destroy();
  }
}
