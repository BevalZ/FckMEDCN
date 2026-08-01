import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 人物模板库 + 患者交互事件回归：
// 1) 模板空间 ≥10 万、确定性（同索引同人物）、字段齐全、身份分类；
// 2) 患者事件进入事件池、可达、选项按性格/经济定制且去重。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('人物模板库：≥10万、确定性、字段齐全', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ngn } = (window as any).__mod;
    const c0 = ngn.createCharacter(0);
    const c0b = ngn.createCharacter(0);
    const cBig = ngn.createCharacter(99999);
    const cRand = ngn.drawRandomCharacter();
    return {
      totalSpace: ngn.TOTAL_SPACE,
      deterministic: JSON.stringify(c0) === JSON.stringify(c0b),
      diffIndexDiff: c0.name !== cBig.name || c0.identity !== cBig.identity,
      c0: { name: c0.name, identity: c0.identity, personality: c0.personality, speech: c0.speech, economic: c0.economic, age: c0.age, traits: c0.traits },
      cRand: { name: cRand.name, identity: cRand.identity },
      identityCount: ngn.allIdentities().length,
    };
  });
  console.log('  模板库:', JSON.stringify(r).slice(0, 400));
  expect(r.totalSpace, '模板空间应 ≥ 10万').toBeGreaterThanOrEqual(100000);
  expect(r.deterministic, 'createCharacter 应确定性').toBe(true);
  expect(r.diffIndexDiff, '不同索引应不同人物').toBe(true);
  expect(r.c0.name.length, '应有名字').toBeGreaterThanOrEqual(2);
  expect(r.c0.identity && r.c0.personality && r.c0.economic, '身份/性格/经济字段应齐全').toBeTruthy();
  expect(r.c0.traits.length, '应有交互倾向 traits').toBeGreaterThan(0);
  expect(r.cRand.name.length, '随机抽取应返回人物').toBeGreaterThanOrEqual(2);
  expect(r.identityCount, '身份应分门别类').toBeGreaterThanOrEqual(40);
});

test('社会遭遇事件：进入事件池、可达、选项按性格定制', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const socials = ev.ALL_EVENTS.filter((e: any) => e.id.includes('_social_'));

    // 职业池可达
    const careerPool = ev.getAvailableEvents('career', new Set(), { ...base }, new Set(), 3, 'single');
    const careerSocial = careerPool.filter((e: any) => e.id.includes('_social_'));

    // 交互多样性：不同人物事件的选项文本应不同
    const texts = new Set(socials.map((e: any) => e.choices.map((c: any) => c.text).join('|')));
    const samples = socials.slice(0, 3).map((e: any) => ({
      id: e.id, title: e.title, body: e.body.slice(0, 40),
      nChoices: e.choices.length,
      opt2: e.choices[1]?.text,
    }));
    return { count: socials.length, careerSocial: careerSocial.length, uniqueOptionSets: texts.size, samples };
  });
  console.log('  社会遭遇事件:', JSON.stringify(r).slice(0, 500));
  expect(r.count, '社会遭遇事件应≥200（60+20+40+20+10+60）').toBeGreaterThanOrEqual(200);
  expect(r.careerSocial, '职业池应含社会遭遇事件').toBeGreaterThan(0);
  expect(r.uniqueOptionSets, '选项应按性格定制（多样性）').toBeGreaterThan(30);
  for (const s of r.samples) {
    expect(s.nChoices, `${s.id} 应有多个选项`).toBeGreaterThanOrEqual(2);
  }
});
