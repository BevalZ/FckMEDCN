import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats } from '../data/gameState';

export class InternshipScene extends BaseStageScene {
  constructor() {
    super({ key: 'InternshipScene' });
    this.stageName = 'internship';
    this.paletteName = 'internship';
    this.nextSceneKey = 'GuipeiScene';
    this.maxTurns = 5;
  }

  protected getStageLabelText(): string { return '🏥 实习阶段 · 附属医院轮科'; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  protected doPassiveTurn() {
    updateStats({ stamina: -12, sanity: -3 });
    super.doPassiveTurn();
  }
}
