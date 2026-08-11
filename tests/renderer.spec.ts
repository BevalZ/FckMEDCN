import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function waitForTitle(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (
    ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((scene: any) => scene.sys.settings.key === 'TitleScene')
  ));
}

test('自动化默认使用 Canvas，避免首次 headless WebGL 初始化失败', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(BASE, { waitUntil: 'load' });
  await waitForTitle(page);

  const renderer = await page.evaluate(() => ({
    type: (window as any).game.renderer.type,
    className: (window as any).game.renderer.constructor.name,
  }));
  expect(renderer).toEqual({ type: 1, className: 'CanvasRenderer' });
  expect(errors).toEqual([]);
});

test('自动化可显式启用 WebGL，保留生产渲染路径冒烟覆盖', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${BASE}?renderer=webgl`, { waitUntil: 'load' });
  await waitForTitle(page);

  const renderer = await page.evaluate(() => ({
    type: (window as any).game.renderer.type,
    className: (window as any).game.renderer.constructor.name,
  }));
  expect(renderer).toEqual({ type: 2, className: 'WebGLRenderer' });
  expect(errors).toEqual([]);
});
