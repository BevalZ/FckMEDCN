import { WalkStageScene } from '../ui/WalkStageScene';
import {
  MASTER_SPEC, MASTER_SPOTS, MASTER_SPAWN, MASTER_ORIGIN_Y,
  MASTER_SLEEP_RECOVER, MASTER_ACTIONS_PER_QUARTER,
} from '../data/masterMap';
import type { TileMapSpec } from '../ui/tilemap';
import type { Spot } from '../data/campusMap';
import type { StatDelta } from '../data/stats';
import type { LifeStage } from '../data/gameState';
import { nextSceneAfterMaster } from '../data/trainingTrack';
import type { GameEvent } from '../data/events';
import { paperMarketEvent } from '../data/paperTrading';

// 硕士阶段可行走场景（科研轨：规培后选"啃文献攒论文"进入）。
// 复用 WalkStageScene 基类；读满学制后进入博士。
export class MasterWalkScene extends WalkStageScene {
  constructor() { super({ key: 'MasterWalkScene' }); }

  protected get stageName(): LifeStage { return 'master'; }
  protected get mapKey(): string { return 'master_map'; }
  protected get spec(): TileMapSpec { return MASTER_SPEC; }
  protected get spots(): readonly Spot[] { return MASTER_SPOTS; }
  protected get spawn(): readonly [number, number] { return MASTER_SPAWN; }
  protected get originY(): number { return MASTER_ORIGIN_Y; }
  protected get actionsPerQuarter(): number { return MASTER_ACTIONS_PER_QUARTER; }
  protected get sleepRecover(): StatDelta { return MASTER_SLEEP_RECOVER; }
  protected get maxTurns(): number { return 12; }

  // 秘密地点（论文黑市）触发
  protected trySpecialEvent(spot: Spot): GameEvent | null {
    if (spot.id === 'secret_lab') return paperMarketEvent();
    return null;
  }
  protected specialHint(_spot: Spot): string | null {
    if (_spot.id === 'secret_lab') return '墙角似乎有扇没锁的门……';
    return null;
  }

  protected transitionToNext() {
    this.leaving = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(nextSceneAfterMaster('walk'));
    });
  }
}
