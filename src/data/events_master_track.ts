import type { GameEvent } from './events';

// 硕博阶段的双线正向内容（补 M3 缺口）。
//
// 背景：硕博是"专硕临床型 vs 学硕科研型"分野最该体现的阶段（track_clinical /
// track_research 标记也在这里设），但原有硕博事件几乎不读写 clinical/research 两个
// 数值轴——专硕线更是只有 excludeFlag 把科研事件排除掉，缺少自己的正向内容。
// 这里补齐：让两条线在硕博都有实感，并接入导师好感度（trust_advisor / distant_advisor）。
//
// 门控约定：
//  - 专硕临床型：excludeFlag: 'track_research'（即 track_clinical 或未分线者可见）
//  - 学硕科研型：excludeFlag: 'track_clinical'
export const MASTER_TRACK_EVENTS: GameEvent[] = [
  // ========== 专硕 · 临床型（读写 clinical 轴） ==========
  {
    id: 'mt_pro_ward_rotation',
    stage: ['master', 'phd'],
    excludeFlag: 'track_research',
    title: '专硕的病房日常',
    body: '专硕的三年，一半在病房。今天主任查房点你汇报病例，台下十几双眼睛盯着你。',
    category: 'clinical', weight: 80, minTurn: 1,
    choices: [
      { text: '准备充分，条理清晰', delta: { clinical: 6, reputation: 3, stamina: -8 }, consequence: '主任点头："规培的底子打得不错。"' },
      { text: '临时抱佛脚，磕磕绊绊', delta: { clinical: 2, sanity: -4, stamina: -6 }, consequence: '你被追问得冒汗，记下了几个盲点。' },
      { text: '偷偷做点自己的科研', delta: { research: 4, clinical: -3, sanity: -2 }, consequence: '你在病历系统里存了一批待分析的数据。' },
    ],
  },
  {
    id: 'mt_pro_skill_certify',
    stage: ['master', 'phd'],
    excludeFlag: 'track_research',
    title: '技能出师考核',
    body: '专硕要过一系列临床操作考核才能毕业。带教把你拉到模拟中心："这套流程，闭着眼也得做对。"',
    category: 'clinical', weight: 70, minTurn: 3,
    choices: [
      { text: '反复练到形成肌肉记忆', delta: { clinical: 7, stamina: -10, sanity: -3 }, flagSet: 'mt_skill_certified', consequence: '考核那天你行云流水，考官签了字。' },
      { text: '差不多就行，先应付过去', delta: { clinical: 2, reputation: -2 }, consequence: '你压线通过，心里没底。' },
    ],
  },
  {
    id: 'mt_pro_clinical_paper',
    stage: ['master', 'phd'],
    excludeFlag: 'track_research',
    title: '临床出身的论文',
    body: '专硕也要发文章毕业。你管过的病人里，恰好攒下一组罕见病例——这是临床人写论文的天然优势。',
    category: 'study', weight: 65, minTurn: 4,
    requireStat: { clinical: [30, 999] },
    choices: [
      { text: '把病例写成个案报道', delta: { research: 4, papers: 1, clinical: 2, stamina: -8 }, consequence: '审稿人说"临床资料翔实"，你笑了——这是你的主场。' },
      { text: '找学硕同门帮忙做统计', delta: { research: 3, papers: 1, relations: 3, stamina: -5 }, consequence: '你们合作了一篇，各取所长。' },
    ],
  },

  // ========== 学硕 · 科研型（读写 research 轴） ==========
  {
    id: 'mt_aca_bench_grind',
    stage: ['master', 'phd'],
    excludeFlag: 'track_clinical',
    title: '实验台前的日与夜',
    body: '学硕的日子在超净台和细胞房里流走。同一个实验重复第七遍，你开始怀疑人生，也开始懂了手感。',
    category: 'study', weight: 80, minTurn: 1,
    choices: [
      { text: '沉下心把手艺练精', delta: { research: 6, knowledge: 3, stamina: -8, sanity: -3 }, consequence: '你成了组里养细胞最稳的人。' },
      { text: '偷偷去门诊跟个班', delta: { clinical: 4, research: -3, sanity: 2 }, consequence: '你怕自己毕业就不会看病了。' },
      { text: '摸鱼刷文献综述', delta: { knowledge: 2, sanity: 3, research: -1 }, consequence: '你读得多做得少，进度条没动。' },
    ],
  },
  {
    id: 'mt_aca_first_grant',
    stage: ['master', 'phd'],
    excludeFlag: 'track_clinical',
    title: '第一次写标书',
    body: '导师让你试着申一个研究生创新项目。几万块经费，却是你科研独立的第一步。',
    category: 'career', weight: 65, minTurn: 3,
    requireStat: { research: [25, 999] },
    choices: [
      { text: '认真磨标书，反复改', delta: { research: 6, knowledge: 3, stamina: -8 }, flagSet: 'mt_grant_won', consequence: '中了。虽小，却是你名字打头的第一个项目。' },
      { text: '套模板草草交差', delta: { research: 1, sanity: 2 }, consequence: '没中，评审意见写着"创新性不足"。' },
    ],
  },
  {
    id: 'mt_aca_impact_race',
    stage: ['master', 'phd'],
    excludeFlag: 'track_clinical',
    title: '影响因子的军备竞赛',
    body: '同门发了篇 5 分的文章，组会上被表扬。你的数据只够投个 2 分的。要不要赌一把冲高分期刊？',
    category: 'study', weight: 60, minTurn: 5,
    requireStat: { research: [40, 999] },
    choices: [
      { text: '补实验，冲高分', delta: { research: 5, papers: 1, stamina: -14, sanity: -6 }, consequence: '多花了半年，但文章档次上去了。' },
      { text: '见好就收，先发出来', delta: { research: 2, papers: 1, sanity: 2 }, consequence: '你把"毕业"看得比"面子"重。' },
    ],
  },

  // ========== 导师好感度兑现（trust / distant） ==========
  {
    id: 'mt_advisor_trust_resource',
    stage: ['master', 'phd'],
    requireFlag: 'trust_advisor',
    title: '导师把你当自己人',
    body: '导师私下找你："有个国合项目缺人手，带你见见世面。"这种机会，平时轮不到学生。',
    category: 'career', weight: 55, once: true, minTurn: 2,
    choices: [
      { text: '珍惜机会，全力以赴', delta: { research: 6, reputation: 4, knowledge: 3, stamina: -8 }, consequence: '你在项目里挂了名，也真学到了东西。' },
      { text: '担心占用太多时间', delta: { sanity: 2, research: 2 }, consequence: '你婉拒了，导师说"想清楚随时来找我"。' },
    ],
  },
  {
    id: 'mt_advisor_distant_cost',
    stage: ['master', 'phd'],
    requireFlag: 'distant_advisor',
    title: '导师的冷淡',
    body: '你和导师的关系降到冰点。组会上他很少点评你的进展，签字时也总说"再改改"。',
    category: 'mental', weight: 55, minTurn: 2,
    choices: [
      { text: '主动约谈，试着修复', delta: { relations: 4, sanity: -3, research: 2 }, consequence: '气氛尴尬，但至少话说开了一点。' },
      { text: '自己闷头干，少打交道', delta: { research: 3, sanity: -5, reputation: -2 }, consequence: '你把委屈咽下去，进度全靠自己扛。' },
    ],
  },
];
