import Phaser from 'phaser';

export const PALETTE = {
  gaokao: { bg: 0x1a1a2e, panel: 0x16213e, accent: 0xe94560, text: 0xf0f0f0 },
  undergrad: { bg: 0x0f2027, panel: 0x203a43, accent: 0x4fc3f7, text: 0xf0f0f0 },
  internship: { bg: 0x1a1a2e, panel: 0x16213e, accent: 0xffd600, text: 0xf0f0f0 },
  guipei: { bg: 0x0d0d1a, panel: 0x111122, accent: 0xff5252, text: 0xd0d0d0 },
  master: { bg: 0x0a1628, panel: 0x102038, accent: 0x69f0ae, text: 0xf0f0f0 },
  phd: { bg: 0x121212, panel: 0x1e1e1e, accent: 0xb39ddb, text: 0xe0e0e0 },
  jobhunt: { bg: 0x1a0a0a, panel: 0x2a1010, accent: 0xff6d00, text: 0xf0f0f0 },
  career: { bg: 0x0a1a0a, panel: 0x102010, accent: 0xa5d6a7, text: 0xf0f0f0 },
};

export type PaletteName = keyof typeof PALETTE;

export function getPalette(stage: string) {
  return (PALETTE as Record<string, typeof PALETTE.gaokao>)[stage] ?? PALETTE.gaokao;
}

/** 阶段/季度氛围 tint（M5）：不换图也能用冷暖偏移区分时段感。 */
export function stageAmbientTint(stage: string, quarter: number): number {
  const byQ: Record<number, number> = {
    1: 0xe8f5e9, // 春
    2: 0xfff8e1, // 夏
    3: 0xffe0b2, // 秋
    4: 0xe3f2fd, // 冬
  };
  if (stage === 'guipei' || stage === 'phd') return 0xcfd8dc;
  if (stage === 'career') return 0xd7ccc8;
  if (stage === 'internship') return 0xeceff1;
  if (stage === 'undergrad') return byQ[quarter] ?? 0xffffff;
  return 0xffffff;
}

// —— 像素着色辅助：统一光影，让方块有体积感（tilemap.ts 亦复用）——
export function shade(hex: number, f: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xff) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xff) * f)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 0xff) * f)));
  return (r << 16) | (g << 8) | b;
}
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
export function block(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(color, 1); g.fillRect(x, y, w, h);
}
// 带 2px 底部/右侧阴影的方块，营造像素体积
export function blockS(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, sh: number) {
  block(g, x, y, w, h, color);
  g.fillStyle(sh, 1);
  g.fillRect(x, y + h - 2, w, 2);
  g.fillRect(x + w - 2, y, 2, h);
}

export function createBgTexture(scene: Phaser.Scene, key: string, paletteName: PaletteName) {
  if (scene.textures.exists(key)) return;
  const pal = PALETTE[paletteName];
  const g = scene.add.graphics();
  const top = shade(pal.bg, 1.16);
  const bot = shade(pal.bg, 0.74);
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    g.fillStyle(lerpColor(top, bot, i / (bands - 1)), 1);
    g.fillRect(0, Math.floor((i * 540) / bands), 960, Math.ceil(540 / bands) + 1);
  }
  // 微弱星点/网格，增加背景层次（确定性分布）
  let s = 1337;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * 960);
    const y = Math.floor(rnd() * 420);
    g.fillStyle(0xffffff, 0.05);
    g.fillRect(x, y, 2, 2);
  }
  g.generateTexture(key, 960, 540);
  g.destroy();
}

// 复古扫描线
export function addScanlineOverlay(scene: Phaser.Scene, depth = 5, alpha = 0.08): Phaser.GameObjects.TileSprite {
  const key = 'scanline_3px';
  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, 4, 1);
    g.generateTexture(key, 4, 3);
    g.destroy();
  }
  return scene.add.tileSprite(0, 0, 960, 540, key).setOrigin(0).setDepth(depth).setAlpha(alpha);
}

