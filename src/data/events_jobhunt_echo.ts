import type { GameEvent } from './events';

// 求职季的"因果兑现"：把读博/双线偏向/学术造假/学术背景/规培证等前置 flag，
// 在找工作这个人生关口一一回响。求职阶段本身只有 4 回合、8 条手写事件，
// 是全流程里前置选择联动最薄的一段——这里把它补齐。
//
// 全部用 requireFlag / requireStat 精确门控，只在玩家确实做过对应选择时出现。
export const JOBHUNT_ECHO_EVENTS: GameEvent[] = [
  // —— 学历：博士 vs 硕士 vs 本科 ——
  {
    id: 'jhe_phd_premium',
    stage: 'jobhunt',
    title: '博士的敲门砖',
    body: '三甲医院的招聘简章上写着"原则上要求博士学历"。你的学位证，这一刻成了硬通货。',
    category: 'career', weight: 80, once: true, requireFlag: 'phd_graduated',
    choices: [
      { text: '直接投最好的科室', delta: { reputation: 6, sanity: -2 }, flagSet: 'jh_phd_apply', consequence: '简历过了初筛，你进了面试短名单。' },
      { text: '挑个能做课题的平台', delta: { reputation: 4, research: 4 }, flagSet: 'jh_research_platform', consequence: '你更看重能不能接着做研究。' },
    ],
  },
  {
    id: 'jhe_no_phd_wall',
    stage: 'jobhunt',
    title: '学历这道墙',
    body: '心仪的三甲把门槛卡在博士。你只有硕士，简历在第一轮就被筛了下来。HR 委婉地说"建议考虑我们的合同岗"。',
    category: 'career', weight: 75, once: true, requireFlag: 'no_phd',
    choices: [
      { text: '认了，先合同岗进去', delta: { sanity: -4, reputation: 1 }, flagSet: 'contract', consequence: '你想：先上车，再想办法转编。' },
      { text: '转投市级医院编制岗', delta: { sanity: 2, reputation: 2 }, flagSet: 'jh_chase_bianzhi', consequence: '你把目标从"最好"调成了"稳妥"。' },
      { text: '一边工作一边准备考博', delta: { knowledge: 3, stamina: -8, sanity: -3 }, flagSet: 'will_phd', consequence: '你把考博的书又翻了出来。' },
    ],
  },

  // —— 双线偏向：临床型 vs 科研型 ——
  {
    id: 'jhe_clinical_strong',
    stage: 'jobhunt',
    title: '一双好手的分量',
    body: '面试的临床技能考核里，你操作干净利落，主考的科主任当场就多问了两句。',
    category: 'career', weight: 70, once: true, requireStat: { clinical: [40, 999] },
    choices: [
      { text: '亮出全部本事', delta: { reputation: 5, clinical: 2 }, flagSet: 'jh_clinical_ace', consequence: '主任说："这样的苗子，我们要了。"' },
      { text: '稳扎稳打不冒进', delta: { reputation: 3, sanity: 2 }, consequence: '你没抢风头，但分数不低。' },
    ],
  },
  {
    id: 'jhe_research_strong',
    stage: 'jobhunt',
    title: '论文换来的青睐',
    body: '有科研平台的附属医院看中了你的发表记录——他们正缺能写标书、能出成果的人。',
    category: 'career', weight: 70, once: true, requireStat: { research: [40, 999] },
    choices: [
      { text: '走临床科研双肩挑', delta: { reputation: 5, research: 3, stamina: -6 }, flagSet: 'jh_dual_role', consequence: '合同里写明了科研启动经费。' },
      { text: '担心变成纯做实验', delta: { sanity: -2, reputation: 2 }, consequence: '你反复问自己还想不想碰病人。' },
    ],
  },
  {
    id: 'jhe_lopsided_jobhunt',
    stage: 'jobhunt',
    title: '被问到的短板',
    body: '面试官翻着你的简历："临床和科研，你好像有一头明显偏弱。我们这儿两样都要。"',
    category: 'career', weight: 60, once: true,
    requireStat: { clinical: [0, 20] },
    choices: [
      { text: '坦承并说改进计划', delta: { reputation: 2, sanity: -3 }, consequence: '你把短板说成了"正在补的方向"。' },
      { text: '硬撑说自己都行', delta: { reputation: -3, sanity: -2 }, consequence: '面试官不置可否地记了一笔。' },
    ],
  },

  // —— 学术造假的尾巴：求职政审/背景核查 ——
  {
    id: 'jhe_fake_background_check',
    stage: 'jobhunt',
    title: '入职前的背景核查',
    body: 'offer 发下来前，医院要做学术背景核查，要求提供代表作原始数据。你想起那几篇"处理过"的图。',
    category: 'system', weight: 85, once: true, requireFlag: 'phd_fake',
    choices: [
      {
        text: '主动说明，撤下有问题的那篇',
        delta: { papers: -1, reputation: -4, sanity: -5 },
        effect: { kind: 'selfReport' },
        flagSet: 'jh_fake_confessed',
        consequence: '你赶在核查前撤了稿。HR 皱眉，但录用没有取消。',
      },
      {
        text: '赌他们查不到原始数据',
        delta: { sanity: -8 },
        effect: { kind: 'fake', severity: 'minor' },
        flagSet: 'jh_fake_gambled',
        consequence: '你补了一份"整理后"的数据交上去，整晚没睡踏实。',
      },
    ],
  },
  {
    id: 'jhe_fake_paper_undergrad_tail',
    stage: 'jobhunt',
    title: '当年那篇挂名',
    body: '政审表要求列出全部学术成果。本科那篇花钱挂名的水刊，填还是不填？',
    category: 'system', weight: 70, once: true, requireFlag: 'ug_fake_hidden',
    choices: [
      { text: '不填，当它不存在', delta: { sanity: -5 }, flagSet: 'jh_hid_ug_fake', consequence: '你把那行删了，手指悬了很久。' },
      { text: '如实填，附情况说明', delta: { reputation: -2, sanity: 2 }, flagSet: 'jh_disclosed_ug_fake', consequence: '你写清了原委，反而松了口气。' },
    ],
  },

  // —— 规培证 / 执医证：求职硬门槛 ——
  {
    id: 'jhe_cert_gate',
    stage: 'jobhunt',
    title: '两证在手',
    body: '招聘要求白纸黑字：执业医师证 + 规培合格证，缺一不可。你翻出证书，心里踏实。',
    category: 'career', weight: 75, once: true, requireFlag: 'has_gp_cert',
    choices: [
      { text: '证件齐全，从容应聘', delta: { reputation: 4, sanity: 3 }, consequence: '你不用像有些人那样卡在门槛外。' },
    ],
  },

  // —— 导师推荐信的后续 ——
  {
    id: 'jhe_recommend_pays',
    stage: 'jobhunt',
    title: '推荐信起了作用',
    body: '你导师在业内的一句话，比十份简历都管用。对方科主任是他的老同学。',
    category: 'social', weight: 65, once: true, requireFlag: 'got_recommend',
    choices: [
      { text: '珍惜这份人情', delta: { reputation: 5, relations: 3 }, flagSet: 'jh_referral_in', consequence: '你记下：这份人情，往后要还。' },
    ],
  },
];
