import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// A3 回归：ESC 取消对话必须干净回滚（docs/known-issues.md A3）。
// - NPC 对话：退还"本季可聊"资格、重新点亮感叹号、不消耗行动点，可立刻重新对话
// - 地点事件：once 标记须撤销，否则该事件被永久屏蔽
// 卡片式阶段（BaseStageScene）不提供 ESC 取消是设计如此（D1），不在此验证。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 20000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene', 120000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 20000 });

  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
  }
  await waitForScene(page, 'CampusScene');

  // 首次进入的经济简报弹窗，空格关闭后等场景就绪
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );
}

function campusScene(page: Page) {
  return page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return {
      busy: s.busy as boolean,
      actionsLeft: s.actionsLeft as number,
      storyletUsed: s.storyletUsed as boolean,
      talked: [...s.talkedThisQuarter] as string[],
      npcCount: (s.npcs as any[]).length,
    };
  });
}

test('ESC 取消 NPC 对话：资格退还、行动点不扣、可立刻重聊', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  await enterCampus(page);
  const before = await campusScene(page);
  expect(before.npcCount, '本科春季应至少有一个在场 NPC').toBeGreaterThan(0);

  // 站到第一个 NPC 旁边（20px，远比任何地点门口近，确保 E 优先触发对话）
  const npcId = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const npc = s.npcs[0];
    s.walker.sprite.setPosition(npc.x + 20, npc.y);
    return npc.def.id as string;
  });
  await page.waitForTimeout(300);

  // 按 E 开对话
  await page.keyboard.press('e');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === true,
    null, { timeout: 5000 },
  );
  const talking = await campusScene(page);
  expect(talking.talked, '对话开始后 NPC 应被记为本季已聊').toContain(npcId);

  // ESC 取消：资格退还、行动点不扣、额度未消耗
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 5000 },
  );
  const afterEsc = await campusScene(page);
  expect(afterEsc.talked, 'ESC 后应退还"本季可聊"资格').not.toContain(npcId);
  expect(afterEsc.actionsLeft, 'ESC 不该消耗行动点').toBe(before.actionsLeft);
  expect(afterEsc.storyletUsed, 'ESC 不该占用本季 storylet 额度').toBe(false);

  // 立刻再按 E：对话应能重新打开（感叹号/可聊资格确实恢复）
  await page.keyboard.press('e');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === true,
    null, { timeout: 5000 },
  );
  const retalk = await campusScene(page);
  expect(retalk.talked, '重开对话后 NPC 应再次被记为本季已聊').toContain(npcId);

  // 收尾：ESC 退出，保持场景干净
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 5000 },
  );

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('ESC 取消 once 事件：firedEvents 标记须回滚', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  await enterCampus(page);

  // 取一个本科 once 且无小游戏的事件，直接 openEvent（绕开抽卡随机性，确定性验证回滚）
  const evId = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS
      .find((e: any) => e.stage === 'undergrad' && e.once && !e.minigame);
    if (!ev) return null;
    s.openEvent(ev);
    return ev.id as string;
  });
  expect(evId, '本科应存在 once 且无小游戏的事件').toBeTruthy();

  const opened = await campusScene(page);
  expect(opened.busy).toBe(true);
  const firedBefore = await page.evaluate(
    (id) => (window as any).game.scene.getScene('CampusScene').firedEvents.has(id),
    evId,
  );
  expect(firedBefore, 'openEvent 应已把 once 事件记入 firedEvents').toBe(true);

  const actionsBefore = opened.actionsLeft;

  // ESC 取消：once 标记撤销、行动点不扣、场景恢复可操作
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 5000 },
  );
  const afterEsc = await campusScene(page);
  const firedAfter = await page.evaluate(
    (id) => (window as any).game.scene.getScene('CampusScene').firedEvents.has(id),
    evId,
  );
  expect(firedAfter, 'ESC 后 once 标记必须撤销，否则该事件被永久屏蔽').toBe(false);
  expect(afterEsc.actionsLeft, 'ESC 不该消耗行动点').toBe(actionsBefore);
  expect(afterEsc.storyletUsed).toBe(false);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});

test('B3 链式事件：进链后 ESC 不可取消，整链只扣 1 行动点', async ({ page }) => {
  const errors: string[] = [];
  const isEnvNoise = (s: string) => /AudioContext|audio device|WebAudio/i.test(s);
  page.on('pageerror', e => { if (!isEnvNoise(String(e))) errors.push('PAGEERROR: ' + String(e)); });
  page.on('console', m => {
    if (m.type() === 'error' && !isEnvNoise(m.text())) errors.push('CONSOLE: ' + m.text());
  });

  await enterCampus(page);
  const before = await campusScene(page);

  // 直接打开 ug_guojiang_apply（本科 once，选项 1「诚实答辩」链到 ug_guojiang_result，也是 once）
  const opened = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const ev = (window as any).__mod.ev.ALL_EVENTS.find((e: any) => e.id === 'ug_guojiang_apply');
    if (!ev) return null;
    s.openEvent(ev);
    return { busy: s.busy };
  });
  expect(opened, '应存在 ug_guojiang_apply').toBeTruthy();

  // 选第 1 项进链 → 关后果弹窗 → 链卡 ug_guojiang_result 应打开
  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => {
      const s: any = (window as any).game.scene.getScene('CampusScene');
      return s.busy === true && s.currentEvent?.id === 'ug_guojiang_result';
    },
    null, { timeout: 8000 },
  );

  // 链上按 ESC：不应关闭（上游选项已提交，允许取消会白拿效果并退还费用）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const afterEsc = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return { busy: s.busy, currentId: s.currentEvent?.id ?? null };
  });
  expect(afterEsc.busy, '链式卡 ESC 不该关闭').toBe(true);
  expect(afterEsc.currentId, 'ESC 后应仍停留在链卡').toBe('ug_guojiang_result');

  // 选第 1 项完成链 → 关后果弹窗 → 场景恢复
  await page.keyboard.press('1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 8000 },
  );

  const after = await campusScene(page);
  expect(after.actionsLeft, '整条链只应扣 1 行动点').toBe(before.actionsLeft - 1);
  expect(after.storyletUsed, '完成链应占用本季 storylet 额度').toBe(true);
  const marks = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return {
      root: s.firedEvents.has('ug_guojiang_apply'),
      linked: s.firedEvents.has('ug_guojiang_result'),
      flag: (window as any).__state().flags.has('ug_guojiang_honest'),
    };
  });
  expect(marks.root, '根事件 once 标记应保留（已提交）').toBe(true);
  expect(marks.linked, '链事件 once 标记应保留（已提交）').toBe(true);
  expect(marks.flag, '根选项的 flagSet 应已生效').toBe(true);

  expect(errors, `运行时报错：\n${errors.join('\n')}`).toEqual([]);
});
