import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 患者多样性审计：
//  1) 静态：patientType.ts 至少有 25 种患者档案，id 唯一，字段齐全，7 种交互特质全覆盖；
//  2) 静态：eventGen.ts 不再有孤立的 8 标签数组，改为 patientAt 取数，且生成"病房互访"事件；
//  3) 动态：真实事件池里每个患者档案都出现在生成事件的标题中，且特质选项随患者出现。

const PT_FILE = path.join(ROOT, 'src', 'data', 'patientType.ts');
const GEN_FILE = path.join(ROOT, 'src', 'data', 'eventGen.ts');

const REQUIRED_FIELDS = ['name', 'profile', 'ageGroup', 'income', 'insurance', 'personality', 'traits', 'followUp'];
const TRAITS = ['costSensitive', 'communicationBarrier', 'familyInvolved', 'litigious', 'nonCompliant', 'lonely', 'demanding'];

test('患者档案：数量 ≥ 25、id 唯一、字段齐全、7 特质全覆盖', () => {
  const src = fs.readFileSync(PT_FILE, 'utf8');

  // 提取每个档案块（从 { 到对应的 }），简单按 id: 计数
  const ids = [...src.matchAll(/^\s*id:\s*'([^']+)',/gm)].map(m => m[1]);
  console.log(`患者档案数：${ids.length}`);
  expect(ids.length, '患者档案应不少于 25 种').toBeGreaterThanOrEqual(25);

  const dup = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  expect(dup, '患者 id 不应重复').toEqual([]);

  // 字段检查：每个档案都应包含全部必需字段。
  // 数据文件用紧凑内联格式（id 与 name 同行、ageGroup 与 income/insurance 同行），
  // 故不能按行首锚定——用 \b 非锚定统计每个字段出现次数：接口定义 1 次 + 每个档案 1 次。
  const missing: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    const n = (src.match(new RegExp(`\\b${f}:`, 'g')) ?? []).length;
    const expected = ids.length + 1; // 1 次来自 interface 定义
    if (n !== expected) missing.push(`字段 ${f} 出现 ${n} 次，应有 ${expected} 次`);
  }
  console.log(`字段检查：${REQUIRED_FIELDS.length} 字段 × ${ids.length} 档案`);
  expect(missing, '档案缺必需字段').toEqual([]);

  // 7 种交互特质至少各有一位患者具备（保证每种交互选项都有机会出现）
  const uncovered = TRAITS.filter(t => !new RegExp(`${t}:\\s*true`).test(src));
  console.log(`特质覆盖：${TRAITS.filter(t => !uncovered.includes(t)).join(', ')}`);
  expect(uncovered, '以下特质没有任何患者具备，对应交互选项永不出现').toEqual([]);
});

test('eventGen：不再用孤立 8 标签数组，改用 patientAt 且生成病房互访事件', () => {
  const src = fs.readFileSync(GEN_FILE, 'utf8');

  // 旧的 const PATIENTS / const MOODS 小数组应已移除（被 patientType 模块取代）
  expect(src, '不应再存在 const PATIENTS 硬编码数组').not.toContain('const PATIENTS');
  expect(src, '不应再存在 const MOODS 硬编码数组').not.toContain('const MOODS');

  // 生成器应引用 patientType 模块，且存在病房互访模板
  expect(src, '应 import patientType 模块').toContain("./patientType");
  expect(src, '应使用 patientAt 确定性取患者').toContain('patientAt');
  expect(src, '应存在病房互访生成函数').toContain('function wardVisitEvent');
  expect(src, '病房互访应引用患者档案 followUp').toContain('arch.followUp');

  // 病房互访事件已接入各临床阶段的计划
  expect(src, '实习阶段应有 ward 计划').toMatch(/internship.*ward: 80/s);
  expect(src, '规培阶段应有 ward 计划').toMatch(/guipei.*ward: 120/s);
  expect(src, '职业阶段应有 ward 计划').toMatch(/career.*ward: 120/s);
});

const BASE = 'http://127.0.0.1:5173/';

