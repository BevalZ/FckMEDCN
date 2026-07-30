import Phaser from 'phaser';
import { PALETTE, CLOTHING, shade } from './pixelArt';
import type { Clothing, PaletteName } from './pixelArt';
import { sound } from '../audio/sound';

// 可行走的四向像素角色。与 CharacterSprite（左栏静态立绘）互不相干：
// 那个是 40x84 放大 1.6 倍的展示用立绘，这里是 24x36、scale=1 的行走精灵。
//
// 关键约束：游戏 config 里 pixelArt=false（为了中文抗锯齿），任何放大都会被插值模糊，
// 所以贴图必须按最终显示尺寸生成，且摄像机不可 zoom。

const W = 24, H = 36;
const DIRS = ['down', 'up', 'left', 'right'] as const;
export type Dir = typeof DIRS[number];

interface Skin {
  coat: number; pants: number; skin: number; skinSh: number; hair: number; hairSh: number;
}

function skinFor(clothing: Clothing, pal: typeof PALETTE.gaokao): Skin {
  let coat = pal.accent, pants = 0x33384a;
  if (clothing === 'whitecoat') { coat = 0xf5f5f5; pants = 0x37474f; }
  else if (clothing === 'scrubs') { coat = 0x4db6ac; pants = 0x37474f; }
  else if (clothing === 'lab') { coat = 0x5c6bc0; pants = 0x2e3a4a; }
  else if (clothing === 'suit') { coat = 0x263238; pants = 0x1b2329; }
  return { coat, pants, skin: 0xf2c9a0, skinSh: 0xd9a679, hair: 0x2b2b35, hairSh: 0x1c1c24 };
}

// frame: 0 = 静止 / 1 = 左脚前 / 2 = 右脚前
function drawWalkFrame(g: Phaser.GameObjects.Graphics, dir: Dir, frame: number, s: Skin) {
  const bob = frame === 0 ? 0 : 1;            // 行走时躯干起伏 1px
  const legL = frame === 1 ? 3 : 0;           // 迈步偏移
  const legR = frame === 2 ? 3 : 0;
  const coatSh = shade(s.coat, 0.72);

  // 影子
  g.fillStyle(0x000000, 0.28); g.fillEllipse(W / 2, H - 2, 16, 5);

  // 腿 + 鞋
  g.fillStyle(s.pants, 1);
  g.fillRect(7, 24 - bob, 4, 8 - legL);
  g.fillRect(13, 24 - bob, 4, 8 - legR);
  g.fillStyle(0x151515, 1);
  g.fillRect(6, 32 - bob - legL, 6, 3);
  g.fillRect(12, 32 - bob - legR, 6, 3);

  // 躯干
  g.fillStyle(s.coat, 1); g.fillRect(6, 14 - bob, 12, 11);
  g.fillStyle(coatSh, 1); g.fillRect(15, 14 - bob, 3, 11);

  // 手臂（侧向时只画一只，正/背向画两只，摆臂与迈腿反相）
  const armY = 15 - bob;
  if (dir === 'left' || dir === 'right') {
    const ax = dir === 'right' ? 14 : 7;
    g.fillStyle(s.coat, 1); g.fillRect(ax, armY + (frame === 1 ? 1 : 0), 4, 8);
    g.fillStyle(s.skin, 1); g.fillRect(ax, armY + 8 + (frame === 1 ? 1 : 0), 4, 3);
  } else {
    g.fillStyle(s.coat, 1);
    g.fillRect(3, armY + legR, 3, 8);
    g.fillRect(18, armY + legL, 3, 8);
    g.fillStyle(s.skin, 1);
    g.fillRect(3, armY + 8 + legR, 3, 3);
    g.fillRect(18, armY + 8 + legL, 3, 3);
  }

  // 脖子 + 头
  g.fillStyle(s.skin, 1); g.fillRect(10, 12 - bob, 4, 3);
  g.fillStyle(s.skin, 1); g.fillRect(7, 3 - bob, 10, 10);
  g.fillStyle(s.skinSh, 1); g.fillRect(15, 3 - bob, 2, 10);

  // 头发：按朝向变化（背面全包，侧面遮半张脸）
  g.fillStyle(s.hair, 1);
  if (dir === 'up') {
    g.fillRect(6, 2 - bob, 12, 10);
  } else if (dir === 'left') {
    g.fillRect(6, 2 - bob, 12, 5); g.fillRect(6, 2 - bob, 5, 9);
  } else if (dir === 'right') {
    g.fillRect(6, 2 - bob, 12, 5); g.fillRect(13, 2 - bob, 5, 9);
  } else {
    g.fillRect(6, 2 - bob, 12, 5); g.fillRect(6, 2 - bob, 3, 8); g.fillRect(15, 2 - bob, 3, 8);
  }
  g.fillStyle(s.hairSh, 1); g.fillRect(6, 6 - bob, 12, 1);

  // 五官：仅正面与侧面可见
  const eye = 0x1b1b22;
  g.fillStyle(eye, 1);
  if (dir === 'down') {
    g.fillRect(9, 8 - bob, 2, 2); g.fillRect(13, 8 - bob, 2, 2);
  } else if (dir === 'left') {
    g.fillRect(8, 8 - bob, 2, 2);
  } else if (dir === 'right') {
    g.fillRect(14, 8 - bob, 2, 2);
  }
}

