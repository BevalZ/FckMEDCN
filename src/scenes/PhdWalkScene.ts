import { WalkStageScene } from '../ui/WalkStageScene';
import {
  PHD_SPEC, PHD_SPOTS, PHD_SPAWN, PHD_ORIGIN_Y,
  PHD_SLEEP_RECOVER, PHD_ACTIONS_PER_QUARTER,
} from '../data/phdMap';
import type { TileMapSpec } from '../ui/tilemap';
import type { Spot } from '../data/campusMap';
import type { StatDelta } from '../data/stats';
import type { LifeStage } from '../data/gameState';
import type { GameEvent } from '../data/events';
import { paperMarketEvent } from '../data/paperTrading';

// 博士阶段可行走场景（科研轨：硕士之后进入）。
// 读满学制后进入求职。
export class PhdWalkScene extends WalkStageScene {
  constructor() { super({ key: 'PhdWalkScene' }); }

  protected get stageName(): LifeStage { return 'phd'; }
  protected get mapKey(): string { return 'phd_map'; }
  protected get spec(): TileMapSpec { return PHD_SPEC; }
  protected get spots(): readonly Spot[] { return PHD_SPOTS; }
  protected get spawn(): readonly [number, number] { return PHD_SPAWN; }
  protected get originY(): number { return PHD_ORIGIN_Y; }
  protected get actionsPerQuarter(): number { return PHD_ACTIONS_PER_QUARTER; }
  protected get sleepRecover(): StatDelta { return PHD_SLEEP_RECOVER; }
  protected get maxTurns(): number { return 16; }

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
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('JobHuntScene'));
  }
}
