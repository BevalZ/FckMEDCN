import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// 新闻回声回归：里程碑事件必须配 newsTickerAfter（玩家的人生节点要在新闻栏里"回响"）。
// 防止后续编辑时漏配导致回声消失。

const BASE = 'http://127.0.0.1:5173/';

const MILESTONES: Array<[string, string]> = [
  ['postgrad_kaoyan_vs_baoyan', '考研/保研抉择'],
  ['ug_scholarship_notice', '奖学金评定'],
  ['ug_guojiang_result', '国奖公示'],
  ['promote_fugao', '副高晋升'],
  ['promote_zhenggao', '正高冲刺'],
  ['life_marry', '结婚'],
  ['life_childbirth', '生子'],
  ['m2_gp_quit_confirm', '规培退培'],
  ['dt_after_ruin', '学术不端通报之后'],
];

test('里程碑事件均配置新闻回声', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });

  const report = await page.evaluate((ids) => {
    const { ev } = (window as any).__mod;
    return ids.map(([id, label]) => {
      const e = ev.ALL_EVENTS.find((x: any) => x.id === id);
      return { id, label, found: !!e, echo: e?.newsTickerAfter ?? '' };
    });
  }, MILESTONES);

  for (const r of report) {
    console.log(`  ${r.found && r.echo ? '✓' : '✗'} ${r.label}（${r.id}）：${r.echo || '缺少回声'}`);
    expect(r.found, `${r.id} 事件不存在`).toBe(true);
    expect(r.echo, `${r.label}（${r.id}）缺少 newsTickerAfter`).not.toBe('');
  }
});
