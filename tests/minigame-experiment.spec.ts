import { test, expect } from '@playwright/test';

test('硕博实验操作小游戏支持三档结算并接入事件池', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });

  const out = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScenes(true)[0];
    const { launchMinigame } = await import('/src/ui/launchMinigame.ts');

    const perfect = launchMinigame(scene, 'experiment', '硕士实验');
    const perfectPromise = perfect.play();
    (perfect as any).choose(0);
    (perfect as any).choose(1);
    (perfect as any).choose(2);
    const perfectResult = await perfectPromise;

    const good = launchMinigame(scene, 'experiment', '博士实验');
    const goodPromise = good.play();
    (good as any).choose(1);
    (good as any).choose(0);
    (good as any).choose(1);
    (good as any).choose(2);
    const goodResult = await goodPromise;

    const miss = launchMinigame(scene, 'experiment', '报废测试');
    const missPromise = miss.play();
    (miss as any).choose(2);
    (miss as any).choose(2);
    (miss as any).choose(2);
    const missResult = await missPromise;

    const events = (window as any).__mod.ev.ALL_EVENTS;
    return {
      grades: [perfectResult.grade, goodResult.grade, missResult.grade],
      perfectFlag: perfectResult.flagSet,
      perfectResearch: perfectResult.delta.research,
      master: events.find((e: any) => e.id === 'master_experiment_protocol'),
      phd: events.find((e: any) => e.id === 'phd_experiment_protocol'),
    };
  });

  expect(out.grades).toEqual(['perfect', 'good', 'miss']);
  expect(out.perfectFlag).toBe('experiment_protocol_mastered');
  expect(out.perfectResearch).toBeGreaterThan(0);
  expect(out.master.minigame).toBe('experiment');
  expect(out.master.stage).toBe('master');
  expect(out.phd.minigame).toBe('experiment');
  expect(out.phd.stage).toBe('phd');
});
