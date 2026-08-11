import type { GameEvent } from './events';

// 真实人生事件：恋爱 / 结婚 / 生子 / 家人重病与离世 等。
// 通过 weight 控制"一定概率触发"，通过 requireMarital / excludeFlag 控制前置条件；
// 选择会经 effect（声明式副作用，实现见 effects.ts）真实改写婚姻/家庭状态，
// 并经由经济模块产生持续影响。
export const LIFE_EVENTS: GameEvent[] = [
  // —— 1. 遇见心动的人（仅单身时）——
  {
    id: 'life_meet_love',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career', 'pinnacle'],
    title: '认识新的人',
    body: '朋友组了一个饭局，也有人给你介绍了合适的对象。要不要认真认识一下？',
    category: 'personal', weight: 80, requireMarital: 'single', requireFlag: 'dating_opportunity',
    choices: [
      {
        text: '认真赴约，看看能否继续发展',
        delta: { stamina: -3 },
        consequence: '结果取决于你的外貌、经济基础和当下状态。',
        effect: { kind: 'attemptDating' },
      },
      {
        text: '暂时不考虑，婉拒介绍',
        delta: { knowledge: 5, relations: 3 },
        flagSet: 'dating_opportunity_declined',
        effect: { kind: 'clearFlag', flag: 'dating_opportunity' },
        consequence: '这次机会过去了。',
      },
    ],
  },

  // —— 2. 恋爱中的日常（仅恋爱时）——
  {
    id: 'life_dating_life',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '恋爱进行时',
    body: '约会与复习/值班在抢时间。感情需要经营，钱包也在抗议。',
    category: 'personal', weight: 12, requireMarital: 'dating',
    choices: [
      { text: '精心安排一次约会', delta: { money: -500, sanity: 10, relations: 6 }, consequence: 'ta笑得很开心。' },
      { text: '因太忙而冷战', delta: { sanity: -8, relations: -6 }, consequence: '消息已读不回。' },
      {
        text: '提分手，回归一个人', delta: { sanity: -10, relations: -8 },
        consequence: '你把自己重新塞回忙碌里。',
        effect: { kind: 'breakup' },
      },
    ],
  },

  // —— 3. 求婚结婚（仅恋爱、且有一定积蓄时）——
  {
    id: 'life_marry',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '谈婚论嫁',
    body: '在一起久了，双方家庭开始催婚。你攒下了一点钱，是时候给彼此一个交代吗？',
    category: 'personal', weight: 9, requireMarital: 'dating', requireStat: { money: [1500, 1000000] },
    newsTickerAfter: '【民政部数据：初婚平均年龄持续推迟】',
    choices: [
      {
        text: '风风光光办婚礼', delta: { money: -8000, sanity: 15, relations: 15, reputation: 5 },
        consequence: '酒席上你牵着ta的手，红了眼眶。',
        effect: { kind: 'marry' },
      },
      {
        text: '只领证不办酒', delta: { money: -1000, sanity: 10, relations: 10 },
        consequence: '两张红本，比任何仪式都踏实。',
        effect: { kind: 'marry' },
      },
      { text: '再等等，事业要紧', delta: { relations: -3 }, consequence: '你把戒指先收进了抽屉。' },
    ],
  },

  // —— 4. 婚后日常（仅已婚时）——
  {
    id: 'life_married_life',
    stage: ['guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '柴米油盐',
    body: '婚后生活不是只有浪漫。谁洗碗、回谁家过年，都是新的课题。',
    category: 'personal', weight: 10, requireMarital: 'married',
    choices: [
      { text: '一起做饭，温馨片刻', delta: { sanity: 8, relations: 5, stamina: -3 }, consequence: '厨房里飘着烟火气。' },
      { text: '为家务吵了一架', delta: { sanity: -8, relations: -6 }, consequence: '冷战了一整晚。' },
      { text: '各自加班，聚少离多', delta: { reputation: 4, sanity: -4, relations: -4 }, consequence: '你们在客厅错身而过。' },
    ],
  },

  // —— 5. 生孩子（仅已婚、且未育时）——
  {
    id: 'life_childbirth',
    stage: ['guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '新生命',
    body: '你们讨论要不要一个孩子。病房与奶粉钱都在前方等着。',
    category: 'personal', weight: 7, requireMarital: 'married', excludeFlag: 'has_child',
    newsTickerAfter: '【生育支持政策再加码：多地上调育儿补贴标准】',
    choices: [
      {
        text: '迎接宝宝到来', delta: { money: -6000, stamina: -10, sanity: 12, relations: 10 },
        consequence: '一声啼哭，你忽然有了软肋，也有了铠甲。',
        effect: { kind: 'childborn' },
      },
      { text: '暂时不要，再拼几年', delta: { relations: -3 }, consequence: '你们把育儿计划又推后了些。' },
    ],
  },

  // —— 6. 孩子成长（仅已育时）——
  {
    id: 'life_child_grow',
    stage: ['jobhunt', 'career'],
    title: '为人父母',
    body: '孩子会跑了，也会闹了。陪不陪，是每天的选择题。',
    category: 'personal', weight: 5, requireFlag: 'has_child',
    choices: [
      { text: '推掉应酬陪孩子', delta: { sanity: 8, relations: 6, reputation: -3, stamina: -4 }, consequence: 'ta趴在你肩上说最喜欢爸爸/妈妈。' },
      { text: '加班赚钱养家', delta: { money: 800, reputation: 4, sanity: -5, relations: -3 }, consequence: '你看着监控里睡着的ta，鼻子一酸。' },
    ],
  },

  // —— 7. 家人重病（任何阶段，消耗钱与精力）——
  {
    id: 'life_family_ill',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '家人的病倒',
    body: '一通电话：家里老人查出了大病。你一边轮转一边心力交瘁。',
    category: 'personal', weight: 6,
    choices: [
      { text: '请假回去照顾', delta: { money: -4000, stamina: -12, sanity: -8, knowledge: -4 }, consequence: '你在病床前守了很久。' },
      { text: '花钱请护工', delta: { money: -6000, sanity: -4 }, consequence: '你只能隔着屏幕问一句“今天好点没”。' },
      { text: '实在分身乏术', delta: { sanity: -12, relations: -6 }, consequence: '愧疚像潮水一样淹过来。' },
    ],
  },

  // —— 8. 父亲离世（一次性）——
  {
    id: 'life_death_father',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '父亲走了',
    body: '父亲突发心梗，没来得及道别。你想起他总说“学医好，稳定”。',
    category: 'personal', weight: 4, once: true, excludeFlag: 'lost_father',
    choices: [
      {
        text: '回老家奔丧', delta: { money: -3000, sanity: -22, knowledge: -5 },
        consequence: '白幡下，你第一次觉得自己是大人了。',
        effect: { kind: 'loseKin', who: 'father' },
      },
      {
        text: '值班走不开，远程悼念', delta: { money: -800, sanity: -16, reputation: 5, relations: -5 },
        consequence: '你对着北方的方向鞠了三个躬。',
        effect: { kind: 'loseKin', who: 'father' },
      },
    ],
  },

  // —— 9. 母亲离世（一次性）——
  {
    id: 'life_death_mother',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '母亲走了',
    body: '母亲缠绵病榻许久，最终还是松了手。最爱你的人，去了。',
    category: 'personal', weight: 4, once: true, excludeFlag: 'lost_mother',
    choices: [
      {
        text: '回去陪她走完最后一程', delta: { money: -3000, sanity: -22, knowledge: -5 },
        consequence: '你握着那只越来越凉的手，哭了很久。',
        effect: { kind: 'loseKin', who: 'mother' },
      },
      {
        text: '因考试/值班无法离开', delta: { money: -800, sanity: -16, reputation: 5, relations: -5 },
        consequence: '你把自己埋进忙碌里，假装没事。',
        effect: { kind: 'loseKin', who: 'mother' },
      },
    ],
  },

  // —— 10. 祖辈离世（一次性，冲击较小）——
  {
    id: 'life_death_grandparent',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '祖辈离世',
    body: '从小带你的爷爷奶奶/外公外婆，到了该说再见的时候。',
    category: 'personal', weight: 3, once: true, excludeFlag: 'lost_grandparent',
    choices: [
      {
        text: '回去送最后一程', delta: { money: -1500, sanity: -12 },
        consequence: '老照片里，ta正笑着看你。',
        effect: { kind: 'loseKin', who: 'grandparent' },
      },
      {
        text: '遥寄哀思', delta: { sanity: -8 },
        consequence: '你在心里默默说了句“走好”。',
        effect: { kind: 'loseKin', who: 'grandparent' },
      },
    ],
  },

  // —— 11. 结婚纪念日（仅已婚时）——
  {
    id: 'life_anniversary',
    stage: ['guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '结婚纪念日',
    body: '今天是个特别的日子。你准备好怎么过了吗？',
    category: 'personal', weight: 4, requireMarital: 'married',
    choices: [
      { text: '用心准备礼物', delta: { money: -800, sanity: 10, relations: 8 }, consequence: 'ta拆开礼物时眼睛亮了。' },
      { text: '忙忘了', delta: { sanity: -6, relations: -8 }, consequence: '你看到日历才猛地想起。' },
    ],
  },

  // —— 12. 异地（恋爱或已婚时）——
  {
    id: 'life_long_distance',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career'],
    title: '异地',
    body: '你被分到了外地规培/工作，ta还在原地。距离开始考验感情。',
    category: 'personal', weight: 5, requireMarital: 'dating',
    choices: [
      { text: '坚持，常视频常奔波', delta: { money: -1000, sanity: -4, relations: 4 }, consequence: '高铁票攒了一沓。' },
      {
        text: '受不了，分手算了', delta: { sanity: -8, relations: -8 },
        consequence: '对话框最后一句是“祝你幸福”。',
        effect: { kind: 'breakup' },
      },
    ],
  },
];
