import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 知情同意 / 术前谈话（深挖第五部分 R31）回归：
// 1) career_informed_consent 在职业第 1-2 季可达，三个选项 flag 正确；
// 2) 谈得好（informed_consent_ok）→ career_consent_echo_ok 解锁（第 4 季起），
//    谈得糊（informed_consent_hasty）→ career_consent_echo_hasty 解锁；
// 3) 未触发谈话前，两个回声事件都不可达（门控生效）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('知情同意：门控正确、两个方向各有回声', async ({ page }) => {
  await boot(page);
  const report = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();

    // 事件存在性
    const ids = new Set(ev.ALL_EVENTS.map((e: any) => e.id));
    const exist = {
      consent: ids.has('career_informed_consent'),
      echoOk: ids.has('career_consent_echo_ok'),
      echoHasty: ids.has('career_consent_echo_hasty'),
    };

    // 门控：无 flag 时回声不可达；有对应 flag 时第 4 季可达
    const reach = (flags: string[], turn: number, id: string) =>
      ev.getAvailableEvents('career', new Set(flags), { ...base }, new Set(), turn, 'single')
        .some((e: any) => e.id === id);

    return {
      exist,
      echoOkGated: reach([], 4, 'career_consent_echo_ok'),
      echoOkUnlocked: reach(['informed_consent_ok'], 4, 'career_consent_echo_ok'),
      echoHastyGated: reach([], 4, 'career_consent_echo_hasty'),
      echoHastyUnlocked: reach(['informed_consent_hasty'], 4, 'career_consent_echo_hasty'),
      consentReachable: reach([], 1, 'career_informed_consent'),
    };
  });
  console.log('  知情同意:', JSON.stringify(report));
  expect(report.exist.consent, 'career_informed_consent 应存在').toBe(true);
  expect(report.exist.echoOk, 'career_consent_echo_ok 应存在').toBe(true);
  expect(report.exist.echoHasty, 'career_consent_echo_hasty 应存在').toBe(true);
  expect(report.consentReachable, '术前谈话应第 1 季可达').toBe(true);
  expect(report.echoOkGated, '未谈话时 echo_ok 应不可达').toBe(false);
  expect(report.echoOkUnlocked, '谈得好后 echo_ok 应第 4 季可达').toBe(true);
  expect(report.echoHastyGated, '未谈话时 echo_hasty 应不可达').toBe(false);
  expect(report.echoHastyUnlocked, '谈得糊后 echo_hasty 应第 4 季可达').toBe(true);
});
