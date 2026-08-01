import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// NPC 好感度门控事件回归（REVIEW-INTERACTION P0 落地）：
// 1) trust_xxx → 对应信任向事件可达；distant_xxx → 疏远向事件可达；无 flag 时不可达；
// 2) 信任向与疏远向互斥（不会同时出现）；
// 3) 跨阶段回响（echo_roommate_career 需 trust_roommate 且出现在规培阶段）。

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

test('好感度门控：信任/疏远各解锁对应事件，无 flag 时不可达', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const reach = (stage: string, flags: string[], turn: number, id: string) =>
      ev.getAvailableEvents(stage, new Set(flags), { ...base }, new Set(), turn, 'single')
        .some((e: any) => e.id === id);

    return {
      // 室友：本科
      trustGated: reach('undergrad', [], 2, 'aff_roommate_trust'),
      trustOpen: reach('undergrad', ['trust_roommate'], 2, 'aff_roommate_trust'),
      distantGated: reach('undergrad', [], 2, 'aff_roommate_distant'),
      distantOpen: reach('undergrad', ['distant_roommate'], 2, 'aff_roommate_distant'),
      // 信任与疏远互斥：同有 trust_ 与 distant_ 时只应出信任向（疏远向沉底）
      bothOpen: reach('undergrad', ['trust_roommate', 'distant_roommate'], 2, 'aff_roommate_distant'),
      // 林主治：实习
      attendingTrust: reach('internship', ['trust_attending'], 2, 'aff_attending_trust'),
      // 跨阶段回响：trust_roommate 在规培阶段可用
      echoGated: reach('guipei', [], 2, 'echo_roommate_career'),
      echoOpen: reach('guipei', ['trust_roommate'], 2, 'echo_roommate_career'),
    };
  });
  console.log('  好感度门控:', JSON.stringify(r));
  expect(r.trustGated, '无 flag 时信任向应不可达').toBe(false);
  expect(r.trustOpen, 'trust_roommate 后信任向应可达').toBe(true);
  expect(r.distantGated, '无 flag 时疏远向应不可达').toBe(false);
  expect(r.distantOpen, 'distant_roommate 后疏远向应可达').toBe(true);
  expect(r.bothOpen, '信任+疏远同时满足时疏远向应沉底（信任优先）').toBe(false);
  expect(r.attendingTrust, '实习林主治信任向应可达').toBe(true);
  expect(r.echoGated, '无 flag 时跨阶段回响应不可达').toBe(false);
  expect(r.echoOpen, 'trust_roommate 后规培回响应可达').toBe(true);
});