test('动态：每个患者档案都出现在生成事件标题，且特质选项随患者出现', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });

  const report = await page.evaluate(() => {
    const { ev, pt } = (window as any).__mod;
    const archs: any[] = pt.PATIENT_ARCHETYPES;
    const all: any[] = ev.ALL_EVENTS;

    // 所有生成事件（gen_ 前缀）
    const gen = all.filter((e: any) => e.id.startsWith('gen_'));
    const wardGen = gen.filter((e: any) => e.id.includes('_ward_'));

    // 每个患者档案：标题是否至少被一个生成事件使用
    const titles = gen.map((e: any) => e.title).join('|');
    const noTitle: string[] = [];
    for (const a of archs) {
      if (!titles.includes(a.name)) noTitle.push(a.name);
    }

    // 特质选项：对每位患者，检查其具备的特质是否真的随该患者出现在某个事件的选项中
    const traitText: Record<string, string> = {
      costSensitive: '考虑费用',
      communicationBarrier: '放慢语速',
      familyInvolved: '把家属叫进来',
      litigious: '措辞谨慎',
      nonCompliant: '反复叮嘱',
      lonely: '多陪他聊了几句',
      demanding: '一条条回答',
    };
    const missingTrait: string[] = [];
    for (const a of archs) {
      for (const [trait, text] of Object.entries(traitText) as Array<[string, string]>) {
        if (a.traits?.[trait]) {
          // 找一条标题含该患者且选项含对应文本的事件
          const hit = gen.some(
            (e: any) => e.title.includes(a.name) && e.choices.some((c: any) => String(c.text).includes(text)),
          );
          if (!hit) missingTrait.push(`${a.name}:${trait}`);
        }
      }
    }

    // 患者回响：每个档案的 met_${id} flag 应有 setter（病房互访）与 consumer（患者回声）
    const setBy: Record<string, string[]> = {};
    const requiredBy: Record<string, string[]> = {};
    for (const e of all) {
      if (e.requireFlag) (requiredBy[e.requireFlag] ??= []).push(e.id);
      for (const c of e.choices) if (c.flagSet) (setBy[c.flagSet] ??= []).push(e.id);
    }
    const echoGaps: string[] = [];
    for (const a of archs) {
      const f = `met_${a.id}`;
      const hasSetter = (setBy[f] ?? []).some(id => id.includes('_ward_'));
      const hasConsumer = (requiredBy[f] ?? []).some(id => id.includes('_echo_'));
      if (!hasSetter) echoGaps.push(`${a.id}:无ward setter`);
      if (!hasConsumer) echoGaps.push(`${a.id}:无echo consumer`);
    }

    return {
      totalArch: archs.length,
      genCount: gen.length,
      wardCount: wardGen.length,
      noTitle,
      missingTrait,
      echoGaps,
    };
  });

  console.log(`患者档案 ${report.totalArch} 种；生成事件 ${report.genCount} 个；病房互访事件 ${report.wardCount} 个`);
  console.log('未出现在任何生成事件标题的患者：', report.noTitle.length ? report.noTitle.join(', ') : '（无）');
  console.log('特质未随患者出现：', report.missingTrait.length ? report.missingTrait.join(', ') : '（无）');
  console.log('患者回响缺口（met_ 无 setter/consumer）：', report.echoGaps.length ? report.echoGaps.join(', ') : '（无）');

  expect(report.totalArch, '患者档案数').toBeGreaterThanOrEqual(25);
  expect(report.genCount, '生成事件池').toBeGreaterThan(3000);
  expect(report.wardCount, '病房互访事件应存在').toBeGreaterThan(200);
  expect(report.noTitle, '每个患者档案都应出现在生成事件标题中').toEqual([]);
  expect(report.missingTrait, '患者具备的特质应随该患者出现在事件选项中').toEqual([]);
  expect(report.echoGaps, '每个患者档案的 met_ flag 都应有病房互访 setter 与回声 consumer').toEqual([]);
});

// 本科段真实性红线（深挖第五部分 R39）：本科是"观察/上课"，不得直接接触临床病人。
// 若未来新增生成事件模板误把 clinical 放进本科池，这里立刻失败。
test('本科池无 clinical 生成事件（不接触病人红线）', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const pool = ev.getAvailableEvents('undergrad', new Set(), { ...base }, new Set(), 5, 'single');
    return {
      clinicalGen: pool.filter((e: any) => e.id.startsWith('gen_') && e.category === 'clinical').map((e: any) => e.id),
      clinicalHand: pool.filter((e: any) => !e.id.startsWith('gen_') && e.category === 'clinical').map((e: any) => e.id),
    };
  });
  console.log('  本科 clinical 生成事件:', JSON.stringify(r.clinicalGen));
  console.log('  本科 clinical 手写事件:', JSON.stringify(r.clinicalHand));
  expect(r.clinicalGen, '本科不应有 clinical 生成事件（程序化患者接触）').toEqual([]);
});
