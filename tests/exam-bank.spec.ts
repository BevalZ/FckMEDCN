import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 考试题库静态校验（roadmap「更多题库」配套回归）：不启浏览器，直接扫 BANK。
// 守：题面重复、answer 下标越界、选项数异常、topic 非法、题库缩水。

const SRC = fs.readFileSync(
  path.join(path.resolve(__dirname, '..'), 'src', 'ui', 'ExamQuizMinigame.ts'), 'utf8');

interface Q { q: string; choices: string[]; answer: number; topic: string; }

function readBank(): Q[] {
  const out: Q[] = [];
  const re = /\{\s*q:\s*'((?:[^'\\]|\\.)*)',\s*choices:\s*\[([^\]]*)\],\s*answer:\s*(\d+),\s*topic:\s*'(\w+)'/g;
  for (const m of SRC.matchAll(re)) {
    const choices = [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(c => c[1]);
    out.push({ q: m[1], choices, answer: +m[3], topic: m[4] });
  }
  return out;
}

test('题库结构合法：answer 不越界、选项 2–4、topic 合法', () => {
  const bank = readBank();
  expect(bank.length, 'BANK 应能解析出题目（结构变更时本测试需同步）').toBeGreaterThan(0);
  const bad: string[] = [];
  for (const q of bank) {
    if (q.choices.length < 2 || q.choices.length > 4) bad.push(`${q.q} —— 选项数 ${q.choices.length}`);
    if (q.answer < 0 || q.answer >= q.choices.length) bad.push(`${q.q} —— answer ${q.answer} 越界`);
    if (!['clinical', 'research', 'ethics'].includes(q.topic)) bad.push(`${q.q} —— topic ${q.topic}`);
  }
  expect(bad, `结构异常：\n${bad.join('\n')}`).toEqual([]);
});

test('题库规模与覆盖面：总量 ≥30、各 topic ≥5、无重复题面', () => {
  const bank = readBank();
  const byTopic: Record<string, number> = {};
  for (const q of bank) byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
  console.log(`题库 ${bank.length} 题：`, JSON.stringify(byTopic));
  expect(bank.length, '扩充后题库应 ≥30（每次考试抽 5，避免复玩重复）').toBeGreaterThanOrEqual(30);
  for (const t of ['clinical', 'research', 'ethics']) {
    expect(byTopic[t] ?? 0, `${t} 应 ≥5（按 topic 抽题时凑不满 5 会回落全库）`).toBeGreaterThanOrEqual(5);
  }
  const qs = bank.map(q => q.q);
  const dup = qs.filter((q, i) => qs.indexOf(q) !== i);
  expect([...new Set(dup)], `重复题面：${[...new Set(dup)].join('；')}`).toEqual([]);
});
