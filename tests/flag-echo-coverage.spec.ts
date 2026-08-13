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
  'ug_baoyan_intent', 'ug_choose_guipei_after_no_exam',
  'kaoyan_adjusted', 'kaoyan_fail_to_work', 'kaoyan_repeater_iv_fail',
  'ug_thesis_secured', 'ug_thesis_kaoyan_crunch', 'ug_thesis_job_crunch',
  // 硕博：研究状态标记
  'phd_team', 'phd_ok', 'phd_persist', 'phd_settle', 'phd_independent', 'phd_network', 'phd_delay',
  'will_phd', 'topic_hot', 'mt_skill_certified', 'mt_grant_won', 'long_sys_stayed_after_exit_offer',
  'phd_target_top_advisor', 'phd_target_home_advisor', 'phd_reapply', 'phd_second_choice',
  'ms_thesis_secured', 'ms_thesis_phd_crunch', 'ms_thesis_job_crunch',
  'phd_dissertation_secured', 'phd_dissertation_job_crunch', 'phd_dissertation_referral_crunch',
  // 求职：选择了哪条线（地区/编制主 flag 已由 economy + CAREER_ROUTE_EVENTS 消费）
  'signed', 'took_hospital_b', 'jh_chase_bianzhi',
  'jh_platform', 'jh_phd_apply', 'jh_research_platform', 'jh_clinical_ace', 'jh_dual_role',
  'jh_referral_in', 'jh_fake_confessed', 'jh_fake_gambled', 'jh_hid_ug_fake', 'jh_disclosed_ug_fake',
  'go_guipei', 'jh_cdc', 'city_tier1',
  // 职业路线/雇佣事件终端标记（有回声或经济后果的已不在此列）
  'route_sanjia_rushed', 'route_city_platform_push', 'route_city_platform_steady',
  'route_grass_rushed', 'route_private_kpi_push', 'route_public_applied', 'route_public_favor',
  'emp_bianzhi_craft', 'emp_bianzhi_quiet', 'emp_contract_negotiated', 'emp_contract_rushed',
  'emp_out_reframed', 'emp_out_retry', 'comp_time_used', 'comp_time_banked', 'sick_leave_pushed',
  // M11 诉讼长尾终端标记
  'appraisal_win_taught', 'appraisal_win_quiet', 'appraisal_lose_reformed', 'appraisal_lose_defensive',
  'lawsuit_shadow_talked', 'lawsuit_shadow_buried', 'second_appeal_done',
  // 住院总一年：婉拒/半年节点/结业为叙事终点（任期内 flag 由 requireFlag 消费）
  'chief_declined', 'chief_mid_done', 'chief_graduated',
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
  // headnurse_repaired / fellow_repaired 由 after_repair requireFlag 消费，不进白名单
  'guide_qe_walk', // 行走场景首次 Q/E 引导，纯 UI
  // R8 家庭链终端标记（修复完成/关系落定/子女入学，叙事终点无后续消费）
  'family_anchored', 'family_repaired', 'spouse_reconciled', 'marriage_cold', 'child_in_medschool',
  // 时代3规培/硕博并轨：阶段选择与阶段收束标记，数值后果已由 effect/state 承接。
  'confident_resident', 'humble_resident', 'quiet_resident',
  'era3_independent_shift', 'era3_asks_for_help', 'era3_shift_rushed',
  'era3_dual_identity_plan', 'era3_overpromised', 'era3_set_boundary',
  'era3_budgeted', 'era3_bought_dinner', 'era3_income_shock',
  'era3_prioritized_safety', 'apologized_complaint', 'explained_complaint',
  'broke_down_complaint', 'era3_clinical_first', 'era3_research_first',
  'era3_replanned', 'era3_deadline_grind', 'era3_deadline_negotiated',
  'era3_peer_support', 'era3_patient_thanks', 'ignored_peer_pressure',
  'calculated_escape', 'era3_peer_opened_up', 'era3_midterm_taken',
  'era3_midterm_prepared', 'era3_ambitious_submission', 'era3_safe_submission',
  'era3_exam_first', 'era3_paper_first', 'era3_balanced_deadlines',
  'era3_sought_support', 'era3_family_support', 'era3_completion_taken',
  'era3_completion_prepared', 'no_regret_residency', 'mixed_feelings_residency',
  'relieved_to_leave', 'era3_decision_supported', 'era3_near_miss_reported',
  'era3_near_miss_hidden', 'era3_safety_stop',
  // 健康/家庭/政策/法律：系统数值已落地，flag 仅保留当次叙事选择。
  'health_conscious_early', 'health_checkup_managed', 'health_medication_plan',
  'ignored_checkup', 'era6_passed_baton_in_or', 'era6_hid_tremor',
  'health_collapse_recovered', 'health_changed_role', 'health_transferred_role',
  'retirement_active_health', 'retirement_part_time', 'family_paid_tuition',
  'directed_medical_track', 'refused_improper_benefit', 'reported_improper_benefit',
  'accepted_improper_benefit', 'policy_knows_exception', 'policy_refined_pathway',
  'policy_used_exception', 'policy_reported_adverse', 'policy_appealed_cut',
  'policy_cut_needed_care', 'sunshine_consult', 'private_consult_cash',
  'policy_inspection_cooperated', 'policy_self_corrected', 'policy_clawback_paid',
  'policy_clawback_appealed', 'policy_clawback_disputed', 'legal_consent_explained',
  'legal_consent_formal_only', 'legal_consent_inadequate', 'legal_record_trained',
  'legal_refusal_documented', 'legal_refusal_brief', 'legal_admin_resolved',
  'legal_admin_review', 'legal_admin_obstructed', 'legal_retirement_answered',
  'legal_retirement_supported', 'legal_retirement_settled',
  // 时代6-8归途：人生回顾和终局选择记录，结局读取 lateLife/health/spirit 等状态。
  'era6_mentor_path', 'era6_academic_peak', 'era6_institutional_legacy',
  'era6_last_round_taught', 'era6_successor_tested', 'era6_system_successor',
  'era6_no_successor', 'era7_accepted_retirement', 'era7_rehired',
  'era7_cannot_leave', 'era7_memoir_complete', 'era7_notes_to_students',
  'era7_reconnected', 'era8_writing', 'era8_photos_sorted',
  // R13 诚信薄路径：分支结果由 endings/integrity 消费主 flag；细节标记纯叙事
  'title_paper_padded', 'title_paper_gifted', 'title_paper_refused',
  'dept_scandal_cooperated', 'gift_authorship_kept', 'gift_authorship_denied',
  'dept_scandal_cleared', 'fraud_quiet_lived', 'fraud_self_cleaned',
  'era6_crisis_covered', 'era6_crisis_delegated', 'era6_crisis_escalated',
  'era7_identity_soft', 'era7_identity_clung', 'era7_identity_quiet',
  'er_rotation_done', 'ward_rotation_done',
  'era8_family_called', 'era8_records_donated', 'era8_records_kept',
  'era8_records_destroyed', 'era8_returned_department', 'era8_returned_first_ward',
  'era8_sat_outside', 'era8_last_person_met', 'era8_last_letter',
  'era8_accepted_regret', 'era8_will_balanced', 'era8_will_family',
  'era8_will_medicine', 'era8_will_simple', 'era8_student_remembered',
  // 模块5-12：跨系统事件的叙事终点，实际后果由 research/family/love/public/leisure/spirit 状态承担。
  'research_clinical_reform', 'lifelong_family_regret', 'secret_department_romance',
  'love_emotional_affair', 'public_hidden_commercial_deal', 'kept_humanity',
  'shadow_feidao', 'retirement_syndrome',
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
