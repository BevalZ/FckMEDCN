import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats, hasFlag } from '../data/gameState';
import { determineEnding } from '../data/endings';

// 旧存档兼容场景：本科阶段的卡片模式。新开局走 CampusScene（可行走校园）。
// 保留此场景是因为老存档的 sceneKey 可能仍是 'UndergradScene'，删掉会导致读档白屏。
export class UndergradScene extends BaseStageScene {
  constructor() {
    super({ key: 'UndergradScene' });
    this.stageName = 'undergrad';
    this.paletteName = 'undergrad';
    this.nextSceneKey = 'InternshipScene';
    this.maxTurns = 20;
  }

  protected getStageLabelText(): string {
    const holdback = hasFlag('ug_holdback') ? '（重修中）' : '';
    return `🎓 本科阶段${holdback} · ${getState().school?.name ?? '医学院'}`;
  }

  protected shouldAdvanceToNextStage(): boolean {
    // 留级：多读一年（4 个季度），与 CampusScene 的 totalTurns() 保持一致
    const total = this.maxTurns + (hasFlag('ug_holdback') ? 4 : 0);
    return getState().turnsInStage >= total;
  }

  protected transitionToNext() {
    // 本科退学：直接走结局，不再读到实习
    if (hasFlag('left_undergrad')) {
      const ending = determineEnding(getState());
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('EndingScene', { endingId: ending.id });
      });
      return;
    }
    super.transitionToNext();
  }

  protected doPassiveTurn() {
    const turn = getState().turnsInStage;
    if (turn >= 16) {
      updateStats({ knowledge: 3, stamina: -8 });
    } else {
      updateStats({ knowledge: 2, stamina: -5 });
    }
    super.doPassiveTurn();
  }
}
