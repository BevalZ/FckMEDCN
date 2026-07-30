import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('缝合小游戏：命中绿区与偏出给出不同结果', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(async () => {
    // 在 TitleScene 上直接挂一个 TimingBarMinigame，绕过完整校园流程
    const scene = (window as any).game.scene.getScenes(true)[0];
    const { TimingBarMinigame } = await import('/src/ui/TimingBarMinigame.ts');

    // 强制命中：把游标放到绿区中心再 resolve
    const mg1 = new TimingBarMinigame(scene, { title: 'test-hit', speed: 0 });
    (mg1 as any).x = ((mg1 as any).greenL + (mg1 as any).greenR) / 2;
    const p1 = mg1.play();
    (mg1 as any).resolve();
    const hit = await p1;

    const mg2 = new TimingBarMinigame(scene, { title: 'test-miss', speed: 0 });
    (mg2 as any).x = 5; // 远离绿区
    const p2 = mg2.play();
    (mg2 as any).resolve();
    const miss = await p2;

    return {
      hitGrade: hit.grade,
      hitFlag: hit.flagSet,
      missGrade: miss.grade,
      missFlag: miss.flagSet,
      clinical_skills_has_minigame: (window as any).__mod.ev.ALL_EVENTS
        .find((e: any) => e.id === 'clinical_skills_lab')?.minigame === 'suture',
    };
  });

  console.log(JSON.stringify(result));
  expect(result.clinical_skills_has_minigame).toBe(true);
  expect(['perfect', 'good']).toContain(result.hitGrade);
  expect(result.missGrade).toBe('miss');
  expect(result.missFlag).toBe('suture_failed');
});

test('氛围 tint：本科随季度变化，规培更冷', async ({ page }) => {
  await boot(page);
  const tints = await page.evaluate(() => {
    const { stageAmbientTint } = (window as any).__mod
      ? { stageAmbientTint: null }
      : { stageAmbientTint: null };
    // 直接从模块取（通过动态 import 会是另一实例，但纯函数无状态，可接受）
    return null as any;
  });
  // 改用 evaluate 内 import 纯函数
  const out = await page.evaluate(async () => {
    const m = await import('/src/ui/pixelArt.ts');
    return {
      spring: m.stageAmbientTint('undergrad', 1),
      winter: m.stageAmbientTint('undergrad', 4),
      guipei: m.stageAmbientTint('guipei', 2),
      career: m.stageAmbientTint('career', 2),
    };
  });
  console.log(JSON.stringify(out));
  expect(out.spring).not.toBe(out.winter);
  expect(out.guipei).toBe(0xcfd8dc);
  expect(out.career).toBe(0xd7ccc8);
  void tints;
});
