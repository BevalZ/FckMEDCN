import { getState, normalizeAttrAlloc, setState, registerResetHook } from './gameState';
import type { GameState } from './gameState';
import { migrateStats } from './stats';
import { normalizeMotivation } from './motivation';
import { normalizeUndergradProgress } from './undergradProgress';
import { normalizeEra0 } from './era0';
import { normalizeEra3 } from './era3';
import { normalizeHealth } from './health';
import { normalizeFinance } from './finance';
import { normalizePolicy } from './policy';
import { normalizeLateLife } from './lateLife';
import { normalizeLegal } from './legal';
import { normalizeResearch } from './research';
import { normalizeMentorFaction } from './mentorFaction';
import { normalizeColleagues } from './colleagues';
import { normalizeFamily } from './family';
import { normalizeLove } from './loveMarriage';
import { normalizeSpirit } from './spirit';
import { normalizePublicImage } from './publicImage';
import { normalizeLeisure } from './leisure';
import { generateNpcNames } from './npcIdentity';
import { normalizePandemic } from './pandemic';

// 存档系统：localStorage 自动存档 / 读档。
// 由于 GameState.flags 是 Set，需要序列化为数组；读档时重建为 Set。
// 恢复进度以"当前场景 key"为准（state.stage 在流程中固定为 gaokao，不可靠）。

const KEY = 'fckmedcn_save_v1';

interface SaveBlob {
  version: number;
  sceneKey: string;
  savedAt: number;
  state: Omit<GameState, 'flags'> & { flags: string[] };
  firedEvents: string[];
  firedNews: string[];
}

let pendingFired: { firedEvents: string[]; firedNews: string[] } | null = null;

// 重开时清掉待恢复的已触发集合，否则新开局会继承上一局的 once 事件屏蔽。
registerResetHook(() => { pendingFired = null; });