// 径向暗角
export function addVignette(scene: Phaser.Scene, depth = 6, alpha = 0.9): Phaser.GameObjects.Image {
  const key = 'vignette_960x540';
  if (!scene.textures.exists(key)) {
    const c = scene.textures.createCanvas(key, 960, 540);
    const ctx = (c as Phaser.Textures.CanvasTexture).context;
    const grad = ctx.createRadialGradient(480, 270, 210, 480, 270, 520);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 540);
    (c as Phaser.Textures.CanvasTexture).refresh();
  }
  return scene.add.image(0, 0, key).setOrigin(0).setDepth(depth).setAlpha(alpha);
}

// ---------------------------------------------------------------------------
// M5: 像素角色 + 阶段场景装饰
// ---------------------------------------------------------------------------
export type Clothing = 'casual' | 'whitecoat' | 'scrubs' | 'lab' | 'suit';
export type Expression = 'happy' | 'tired' | 'anxious';

export const CLOTHING: Record<string, Clothing> = {
  gaokao: 'casual',
  undergrad: 'casual',
  internship: 'whitecoat',
  guipei: 'whitecoat',
  master: 'lab',
  phd: 'lab',
  jobhunt: 'suit',
  career: 'whitecoat',
};

export function expressionForSanity(s: number): Expression {
  if (s >= 60) return 'happy';
  if (s >= 30) return 'tired';
  return 'anxious';
}

