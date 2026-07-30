import { createDefaultStats, applyDelta } from './stats';
import type { Stats, StatDelta } from './stats';
import type { School, TrackType, DegreeType } from './constants';

export type LifeStage = 'gaokao' | 'undergrad' | 'internship' | 'guipei' | 'master' | 'phd' | 'jobhunt' | 'career' | 'ending';

export interface NewsItem { year: number; quarter: number; headline: string; type: 'event' | 'warning' | 'irony' | 'tragedy'; }

export interface GameState {
  stats: Stats; stage: LifeStage; school: School | null; track: TrackType | null;
  degree: DegreeType; score: number; year: number; quarter: number;
  turnsInStage: number; guipeiCity: string; newsLog: NewsItem[];
  flags: Set<string>; endingId: string | null;
  // —— 真实人生状态（恋爱/婚姻/家庭），会影响事件触发与经济 ——
  marital: 'single' | 'dating' | 'married';
  spouse: string | null;
  hasChild: boolean;
  familyAlive: number;
  /** NPC 好感度 0..100（M3）。缺省视为 40，见 npc.ts */
  affinity: Record<string, number>;
}

let _state: GameState = createInitialState();

export function createInitialState(): GameState {
  return {
    stats: createDefaultStats(), stage: 'gaokao', school: null, track: null,
    degree: 'bachelor', score: 0, year: 2024, quarter: 3, turnsInStage: 0,
    guipeiCity: '', newsLog: [], flags: new Set(), endingId: null,
    marital: 'single', spouse: null, hasChild: false, familyAlive: 4,
    affinity: {},
  };
}

export function getState(): GameState { return _state; }
export function setState(s: GameState) { _state = s; }

export function updateStats(delta: StatDelta) {
  _state = { ..._state, stats: applyDelta(_state.stats, delta) };
}

export function setFlag(flag: string) { _state.flags.add(flag); }
export function hasFlag(flag: string): boolean { return _state.flags.has(flag); }

// 局部更新状态（用于人生事件改变婚姻/家庭等字段）。
export function patchState(partial: Partial<GameState>) {
  _state = { ..._state, ...partial };
}

export function advanceTurn() {
  _state.turnsInStage++;
  _state.quarter++;
  if (_state.quarter > 4) {
    _state.quarter = 1;
    _state.year++;
    _state.stats.age++;
  }
}

export function addNews(item: NewsItem) {
  _state.newsLog.unshift(item);
  if (_state.newsLog.length > 50) _state.newsLog.pop();
}

// 重开钩子：其他模块（如存档系统）在此登记需要随 resetGame 一并清理的瞬态状态。
// save.ts 依赖 gameState，故不能反向 import，用登记回调解耦。
const _resetHooks: Array<() => void> = [];
export function registerResetHook(fn: () => void) { _resetHooks.push(fn); }

export function resetGame() {
  _state = createInitialState();
  for (const fn of _resetHooks) fn();
}
