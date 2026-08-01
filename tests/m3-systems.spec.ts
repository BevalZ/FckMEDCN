import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// M3 三大系统的行为验证：
//   1. 造假风险引擎的概率分布（小造假可赌、大造假必爆、严重等级可达）
//   2. 临床/科研双线确实互相消耗（事件里一升一降）
//   3. NPC 好感度可变化、跨阈值打 flag、每季只能聊一次

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 120000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

async function enterCampus(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => (window as any).game.scene.getScene('CampusScene').busy === false,
    null, { timeout: 10000 },
  );
}

test('造假风险：小造假可赌，大造假几乎必爆', async ({ page }) => {
  await enterCampus(page);

  const result = await page.evaluate(async () => {
    const { ig } = (window as any).__mod;
    const { gs } = (window as any).__mod;
    const { stats: st } = (window as any).__mod;

    // 每种造假强度跑 N 局 × 60 季（约 15 年，覆盖硕博到职业中期）
    const N = 3000, QUARTERS = 60;
    const scenarios: Record<string, Array<'minor' | 'moderate' | 'severe'>> = {
      '一次小造假': ['minor'],
      '一次重造假': ['severe'],
      '五次混合': ['moderate', 'moderate', 'severe', 'minor', 'minor'],
      '从不造假': [],
    };

    const out: Record<string, any> = {};
    for (const [name, fakes] of Object.entries(scenarios)) {
      let caught = 0;
      const levels: Record<string, number> = { warning: 0, retraction: 0, ruin: 0 };
      for (let i = 0; i < N; i++) {
        gs.resetGame();
        gs.patchState({ stats: st.createDefaultStats() });
        fakes.forEach((f, k) => { if (k < 3) ig.addFakeRisk(f); });
        // 剩余的造假分散在中期
        let worst: string | null = null;
        for (let q = 0; q < QUARTERS; q++) {
          if (q === 8 && fakes[3]) ig.addFakeRisk(fakes[3]);
          if (q === 14 && fakes[4]) ig.addFakeRisk(fakes[4]);
          const r = ig.rollIntegrity();
          if (r.level !== 'none') {
            if (r.level === 'ruin' || (r.level === 'retraction' && worst !== 'ruin') || !worst) worst = r.level;
          }
        }
        if (worst) { caught++; levels[worst]++; }
      }
      out[name] = { 被查率: +(100 * caught / N).toFixed(1), 最重等级分布: levels };
    }
    return out;
  });

  console.log('造假风险引擎（每种 3000 局 × 60 季）:');
  for (const [k, v] of Object.entries(result as Record<string, any>)) {
    console.log(`  ${k.padEnd(10)} 被查 ${String(v.被查率).padStart(5)}%  ${JSON.stringify(v.最重等级分布)}`);
  }

  const r = result as Record<string, any>;
  expect(r['从不造假'].被查率, '没造假不该被查').toBe(0);
  // 小造假是一场真实的赌博：既不能必被查，也不能形同无事
  expect(r['一次小造假'].被查率).toBeGreaterThan(5);
  expect(r['一次小造假'].被查率).toBeLessThan(45);
  // 大量造假几乎必爆，且能达到最重等级
  expect(r['五次混合'].被查率).toBeGreaterThan(85);
  expect(r['五次混合'].最重等级分布.ruin, '重度造假应能触发最重等级').toBeGreaterThan(0);
  // 造得越多越危险
  expect(r['五次混合'].被查率).toBeGreaterThan(r['一次小造假'].被查率);
});

test('双线：事件确实让临床与科研此消彼长', async ({ page }) => {
  await enterCampus(page);

  const report = await page.evaluate(async () => {
    const { ev } = (window as any).__mod;
    const dual = ev.ALL_EVENTS.filter((e: any) => e.id.startsWith('dt_'));

    let opposing = 0, both = 0;
    const samples: string[] = [];
    for (const e of dual) {
      for (const c of e.choices) {
        const cl = c.delta?.clinical ?? 0;
        const rs = c.delta?.research ?? 0;
        if (cl * rs < 0) {
          opposing++;
          if (samples.length < 4) samples.push(`${e.id}: 临床${cl > 0 ? '+' : ''}${cl} 科研${rs > 0 ? '+' : ''}${rs}`);
        }
        if (cl !== 0 && rs !== 0) both++;
      }
    }
    // 造假选项是否都接了风险引擎
    const fakeChoices = ev.ALL_EVENTS.flatMap((e: any) =>
      e.choices.filter((c: any) => c.effect?.kind === 'fake').map((c: any) => e.id));
    return { total: dual.length, opposing, both, samples, fakeCount: fakeChoices.length, fakeEvents: [...new Set(fakeChoices)] };
  });

  console.log(`双线事件 ${report.total} 个；此消彼长的选项 ${report.opposing} 个，同时影响两轴 ${report.both} 个`);
  report.samples.forEach((s: string) => console.log('  ', s));
  console.log(`接入风险引擎的造假选项 ${report.fakeCount} 个:`, report.fakeEvents);

  expect(report.opposing, '应存在明确此消彼长的选项').toBeGreaterThan(4);
  expect(report.fakeCount, '造假选项必须接入风险引擎').toBeGreaterThan(3);
});

test('NPC：好感度可变、跨阈值打 flag、每季限聊一次', async ({ page }) => {
  await enterCampus(page);

  const placed = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    return s.npcs.map((n: any) => n.def.id);
  });
  console.log('本季在场 NPC:', placed);
  expect(placed.length, '本科场景应有 NPC 在场').toBeGreaterThan(0);

  const aff = await page.evaluate(async () => {
    const { npc } = (window as any).__mod;
    const { gs } = (window as any).__mod;
    const before = npc.getAffinity('roommate');
    npc.changeAffinity('roommate', 40); // 推过信任线
    const trusted = gs.hasFlag('trust_roommate');
    const after = npc.getAffinity('roommate');
    npc.changeAffinity('roommate', -95); // 压到疏远线
    const distant = gs.hasFlag('distant_roommate');
    return { before, after, trusted, distant, floor: npc.getAffinity('roommate') };
  });
  console.log('好感度:', JSON.stringify(aff));
  expect(aff.after).toBeGreaterThan(aff.before);
  expect(aff.trusted, '跨过信任线应打 trust_ flag').toBeTruthy();
  expect(aff.distant, '跌破疏远线应打 distant_ flag').toBeTruthy();
  expect(aff.floor, '好感度不应为负').toBeGreaterThanOrEqual(0);

  // 每季限聊一次
  const twice = await page.evaluate(() => {
    const s: any = (window as any).game.scene.getScene('CampusScene');
    const n = s.npcs[0];
    s.talkedThisQuarter.clear();
    s.talkTo(n);
    const firstOpened = s.busy;
    s.busy = false;
    s.talkTo(n);       // 同季第二次：应被拒绝，不再开卡
    return { firstOpened, secondOpened: s.busy };
  });
  expect(twice.firstOpened, '首次对话应打开对话卡').toBeTruthy();
  expect(twice.secondOpened, '同季第二次对话应被拒绝').toBeFalsy();
});
