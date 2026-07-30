import Phaser from 'phaser';
import { PALETTE, shade } from './pixelArt';
import type { PaletteName } from './pixelArt';

// ASCII 网格地图 → 一张整幅贴图 + 合并后的静态碰撞体。
// 沿用项目既有惯例（createBgTexture / createStageDecor）：美术全部代码生成，不依赖外部素材。
// 之所以整幅绘成单张贴图而非每格一个 image：一屏 30x14=420 格，420 个 GameObject 的
// 开销与绘制顺序管理都没必要——地图是静态的，一次绘完即可。

export interface TileMapSpec {
  tile: number;
  cols: number;
  rows: number;
  grid: string[];
  /** 视为实心（不可通行）的字符集合 */
  solid: string;
}

export interface RenderedTileMap {
  image: Phaser.GameObjects.Image;
  solids: Phaser.Physics.Arcade.StaticGroup;
  /** 格坐标 → 世界坐标（格中心） */
  tileCenter: (col: number, row: number) => { x: number; y: number };
  /** 该格是否实心（不可通行）。越界也视为实心，便于放置逻辑直接用。 */
  isSolid: (col: number, row: number) => boolean;
}

/**
 * 纯数据版的实心判定。渲染（renderTileMap）与放置校验（npcTileNear / 回归测试）
 * 共用同一份规则，避免两处各写一遍 `solid.includes(...)` 而悄悄漂移。
 * 越界一律视为实心：调用方（如 NPC 站位搜索）据此拒绝把对象放到地图外。
 */
export function makeIsSolid(spec: TileMapSpec): (col: number, row: number) => boolean {
  return (col, row) => {
    if (col < 0 || row < 0 || col >= spec.cols || row >= spec.rows) return true;
    return spec.solid.includes(spec.grid[row][col]);
  };
}