// 像素角色：40x84，按服装 + 表情生成，含统一像素阴影与职业配饰
export function createCharTexture(
  scene: Phaser.Scene, key: string, clothing: Clothing, expr: Expression, pal: typeof PALETTE.gaokao
) {
  if (scene.textures.exists(key)) return;
  const W = 40, H = 84;
  const g = scene.add.graphics();
  const skin = 0xf2c9a0, skinSh = 0xd9a679, hair = 0x2b2b35, hairSh = 0x1c1c24, dark = 0x1b1b22;

  let coat = pal.accent, pants = 0x33384a;
  if (clothing === 'whitecoat') { coat = 0xf5f5f5; pants = 0x37474f; }
  else if (clothing === 'scrubs') { coat = 0x4db6ac; pants = 0x37474f; }
  else if (clothing === 'lab') { coat = 0x5c6bc0; pants = 0x2e3a4a; }
  else if (clothing === 'suit') { coat = 0x263238; pants = 0x1b2329; }
  const coatSh = shade(coat, 0.7);
  const pantsSh = shade(pants, 0.7);

  // 腿 + 鞋
  g.fillStyle(pants, 1); g.fillRect(13, 64, 6, 16); g.fillRect(21, 64, 6, 16);
  g.fillStyle(pantsSh, 1); g.fillRect(18, 64, 2, 16); g.fillRect(26, 64, 2, 16);
  g.fillStyle(0x111111, 1); g.fillRect(12, 80, 9, 4); g.fillRect(21, 80, 9, 4);
  // 躯干
  g.fillStyle(coat, 1); g.fillRect(11, 38, 18, 28);
  g.fillStyle(coatSh, 1); g.fillRect(25, 38, 4, 28);
  // 手臂 + 手
  g.fillStyle(coat, 1); g.fillRect(7, 40, 4, 22); g.fillRect(29, 40, 4, 22);
  g.fillStyle(coatSh, 1); g.fillRect(10, 40, 1, 22); g.fillRect(32, 40, 1, 22);
  g.fillStyle(skin, 1); g.fillRect(7, 60, 4, 4); g.fillRect(29, 60, 4, 4);
  g.fillStyle(skinSh, 1); g.fillRect(7, 63, 4, 1); g.fillRect(29, 63, 4, 1);
  // 脖子 + 头
  g.fillStyle(skin, 1); g.fillRect(17, 32, 6, 6);
  g.fillStyle(skinSh, 1); g.fillRect(20, 32, 3, 6);
  g.fillStyle(skin, 1); g.fillRect(13, 16, 14, 18);
  g.fillStyle(skinSh, 1); g.fillRect(24, 16, 3, 18);
  // 头发
  g.fillStyle(hair, 1); g.fillRect(12, 12, 16, 7); g.fillRect(12, 12, 4, 14); g.fillRect(24, 12, 4, 14);
  g.fillStyle(hairSh, 1); g.fillRect(12, 18, 16, 2);

  // 服装细节 + 职业配饰
  if (clothing === 'suit') {
    g.fillStyle(0xeceff1, 1); g.fillRect(17, 38, 6, 12);
    g.fillStyle(pal.accent, 1); g.fillRect(19, 40, 2, 18);
    g.fillStyle(0x10161a, 1); g.fillRect(13, 38, 4, 28); g.fillRect(23, 38, 4, 28);
  } else if (clothing === 'whitecoat') {
    g.fillStyle(dark, 1); g.fillRect(19, 38, 2, 26);
    g.fillStyle(coatSh, 1); g.fillRect(11, 44, 18, 2);
    // 听诊器
    g.fillStyle(0x607d8b, 1); g.fillRect(16, 38, 2, 8); g.fillRect(16, 44, 8, 2); g.fillRect(24, 44, 2, 6);
    g.fillStyle(0xb0bec5, 1); g.fillCircle(26, 52, 3);
    g.fillStyle(0x78909c, 1); g.fillCircle(26, 52, 1);
  } else if (clothing === 'scrubs') {
    g.fillStyle(0xffffff, 1); g.fillRect(11, 44, 18, 2);
    g.fillStyle(pal.accent, 1); g.fillRect(20, 46, 1, 4); g.fillRect(22, 46, 1, 4);
  } else if (clothing === 'lab') {
    g.fillStyle(0x90caf9, 0.55); g.fillRect(15, 23, 5, 2); g.fillRect(22, 23, 5, 2);
    g.fillStyle(0x222222, 1); g.fillRect(15, 23, 5, 1); g.fillRect(22, 23, 5, 1); g.fillRect(20, 23, 2, 2);
  } else {
    g.fillStyle(coatSh, 1); g.fillRect(19, 38, 2, 4);
    g.fillStyle(skin, 1); g.fillRect(18, 40, 1, 8); g.fillRect(22, 40, 1, 8);
  }

  drawFace(g, expr, skin);
  g.generateTexture(key, W, H);
  g.destroy();
}

function drawFace(g: Phaser.GameObjects.Graphics, expr: Expression, skin: number) {
  const eye = 0x1b1b22;
  if (expr === 'happy') {
    g.fillStyle(0x3a2a22, 1); g.fillRect(15, 22, 5, 1); g.fillRect(21, 22, 5, 1);
    g.fillStyle(eye, 1); g.fillRect(16, 24, 3, 2); g.fillRect(22, 24, 3, 2);
    g.fillStyle(0xff8a80, 1); g.fillRect(14, 28, 3, 2); g.fillRect(24, 28, 3, 2);
    g.fillStyle(eye, 1); g.fillRect(18, 31, 5, 2);
  } else if (expr === 'tired') {
    g.fillStyle(skin, 1); g.fillRect(16, 23, 3, 2); g.fillRect(22, 23, 3, 2);
    g.fillStyle(0x3a2a22, 1); g.fillRect(15, 22, 5, 1); g.fillRect(21, 22, 5, 1);
    g.fillStyle(eye, 1); g.fillRect(16, 25, 3, 2); g.fillRect(22, 25, 3, 2);
    g.fillStyle(eye, 1); g.fillRect(18, 32, 5, 1);
    g.fillStyle(0x90caf9, 1); g.fillRect(29, 22, 2, 3);
  } else {
    g.fillStyle(0xffffff, 1); g.fillRect(16, 23, 4, 4); g.fillRect(22, 23, 4, 4);
    g.fillStyle(eye, 1); g.fillRect(17, 24, 2, 2); g.fillRect(23, 24, 2, 2);
    g.fillStyle(0x3a2a22, 1); g.fillRect(15, 21, 5, 1); g.fillRect(21, 21, 5, 1);
    g.fillStyle(0x90caf9, 1); g.fillRect(29, 21, 2, 3);
    g.fillStyle(eye, 1); g.fillRect(18, 31, 5, 2);
  }
}

