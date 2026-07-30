import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 事件结构的纯静态校验：不启浏览器/dev server，直接扫源码。
// 守两类会静默断裂、难以在试玩中发现的问题：
//   1. nextEventId 指向不存在的事件 id（链式事件断链）
//   2. 事件 id 重复（后者会被前者遮蔽或抽取行为异常）
//
// 注意：只扫“事件数据文件”，不含地图 Spot 的 id（campusMap/hospitalMap/guipeiMap
// 里的 canteen/er/office 等与事件 id 不在同一命名空间，扫进来会污染 id 集）。

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// 事件字面量 id 与 nextEventId 的来源文件。地图文件（*Map.ts）刻意排除。
const EVENT_FILES = fs
  .readdirSync(DATA_DIR)
  .filter(n => n.endsWith('.ts'))
  .filter(n => n.startsWith('events') || n === 'eventGen.ts');

function readEventSources(): string {
  return EVENT_FILES.map(n => fs.readFileSync(path.join(DATA_DIR, n), 'utf8')).join('\n');
}

/** 提取所有事件字面量 id（id: 'x'），返回列表（含重复，便于查重）。 */
function eventIds(src: string): string[] {
  return [...src.matchAll(/\bid:\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]);
}

/** 提取所有 nextEventId: 'x' 引用。 */
function nextEventIds(src: string): string[] {
  return [...src.matchAll(/nextEventId:\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]);
}

test('nextEventId 均指向已存在的事件（无悬空断链）', () => {
  const src = readEventSources();
  const ids = new Set(eventIds(src));
  const refs = [...new Set(nextEventIds(src))];

  const dangling = refs.filter(r => !ids.has(r));

  console.log(`事件 id ${ids.size} 个；nextEventId 引用 ${refs.length} 个`);
  if (dangling.length) console.log('悬空 nextEventId：', dangling.join(', '));

  expect(dangling, `以下 nextEventId 指向不存在的事件，链式事件会在此断裂：\n${dangling.join('\n')}`).toEqual([]);
});

test('事件 id 无重复', () => {
  const src = readEventSources();
  const all = eventIds(src);
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of all) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }

  console.log(`事件 id 总数 ${all.length}，去重后 ${seen.size}`);
  if (dups.size) console.log('重复 id：', [...dups].join(', '));

  expect([...dups], `以下事件 id 重复定义：\n${[...dups].join('\n')}`).toEqual([]);
});

// 属性 clamp 上限：除 money/papers/age 外，其余属性锁在 0..100（见 stats.ts clampStat）。
// 故对这些属性，requireStat 的 lo 超过 100 等于"永不满足" —— 又一类死事件。
const UNBOUNDED = new Set(['money', 'papers', 'age']);

test('requireStat 区间合法（lo<=hi 且不越 clamp 上限，无死事件）', () => {
  const src = readEventSources();
  // 抓 requireStat: { ... } 的花括号内容，再逐个提取 key: [lo, hi]
  const blocks = [...src.matchAll(/requireStat:\s*\{([^}]*)\}/g)].map(m => m[1]);
  const bad: string[] = [];
  let count = 0;
  for (const block of blocks) {
    for (const m of block.matchAll(/([A-Za-z0-9_]+)\s*:\s*\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)) {
      count++;
      const key = m[1];
      const lo = parseInt(m[2], 10);
      const hi = parseInt(m[3], 10);
      if (lo > hi) bad.push(`${key}: [${lo}, ${hi}] — lo>hi`);
      else if (!UNBOUNDED.has(key) && lo > 100) bad.push(`${key}: [${lo}, ${hi}] — lo 超过 clamp 上限 100`);
    }
  }

  console.log(`requireStat 区间 ${count} 个`);
  if (bad.length) console.log('非法区间：', bad.join(' / '));
  expect(bad, `以下 requireStat 区间永不满足（死事件）：\n${bad.join('\n')}`).toEqual([]);
});

test('每个事件用到的 effect.kind 都在 applyChoiceEffect 里有实现', () => {
  // effect 是声明式副作用（events.ts 的 ChoiceEffect union），实现在 effects.ts 的
  // applyChoiceEffect switch。若事件数据用了某个 kind 但 switch 漏处理，副作用会静默失效
  // （选项照常结算，但恋爱/结婚/造假等状态改变不发生），且 tsc 未必能捕获。
  const eventsSrc = fs.readFileSync(path.join(DATA_DIR, 'events.ts'), 'utf8');
  const effectsSrc = fs.readFileSync(path.join(DATA_DIR, 'effects.ts'), 'utf8');
  const dataSrc = readEventSources();

  // union 声明的全部 kind
  const declared = new Set(
    [...eventsSrc.matchAll(/kind:\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]),
  );
  // applyChoiceEffect switch 处理的 kind
  const handled = new Set(
    [...effectsSrc.matchAll(/case\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]),
  );
  // 事件数据里实际用到的 kind。必须限定 effect: { kind: 'x' } 上下文——
  // 否则会误抓 eventGen.ts 里 clinicEvent(kind: 'routine'|...) 这类无关的函数参数标记
  // （曾因此假阳性，见 docs/known-issues.md 的假阳性教训）。
  const used = new Set(
    [...dataSrc.matchAll(/effect:\s*\{\s*kind:\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]),
  );

  const unhandledDeclared = [...declared].filter(k => !handled.has(k));
  const unhandledUsed = [...used].filter(k => !handled.has(k));

  console.log(`effect kind：声明 ${declared.size} · 实现 ${handled.size} · 数据用到 ${used.size}`);
  expect(unhandledDeclared, `以下 ChoiceEffect kind 已声明但 applyChoiceEffect 未实现：\n${unhandledDeclared.join('\n')}`).toEqual([]);
  expect(unhandledUsed, `以下 effect.kind 被事件用到但无实现（副作用静默失效）：\n${unhandledUsed.join('\n')}`).toEqual([]);
});
