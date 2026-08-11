import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// B4 回归：旧格式存档（卡片场景 sceneKey / 已删除场景 sceneKey）读档。
// - 卡片场景仍注册着：旧档应能直接进入对应卡片场景，不白屏、不串场景
// - sceneKey 已不存在：应安全降级到该 stage 对应的现行场景，而不是黑屏
// 见 docs/known-issues.md B4。

const BASE = 'http://127.0.0.1:5173/';

test.setTimeout(180000);

async function waitForScene(page: Page, key: string, timeout = 60000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

/** 启动到标题页并注入一份存档，然后点"继续" */
async function continueWithSave(
  page: Page,
  opts: {
    sceneKey: string; stage: string; turnsInStage: number; year: number; quarter: number;
    flags?: string[]; track?: string; degree?: string; era3Path?: string;
  },
) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });

  await page.evaluate((o) => {
    const { gs, stats: st } = (window as any).__mod;
    gs.patchState({
      stats: st.createDefaultStats(),
      stage: o.stage, turnsInStage: o.turnsInStage,
      year: o.year, quarter: o.quarter,
      school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
      ...(o.track ? { track: o.track } : {}),
      ...(o.degree ? { degree: o.degree } : {}),
    });
    for (const flag of o.flags ?? []) gs.setFlag(flag);
    const s = gs.getState();
    const era3 = o.era3Path ? { ...s.era3, path: o.era3Path } : s.era3;
    const blob = {
      version: 1,
      sceneKey: o.sceneKey,
      savedAt: Date.now(),
      state: { ...s, era3, flags: [...s.flags] },
      firedEvents: ['ug_fake_paper'], // 标记：读档后应恢复进场景 firedEvents
      firedNews: [],
    };
    delete (blob.state as any).assetLedger;
    localStorage.setItem('fckmedcn_save_v1', JSON.stringify(blob));
  }, opts);

  // 重新进标题页让"继续"按钮出现
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!document.getElementById('title-continue'), null, { timeout: 20000 });
  await page.locator('#title-continue').click();
}

