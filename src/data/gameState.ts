import { createDefaultStats, applyDelta } from './stats';
import type { Stats, StatDelta } from './stats';
import type { School, TrackType, DegreeType } from './constants';
import { DEFAULT_MOTIVATION } from './motivation';
import type { InitialAnswer, MotivationKind, MotivationProfile } from './motivation';
import { DEFAULT_UNDERGRAD_PROGRESS } from './undergradProgress';
import type { UndergradProgress } from './undergradProgress';
import { DEFAULT_ERA0_PROGRESS } from './era0';
import type { Era0Progress } from './era0';
import { DEFAULT_ERA3_PROGRESS } from './era3';
import type { Era3Progress } from './era3';
import { DEFAULT_HEALTH_STATE } from './health';
import type { HealthState } from './health';
import { DEFAULT_FINANCE_STATE } from './finance';
import type { FinanceState } from './finance';
import { DEFAULT_POLICY_STATE } from './policy';
import type { PolicyState } from './policy';
import { DEFAULT_LATE_LIFE_STATE } from './lateLife';
import type { LateLifeState } from './lateLife';
import { DEFAULT_LEGAL_STATE } from './legal';
import type { LegalState } from './legal';
import { DEFAULT_RESEARCH_STATE } from './research';
import type { ResearchState } from './research';
import { DEFAULT_MENTOR_FACTION_STATE } from './mentorFaction';
import type { MentorFactionState } from './mentorFaction';
import { DEFAULT_COLLEAGUE_STATE } from './colleagues';
import type { ColleagueState } from './colleagues';
import { DEFAULT_FAMILY_STATE } from './family';
import type { FamilyState } from './family';
import { DEFAULT_LOVE_STATE } from './loveMarriage';
import type { LoveMarriageState } from './loveMarriage';
import { DEFAULT_SPIRIT_STATE } from './spirit';
import type { SpiritState } from './spirit';
import { DEFAULT_PUBLIC_IMAGE_STATE } from './publicImage';
import type { PublicImageState } from './publicImage';
import { DEFAULT_LEISURE_STATE } from './leisure';
import type { LeisureState } from './leisure';
import { generateNpcNames } from './npcIdentity';
import { createPandemicState } from './pandemic';
import type { PandemicState } from './pandemic';

export type LifeStage = 'gaokao' | 'undergrad' | 'internship' | 'guipei' | 'master' | 'phd' | 'jobhunt' | 'career' | 'pinnacle' | 'retirement' | 'eternity' | 'ending';

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
  // —— 时代0“学医动机”：三维画像 + 最终形成的初心印记 ——
  motivation: MotivationProfile;
  initialMotivation: MotivationKind | null;
  initialAnswer: InitialAnswer | null;
  era0: Era0Progress;
  // —— 时代3：规培与硕博并轨进度（旧档由 save.ts 补默认值）——
  era3: Era3Progress;
  // —— 贯穿全生命周期的身体、财务和政策状态 ——
  health: HealthState;
  finance: FinanceState;
  policy: PolicyState;
  legal: LegalState;
  research: ResearchState;
  mentorFaction: MentorFactionState;
  colleagues: ColleagueState;
  family: FamilyState;
  love: LoveMarriageState;
  spirit: SpiritState;
  publicImage: PublicImageState;
  leisure: LeisureState;
  // —— 时代6-8：传承、退休与归途 ——
  lateLife: LateLifeState;
  // —— 时代1：职业认同、学业危机、退学思考与休学状态 ——
  undergrad: UndergradProgress;
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
  /** 本存档的 NPC 随机姓名；角色 id/职业原型固定，姓名随新档重掷。 */
  npcNames: Record<string, string>;
  /** 约每 10-15 年出现一次的突发疫情，时间表随存档持久化。 */
  pandemic: PandemicState;
  // —— 数值计数器（长学制连续低分季数等需要累加的状态，flag 只能布尔）——
  counters: Record<string, number>;
  // —— 求职写实：签三方的单位 id 与已拿到的 offer 列表（多 offer 抉择/违约用）——
  signedUnitId: string | null;
  jobOffers: string[];
}

// 默认分配：成绩点满（保证 685+ 分数线可选），家境普通
const DEFAULT_ATTRS: AttrAlloc = { family: 2, academic: 5, luck: 1, looks: 2 };

function normalizeAttrValue(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(5, Math.round(value)));
}

