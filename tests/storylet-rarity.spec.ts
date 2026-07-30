import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 回归测试：可行走场景按地点做分类切片后，池子会从整阶段的一万多权重骤降到一两百。
// 若直接在切片内加权抽取，w=4 的「母亲走了」会从 0.03% 飙到 3%——大一新生第一周
// 就丧母。turnFlow.drawStorylet 用"稀有事件按整阶段池占比独立掷骰"来消除这个放大，
// 本测试守住该行为。

const BASE = 'http://127.0.0.1:5173/';

async function waitForScene(page: Page, key: string, timeout = 60000) {
  await page.waitForFunction(
    (k) => ((window as any).game?.scene?.getScenes(true) ?? []).some((s: any) => s.sys.settings.key === k),
    key, { timeout },
  );
}

// 蒙特卡洛验证：分类切片后，稀有的家人离世事件是否仍保持"整阶段偶尔一次"的稀有度。
test('稀有事件在分类切片下不被放大', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => (document.getElementById('title-start') as HTMLButtonElement)?.click());
  await waitForScene(page, 'GaokaoScene');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
  await waitForScene(page, 'CampusScene');

  const result = await page.evaluate(async () => {
    const { tf } = (window as any).__mod;
    const { cm } = (window as any).__mod;
    const N = 4000;
    const out: Record<string, { tragic: number; null: number; sample: string[] }> = {};
    for (const spot of cm.CAMPUS_SPOTS) {
      let tragic = 0, nulls = 0;
      const seen = new Set<string>();
      for (let i = 0; i < N; i++) {
        const ev = tf.drawStorylet('undergrad', new Set<string>(), spot.categories);
        if (!ev) { nulls++; continue; }
        seen.add(ev.id);
        if (/life_death|life_family_ill/.test(ev.id)) tragic++;
      }
      out[spot.id] = { tragic: +(100 * tragic / N).toFixed(2), null: nulls, sample: [...seen].slice(0, 5) };
    }
    return out;
  });

  console.log('每次抽取出现家人病故/离世的百分比:', JSON.stringify(result, null, 1));

  // 卡片模式下这些事件在整阶段池（约 15000 权重）里合计约 0.11%。
  // 切片后应保持同量级，绝不能回到修复前 dorm 12.8% 的水平。
  for (const [id, r] of Object.entries(result)) {
    expect(r.tragic, `${id} 的家人变故概率被放大到 ${r.tragic}%`).toBeLessThan(1.5);
  }
});