// 左侧舞台面板（108x452），含阶段专属道具剪影（带像素阴影）
export function createStageDecor(scene: Phaser.Scene, key: string, paletteName: PaletteName) {
  if (scene.textures.exists(key)) return;
  const W = 108, H = 452;
  const pal = PALETTE[paletteName];
  const g = scene.add.graphics();
  g.fillStyle(pal.panel, 0.96); g.fillRect(0, 0, W, H);
  g.fillStyle(pal.accent, 0.5); g.fillRect(W - 2, 0, 2, H);
  drawDiorama(g, paletteName, pal, W, H);
  g.generateTexture(key, W, H);
  g.destroy();
}

function drawDiorama(
  g: Phaser.GameObjects.Graphics, stage: PaletteName, pal: typeof PALETTE.gaokao, W: number, H: number
) {
  const cx = W / 2;
  const acc = pal.accent;
  // 地面 + 背景光
  g.fillStyle(0x000000, 0.28); g.fillRect(0, H - 60, W, 60);
  g.fillStyle(shade(pal.panel, 0.8), 1); g.fillRect(0, H - 60, W, 2);
  g.fillStyle(acc, 0.12); g.fillRect(cx - 30, 28, 60, 60);

  switch (stage) {
    case 'undergrad': {
      blockS(g, cx - 18, H - 90, 36, 8, 0xe94560, shade(0xe94560, 0.7));
      blockS(g, cx - 14, H - 100, 28, 8, 0x4fc3f7, shade(0x4fc3f7, 0.7));
      blockS(g, cx - 20, H - 110, 40, 8, 0xffd600, shade(0xffd600, 0.7));
      block(g, cx - 14, H - 126, 28, 8, 0x141414);
      g.fillStyle(0xffd600, 1); g.fillRect(cx + 12, H - 126, 2, 12);
      block(g, 18, H - 120, 4, 50, 0x455a64); block(g, 14, H - 70, 12, 4, 0x37474f);
      g.fillStyle(0xfff59d, 0.9); g.fillRect(12, H - 128, 20, 10);
      break;
    }
    case 'internship': {
      blockS(g, cx - 22, H - 96, 44, 10, 0xeceff1, shade(0xeceff1, 0.78)); // 枕头
      blockS(g, cx - 24, H - 86, 48, 26, 0x90a4ae, shade(0x90a4ae, 0.7)); // 被
      g.fillStyle(0xffffff, 1); g.fillRect(cx - 22, H - 94, 44, 4);
      g.fillStyle(0x607d8b, 1); g.fillRect(cx - 2, H - 130, 3, 44); // 输液杆
      g.fillStyle(0x4fc3f7, 0.85); g.fillRect(cx + 1, H - 132, 10, 12); // 液袋
      g.fillStyle(0xff5252, 1); g.fillRect(cx - 14, H - 128, 12, 12); g.fillRect(cx - 20, H - 122, 24, 4);
      break;
    }
    case 'guipei': {
      blockS(g, cx - 18, H - 120, 36, 26, 0xeceff1, shade(0xeceff1, 0.8)); // 夹板
      g.fillStyle(0xcfd8dc, 1); g.fillRect(cx - 14, H - 116, 28, 18);
      g.fillStyle(0x607d8b, 1); g.fillRect(cx - 12, H - 112, 24, 2);
      g.fillStyle(0x607d8b, 1); g.fillRect(cx - 12, H - 104, 24, 2);
      g.fillStyle(0xff5252, 1); g.fillRect(cx - 16, H - 70, 32, 14); g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 16, H - 64, 32, 6); g.fillRect(cx - 4, H - 70, 8, 14); // 心电/十字
      break;
    }
    case 'master':
    case 'phd': {
      g.fillStyle(0x455a64, 1); g.fillRect(cx - 14, H - 70, 28, 4); g.fillRect(cx - 10, H - 120, 4, 50); // 镜臂
      g.fillStyle(0x90a4ae, 1); g.fillRect(cx - 14, H - 124, 12, 8); g.fillRect(cx - 18, H - 74, 20, 6); // 镜筒/底座
      blockS(g, cx + 2, H - 110, 18, 22, 0x69f0ae, shade(0x69f0ae, 0.7)); // 烧瓶
      g.fillStyle(0x1b5e20, 1); g.fillRect(cx + 2, H - 100, 18, 12);
      blockS(g, cx - 30, H - 96, 26, 8, 0xb39ddb, shade(0xb39ddb, 0.7));
      blockS(g, cx - 28, H - 104, 22, 8, 0xffd600, shade(0xffd600, 0.7));
      break;
    }
    case 'jobhunt': {
      blockS(g, cx - 22, H - 90, 44, 28, 0x5d4037, shade(0x5d4037, 0.7)); // 公文包
      g.fillStyle(0x3e2723, 1); g.fillRect(cx - 10, H - 94, 20, 6);
      g.fillStyle(shade(0x5d4037, 0.6), 1); g.fillRect(cx - 22, H - 78, 44, 4);
      blockS(g, cx - 2, H - 130, 28, 36, 0x78909c, shade(0x78909c, 0.7)); // 楼
      g.fillStyle(0xffd600, 0.8);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.fillRect(cx + 2 + c * 10, H - 126 + r * 10, 6, 6);
      break;
    }
    case 'career': {
      g.fillStyle(0xffffff, 1); g.fillRect(cx - 26, H - 110, 52, 40); // 白板
      g.fillStyle(0xa5d6a7, 1); g.fillRect(cx - 16, H - 104, 32, 10); g.fillRect(cx - 6, H - 110, 12, 28); // 绿十字
      g.fillStyle(0x607d8b, 1); g.fillRect(cx - 2, H - 64, 3, 30);
      g.fillStyle(0xb0bec5, 1); g.fillCircle(cx + 2, H - 60, 3);
      g.fillStyle(0x78909c, 1); g.fillCircle(cx + 2, H - 60, 1);
      g.fillStyle(0xff5252, 1); g.fillRect(cx - 22, H - 70, 16, 16); g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 22, H - 64, 16, 5); g.fillRect(cx - 15, H - 70, 6, 16);
      break;
    }
    case 'gaokao': {
      blockS(g, cx - 30, H - 86, 60, 10, 0x6d4c41, shade(0x6d4c41, 0.7)); // 课桌
      block(g, cx - 26, H - 76, 52, 16, 0xfafafa); // 试卷
      g.fillStyle(0x90a4ae, 1); for (let i = 0; i < 4; i++) g.fillRect(cx - 22, H - 72 + i * 4, 44, 1);
      g.fillStyle(0xffb300, 1); g.fillRect(cx + 18, H - 90, 3, 14); g.fillRect(cx + 14, H - 90, 3, 4); // 铅笔
      g.fillStyle(0xe94560, 1); g.fillRect(cx - 10, H - 120, 20, 14); g.fillRect(cx - 6, H - 110, 12, 10); // 书
      break;
    }
    default: {
      g.fillStyle(acc, 0.4); g.fillRect(cx - 10, 30, 20, 20);
    }
  }
}
