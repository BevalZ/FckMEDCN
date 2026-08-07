import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: import('@playwright/test').Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('时代0/1新状态有稳定默认值，核心事件会驱动动机、职业认同和危机学分', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const { gs, ev, tf } = (window as any).__mod;
    gs.resetGame();
    const initial = gs.getState();

    const whitecoat = ev.ALL_EVENTS.find((e: any) => e.id === 'white_coat_ceremony');
    tf.commitChoice(whitecoat.choices[0], whitecoat);
    const afterWhitecoat = gs.getState();

    const exam = ev.ALL_EVENTS.find((e: any) => e.id === 'physiology_biochem_exam');
    tf.commitChoice(exam.choices[2], exam);
    tf.commitChoice(exam.choices[2], exam);
    const afterFails = gs.getState();

    return {
      initialMotivation: initial.motivation,
      initialUndergrad: initial.undergrad,
      whitecoat: {
        idealism: afterWhitecoat.motivation.idealism,
        identity: afterWhitecoat.undergrad.professionalIdentity,
        flag: afterWhitecoat.flags.has('proud_whitecoat'),
      },
      fails: {
        credits: afterFails.undergrad.crisisCredits,
        level: afterFails.undergrad.crisisLevel,
        thoughts: afterFails.undergrad.dropoutThoughts,
      },
    };
  });

  expect(result.initialMotivation).toEqual({ idealism: 0, family: 0, pragmatism: 0 });
  expect(result.initialUndergrad.professionalIdentity).toBe(50);
  expect(result.initialUndergrad.crisisLevel).toBe(0);
  expect(result.whitecoat).toEqual({ idealism: 2, identity: 60, flag: true });
  expect(result.fails).toEqual({ credits: 12, level: 1, thoughts: 2 });
});

test('默认高考路径形成初心印记并进入校园', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await page.waitForFunction(() => (window as any).game.scene.isActive('GaokaoScene'));

  // 时代0已经扩展为多段高考前后叙事；默认选项应最终稳定进入校园。
  for (let i = 0; i < 20; i++) {
    const inCampus = await page.evaluate(() => (window as any).game.scene.isActive('CampusScene'));
    if (inCampus) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  }
  await page.waitForFunction(() => (window as any).game.scene.isActive('CampusScene'), null, { timeout: 30000 });

  const state = await page.evaluate(() => {
    const s = (window as any).__mod.gs.getState();
    return {
      initialMotivation: s.initialMotivation,
      initialAnswer: s.initialAnswer,
      motivation: s.motivation,
      remembered: s.flags.has('remember_初心'),
    };
  });
  expect(state.initialMotivation).toBe('idealism');
  expect(state.initialAnswer).toBe('remember');
  expect(state.motivation.idealism).toBeGreaterThanOrEqual(3);
  expect(state.remembered).toBe(true);
});
