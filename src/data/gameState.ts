import { createDefaultStats, applyDelta } from './stats';
import type { Stats, StatDelta } from './stats';
import type { School, TrackType, DegreeType } from './constants';

export type LifeStage = 'gaokao' | 'undergrad' | 'internship' | 'guipei' | 'master' | 'phd' | 'jobhunt' | 'career' | 'ending';

export interface NewsItem { year: number; quarter: number; headline: string; type: 'event' | 'warning' | 'irony' | 'tragedy'; }

export type PlayerGender = 'male' | 'female';
export type FamilyWealth = 'rich' | 'middle' | 'tight';
export type FinanceStrategy = 'thrifty' | 'stable' | 'invest';
// 硕博阶段带组导师的绩效分配风格（随机，决定研究生补助/绩效收入）
export type MentorStyle = 'equal' | 'pyramid' | 'generous' | 'tight';

export type AssetTransactionKind =
  | 'deposit' | 'interest' | 'investment' | 'market' | 'withdrawal'
  | 'house' | 'education' | 'mortgage';

export interface AssetTransaction {
  kind: AssetTransactionKind;
  year: number;
  quarter: number;
  assetDelta: number;
  cashDelta: number;
  fee: number;
  balanceAfter: number;
  note: string;
}

export type GrowthAttr = 'luck' | 'looks';

// 开局点数分配：家境 / 成绩 / 运气 / 外貌（各 0-5，总预算 10）
export interface AttrAlloc {
  family: number;
  academic: number;
  luck: number;
  looks: number;
}

// 家境点数 → 家庭条件：0-1 拮据 / 2-3 普通 / 4-5 殷实
export function wealthFromFamily(f: number): FamilyWealth {
  if (f <= 1) return 'tight';
  if (f <= 3) return 'middle';
  return 'rich';
}

export interface GameState {
  stats: Stats; stage: LifeStage; school: School | null; track: TrackType | null;
  degree: DegreeType; score: number; year: number; quarter: number;
  turnsInStage: number; guipeiCity: string; newsLog: NewsItem[];
  flags: Set<string>; endingId: string | null;
  // —— 玩家性别（开局选择，仅影响少量称谓/叙述文案）——
  gender: PlayerGender;
  // —— 开局点数分配（家境/成绩/运气/外貌），家境决定家庭条件 ——
  attrs: AttrAlloc;
  // —— 家庭条件（由 attrs.family 决定，旧档兼容）——
  familyWealth: FamilyWealth;
  // —— 理财策略（R 菜单可调，每季自动按此分配收入/支出/结余）——
  financeStrategy: FinanceStrategy;
  // —— 资产账户（节流转储蓄 / 投资本金，随季计息或波动）——
  assets: number;
  // —— 最近 100 条资产流水（存入、收益、提现和大额用途）——
  assetLedger: AssetTransaction[];
  // —— 房贷剩余本金（购房时按首付的 4 倍建立估算，旧档缺省为 0）——
  mortgageBalance: number;
  // —— 硕博带组导师绩效分配风格（随机）——
  mentorStyle: MentorStyle;
  // —— 真实人生状态（恋爱/婚姻/家庭），会影响事件触发与经济 ——
  marital: 'single' | 'dating' | 'married';
  spouse: string | null;
  hasChild: boolean;
  familyAlive: number;
  /** NPC 好感度 0..100（M3）。缺省视为 40，见 npc.ts */
  affinity: Record<string, number>;
  // —— 数值计数器（长学制连续低分季数等需要累加的状态，flag 只能布尔）——
  counters: Record<string, number>;
}

// 默认分配：成绩点满（保证 685+ 分数线可选），家境普通
const DEFAULT_ATTRS: AttrAlloc = { family: 2, academic: 5, luck: 1, looks: 2 };

// 硕博导师绩效风格随机：平均 / 金字塔 / 慷慨 / 抠门
function rollMentorStyle(): MentorStyle {
  const r = Math.random();
  if (r < 0.3) return 'equal';
  if (r < 0.6) return 'pyramid';
  if (r < 0.85) return 'generous';
  return 'tight';
}

let _state: GameState = createInitialState();

export function createInitialState(): GameState {
  const attrs = DEFAULT_ATTRS;
  return {
    stats: createDefaultStats(), stage: 'gaokao', school: null, track: null,
    degree: 'bachelor', score: 0, year: 2024, quarter: 3, turnsInStage: 0,
    guipeiCity: '', newsLog: [], flags: new Set(), endingId: null,
    gender: 'male',
    attrs: { ...attrs },
    familyWealth: wealthFromFamily(attrs.family),
    financeStrategy: 'stable',
    assets: 0,
    assetLedger: [],
    mortgageBalance: 0,
    mentorStyle: rollMentorStyle(),
    marital: 'single', spouse: null, hasChild: false, familyAlive: 4,
    affinity: {},
    counters: {},
  };
}

export function getState(): GameState { return _state; }
export function setState(s: GameState) { _state = s; }

export function updateStats(delta: StatDelta) {
  _state = { ..._state, stats: applyDelta(_state.stats, delta) };
}

export function setFlag(flag: string) { _state.flags.add(flag); }
export function hasFlag(flag: string): boolean { return _state.flags.has(flag); }

// 数值计数器：flag 只能表达布尔，连续计数（如长学制连续低分季）需要真值存储。
export function getCounter(key: string): number {
  return _state.counters[key] ?? 0;
}
export function setCounter(key: string, value: number) {
  _state = { ..._state, counters: { ..._state.counters, [key]: value } };
}
export function incCounter(key: string, by = 1): number {
  const next = getCounter(key) + by;
  setCounter(key, next);
  return next;
}

// 局部更新状态（用于人生事件改变婚姻/家庭等字段）。
export function patchState(partial: Partial<GameState>) {
  _state = { ..._state, ...partial };
}

/** 改变可成长开局属性，并把变化写入新闻历史，范围固定为 0..5。 */
export function changeAttr(attr: GrowthAttr, delta: number, reason: string): number {
  const attrs = _state.attrs ?? { family: 2, academic: 5, luck: 1, looks: 2 };
  const before = Math.max(0, Math.min(5, Math.round(attrs[attr] ?? 0)));
  const after = Math.max(0, Math.min(5, before + Math.round(delta)));
  if (after === before) return 0;
  patchState({ attrs: { ...attrs, [attr]: after } });
  const label = attr === 'luck' ? '运气' : '外貌';
  addNews({
    year: _state.year,
    quarter: _state.quarter,
    headline: `属性变化：${label} ${after > before ? '+' : ''}${after - before}（${reason}）`,
    type: after > before ? 'event' : 'warning',
  });
  return after - before;
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