export function saveGame(sceneKey: string, firedEvents: string[] = [], firedNews: string[] = []) {
  try {
    const s = getState();
    const blob: SaveBlob = {
      version: 1,
      sceneKey,
      savedAt: Date.now(),
      state: { ...s, flags: Array.from(s.flags) },
      firedEvents,
      firedNews,
    };
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    /* localStorage 不可用或写入失败，静默忽略 */
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

type SaveFieldShape =
  | 'record' | 'string' | 'finiteNumber' | 'boolean'
  | 'stringArray' | 'numberArray' | 'recordArray'
  | 'stringRecord' | 'numberRecord'
  | { nullable: SaveFieldShape }
  | { [key: string]: SaveFieldShape };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNullableShape(shape: SaveFieldShape): shape is { nullable: SaveFieldShape } {
  return isRecord(shape) && Object.keys(shape).length === 1 && 'nullable' in shape;
}

/**
 * 旧档允许缺少新增字段；但字段一旦存在，必须满足迁移器赖以安全展开/遍历的基本形状。
 * 未列出的字段保留，便于前后版本兼容，不在这里复制完整业务 schema。
 */
function matchesOptionalShape(value: unknown, shape: SaveFieldShape): boolean {
  if (value === undefined) return true;
  if (isNullableShape(shape)) {
    return value === null || matchesOptionalShape(value, shape.nullable);
  }
  if (value === null) return false;
  if (shape === 'record') return isRecord(value);
  if (shape === 'string') return typeof value === 'string';
  if (shape === 'finiteNumber') return typeof value === 'number' && Number.isFinite(value);
  if (shape === 'boolean') return typeof value === 'boolean';
  if (shape === 'stringArray') return isStringArray(value);
  if (shape === 'numberArray') return Array.isArray(value)
    && value.every(item => typeof item === 'number' && Number.isFinite(item));
  if (shape === 'recordArray') return Array.isArray(value) && value.every(isRecord);
  if (shape === 'stringRecord') return isRecord(value)
    && Object.values(value).every(item => typeof item === 'string');
  if (shape === 'numberRecord') return isRecord(value)
    && Object.values(value).every(item => typeof item === 'number' && Number.isFinite(item));
  if (!isRecord(value)) return false;
  return Object.entries(shape).every(([key, child]) => matchesOptionalShape(value[key], child));
}

const SAVE_STATE_SHAPE: SaveFieldShape = {
  stats: 'numberRecord', school: { nullable: 'record' }, track: { nullable: 'string' }, degree: 'string',
  score: 'finiteNumber', year: 'finiteNumber', quarter: 'finiteNumber', turnsInStage: 'finiteNumber',
  guipeiCity: 'string', newsLog: 'recordArray', endingId: { nullable: 'string' }, gender: 'string', attrs: 'record',
  motivation: 'numberRecord', initialMotivation: { nullable: 'string' }, initialAnswer: { nullable: 'string' }, era0: 'record',
  era3: { mentor: 'record', residency: 'record', research: 'record' },
  health: { chronicDiseases: 'stringArray', addiction: 'record', majorIncidents: 'stringArray' },
  finance: { income: 'record', expense: 'record', majorPurchases: 'stringArray' },
  policy: {
    drg: 'record',
    procurement: { rounds: 'stringArray', productsAffected: 'stringArray' },
    hospital: { inspectionHistory: 'stringArray' },
    policyViolations: 'stringArray',
  },
  lateLife: { bucketList: 'record', echoesConsumed: 'stringArray' },
  legal: { records: { violations: 'stringArray' }, disputes: 'record' },
  research: {
    papers: { published: 'recordArray', inProgress: { nullable: 'record' } },
    grants: { applied: 'recordArray', active: 'recordArray' },
    misconduct: { violations: 'stringArray', penalty: 'record' },
  },
  mentorFaction: {
    mentor: { nullable: 'record' }, faction: { resources: 'record' }, benefactors: 'recordArray',
    rivals: 'recordArray', alignmentHistory: 'recordArray',
  },
  colleagues: {
    peers: 'recordArray',
    nurses: { headNurse: 'record', seniorNurses: 'recordArray' },
    students: 'recordArray', conflicts: 'recordArray',
  },
  family: {
    origin: { parents: 'record', siblings: 'record' }, spouse: 'record', children: 'recordArray',
    events: { familyTragedies: 'stringArray' }, conflict: 'record',
  },
  love: {
    spouse: 'record', datingHistory: 'recordArray', crises: 'recordArray', temptations: 'record',
  },
  spirit: {
    purpose: { history: 'recordArray' }, meaningSources: 'record', meaningHistory: 'numberArray',
    flashbacks: 'record', resiliencePillars: 'record', crises: 'recordArray',
  },
  publicImage: {
    incidents: 'recordArray', onlineHarassment: { platforms: 'stringArray' }, socialMedia: 'record',
    privacy: { pastViolations: 'stringArray' }, crisisHistory: 'recordArray',
  },
  leisure: {
    hobbies: 'recordArray', sideBusiness: 'record',
    social: { circles: 'recordArray', opportunities: 'stringArray' }, leisureHistory: 'recordArray',
  },
  undergrad: 'record', familyWealth: 'string', financeStrategy: 'string',
  assets: 'finiteNumber', assetLedger: 'recordArray', pension: 'finiteNumber', mortgageBalance: 'finiteNumber', mentorStyle: 'string',
  marital: 'string', spouse: { nullable: 'string' }, hasChild: 'boolean', familyAlive: 'finiteNumber',
  affinity: 'numberRecord', npcNames: 'stringRecord', pandemic: 'record', counters: 'numberRecord',
  signedUnitId: { nullable: 'string' }, jobOffers: 'stringArray',
};

function isValidNewsItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.year === 'number' && Number.isFinite(value.year)
    && typeof value.quarter === 'number'
    && Number.isInteger(value.quarter) && value.quarter >= 1 && value.quarter <= 4
    && typeof value.headline === 'string'
    && ['event', 'warning', 'irony', 'tragedy'].includes(String(value.type));
}

function isSaveBlob(value: unknown): value is SaveBlob {
  if (!isRecord(value)) return false;
  const blob = value as Record<string, unknown>;
  if (blob.version !== 1 || typeof blob.sceneKey !== 'string' || blob.sceneKey.length === 0) return false;
  if (!isRecord(blob.state)) return false;
  const state = blob.state as Record<string, unknown>;
  const lifeStages = ['gaokao', 'undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career', 'pinnacle', 'retirement', 'eternity', 'ending'];
  if (typeof state.stage !== 'string' || !lifeStages.includes(state.stage) || !isRecord(state.stats)) return false;
  if (!isStringArray(state.flags)) return false;
  // These fields existed in the first v1 save format and are consumed directly after loading.
  // Missing or null values are corruption, not an older optional subsystem.
  if (typeof state.score !== 'number' || !Number.isFinite(state.score)) return false;
  if (typeof state.year !== 'number' || !Number.isFinite(state.year)) return false;
  if (!Number.isInteger(state.quarter) || Number(state.quarter) < 1 || Number(state.quarter) > 4) return false;
  if (!Number.isInteger(state.turnsInStage) || Number(state.turnsInStage) < 0) return false;
  if (typeof state.degree !== 'string' || typeof state.guipeiCity !== 'string') return false;
  if (!Array.isArray(state.newsLog) || !state.newsLog.every(isValidNewsItem)) return false;
  if (!matchesOptionalShape(state, SAVE_STATE_SHAPE)) return false;
  const enumFields: Array<[unknown, readonly string[]]> = [
    [state.gender, ['male', 'female']],
    [state.track, ['five_year', 'five_plus_three', 'eight_year']],
    [state.degree, ['bachelor', 'master_pro', 'master_academic', 'phd']],
    [state.familyWealth, ['rich', 'middle', 'tight']],
    [state.financeStrategy, ['thrifty', 'stable', 'invest']],
    [state.mentorStyle, ['equal', 'pyramid', 'generous', 'tight']],
    [state.marital, ['single', 'dating', 'married']],
  ];
  if (enumFields.some(([field, allowed]) =>
    field !== undefined && field !== null && (typeof field !== 'string' || !allowed.includes(field)))) return false;
  if (blob.savedAt !== undefined && !matchesOptionalShape(blob.savedAt, 'finiteNumber')) return false;
  if (blob.firedEvents !== undefined && !isStringArray(blob.firedEvents)) return false;
  if (blob.firedNews !== undefined && !isStringArray(blob.firedNews)) return false;
  return true;
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function loadSave(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const blob: unknown = JSON.parse(raw);
    return isSaveBlob(blob) ? blob : null;
  } catch {
    return null;
  }
}

export function applySave(blob: SaveBlob): string {
  // 兼容旧存档：剔除已删除的 comparisons 字段
  const { comparisons: _legacy, ...rest } = blob.state as Omit<GameState, 'flags'> & { flags: string[]; comparisons?: unknown };
  const flags = new Set(blob.state.flags);
  const stateForMigration = { ...rest, flags } as unknown as GameState;
  setState({
    ...rest,
    flags,
    // 旧档没有 clinical/research/fakeRisk，补默认值，否则运算得 NaN
    stats: migrateStats(rest.stats),
    // 旧档没有 affinity / gender / attrs / 动机 / familyWealth / financeStrategy，补默认值
    affinity: rest.affinity ?? {},
    npcNames: { ...generateNpcNames(), ...((rest as { npcNames?: Record<string, string> }).npcNames ?? {}) },
    pandemic: normalizePandemic((rest as { pandemic?: GameState['pandemic'] }).pandemic, rest.year ?? 2024, rest.quarter ?? 3),
    gender: (rest as { gender?: string }).gender === 'female' ? 'female' : 'male',
    attrs: normalizeAttrAlloc((rest as { attrs?: unknown }).attrs),
    motivation: normalizeMotivation((rest as { motivation?: GameState['motivation'] }).motivation),
    initialMotivation: (rest as { initialMotivation?: GameState['initialMotivation'] }).initialMotivation ?? null,
    initialAnswer: (rest as { initialAnswer?: GameState['initialAnswer'] }).initialAnswer ?? null,
    era0: normalizeEra0((rest as { era0?: GameState['era0'] }).era0),
    era3: normalizeEra3((rest as { era3?: GameState['era3'] }).era3, stateForMigration),
    health: normalizeHealth((rest as { health?: GameState['health'] }).health),
    finance: normalizeFinance((rest as { finance?: GameState['finance'] }).finance, rest.stats?.money ?? 5000),
    policy: normalizePolicy((rest as { policy?: GameState['policy'] }).policy),
    lateLife: normalizeLateLife((rest as { lateLife?: GameState['lateLife'] }).lateLife),
    legal: normalizeLegal((rest as { legal?: GameState['legal'] }).legal),
    research: normalizeResearch((rest as { research?: GameState['research'] }).research, rest.stats?.research ?? 5, rest.stats?.papers ?? 0),
    mentorFaction: normalizeMentorFaction((rest as { mentorFaction?: GameState['mentorFaction'] }).mentorFaction, rest.stats?.reputation ?? 0, (rest as { era3?: GameState['era3'] }).era3?.mentor?.relationship ?? 30),
    colleagues: normalizeColleagues((rest as { colleagues?: GameState['colleagues'] }).colleagues),
    family: normalizeFamily((rest as { family?: GameState['family'] }).family, ((rest as { familyWealth?: GameState['familyWealth'] }).familyWealth ?? 'middle'), rest.spouse ?? null, rest.hasChild ?? false),
    love: normalizeLove((rest as { love?: GameState['love'] }).love, rest.marital ?? 'single', rest.spouse ?? null),
    spirit: normalizeSpirit((rest as { spirit?: GameState['spirit'] }).spirit),
    publicImage: normalizePublicImage((rest as { publicImage?: GameState['publicImage'] }).publicImage),
    leisure: normalizeLeisure((rest as { leisure?: GameState['leisure'] }).leisure),
    undergrad: normalizeUndergradProgress((rest as { undergrad?: GameState['undergrad'] }).undergrad),
    familyWealth: (rest as { familyWealth?: string }).familyWealth ?? 'middle',
    financeStrategy: (rest as { financeStrategy?: string }).financeStrategy ?? 'stable',
    assets: (rest as { assets?: number }).assets ?? 0,
    assetLedger: (rest as { assetLedger?: GameState['assetLedger'] }).assetLedger ?? [],
    pension: (rest as { pension?: number }).pension ?? 0,
    mortgageBalance: (rest as { mortgageBalance?: number }).mortgageBalance ?? 0,
    mentorStyle: (rest as { mentorStyle?: string }).mentorStyle ?? 'equal',
    counters: (rest as { counters?: Record<string, number> }).counters ?? {},
  } as GameState);
  pendingFired = { firedEvents: blob.firedEvents ?? [], firedNews: blob.firedNews ?? [] };
  return blob.sceneKey;
}

export function consumePendingFired(): { firedEvents: string[]; firedNews: string[] } | null {
  const p = pendingFired;
  pendingFired = null;
  return p;
}

export function clearSave() {
  pendingFired = null;
  try { localStorage.removeItem(KEY); } catch {
    /* 忽略 */
  }
}
