import type { GameEvent } from './events';

// 院校档次叙事：让高考选校的 tier 真正影响后续事件（阶层/出路差异）。
// 标记在学校选定后于 GaokaoScene 写入：school_tier_1 ~ school_tier_4。
export const TRACK_EVENTS: GameEvent[] = [
  {
    id: 'long_sys_step_down',
    stage: ['undergrad', 'master', 'phd'],
    title: '中途下车',
    body: '培养办发来一张表：长学制可以申请中途转出。你不会从零开始，但直通硕博的承诺也会随之消失。',
    category: 'career', weight: 32, once: true, minTurn: 4,
    requireFlag: 'long_system',
    excludeFlag: 'long_sys_transferred',
    choices: [
      { text: '下车，转入普通培养路线', delta: { sanity: 8, reputation: -2 }, effect: { kind: 'transferLongSystem' }, consequence: '你交了申请。已经学到的知识和临床手感留下来，下一步改按短学制、规培和求职路线走。' },
      { text: '继续扛住长学制', delta: { stamina: -8, knowledge: 4, sanity: -4 }, flagSet: 'long_sys_stayed_after_exit_offer', consequence: '你把表收进抽屉，重新打开教材。' },
    ],
  },
  {
    id: 'track_tier1_pressure',
    stage: ['master', 'phd', 'career'],
    title: '同辈的压力',
    body: '同学群又在晒顶刊 / 国自然。你低头看了看自己空白的综述，喉咙发紧。',
    category: 'mental', weight: 30, requireFlag: 'school_tier_1',
    choices: [
      { text: '卷一篇综述出来', delta: { papers: 1, knowledge: 4, stamina: -12, sanity: -6 }, consequence: '你熬了三个通宵，终于有了署名。' },
      { text: '承认自己卷不动', delta: { sanity: 4, relations: 2 }, consequence: '你退了群，去操场跑了五公里。' },
    ],
  },
  {
    id: 'track_tier4_grassroots',
    stage: ['guipei', 'jobhunt', 'career'],
    title: '回到基层',
    body: '家乡县医院来信：有编制、安稳、离家近。大城市的霓虹很美，但也真的很贵。',
    category: 'career', weight: 28, requireFlag: 'school_tier_4',
    choices: [
      { text: '回县医院，图个安稳', delta: { relations: 6, sanity: 4, reputation: 2, money: 500 }, flagSet: 'chose_grassroots', consequence: '父母在电话那头笑出了声。' },
      { text: '还是想去大城市闯', delta: { sanity: -3, knowledge: 3 }, consequence: '你把那封信收进了抽屉最里层。' },
    ],
  },
  {
    id: 'track_tier4_honor',
    stage: ['guipei', 'career'],
    title: '县城的依靠',
    body: '因为你是从这儿考出去的"大学生"，街坊看病都爱找你问一句。你忽然有了重量。',
    category: 'social', weight: 22, requireFlag: 'school_tier_4', excludeFlag: 'chose_grassroots',
    choices: [
      { text: '认真帮乡亲把关', delta: { reputation: 4, relations: 4, stamina: -3 }, consequence: '你在县里成了"靠谱的娃"。' },
      { text: '保持距离，别惹麻烦', delta: { relations: -2, sanity: 2 }, consequence: '你学会了礼貌地打太极。' },
    ],
  },

  // —— 开学：院校档次在大学起点就显出差别（此前仅 tier1/tier4 有叙事，现补齐 2/3 并让每档都从入学起有回声）——
  {
    id: 'track_tier1_freshman',
    stage: 'undergrad', title: '开学第一天，全是高手',
    body: '你走进基础医学院。左右同学不是竞赛保送就是裸分状元。你忽然觉得，自己那点骄傲不够看。',
    category: 'mental', weight: 30, once: true, requireFlag: 'school_tier_1', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '把差距当动力', delta: { knowledge: 4, stamina: -6, sanity: -2 }, consequence: '你悄悄把作息排到了凌晨两点。' },
      { text: '承认自己会紧张', delta: { sanity: 5, relations: 3 }, consequence: '你和同桌吐槽，意外成了朋友。' },
    ],
  },
  {
    id: 'track_tier2_freshman',
    stage: 'undergrad', title: '稳稳的起点',
    body: '学校不算顶尖，但实验室、附属医院都齐整。老师说："在这儿，肯干的人出路不差。"',
    category: 'study', weight: 30, once: true, requireFlag: 'school_tier_2', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '踏实啃基础', delta: { knowledge: 5, stamina: -4 }, consequence: '你大一就把系解摸熟了。' },
      { text: '多参加社团', delta: { relations: 5, sanity: 3, knowledge: -2 }, consequence: '你成了学生会里最忙的医学生。' },
    ],
  },
  {
    id: 'track_tier3_freshman',
    stage: 'undergrad', title: '资源少，那就多跑',
    body: '实验室要排队，见习名额靠抢。师兄说："咱们平台一般，想好出路，得自己往外够。"',
    category: 'study', weight: 30, once: true, requireFlag: 'school_tier_3', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '蹭兄弟院校资源', delta: { knowledge: 4, relations: 3, stamina: -6 }, consequence: '你每周跨校去听大课的录播。' },
      { text: '死磕本校教材', delta: { knowledge: 5, sanity: -2 }, consequence: '你把课本翻得起了毛边。' },
    ],
  },
  {
    id: 'track_tier4_freshman',
    stage: 'undergrad', title: '家乡的医学院',
    body: '学校就在本市。爸妈说"离家近，周末能回来吃饭"。你既安心，又有点不甘。',
    category: 'social', weight: 28, once: true, requireFlag: 'school_tier_4', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '接受这份安稳', delta: { sanity: 5, relations: 4 }, consequence: '你每周六准时回家蹭饭。' },
      { text: '想往外走一走', delta: { knowledge: 4, stamina: -2, sanity: -2 }, consequence: '你开始留意考研去大城市的路。' },
    ],
  },

  // —— 职业阶段：二、三档院校的出路回声（此前 tier2/3 在 career 阶段无任何叙事）——
  {
    id: 'track_tier2_career',
    stage: 'career', title: '校友网络的底气',
    body: '面试时对方瞥了眼你的校徽："咱校友。"同届师兄师姐分散在各家医院，消息比招聘网快。',
    category: 'career', weight: 26, once: true, requireFlag: 'school_tier_2', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '用好这层关系', delta: { reputation: 3, relations: 4 }, consequence: '你进了科室的"校友小群"。' },
    ],
  },
  {
    id: 'track_tier3_career',
    stage: 'career', title: '靠自己趟出来的路',
    body: '没有亮眼的校牌，你只能比别人多准备三倍。述职、竞聘，一份份材料你啃下来。',
    category: 'career', weight: 26, once: true, requireFlag: 'school_tier_3', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '把硬实力磨出来', delta: { knowledge: 4, reputation: 3, stamina: -6 }, consequence: '主任说："这小子，踏实。"' },
    ],
  },
];
