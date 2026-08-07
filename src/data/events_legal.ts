import type { GameEvent } from './events';

export const LEGAL_EVENTS: GameEvent[] = [
  {
    id: 'legal_first_informed_consent', stage: 'guipei', title: '第一次签知情同意书',
    body: '带教老师把手术知情同意书推到你面前。签字不是免责符，它记录的是患者是否真正理解风险、替代方案和不治疗的后果。',
    category: 'clinical', weight: 100, minTurn: 1, maxTurn: 3, once: true,
    choices: [
      { text: '逐项解释，确认理解后再签字', delta: { stamina: -6, clinical: 2, relations: 3 }, flagSet: 'legal_consent_explained', effect: [{ kind: 'changeLegal', field: 'recordDefense', amount: 10 }, { kind: 'changeLegal', field: 'communicationRecord', amount: 15 }], consequence: '你多花了时间，也留下了真实沟通的记录。' },
      { text: '按表格快速读完，让家属签字', delta: { stamina: -2 }, flagSet: 'legal_consent_formal_only', effect: { kind: 'changeLegal', field: 'communicationRecord', amount: -3 }, consequence: '纸面齐全，理解程度却没有被确认。' },
      { text: '只指签字位置，赶去下一项工作', delta: { stamina: 1, relations: -3 }, flagSet: 'legal_consent_inadequate', effect: [{ kind: 'changeLegal', field: 'legalRisk', amount: 10 }, { kind: 'changeLegal', field: 'recordDefense', amount: -8 }], consequence: '流程完成得很快，风险没有被真正说明。' },
    ],
  },
  {
    id: 'legal_record_training', stage: 'guipei', title: '病历书写培训',
    body: '培训老师说：“病历首先服务连续诊疗，同时也是证据。写得好不保证没有纠纷，写得差会让事实无法被还原。”',
    category: 'study', weight: 95, minTurn: 3, maxTurn: 6, once: true,
    choices: [
      { text: '认真记录时限、签名和更正规则', delta: { knowledge: 3, stamina: -2 }, flagSet: 'legal_record_trained', effect: { kind: 'changeLegal', field: 'recordDefense', amount: 15 }, consequence: '规范逐渐变成工作习惯。' },
      { text: '只下载课件，之后再看', delta: { stamina: 1 }, effect: { kind: 'changeLegal', field: 'recordDefense', amount: -5 }, consequence: '文件留在桌面上，习惯没有改变。' },
      { text: '觉得自己写得够好', delta: { reputation: -1 }, flagSet: 'record_sloppy', effect: { kind: 'changeLegal', field: 'recordDefense', amount: -10 }, consequence: '自信替代不了质控。' },
    ],
  },
  {
    id: 'legal_patient_refuses_exam', stage: ['guipei', 'master', 'phd', 'career'], title: '患者拒绝检查',
    body: '你建议完成一项必要检查，患者因费用或时间拒绝。尊重拒绝不等于什么都不留下，关键是确认其理解可能后果。',
    category: 'clinical', weight: 55, minTurn: 2, once: true,
    choices: [
      { text: '解释风险，准确记录拒绝过程并请其确认', delta: { stamina: -4, relations: 2 }, flagSet: 'legal_refusal_documented', effect: [{ kind: 'changeLegal', field: 'recordDefense', amount: 10 }, { kind: 'changeLegal', field: 'communicationRecord', amount: 8 }], consequence: '患者仍然拒绝，但决定和告知过程都被还原。' },
      { text: '简单写“患者拒绝”', delta: { stamina: -1 }, flagSet: 'legal_refusal_brief', effect: { kind: 'changeLegal', field: 'recordDefense', amount: -5 }, consequence: '结论有了，过程和风险告知仍是空白。' },
      { text: '不记录，继续看下一位', delta: { stamina: 2 }, flagSet: 'record_sloppy', effect: [{ kind: 'recordLegalViolation', violation: '未记录患者拒绝', severity: 'minor' }, { kind: 'changeLegal', field: 'recordDefense', amount: -5 }], consequence: '省下几分钟，也失去了未来还原事实的依据。' },
    ],
  },
  {
    id: 'legal_first_complaint', stage: 'career', title: '第一次被投诉',
    body: '医务科来电：患者认为你解释不清、态度冷淡，并质疑诊疗安排。投诉不等于医疗过错，但应对方式会决定它是否继续升级。',
    category: 'clinical', weight: 100, minTurn: 4, once: true, requireFlag: 'legal_complaint_due',
    choices: [
      { text: '调取病历，复盘沟通并正式回应', delta: { stamina: -6, sanity: -6, reputation: 2 }, flagSet: 'legal_complaint_handled', effect: [{ kind: 'startLegalDispute', status: 'complaint' }, { kind: 'changeLegal', field: 'legalRisk', amount: 5 }, { kind: 'changeLegal', field: 'lawsuitFatigue', amount: 10 }], consequence: '对方不一定满意，但事实和回应都进入了正式流程。' },
      { text: '认为是无理取闹，简单回复', delta: { stamina: -2, sanity: -4, relations: -5 }, flagSet: 'legal_complaint_handled', effect: [{ kind: 'startLegalDispute', status: 'complaint' }, { kind: 'changeLegal', field: 'legalRisk', amount: 20 }, { kind: 'changeLegal', field: 'lawsuitFatigue', amount: 8 }], consequence: '投诉没有消失，而是向更正式的程序移动。' },
      { text: '请医务科共同沟通', delta: { relations: 2, stamina: -5 }, flagSet: 'legal_complaint_handled', effect: [{ kind: 'startLegalDispute', status: 'complaint' }, { kind: 'changeLegal', field: 'legalSupport', amount: 10 }, { kind: 'changeLegal', field: 'legalRisk', amount: 8 }], consequence: '专业支持介入后，沟通不再由你一人承担。' },
    ],
  },
  {
    id: 'legal_seal_records', stage: ['career', 'pinnacle'], title: '封存病历',
    body: '患者家属与代理人要求依法封存病历。此刻最重要的是保持原始记录完整、按程序复制封存，并由法务和医务部门介入。',
    category: 'system', weight: 100, minTurn: 5, once: true, requireFlag: 'legal_dispute_due',
    choices: [
      { text: '配合封存，启动内部复盘', delta: { stamina: -8, sanity: -10 }, flagSet: 'legal_dispute_open', nextEventId: 'legal_resolution_paths', effect: [{ kind: 'startLegalDispute', status: 'mediation' }, { kind: 'changeLegal', field: 'lawsuitFatigue', amount: 15 }, { kind: 'changeLegal', field: 'legalSupport', amount: 8 }], consequence: '病历原貌被保留，后续争点仍需面对。' },
      { text: '请医院法务主持封存流程', delta: { money: -3000, stamina: -5 }, flagSet: 'legal_dispute_open', nextEventId: 'legal_resolution_paths', effect: [{ kind: 'startLegalDispute', status: 'mediation' }, { kind: 'changeLegal', field: 'legalSupport', amount: 18 }], consequence: '专业流程减少了新的程序瑕疵。' },
      { text: '私下修改原记录，让表述更有利', delta: { sanity: -15, reputation: -10 }, flagSet: 'legal_dispute_open', nextEventId: 'legal_resolution_paths', effect: [{ kind: 'recordLegalViolation', violation: '篡改病历', severity: 'major' }, { kind: 'startLegalDispute', status: 'lawsuit' }], consequence: '这不是规范补充记录，而是改变原始证据。过错推定风险被触发。' },
    ],
  },
  {
    id: 'legal_resolution_paths', stage: ['career', 'pinnacle'], title: '纠纷处理路径',
    body: '医务科列出可选路径。快不等于无代价，诉讼也不等于更正义；决定应结合病历、患者诉求、鉴定争点和双方承受能力。',
    category: 'system', weight: 1, once: true, requireFlag: 'legal_dispute_open',
    choices: [
      { text: '双方协商，尽快形成书面协议', delta: { stamina: -4 }, flagSet: 'legal_resolution_chosen', effect: { kind: 'resolveLegalDispute', path: 'negotiation' }, consequence: '程序较短，赔偿与责任表述成为谈判核心。' },
      { text: '申请医调委人民调解', delta: { stamina: -6, reputation: 1 }, flagSet: 'legal_resolution_chosen', effect: { kind: 'resolveLegalDispute', path: 'mediation' }, consequence: '第三方帮助双方把情绪转化为可处理的争点。' },
      { text: '申请行政调解', delta: { stamina: -5 }, flagSet: 'legal_resolution_chosen', effect: { kind: 'resolveLegalDispute', path: 'administrative' }, consequence: '程序更靠近监管，也可能同时审查执业规范。' },
      { text: '进入民事诉讼，接受鉴定与庭审', delta: { stamina: -12, reputation: -2 }, flagSet: 'legal_resolution_chosen', effect: { kind: 'resolveLegalDispute', path: 'lawsuit' }, consequence: '处理周期拉长，病历与因果关系成为主要证据。' },
      { text: '在适用条件下选择仲裁或其他程序', delta: { stamina: -8 }, flagSet: 'legal_resolution_chosen', effect: { kind: 'resolveLegalDispute', path: 'arbitration' }, consequence: '程序较集中，但仍需承担费用和不确定性。' },
    ],
  },
  {
    id: 'legal_admin_penalty', stage: 'pinnacle', title: '行政处罚事先告知',
    body: '监管部门认为科室存在病历书写或告知程序问题，送达行政处罚事先告知。你有权陈述、申辩，也必须面对管理责任。',
    category: 'system', weight: 100, minTurn: 3, once: true, requireFlag: 'legal_admin_due',
    choices: [
      { text: '接受警告与罚款，完成整改', delta: { money: -10000, reputation: -3 }, flagSet: 'legal_admin_resolved', effect: [{ kind: 'changeLegal', field: 'adminPenaltyRisk', amount: -25 }, { kind: 'changeLegal', field: 'recordDefense', amount: 8 }], consequence: '处罚留下记录，科室流程得到修正。' },
      { text: '在期限内提交陈述申辩', delta: { money: -5000, stamina: -8 }, flagSet: 'legal_admin_review', effect: [{ kind: 'changeLegal', field: 'legalSupport', amount: 8 }, { kind: 'changeLegal', field: 'lawsuitFatigue', amount: 12 }], consequence: '程序继续，争议焦点被正式写清。' },
      { text: '隐瞒材料，试图让问题消失', delta: { reputation: -8, sanity: -8 }, flagSet: 'legal_admin_obstructed', effect: [{ kind: 'recordLegalViolation', violation: '隐匿病历', severity: 'major' }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: 25 }], consequence: '管理问题升级为证据问题。' },
    ],
  },
  {
    id: 'legal_retirement_summons', stage: 'retirement', title: '退休后的传票',
    body: '退休后，你收到一份与历史病例有关的传票。只有本局确实留下历史违规或未解决纠纷时，这条追溯线才会出现。',
    category: 'system', weight: 100, minTurn: 3, once: true, requireFlag: 'legal_retrospective_due',
    choices: [
      { text: '调取原始病历，正式应诉', delta: { stamina: -8, sanity: -8 }, flagSet: 'legal_retirement_answered', effect: [{ kind: 'changeLegal', field: 'legalSupport', amount: 8 }, { kind: 'resolveLegalDispute', path: 'lawsuit' }], consequence: '退休没有消除程序责任，完整记录仍是最重要的依据。' },
      { text: '请原医院法务共同处理', delta: { money: -5000, relations: -2 }, flagSet: 'legal_retirement_supported', effect: [{ kind: 'changeLegal', field: 'legalSupport', amount: 15 }, { kind: 'resolveLegalDispute', path: 'mediation' }], consequence: '医院是否愿意支持，也取决于你离开时留下的关系与记录。' },
      { text: '通过调解形成终局协议', delta: { money: -10000, sanity: -3 }, flagSet: 'legal_retirement_settled', effect: { kind: 'resolveLegalDispute', path: 'negotiation', outcome: 'partial' }, consequence: '争议较快结束，经济和情绪代价仍然真实。' },
    ],
  },
];