test('B4 旧档 sceneKey=InternshipScene：读档进卡片实习场景不白屏', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio|Framebuffer/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });

  await continueWithSave(page, {
    sceneKey: 'InternshipScene', stage: 'internship', turnsInStage: 2, year: 2029, quarter: 4,
  });

  await waitForScene(page, 'InternshipScene', 15000);
  const state = await page.evaluate(() => {
    const st = (window as any).__state();
    const s: any = (window as any).game.scene.getScene('InternshipScene');
    return {
      turns: st.turnsInStage, year: st.year, quarter: st.quarter,
      firedRestored: s.firedEvents?.has?.('ug_fake_paper') ?? null,
      assetLedger: st.assetLedger,
      motivation: st.motivation,
      undergrad: st.undergrad,
      lifeSystems: {
        research: st.research,
        mentorFaction: st.mentorFaction,
        colleagues: st.colleagues,
        family: st.family,
        love: st.love,
        spirit: st.spirit,
        publicImage: st.publicImage,
        leisure: st.leisure,
      },
    };
  });
  expect(state.turns, '读档后季度应保留').toBe(2);
  expect(state.year).toBe(2029);
  expect(state.quarter).toBe(4);
  expect(state.firedRestored, '存档的 firedEvents 应恢复到场景').toBe(true);
  expect(state.assetLedger, '旧档缺少资产流水时应安全补空数组').toEqual([]);
  expect(state.motivation, '旧档缺少动机画像时应补零值').toEqual({ idealism: 0, family: 0, pragmatism: 0 });
  expect(state.undergrad.professionalIdentity, '旧档缺少职业认同时应补默认值').toBe(50);
  expect(state.lifeSystems.research.researchAbility, '旧档缺少科研模块时应从旧科研值迁移').toBe(5);
  expect(state.lifeSystems.mentorFaction.faction.level).toBe('fringe');
  expect(state.lifeSystems.colleagues.integration).toBe(40);
  expect(state.lifeSystems.family.familyFunction).toBeGreaterThan(0);
  expect(state.lifeSystems.love.status).toBe('single');
  expect(state.lifeSystems.spirit.meaning).toBe(50);
  expect(state.lifeSystems.publicImage.publicRisk).toBe(5);
  expect(state.lifeSystems.leisure.sideBusiness.type).toBe('none');

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('B4 旧档 sceneKey=GuipeiScene：读档进卡片规培场景不白屏', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio|Framebuffer/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });

  await continueWithSave(page, {
    sceneKey: 'GuipeiScene', stage: 'guipei', turnsInStage: 3, year: 2031, quarter: 1,
  });

  await waitForScene(page, 'GuipeiScene', 15000);
  const state = await page.evaluate(() => {
    const st = (window as any).__state();
    const s: any = (window as any).game.scene.getScene('GuipeiScene');
    return { turns: st.turnsInStage, firedRestored: s.firedEvents?.has?.('ug_fake_paper') ?? null };
  });
  expect(state.turns).toBe(3);
  expect(state.firedRestored).toBe(true);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('B4 旧档 sceneKey 已删除：安全降级到该阶段现行场景', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio|Framebuffer/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });

  await continueWithSave(page, {
    sceneKey: 'TotallyDeletedScene', stage: 'internship', turnsInStage: 2, year: 2029, quarter: 4,
  });

  // 期望：不黑屏，降级到 HospitalScene（实习阶段现行场景）
  await waitForScene(page, 'HospitalScene', 15000);
  const state = await page.evaluate(() => {
    const st = (window as any).__state();
    return { turns: st.turnsInStage, year: st.year };
  });
  expect(state.turns).toBe(2);
  expect(state.year).toBe(2029);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('旧档长学制已下车：残留八年制 flag 不应继续直博', async ({ page }) => {
  await continueWithSave(page, {
    sceneKey: 'CampusScene',
    stage: 'undergrad',
    turnsInStage: 19,
    year: 2029,
    quarter: 4,
    flags: ['long_system', 'track_eight_year', 'long_sys_transferred'],
  });

  await waitForScene(page, 'CampusScene', 15000);
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'HospitalScene', 15000);

  const active = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).map((s: any) => s.sys.settings.key));
  expect(active).toContain('HospitalScene');
  expect(active).not.toContain('PhdWalkScene');
});

test('旧 UndergradScene 长学制结束仍按长学制路由', async ({ page }) => {
  await continueWithSave(page, {
    sceneKey: 'UndergradScene',
    stage: 'undergrad',
    turnsInStage: 19,
    year: 2029,
    quarter: 4,
    flags: ['track_five_plus_three', 'long_system'],
    track: 'five_plus_three',
    degree: 'master_pro',
  });

  await waitForScene(page, 'UndergradScene', 15000);
  await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('UndergradScene');
    s.transitionToNext();
  });
  await waitForScene(page, 'MasterScene', 15000);
  const active = await page.evaluate(() =>
    (window as any).game.scene.getScenes(true).map((s: any) => s.sys.settings.key));
  expect(active).toContain('MasterScene');
  expect(active).not.toContain('InternshipScene');
});

test('旧档 era3 路径：已下车时不保留 eight_year_phd 残留路径', async ({ page }) => {
  await continueWithSave(page, {
    sceneKey: 'CampusScene',
    stage: 'undergrad',
    turnsInStage: 10,
    year: 2027,
    quarter: 1,
    flags: ['track_eight_year', 'long_sys_transferred'],
    track: 'eight_year',
    degree: 'bachelor',
    era3Path: 'eight_year_phd',
  });

  await waitForScene(page, 'CampusScene', 15000);
  const path = await page.evaluate(() => (window as any).__state().era3.path);
  expect(path).toBe('specialist_master');
});

