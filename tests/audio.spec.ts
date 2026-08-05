import { test, expect } from '@playwright/test';

// 音频集成冒烟：文件化 BGM（两首 MP3）+ 采样点击/按键音，交互不应抛错；
// 资源应可被 dev server 提供（200）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  return errors;
}

test('音频资源可加载（BGM + 点击采样均 200）', async ({ request }) => {
  for (const f of [
    'audio/bgm_absolutesound.mp3',
    'audio/bgm_alexmorgan.mp3',
    'audio/sfx/click.mp3',
    'audio/sfx/click2.mp3',
  ]) {
    const r = await request.get(`${BASE}${f}`);
    expect(r.status(), `${f} 应可加载`).toBe(200);
    expect(r.headers()['content-type'] ?? '', `${f} 应为音频`).toMatch(/audio/);
  }
});

test('全局按键音 + 场景 BGM 不抛错', async ({ page }) => {
  const errors = await boot(page);
  // 全局 keydown → sound.keytick()
  await page.keyboard.press('a');
  await page.keyboard.press('Enter');
  // 进入可行走场景（会调用 setBgmMood + 多处 sound.click）
  await page.evaluate(() => {
    const gs = (window as any).__mod.gs;
    gs.patchState({ stage: 'undergrad', turnsInStage: 1, counters: {} });
    (window as any).game.scene.getScene('TitleScene').scene.start('CampusScene');
  });
  await page.waitForTimeout(1500);
  // 触发一次交互点击音
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  expect(errors, `音频代码不应抛错：${errors.join(' | ')}`).toEqual([]);
});
