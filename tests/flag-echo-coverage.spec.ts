import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 死 flag 回归（深挖第五部分 R24 / OPTIMIZATION-ROADMAP R1 / known-issues B5）：
// 每个 flagSet 设置的 flag 必须至少有一个消费者——requireFlag / hasFlag('x') /
// flags.has('x') / 结局判定 flag: 'x' / 徽章 badge / 任务 quest。
// 叙事纯记录 flag（只标记"经历过"、不改状态的）进 narrativeOnly 白名单，不视为死。
//
// 消费者分两路收集：
//  1) 浏览器侧：从 __mod.ev.ALL_EVENTS 收集 flagSet 设置方 + requireFlag 消费方（真实模块）；
//  2) Node 侧：用 fs 读 src 源码，收集 hasFlag('x') / flags.has('x') / flag: 'x' 消费方
//     （endings/badges/quests/scenes 里不在事件池中的消费）。
// 两路合并后，flag 同时满足 setter>0 且 (consumer>0 或 narrativeOnly) 才算活着。

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:5173/';

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 30000 });
}

/** 从 src 全部 .ts 源码收集"非事件池"的 flag 消费者（hasFlag/flags.has/flag:）。 */
function sourceConsumers(): Set<string> {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.ts')) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  const all = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const out = new Set<string>();
  // hasFlag('x') / flags.has('x') / has("x") / hasFlag("x") / flags.has("x")
  for (const m of all.matchAll(/hasFlag\(\s*['"]([^'"]+)['"]\s*\)/g)) out.add(m[1]);
  for (const m of all.matchAll(/flags\.has\(\s*['"]([^'"]+)['"]\s*\)/g)) out.add(m[1]);
  // badges.ts 用本地助手 has('x') 判断（const has = (flag) => st().flags.has(flag)）
  for (const m of all.matchAll(/\bhas\(\s*['"]([^'"]+)['"]\s*\)/g)) out.add(m[1]);
  // ending/badge/quest 数据里的 flag: 'x'
  for (const m of all.matchAll(/\bflag\s*:\s*['"]([^'"]+)['"]/g)) out.add(m[1]);
  return out;
}

// 叙事纯记录 flag 白名单：只标记"我经历过这件事"，不需要后续系统消费。
// 注意：新增事件用到的 flag 若只记录经历、不产生后果，必须列在这里，
// 否则该事件会拖垮本回归——这本身就是设计约束的体现。
const NARRATIVE_ONLY = new Set([
  // 本科：选择了某个路径（后续由分支链内其他事件承接，本身无需回响）
  'ug_quiet', 'ug_research', 'ug_kaoyan_pass', 'ug_got_scholarship', 'ug_tutoring',
  'ug_lab_helper', 'ug_insured', 'ug_career_aware', 'ug_met_alumni', 'ug_double_major',
  'ug_volunteered', 'ug_peer_support', 'ug_sought_help', 'ug_guojiang_withdrew',
  'ug_baoyan_grind', 'ug_whistleblower_anon', 'ug_reported_bullying', 'ug_confronted',
  'ug_barely_passed', 'ug_stayed_after_urge', 'ug_class_rep', 'ug_exchange', 'ug_chongzhan',
  'ug_saw_violence_news', 'ug_tuition_waiver', 'ug_fake_cleaned',
  // 硕博：研究状态标记
  'phd_team', 'phd_ok', 'phd_persist', 'phd_settle', 'phd_independent', 'phd_network', 'phd_delay',
  'will_phd', 'topic_hot', 'mt_skill_certified', 'mt_grant_won',
  // 求职：选择了哪条线（由 offer_* / took_* 等后续承接）
  'signed', 'took_hospital_a', 'took_hospital_b', 'took_public', 'offer_sanjia', 'jh_chase_bianzhi',
  'jh_platform', 'jh_phd_apply', 'jh_research_platform', 'jh_clinical_ace', 'jh_dual_role',
  'jh_referral_in', 'jh_fake_confessed', 'jh_fake_gambled', 'jh_hid_ug_fake', 'jh_disclosed_ug_fake',
  'contract', 'go_guipei', 'jh_cdc', 'city_tier1', 'jh_bianzhi_in', 'jh_bianzhi_out',
  // 职业：应对方式标记（后续有回声链但非 must-have）
  'dispute_happened', 'picked_side', 'multi_site', 'internet_doc', 'burnout_seen',
  'bought_house', 'fin_appealed', 'led_project', 'admin_trained', 'admin_drilled', 'admin_covered',
  'ca_endure', 'ca_principled', 'ca_guarded', 'ca_silenced', 'ca_speak', 'ca_defensive',
  'ca_trust', 'ca_health', 'ca_ignore', 'ca_settle', 'ca_fuhe_ok', 'ca_rested', 'ca_got_help',
  'dt_grant_focus', 'dt_real_question', 'dt_evidence_win', 'dt_dual_pillar', 'dt_owned_gap',
  'dt_reported_null', 'dt_bought_paper', 'dt_refused_mill', 'dt_gift_author', 'dt_fake_then_real',
  'dt_lied_to_student', 'dt_warned_student', 'dt_back_to_bedside',
  'career_covered_up', 'proved_himself', 'spoke_up_finally', 'gp_nurse_ally', 'gp_commute',
  'gp_vented', 'gp_tonggang_no', 'gp_suicide_seen', 'gp_health_aware', 'gp_ignore_health',
  // 职业暴露/飞检链的终端结果标记（flycheck_ok/needlestick_cleared 由徽章消费，不放这）
  'needlestick_anxious', 'flycheck_fined', 'flycheck_reformed', 'flycheck_resisted', 'flycheck_mentor',
  // 病历质量链的终端标记
  'record_fixed', 'record_owned', 'record_sloppy_exposed',
  // 留级走出后的终端标记：解除每季心理负担由 holdbackSanityPenalty 消费，但源码用变量引用，死 flag 检测看不到
  'ug_holdback_recovered', 'ms_holdback_recovered', 'phd_holdback_recovered',
  // 导师/关系
  'got_advisor_letter', 'considering_switch_advisor', 'advisor_career_boost',
  // 个人经历标记
  'overwork_aware', 'conflict_prone', 'in_couple', 'exp_failed',
  // NPC 好感度事件分支标记（修复关系/接受内推等叙事结果）
  'roommate_repaired', 'senior_referral', 'senior_repaired', 'teacher_repaired', 'counselor_repaired',
]);

