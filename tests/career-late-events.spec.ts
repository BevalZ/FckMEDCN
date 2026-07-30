import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 职业后期事件（promote_zhenggao / career_late_*）的可达性与 flag 消费检查：
// 1) 每条事件在满足门控时能于预期回合进入候选池，缺 flag 时沉底（防配错门槛）；
// 2) 新 flag（mentored / passed_zhenggao / took_admin）都有"设置者"和"消费者"，
//    不出现新的死 flag（沿用"所有选择都要能回响"的约定）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('职业后期事件可达性与门控', async ({ page }) => {
  await boot(page);

  const report = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();

    // [事件id, 需要的flag, 预期首次可达回合]
    const CASES: Array<[string, string[], number]> = [
      ['promote_zhenggao', ['passed_fugao'], 9],
      ['career_late_director_offer', ['passed_zhenggao'], 10],
      ['career_late_admin_burden', ['took_admin'], 10],
      ['career_late_society', ['passed_fugao'], 8],
      ['career_late_mentor_retires', [], 8],
      ['career_late_student_return', ['mentored'], 9],
      ['career_late_body_protests', [], 9],
      ['career_late_tough_case', ['track_clinical'], 8],
      ['career_late_keynote', ['track_research'], 8],
    ];

    const rows = CASES.map(([id, needFlags, expectTurn]) => {
      // 满足门控：扫 1-12 回合，找首次可达
      const flags = new Set(needFlags);
      let firstHit = -1;
      for (let turn = 1; turn <= 12; turn++) {
        const pool = ev.getAvailableEvents('career', flags, { ...base }, new Set(), turn, 'single');
        if (pool.some((e: any) => e.id === id)) { firstHit = turn; break; }
      }
      // 缺门控 flag 时（仅对有 requireFlag 的事件）：整程不可达
      let gatedOk = true;
      const evt = ev.ALL_EVENTS.find((e: any) => e.id === id);
      if (evt?.requireFlag) {
        const bare = new Set(needFlags.filter(f => f !== evt.requireFlag));
        for (let turn = 1; turn <= 12; turn++) {
          const pool = ev.getAvailableEvents('career', bare, { ...base }, new Set(), turn, 'single');
          if (pool.some((e: any) => e.id === id)) { gatedOk = false; break; }
        }
      }
      return { id, firstHit, expectTurn, gatedOk, ok: firstHit === expectTurn && gatedOk };
    });

    // flag 消费闭环：设置者(choice.flagSet) ↔ 消费者(ev.requireFlag)
    const setBy: Record<string, string[]> = {};
    const requiredBy: Record<string, string[]> = {};
    for (const e of ev.ALL_EVENTS) {
      if (e.requireFlag) (requiredBy[e.requireFlag] ??= []).push(e.id);
      for (const c of e.choices) {
        if (c.flagSet) (setBy[c.flagSet] ??= []).push(e.id);
      }
    }
    const CHAINS: Array<[string, string, string]> = [
      // [flag, 期望设置者之一, 期望消费者之一]
      ['mentored', 'teach_intern', 'career_late_student_return'],
      ['passed_zhenggao', 'promote_zhenggao', 'career_late_director_offer'],
      ['took_admin', 'career_late_director_offer', 'career_late_admin_burden'],
    ];
    const chains = CHAINS.map(([flag, setter, consumer]) => ({
      flag,
      setterOk: (setBy[flag] ?? []).includes(setter),
      consumerOk: (requiredBy[flag] ?? []).includes(consumer),
    }));

    return { rows, chains };
  });

  for (const r of report.rows) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.id}: 首次可达回合 ${r.firstHit}（预期 ${r.expectTurn}）门控${r.gatedOk ? '生效' : '失效'}`);
    expect(r.firstHit, `${r.id} 首次可达回合`).toBe(r.expectTurn);
    expect(r.gatedOk, `${r.id} 缺少 requireFlag 时仍可触达`).toBe(true);
  }
  for (const c of report.chains) {
    console.log(`  ${c.setterOk && c.consumerOk ? '✓' : '✗'} flag ${c.flag}: 设置${c.setterOk ? '✓' : '✗'} 消费${c.consumerOk ? '✓' : '✗'}`);
    expect(c.setterOk, `${c.flag} 无设置者`).toBe(true);
    expect(c.consumerOk, `${c.flag} 无消费者（死 flag）`).toBe(true);
  }
});
