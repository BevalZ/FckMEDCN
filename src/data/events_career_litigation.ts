import type { GameEvent } from './events';

// M11 诉讼长尾：鉴定节点 → 延迟回声 → 低概率二审窗口。
// 鉴定结果由 rollOutcome 加权：知识/临床、病历瑕疵、知情同意质量、职级相关 flag。

const APPRAISAL_ROLL = {
  kind: 'rollOutcome' as const,
  successFlag: 'appraisal_favorable',
  failFlag: 'appraisal_adverse',
  base: 0.42,
  knowledgeBonus: 0.002,
  clinicalBonus: 0.003,
  repPer10: 0.01,
  flagAdjust: [
    { flag: 'record_sloppy', delta: -0.18 },
    { flag: 'record_sloppy_exposed', delta: -0.12 },
    { flag: 'informed_consent_ok', delta: 0.12 },
    { flag: 'informed_consent_hasty', delta: -0.1 },
    { flag: 'passed_fugao', delta: 0.04 },
    { flag: 'passed_zhenggao', delta: 0.06 },
  ],
};

export const CAREER_LITIGATION_EVENTS: GameEvent[] = [
  {
    id: 'career_lawsuit_appraisal',
    stage: 'career',
    title: '医疗损害鉴定',
    body: '法院委托的鉴定专家组约谈你。他们会看病程、知情同意和当时判断依据——结果会左右责任划分。',
    category: 'clinical',
    weight: 1,
    once: true,
    minTurn: 4,
    requireFlag: 'lawsuit_done_1',
    excludeFlag: 'appraisal_resolved',
    choices: [
      {
        text: '按时间线提交病历与谈话记录，配合鉴定',
        delta: { stamina: -8, sanity: -6, knowledge: 2 },
        effect: [APPRAISAL_ROLL, { kind: 'setFlag', flag: 'appraisal_resolved' }],
        consequence: '鉴定意见稍后下达。你能做的，只是把当时的推理写清楚。',
      },
      {
        text: '请律师协助整理材料并出席',
        delta: { money: -5000, stamina: -6, sanity: -3, reputation: 1 },
        effect: [APPRAISAL_ROLL, { kind: 'setFlag', flag: 'appraisal_resolved' }],
        consequence: '律师帮你卡住了几处表述漏洞；鉴定仍按证据说话。',
      },
    ],
  },
  {
    id: 'career_appraisal_win_echo',
    stage: 'career',
    title: '鉴定意见偏有利之后',
    body: '鉴定倾向医院侧证据更充分。争议缓和了，但你夜里仍会想起那叠病历。',
    category: 'mental',
    weight: 55,
    once: true,
    minTurn: 6,
    requireFlag: 'appraisal_favorable',
    choices: [
      {
        text: '把复盘写进组内培训，强调记录与沟通',
        delta: { reputation: 3, relations: 2, sanity: 3, knowledge: 2 },
        flagSet: 'appraisal_win_taught',
        consequence: '你把惊险变成了可教的习惯，心里也松了一点。',
      },
      {
        text: '少谈这件事，只求尽快翻篇',
        delta: { sanity: 1, reputation: 1 },
        flagSet: 'appraisal_win_quiet',
        consequence: '同事不再追问，你自己也很少再提。',
      },
    ],
  },
  {
    id: 'career_appraisal_lose_echo',
    stage: 'career',
    title: '鉴定意见不利之后',
    body: '鉴定指出记录或告知存在瑕疵。医务科约谈、绩效扣减和闲话一起压过来。',
    category: 'mental',
    weight: 60,
    once: true,
    minTurn: 6,
    requireFlag: 'appraisal_adverse',
    choices: [
      {
        text: '接受整改清单，逐项补流程',
        delta: { money: -3000, reputation: -2, clinical: 3, sanity: -4 },
        flagSet: 'appraisal_lose_reformed',
        consequence: '你丢了面子和奖金，换来一套更严的签字与复查习惯。',
      },
      {
        text: '开始更防御性的开单与转诊',
        delta: { money: 800, reputation: -3, sanity: -6, clinical: -1 },
        flagSet: 'appraisal_lose_defensive',
        consequence: '你少挨骂了，也少了一些该承担的判断。',
      },
    ],
  },
  {
    id: 'career_lawsuit_settle_shadow',
    stage: 'career',
    title: '调解书之外的阴影',
    body: '即便程序结束，偶发的回访电话和科室闲聊仍会把你拽回那天。',
    category: 'mental',
    weight: 40,
    once: true,
    minTurn: 7,
    requireFlag: 'lawsuit_done_1',
    choices: [
      {
        text: '找信任的同事或心理支持聊聊',
        delta: { sanity: 5, relations: 2, stamina: -2 },
        flagSet: 'lawsuit_shadow_talked',
        consequence: '说出来之后，那页病历不那么烫手了。',
      },
      {
        text: '埋头干活，假装没事',
        delta: { stamina: -4, sanity: -3, clinical: 1 },
        flagSet: 'lawsuit_shadow_buried',
        consequence: '工作量顶住了情绪，也把疲惫堆得更高。',
      },
    ],
  },
  {
    id: 'career_second_appeal',
    stage: 'career',
    title: '二审 / 后续追诉窗口',
    body: '对方在时限内提出上诉或补充主张。窗口不长，但足以再次打乱排班与心情。',
    category: 'clinical',
    weight: 1,
    once: true,
    minTurn: 12,
    maxTurn: 16,
    requireFlag: 'appraisal_adverse',
    excludeFlag: 'second_appeal_done',
    choices: [
      {
        text: '继续请律师应诉，补强证据',
        delta: { money: -8000, stamina: -10, sanity: -8, reputation: 2 },
        flagSet: 'second_appeal_done',
        consequence: '二审耗时耗力，最终程序收束。你更清楚“一次瑕疵会追很久”。',
      },
      {
        text: '在律师建议下再调解结案',
        delta: { money: -12000, sanity: -2, relations: -2, reputation: -1 },
        flagSet: 'second_appeal_done',
        consequence: '赔偿换来程序终结。你在绩效单上又少了一截。',
      },
      {
        text: '由医院统一处理，你完整配合',
        delta: { money: -4000, stamina: -6, sanity: -5, relations: 1 },
        flagSet: 'second_appeal_done',
        consequence: '你把材料交齐，医院扛下了大部分应诉节奏。',
      },
    ],
  },
];
