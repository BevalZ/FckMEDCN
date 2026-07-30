import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats } from '../data/gameState';
import { determineEnding } from '../data/endings';

export class JobHuntScene extends BaseStageScene {
  constructor() {
    super({ key: 'JobHuntScene' });
    this.stageName = 'jobhunt';
    this.paletteName = 'jobhunt';
    this.nextSceneKey = 'CareerScene';
    this.maxTurns = 4;
  }

  protected getStageLabelText(): string { return `💼 求职阶段 · ${getState().stats.age}岁`; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  protected doPassiveTurn() {
    updateStats({ stamina: -8, sanity: -3 });
    super.doPassiveTurn();
  }

  protected transitionToNext() {
    const ending = determineEnding(getState());
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('EndingScene', { endingId: ending.id });
    });
  }
}