/** Normalize legacy or partially corrupted attribute allocations without propagating NaN. */
export function normalizeAttrAlloc(raw: unknown): AttrAlloc {
  const input = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  return {
    family: normalizeAttrValue(input.family, DEFAULT_ATTRS.family),
    academic: normalizeAttrValue(input.academic, DEFAULT_ATTRS.academic),
    luck: normalizeAttrValue(input.luck, DEFAULT_ATTRS.luck),
    looks: normalizeAttrValue(input.looks, DEFAULT_ATTRS.looks),
  };
}

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
    motivation: { ...DEFAULT_MOTIVATION },
    initialMotivation: null,
    initialAnswer: null,
    era0: { ...DEFAULT_ERA0_PROGRESS },
    era3: { ...DEFAULT_ERA3_PROGRESS, mentor: { ...DEFAULT_ERA3_PROGRESS.mentor }, residency: { ...DEFAULT_ERA3_PROGRESS.residency }, research: { ...DEFAULT_ERA3_PROGRESS.research } },
    health: { ...DEFAULT_HEALTH_STATE, addiction: { ...DEFAULT_HEALTH_STATE.addiction }, chronicDiseases: [], majorIncidents: [] },
    finance: { ...DEFAULT_FINANCE_STATE, income: { ...DEFAULT_FINANCE_STATE.income }, expense: { ...DEFAULT_FINANCE_STATE.expense }, majorPurchases: [] },
    policy: { ...DEFAULT_POLICY_STATE, drg: { ...DEFAULT_POLICY_STATE.drg }, procurement: { ...DEFAULT_POLICY_STATE.procurement, rounds: [], productsAffected: [] }, hospital: { ...DEFAULT_POLICY_STATE.hospital, inspectionHistory: [] }, policyViolations: [] },
    legal: { ...DEFAULT_LEGAL_STATE, records: { ...DEFAULT_LEGAL_STATE.records, violations: [] }, disputes: { ...DEFAULT_LEGAL_STATE.disputes } },
    research: { ...DEFAULT_RESEARCH_STATE, papers: { published: [], inProgress: null }, grants: { applied: [], active: [] }, misconduct: { violations: [], investigationStatus: 'none', penalty: { fundingBan: 0, paperRetraction: false, reputationLoss: 0 } } },
    mentorFaction: { ...DEFAULT_MENTOR_FACTION_STATE, faction: { ...DEFAULT_MENTOR_FACTION_STATE.faction, resources: { ...DEFAULT_MENTOR_FACTION_STATE.faction.resources } }, benefactors: [], rivals: [], alignmentHistory: [] },
    colleagues: { ...DEFAULT_COLLEAGUE_STATE, peers: [], nurses: { headNurse: { ...DEFAULT_COLLEAGUE_STATE.nurses.headNurse }, seniorNurses: [] }, students: [], conflicts: [] },
    family: { ...DEFAULT_FAMILY_STATE, origin: { parents: { ...DEFAULT_FAMILY_STATE.origin.parents }, siblings: { ...DEFAULT_FAMILY_STATE.origin.siblings } }, spouse: { ...DEFAULT_FAMILY_STATE.spouse }, children: [], events: { ...DEFAULT_FAMILY_STATE.events, familyTragedies: [] }, conflict: { ...DEFAULT_FAMILY_STATE.conflict } },
    love: { ...DEFAULT_LOVE_STATE, spouse: { ...DEFAULT_LOVE_STATE.spouse }, datingHistory: [], crises: [], temptations: { ...DEFAULT_LOVE_STATE.temptations } },
    spirit: { ...DEFAULT_SPIRIT_STATE, purpose: { ...DEFAULT_SPIRIT_STATE.purpose, history: [] }, meaningSources: { ...DEFAULT_SPIRIT_STATE.meaningSources }, meaningHistory: [50], flashbacks: { ...DEFAULT_SPIRIT_STATE.flashbacks }, resiliencePillars: { ...DEFAULT_SPIRIT_STATE.resiliencePillars }, crises: [] },
    publicImage: { ...DEFAULT_PUBLIC_IMAGE_STATE, incidents: [], onlineHarassment: { ...DEFAULT_PUBLIC_IMAGE_STATE.onlineHarassment, platforms: [] }, socialMedia: { ...DEFAULT_PUBLIC_IMAGE_STATE.socialMedia }, privacy: { ...DEFAULT_PUBLIC_IMAGE_STATE.privacy, pastViolations: [] }, crisisHistory: [] },
    leisure: { ...DEFAULT_LEISURE_STATE, hobbies: [], sideBusiness: { ...DEFAULT_LEISURE_STATE.sideBusiness }, social: { ...DEFAULT_LEISURE_STATE.social, circles: DEFAULT_LEISURE_STATE.social.circles.map(c => ({ ...c })), opportunities: [] }, leisureHistory: [] },
    lateLife: { ...DEFAULT_LATE_LIFE_STATE, bucketList: { ...DEFAULT_LATE_LIFE_STATE.bucketList }, echoesConsumed: [] },
    undergrad: { ...DEFAULT_UNDERGRAD_PROGRESS },
    familyWealth: wealthFromFamily(attrs.family),
    financeStrategy: 'stable',
    assets: 0,
    assetLedger: [],
    mortgageBalance: 0,
    mentorStyle: rollMentorStyle(),
    marital: 'single', spouse: null, hasChild: false, familyAlive: 4,
    affinity: {},
    npcNames: generateNpcNames(),
    pandemic: createPandemicState(2024, 3),
    counters: {},
    signedUnitId: null,
    jobOffers: [],
  };
}

export function getState(): GameState { return _state; }
export function setState(s: GameState) { _state = s; }

export function updateStats(delta: StatDelta) {
  _state = { ..._state, stats: applyDelta(_state.stats, delta) };
  // 外科累积磨损：体力不可超过当前上限（counter 由 specialtyLoad 维护）
  const wear = _state.counters['surg_stamina_wear'] ?? 0;
  if (wear > 0) {
    const cap = Math.max(70, 100 - Math.min(30, wear));
    if (_state.stats.stamina > cap) {
      _state = { ..._state, stats: { ..._state.stats, stamina: cap } };
    }
  }
}

export function setFlag(flag: string) { _state.flags.add(flag); }
export function hasFlag(flag: string): boolean { return _state.flags.has(flag); }
export function clearFlag(flag: string) { _state.flags.delete(flag); }

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

const MIN_STAGE_AGE: Partial<Record<LifeStage, number>> = {
  career: 35, pinnacle: 50, retirement: 65, eternity: 70,
};

/** 仅在真正跨阶段时重置局部回合；同阶段读档不会丢进度。 */
export function enterStage(stage: LifeStage) {
  if (_state.stage === stage) return;
  const minAge = MIN_STAGE_AGE[stage] ?? _state.stats.age;
  const nextAge = Math.max(_state.stats.age, minAge);
  const elapsedYears = nextAge - _state.stats.age;
  _state = {
    ..._state,
    stage,
    turnsInStage: 0,
    year: _state.year + elapsedYears,
    stats: { ..._state.stats, age: nextAge },
  };
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
