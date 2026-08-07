import { getState, setState, registerResetHook } from './gameState';
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

export function hasSave(): boolean {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

export function loadSave(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as SaveBlob;
    if (!blob || blob.version !== 1) return null;
    return blob;
  } catch {
    return null;
  }
}

export function applySave(blob: SaveBlob): string {
  // 兼容旧存档：剔除已删除的 comparisons 字段
  const { comparisons: _legacy, ...rest } = blob.state as Omit<GameState, 'flags'> & { flags: string[]; comparisons?: unknown };
  setState({
    ...rest,
    flags: new Set(blob.state.flags),
    // 旧档没有 clinical/research/fakeRisk，补默认值，否则运算得 NaN
    stats: migrateStats(rest.stats),
    // 旧档没有 affinity / gender / attrs / 动机 / familyWealth / financeStrategy，补默认值
    affinity: rest.affinity ?? {},
    gender: (rest as { gender?: string }).gender === 'female' ? 'female' : 'male',
    attrs: (rest as { attrs?: unknown }).attrs ?? { family: 2, academic: 5, luck: 1, looks: 2 },
    motivation: normalizeMotivation((rest as { motivation?: GameState['motivation'] }).motivation),
    initialMotivation: (rest as { initialMotivation?: GameState['initialMotivation'] }).initialMotivation ?? null,
    initialAnswer: (rest as { initialAnswer?: GameState['initialAnswer'] }).initialAnswer ?? null,
    era0: normalizeEra0((rest as { era0?: GameState['era0'] }).era0),
    era3: normalizeEra3((rest as { era3?: GameState['era3'] }).era3, rest as unknown as GameState),
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
