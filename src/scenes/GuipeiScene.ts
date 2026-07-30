import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats, hasFlag } from '../data/gameState';
import { determineEnding } from '../data/endings';

export class GuipeiScene extends BaseStageScene {
  constructor() {
    super({ key: 'GuipeiScene' });
    this.stageName = 'guipei';
    this.paletteName = 'guipei';
    this.nextSceneKey = 'MasterScene';
    this.maxTurns = 12;
  }

  protected getStageLabelText(): string { return '🏥 住院医师规范化培训'; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  protected doPassiveTurn() {
    updateStats({ stamina: -16, sanity: -3 });
    super.doPassiveTurn();
  }

  protected transitionToNext() {
    // 若规培期真的退培（M2 分支 left_med），则直接走向"退出"结局，不再继续读到硕士/博士。
    if (hasFlag('left_med')) {
      const ending = determineEnding(getState());
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('EndingScene', { endingId: ending.id });
      });
      return;
    }
    super.transitionToNext();
  }
}
