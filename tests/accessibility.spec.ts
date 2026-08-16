import { test, expect } from '@playwright/test';

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('游戏画布提供语义、焦点和屏幕阅读器状态出口', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const container = document.getElementById('game-container');
    const status = document.getElementById('game-a11y-status');
    const canvas = container?.querySelector('canvas');
    return {
      role: container?.getAttribute('role'),
      tabIndex: container?.getAttribute('tabindex'),
      label: container?.getAttribute('aria-label'),
      describedBy: container?.getAttribute('aria-describedby'),
      statusLive: status?.getAttribute('aria-live'),
      canvasLabel: canvas?.getAttribute('aria-label'),
      canvasTabIndex: canvas?.getAttribute('tabindex'),
    };
  });

  expect(result).toEqual({
    role: 'region',
    tabIndex: '0',
    label: '白大衣模拟器游戏画布',
    describedBy: 'game-a11y-status',
    statusLive: 'polite',
    canvasLabel: '游戏画布。使用键盘、方向键或触控操作。',
    canvasTabIndex: '0',
  });
});

test('事件卡和实验小游戏会播报当前可操作状态', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScenes(true)[0];
    const { EventCard } = await import('/src/ui/EventCard.ts');
    const card = new EventCard(scene, 'undergrad', () => {});
    card.show({
      id: 'a11y_event_probe', stage: 'undergrad', title: '状态播报测试',
      body: '请从两个选项中选择。', category: 'system', weight: 1,
      choices: [{ text: '继续学习', delta: {} }, { text: '先休息', delta: {} }],
    });
    const eventStatus = document.getElementById('game-a11y-status')?.textContent ?? '';
    card.hide();

    const { launchMinigame } = await import('/src/ui/launchMinigame.ts');
    const experiment = launchMinigame(scene, 'experiment', '无障碍测试') as any;
    const experimentStatus = document.getElementById('game-a11y-status')?.textContent ?? '';
    experiment.destroy();
    return { eventStatus, experimentStatus };
  });

  expect(result.eventStatus).toContain('事件：状态播报测试');
  expect(result.eventStatus).toContain('A：继续学习');
  expect(result.experimentStatus).toContain('实验操作：1  无菌准备');
});
