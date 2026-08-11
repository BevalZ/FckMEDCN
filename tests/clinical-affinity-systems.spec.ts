import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('临床满足：抢救成功倾向回满心理，职级越高满足感衰减越明显', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev, tf, stats: st } = (window as any).__mod;
    const rescue = ev.ALL_EVENTS.find((e: any) =>
      e.id.startsWith('gen_career_clinic_emergency_') && e.category === 'clinical' && e.title.includes('抢救'));
    const choice = rescue.choices.find((c: any) => c.text.includes('心肺复苏'));
    const run = (flags: string[]) => {
      gs.resetGame();
      gs.patchState({ stage: 'career', stats: { ...st.createDefaultStats(), sanity: 40 }, flags: new Set(flags) });
      const outcome = tf.commitChoice(choice, rescue).clinicalSatisfaction;
      return { sanity: gs.getState().stats.sanity, outcome };
    };
    return {
      resident: run([]),
      chief: run(['passed_zhenggao']),
    };
  });

  expect(r.resident.outcome.kind).toBe('rescue');
  expect(r.resident.sanity, '无高级职级衰减时，抢救成功应把心理推到 100').toBe(100);
  expect(r.chief.outcome.seniorityDecayPct, '主任满足感衰减 25%').toBe(25);
  expect(r.chief.sanity, '主任仍有满足感，但低于直接回满').toBeLessThan(100);
});

test('临床满足：规范完成普通诊疗会给 10-50 点随机心理收益', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, ev, tf, stats: st } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      const event = ev.ALL_EVENTS.find((e: any) => e.id === 'diagnostic_workup');
      const choice = event.choices[0];
      gs.resetGame();
      gs.patchState({ stage: 'internship', stats: { ...st.createDefaultStats(), sanity: 50 } });
      const outcome = tf.commitChoice(choice, event).clinicalSatisfaction;
      return { sanity: gs.getState().stats.sanity, outcome };
    } finally {
      Math.random = originalRandom;
    }
  });

  expect(r.outcome.kind).toBe('recovery');
  expect(r.outcome.rawGain, '随机下界应为 10').toBe(10);
  expect(r.sanity, '普通好转应增加心理').toBe(60);
});

test('好感度：信任关系会在季度结算中转化为实际支持', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, npc, stats: st } = (window as any).__mod;
    const run = (trusted: boolean) => {
      gs.resetGame();
      gs.patchState({ stage: 'undergrad', stats: st.createDefaultStats(), affinity: {}, counters: {} });
      if (trusted) npc.changeAffinity('roommate', 30);
      const before = { ...gs.getState().stats };
      const quarter = tf.advanceQuarter('undergrad');
      const after = gs.getState().stats;
      return {
        sanityGain: after.sanity - before.sanity,
        relationsGain: after.relations - before.relations,
        messages: quarter.affinity.messages,
        trustFlag: gs.getState().flags.has('trust_roommate'),
      };
    };
    return { base: run(false), trusted: run(true) };
  });

  expect(r.trusted.trustFlag).toBe(true);
  expect(r.trusted.messages).toContain('室友支持');
  expect(r.trusted.sanityGain).toBeGreaterThan(r.base.sanityGain);
  expect(r.trusted.relationsGain).toBeGreaterThan(r.base.relationsGain);
});

test('低存款：工作后连续 3 个季度低于 10000 会触发随机心理减退', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { gs, tf, stats: st } = (window as any).__mod;
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      gs.resetGame();
      gs.patchState({
        stage: 'career',
        counters: {},
        stats: { ...st.createDefaultStats(), money: -50000, sanity: 80 },
      });
      const quarters = [tf.advanceQuarter('career'), tf.advanceQuarter('career'), tf.advanceQuarter('career')];
      return {
        outcomes: quarters.map((q: any) => q.mentalDecline),
        counter: gs.getState().counters.career_low_savings_q ?? 0,
        sanity: gs.getState().stats.sanity,
      };
    } finally {
      Math.random = originalRandom;
    }
  });

  expect(r.outcomes[0]).toBeNull();
  expect(r.outcomes[1]).toBeNull();
  expect(r.outcomes[2].level).toBe('mild');
  expect(r.outcomes[2].sanityDelta).toBe(-4);
  expect(r.counter, '触发后连续低存款计数应重置').toBe(0);
  expect(r.sanity).toBeLessThan(80);
});
