import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats } from '../data/gameState';
import { nextSceneAfterMaster } from '../data/trainingTrack';

export class MasterScene extends BaseStageScene {
  constructor() {
    super({ key: 'MasterScene' });
    this.stageName = 'master';
    this.paletteName = 'master';
    this.nextSceneKey = 'PhDScene';
    this.maxTurns = 12;
  }

  protected getStageLabelText(): string { return '🔬 研究生阶段'; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }
  protected transitionToNext() {
    this.nextSceneKey = nextSceneAfterMaster('card');
    super.transitionToNext();
  }

  protected doPassiveTurn() {
    updateStats({ stamina: -12, knowledge: 5 });
    super.doPassiveTurn();
  }
}

export class PhDScene extends BaseStageScene {
  constructor() {
    super({ key: 'PhDScene' });
    this.stageName = 'phd';
    this.paletteName = 'phd';
    this.nextSceneKey = 'JobHuntScene';
    this.maxTurns = 16;
  }

  protected getStageLabelText(): string { return '🔬 博士研究生'; }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  protected doPassiveTurn() {
    updateStats({ stamina: -10, knowledge: 6 });
    super.doPassiveTurn();
  }
}
