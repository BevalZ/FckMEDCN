import Phaser from 'phaser';
import { resetGame, patchState, getState } from '../data/gameState';
import { clearSave } from '../data/save';
import { applyLegacyPerks } from '../data/legacy';
import type { ConsequencePopup } from './ConsequencePopup';

// 游戏中按 R 键"直接重新开档"：确认后放弃本局，直接开始全新一局（含传承加成）。
// 各场景（BaseStageScene 子类 + Campus/Hospital/GuipeiWalk）统一接入，避免重复实现。
export function bindRestartKey(
  scene: Phaser.Scene,
  consequence: ConsequencePopup,
  isBusy?: () => boolean,
) {
  scene.input.keyboard?.on('keydown-R', () => {
    // 小游戏中按键属于小游戏；已有弹窗展示时也不抢占，防误触
    if (isBusy?.() || consequence.busy) return;
    consequence.show(
      '【重新开档】\n确定放弃本局，直接开新档吗？\n当前进度将被覆盖。\n\n（按 空格 / 回车 确认，ESC 取消）',
      {},
      () => {
        resetGame();
        clearSave();
        patchState({ stats: applyLegacyPerks(getState().stats) });
        scene.scene.start('GaokaoScene');
      },
      { escape: 'cancel' },
    );
  });
}
