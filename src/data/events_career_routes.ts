import type { GameEvent } from './events';

// 职业期路线分化 + 编制/合同制与病假调休薄系统（DEVPLAN / REVIEW-PLAYABILITY R18）。
// 用 requireFlag 硬门控：求职 signUnit / 编制结果落定的 flag 真正改变职业事件池。
// 不写剂量或诊疗建议；叙事保持概括。

export const CAREER_ROUTE_EVENTS: GameEvent[] = [
  // —— 三甲 / 平台：疑难与负荷 ——
  {
    id: 'career_route_sanjia_hardcase',
    stage: 'career',
    title: '疑难会诊挤进你的排班',
    body: '三甲病房里，转诊来的复杂病例越来越多。你既要跟专科对接，又得把风险写进病程。',
    category: 'clinical',
    weight: 70,
    once: true,
    minTurn: 2,
    requireFlag: 'offer_sanjia',
    choices: [
      {
        text: '认真整理鉴别与会诊资料，请上级一起看',
        delta: { clinical: 5, knowledge: 4, stamina: -8, reputation: 3 },
        flagSet: 'route_sanjia_diligent',
        consequence: '你把平台优势用在了判断上，而不是只刷工作量。',
      },
      {
        text: '先顶住排班，细节以后再补',
        delta: { clinical: 1, stamina: -4, sanity: -3, reputation: -1 },
        flagSet: 'route_sanjia_rushed',
        consequence: '病例推进了，交班却留下几处说不清的空白。',
      },
    ],
  },
  {
    id: 'career_route_sanjia_echo',
    stage: 'career',
    title: '那次会诊成了科室话头',
    body: '几季后，年轻医生提起那例转诊：有人夸你写得清楚，也有人说你当时太赶。',
    category: 'clinical',
    weight: 45,
    once: true,
    minTurn: 8,
    requireFlag: 'route_sanjia_diligent',
    choices: [
      {
        text: '把模板留在组里，强调风险与复查节点',
        delta: { reputation: 3, relations: 2, knowledge: 2 },
        consequence: '你把一次辛苦变成了可复用的习惯。',
      },
    ],
  },
  {
    id: 'career_route_hospital_a_platform',
    stage: 'career',
    title: '市级三甲的平台与排班',
    body: '市三甲病种不少，但编制名额和进修机会都卡在名额表上。你要在平台和可持续之间找平衡。',
    category: 'career',
    weight: 65,
    once: true,
    minTurn: 3,
    requireFlag: 'took_hospital_a',
    choices: [
      {
        text: '争取疑难病例与进修名额',
        delta: { clinical: 4, reputation: 3, stamina: -7, sanity: -2 },
        flagSet: 'route_city_platform_push',
        consequence: '你拿到了更难的病例，也透支了休息。',
      },
      {
        text: '先把本科室流程做稳',
        delta: { relations: 3, sanity: 3, clinical: 2, stamina: -3 },
        flagSet: 'route_city_platform_steady',
        consequence: '你没有抢风头，但同事更愿意把班交给你。',
      },
    ],
  },

  // —— 基层：全科杂事与转诊 ——
  {
    id: 'career_route_grass_generalism',
    stage: 'career',
    title: '全科杂事才是日常',
    body: '基层门诊里，慢病随访、开药咨询和转诊文书挤在一起。疑难少，但每一例都要自己扛完首诊。',
    category: 'clinical',
    weight: 70,
    once: true,
    minTurn: 2,
    requireFlag: 'offer_grass',
    choices: [
      {
        text: '把随访表和转诊指征写清楚',
        delta: { clinical: 4, relations: 4, knowledge: 3, stamina: -6 },
        flagSet: 'route_grass_followup',
        consequence: '患者知道何时回来，你也少接几次含糊的电话。',
      },
      {
        text: '先看完今天的号，文书能简就简',
        delta: { stamina: -3, sanity: 1, reputation: -1, clinical: 1 },
        flagSet: 'route_grass_rushed',
        consequence: '号是看完了，复查交代却总被追问。',
      },
    ],
  },
  {
    id: 'career_route_grass_echo',
    stage: 'career',
    title: '转诊单上的那一行',
    body: '县里上送的患者在三甲被问：基层有没有写清已做检查和用药。你的名字出现在转诊单上。',
    category: 'clinical',
    weight: 45,
    once: true,
    minTurn: 7,
    requireFlag: 'route_grass_followup',
    choices: [
      {
        text: '补强转诊模板，和同事统一口径',
        delta: { reputation: 3, relations: 2, clinical: 2 },
        consequence: '基层不是“简单”，是把门槛问题尽量解决在门口。',
      },
    ],
  },

  // —— 私立：绩效压力 ——
  {
    id: 'career_route_private_kpi',
    stage: 'career',
    title: '流水与绩效会议',
    body: '民营医院的周会上，指标比病例讨论更靠前。合同写着提成，也写着“流水不达标可解约”。',
    category: 'financial',
    weight: 70,
    once: true,
    minTurn: 2,
    requireFlag: 'took_private',
    choices: [
      {
        text: '坚持适应证与知情同意，拒绝灌水项目',
        delta: { reputation: 4, sanity: -2, money: -800, relations: 1 },
        flagSet: 'route_private_principled',
        consequence: '你守住了底线，也少拿了一截绩效。',
      },
      {
        text: '先把指标顶上去，再慢慢调结构',
        delta: { money: 2000, reputation: -3, sanity: -4, clinical: -1 },
        flagSet: 'route_private_kpi_push',
        consequence: '数字好看了，你对几台可做可不做的操作开始心里发虚。',
      },
    ],
  },
  {
    id: 'career_route_private_echo',
    stage: 'career',
    title: '解约条款被重新提起',
    body: '人事拿着合同找你谈话：近期流水波动，院方希望你“配合科室目标”。',
    category: 'career',
    weight: 50,
    once: true,
    minTurn: 9,
    requireFlag: 'route_private_principled',
    choices: [
      {
        text: '书面确认适应证边界，必要时准备退路',
        delta: { sanity: 2, reputation: 2, relations: -1, knowledge: 1 },
        consequence: '你把风险说在前面，也开始留意其他机会。',
      },
    ],
  },

  // —— 省属公立（took_public）——
  {
    id: 'career_route_public_quota',
    stage: 'career',
    title: '进修名额与本院人情',
    body: '省属医院的进修和会议名额，常常先落到“本院关系”和科室配额上。你要决定争还是等。',
    category: 'career',
    weight: 60,
    once: true,
    minTurn: 3,
    requireFlag: 'took_public',
    choices: [
      {
        text: '按流程申请并准备材料',
        delta: { reputation: 3, knowledge: 3, stamina: -5 },
        flagSet: 'route_public_applied',
        consequence: '名额未定，但你留下了可追溯的申请记录。',
      },
      {
        text: '找熟识的上级说说情',
        delta: { relations: 3, reputation: 1, sanity: -2 },
        flagSet: 'route_public_favor',
        consequence: '人情好使，你也欠下一笔说不清的账。',
      },
    ],
  },

  // —— 编制 vs 合同制 ——
  {
    id: 'career_emp_bianzhi_stable',
    stage: 'career',
    title: '编制内的安稳与沉默',
    body: '进编后，工资条更稳，调动却更难。有人劝你“少出头”，也有人说这正是沉淀技术的时候。',
    category: 'career',
    weight: 65,
    once: true,
    minTurn: 4,
    requireFlag: 'jh_bianzhi_in',
    choices: [
      {
        text: '把稳定换成可复盘的临床习惯',
        delta: { clinical: 4, knowledge: 3, sanity: 2, stamina: -4 },
        flagSet: 'emp_bianzhi_craft',
        consequence: '你没有躺平，而是用编制换来了可积累的节奏。',
      },
      {
        text: '少表态，先把关系维稳',
        delta: { relations: 3, sanity: 3, reputation: -1 },
        flagSet: 'emp_bianzhi_quiet',
        consequence: '风波少了，你对自己的锐气也少了一点。',
      },
    ],
  },
  {
    id: 'career_emp_contract_renewal',
    stage: 'career',
    title: '合同续签窗口',
    body: '合同制岗位又到了续签季。人事提醒：考核、流水与投诉记录都会进评估表。',
    category: 'career',
    weight: 65,
    once: true,
    minTurn: 4,
    requireFlag: 'contract',
    choices: [
      {
        text: '补齐考核材料，并谈清岗位与公积金口径',
        delta: { reputation: 3, knowledge: 2, stamina: -5, sanity: -1 },
        flagSet: 'emp_contract_negotiated',
        consequence: '你把含糊条款问清楚了，至少知道自己签的是什么。',
      },
      {
        text: '先签字保住岗位，细节以后再说',
        delta: { sanity: -3, money: 500, reputation: -1 },
        flagSet: 'emp_contract_rushed',
        consequence: '岗位暂时保住了，条款里的风险也一起签了进去。',
      },
    ],
  },
  {
    id: 'career_emp_bianzhi_out_echo',
    stage: 'career',
    title: '编外的那次落空',
    body: '同事进编的消息传来。你想起当年报录比和那次差一点，心里还是咯噔一下。',
    category: 'mental',
    weight: 50,
    once: true,
    minTurn: 5,
    requireFlag: 'jh_bianzhi_out',
    choices: [
      {
        text: '把精力转回可迁移的技术与口碑',
        delta: { clinical: 3, reputation: 2, sanity: 2 },
        flagSet: 'emp_out_reframed',
        consequence: '编制没来，你把目标改成了自己带得走的东西。',
      },
      {
        text: '再盯下一轮进编机会',
        delta: { stamina: -4, sanity: -2, reputation: 1 },
        flagSet: 'emp_out_retry',
        consequence: '你还想搏一次，也知道窗口越来越窄。',
      },
    ],
  },

  // —— 病假 / 调休 ——
  {
    id: 'career_sick_leave_request',
    stage: 'career',
    title: '要不要开口请病假',
    body: '连续值班后你低烧未退。科里人手紧，请病假意味着别人顶班；硬撑则可能把风险留给患者。',
    category: 'mental',
    weight: 55,
    once: true,
    minTurn: 3,
    requireStat: { stamina: [0, 45] },
    choices: [
      {
        text: '按流程请假，交接未完成事项',
        delta: { stamina: 12, sanity: 4, relations: -1, reputation: 1 },
        flagSet: 'sick_leave_taken',
        consequence: '你休息了几天。有人抱怨排班，也有人说你做得对。',
      },
      {
        text: '吃点药顶完这周',
        delta: { stamina: -6, sanity: -4, reputation: 1, clinical: -1 },
        flagSet: 'sick_leave_pushed',
        consequence: '班是顶下来了，判断力却明显变钝。',
      },
    ],
  },
  {
    id: 'career_comp_time_offer',
    stage: 'career',
    title: '积攒的调休额度',
    body: '护士长提醒：你名下还有未休的调休。再不休，月底可能被清零或折成模糊的“奖励”。',
    category: 'personal',
    weight: 50,
    once: true,
    minTurn: 6,
    requireFlag: 'sick_leave_pushed',
    choices: [
      {
        text: '把调休排进下周，真正休息',
        delta: { stamina: 8, sanity: 5, money: -200 },
        flagSet: 'comp_time_used',
        consequence: '你补回一点身体，也少赚了一点加班感。',
      },
      {
        text: '继续攒着，怕耽误晋升材料',
        delta: { reputation: 1, stamina: -2, sanity: -2 },
        flagSet: 'comp_time_banked',
        consequence: '额度还在纸上，疲劳仍在身上。',
      },
    ],
  },
  {
    id: 'career_sick_leave_echo',
    stage: 'career',
    title: '请假之后的科室目光',
    body: '病假回来，有人把你的班次排得更紧，也有人私下说“总比倒下强”。',
    category: 'social',
    weight: 40,
    once: true,
    minTurn: 8,
    requireFlag: 'sick_leave_taken',
    choices: [
      {
        text: '公开感谢顶班同事，并更新交接清单',
        delta: { relations: 4, reputation: 2, sanity: 2 },
        consequence: '你把请假从“麻烦”变成了可协作的流程。',
      },
    ],
  },
];
