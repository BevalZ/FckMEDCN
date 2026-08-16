import type { GameEvent } from './events';

export const HEALTH_EVENTS: GameEvent[] = [
  {
    id: 'health_first_strong_tea', stage: 'internship', title: '第一杯浓茶',
    body: '夜班刚开始，护士长把一杯浓茶放到你面前：“后半夜还长。”你第一次意识到，这行会向身体借时间。',
    category: 'personal', weight: 85, minTurn: 0, maxTurn: 3, once: true,
    choices: [
      { text: '喝下去，先把今晚撑完', delta: { stamina: 5 }, effect: [{ kind: 'changeHealth', field: 'strain', amount: 2 }, { kind: 'setFlag', flag: 'caffeine_habit' }], consequence: '清醒来得很快，代价暂时还看不见。' },
      { text: '婉拒，找时间闭眼十分钟', delta: { stamina: 2, relations: 2 }, effect: { kind: 'changeHealth', field: 'energy', amount: 3 }, consequence: '短暂的休息比刺激温和得多。' },
      { text: '喝水，给自己留一条长期规矩', delta: { sanity: 2 }, flagSet: 'health_conscious_early', effect: { kind: 'useHealthCare', preventive: true }, consequence: '这条小规矩后来救过你很多次。' },
    ],
  },
  {
    id: 'health_operating_room_back', stage: ['guipei', 'career'], title: '手术室的腰',
    body: '连续站台后，你脱下铅衣，扶着墙才把腰慢慢直起来。疼痛没有消失，只是从警告变成了背景。',
    category: 'clinical', weight: 55, minTurn: 2, once: true,
    choices: [
      { text: '去康复科评估并做理疗', delta: { money: -800, sanity: 3 }, effect: { kind: 'useHealthCare', strain: -8, energy: 8 }, consequence: '你花了钱和时间，也第一次认真对待疼痛。' },
      { text: '贴膏药，继续下一台', delta: { clinical: 3, stamina: -5 }, effect: { kind: 'changeHealth', field: 'strain', amount: 5, incident: '腰痛' }, consequence: '排班没有停，疼痛也没有。' },
      { text: '买护具并调整站姿', delta: { money: -1200, clinical: 1 }, effect: { kind: 'useHealthCare', strain: -3, preventive: true }, consequence: '它不能治愈劳损，但能让损耗慢一点。' },
    ],
  },
  {
    id: 'health_three_am_stomach', stage: ['guipei', 'master', 'phd', 'career'], title: '凌晨三点的胃',
    body: '病程还没写完，胃里的烧灼感先到了。值班室抽屉里有药，桌上只有半包已经凉掉的饼干。',
    category: 'personal', weight: 48, minTurn: 2, once: true,
    choices: [
      { text: '吃点东西，结束后去评估', delta: { stamina: 3, money: -300 }, effect: { kind: 'useHealthCare', strain: -2 }, consequence: '你没有把症状当作职业的必修课。' },
      { text: '忍到下班', delta: { stamina: -5 }, effect: { kind: 'changeHealth', field: 'constitution', amount: -2, incident: '胃痛' }, consequence: '天亮了，胃痛却记住了这个夜班。' },
      { text: '找值班同事分一点饼干', delta: { relations: 3, stamina: 2 }, effect: { kind: 'changeHealth', field: 'strain', amount: 1 }, consequence: '一小包饼干，也是一种互相照看。' },
    ],
  },
  {
    id: 'health_age_40_checkup', stage: 'career', title: '40岁的体检报告',
    body: '体检单上多了几枚红色箭头。它们不是诊断书，却把多年夜班、应酬和“再撑一下”排成了一张清单。',
    category: 'personal', weight: 100, minTurn: 8, maxTurn: 13, once: true,
    choices: [
      { text: '开始规律运动和饮食管理', delta: { sanity: 3, money: -1500 }, flagSet: 'health_checkup_managed', effect: { kind: 'useHealthCare', constitution: 4, strain: -6, preventive: true }, consequence: '改变很慢，但每一季都算数。' },
      { text: '按医嘱随访用药，工作照常', delta: { money: -900 }, flagSet: 'health_medication_plan', effect: { kind: 'useHealthCare', constitution: 2, strain: -2 }, consequence: '指标得到控制，生活方式仍需偿还旧账。' },
      { text: '先放抽屉里，忙完再说', delta: { clinical: 2, sanity: -3 }, flagSet: 'ignored_checkup', effect: { kind: 'changeHealth', field: 'constitution', amount: -5, incident: '忽视体检异常' }, consequence: '抽屉合上了，风险没有。' },
    ],
  },
  {
    id: 'health_hand_tremor', stage: 'pinnacle', title: '无影灯下的一次停顿',
    body: '精细操作时，手指出现了一次不该有的颤动。助手抬头看你。你比任何人都清楚，承认疲劳也是临床判断的一部分。',
    category: 'clinical', weight: 100, minTurn: 2, maxTurn: 5, once: true,
    choices: [
      { text: '让助手接手，自己完成监督', delta: { reputation: -2, relations: 5 }, flagSet: 'era6_passed_baton_in_or', effect: [{ kind: 'changeHealth', field: 'strain', amount: -4 }, { kind: 'completeBucket', item: 'lastVisit', legacy: 10, completion: 5 }], consequence: '手术安全完成。年轻医生也第一次真正站到主刀位。' },
      { text: '暂停操作，评估后再决定', delta: { clinical: 2, money: -2000 }, effect: { kind: 'useHealthCare', strain: -5, constitution: 2 }, consequence: '排除严重问题后，你重新安排了手术量。' },
      { text: '掩饰疲劳，继续完成', delta: { reputation: 3, stamina: -12 }, flagSet: 'era6_hid_tremor', effect: { kind: 'changeHealth', field: 'strain', amount: 8, incident: '手抖' }, consequence: '没人追问，但你知道这不是胜利。' },
    ],
  },
  {
    id: 'health_collapse', stage: ['career', 'pinnacle'], title: '倒下',
    body: '走廊的灯突然拉成一条线。醒来时，你躺在自己熟悉的病房里。排班被同事接走，家属站在床边，科主任等你做决定。',
    category: 'personal', weight: 100, once: true, requireFlag: 'health_collapse_due',
    choices: [
      { text: '遵医嘱休假并完整评估', delta: { money: -5000, reputation: -3, sanity: 8 }, flagSet: 'health_collapse_recovered', effect: [{ kind: 'changeHealth', field: 'energy', amount: 0, incident: '倒下' }, { kind: 'useHealthCare', constitution: 6, strain: -12, energy: 30, preventive: true }, { kind: 'changePolicy', field: 'deptSurplus', amount: -3 }], consequence: '晋升慢了一步，但你还在。' },
      { text: '短休后返岗，减少高风险操作', delta: { money: -2000, clinical: -1 }, flagSet: 'health_changed_role', effect: [{ kind: 'changeHealth', field: 'energy', amount: 0, incident: '倒下' }, { kind: 'useHealthCare', constitution: 2, strain: -5, energy: 20 }], consequence: '你没有完全停下，但承认了边界。' },
      { text: '申请转到医技或管理岗位', delta: { reputation: -5, sanity: 5 }, flagSet: 'health_transferred_role', effect: [{ kind: 'changeHealth', field: 'energy', amount: 0, incident: '倒下' }, { kind: 'useHealthCare', constitution: 3, strain: -8 }], consequence: '职业路径变了，生命没有因此失去意义。' },
    ],
  },
  {
    id: 'health_retirement_recovery', stage: 'retirement', title: '退休后的身体',
    body: '日程表突然空下来，你才看清这些年留下的疼痛。身体不是报废的机器，它仍能在耐心照料中恢复一部分生活。',
    category: 'personal', weight: 100, minTurn: 1, maxTurn: 4, once: true,
    choices: [
      { text: '规律游泳、散步和复诊', delta: { sanity: 8, money: -1200 }, flagSet: 'retirement_active_health', effect: { kind: 'useHealthCare', strain: -15, constitution: 3, preventive: true }, consequence: '关节依旧会痛，但日子重新有了节律。' },
      { text: '只做半天返聘，其余时间休息', delta: { money: 4000, reputation: 3 }, flagSet: 'retirement_part_time', effect: { kind: 'useHealthCare', strain: -6, energy: 5 }, consequence: '你保留了职业连接，也守住了身体边界。' },
      { text: '什么都不安排', delta: { sanity: -3 }, effect: { kind: 'changeHealth', field: 'constitution', amount: -4 }, consequence: '休息不等于恢复，空白也会消耗人。' },
    ],
  },
];