test('死 flag 回归：每个 flag 都有消费者（或叙事白名单）', async ({ page }) => {
  await boot(page);

  const srcConsumers = [...sourceConsumers()];
  const report = await page.evaluate(({ srcConsumers, whiteList }) => {
    const { ev } = (window as any).__mod;
    const all: any[] = ev.ALL_EVENTS;

    // 事件内 setter（choice.flagSet）与 consumer（ev.requireFlag）
    const setBy = new Set<string>();
    const requiredBy = new Set<string>();
    for (const e of all) {
      if (e.requireFlag) requiredBy.add(e.requireFlag);
      if (e.excludeFlag) requiredBy.add(e.excludeFlag); // 排除标记也是对 flag 的消费
      for (const c of e.choices ?? []) if (c.flagSet) setBy.add(c.flagSet);
    }
    // 合并源码级消费者（hasFlag/flags.has/ending/badge/quest 的 flag:）
    const consumers = new Set<string>([...requiredBy, ...srcConsumers]);

    const DYNAMIC_PREFIX = ['trust_', 'distant_', 'school_tier_', 'enrolled_', 'track_', 'seen_', 'applied_', 'met_'];
    const narrative = new Set(whiteList);

    const dead: string[] = [];
    for (const f of setBy) {
      if (consumers.has(f)) continue;
      if (narrative.has(f)) continue;
      if (DYNAMIC_PREFIX.some(p => f.startsWith(p))) continue;
      dead.push(f);
    }
    return { setterCount: setBy.size, requiredCount: requiredBy.size, srcConsumerCount: consumers.size, dead };
  }, { srcConsumers, whiteList: [...NARRATIVE_ONLY] });

  console.log(`flagSet 唯一 ${report.setterCount} | 事件内 requireFlag ${report.requiredCount} | 含源码消费者 ${report.srcConsumerCount}`);
  console.log('死 flag（无消费者且不在叙事白名单）:');
  for (const f of report.dead) console.log('  ' + f);

  // 死 flag 应清零（这是硬约束：任何 flagSet 必须有消费者，否则"选择要回响"原则失效）。
  expect(report.dead, `死 flag 应清零，当前 ${report.dead.length} 个`).toEqual([]);
});
