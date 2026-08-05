import type { GameEvent } from './events';

// M10 用药安全链：只呈现核对、复核、升级与沟通流程，不提供剂量、处方或个体化治疗建议。
// 医学事实审计记录见 docs/MEDICAL-FACT-AUDIT.md；人工复核完成前不得视为医学认证。
export const MEDICATION_EVENTS: GameEvent[] = [
  {
    id: 'med_reconciliation', stage: 'internship', title: '先把用药清单对上',
    body: '新收治的患者带来几份旧记录，家属说法也不完全一致。带教提醒你：先逐项核对正在使用的药物、过敏史和近期变化，再把不确定处标出来。',
    category: 'clinical', weight: 60, once: true, minTurn: 2,
    choices: [
      { text: '逐项核对来源，标出不确定项并请带教复核', delta: { clinical: 4, knowledge: 4, stamina: -6, reputation: 2 }, flagSet: 'med_reconciliation_complete', consequence: '清单终于和患者、家属及记录对上了。你把仍需确认的地方留给上级处理。' },
      { text: '先抄一份看起来最完整的记录，之后再说', delta: { clinical: -1, knowledge: -1, stamina: -2, reputation: -2 }, flagSet: 'med_reconciliation_incomplete', consequence: '你省下了当下的时间，却留下了一个没人能确认的用药缺口。' },
    ],
  },
  {
    id: 'med_indication_review', stage: 'internship', title: '抗菌药物：先问它要解决什么问题',
    body: '交班时有人建议继续使用抗菌药物。你需要把感染证据、检查结果、过敏信息和当前目标放回病程里，并请上级或药师一起复核是否仍有必要。',
    category: 'clinical', weight: 55, once: true, minTurn: 3, requireFlag: 'med_reconciliation_complete',
    requireStat: { knowledge: [40, 100], clinical: [20, 100] },
    choices: [
      { text: '说明用药目标和依据，邀请上级或药师复核后再记录', delta: { clinical: 5, knowledge: 5, relations: 2, stamina: -7 }, flagSet: 'med_indication_reviewed', consequence: '你把“已经在用”与“现在仍有指征”分开，团队也明确了下一次复评要看什么。' },
      { text: '只写“继续原方案”，把复评理由留到以后', delta: { clinical: 1, knowledge: -1, sanity: -2, reputation: -1 }, flagSet: 'med_indication_unreviewed', consequence: '带教要求你补回依据：没有复评目标，交班就无法让下一班可靠接手。' },
    ],
  },
  {
    id: 'med_indication_review_assisted', stage: 'internship', title: '带教带你复核用药指征',
    body: '你还不能独立判断这份用药是否需要继续。带教和药师把病史、过敏记录、检查结果和治疗目标逐项摆出来，让你先说出疑问，再一起确认记录边界。',
    category: 'clinical', weight: 50, once: true, minTurn: 3, requireFlag: 'med_reconciliation_complete',
    requireStat: { knowledge: [0, 39] },
    choices: [
      { text: '逐项记录疑问，跟着带教完成复核和交班', delta: { clinical: 4, knowledge: 6, relations: 3, stamina: -6 }, flagSet: 'med_indication_reviewed', consequence: '你没有跳过不会的部分，反而学会了如何把不确定性交给团队处理。' },
      { text: '只记住“继续观察”，不再追问依据', delta: { clinical: 1, knowledge: 1, sanity: -2, reputation: -1 }, flagSet: 'med_indication_unreviewed', consequence: '模板让记录看起来完整，但带教指出其中没有真正的复评依据。' },
    ],
  },
  {
    id: 'med_adverse_effect_escalation', stage: 'guipei', title: '怀疑不良反应时先升级',
    body: '患者出现一个需要关注的新变化，时间上与用药调整相近，但原因还不能凭直觉确定。你需要记录变化、保留时间线，并及时告知上级和药师。',
    category: 'clinical', weight: 55, once: true, minTurn: 1, requireFlag: 'med_indication_reviewed',
    choices: [
      { text: '记录发生时间和表现，立即请上级与药师共同评估', delta: { clinical: 5, knowledge: 4, relations: 3, stamina: -6, reputation: 2 }, flagSet: 'med_safety_escalated', consequence: '团队先把患者安全放在前面，再讨论可能原因和后续观察。' },
      { text: '先把变化归因于原病，等它自己过去', delta: { clinical: -1, knowledge: -1, sanity: -3, reputation: -2 }, flagSet: 'med_safety_minimized', consequence: '复盘时大家指出：怀疑不良反应不等于已经确定原因，但不能因此跳过上报和评估。' },
    ],
  },
  {
    id: 'med_discharge_teachback', stage: 'guipei', title: '出院前让患者把计划说回来',
    body: '患者准备出院，家属对药盒和复诊安排有些混淆。你需要使用医院批准的用药清单，说明何时联系团队，并请患者用自己的话复述重点。',
    category: 'clinical', weight: 50, once: true, minTurn: 2, requireFlag: 'med_safety_escalated',
    choices: [
      { text: '按清单逐项确认，让患者复述重点并留下求助路径', delta: { clinical: 4, knowledge: 3, relations: 4, reputation: 2, stamina: -5 }, flagSet: 'med_teachback_done', consequence: '患者说出了自己理解的计划，你也发现并纠正了一个沟通误会。' },
      { text: '把纸单递过去，只问一句“听懂了吗”', delta: { clinical: 0, knowledge: 0, relations: -2, reputation: -1, sanity: -1 }, flagSet: 'med_teachback_rushed', consequence: '患者点头并不代表理解。你把这次沟通缺口记入复盘，准备下次用复述确认。' },
    ],
  },
  {
    id: 'med_reconciliation_echo', stage: 'guipei', title: '那张没对上的用药清单',
    body: '交班复盘时，带教把旧记录和患者实际使用情况逐项摊开。你意识到“看起来完整”不等于已经完成用药核对。',
    category: 'clinical', weight: 45, once: true, minTurn: 1, requireFlag: 'med_reconciliation_incomplete',
    choices: [{ text: '补齐来源、过敏史和不确定项，再请团队复核', delta: { knowledge: 4, clinical: 4, reputation: 1 }, consequence: '你把核对过程写进了自己的交班清单。' }],
  },
  {
    id: 'med_indication_echo', stage: 'guipei', title: '“继续原方案”不是复评',
    body: '下一次查房时，带教要求你补写用药目标、证据和复评节点。你开始把药物名称之外的临床问题也写进记录。',
    category: 'clinical', weight: 45, once: true, minTurn: 1, requireFlag: 'med_indication_unreviewed',
    choices: [{ text: '补充目标和复评依据，接受上级或药师复核', delta: { knowledge: 4, clinical: 4, reputation: 1 }, consequence: '记录不再只是“做了什么”，也说明了为什么这样做、何时重新判断。' }],
  },
  {
    id: 'med_adverse_effect_echo', stage: 'career', title: '别把新变化一笔带过',
    body: '科室安全会上复盘那次用药事件：不能因为还没证明因果，就忽略时间线、记录和升级路径。',
    category: 'clinical', weight: 40, once: true, minTurn: 2, requireFlag: 'med_safety_minimized',
    choices: [{ text: '把疑似不良反应纳入团队复盘和培训', delta: { knowledge: 4, clinical: 3, reputation: 2 }, consequence: '你学会了在“不确定”时也先保护患者并留下可追溯的信息。' }],
  },
  {
    id: 'med_teachback_echo', stage: 'career', title: '患者能复述，交接才算完成',
    body: '几个月后，你在带新人时再次听到“患者说听懂了”。你让新人请患者复述关键安排，并确认求助路径是否清楚。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'med_teachback_done',
    choices: [{ text: '把复述确认作为每次交接的固定一步', delta: { clinical: 3, relations: 3, reputation: 2 }, consequence: '沟通从一句“听懂了吗”变成了可以观察、可以纠正的过程。' }],
  },
  {
    id: 'med_teachback_rushed_echo', stage: 'career', title: '点头不等于理解',
    body: '一次随访电话里，患者对出院清单的理解出现偏差。你回想起那次仓促交代，开始把复述确认当成安全检查的一部分。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'med_teachback_rushed',
    choices: [{ text: '重做沟通流程，确认患者知道何时向团队求助', delta: { clinical: 3, relations: 3, reputation: 1 }, consequence: '你把沟通缺口变成了下一次交班时要检查的项目。' }],
  },
];
