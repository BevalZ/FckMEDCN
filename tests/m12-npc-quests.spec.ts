import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// M12：林主治多阶段弧 + QuestLog 完成反馈；并交叉检查 EVENT-LAYERING 文档存在。

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M12 林主治弧：疏远→修复→再信任→职业回声门控', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { ev, stats: st } = (window as any).__mod;
    const base = st.createDefaultStats();
    const reach = (stage: string, flags: string[], turn: number, id: string) =>
      ev.getAvailableEvents(stage, new Set(flags), { ...base }, new Set(), turn, 'single')
        .some((e: any) => e.id === id);

    return {
      distantOpen: reach('internship', ['distant_attending'], 1, 'aff_attending_distant'),
      distantBlockedByTrust: reach('internship', ['distant_attending', 'trust_attending'], 1, 'aff_attending_distant'),
      afterRepairGated: reach('internship', [], 2, 'aff_attending_after_repair'),
      afterRepairOpen: reach('internship', ['attending_repaired'], 2, 'aff_attending_after_repair'),
      afterRepairBlockedByTrust: reach('internship', ['attending_repaired', 'trust_attending'], 2, 'aff_attending_after_repair'),
      careerEchoGated: reach('career', [], 2, 'echo_attending_career'),
      careerEchoOpen: reach('career', ['attending_arc_complete'], 2, 'echo_attending_career'),
      headnurseDistant: reach('internship', ['distant_headnurse'], 1, 'aff_headnurse_distant'),
      fellowDistant: reach('guipei', ['distant_fellow'], 1, 'aff_fellow_distant'),
    };
  });

  expect(r.distantOpen).toBe(true);
  expect(r.distantBlockedByTrust).toBe(false);
  expect(r.afterRepairGated).toBe(false);
  expect(r.afterRepairOpen).toBe(true);
  expect(r.afterRepairBlockedByTrust).toBe(false);
  expect(r.careerEchoGated).toBe(false);
  expect(r.careerEchoOpen).toBe(true);
  expect(r.headnurseDistant).toBe(true);
  expect(r.fellowDistant).toBe(true);
});

test('M12 QuestLog：完成任务返回飘字提示；地点/NPC 指向文案', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const { quest } = (window as any).__mod;
    const items = quest.internshipQuests(new Set(['attending_arc_complete']), 2, false);
    const attendingOnly = items.filter((i: any) => i.id === 'attending');
    const log = {
      lastDone: new Set<string>(),
      setItems(list: any[]) {
        const freshly: string[] = [];
        for (const it of list.slice(0, 4)) {
          if (!it) continue;
          if (it.done && !this.lastDone.has(it.id)) {
            this.lastDone.add(it.id);
            freshly.push(it.rewardHint ?? `任务完成：${it.label}`);
          }
        }
        return freshly;
      },
    };
    const first = log.setItems(attendingOnly);
    const second = log.setItems(attendingOnly);
    const undergrad = quest.undergradQuests(new Set(), 2, false);
    return {
      attendingDone: items.some((i: any) => i.id === 'attending' && i.done),
      firstHint: first[0] ?? '',
      secondEmpty: second.length === 0,
      pointsToPlace: undergrad.some((i: any) => /技能中心|宿舍|教学楼/.test(i.label)),
      pointsToNpc: items.some((i: any) => /林主治/.test(i.label)),
    };
  });

  expect(r.attendingDone).toBe(true);
  expect(r.firstHint).toContain('带教');
  expect(r.secondEmpty).toBe(true);
  expect(r.pointsToPlace).toBe(true);
  expect(r.pointsToNpc).toBe(true);
});

test('EVENT-LAYERING.md 存在且覆盖三层', async () => {
  const p = path.join(ROOT, 'docs', 'EVENT-LAYERING.md');
  expect(fs.existsSync(p)).toBe(true);
  const text = fs.readFileSync(p, 'utf8');
  expect(text).toMatch(/L1/);
  expect(text).toMatch(/L2/);
  expect(text).toMatch(/L3/);
  expect(text).toMatch(/QuestLog/);
});
