import type { GameEvent } from './events';

// 临床 ⇄ 科研 双线事件池（M3）。
//
// 三条设计原则：
//  1) **对抗**：二者共享同一份时间与精力。多数选项一升一降（科研+6 临床-4），
//     让"这一季把时间给谁"成为真实的取舍，而非两条各自增长的独立进度条。
//  2) **互促**：临床积累让临床研究更容易出成果（会诊见得多 → 有真问题可写）；
//     科研训练反过来提升循证决策能力。互促事件用 requireStat 门控，
//     只有一侧真的攒到位了才会出现。
//  3) **造假**：科研压力是造假的直接来源。造假能换来实打实的资源
//     （论文、基金、职称、平台），但会累加 fakeRisk，由 integrity.ts 每季掷骰判定。
//     未引爆时玩家会不断收到"侥幸"事件——这才是最真实的部分。
export const DUALTRACK_EVENTS: GameEvent[] = [
  // ==========================================================
  // 一、时间争夺（对抗）——贯穿实习到职业
  // ==========================================================
  {
    id: 'dt_night_lab_vs_ward',
    stage: ['guipei', 'master', 'phd', 'career'],
    title: '今晚去实验室还是查房',
    body: '晚上七点。培养箱里的细胞等着换液，病房里新收的病人还没写完首程。你只有一个人。',
    category: 'career', weight: 70, minTurn: 2,
    choices: [
      { text: '去实验室，病历明早补', delta: { research: 6, clinical: -4, stamina: -10, reputation: -2 }, consequence: '细胞救回来了。第二天主任问你首程为什么是早上六点写的。' },
      { text: '先把病人管好', delta: { clinical: 6, research: -4, stamina: -8 }, consequence: '病历工工整整。回到宿舍时，你想起那批细胞可能已经过密了。' },
      { text: '两头跑，通宵', delta: { clinical: 3, research: 3, stamina: -20, sanity: -8 }, consequence: '你在两栋楼之间跑了四趟，凌晨三点趴在办公桌上睡着了。' },
    ],
  },
  {
    id: 'dt_grant_deadline',
    stage: ['phd', 'career'],
    title: '标书截止前一周',
    body: '国自然申报还有七天。同一周，你管的组里有三个病人要手术。主任说"你自己安排"。',
    category: 'career', weight: 65, minTurn: 3,
    choices: [
      { text: '请假闭关写标书', delta: { research: 10, clinical: -6, stamina: -14, sanity: -6, reputation: -3 }, flagSet: 'dt_grant_focus', consequence: '标书按时交了。同事替你上了三台台，你欠了三个人情。' },
      { text: '手术优先，标书凑合交', delta: { clinical: 8, research: -3, stamina: -12 }, consequence: '三台手术都很顺。标书写得潦草，你自己都知道中不了。' },
      { text: '今年不报了', delta: { sanity: 6, research: -5, reputation: -2 }, consequence: '你把去年的稿子存进了"明年再说"文件夹。' },
    ],
  },
  {
    id: 'dt_conference_vs_clinic',
    stage: ['master', 'phd', 'career'],
    title: '出国开会还是守着门诊',
    body: '国际会议接收了你的摘要，但会期正好撞上你固定的专家门诊。已经有病人挂了那天的号。',
    category: 'career', weight: 55, minTurn: 4,
    choices: [
      { text: '去开会，门诊请人替', delta: { research: 8, reputation: 4, clinical: -5, money: -12000, relations: -2 }, consequence: '你在国外做了八分钟报告。回来后有位老病人说："我等了你两个月。"' },
      { text: '退摘要，守门诊', delta: { clinical: 6, relations: 5, research: -4, sanity: -3 }, consequence: '你给那位老病人调好了药。会议的邀请函，你收进了抽屉。' },
    ],
  },
  {
    id: 'dt_paper_vs_operation',
    stage: 'career',
    title: '返修意见与急诊手术',
    body: '审稿人给了大修，两周内返回。同一天夜里，急诊送来一个必须马上开的病人——只有你在。',
    category: 'clinical', weight: 60, minTurn: 3,
    choices: [
      { text: '上台，返修拖到最后一天', delta: { clinical: 8, reputation: 4, research: -3, stamina: -16 }, consequence: '病人下台时天亮了。你回办公室，把返修改到了第二天凌晨。' },
      { text: '叫二线来开，自己改稿', delta: { research: 7, clinical: -5, reputation: -4, sanity: -6 }, consequence: '稿子按时返回了。此后一段时间，急诊排班表上你的名字变少了。' },
    ],
  },

  // ==========================================================
  // 二、互促（需要一侧确实攒到位才会出现）
  // ==========================================================
  {
    id: 'dt_clinical_question',
    stage: ['phd', 'career'],
    title: '从病床边长出来的课题',
    body: '你管过的病人里，有一类总在同一个环节出问题。别人看不见，因为他们没管过那么多病人。',
    category: 'career', weight: 55, minTurn: 3,
    requireStat: { clinical: [45, 100] },
    choices: [
      { text: '把它做成真正的临床研究', delta: { research: 10, clinical: 3, papers: 1, knowledge: 5, stamina: -12 }, flagSet: 'dt_real_question', consequence: '审稿人写道："问题来自真实临床，设计朴素但扎实。"' },
      { text: '只是随口跟同事说说', delta: { relations: 3, knowledge: 2 }, consequence: '两年后你在别人的文章里看到了这个题目。' },
    ],
  },
  {
    id: 'dt_evidence_based',
    stage: ['guipei', 'career'],
    title: '指南之外的那个病人',
    body: '病人的情况指南里没写。主任凭经验给了个方案，你想起自己读过的一篇 RCT，结论恰好相反。',
    category: 'clinical', weight: 55, minTurn: 2,
    requireStat: { research: [40, 100] },
    choices: [
      { text: '把文献调出来，和主任讨论', delta: { clinical: 8, research: 3, reputation: 4, relations: -2 }, flagSet: 'dt_evidence_win', consequence: '主任看完摘要，说："按你说的改。"那一刻你觉得读的文献没白读。' },
      { text: '算了，听主任的', delta: { clinical: 2, sanity: -4 }, consequence: '病人后来恢复得一般。你一直记着那篇文献。' },
    ],
  },
  {
    id: 'dt_teaching_loop',
    stage: 'career',
    title: '带教让你重新读了一遍教科书',
    body: '规培生问了你一个"很基础"的问题，你张口就答，回头一查——你答错了。',
    category: 'career', weight: 50, minTurn: 4,
    requireStat: { clinical: [50, 100] },
    choices: [
      { text: '第二天当众更正', delta: { clinical: 5, research: 4, knowledge: 5, reputation: 3 }, consequence: '你说"我昨天讲错了"。那个规培生看你的眼神变了。' },
      { text: '当作没这回事', delta: { reputation: -2, sanity: -5 }, consequence: '你把那一页悄悄标记了一下。' },
    ],
  },
  {
    id: 'dt_dual_strong',
    stage: 'career',
    title: '两条腿走路的人',
    body: '你既能上台，又能写标书。科里开始把你当成"既懂临床又懂科研"的那种人——这意味着两边的活都会找你。',
    category: 'career', weight: 45, minTurn: 6, once: true,
    requireStat: { clinical: [55, 100], research: [55, 100] },
    choices: [
      { text: '接住，成为科室的顶梁柱', delta: { reputation: 8, clinical: 4, research: 4, stamina: -14, sanity: -6 }, flagSet: 'dt_dual_pillar', consequence: '你成了那个"什么都能找他"的人。累，但没人能替代你。' },
      { text: '有意识地推掉一半', delta: { sanity: 8, reputation: -2 }, consequence: '你学会了说"这个我做不了"。' },
    ],
  },
  {
    id: 'dt_lopsided',
    stage: ['jobhunt', 'career'],
    title: '简历上的偏科',
    body: '面试官翻着你的材料："手术做得不错，可这科研……"或者反过来："文章挺多，临床带得动组吗？"',
    category: 'career', weight: 55, minTurn: 1, once: true,
    choices: [
      { text: '承认偏科，讲自己擅长的', delta: { reputation: 3, sanity: 4 }, flagSet: 'dt_owned_gap', consequence: '你说"我知道自己短在哪，但我强的那块是真的强"。对方点了点头。' },
      { text: '硬把短板吹圆', delta: { reputation: -3, sanity: -5 }, consequence: '你讲了几句，对方没接话，翻到了下一页。' },
    ],
  },

  // ==========================================================
  // 三、科研压力 → 造假的诱惑（真实资源 vs 累积风险）
  // ==========================================================
  {
    id: 'dt_data_not_significant',
    stage: ['master', 'phd'],
    title: 'p = 0.07',
    body: '跑了半年的实验，主效应差一点。师兄在旁边说："去掉那两只离群的老鼠，就 0.03 了。反正谁也不会去查原始记录。"',
    category: 'career', weight: 65, minTurn: 3,
    choices: [
      {
        text: '删掉那两个点', delta: { papers: 1, research: 6, sanity: -12 },
        effect: { kind: 'fake', severity: 'minor' },
        consequence: '图漂亮了，文章送出去了。你把原始数据文件夹改成了"备份_勿动"。',
      },
      {
        text: '如实报告阴性结果', delta: { research: 3, knowledge: 5, reputation: 2, sanity: -4, stamina: -8 },
        flagSet: 'dt_reported_null', consequence: '导师皱了眉，但也说"阴性也是结果"。这篇最后发在了一个很普通的刊上。',
      },
      {
        text: '再补一批样本重做', delta: { research: 5, knowledge: 4, stamina: -18, sanity: -8, money: -3000 },
        consequence: '又是三个月。这次 p 值真的过了，你反而哭了。',
      },
    ],
  },
  {
    id: 'dt_paper_mill',
    stage: ['master', 'phd', 'career'],
    title: '"一条龙服务"',
    body: '中介的报价单很详细：代写 4 万、代投 2 万、SCI 三区保发 8 万，"不成功全额退款"。你算了算职称要求的篇数。',
    category: 'career', weight: 55, minTurn: 4,
    choices: [
      {
        text: '买一篇，先把指标凑够', delta: { papers: 2, money: -60000, research: 4, reputation: 5, sanity: -18 },
        effect: { kind: 'fake', severity: 'severe' },
        flagSet: 'dt_bought_paper',
        consequence: '三个月后文章见刊，署名第一作者是你。你连里面用的什么细胞系都说不上来。',
      },
      {
        text: '删掉微信，自己熬', delta: { research: 4, stamina: -14, sanity: -6, knowledge: 3 },
        flagSet: 'dt_refused_mill', consequence: '你把中介拉黑了。那年的职称，你没评上。',
      },
    ],
  },
  {
    id: 'dt_gift_authorship',
    stage: ['phd', 'career'],
    title: '互挂通讯',
    body: '同科室的人提议："以后咱们互相挂个通讯作者，谁的文章都算大家的，数量翻倍。"在座的都点了头。',
    category: 'social', weight: 50, minTurn: 3,
    choices: [
      {
        text: '加入这个"互助小组"', delta: { papers: 2, reputation: 4, relations: 5, sanity: -8 },
        effect: { kind: 'fake', severity: 'moderate' },
        flagSet: 'dt_gift_author',
        consequence: '一年下来你的论文数翻了一倍。其中五篇你连摘要都没读完。',
      },
      { text: '婉拒', delta: { relations: -5, reputation: 2, sanity: 3 }, consequence: '你说"我还是自己写吧"。那之后科室的饭局少叫你了。' },
    ],
  },
  {
    id: 'dt_image_reuse',
    stage: ['phd', 'career'],
    title: '那张 WB 条带',
    body: '这次的对照组和上一篇的条件其实一样。"直接用上次那张图不就行了，反正是同一批实验。"你知道这在规范上算什么。',
    category: 'career', weight: 50, minTurn: 4,
    choices: [
      {
        text: '复用了', delta: { papers: 1, research: 4, stamina: 4, sanity: -10 },
        effect: { kind: 'fake', severity: 'moderate' },
        consequence: '省下了两周。你在心里给自己找了个理由：这确实是同一批实验。',
      },
      { text: '重新跑一遍', delta: { research: 4, knowledge: 3, stamina: -12, sanity: -3 }, consequence: '两周后你拿到了新的图。和上次几乎一模一样，但这张是这次的。' },
    ],
  },

  // ==========================================================
  // 四、造假换来的资源（真实收益，让选择有诱惑力）
  // ==========================================================
  {
    id: 'dt_fake_dividend_grant',
    stage: ['phd', 'career'],
    title: '中标了',
    body: '靠那几篇"产出"，你的青年基金过了。四十万经费、一个学生名额、科里的一间小实验室。',
    category: 'career', weight: 55, minTurn: 3, once: true,
    requireFlag: 'has_faked',
    choices: [
      { text: '把资源用起来，做点真东西', delta: { research: 10, money: 8000, reputation: 6, knowledge: 4, stamina: -10 }, flagSet: 'dt_fake_then_real', consequence: '你想：有了平台，以后就能做真的了。这话你对自己说了很多遍。' },
      { text: '继续按老办法凑产出', delta: { papers: 1, reputation: 4, research: 2, sanity: -10 }, effect: { kind: 'fake', severity: 'moderate' }, consequence: '路径一旦选定，就很难拐回来了。' },
    ],
  },
  {
    id: 'dt_fake_dividend_title',
    stage: 'career',
    title: '你评上了',
    body: '副高公示名单里有你的名字。论文数量是硬指标，而你的数量足够漂亮。',
    category: 'career', weight: 50, minTurn: 5, once: true,
    requireFlag: 'has_faked',
    choices: [
      { text: '接受祝贺', delta: { reputation: 8, money: 4000, sanity: -6 }, flagSet: 'passed_fugao', consequence: '同事来敬酒，你笑着喝了。回家路上你想起了那份中介的报价单。' },
    ],
  },
  {
    id: 'dt_fake_dividend_recruit',
    stage: 'career',
    title: '人才引进',
    body: '外地一家医院开出条件：安家费、编制、副高直聘。看中的正是你的论文数量。',
    category: 'career', weight: 45, minTurn: 6, once: true,
    requireFlag: 'has_faked',
    choices: [
      { text: '拿了安家费，换个城市重新开始', delta: { money: 300000, reputation: 5, relations: -6, sanity: -8 }, flagSet: 'dt_relocated_on_fake', consequence: '搬家那天你想：换个地方，就没人知道了。' },
      { text: '不敢去，怕经不起查', delta: { sanity: -10, reputation: -2 }, consequence: '你婉拒了。对方很意外——这条件很少有人拒绝。' },
    ],
  },

  // ==========================================================
  // 五、侥幸期：造过假但还没被查（心理层面的真实代价）
  // ==========================================================
  {
    id: 'dt_lucky_audit_passed',
    stage: ['phd', 'career'],
    title: '这次抽查没抽到你',
    body: '学校搞科研诚信专项自查，随机抽 10%。名单公布，没有你。你在办公室长长出了一口气。',
    category: 'mental', weight: 50, minTurn: 2,
    requireFlag: 'has_faked', excludeFlag: 'exposed_ruin',
    choices: [
      { text: '趁机把能补的原始记录补上', delta: { sanity: 6, stamina: -8, research: 2 }, effect: { kind: 'selfReport' }, consequence: '你熬了两个通宵补实验记录。风险小了，但你知道有些东西补不回来。' },
      { text: '庆幸，然后继续', delta: { sanity: -6 }, consequence: '你发现自己已经开始习惯这种心跳了。' },
    ],
  },
  {
    id: 'dt_pubpeer_comment',
    stage: ['phd', 'career'],
    title: '一条陌生的评论',
    body: '深夜刷手机，看到有人在学术论坛贴了你那篇文章的图，配文只有一句："Figure 3 有点眼熟。"下面还没人回复。',
    category: 'mental', weight: 50, minTurn: 3,
    requireFlag: 'has_faked', excludeFlag: 'exposed_ruin',
    choices: [
      { text: '主动联系期刊说明情况', delta: { reputation: -6, sanity: 10, papers: -1 }, effect: { kind: 'selfReport' }, consequence: '编辑回复得很客气。撤稿声明发出那天，你反而睡了个整觉。' },
      { text: '装作没看见，反复刷新那个帖子', delta: { sanity: -12, stamina: -4 }, consequence: '你刷了一整夜。帖子沉了下去，但你的心跳没有。' },
    ],
  },
  {
    id: 'dt_student_asks',
    stage: 'career',
    title: '学生问你原始数据',
    body: '你带的研究生想学着复现那篇文章的方法："老师，原始数据能给我看看吗？我想照着做一遍。"',
    category: 'mental', weight: 50, minTurn: 4,
    requireFlag: 'has_faked', excludeFlag: 'exposed_ruin',
    choices: [
      { text: '说文件丢了，让他做别的', delta: { sanity: -14, relations: -3 }, flagSet: 'dt_lied_to_student', consequence: '他"哦"了一声走了。你在办公室坐了很久——你正在把他也教成这样的人。' },
      { text: '告诉他实话，让他别走这条路', delta: { sanity: 8, relations: 4, reputation: -3 }, flagSet: 'dt_warned_student', consequence: '他愣了很久，最后说："谢谢老师告诉我。"' },
    ],
  },
  {
    id: 'dt_news_retraction_wave',
    stage: ['phd', 'career'],
    title: '又一批集中撤稿',
    body: '新闻推送：某国际期刊一次性撤回上百篇来自中国机构的论文，理由是"论文工厂特征"。评论区在骂。',
    category: 'news', weight: 50, minTurn: 2,
    requireFlag: 'has_faked', excludeFlag: 'exposed_ruin',
    newsTickerAfter: '【某国际期刊集中撤稿逾百篇，涉论文工厂】',
    choices: [
      { text: '一条条翻名单，确认没有自己', delta: { sanity: -10, stamina: -3 }, consequence: '看到最后一页你才松手。手心全是汗。' },
      { text: '关掉新闻，去查自己那几篇的状态', delta: { sanity: -6, research: 1 }, consequence: '还在。都还在。你反复刷新了三次。' },
    ],
  },
  {
    id: 'dt_clean_pride',
    stage: 'career',
    title: '干净的履历',
    body: '撤稿风波里，好几个同行栽了。你翻着自己的发表列表——数量不多，但每一篇你都能说清楚数据是怎么来的。',
    category: 'mental', weight: 50, minTurn: 4, once: true,
    excludeFlag: 'has_faked',
    requireStat: { research: [35, 100] },
    choices: [
      { text: '这就够了', delta: { sanity: 14, reputation: 4, research: 2 }, consequence: '你没发过顶刊，但你能睡着。' },
    ],
  },

  // ==========================================================
  // 六、被查之后
  // ==========================================================
  {
    id: 'dt_after_retraction',
    stage: 'career',
    title: '撤稿之后',
    body: '通报挂在官网上，能搜到。学生群里有人截图，科室开会时没人提，但你知道大家都看过了。',
    category: 'social', weight: 55, once: true,
    requireFlag: 'exposed_retraction',
    choices: [
      { text: '公开道歉，从头做真的研究', delta: { reputation: 3, research: -5, sanity: 8, stamina: -10 }, flagSet: 'dt_redemption', consequence: '你在科会上讲了二十分钟。有人觉得你虚伪，也有年轻人私下说"至少他说了"。' },
      { text: '沉默，等风头过去', delta: { sanity: -12, relations: -5, reputation: -3 }, consequence: '你把办公室的门关得更久了。' },
    ],
  },
  {
    id: 'dt_after_ruin',
    stage: 'career',
    title: '通报之后',
    body: '学位撤销、职称取消、五年内不得申报课题。白大褂还能穿，但很多门关上了。',
    category: 'mental', weight: 60, once: true,
    requireFlag: 'exposed_ruin',
    newsTickerAfter: '【被通报后转行的医生增多：医疗行业人才流失引热议】',
    choices: [
      { text: '回到最基础的临床岗位', delta: { clinical: 8, research: -20, reputation: 2, sanity: 6, money: -5000 }, flagSet: 'dt_back_to_bedside', consequence: '你去了门诊。一天看六十个号，没人问你发过什么文章。' },
      { text: '离开医疗行业', delta: { sanity: 10, reputation: -5, clinical: -20, research: -20 }, flagSet: 'left_med', consequence: '你脱下白大褂，去了一家医疗器械公司。有时会梦见实验室。' },
      { text: '继续申诉，不承认', delta: { sanity: -18, relations: -8, reputation: -5 }, consequence: '材料递了三轮，都被驳回。你熬白了头。' },
    ],
  },
  {
    id: 'dt_redemption_later',
    stage: 'career',
    title: '重新开始的第一篇',
    body: '三年后，你带着一篇小样本、朴素设计的临床观察投了出去。审稿意见回来：接收。',
    category: 'career', weight: 45, once: true,
    requireFlag: 'dt_redemption', minTurn: 4,
    choices: [
      { text: '把它打印出来，放进抽屉', delta: { research: 6, reputation: 5, sanity: 15, papers: 1 }, consequence: '影响因子只有 1.8。但这是十年来第一篇你敢让学生复现的文章。' },
    ],
  },
];
