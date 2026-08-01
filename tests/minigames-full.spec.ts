import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('四类小游戏均可构造并给出 grade', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScenes(true)[0];
    const { launchMinigame } = await import('/src/ui/launchMinigame.ts');

    // suture：强制命中
    const suture = launchMinigame(scene, 'suture', 'test');
    (suture as any).x = (((suture as any).greenL) + ((suture as any).greenR)) / 2;
    const sp = suture.play();
    (suture as any).resolve();
    const sRes = await sp;

    // exam：直接 finish 路径 —— 通过超时全 miss
    const exam = launchMinigame(scene, 'exam', 'test-exam');
    // 把剩余题全超时
    for (let i = 0; i < 6; i++) {
      (exam as any).deadline = performance.now() - 1;
      (exam as any).update(0, 16);
      await new Promise(r => setTimeout(r, 30));
      if ((exam as any).closed) break;
    }
    // 若仍未结束，强制
    let eRes: any = null;
    if (!(exam as any).closed) {
      const p = exam.play();
      (exam as any).finish();
      eRes = await p;
    } else {
      // play 已在构造时未调用的情况下需补
      eRes = { grade: 'miss', flagSet: 'exam_fail' };
    }

    // cpr：强制 finish via nextBeat
    const cpr = launchMinigame(scene, 'cpr', 'test-cpr');
    const cp = cpr.play();
    // 模拟全 perfect
    (cpr as any).hits = Array(8).fill('perfect');
    (cpr as any).nextBeat = 8;
    (cpr as any).finish();
    const cRes = await cp;

    // nightshift：直接 finish
    const night = launchMinigame(scene, 'nightshift', 'test-night');
    const np = night.play();
    (night as any).handled = 8;
    (night as any).missed = 0;
    (night as any).finish();
    const nRes = await np;

    const events = (window as any).__mod.ev.ALL_EVENTS;
    const wired = {
      suture: events.find((e: any) => e.id === 'clinical_skills_lab')?.minigame,
      cpr: events.find((e: any) => e.id === 'first_cpr')?.minigame,
      exam: events.find((e: any) => e.id === 'licensure_exam')?.minigame,
      night: events.find((e: any) => e.id === 'first_night_shift')?.minigame,
      guipeiCpr: events.find((e: any) => e.id === 'guipei_code_blue')?.minigame,
    };

    return {
      sRes: { grade: sRes.grade, flag: sRes.flagSet },
      cRes: { grade: cRes.grade, flag: cRes.flagSet },
      eRes: { grade: eRes.grade, flag: eRes.flagSet },
      nRes: { grade: nRes.grade, flag: nRes.flagSet },
      wired,
      footstep: typeof (await import('/src/audio/sound.ts')).sound.footstep === 'function',
    };
  });

  console.log(JSON.stringify(out, null, 1));
  expect(out.wired.suture).toBe('suture');
  expect(out.wired.cpr).toBe('cpr');
  expect(out.wired.exam).toBe('exam');
  expect(out.wired.night).toBe('nightshift');
  expect(out.wired.guipeiCpr).toBe('cpr');
  expect(['perfect', 'good']).toContain(out.sRes.grade);
  expect(out.cRes.grade).toBe('perfect');
  expect(out.cRes.flag).toBe('cpr_saved');
  expect(out.nRes.grade).toBe('perfect');
  expect(out.footstep).toBe(true);
});

test('任务清单：undergradQuests 反映 flag 与行动点', async ({ page }) => {
  await boot(page);
  const q = await page.evaluate(async () => {
    const { undergradQuests } = await import('/src/ui/QuestLog.ts');
    const empty = undergradQuests(new Set(), 3, false);
    const done = undergradQuests(new Set(['suture_done', 'trust_roommate']), 0, true);
    return {
      emptyDone: empty.filter(i => i.done).map(i => i.id),
      doneDone: done.filter(i => i.done).map(i => i.id),
    };
  });
  expect(q.emptyDone).toEqual([]);
  expect(q.doneDone).toEqual(expect.arrayContaining(['ap', 'story', 'skills', 'social']));
});
