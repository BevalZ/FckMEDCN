import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// B2 剩余人工项的自动化（docs/HANDOFF.md）：实习场景 NPC 走近按 E 能对话。
// npc-placement.spec.ts 已断言落格合法，这里补行为级验证：
// 林主治（attending）与刘护士长（headnurse）按 E → 对话卡打开 → 选项可提交 →
// 行动点扣除、本季已聊标记正确。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function dismissPopups(page: Page, sceneKey: string) {
  for (let i = 0; i < 7; i++) {
    const busy = await page.evaluate(
      (k) => (window as any).game.scene.getScene(k)?.busy,
      sceneKey,
    );
    if (busy === false) return;
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
  }
}

/** 走到指定 NPC 旁按 E 开对话，提交第 1 项并关掉后果弹窗 */
async function talkToNpc(page: Page, npcId: string, expectName: string) {
  const opened = await page.evaluate((id) => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    const npc = (s.npcs as any[]).find(n => n.def.id === id);
    if (!npc) return null;
    s.walker.sprite.setPosition(npc.x + 20, npc.y);
    return { name: npc.def.name };
  }, npcId);
  expect(opened, `${expectName}（${npcId}）本季应在场`).toBeTruthy();
  expect(opened!.name).toBe(expectName);
  await page.waitForTimeout(300);

  const actionsBefore = await page.evaluate(
    () => (window as any).game.scene.getScene('HospitalScene').actionsLeft);

  await page.keyboard.press('e');
  await page.waitForFunction(
    (id) => {
      const s: any = (window as any).game.scene.getScene('HospitalScene');
      return s.busy === true && s.currentEvent?.id === `npc_talk_${id}`;
    },
    npcId, { timeout: 5000 },
  );

  // 提交第 1 项 → 关后果弹窗 → 场景恢复
  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('HospitalScene').busy === false,
    null, { timeout: 8000 },
  );

  const after = await page.evaluate((id) => {
    const s: any = (window as any).game.scene.getScene('HospitalScene');
    return {
      actionsLeft: s.actionsLeft,
      talked: [...s.talkedThisQuarter] as string[],
    };
  }, npcId);
  expect(after.actionsLeft, `${expectName}对话应扣 1 行动点`).toBe(actionsBefore - 1);
  expect(after.talked, `${expectName}应记为本季已聊`).toContain(npcId);
}

test('B2 实习场景：林主治/刘护士长可走近按 E 对话', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio|Framebuffer/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  // 进校园 → 跳到本科最后一季睡觉 → 实习医院
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await dismissPopups(page, 'CampusScene');

  await page.evaluate(() => {
    (window as any).__patchState({ turnsInStage: 19 });
    (window as any).game.scene.getScene('CampusScene').actionsLeft = 0;
  });
  await page.keyboard.press('e');
  await waitForScene(page, 'HospitalScene', 30000);
  await page.waitForTimeout(800);
  await dismissPopups(page, 'HospitalScene');

  await talkToNpc(page, 'attending', '林主治');
  await talkToNpc(page, 'headnurse', '刘护士长');

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});
