import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 地图字符命名空间静态校验：tilemap 的 drawTile 是一个 switch，
// 同一字符出现两个 case 时后者永不可达（2026-07-30 实例：'T' 既是校园的树、
// 又是医院/规培的电梯——电梯格被画成了树，且电梯是可通行装饰、树是实心，语义全拧）。
// 守两类：① drawTile 里 case 标签重复；② 地图 grid 用到的字符没有对应绘制分支。

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function readTilemapCases(): string[] {
  const src = fs.readFileSync(path.join(SRC, 'ui', 'tilemap.ts'), 'utf8');
  return [...src.matchAll(/case '(.)':/g)].map(m => m[1]);
}

function gridChars(mapFile: string): Set<string> {
  const src = fs.readFileSync(path.join(SRC, 'data', mapFile), 'utf8');
  const gridBlock = src.match(/grid:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
  const chars = new Set<string>();
  for (const m of gridBlock.matchAll(/'([^']*)'/g)) {
    for (const ch of m[1]) chars.add(ch);
  }
  return chars;
}

test('drawTile 的 case 标签无重复', () => {
  const cases = readTilemapCases();
  const dup = cases.filter((c, i) => cases.indexOf(c) !== i);
  expect([...new Set(dup)],
    `重复 case（后者永不可达）：${[...new Set(dup)].join(', ')}`).toEqual([]);
});

test('三张地图 grid 用到的字符都有绘制分支（或落入 default）', () => {
  const cases = new Set(readTilemapCases());
  // default 分支兜底建筑类字符（L/C/D/F 等）；其余字符必须显式有 case
  const defaultCovered = new Set(['L', 'C', 'D', 'F']);
  const maps = ['campusMap.ts', 'hospitalMap.ts', 'guipeiMap.ts'];
  const missing: string[] = [];
  for (const f of maps) {
    for (const ch of gridChars(f)) {
      if (!cases.has(ch) && !defaultCovered.has(ch)) missing.push(`${f}: '${ch}'`);
    }
  }
  expect(missing, `无绘制分支的字符：\n${missing.join('\n')}`).toEqual([]);
});
