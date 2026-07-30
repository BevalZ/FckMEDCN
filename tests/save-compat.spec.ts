import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// B4 回归：旧格式存档（卡片场景 sceneKey / 已删除场景 sceneKey）读档。
// - 卡片场景仍注册着：旧档应能直接进入对应卡片场景，不白屏、不串场景
// - sceneKey 已不存在：应安全降级到该 stage 对应的现行场景，而不是黑屏
// 见 docs/known-issues.md B4。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

/** 启动到标题页并注入一份存档，然后点"继续" */
async function continueWithSave(
  page: Page,
  opts: { sceneKey: string; stage: string; turnsInStage: number; year: number; quarter: number },
) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });

  await page.evaluate((o) => {
    const { gs, stats: st } = (window as any).__mod;
    gs.patchState({
      stats: st.createDefaultStats(),
      stage: o.stage, turnsInStage: o.turnsInStage,
      year: o.year, quarter: o.quarter,
      school: { id: 'x', name: 'x', realHint: '', tier: 3, minScore: 0, city: 'x', bonus: {} },
    });
    const s = gs.getState();
    const blob = {
      version: 1,
      sceneKey: o.sceneKey,
      savedAt: Date.now(),
      state: { ...s, flags: [...s.flags] },
      firedEvents: ['ug_fake_paper'], // 标记：读档后应恢复进场景 firedEvents
      firedNews: [],
    };
    localStorage.setItem('fckmedcn_save_v1', JSON.stringify(blob));
  }, opts);

  // 重新进标题页让"继续"按钮出现
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-continue') as HTMLButtonElement)?.click());
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
    };
  });
  expect(state.turns, '读档后季度应保留').toBe(2);
  expect(state.year).toBe(2029);
  expect(state.quarter).toBe(4);
  expect(state.firedRestored, '存档的 firedEvents 应恢复到场景').toBe(true);

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
