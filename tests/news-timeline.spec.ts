import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 新闻时序对齐的纯静态校验（known-issues ④）：不启浏览器，直接扫源码。
// 守三类问题：
//   1. 滚动条断粮——游戏管线能走到的年份，NEWS_TICKER 必须逐年有货
//      （管线：本科20+实习5+规培12+硕12+博16+求职4+职业20 季 ≈ 2024Q3→2046Q3）
//   2. 季节锚点词放错季度（两会在 Q1、医师节 8/19 在 Q3、考研季在 Q4）
//   3. id 重复 / quarter 越界
//
// 阶段长度不硬编码：从各场景源码读 MAX_TURNS / maxTurns，场景改了测试跟着变。

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

interface NewsItem { id: string; year: number; quarter: number; headline: string; }

function readNews(): NewsItem[] {
  const src = fs.readFileSync(path.join(SRC, 'data', 'news.ts'), 'utf8');
  return [...src.matchAll(
    /\{\s*id:\s*'([^']+)',\s*year:\s*(\d+),\s*quarter:\s*(\d+),\s*headline:\s*'((?:[^'\\]|\\.)*)'/g,
  )].map(m => ({ id: m[1], year: +m[2], quarter: +m[3], headline: m[4] }));
}

/** 从场景源码读阶段长度（季度数）。文件内多个 maxTurns 按出现顺序对应多阶段。 */
function stageTurns(file: string): number[] {
  const src = fs.readFileSync(path.join(SRC, 'scenes', file), 'utf8');
  return [...src.matchAll(/MAX_TURNS\s*=\s*(\d+)|maxTurns\s*=\s*(\d+)/g)]
    .map(m => +(m[1] ?? m[2]));
}

// 管线顺序（固定）：文件 → 该文件内的阶段序列
const PUBLIC_PIPELINE: Array<[string, string]> = [
  ['CampusScene.ts', 'undergrad'],
  ['HospitalScene.ts', 'internship'],
  ['GuipeiWalkScene.ts', 'guipei'],
  ['MasterScene.ts', 'master+phd'], // 该文件含 Master/PhD 两个类
  ['JobHuntScene.ts', 'jobhunt'],
  ['CareerScene.ts', 'career'],
];

const LATE_PIPELINE: Array<[string, string]> = [
  ['LateEraScene.ts', 'pinnacle+retirement+eternity'],
];

const START_YEAR = 2024, START_QUARTER = 3;

function pipelineEnd(pipeline: Array<[string, string]>): { year: number; quarter: number; total: number } {
  let total = 0;
  for (const [file] of pipeline) {
    const turns = stageTurns(file);
    expect(turns.length, `${file} 应能读到 MAX_TURNS/maxTurns`).toBeGreaterThan(0);
    total += turns.reduce((a, b) => a + b, 0);
  }
  const idx = (START_YEAR * 4 + (START_QUARTER - 1)) + total - 1;
  return { year: Math.floor(idx / 4), quarter: (idx % 4) + 1, total };
}

test('新闻逐年不断粮：覆盖到管线终点年份', () => {
  const news = readNews();
  expect(news.length, 'news.ts 应能解析出新闻条目').toBeGreaterThan(0);
  const end = pipelineEnd(PUBLIC_PIPELINE);
  const byYear = new Map<number, number>();
  for (const n of news) byYear.set(n.year, (byYear.get(n.year) ?? 0) + 1);

  const gaps: number[] = [];
  for (let y = START_YEAR; y <= end.year; y++) {
    if (!byYear.has(y)) gaps.push(y);
  }
  console.log(`公共新闻管线 ${PUBLIC_PIPELINE.map(([f, s]) => `${s}:${stageTurns(f).join('+')}`).join(' → ')}`
    + ` 共 ${end.total} 季，${START_YEAR}Q${START_QUARTER} → ${end.year}Q${end.quarter}；`
    + `ticker 覆盖 ${byYear.size} 年`);
  expect(gaps, `以下可到达年份无任何新闻：${gaps.join(', ')}`).toEqual([]);
});

test('晚年三个阶段共 28 季，改由个人回声承接', () => {
  const turns = LATE_PIPELINE.flatMap(([file]) => stageTurns(file));
  expect(turns).toEqual([8, 8, 12]);
  expect(turns.reduce((sum, value) => sum + value, 0)).toBe(28);
});

test('季节锚点词季度正确（两会Q1/医师节Q3/考研季Q4）', () => {
  const news = readNews();
  const rules: Array<[RegExp, number, string]> = [
    [/两会/, 1, '两会在 3 月（Q1）'],
    [/医师节/, 3, '中国医师节 8/19（Q3）'],
    [/考研季|考研报名/, 4, '考研初试在 12 月（Q4）'],
  ];
  const bad: string[] = [];
  for (const n of news) {
    for (const [re, q, why] of rules) {
      if (re.test(n.headline) && n.quarter !== q) {
        bad.push(`${n.id}（${n.year}Q${n.quarter}）：${n.headline.slice(0, 24)}… —— ${why}`);
      }
    }
  }
  expect(bad, `季节违和：\n${bad.join('\n')}`).toEqual([]);
});

test('新闻 id 无重复、quarter 合法', () => {
  const news = readNews();
  const ids = news.map(n => n.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect([...new Set(dup)], `重复 id：${[...new Set(dup)].join(', ')}`).toEqual([]);
  const badQ = news.filter(n => n.quarter < 1 || n.quarter > 4);
  expect(badQ.map(n => n.id), 'quarter 须在 1..4').toEqual([]);
});

test('负面新闻保持匿名脱敏', () => {
  const news = readNews();
  const blocked = ['旺填朝', '张昱', '余鹰', '刘晋', '湘雅', '协哈'];
  const leaks = news
    .filter(item => blocked.some(term => item.headline.includes(term)))
    .map(item => `${item.id}:${item.headline}`);
  expect(leaks).toEqual([]);
});

test('访问学者违法新闻位于新局必经的2024Q4', () => {
  const items = readNews().filter(item => item.headline.includes('医学访问学者'));
  expect(items).toHaveLength(1);
  expect(items[0].year).toBe(2024);
  expect(items[0].quarter).toBe(4);
  expect(items[0].headline).toContain('司法机关处理');
});
