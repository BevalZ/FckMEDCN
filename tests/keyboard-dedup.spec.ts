import { test, expect } from '@playwright/test';

test('同一原生键盘事件被 Phaser 队列重放时只分发一次', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => (window as any).game?.scene?.getScene('TitleScene')?.scene.isActive());

  const dispatchCount = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('TitleScene');
    const keyboard = scene.input.keyboard;
    let count = 0;
    const handler = (event: KeyboardEvent) => {
      if (event.code === 'ArrowDown') count++;
    };
    keyboard.on('keydown', handler);

    const down = {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, type: 'keydown', timeStamp: 12345,
      altKey: false, ctrlKey: false, shiftKey: false, metaKey: false,
      preventDefault() {},
    };
    const up = { ...down, type: 'keyup', timeStamp: 12346 };
    keyboard.manager.queue.push(down, up);
    keyboard.update();
    keyboard.update();

    keyboard.off('keydown', handler);
    keyboard.manager.queue.length = 0;
    return count;
  });

  expect(dispatchCount).toBe(1);
});
