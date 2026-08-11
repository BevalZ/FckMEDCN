import { test, expect } from '@playwright/test';

// 音频集成冒烟：点击、按键、环境 BGM 均由 Web Audio 运行时合成，
// 不应请求或分发来源不明的外部音频文件。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  return errors;
}

test('合成按键音 + 场景 BGM 不抛错且不请求媒体文件', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', request => {
    if (/\.(mp3|wav|ogg|m4a)(?:$|\?)/i.test(request.url())) mediaRequests.push(request.url());
  });
  const errors = await boot(page);
  // 全局 keydown → sound.keytick()
  await page.keyboard.press('a');
  await page.keyboard.press('Enter');
  const synth = await page.evaluate(async () => {
    const { sound } = await import('/src/audio/sound.ts');
    sound.startBgm();
    sound.unlockAudio();
    return {
      contextState: (sound as any).ctx?.state ?? null,
      oscillatorCount: (sound as any).bgmNodes?.length ?? 0,
      mood: (sound as any).currentBgmMood ?? null,
    };
  });
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
  expect(synth.contextState).not.toBeNull();
  expect(synth.oscillatorCount).toBe(3);
  expect(synth.mood).toBe('bright');
  expect(mediaRequests, '合成音频模式不应请求预录媒体').toEqual([]);
  expect(errors, `音频代码不应抛错：${errors.join(' | ')}`).toEqual([]);
});
