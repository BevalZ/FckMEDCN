import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 纯静态分析：确认 determineEnding 判定链里引用的每个 flag，
// 都有至少一处事件 flagSet 或代码 setFlag 来源——防止"永远触发不到的死结局"。
//
// 这条测试不需要浏览器/dev server：直接扫源码文本。之所以仍用 .spec 放进 tests/，
// 是为了纳入 `npm test` 的统一入口。它守的是一类曾靠手工 grep 才发现的问题
// （见 docs/known-issues.md B5：手工校验脚本一度假阳性）。

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

/** determineEnding 里 flags.has('x') 引用的全部 flag */
function endingFlags(): string[] {
  const src = fs.readFileSync(path.join(DATA_DIR, 'endings.ts'), 'utf8');
  const fn = src.slice(src.indexOf('export function determineEnding'));
  const refs = [...fn.matchAll(/flags\.has\(['"]([A-Za-z0-9_]+)['"]\)/g)].map(m => m[1]);
  return [...new Set(refs)].sort();
}

/** 全项目所有 flagSet:'x'、setFlag('x') 与 rollOutcome successFlag/failFlag 设置过的 flag 集合 */
function settableFlags(): Set<string> {
  const out = new Set<string>();
  const scanDir = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) { scanDir(p); continue; }
      if (!name.endsWith('.ts')) continue;
      const txt = fs.readFileSync(p, 'utf8');
      for (const m of txt.matchAll(/flagSet:\s*['"]([A-Za-z0-9_]+)['"]/g)) out.add(m[1]);
      for (const m of txt.matchAll(/setFlag\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g)) out.add(m[1]);
      // rollOutcome 概率结算也是真实来源（如 jh_bianzhi_in / nsfc_won）
      for (const m of txt.matchAll(/(?:successFlag|failFlag):\s*['"]([A-Za-z0-9_]+)['"]/g)) out.add(m[1]);
    }
  };
  scanDir(path.join(ROOT, 'src'));
  return out;
}

test('每个结局判定 flag 都有事件/代码来源（无死结局）', () => {
  const referenced = endingFlags();
  const settable = new Set([...settableFlags(), ...RUNTIME_SET_FLAGS]);

  const orphans = referenced.filter(f => !settable.has(f));

  // 便于失败时排查：打印引用总数与全部来源规模
  console.log(`determineEnding 引用 ${referenced.length} 个 flag；全项目可设置 ${settable.size} 个 flag`);
  if (orphans.length) console.log('无来源的 flag：', orphans.join(', '));

  expect(orphans, `以下结局判定 flag 没有任何 flagSet/setFlag 来源，会导致对应结局无法触发：\n${orphans.join('\n')}`).toEqual([]);
});

/** 全项目事件里 requireFlag:'x' 引用的 flag（含 requireFlag: 'x'） */
function requiredFlags(): string[] {
  const out = new Set<string>();
  const scanDir = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { scanDir(p); continue; }
      if (!name.endsWith('.ts')) continue;
      const txt = fs.readFileSync(p, 'utf8');
      for (const m of txt.matchAll(/requireFlag:\s*['"]([A-Za-z0-9_]+)['"]/g)) out.add(m[1]);
    }
  };
  scanDir(path.join(ROOT, 'src'));
  return [...out].sort();
}

// 动态拼接来源的 flag 前缀：字面量正则扫不到，需白名单豁免。
//  - trust_/distant_<npcId>：npc.ts 用 setFlag(`trust_${id}`) 生成
//  - school_tier_<n>：GaokaoScene 用 setFlag('school_tier_' + tier) 生成
// 见 docs/known-issues.md B5：这类动态 flag 曾使字面量校验假阳性。
const DYNAMIC_PREFIXES = ['trust_', 'distant_', 'school_tier_'];

// 运行时经"变量" setFlag 置位的 flag（字面量正则扫不到，但实际可达），需并入可设置集合。
//  - 求职写实管线 signUnit：setFlag(u.regionFlag)，按单位 regionFlag 动态置位以下 region flag；
//  - WalkStageScene 留级：setFlag(holdbackFlag) 按阶段动态置位 ms_holdback / phd_holdback。
//  - undergradProgress 学业预警：setFlag(`academic_crisis_lv${crisisLevel}`) 按危机等级动态置位。
// 这些 flag 有真实消费者（endings / currentRegionTier / 留级剧情链），并非死 flag。
const RUNTIME_SET_FLAGS = new Set<string>([
  'offer_sanjia', 'offer_grass', 'took_hospital_a', 'took_hospital_b',
  'took_public', 'took_private', 'city_home', 'city_tier1', 'base_home',
  'ms_holdback', 'phd_holdback',
  'academic_crisis_lv2', 'academic_crisis_lv4',
]);

test('每个 requireFlag 都有来源（无死事件）', () => {
  const required = requiredFlags();
  const settable = new Set([...settableFlags(), ...RUNTIME_SET_FLAGS]);

  const orphans = required.filter(f =>
    !settable.has(f) && !DYNAMIC_PREFIXES.some(pre => f.startsWith(pre)),
  );

  console.log(`事件引用 ${required.length} 个 requireFlag；可设置 ${settable.size} 个 flag`);
  if (orphans.length) console.log('无来源的 requireFlag：', orphans.join(', '));

  expect(orphans, `以下 requireFlag 没有任何来源，对应事件永远触发不到：\n${orphans.join('\n')}`).toEqual([]);
});
