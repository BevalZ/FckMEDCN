import type { GameEvent } from './events';

// 研究生阶段事件池（master / phd）。硕士与博士共用大量事件，故多用数组 stage。
// 选导师、硕士毕业抉择等里程碑事件限定在 'master'，避免博士阶段重复触发。
export const MASTER_PHD_EVENTS: GameEvent[] = [
  {
    id: 'advisor_relationship',
    stage: 'master',
    title: '你的导师是哪种人',
    body: '入学第一周。导师的风格，基本决定了你接下来几年的画风。',
    category: 'study',
    weight: 100,
    once: true,
    choices: [
      { text: '放养型：自己摸索', delta: { knowledge: 4, sanity: 4, stamina: -4 }, flagSet: 'advisor_laissez', consequence: '自由，但容易迷路。' },
      { text: '严格型：每周汇报', delta: { knowledge: 6, stamina: -12, reputation: 3 }, flagSet: 'advisor_strict', consequence: '被push，但产出扎实。' },
      { text: '画饼型：只谈理想', delta: { knowledge: 2, sanity: -8, relations: -3 }, flagSet: 'advisor_pua', consequence: '你渐渐分不清鼓励和空头支票。' },
    ],
  },
  {
    id: 'sci_pressure',
    stage: ['master', 'phd'],
    title: '不发 SCI 毕不了业',
    body: '组会墙上贴着"毕业硬性指标：至少 1 篇 SCI"。你盯着自己的空白投稿记录。',
    category: 'career',
    weight: 90,
    choices: [
      { text: '卷生信，快速灌水', delta: { papers: 1, knowledge: 3, stamina: -12, sanity: -5 }, consequence: '两三个月一篇，质量嘛……先毕业要紧。' },
      { text: '做扎实的临床回顾', delta: { papers: 1, knowledge: 6, stamina: -10 }, consequence: '慢，但审稿人挑不出大毛病。' },
      { text: '躺平，先毕业再说', delta: { sanity: 5, knowledge: -2 }, consequence: '你把指标抛到脑后，暂时。' },
    ],
  },
  {
    id: 'experiment_fail',
    stage: ['master', 'phd'],
    title: '细胞又死了',
    body: '连续三批原代细胞污染。三个月的活，一夜归零。培养箱绿灯刺眼地亮着。',
    category: 'study',
    weight: 85,
    choices: [
      { text: '复盘，重新设计', delta: { knowledge: 4, stamina: -10, sanity: -4 }, consequence: '你找出污染源，重头再来。' },
      { text: '怀疑人生，停摆', delta: { sanity: -8, stamina: -4 }, flagSet: 'exp_failed', consequence: '你请了三天假，什么都不想碰。' },
    ],
  },
  {
    id: 'academic_conference',
    stage: ['master', 'phd'],
    title: '学术会议',
    body: '领域年会。做海报还是口头汇报？大牛都在，也是混脸熟的好机会。',
    category: 'career',
    weight: 65,
    choices: [
      { text: '做汇报，露个脸', delta: { reputation: 5, knowledge: 4, money: -1500 }, consequence: '台下有人点了点头，你记下了他。' },
      { text: '蹭茶歇，听大牛', delta: { knowledge: 3 }, consequence: '你记下三页笔记和两张名片。' },
    ],
  },
  {
    id: 'delay_grad_risk',
    stage: ['master', 'phd'],
    title: '延期毕业的阴影',
    body: '同门延期的延期，你算了一下自己的进度，按这个速度，很可能赶不上答辩。',
    category: 'career',
    weight: 70,
    minTurn: 6,
    choices: [
      { text: '加急赶进度', delta: { knowledge: 4, stamina: -16, sanity: -6 }, consequence: '你把 deadline 钉在墙上。' },
      { text: '接受延期，保质量', delta: { knowledge: 4, sanity: 4 }, flagSet: 'delayed', consequence: '你跟导师谈妥，多待半年。' },
    ],
  },
  {
    id: 'academic_misconduct',
    stage: ['master', 'phd'],
    title: '一条"捷径"',
    body: '师兄悄悄说："数据差点意思，改两个 outliers 就行了，没人看得出。"你盯着那张图。',
    category: 'mental',
    weight: 55,
    choices: [
      { text: '拒绝，守住底线', delta: { reputation: 4, sanity: -3, research: 2 }, consequence: '你删掉了那段对话。' },
      { text: '改了，先过关', delta: { papers: 1, reputation: -4, sanity: -10, research: 3 }, flagSet: 'cheated', effect: { kind: 'fake', severity: 'minor' }, consequence: '图漂亮了，你却夜夜睡不安。' },
    ],
  },
  {
    id: 'labmate_conflict',
    stage: ['master', 'phd'],
    title: '同门之间的微妙',
    body: '试剂被用了没补，署名顺序有争议。实验室里空气比液氮还冷。',
    category: 'social',
    weight: 55,
    choices: [
      { text: '主动沟通，定规矩', delta: { relations: 5, sanity: 2 }, consequence: '一块白板解决了大半矛盾。' },
      { text: '冷战，各干各的', delta: { relations: -5, sanity: -3 }, consequence: '你换了工位，少说话。' },
    ],
  },
  {
    id: 'thesis_topic',
    stage: ['master', 'phd'],
    title: '选题的赌注',
    body: '热门方向好发文章但卷成红海；冷门方向新，但可能无人问津。',
    category: 'study',
    weight: 70,
    once: true,
    choices: [
      { text: '跟热点，好发', delta: { knowledge: 3, papers: 0 }, flagSet: 'topic_hot', consequence: '你选了最拥挤的那条赛道。' },
      { text: '开新坑，拼原创', delta: { knowledge: 6, reputation: 4 }, flagSet: 'topic_novel', consequence: '导师说"有风险，但有点意思"。' },
    ],
  },
  {
    id: 'reviewer_hardship',
    stage: ['master', 'phd'],
    title: '审稿人的灵魂拷问',
    body: '返修意见回来了：三条 major revision，其中一条你完全答不上来。',
    category: 'career',
    weight: 60,
    choices: [
      { text: '逐条认真 rebuttal', delta: { knowledge: 3, reputation: 2, stamina: -8 }, consequence: '你写了八页回复，有理有据。' },
      { text: '暴躁，想弃稿', delta: { sanity: -5, knowledge: -1 }, consequence: '你把邮件关了，第二天再战。' },
    ],
  },
  {
    id: 'funding_cut',
    stage: ['master', 'phd'],
    title: '课题经费被砍',
    body: '导师的面上项目没中，组里的试剂预算砍了一半。你的实验得重新排期。',
    category: 'career',
    weight: 55,
    choices: [
      { text: '自己贴钱续命', delta: { money: -2000, knowledge: 2 }, consequence: '你月补助本就不多。' },
      { text: '换低成本方案', delta: { knowledge: 4, stamina: -6 }, consequence: '你改了方法，曲线救国。' },
    ],
  },
  {
    id: 'mental_breakdown',
    stage: ['master', 'phd'],
    title: '撑不住的一晚',
    body: '你看着屏幕上的拒稿信，忽然觉得一切都毫无意义。微信里，导师又发来"在吗"。',
    category: 'mental',
    weight: 50,
    choices: [
      { text: '预约心理咨询', delta: { sanity: 10 }, flagSet: 'sought_help', consequence: '你拨通了学校的心理热线。' },
      { text: '硬撑，关灯睡觉', delta: { sanity: -8, stamina: -4 }, consequence: '你把脸埋进枕头。' },
    ],
  },
  {
    id: 'paper_accepted',
    stage: ['master', 'phd'],
    title: 'Accepted',
    body: '邮箱弹出："Your manuscript has been accepted." 你盯着那个词看了很久。',
    category: 'career',
    weight: 45,
    choices: [
      { text: '截图发朋友圈（仅自己可见）', delta: { papers: 1, knowledge: 2, reputation: 5, sanity: 10 }, consequence: '这是你熬出来的光。' },
    ],
  },
  {
    id: 'choose_phd_after_master',
    stage: 'master',
    title: '硕士毕业路口',
    body: '答辩临近。继续读博不是一句“我想读”就够了：要联系导师、投医院和专业方向、过材料审核、参加英语和专业面试，最后还要看同批排名。',
    category: 'career',
    weight: 90,
    minTurn: 8,
    once: true,
    choices: [
      { text: '准备申请博士，先联系导师', delta: { knowledge: 4, stamina: -6, sanity: -3 }, nextEventId: 'ms_phd_application_start', consequence: '你开始整理 CV、论文、成绩单、英语证明和研究计划。' },
      { text: '去工作，落地生根', delta: { sanity: 6 }, flagSet: 'will_work', consequence: '你开始投简历。' },
    ],
  },
  {
    id: 'industry_internship',
    stage: ['master', 'phd'],
    title: '药企的橄榄枝',
    body: '一家药企邀请你暑期做医学联络官实习，薪水不低。同门说"那是退路"。',
    category: 'career',
    weight: 55,
    choices: [
      { text: '去试试，见见世面', delta: { money: 3000, knowledge: 2, reputation: -2 }, flagSet: 'industry_intern', consequence: '你发现工业界另有一片天。' },
      { text: '拒绝，专心科研', delta: { knowledge: 3, sanity: 2 }, consequence: '你婉拒了，回到 bench。' },
    ],
  },
  {
    id: 'abroad_application',
    stage: ['master', 'phd'],
    title: '公派联培',
    body: '国家留学基金委的联培项目开放申请。去国外实验室待一年，还是留在国内？',
    category: 'career',
    weight: 50,
    choices: [
      { text: '申请公派联培', delta: { knowledge: 6, reputation: 4, stamina: -8 }, flagSet: 'abroad', consequence: '你开始准备语言和研究计划。' },
      { text: '不去，国内也行', delta: { sanity: 2 }, consequence: '你算了算成本，决定留下。' },
    ],
  },
  {
    id: 'lab_safety',
    stage: ['master', 'phd'],
    title: '实验室的安全',
    body: '新来的师弟徒手分装放射性试剂。你看着防护规程，想起了那些警示案例。',
    category: 'clinical',
    weight: 45,
    choices: [
      { text: '提醒他规范操作', delta: { relations: 3, knowledge: 2, reputation: 2 }, consequence: '他红了脸，戴上了手套。' },
      { text: '图省事，一起糊弄', delta: { sanity: -4, stamina: -2 }, consequence: '你们都侥幸过关，但埋了隐患。' },
    ],
  },
  // —— 新增：科研生活的真实褶皱（R14）——
  {
    id: 'thesis_writer_block',
    stage: ['master', 'phd'],
    title: '论文卡壳',
    body: '绪论写了三版，导师都说"没问题，但也没意思"。你对着空白文档，光标闪了一下午。',
    category: 'study', weight: 60, minTurn: 4,
    choices: [
      { text: '换个切口重写', delta: { knowledge: 4, stamina: -10, sanity: -3 }, consequence: '你推翻重来，反而顺了。' },
      { text: '硬凑字数交差', delta: { knowledge: 1, stamina: -4, sanity: -2 }, consequence: '你写出了八千字，自己都不想看。' },
    ],
  },
  {
    id: 'lab_bench_view',
    stage: ['master', 'phd'],
    title: '超净台外的日出',
    body: '你守着细胞过了夜。窗外的天由墨蓝变成橘红，培养箱里那批终于活了。',
    category: 'study', weight: 50, minTurn: 3,
    choices: [
      { text: '拍张照，记下这一刻', delta: { knowledge: 3, sanity: 8, stamina: -8 }, consequence: '你忽然觉得，熬夜也值。' },
      { text: '困得只想睡觉', delta: { sanity: -2, stamina: -10 }, consequence: '你趴在实验台上眯了一会儿。' },
    ],
  },
  {
    id: 'phd_defense_prep',
    stage: 'phd',
    title: '答辩前夜',
    body: 'PPT 改到第 27 版。明天台下坐着五位评委，其中一位以"爱挑刺"闻名。你心跳快得离谱。',
    category: 'career', weight: 60, minTurn: 10, once: true,
    choices: [
      { text: '睡前默一遍讲稿', delta: { knowledge: 3, stamina: -6, sanity: -2 }, consequence: '你把关键点写在了手心里。' },
      { text: '索性不睡，通宵彩排', delta: { knowledge: 2, stamina: -14, sanity: -4 }, consequence: '你练到天亮，嗓子有点哑。' },
    ],
  },
  // —— "过去的选择在回响"：把本科埋下的 flag 在研究生阶段兑现（R16–R18）——
  {
    id: 'master_baoyan_edge',
    stage: 'master',
    title: '保研的底子',
    body: '本科挤进保研名单的那股狠劲，让你在课题组上手比同期快半拍。导师也让你多扛了点活。',
    category: 'study', weight: 50, once: true, requireFlag: 'baoyan', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '把底子换成产出', delta: { knowledge: 5, reputation: 3, stamina: -6 }, consequence: '你第一个月就入了状态。' },
    ],
  },
  {
    id: 'master_kaoyan_grind',
    stage: 'master',
    title: '考研炼出的韧性',
    body: '当年考研自习室那段苦，竟然成了你扛实验失败的本钱。同门崩溃时，你还能稳住。',
    category: 'study', weight: 50, once: true, requireFlag: 'kaoyan', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '把韧性用在刀刃上', delta: { knowledge: 4, sanity: 3, stamina: -4 }, consequence: '你比谁都扛造。' },
    ],
  },
  {
    id: 'master_mentor_letter',
    stage: 'master',
    title: '当年那位学长的信',
    body: '本科想退学时拉你一把的学长，如今已是主治。他听说你要申博，主动说帮你写推荐信。',
    category: 'career', weight: 45, once: true, requireFlag: 'mentor_talk', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '郑重收下这份情谊', delta: { reputation: 4, relations: 5, knowledge: 2 }, consequence: '你回了他当年那句"后来熬过来了"。' },
    ],
  },
  {
    // 人际高光（关系门槛，外貌→起始人际解锁）：科研圈子带你玩
    id: 'ms_senior_network',
    stage: ['master', 'phd'],
    title: '被带进圈子',
    body: '同门师兄师姐跟你关系铁，组会、报账、文献共享都带着你。别组都在猜你哪来这么大面子。',
    category: 'social', weight: 40, once: true, minTurn: 2,
    requireStat: { relations: [55, 100] },
    choices: [
      { text: '融入圈子，投桃报李', delta: { research: 4, relations: 4, stamina: -4, sanity: 2 }, consequence: '你帮他们改过摘要，他们也带你看门道。' },
      { text: '独来独往，省心', delta: { knowledge: 2, sanity: 2, relations: -2 }, consequence: '你不想欠人情，圈子也就淡了。' },
    ],
  },

  // —— 论文黑市：秘密地点入口（paper_blackmarket）。NPC 随机 offer 见下方 *_paper_offer。
  // 买/卖都走 effect:{kind:'fake'}，自然接入既有的每季 rollIntegrity 东窗事发机制。
  {
    id: 'paper_blackmarket',
    stage: ['undergrad', 'master', 'phd', 'career'],
    title: '墙后的论文黑市',
    body: '那扇没锁的门后面是个加密群。群公告写着："代写/挂名/买卖已见刊SCI，明码标价，先款后货。"你盯着屏幕，光标在输入框闪。',
    category: 'career', weight: 1, once: false, manualOnly: true,
    choices: [
      { text: '买一篇二作（¥2000）', delta: { money: -2000, papers: 1, research: 2 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'moderate' }, consequence: '见刊那天你截了图，却没敢发朋友圈。' },
      { text: '买一篇一作（¥8000）', delta: { money: -8000, papers: 1, research: 4, reputation: 4 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'severe' }, consequence: '一作到手，但你知道它经不起任何复查。' },
      { text: '卖掉自己名字（¥5000）', delta: { money: 5000 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'severe' }, consequence: '有人把你的名字挂在一篇你从没读过的文章上。' },
      { text: '关掉群，当没来过', delta: { sanity: 3 }, consequence: '你退出了加密群，深吸一口气。' },
    ],
  },

  // —— NPC 随机 offer：同学 / 同事 / 学长 / 编辑主动搭话，提供论文买卖 ——
  {
    id: 'ug_paper_offer',
    stage: 'undergrad',
    title: '"我帮你挂个名"',
    body: '一位师兄发来消息："有个水刊，两千块挂二作，下周就能见刊，保研加分够用了。"聊天框光标闪了很久。',
    category: 'career', weight: 45, minTurn: 6, once: false, excludeFlag: 'knows_paper_dealer',
    choices: [
      { text: '转账，挂名', delta: { money: -2000, papers: 1, reputation: 4, sanity: -10, research: 2 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'moderate' }, consequence: '见刊那天你截了图，却没敢发朋友圈。' },
      { text: '拒绝，自己写一篇综述', delta: { knowledge: 4, sanity: 4 }, consequence: '你打开文档，从摘要开始一行一行写。' },
    ],
  },
  {
    id: 'ms_paper_offer',
    stage: 'master',
    title: '组里师兄的"资源"',
    body: '实验室同门神神秘秘凑过来："我认识个编辑，能加急发，钱到位就行。你那篇卡在审稿也别硬等了。"',
    category: 'career', weight: 45, minTurn: 2, once: false, excludeFlag: 'knows_paper_dealer',
    choices: [
      { text: '加急发一篇（¥5000）', delta: { money: -5000, papers: 1, research: 3, sanity: -8 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'severe' }, consequence: '录用通知来得快得可疑。' },
      { text: '拒了，老老实实改稿', delta: { knowledge: 4, stamina: -6 }, consequence: '你把审稿意见一条条啃下来。' },
    ],
  },
  {
    id: 'phd_paper_offer',
    stage: 'phd',
    title: '合作者的"捷径"',
    body: '一位"合作者"加你微信："我们这边能出一作，数据现成，挂你名毕业用，懂的都懂。"',
    category: 'career', weight: 45, minTurn: 2, once: false, excludeFlag: 'knows_paper_dealer',
    choices: [
      { text: '买一作冲毕业（¥8000）', delta: { money: -8000, papers: 1, research: 4, reputation: 4, sanity: -12 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'severe' }, consequence: '毕业材料齐了，你却夜夜睡不踏实。' },
      { text: '拒绝，靠自己那篇', delta: { knowledge: 5, stamina: -6, sanity: 4 }, consequence: '你把手头的数据又跑了一遍。' },
    ],
  },
  {
    id: 'career_paper_offer',
    stage: 'career',
    title: '职称路上的"帮忙"',
    body: '一位同行大夫私下说："晋升缺一作？我这儿有现成的，挂个名就行，评完就撤。"',
    category: 'career', weight: 40, minTurn: 3, once: false, excludeFlag: 'knows_paper_dealer',
    choices: [
      { text: '挂名冲职称（¥6000）', delta: { money: -6000, papers: 1, reputation: 5, sanity: -10 }, flagSet: 'knows_paper_dealer', effect: { kind: 'fake', severity: 'severe' }, consequence: '材料递上去那天，你手心全是汗。' },
      { text: '拒绝，靠临床业绩', delta: { knowledge: 3, sanity: 4 }, consequence: '你把病例整理成综述，慢，但踏实。' },
    ],
  },

  // —— 一作之争（OPTIMIZATION-ROADMAP R7，科研生态高频痛点）——
  // 同门抢共一/导师加名：争/让/被安抚三向 flag，后续在职业阶段（评职称翻旧账/师兄还人情）
  // 与硕博阶段（导师承诺兑现与否）分别回响。
  {
    id: 'ms_first_author_dispute',
    stage: ['master', 'phd'],
    title: '一作之争',
    body: '你那篇投了半年的文章终于要大修后接收。导师却提出：让即将出站的师兄挂共同一作——"他需要这篇文章。"你的名字，要往后挪一位。',
    category: 'career', weight: 55, minTurn: 3, once: true,
    choices: [
      { text: '争到底：按实际贡献署名', delta: { reputation: 2, relations: -6, sanity: -6 }, flagSet: 'fa_fought', consequence: '导师没再坚持，但组里的空气冷了几周。' },
      { text: '让出共一，换个人情', delta: { relations: 4, sanity: -4, reputation: 1 }, flagSet: 'fa_conceded', consequence: '对方请你吃了顿饭，说"以后有我一口就有你一口"。' },
      { text: '忍了，导师画饼"下一篇让你独立一作"', delta: { sanity: -3, knowledge: 1 }, flagSet: 'fa_placated', consequence: '你把这句话记在了心里——记仇本的第一页。' },
    ],
  },
  // 被画饼者的回响：导师的承诺兑现了吗
  {
    id: 'ms_first_author_placated_echo',
    stage: ['master', 'phd'],
    title: '导师兑现承诺了吗',
    body: '下一篇文章写完了。署名那天，你想起那句"下一篇让你独立一作"。',
    category: 'career', weight: 45, once: true, minTurn: 5,
    requireFlag: 'fa_placated',
    choices: [
      { text: '去问个明白', delta: { reputation: 2, sanity: -2, papers: 1 }, consequence: '导师这次没食言。独立一作，实打实。' },
      { text: '算了，不想再撕破脸', delta: { sanity: -4, relations: 2 }, consequence: '共一名单里多了个你没见过的名字。你咽下了这口气。' },
    ],
  },

  // —— 留级剧情链（与本科 ug_holdback_life 对齐）：硕士/博士留级后抽出，选"重来一次"解除每季心理负担 ——
  {
    id: 'ms_holdback_life',
    stage: 'master',
    title: '硕士重修的日子',
    body: '你跟着下一届的师弟师妹上课。组会里你比他们年长一届，却坐回了一年级的位置。导师没多说，只是把文献又发了一遍给你。',
    category: 'mental', weight: 55, once: true, requireFlag: 'ms_holdback',
    choices: [
      { text: '把这一年当成重来一次的机会', delta: { knowledge: 8, sanity: 4, stamina: -8 }, flagSet: 'ms_holdback_recovered', consequence: '这次你听懂了。原来当初不是笨，是没喘过气。' },
      { text: '整天抬不起头', delta: { sanity: -12, knowledge: 2, relations: -5 }, consequence: '你坐最后一排，谁也不认识，谁也不想认识。' },
    ],
  },
  {
    id: 'phd_holdback_life',
    stage: 'phd',
    title: '博士重修的日子',
    body: '开题被否之后你重读了一年。同窗已经发完两篇，你还在改第一版的框架。导师说："慢一点没关系，但这次要想清楚。"',
    category: 'mental', weight: 55, once: true, requireFlag: 'phd_holdback',
    choices: [
      { text: '把这一年当成重来一次的机会', delta: { knowledge: 8, sanity: 4, stamina: -8 }, flagSet: 'phd_holdback_recovered', consequence: '这次你沉下心了。框架一层层立住，像终于踩到了实地。' },
      { text: '整天抬不起头', delta: { sanity: -12, knowledge: 2, relations: -5 }, consequence: '你躲进工位，组会能不发言就不发言。' },
    ],
  },

  // —— 长学制转普通班警告：连续 4 季知识 < 40 触发（long_sys_warn_ready 由 knowledge.ts 置位）——
  {
    id: 'long_sys_transfer_warn',
    stage: ['undergrad', 'master', 'phd'],
    title: '分流预警',
    body: '教务老师把你叫去："你连续几个学期绩点都在红线以下。按长学制分流办法，再跟不上的话，建议你转入普通班——从头读，但压力小些。"',
    category: 'study', weight: 50, once: true, requireFlag: 'long_sys_warn_ready',
    choices: [
      { text: '转入普通班，重新开始', delta: { sanity: 6 }, effect: { kind: 'transferLongSystem' }, consequence: '你签了分流表。长学制的"连读"待遇到此为止，但呼吸顺畅了些。知识、临床手感和已走过的季度不会清零。' },
      { text: '再拼一学期', delta: { stamina: -10, knowledge: 4, sanity: -6 }, flagSet: 'long_sys_warned', consequence: '你咬牙留了下来，赌自己能追上来。' },
    ],
  },
];