export const FINANCE_POLICY_EVENTS: GameEvent[] = [
  {
    id: 'finance_tuition_notice', stage: 'undergrad', title: '录取通知书旁的账单',
    body: '学费、住宿费和生活费写在同一张纸上。家里没有把压力说出口，但你看见父母在客厅里重新算了一遍。',
    category: 'financial', weight: 90, minTurn: 0, maxTurn: 2, once: true,
    choices: [
      { text: '申请助学贷款', delta: { sanity: -2 }, flagSet: 'student_loan', flagExclude: 'student_loan', effect: { kind: 'changeFinance', field: 'corruption', amount: 0, purchase: '助学贷款' }, consequence: '贷款将按季度发放到现金账户，本金同步记入债务，工作后按余额偿还。' },
      { text: '接受家里的支持', delta: { relations: 4, sanity: -2 }, flagSet: 'family_paid_tuition', consequence: '这笔钱没有利息，却有分量。' },
      { text: '申请定向培养', delta: { money: 8000, sanity: 2 }, flagSet: 'directed_medical_track', consequence: '学费压力减轻，毕业后的履约去向也被提前写下。' },
    ],
  },
  {
    id: 'finance_drug_rep_offer', stage: ['guipei', 'career'], title: '“学术支持”',
    body: '对方把材料和一个信封一起推过来，措辞很客气：“只是支持学习。”你知道，模糊的边界不会因为换了名字就消失。',
    category: 'financial', weight: 25, minTurn: 3, once: true,
    choices: [
      { text: '明确拒绝并记录接触', delta: { reputation: 2 }, flagSet: 'refused_improper_benefit', consequence: '没有额外收入，也没有需要解释的账。' },
      { text: '按医院制度上交并备案', delta: { relations: 2, reputation: 3 }, flagSet: 'reported_improper_benefit', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: -8 }, consequence: '流程麻烦，却把风险留在了阳光下。' },
      { text: '收下', delta: { money: 5000, sanity: -4 }, flagSet: 'accepted_improper_benefit', effect: [{ kind: 'changeFinance', field: 'corruption', amount: 10 }, { kind: 'changePolicy', field: 'complianceRisk', amount: 12, violation: '收受不当利益' }], consequence: '余额增加了，一条可追溯的风险也增加了。' },
    ],
  },
  {
    id: 'policy_drg_training', stage: 'guipei', title: '医保办的培训',
    body: '屏幕上写着“打包付费、结余留用、超支分担”。你第一次发现，诊疗方案之外还有一套决定科室收支的语言。',
    category: 'system', weight: 95, minTurn: 1, maxTurn: 5, once: true,
    choices: [
      { text: '认真记录规则和特例单议流程', delta: { knowledge: 3 }, flagSet: 'policy_drg_trained', effect: { kind: 'changePolicy', field: 'drgPressure', amount: 3 }, consequence: '理解规则不能消除矛盾，但能减少无谓的错误。' },
      { text: '追问复杂重症如何申报特例', delta: { knowledge: 2, reputation: 1 }, flagSet: 'policy_knows_exception', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: -5 }, consequence: '你记住了为复杂患者保留完整证据的办法。' },
      { text: '觉得离自己还远', delta: { sanity: 1 }, effect: { kind: 'changePolicy', field: 'complianceRisk', amount: 5 }, consequence: '很快，你会在工资条上重新认识它。' },
    ],
  },
  {
    id: 'policy_drg_point_cut', stage: 'career', title: 'DRG点数下调',
    body: '科室主要病组的支付点数下调。主任把选择摆到桌面：增加工作量、优化路径，或者接受绩效下降。',
    category: 'system', weight: 80, minTurn: 3, once: true,
    choices: [
      { text: '增加收治量', delta: { money: 2500, stamina: -10 }, effect: [{ kind: 'changeHealth', field: 'strain', amount: 5 }, { kind: 'changePolicy', field: 'deptSurplus', amount: 5 }], consequence: '收入暂时守住了，工作量把压力传回身体。' },
      { text: '梳理路径并保留重症例外', delta: { knowledge: 3, relations: 2 }, flagSet: 'policy_refined_pathway', effect: [{ kind: 'changePolicy', field: 'deptSurplus', amount: 8 }, { kind: 'changePolicy', field: 'complianceRisk', amount: -4 }], consequence: '流程更清楚，必要治疗也没有被简单砍掉。' },
      { text: '接受绩效下降，减少过劳', delta: { money: -2500, sanity: 4 }, effect: { kind: 'changePolicy', field: 'deptSurplus', amount: -3 }, consequence: '你没能改变点数，但给身体留出了一点余地。' },
    ],
  },
  {
    id: 'policy_procurement_update', stage: 'career', title: '集采目录更新',
    body: '常用药品和耗材进入新一轮集采。价格显著下降，处方规则也更严格。临床差异仍需通过复评和特例流程处理。',
    category: 'system', weight: 75, minTurn: 4, once: true,
    choices: [
      { text: '按目录执行，并主动随访疗效', delta: { reputation: 2 }, effect: [{ kind: 'recordProcurement', round: '新一轮集采', product: '常用药耗', savings: 3000 }, { kind: 'changePolicy', field: 'procurementCompliance', amount: 12 }], consequence: '大多数患者负担下降，个体差异被继续记录。' },
      { text: '为复杂患者提交特例申请', delta: { stamina: -3, knowledge: 2 }, flagSet: 'policy_used_exception', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: -4 }, consequence: '多了文书工作，也保留了临床弹性。' },
      { text: '图省事，统一替换且不随访', delta: { stamina: 2 }, effect: [{ kind: 'changePolicy', field: 'procurementCompliance', amount: 8 }, { kind: 'changePolicy', field: 'complianceRisk', amount: 8, violation: '未充分复评用药变化' }], consequence: '指标完成得快，后续问题却可能更难解释。' },
    ],
  },
  {
    id: 'policy_patient_reassessment', stage: ['career', 'pinnacle'], title: '换药后的复评',
    body: '一位老患者带着记录回来：更换药物后，控制不如从前。你需要区分依从性、剂量、个体差异和不良反应，而不是先替任何结论站队。',
    category: 'clinical', weight: 45, minTurn: 5, once: true, requireFlag: 'policy_drg_trained',
    choices: [
      { text: '完整复评并调整方案', delta: { clinical: 3, stamina: -3 }, effect: { kind: 'recordProcurement', round: '新一轮集采', complaint: true }, consequence: '患者得到个体化处理，记录也进入药事评估。' },
      { text: '上报药剂科和监测系统', delta: { reputation: 2, knowledge: 2 }, flagSet: 'policy_reported_adverse', effect: [{ kind: 'recordProcurement', round: '新一轮集采', complaint: true }, { kind: 'changePolicy', field: 'complianceRisk', amount: -5 }], consequence: '临床疑问被转化为可审查的数据。' },
      { text: '只做口头解释，不留记录', delta: { stamina: 1, reputation: -2 }, effect: { kind: 'changePolicy', field: 'complianceRisk', amount: 8, violation: '用药复评记录不完整' }, consequence: '对话结束了，风险仍留在空白病历里。' },
    ],
  },
  {
    id: 'policy_performance_cut', stage: 'career', title: '绩效扣减通知',
    body: '一个重症病例超出病组支付标准，部分费用被拒付。工资条上的绩效少了，但病历里每一项检查都有当时的临床理由。',
    category: 'financial', weight: 100, minTurn: 8, maxTurn: 14, once: true,
    choices: [
      { text: '整理证据，申请特例复核', delta: { stamina: -5, knowledge: 2 }, flagSet: 'policy_appealed_cut', effect: { kind: 'changePolicy', field: 'deptSurplus', amount: 6 }, consequence: '申诉不一定成功，但医疗必要性被完整说明。' },
      { text: '接受扣减', delta: { money: -4000, sanity: -5 }, effect: { kind: 'changePolicy', field: 'deptSurplus', amount: -6 }, consequence: '工资条承担了制度摩擦。' },
      { text: '以后机械压缩必要检查', delta: { money: 1500, reputation: -5 }, flagSet: 'policy_cut_needed_care', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: 18, violation: '为控费缩减必要服务' }, consequence: '成本下来了，医疗质量和法律风险一起上升。' },
    ],
  },
  {
    id: 'finance_external_consult', stage: 'pinnacle', title: '外院会诊邀请',
    body: '周末的外院会诊报酬不低。对方问你走单位流程，还是直接结算。技术劳动应该被支付，方式同样重要。',
    category: 'financial', weight: 70, minTurn: 1, once: true,
    choices: [
      { text: '走单位审批和公对公流程', delta: { money: 10000, stamina: -6, reputation: 2 }, flagSet: 'sunshine_consult', consequence: '收入少一些，记录完整，风险可控。' },
      { text: '私下收取现金', delta: { money: 20000, stamina: -8, sanity: -3 }, flagSet: 'private_consult_cash', effect: [{ kind: 'changeFinance', field: 'corruption', amount: 15 }, { kind: 'changePolicy', field: 'complianceRisk', amount: 15, violation: '违规外出会诊结算' }], consequence: '现金到手，一条合规隐患也留下。' },
      { text: '不去，留出完整周末', delta: { sanity: 8, relations: 4 }, effect: { kind: 'changeHealth', field: 'strain', amount: -4 }, consequence: '你放弃一笔收入，换回了时间。' },
    ],
  },
  {
    id: 'policy_flying_inspection', stage: 'pinnacle', title: '飞行检查',
    body: '检查组临时进院，抽取病历、费用和诊疗依据。你曾经留下的每一处记录，都在今天变成证据。',
    category: 'system', weight: 60, minTurn: 4, once: true,
    choices: [
      { text: '完整提交病历和特例依据', delta: { reputation: 3, stamina: -4 }, flagSet: 'policy_inspection_cooperated', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: -10 }, consequence: '检查结束，科室收到少量整改意见。' },
      { text: '主动说明已知问题并整改', delta: { money: -3000, reputation: 1 }, flagSet: 'policy_self_corrected', effect: [{ kind: 'changePolicy', field: 'complianceRisk', amount: -15 }, { kind: 'changePolicy', field: 'deptSurplus', amount: -5 }], consequence: '代价明确，风险没有继续滚大。' },
      { text: '推给下级医生', delta: { relations: -10, reputation: -5 }, effect: { kind: 'changePolicy', field: 'complianceRisk', amount: 15, violation: '检查中推诿责任' }, consequence: '检查可能暂时过去，团队不会忘记。' },
    ],
  },
  {
    id: 'policy_retirement_clawback', stage: 'retirement', title: '退休后的追缴通知',
    body: '医院通知，一例历史病例因既往合规问题被重新审核。追缴只会在你确实留下过违规记录时出现。',
    category: 'financial', weight: 100, minTurn: 3, once: true, requireFlag: 'policy_historical_violation',
    choices: [
      { text: '按程序退还并保留申诉权', delta: { money: -5000, sanity: -3 }, flagSet: 'policy_clawback_paid', consequence: '事情有了边界，晚年声誉被保住。' },
      { text: '调取历史病历申诉', delta: { stamina: -4, knowledge: 2 }, flagSet: 'policy_clawback_appealed', consequence: '多年后的证据仍比情绪更有用。' },
      { text: '拒绝处理', delta: { reputation: -8, sanity: -5 }, flagSet: 'policy_clawback_disputed', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: 20 }, consequence: '争议进入新的程序。' },
    ],
  },
];
