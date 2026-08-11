import { test, expect } from '@playwright/test';

const SUBPATH = '/FckMedCN/';

test('生产包在 GitHub Pages 子路径加载页面与合成音频', async ({ page }) => {
  const mediaRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on('request', req => {
    if (/\.(mp3|wav|ogg|m4a)(?:$|\?)/i.test(req.url())) mediaRequests.push(req.url());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));

  await page.goto('.', { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.getElementById('title-overlay')?.dataset.ready === 'true',
    null,
    { timeout: 30000 },
  ).catch(error => {
    throw new Error(`生产标题页未就绪：${pageErrors.join(' | ') || String(error)}`);
  });
  expect(pageErrors, '生产标题页不应发生脚本异常').toEqual([]);
  expect(
    await page.locator('#game-container canvas').evaluate(canvas => (
      (canvas as HTMLCanvasElement).getContext('2d') !== null
    )),
    '自动化生产预览应使用稳定的 Canvas 渲染器',
  ).toBe(true);
  await page.keyboard.press('a');
  await page.locator('#title-start').click();
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe(SUBPATH);
  expect(mediaRequests, '生产包不应请求已移除的预录音频').toEqual([]);
  expect(pageErrors, '触发合成音频后不应发生脚本异常').toEqual([]);
});