// —— 各字符的绘制子程序 ——
// ',' 草地/走廊  '.' 路面/地砖  '#' 围墙  'T' 树（仅校园）  'L' 图书馆/实验室  'C' 教学楼/食堂
// 'D' 宿舍/办公室  'F' 食堂  'P' 操场  'B' 公告栏  'E' 急诊  'W' 病房  'O' 手术室/办公室
// 'N' 护士站  'R' 值班室  'I' 内科  'S' 外科  'U' 电梯/楼梯  'K' 技能中心（落 default 建筑渲染）
// ⚠️ 一个字符全项目只能有一个 case（switch 语义：重复 case 后者永不可达）。
//    新地图要用新字符时先查本列表，tilemap-chars.spec.ts 会静态兜底。
function drawTile(
  g: Phaser.GameObjects.Graphics, ch: string, x: number, y: number, t: number,
  pal: typeof PALETTE.gaokao, col: number, row: number,
) {
  const grass = 0x2f4f43;
  const road = 0x53585f;

  // 先铺底：非路面一律先铺草，保证建筑边缘不出现透明缝
  const base = ch === '.' ? road : grass;
  g.fillStyle(base, 1);
  g.fillRect(x, y, t, t);
  // 棋盘微差，避免大片纯色显得平
  if (((col + row) & 1) === 0) {
    g.fillStyle(shade(base, 1.07), 1);
    g.fillRect(x, y, t, t);
  }

  switch (ch) {
    case ',': { // 草地：几簇确定性草叶
      const seed = (col * 7 + row * 13) % 5;
      g.fillStyle(shade(grass, 1.3), 1);
      g.fillRect(x + 6 + seed * 3, y + 20, 2, 5);
      g.fillRect(x + 12 + seed * 2, y + 24, 2, 4);
      break;
    }
    case '.': { // 路面：横向砖缝
      g.fillStyle(shade(road, 0.86), 1);
      g.fillRect(x, y + t - 2, t, 2);
      if (((col + row) & 1) === 0) g.fillRect(x + t - 2, y, 2, t);
      break;
    }
    case '#': { // 围墙
      g.fillStyle(0x3b4048, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(0x3b4048, 1.25), 1); g.fillRect(x, y, t, 4);
      g.fillStyle(shade(0x3b4048, 0.7), 1); g.fillRect(x, y + t - 4, t, 4);
      g.fillStyle(shade(0x3b4048, 0.85), 1); g.fillRect(x + t / 2 - 1, y + 4, 2, t - 8);
      break;
    }
    case 'T': { // 树：树干 + 三层树冠
      g.fillStyle(0x4e342e, 1); g.fillRect(x + t / 2 - 3, y + 18, 6, 14);
      g.fillStyle(0x2e7d52, 1); g.fillRect(x + 3, y + 8, t - 6, 12);
      g.fillStyle(0x34996b, 1); g.fillRect(x + 6, y + 3, t - 12, 10);
      g.fillStyle(shade(0x2e7d52, 0.7), 1); g.fillRect(x + 3, y + 18, t - 6, 2);
      break;
    }
    case 'P': { // 操场：塑胶跑道
      g.fillStyle(0x8d4a3a, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(0x8d4a3a, 1.12), 1); g.fillRect(x, y + 6, t, 2);
      g.fillStyle(0xdcdcdc, 0.55); g.fillRect(x, y + t - 8, t, 2);
      break;
    }
    case 'B': { // 公告栏
      g.fillStyle(0x6d4c41, 1); g.fillRect(x + 4, y + 20, 4, 12); g.fillRect(x + t - 8, y + 20, 4, 12);
      g.fillStyle(0x37474f, 1); g.fillRect(x + 2, y + 4, t - 4, 18);
      g.fillStyle(0xfafafa, 1); g.fillRect(x + 5, y + 7, 9, 12); g.fillRect(x + 17, y + 7, 9, 12);
      g.fillStyle(pal.accent, 0.8); g.fillRect(x + 5, y + 7, 9, 3);
      break;
    }
    // —— 医院专用字符 ——
    case 'E': { // 急诊：红底 + 十字
      g.fillStyle(0xc62828, 1); g.fillRect(x, y, t, t);
      g.fillStyle(0xffffff, 1); g.fillRect(x + 10, y + 6, 12, 20);
      g.fillStyle(0xffffff, 1); g.fillRect(x + 6, y + 10, 20, 12);
      g.fillStyle(0xc62828, 1); g.fillRect(x + 12, y + 8, 8, 16);
      g.fillStyle(0xc62828, 1); g.fillRect(x + 8, y + 12, 16, 8);
      break;
    }
    case 'W': { // 病房：淡蓝 + 床
      g.fillStyle(0x90caf9, 1); g.fillRect(x, y, t, t);
      g.fillStyle(0xffffff, 0.7); g.fillRect(x + 4, y + 10, t - 8, 12);
      g.fillStyle(0x78909c, 1); g.fillRect(x + 5, y + 12, t - 10, 3);
      g.fillStyle(0x78909c, 1); g.fillRect(x + 8, y + 10, 3, 12);
      break;
    }
    case 'O': { // 手术室：绿 + 无影灯
      g.fillStyle(0x4db6ac, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(0x4db6ac, 1.2), 1); g.fillRect(x + 6, y + 4, 20, 6);
      g.fillStyle(0xffffff, 0.8); g.fillRect(x + 10, y + 5, 12, 4);
      g.fillStyle(0x37474f, 1); g.fillRect(x + 6, y + 14, t - 12, 10);
      break;
    }
    case 'N': { // 护士站：淡紫 + 台面
      g.fillStyle(0xce93d8, 1); g.fillRect(x, y, t, t);
      g.fillStyle(0xffffff, 0.6); g.fillRect(x + 2, y + 14, t - 4, 8);
      g.fillStyle(shade(0xce93d8, 0.7), 1); g.fillRect(x + 2, y + 22, t - 4, 5);
      g.fillStyle(0x37474f, 1); g.fillRect(x + 4, y + 16, 8, 5);
      g.fillRect(x + t - 12, y + 16, 8, 5);
      break;
    }
    case 'R': { // 值班室：灰 + 床
      g.fillStyle(0x888094, 1); g.fillRect(x, y, t, t);
      g.fillStyle(0x546e7a, 1); g.fillRect(x + 4, y + 12, t - 8, 14);
      g.fillStyle(0xffffff, 0.5); g.fillRect(x + 6, y + 14, t - 12, 3);
      g.fillStyle(0xffd600, 0.5); g.fillRect(x + 6, y + 4, 6, 6);
      break;
    }
    // —— 规培专用字符 ——
    case 'I': { // 内科：淡粉 + 心形示意
      g.fillStyle(0xf48fb1, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(0xf48fb1, 1.2), 1); g.fillRect(x, y, t, 3);
      g.fillStyle(0xffffff, 0.7); g.fillRect(x + 8, y + 8, 16, 16);
      g.fillStyle(0xf48fb1, 1); g.fillCircle(x + 16, y + 16, 6);
      break;
    }
    case 'S': { // 外科：深蓝 + 手术刀
      g.fillStyle(0x5c6bc0, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(0x5c6bc0, 1.15), 1); g.fillRect(x, y, t, 3);
      g.fillStyle(0xffffff, 0.8); g.fillRect(x + 5, y + 12, 22, 4);
      g.fillStyle(0xffffff, 0.8); g.fillRect(x + 14, y + 6, 4, 16);
      break;
    }
    case 'U': { // 电梯/楼梯（医院/规培）
      g.fillStyle(0x607d8b, 1); g.fillRect(x, y, t, t);
      g.fillStyle(0xffffff, 0.5); g.fillRect(x + 4, y + 4, t - 8, t - 8);
      g.fillStyle(0x607d8b, 1); g.fillRect(x + 8, y + 8, t - 16, t - 16);
      g.fillStyle(0xffffff, 0.3); g.fillRect(x + 12, y + 12, t - 24, t - 24);
      break;
    }
    default: { // 建筑（校园通用 L/C/D/F + 医院/规培 O/L 等）：楼体 + 窗
      const body = ch === 'L' ? 0x8d6e63
        : ch === 'C' ? 0x7986cb
        : ch === 'D' ? 0x6d8b74
        : ch === 'F' ? 0xbf8b5e
        : 0x78909c;
      g.fillStyle(body, 1); g.fillRect(x, y, t, t);
      g.fillStyle(shade(body, 1.18), 1); g.fillRect(x, y, t, 3);
      g.fillStyle(shade(body, 0.66), 1); g.fillRect(x, y + t - 3, t, 3); g.fillRect(x + t - 3, y, 3, t);
      // 窗：暖光，晚自习的感觉
      g.fillStyle(0xffe082, 0.9);
      g.fillRect(x + 6, y + 8, 8, 9);
      g.fillRect(x + t - 14, y + 8, 8, 9);
      g.fillStyle(shade(0xffe082, 0.55), 1);
      g.fillRect(x + 6, y + 15, 8, 2); g.fillRect(x + t - 14, y + 15, 8, 2);
      break;
    }
  }
}

