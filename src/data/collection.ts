import { ENDINGS } from './endings';
import type { AttrAlloc } from './gameState';
import { normalizeAttrAlloc } from './gameState';

// 人生图鉴（跨周目收集）：记录玩家见过哪些结局、累计通关次数。
// 独立于单局存档（save.ts 的 fckmedcn_save_v1）——clearSave/resetGame 都不碰这里，
// 这样"再来一次"之后图鉴依然累积，给多周目一个目标。

const KEY = 'fckmedcn_collection_v1';

interface CollectionBlob {
  version: number;
  endings: string[]; // 已解锁结局 id
  badges: string[];  // 已达成里程碑 id
  runs: number;      // 累计通关次数（到达结局页算一次）
  points: number;    // 传承点（未使用余额）
  purchased: string[]; // 已购买的传承 perk id
  lastAttrs?: AttrAlloc; // 最近一次通关时的开局属性（供下局继承）
}

let cache: CollectionBlob | null = null;

function load(): CollectionBlob {
  if (cache) return cache;
  let blob: CollectionBlob = { version: 1, endings: [], badges: [], runs: 0, points: 0, purchased: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollectionBlob;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.endings)) {
        blob = {
          version: 1,
          endings: parsed.endings,
          badges: Array.isArray(parsed.badges) ? parsed.badges : [],
          runs: parsed.runs ?? 0,
          points: parsed.points ?? 0,
          purchased: Array.isArray(parsed.purchased) ? parsed.purchased : [],
          lastAttrs: parsed.lastAttrs ? normalizeAttrAlloc(parsed.lastAttrs) : undefined,
        };
      }
    }
  } catch {
    /* localStorage 不可用则退回内存态 */
  }
  cache = blob;
  return blob;
}

function persist(blob: CollectionBlob) {
  cache = blob;
  try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch { /* 静默 */ }
}

export interface RecordResult {
  isNew: boolean;      // 是否首次解锁该结局
  unlocked: number;    // 已解锁结局数
  total: number;       // 结局总数
  runs: number;        // 累计通关次数
}

// 到达结局页时调用：收录结局并累计通关次数。返回本次收录情况供 UI 提示。
// 每次通关 +1 传承点（多周目传承的经济来源）。
// 可选写入本次开局 attrs，供下局「继承上局」重塑。
export function recordEnding(id: string, attrs?: AttrAlloc): RecordResult {
  const blob = load();
  const isNew = !blob.endings.includes(id);
  if (isNew) blob.endings.push(id);
  blob.runs += 1;
  blob.points += 1;
  if (attrs) blob.lastAttrs = normalizeAttrAlloc(attrs);
  persist(blob);
  return { isNew, unlocked: blob.endings.length, total: ENDINGS.length, runs: blob.runs };
}

// 达成里程碑时调用。返回是否首次达成。
export function recordBadge(id: string): boolean {
  const blob = load();
  if (blob.badges.includes(id)) return false;
  blob.badges.push(id);
  persist(blob);
  return true;
}

// 增加传承点（每 5 个徽章由 badges.ts 触发调用）。
export function grantPoint(n = 1) {
  const blob = load();
  blob.points += n;
  persist(blob);
}

// 购买传承 perk。成功返回 true，点数不足或已购返回 false。
export function buyPerk(id: string, cost: number): boolean {
  const blob = load();
  if (blob.purchased.includes(id)) return false;
  if (blob.points < cost) return false;
  blob.points -= cost;
  blob.purchased.push(id);
  persist(blob);
  return true;
}

export function getLastAttrs(): AttrAlloc | null {
  const blob = load();
  return blob.lastAttrs ? normalizeAttrAlloc(blob.lastAttrs) : null;
}

export function getCollection(): {
  endings: ReadonlySet<string>; badges: ReadonlySet<string>;
  runs: number; total: number; points: number; purchased: readonly string[];
  lastAttrs: AttrAlloc | null;
} {
  const blob = load();
  return {
    endings: new Set(blob.endings),
    badges: new Set(blob.badges),
    runs: blob.runs,
    total: ENDINGS.length,
    points: blob.points,
    purchased: blob.purchased,
    lastAttrs: blob.lastAttrs ? normalizeAttrAlloc(blob.lastAttrs) : null,
  };
}

// 仅测试与调试使用：清空图鉴缓存与持久化数据。
export function resetCollectionForTest() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* 静默 */ }
}
