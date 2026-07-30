import type { GameEvent } from './events';

// 导师关系事件：trust_advisor / distant_advisor 由 npc.changeAffinity 在跨阈值时写入。
// 这些事件只在硕博/职业阶段出现，把"好感度"兑现为真实的资源或压力。
export const ADVISOR_EVENTS: GameEvent[] = [
  {
    id: 'adv_letter',
    stage: ['master', 'phd'],
    title: '一封推荐信',
    body: '出国交流的名额卡在推荐信上。周教授的名字分量很重——前提是他愿意写。',
    category: 'career', weight: 50, minTurn: 4, once: true,
    requireFlag: 'trust_advisor',
    choices: [
      { text: '开口请他写', delta: { reputation: 6, research: 4, relations: 3 }, flagSet: 'got_advisor_letter', consequence: '信写得很实在。你读完脸发热，也更不敢松懈。' },
      { text: '不好意思开口', delta: { sanity: -3 }, consequence: '名额给了同门。你没说什么。' },
    ],
  },
  {
    id: 'adv_defend',
    stage: ['phd', 'career'],
    title: '有人质疑你的工作',
    body: '学术会议上，有人当众质疑你的方法学。周教授坐在第二排。',
    category: 'social', weight: 45, minTurn: 3, once: true,
    requireFlag: 'trust_advisor',
    choices: [
      { text: '自己沉住气答辩', delta: { research: 5, reputation: 4, sanity: -4 }, consequence: '你答完，他轻微点了下头。比任何口头表扬都重。' },
      { text: '看向他，等他出面', delta: { relations: 2, reputation: -2, sanity: 2 }, consequence: '他站起来说了两句。会后他说："下次你自己扛。"' },
    ],
  },
  {
    id: 'adv_cold',
    stage: ['master', 'phd'],
    title: '组会没叫到你',
    body: '连续两次组会，周教授跳过了你的名字。同门假装没注意到。',
    category: 'mental', weight: 50, minTurn: 3,
    requireFlag: 'distant_advisor',
    choices: [
      { text: '会后堵在门口问清楚', delta: { sanity: -6, research: 2, stamina: -4 }, consequence: '他说"拿得出东西再来找我"。你一夜没睡。' },
      { text: '自己闷头补进度', delta: { research: 6, stamina: -14, sanity: -8 }, consequence: '三周后他终于在组会上停在了你这一页。' },
      { text: '开始考虑换导师', delta: { sanity: 4, relations: -6, reputation: -3 }, flagSet: 'considering_switch_advisor', consequence: '这个念头一旦冒出来，就很难收回去。' },
    ],
  },
  {
    id: 'adv_coauthor',
    stage: ['phd', 'career'],
    title: '通讯作者',
    body: '文章要投了。按贡献，通讯该是你；按规矩，很多组会挂导师。周教授看了你一眼。',
    category: 'career', weight: 45, minTurn: 5, once: true,
    requireFlag: 'trust_advisor',
    choices: [
      { text: '通讯给你，他作共同通讯', delta: { papers: 1, research: 4, reputation: 5, relations: 4 }, consequence: '他说："你做的，就该是你的。"' },
      { text: '坚持他挂通讯，自己一作', delta: { papers: 1, relations: 6, reputation: 2 }, consequence: '他没反对。你自己知道差在哪。' },
    ],
  },
  {
    id: 'adv_career_call',
    stage: 'career',
    title: '导师的一通电话',
    body: '你已经毕业多年。某天晚上，周教授打来电话："有个协作中心的位置，我想推荐你。还做不做真东西？"',
    category: 'career', weight: 40, minTurn: 4, once: true,
    requireFlag: 'trust_advisor',
    choices: [
      { text: '做，去', delta: { research: 8, reputation: 6, clinical: -3, stamina: -8 }, flagSet: 'advisor_career_boost', consequence: '你重新有了一张干净的实验台。' },
      { text: '临床走得顺，先不折腾', delta: { clinical: 4, sanity: 4, relations: 2 }, consequence: '他说"也好"。电话那头烟味很重。' },
    ],
  },
  {
    id: 'adv_ask_fake',
    stage: ['master', 'phd'],
    title: '他问你数据',
    body: '周教授指着你图上的一个点："这个，原始记录呢？"你的手心开始出汗。',
    category: 'system', weight: 55, minTurn: 4, once: true,
    requireFlag: 'has_faked',
    choices: [
      {
        text: '坦白：有几个点被动过',
        delta: { reputation: -4, sanity: 6, research: -3 },
        effect: { kind: 'selfReport' },
        consequence: '他沉默很久，说："重做。从今天起，你的原始数据每周交一次。"',
      },
      {
        text: '说文件在另一台电脑上',
        delta: { sanity: -12, reputation: -2 },
        consequence: '他没再问。你不知道他是信了，还是懒得拆穿。',
      },
    ],
  },
];