export function renderTileMap(
  scene: Phaser.Scene, key: string, spec: TileMapSpec,
  paletteName: PaletteName, originY: number,
): RenderedTileMap {
  const { tile: t, cols, rows, grid } = spec;
  // 数据自检：网格尺寸必须与声明一致，否则后续坐标换算全部错位且难以排查
  if (grid.length !== rows) {
    throw new Error(`tilemap "${key}": grid 有 ${grid.length} 行，声明 rows=${rows}`);
  }
  grid.forEach((line, i) => {
    if (line.length !== cols) {
      throw new Error(`tilemap "${key}": 第 ${i} 行长度 ${line.length}，声明 cols=${cols}`);
    }
  });

  const W = cols * t, H = rows * t;
  const pal = PALETTE[paletteName];

  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        drawTile(g, grid[row][col], col * t, row * t, t, pal, col, row);
      }
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }

  const image = scene.add.image(0, originY, key).setOrigin(0).setDepth(0);

  // 实心格按水平连续段合并成矩形刚体，减少刚体数量（420 格 → 数十个）。
  const isSolid = makeIsSolid(spec);
  const solids = scene.physics.add.staticGroup();
  for (let row = 0; row < rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= cols; col++) {
      const solid = col < cols && isSolid(col, row);
      if (solid && runStart < 0) runStart = col;
      if (!solid && runStart >= 0) {
        const len = col - runStart;
        const rect = scene.add.rectangle(
          runStart * t + (len * t) / 2, originY + row * t + t / 2, len * t, t,
        );
        solids.add(rect);
        runStart = -1;
      }
    }
  }

  const tileCenter = (col: number, row: number) => ({
    x: col * t + t / 2,
    y: originY + row * t + t / 2,
  });

  // 越界一律视为实心：调用方（如 NPC 站位搜索）据此拒绝把对象放到地图外。
  return { image, solids, tileCenter, isSolid };
}
