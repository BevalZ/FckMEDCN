import { getState, setState, registerResetHook } from './gameState';
import type { GameState } from './gameState';
import { migrateStats } from './stats';

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
    // 旧档没有 affinity / gender / attrs / familyWealth / financeStrategy，补默认值
    affinity: rest.affinity ?? {},
    gender: (rest as { gender?: string }).gender === 'female' ? 'female' : 'male',
    attrs: (rest as { attrs?: unknown }).attrs ?? { family: 2, academic: 5, luck: 1, looks: 2 },
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