/** 生成 4 方向 x 3 帧贴图并注册 4 条行走动画（幂等，重复调用不会重建） */
export function createWalkerTextures(scene: Phaser.Scene, clothing: Clothing, pal: typeof PALETTE.gaokao) {
  const s = skinFor(clothing, pal);
  for (const dir of DIRS) {
    for (let f = 0; f < 3; f++) {
      const key = `walk_${clothing}_${dir}_${f}`;
      if (scene.textures.exists(key)) continue;
      const g = scene.add.graphics();
      drawWalkFrame(g, dir, f, s);
      g.generateTexture(key, W, H);
      g.destroy();
    }
    const animKey = `walk_${clothing}_${dir}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [1, 0, 2, 0].map(f => ({ key: `walk_${clothing}_${dir}_${f}` })),
        frameRate: 7,
        repeat: -1,
      });
    }
  }
}

export interface WalkerKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

/** 集中在一处的键位映射（方向键 + WASD），日后接虚拟摇杆也从这里改 */
export function createWalkerKeys(scene: Phaser.Scene): WalkerKeys {
  const kb = scene.input.keyboard!;
  const k = (name: string) => kb.addKey(name);
  return {
    up: [k('UP'), k('W')],
    down: [k('DOWN'), k('S')],
    left: [k('LEFT'), k('A')],
    right: [k('RIGHT'), k('D')],
  };
}

const SPEED = 110;

export class Walker {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private clothing: Clothing;
  private dir: Dir = 'down';
  private frozen = false;
  private footAccum = 0;
  private footRight = false;

  constructor(scene: Phaser.Scene, stage: string, x: number, y: number) {
    this.clothing = CLOTHING[stage] ?? 'casual';
    createWalkerTextures(scene, this.clothing, PALETTE[stage as PaletteName] ?? PALETTE.gaokao);

    this.sprite = scene.physics.add.sprite(x, y, `walk_${this.clothing}_down_0`);
    this.sprite.setDepth(10);
    // 碰撞体只占脚部：上半身可以在视觉上略微叠进建筑前，空间感更自然
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 12);
    body.setOffset((W - 16) / 2, H - 14);
    this.sprite.setCollideWorldBounds(true);
  }

  /** 冻结移动（事件卡 / 弹窗打开时） */
  freeze() {
    this.frozen = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.anims.stop();
    this.sprite.setTexture(`walk_${this.clothing}_${this.dir}_0`);
    this.footAccum = 0;
  }

  unfreeze() { this.frozen = false; }

  update(keys: WalkerKeys, delta = 16) {
    if (this.frozen) return;
    const down = (arr: Phaser.Input.Keyboard.Key[]) => arr.some(k => k.isDown);

    let vx = 0, vy = 0;
    if (down(keys.left)) vx = -SPEED;
    else if (down(keys.right)) vx = SPEED;
    else if (down(keys.up)) vy = -SPEED;
    else if (down(keys.down)) vy = SPEED;
    // 只走四向：不做斜移，贴合像素网格的移动手感

    this.sprite.setVelocity(vx, vy);

    if (vx === 0 && vy === 0) {
      this.sprite.anims.stop();
      this.sprite.setTexture(`walk_${this.clothing}_${this.dir}_0`);
      this.footAccum = 0;
      return;
    }

    const nextDir: Dir = vx < 0 ? 'left' : vx > 0 ? 'right' : vy < 0 ? 'up' : 'down';
    if (nextDir !== this.dir || !this.sprite.anims.isPlaying) {
      this.dir = nextDir;
      this.sprite.anims.play(`walk_${this.clothing}_${nextDir}`, true);
    }

    // 脚步声：按位移节奏，约每 220ms 一步
    this.footAccum += delta;
    if (this.footAccum >= 220) {
      this.footAccum = 0;
      sound.footstep(this.footRight);
      this.footRight = !this.footRight;
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  destroy() { this.sprite.destroy(); }
}
