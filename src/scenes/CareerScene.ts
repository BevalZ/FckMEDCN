import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats } from '../data/gameState';
import { determineEnding } from '../data/endings';

export class CareerScene extends BaseStageScene {
  constructor() {
    super({ key: 'CareerScene' });
    this.stageName = 'career';
    this.paletteName = 'career';
    this.nextSceneKey = 'EndingScene';
    this.maxTurns = 12;
  }

  protected getStageLabelText(): string { return '🩺 职业阶段 · 漫漫晋升路'; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  protected doPassiveTurn() {
    updateStats({ stamina: -8, knowledge: 2 });
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