test('损坏存档不显示继续入口，也不会让标题页崩溃', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('fckmedcn_save_v1', JSON.stringify({
      version: 1,
      sceneKey: 'CampusScene',
      state: null,
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');

  await expect(page.locator('#title-continue')).not.toHaveClass(/show/);
  expect(errors, `损坏存档不应导致运行时错误：\n${errors.join('\n')}`).toEqual([]);
});

test('嵌套集合形状损坏的存档不显示继续入口', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__state, null, { timeout: 20000 });

  await page.evaluate(() => {
    const state = (window as any).__state();
    localStorage.setItem('fckmedcn_save_v1', JSON.stringify({
      version: 1,
      sceneKey: 'CampusScene',
      savedAt: Date.now(),
      state: {
        ...state,
        flags: [...state.flags],
        leisure: {
          ...state.leisure,
          social: { ...state.leisure.social, circles: 5 },
        },
      },
      firedEvents: [],
      firedNews: [],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');

  await expect(page.locator('#title-continue')).not.toHaveClass(/show/);
  expect(errors, `坏档不应进入 applySave：\n${errors.join('\n')}`).toEqual([]);
});

test('核心字段为 null 或缺失的存档被拒绝，不进入场景白屏', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__state, null, { timeout: 20000 });

  for (const corruption of [
    { field: 'newsLog', value: null },
    { field: 'year', value: null },
    { field: 'quarter', value: null },
    { field: 'turnsInStage', value: null },
    { field: 'newsLog', omit: true },
  ]) {
    await page.evaluate((patch) => {
      const state = (window as any).__state();
      const corrupted = { ...state, flags: [...state.flags], [patch.field]: patch.value };
      if (patch.omit) delete corrupted[patch.field];
      localStorage.setItem('fckmedcn_save_v1', JSON.stringify({
        version: 1,
        sceneKey: 'CampusScene',
        savedAt: Date.now(),
        state: corrupted,
        firedEvents: [],
        firedNews: [],
      }));
    }, corruption);
    await page.reload({ waitUntil: 'load' });
    await waitForScene(page, 'TitleScene');
    await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');
    await expect(page.locator('#title-continue'), `${corruption.field} 损坏时不得显示继续入口`)
      .not.toHaveClass(/show/);
  }

  expect(errors, `损坏存档不应触发运行时异常：\n${errors.join('\n')}`).toEqual([]);
});

test('部分损坏的 attrs 会逐字段补默认值并限制到 0..5', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__state, null, { timeout: 20000 });
  await page.evaluate(() => {
    const state = (window as any).__state();
    localStorage.setItem('fckmedcn_save_v1', JSON.stringify({
      version: 1,
      sceneKey: 'CampusScene',
      savedAt: Date.now(),
      state: {
        ...state,
        stage: 'undergrad',
        school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
        attrs: { family: -2, academic: null, luck: 99 },
        flags: [...state.flags],
      },
      firedEvents: [],
      firedNews: [],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');
  await expect(page.locator('#title-continue')).toHaveClass(/show/);
  await page.locator('#title-continue').click();
  await waitForScene(page, 'CampusScene', 15000);
  const attrs = await page.evaluate(() => (window as any).__state().attrs);
  expect(attrs).toEqual({ family: 0, academic: 5, luck: 5, looks: 2 });
});

for (const invalid of [
  { name: '非法阶段', version: 1, statePatch: { stage: 'future_stage' } },
  { name: '非法婚姻状态', version: 1, statePatch: { marital: 'complicated' } },
  { name: '未来版本', version: 2, statePatch: {} },
]) {
  test(`${invalid.name}存档被安全拒绝`, async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'load' });
    await waitForScene(page, 'TitleScene');
    await page.waitForFunction(() => !!(window as any).__state, null, { timeout: 20000 });
    await page.evaluate(({ version, statePatch }) => {
      const state = (window as any).__state();
      localStorage.setItem('fckmedcn_save_v1', JSON.stringify({
        version,
        sceneKey: 'CampusScene',
        savedAt: Date.now(),
        state: { ...state, ...statePatch, flags: [...state.flags] },
        firedEvents: [],
        firedNews: [],
      }));
    }, invalid);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('title-overlay')?.dataset.ready === 'true');
    await expect(page.locator('#title-continue')).not.toHaveClass(/show/);
  });
}
