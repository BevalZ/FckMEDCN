import type { GameEvent } from './events';

// M10 首条诊断链：检查单 → 报告/鉴别诊断 → 复查交班。
// 只描述流程与风险沟通，不给出现实处方剂量；医学事实审计记录见 docs/MEDICAL-FACT-AUDIT.md。
export const DIAGNOSTIC_EVENTS: GameEvent[] = [
  {
    id: 'diagnostic_workup', stage: 'internship', title: '胸闷患者的第一张检查单',
    body: '门诊来了位胸闷患者。你先核对生命体征和病史，再决定把哪些信息写进检查申请，并请带教一起看。',
    category: 'clinical', weight: 65, once: true, minTurn: 2,
    choices: [
      { text: '先核对生命体征，按流程申请必要检查并请上级复核', delta: { clinical: 5, knowledge: 4, stamina: -6, reputation: 2 }, flagSet: 'diagnostic_triage_ok', consequence: '检查单不是答案。你把症状、风险和检查目的写清楚，带教点头让你继续。' },
      { text: '凭经验勾几项检查，先让患者等报告', delta: { clinical: 1, knowledge: -1, stamina: -2, reputation: -2 }, flagSet: 'diagnostic_triage_shortcut', consequence: '你省下了几分钟，却没把为什么查、下一步看什么说清楚。' },
    ],
  },
  {
    id: 'diagnostic_report_review', stage: 'internship', title: '把报告放回鉴别诊断里',
    body: '化验和影像报告回来了。一个异常值很醒目，但它不能自动等同于某个诊断。你和带教把症状、查体和报告放在一起讨论。',
    category: 'clinical', weight: 60, once: true, minTurn: 3, requireFlag: 'diagnostic_triage_ok',
    requireStat: { knowledge: [40, 100], clinical: [20, 100] },
    choices: [
      { text: '列出鉴别诊断，说明还缺什么证据，再请上级复核', delta: { clinical: 5, knowledge: 5, relations: 2, stamina: -7 }, flagSet: 'diagnostic_differential_done', consequence: '你学会了把“看到异常”与“得出结论”分开，带教补上了下一步验证。' },
      { text: '抓住最醒目的异常，先按一个方向解释', delta: { clinical: 2, knowledge: 1, sanity: -3, reputation: -1 }, flagSet: 'diagnostic_differential_rushed', consequence: '讨论被上级叫停：还没有足够证据，不能把单个异常写成最终诊断。' },
    ],
  },
  {
    id: 'diagnostic_report_review_assisted', stage: 'internship', title: '带教带你逐项读报告',
    body: '你对报告的把握还不够。带教没有替你下结论，而是带你重新核对症状、检查目的和需要排除的危险情况。',
    category: 'clinical', weight: 55, once: true, minTurn: 3, requireFlag: 'diagnostic_triage_ok',
    requireStat: { knowledge: [0, 39] },
    choices: [
      { text: '把疑问逐条记下，和带教一起形成鉴别清单', delta: { clinical: 4, knowledge: 6, relations: 3, stamina: -6 }, flagSet: 'diagnostic_differential_done', consequence: '你没有假装已经会了，反而把每一步为什么做记得更牢。' },
      { text: '点头记住结论，先照着模板写', delta: { clinical: 1, knowledge: 1, sanity: -2, reputation: -1 }, flagSet: 'diagnostic_differential_rushed', consequence: '模板帮你交上了记录，但你知道自己还没真正掌握鉴别过程。' },
    ],
  },
  {
    id: 'diagnostic_followup', stage: 'guipei', title: '把复查计划交给下一班',
    body: '几周后患者回来复查。你需要把上次的检查结果、仍需观察的变化和何时复诊写进交班，并确认患者听懂了。',
    category: 'clinical', weight: 55, once: true, minTurn: 1, requireFlag: 'diagnostic_differential_done',
    choices: [
      { text: '写清复查节点、需要警惕的变化和求助路径', delta: { clinical: 4, knowledge: 3, relations: 4, reputation: 2, stamina: -5 }, consequence: '交班记录让下一班接得上，患者也知道什么时候该回来。' },
      { text: '只说“有问题再来”，把细节留给下一班', delta: { clinical: 1, relations: -2, reputation: -2, sanity: -2 }, consequence: '患者点了头，却没有真正理解下一步；你把这次沟通记进复盘。' },
    ],
  },
  {
    id: 'diagnostic_shortcut_echo', stage: 'guipei', title: '那张检查单留下的课',
    body: '带教把你当初的检查单拿出来复盘：检查不是越多越好，先问清楚要回答什么问题，才知道报告该怎么读。',
    category: 'clinical', weight: 45, once: true, minTurn: 2, requireFlag: 'diagnostic_triage_shortcut',
    choices: [{ text: '重新学习检查目的和报告结构', delta: { knowledge: 5, clinical: 3, sanity: 2 }, consequence: '你把这张单子贴在了笔记本第一页。' }],
  },
  {
    id: 'diagnostic_rushed_echo', stage: 'guipei', title: '鉴别诊断不能靠一个醒目数字',
    body: '复盘会上，带教让你把当时遗漏的可能性重新列一遍。你开始习惯在结论旁边写下证据和不确定性。',
    category: 'clinical', weight: 45, once: true, minTurn: 2, requireFlag: 'diagnostic_differential_rushed',
    choices: [{ text: '补齐鉴别清单，接受上级复核', delta: { knowledge: 4, clinical: 4, reputation: 1 }, consequence: '不确定性写出来，反而让交班更可靠。' }],
  },
];
