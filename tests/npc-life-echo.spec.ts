import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('NPC 后续人生回声：信任、疏远和长期亲密关系会在后续阶段重新出现', async ({ page }) => {
  await boot(page);

  const result = await page.evaluate(() => {
    const { ev, stats } = (window as any).__mod;
    const base = stats.createDefaultStats();
    const available = (stage: string, flags: string[], turn: number) =>
      ev.getAvailableEvents(stage, new Set(flags), { ...base, age: stage === 'retirement' ? 65 : 45 }, new Set(), turn, 'single')
        .map((event: any) => event.id);

    const allLifeEchoes = ev.ALL_EVENTS
      .filter((event: any) => event.id.startsWith('npc_life_echo_'))
      .map((event: any) => event.id);

    return {
      count: allLifeEchoes.length,
      roommateClosed: available('retirement', [], 4).includes('npc_life_echo_roommate_retirement_trust'),
      roommateOpen: available('retirement', ['trust_roommate'], 4).includes('npc_life_echo_roommate_retirement_trust'),
      advisorRegretClosed: available('retirement', [], 3).includes('npc_life_echo_advisor_retirement_distant'),
      advisorRegretOpen: available('retirement', ['distant_advisor'], 3).includes('npc_life_echo_advisor_retirement_distant'),
      romanceClosed: available('retirement', [], 2).includes('npc_life_echo_fellow_retirement_romance'),
      romanceOpen: available('retirement', ['npc_romance_sustained_fellow'], 2).includes('npc_life_echo_fellow_retirement_romance'),
      staticExamples: allLifeEchoes.filter((id: string) =>
        id.includes('attending_career') || id.includes('lab_senior_career') || id.includes('graduate_student_eternity')),
    };
  });

  expect(result.count, 'NPC 后续人生回声事件数量不足').toBeGreaterThanOrEqual(40);
  expect(result.roommateClosed, '没有 trust_roommate 时，退休旧室友回声不应出现').toBe(false);
  expect(result.roommateOpen, 'trust_roommate 后，退休旧室友回声应可达').toBe(true);
  expect(result.advisorRegretClosed, '没有 distant_advisor 时，导师疏远回望不应出现').toBe(false);
  expect(result.advisorRegretOpen, 'distant_advisor 后，导师疏远回望应可达').toBe(true);
  expect(result.romanceClosed, '没有持续亲密关系时，NPC 伴侣退休回声不应出现').toBe(false);
  expect(result.romanceOpen, 'npc_romance_sustained_fellow 后，伴侣退休回声应可达').toBe(true);
  expect(result.staticExamples.length, '应覆盖带教、科研同门、学生传承等不同交集类型').toBeGreaterThanOrEqual(3);
});
