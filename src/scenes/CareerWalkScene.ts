import { WalkStageScene } from '../ui/WalkStageScene';
import {
  CAREER_SPEC, CAREER_SPOTS, CAREER_SPAWN, CAREER_ORIGIN_Y,
  CAREER_SLEEP_RECOVER, CAREER_ACTIONS_PER_QUARTER,
} from '../data/careerMap';
import type { TileMapSpec } from '../ui/tilemap';
import type { Spot } from '../data/campusMap';
import type { StatDelta } from '../data/stats';
import type { LifeStage } from '../data/gameState';
import type { GameEvent } from '../data/events';
import { getState } from '../data/gameState';
import { determineEnding } from '../data/endings';
import { paperMarketEvent } from '../data/paperTrading';

// 职业阶段可行走场景（临床轨：规培 / 求职后进入）。
// 复用 WalkStageScene 基类；读满学制后进入结局。
// 职业期不再是"读书"，故学业焦虑曲线归零，仅保留体力透支惩罚。
export class CareerWalkScene extends WalkStageScene {
  constructor() { super({ key: 'CareerWalkScene' }); }

  protected get stageName(): LifeStage { return 'career'; }
  protected get mapKey(): string { return 'career_map'; }
  protected get spec(): TileMapSpec { return CAREER_SPEC; }
  protected get spots(): readonly Spot[] { return CAREER_SPOTS; }
  protected get spawn(): readonly [number, number] { return CAREER_SPAWN; }
  protected get originY(): number { return CAREER_ORIGIN_Y; }
  protected get actionsPerQuarter(): number { return CAREER_ACTIONS_PER_QUARTER; }
  protected get sleepRecover(): StatDelta { return CAREER_SLEEP_RECOVER; }
  protected get maxTurns(): number { return 20; }

  /** 职业期不考核"学习进度"，故学业焦虑为 0；体力透支惩罚沿用基类默认。 */
  protected academicAnxiety(): number { return 0; }

  // 秘密地点（论文黑市）触发：职业期也可买卖论文（晋升/评职称用）
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
    const ending = determineEnding(getState());
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('EndingScene', { endingId: ending.id }));
  }
}
