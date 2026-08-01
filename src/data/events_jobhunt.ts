import type { GameEvent } from './events';

// 求职阶段事件池（jobhunt）。仅 4 回合，多为一次性关键抉择，设置大量 flag 影响后续职业路径。
export const JOBHUNT_EVENTS: GameEvent[] = [
  {
    id: 'sanjia_vs_grass',
    stage: 'jobhunt',
    title: '三甲还是基层',
    body: '招聘季。顶尖三甲门槛高、内卷狠；县城医院编制稳、患者轻。两条路，两种人生。',
    category: 'career',
    weight: 100,
    once: true,
    choices: [
      { text: '冲三甲，拼前程', delta: { reputation: 5, stamina: -8, sanity: -4 }, flagSet: 'offer_sanjia', consequence: '你投出了十几份三甲简历。' },
      { text: '去基层，求安稳', delta: { sanity: 6, reputation: -2, money: 500 }, flagSet: 'offer_grass', consequence: '县城医院当场给了你编制意向。' },
    ],
  },
  {
    id: 'bianzhi_vs_contract',
    stage: 'jobhunt',
    title: '编制还是合同', body: '同一家医院，编内和编外的差别不止在工资条。父母说"没编制等于临时工"。',
    category: 'career',
    weight: 90,
    once: true,
    choices: [
      { text: '死磕编制岗', delta: { reputation: 4, stamina: -6, sanity: -4 }, flagSet: 'bianzhi', consequence: '你报了竞争比 1:40 的编制岗。' },
      { text: '先签合同制干着', delta: { sanity: 3, money: 1000 }, flagSet: 'contract', consequence: '你告诉自己"以后再说"。' },
    ],
  },
  // 死磕编制的回响：考编结果（深挖第五部分 R24 补消费者）
  {
    id: 'bianzhi_result',
    stage: 'jobhunt',
    title: '编制岗的结局',
    body: '1:40 的竞争比，笔试、面试、体检、政审一路走完。等公示的日子，你连手机震动都心跳加速。',
    category: 'career',
    weight: 60,
    once: true,
    requireFlag: 'bianzhi',
    minTurn: 2,
    choices: [
      { text: '上岸了，正式入编', delta: { reputation: 6, sanity: 8, stamina: -4 }, flagSet: 'jh_bianzhi_in', consequence: '公示名单里有你的名字。爸妈比你还高兴，你终于"有编制"了。' },
      { text: '差一名，落榜', delta: { reputation: -3, sanity: -8, stamina: -4 }, flagSet: 'jh_bianzhi_out', consequence: '名单上你排在前一名之后。你关掉网页，想了很久下一步。' },
    ],
  },
  {
    id: 'interview_written',
    stage: 'jobhunt',
    title: '面试与笔试',
    body: '结构化面试 + 专业笔试 + 临床技能考核，三轮下来你像被扒了一层皮。',
    category: 'career',
    weight: 85,
    choices: [
      { text: '苦练，反复模拟', delta: { knowledge: 4, reputation: 3, stamina: -10 }, consequence: '你对着镜子练了一周自我介绍。' },
      { text: '临场发挥', delta: { reputation: 1, sanity: -3 }, consequence: '你靠本能撑了下来。' },
    ],
  },
  {
    id: 'city_choice',
    stage: 'jobhunt',
    title: '去哪里落脚',
    body: '一线城市的offer薪水高但房价吓人；老家的医院平平淡淡却有烟火气。',
    category: 'career',
    weight: 80,
    once: true,
    choices: [
      { text: '留一线城市', delta: { reputation: 4, stamina: -6, sanity: -3 }, flagSet: 'city_tier1', consequence: '你租了间朝北的隔断房。' },
      { text: '回老家', delta: { sanity: 8, relations: 5, money: 800 }, flagSet: 'city_home', consequence: '母亲早把客房收拾好了。' },
    ],
  },
  {
    id: 'salary_negotiation',
    stage: 'jobhunt',
    title: '薪资谈判',
    body: '"你期望薪资？"HR 笑着问。你脑子里闪过租房和房贷的数字。',
    category: 'financial',
    weight: 75,
    choices: [
      { text: '据理力争', delta: { money: 3000, reputation: 2, sanity: -3 }, consequence: '你拿到了比预期高的一档。' },
      { text: '不敢谈，接受', delta: { sanity: -2, money: 0 }, consequence: '你怕失去 offer，没开口。' },
    ],
  },
  {
    id: 'recommendation_letter',
    stage: 'jobhunt',
    title: '导师的推荐',
    body: '一封分量重的推荐信，能敲开很多门。但你上次和导师闹过不愉快。',
    category: 'career',
    weight: 65,
    choices: [
      { text: '厚脸皮去要', delta: { reputation: 5, knowledge: 2 }, flagSet: 'got_recommend', consequence: '导师爽快地签了字。' },
      { text: '自己硬投，不麻烦', delta: { reputation: -1, sanity: -1 }, consequence: '你靠自己的简历闯。' },
    ],
  },
  {
    id: 'offer_rejection',
    stage: 'jobhunt',
    title: '收到的拒信',
    body: '"很遗憾，您未达到我单位本次招聘要求。"第三封拒信，语气一模一样。',
    category: 'social',
    weight: 60,
    choices: [
      { text: '复盘，继续投', delta: { knowledge: 3, sanity: -4 }, consequence: '你把拒信归档，继续海投。' },
      { text: '开始自我怀疑', delta: { sanity: -8, relations: -2 }, consequence: '你删了招聘APP，又装了回来。' },
    ],
  },
  {
    id: 'multi_offer_dilemma',
    stage: 'jobhunt',
    title: '两个 offer',
    body: '私立医院薪水诱人，公立医院名正言顺。签字截止日就在明天。',
    category: 'career',
    weight: 70,
    once: true,
    choices: [
      { text: '选高薪私立', delta: { money: 5000, reputation: 1, sanity: -2 }, flagSet: 'took_private', consequence: '你签了私立，提成写进了合同。' },
      { text: '选公立稳妥', delta: { reputation: 5, sanity: 2 }, flagSet: 'took_public', consequence: '你穿上了公立医院的工作服。' },
    ],
  },
];
