import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './data/constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GaokaoScene } from './scenes/GaokaoScene';
import { UndergradScene } from './scenes/UndergradScene';
import { CampusScene } from './scenes/CampusScene';
import { InternshipScene } from './scenes/InternshipScene';
import { HospitalScene } from './scenes/HospitalScene';
import { GuipeiScene } from './scenes/GuipeiScene';
import { GuipeiWalkScene } from './scenes/GuipeiWalkScene';
import { MasterScene, PhDScene } from './scenes/MasterScene';
import { JobHuntScene } from './scenes/JobHuntScene';
import { CareerScene } from './scenes/CareerScene';
import { EndingScene, MentalCrisisScene } from './scenes/EndingScene';
import { CollectionScene } from './scenes/CollectionScene';
import { installTextPatch } from './ui/textPatch';

// 全局文字补丁：修正中文字形顶部被裁（必须在任何场景 add.text 前安装）。
installTextPatch();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  // 关闭 pixelArt 与取消 CSS 的 nearest-neighbor 缩放，让中文细笔画走抗锯齿并完整渲染；
  // 用 resolution 撑高内部画布分辨率（设备像素比，最多 2 倍），兼顾美术质感与文字清晰度。
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 可行走场景（CampusScene）需要 Arcade 物理做移动与建筑碰撞；
  // 俯视视角故无重力。其余卡片式场景不受影响。
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    TitleScene,
    GaokaoScene,
    CampusScene,
    // UndergradScene 保留注册：旧存档的 sceneKey 仍可能是它，删掉会导致读档白屏。
    UndergradScene,
    InternshipScene,
    HospitalScene,
    GuipeiScene,
    GuipeiWalkScene,
    MasterScene,
    PhDScene,
    JobHuntScene,
    CareerScene,
    EndingScene,
    MentalCrisisScene,
    CollectionScene,
  ],
};

const game = new Phaser.Game(config);

// 仅开发构建暴露给自动化冒烟测试读取场景状态；生产包不含这段。
// 注意：测试里用 import('/src/data/xxx.ts') 会拿到**另一个模块实例**（Vite 按 URL 缓存，
// 应用内是相对路径 './xxx'），两边的模块级单例互不相通。故凡是需要与游戏共享状态的
// 模块，都必须从这里挂出去，测试不能自己 import。
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.game = game;
  void Promise.all([
    import('./data/gameState'),
    import('./data/integrity'),
    import('./data/npc'),
    import('./data/stats'),
    import('./data/turnFlow'),
    import('./data/events'),
    import('./data/campusMap'),
    import('./data/endings'),
    import('./data/hospitalMap'),
    import('./data/guipeiMap'),
    import('./ui/npcPlacement'),
    import('./ui/tilemap'),
    import('./data/collection'),
    import('./data/badges'),
  ]).then(([gs, ig, npc, stats, tf, ev, cm, en, hm, gm, np, tm, col, bad]) => {
    w.__state = gs.getState;
    w.__setFlag = gs.setFlag;
    w.__patchState = gs.patchState;
    w.__mod = { gs, ig, npc, stats, tf, ev, cm, en, hm, gm, np, tm, col, bad };
  });
}
