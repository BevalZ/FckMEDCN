import { ENDINGS } from './endings';

// 人生图鉴（跨周目收集）：记录玩家见过哪些结局、累计通关次数。
// 独立于单局存档（save.ts 的 fckmedcn_save_v1）——clearSave/resetGame 都不碰这里，
// 这样"再来一次"之后图鉴依然累积，给多周目一个目标。

const KEY = 'fckmedcn_collection_v1';

interface CollectionBlob {
  version: number;
  endings: string[]; // 已解锁结局 id
  runs: number;      // 累计通关次数（到达结局页算一次）
}

let cache: CollectionBlob | null = null;

function load(): CollectionBlob {
  if (cache) return cache;
  let blob: CollectionBlob = { version: 1, endings: [], runs: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollectionBlob;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.endings)) {
        blob = { version: 1, endings: parsed.endings, runs: parsed.runs ?? 0 };
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
export function recordEnding(id: string): RecordResult {
  const blob = load();
  const isNew = !blob.endings.includes(id);
  if (isNew) blob.endings.push(id);
  blob.runs += 1;
  persist(blob);
  return { isNew, unlocked: blob.endings.length, total: ENDINGS.length, runs: blob.runs };
}

export function getCollection(): { endings: ReadonlySet<string>; runs: number; total: number } {
  const blob = load();
  return { endings: new Set(blob.endings), runs: blob.runs, total: ENDINGS.length };
}

// 仅测试与调试使用：清空图鉴缓存与持久化数据。
export function resetCollectionForTest() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* 静默 */ }
}
