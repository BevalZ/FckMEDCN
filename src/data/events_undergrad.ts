import type { GameEvent } from './events';

// 本科阶段事件池（undergrad）。与 events.ts 中原有事件（如 anatomy_first_day）合并。
export const UNDERGRAD_EVENTS: GameEvent[] = [
  {
    id: 'physiology_biochem_exam',
    stage: 'undergrad',
    title: '生理生化，必有一挂',
    body: '期末周。生理和生化两门硬课撞在同一天。图书馆的座位从凌晨四点就被占满，走廊里全是背书的声音。',
    category: 'study',
    weight: 90,
    minTurn: 2,
    choices: [
      { text: '熬夜突击，重点全背', delta: { knowledge: 6, stamina: -15, sanity: -6 }, consequence: '你硬啃下两本砖头，考前一晚只睡了三小时。' },
      { text: '抓大放小，主攻生理', delta: { knowledge: 3, stamina: -8, sanity: -3 }, consequence: '生化勉强飘过，生理还算扎实。' },
      { text: '随缘考，挂了再说', delta: { stamina: -2, sanity: 6 }, flagSet: 'failed_physiology', consequence: '你安慰自己"医学博大精深，挂一科不算什么"。' },
    ],
  },
  {
    id: 'cet4_cet6',
    stage: 'undergrad',
    title: '英语四六级',
    body: '医学院对英语的要求无处不在——文献、考研、甚至保研加分。室友已经刷到 600 分。',
    category: 'study',
    weight: 70,
    minTurn: 2,
    choices: [
      { text: '每天打卡背单词', delta: { knowledge: 4, stamina: -6 }, flagSet: 'passed_cet6', consequence: '大二下学期，六级一次过。' },
      { text: '考前突击真题', delta: { knowledge: 2, stamina: -4 }, consequence: '压线飘过四级，六级以后再说。' },
      { text: '反正用不上，放弃', delta: { sanity: 4, knowledge: -2 }, consequence: '你把单词书垫了显示器。' },
    ],
  },
  {
    id: 'first_clerkship',
    stage: 'undergrad',
    title: '第一次见习',
    body: '大三，你第一次跟着带教老师走进病房。床号、病历、监护仪的滴滴声，一切都是真的。',
    category: 'clinical',
    weight: 85,
    minTurn: 3,
    choices: [
      { text: '主动问病史、查体', delta: { knowledge: 6, stamina: -6, reputation: 3 }, consequence: '老师点头："这学生眼里有活。"' },
      { text: '默默跟在后面记录', delta: { knowledge: 3, stamina: -3 }, consequence: '你记了满满一本笔记。' },
      { text: '站远点，怕被传染', delta: { knowledge: 0, sanity: -4 }, consequence: '你全程贴在门边。' },
    ],
  },
  {
    id: 'clinical_skills_lab',
    stage: 'undergrad',
    title: '临床技能操作',
    body: '技能中心。打结、缝合、换药、胸穿模拟。你的手抖得像帕金森，缝线打了个死结。带教把针持递过来："试试，绿区落针。"',
    category: 'clinical',
    weight: 80,
    minTurn: 3,
    once: true,
    minigame: 'suture',
    choices: [
      // 小游戏成功/失败会覆盖这些默认结果；保留是为了无小游戏路径与类型完整
      { text: '认真缝一针', delta: { clinical: 4, knowledge: 2, stamina: -5 }, flagSet: 'suture_done', consequence: '缝上了。不漂亮，但结实。' },
      { text: '反正有模拟人，无所谓', delta: { knowledge: -2, stamina: 0 }, flagSet: 'skills_lazy', consequence: '你安慰自己"真到临床自然就会了"。' },
    ],
  },
  {
    id: 'postgrad_kaoyan_vs_baoyan',
    stage: 'undergrad',
    title: '考研还是保研',
    body: '大四。绩点排在年级中上游。保研名额紧张，考研则要与几百万人同台。路在岔口。',
    category: 'career',
    weight: 75,
    minTurn: 12,
    maxTurn: 19,
    once: true,
    requireStat: { knowledge: [55, 100] },
    newsTickerAfter: '【考研报名人数再创新高，医学生连续多年位居报名主力】',
    choices: [
      {
        text: '冲刺保研，拼绩点', delta: { reputation: 5, stamina: -10, knowledge: 3 }, flagSet: 'baoyan',
        requireStat: { knowledge: [90, 100] },
        consequence: '你挤进了保研名单，不用受考研的罪。',
      },
      { text: '备战考研，放手一搏', delta: { knowledge: 6, stamina: -14, sanity: -5 }, flagSet: 'kaoyan', consequence: '自习室成了你的第二个家。' },
      { text: '先找工作保底', delta: { sanity: 4, money: 1000 }, consequence: '你投了几份简历，心里却没底。' },
    ],
  },
  {
    id: 'roommate_conflict',
    stage: 'undergrad',
    title: '宿舍那些事',
    body: '室友作息完全错开：你睡时他打游戏，他睡时你背书。空气里弥漫着没说出口的怨气。',
    category: 'social',
    weight: 55,
    choices: [
      { text: '主动沟通，订公约', delta: { relations: 8, sanity: 4 }, consequence: '一场夜谈，气氛缓和。' },
      { text: '忍着，戴耳塞', delta: { sanity: -4, relations: -2 }, consequence: '你学会了在噪音里入睡。' },
      { text: '申请调换宿舍', delta: { relations: -5, sanity: 3 }, consequence: '你搬去了另一间，但和原室友形同陌路。' },
    ],
  },
  {
    id: 'campus_romance',
    stage: 'undergrad',
    title: '医学生的恋爱',
    body: '解剖课搭档和你挺聊得来。但医学生的课表，比异地恋还让人见不到面。',
    category: 'social',
    weight: 50,
    choices: [
      { text: '试着在一起', delta: { sanity: 8, relations: 6, stamina: -4 }, flagSet: 'in_relationship', consequence: '图书馆两人占一座，复习效率……另说。' },
      { text: '以学业为重，保持距离', delta: { knowledge: 4, relations: -3 }, consequence: '你把心思收回到课本上。' },
    ],
  },
  {
    id: 'thick_textbooks',
    stage: 'undergrad',
    title: '蓝色的"医学圣经"',
    body: '《生理学》比砖头还厚，《内科学》两本摞起来能当哑铃。你怀疑这辈子背不完。',
    category: 'study',
    weight: 60,
    choices: [
      { text: '做思维导图，化整为零', delta: { knowledge: 5, stamina: -6 }, consequence: '你把厚书读薄了。' },
      { text: '死记硬背，硬扛', delta: { knowledge: 3, stamina: -12, sanity: -4 }, consequence: '记住了，但也忘了大半。' },
      { text: '刷题库，放弃精读', delta: { knowledge: 2, stamina: -4 }, flagSet: 'skills_lazy', consequence: '应试尚可，基础虚了点。' },
    ],
  },
  {
    id: 'summer_social_practice',
    stage: 'undergrad',
    title: '三下乡社会实践',
    body: '暑期，小分队去县城义诊。真正面对缺医少药的乡村，和课本里的病例完全不同。',
    category: 'social',
    weight: 50,
    minTurn: 4,
    choices: [
      { text: '认真测血压、做宣教', delta: { reputation: 5, relations: 4, stamina: -6 }, consequence: '一位大爷拉着你的手说谢谢。' },
      { text: '走流程，拍照交差', delta: { reputation: 1, stamina: -2 }, consequence: '横幅一拉，合影一拍，完事。' },
    ],
  },
  {
    id: 'cadaver_tribute',
    stage: 'undergrad',
    title: '致敬大体老师',
    body: '解剖课结束那天，全体师生向遗体捐献者鞠躬。没有名字，只有"无言良师"四个字。',
    category: 'study',
    weight: 40,
    minTurn: 2,
    maxTurn: 6,
    once: true,
    choices: [
      { text: '郑重三鞠躬', delta: { sanity: 6, reputation: 2 }, consequence: '你忽然懂了"健康所系，性命相托"。' },
      { text: '默默记在心里', delta: { sanity: 3 }, consequence: '你没说话，但记得很清楚。' },
    ],
  },
  {
    id: 'finals_all_nighter',
    stage: 'undergrad',
    title: '期末通宵',
    body: '考试前夜，自习室灯火通明。你已连轴转三天，咖啡喝到第不知道几杯。',
    category: 'study',
    weight: 65,
    choices: [
      { text: '通宵冲刺', delta: { knowledge: 4, stamina: -18, sanity: -6 }, consequence: '进考场时你靠墙上才没睡着。' },
      { text: '睡四小时再起', delta: { knowledge: 2, stamina: -8, sanity: 2 }, consequence: '你赌了一把，精神状态好些。' },
    ],
  },
  {
    id: 'med_humanities_class',
    stage: 'undergrad',
    title: '医学人文课',
    body: '老师放了一段录音：一位晚期患者说"我不想死在冰冷的机器里"。教室里很久没人说话。',
    category: 'study',
    weight: 45,
    choices: [
      { text: '认真写反思日记', delta: { sanity: 4, reputation: 2 }, consequence: '你第一次思考"治病"和"治人"的区别。' },
      { text: '当水课划过', delta: { sanity: 1 }, consequence: '你趴桌上补了会儿觉。' },
    ],
  },
  {
    id: 'scholarship_review',
    stage: 'undergrad',
    title: '奖学金评比',
    body: '国家奖学金名额只有一个。绩点、科研、学生工作，样样都要拿来比。同学间的气氛有点微妙。',
    category: 'social',
    weight: 55,
    minTurn: 6,
    once: true,
    // 与 ug_guojiang_* 链互斥：两者讲的是同一件事，避免同一局重复出现
    excludeFlag: 'ug_guojiang_done',
    choices: [
      { text: '大方展示，坦然竞争', delta: { reputation: 4, relations: -2, money: 2000 }, consequence: '你拿到了，请全宿舍喝了奶茶。' },
      { text: '低调参评，随缘', delta: { relations: 3, money: 800 }, consequence: '没拿最高等，但也得了鼓励奖。' },
      { text: '嫉妒同学，背后议论', delta: { relations: -6, sanity: -3 }, consequence: '你把自己困在了比较里。' },
    ],
  },
  {
    id: 'dropout_urge',
    stage: 'undergrad',
    title: '想退学的一晚',
    body: '期中考崩了，实验报告被退回，你看着白色校服忽然觉得喘不过气。搜索框里打了"医学退学"。',
    category: 'mental',
    weight: 40,
    minTurn: 5,
    choices: [
      { text: '给家里打个电话', delta: { sanity: 8, relations: 3 }, consequence: '母亲没骂你，只说"累了就回家"。' },
      { text: '找学长聊聊', delta: { sanity: 6, knowledge: 2 }, flagSet: 'mentor_talk', consequence: '学长说"我也想过，后来熬过来了"。' },
      { text: '一个人硬扛', delta: { sanity: -8, stamina: -5 }, flagSet: 'dropout_urge', consequence: '你把搜索记录删了，但念头还在。' },
    ],
  },
  {
    id: 'hospital_volunteer',
    stage: 'undergrad',
    title: '门诊志愿者',
    body: '周末去附属医院做导诊。你帮一位老人操作自助挂号机，他连"扫码"都不懂。',
    category: 'social',
    weight: 40,
    minTurn: 3,
    choices: [
      { text: '耐心教，多陪会儿', delta: { relations: 6, reputation: 3, stamina: -5 }, consequence: '老人非要塞给你一袋橘子。' },
      { text: '指个方向就行', delta: { relations: 1, stamina: -2 }, consequence: '你完成了工时，效率优先。' },
    ],
  },
  // —— 新增：让高中生"体验医学生入门"的初心与日常（R11）——
  {
    id: 'white_coat_ceremony',
    stage: 'undergrad',
    title: '第一次穿上白大褂',
    body: '开学典礼。老师把叠得方正的大褂递给你，左胸绣着你的名字。镜子里那个"准医生"，有点陌生，也有点帅。',
    category: 'study', weight: 80, once: true, minTurn: 1, maxTurn: 3,
    choices: [
      { text: '郑重地扣好每一颗扣子', delta: { knowledge: 3, sanity: 10, reputation: 2 }, consequence: '你拍了张照，发给了高三那年鼓励你的老师。' },
      { text: '觉得也就是件衣服', delta: { sanity: 4, knowledge: 1 }, consequence: '你把它套上，跑去了食堂。' },
    ],
  },
  {
    id: 'first_stethoscope',
    stage: 'undergrad',
    title: '第一次听到心跳',
    body: '技能课上，你把耳件塞好，膜片贴上同学的后背。"咚、咚、咚"——那是活生生的心脏，在你手里跳动。',
    category: 'clinical', weight: 75, once: true, minTurn: 2,
    choices: [
      { text: '屏住呼吸，记住这声音', delta: { knowledge: 5, sanity: 6 }, consequence: '你忽然懂了，听诊器连着另一个人的命。' },
      { text: '赶紧记下来应付考试', delta: { knowledge: 3, stamina: -3 }, consequence: '你忙着画听诊区，错过了那份触动。' },
    ],
  },
  {
    id: 'grade_anxiety',
    stage: 'undergrad',
    title: '绩点焦虑',
    body: '群里又有人晒了满绩。你看着自己不上不下的排名，想起"本科不努力，毕业当护士"的玩笑——虽然是玩笑，却扎心。',
    category: 'mental', weight: 55, minTurn: 4,
    choices: [
      { text: '制定计划，逐个补强', delta: { knowledge: 4, stamina: -8, sanity: -2 }, consequence: '你把弱课排进了每天的表。' },
      { text: '关掉群，专注自己', delta: { sanity: 6, relations: -2 }, consequence: '你退了卷王群，世界清静了。' },
      { text: '自暴自弃刷手机', delta: { sanity: -4, knowledge: -2 }, consequence: '一晚上过去，什么也没学。' },
    ],
  },
  {
    id: 'medschool_myth',
    stage: 'undergrad',
    title: '亲戚的灵魂发问',
    body: '过年饭桌上，二舅拍着你肩："学医好啊！以后家里人看病就不用排队了，顺便帮表弟看看这报告。"',
    category: 'social', weight: 50,
    choices: [
      { text: '笑着解释"我还只是学生"', delta: { relations: 3, sanity: -2 }, consequence: '你解释了半小时，他似懂非懂。' },
      { text: '硬着头皮看报告', delta: { knowledge: 2, relations: 2, sanity: -3 }, consequence: '你其实也看不太懂，只能含糊两句。' },
    ],
  },
  {
    id: 'student_loan',
    stage: 'undergrad',
    title: '学费与助学贷款',
    body: '医学院学制长、花费大。家里的积蓄经不起五年，助学贷款的说明摆在你面前。',
    category: 'financial', weight: 55, minTurn: 1,
    choices: [
      { text: '申请助学贷款，安心读书', delta: { sanity: 2 }, consequence: '你想：毕业了慢慢还。上学期间每季多一笔生活费，工作后再慢慢还。' },
      { text: '课余兼职赚生活费', delta: { money: 800, stamina: -10, knowledge: -2 }, consequence: '你周末发传单，少睡了几天。' },
    ],
  },

  // ==========================================================
  // 公告栏事件（financial / career / news / system）
  // 可行走场景里"公告栏"绑定这几个分类。此前本科阶段只有 4 条且多被 flag 锁住，
  // 玩家走到公告栏常年无事可领，故补齐覆盖全学制的钱与出路话题。
  // ==========================================================
  {
    id: 'ug_tuition_bill',
    stage: 'undergrad',
    title: '缴费单贴出来了',
    body: '财务处的红榜前挤满了人。临床医学的学费比隔壁文科高出一截，下面还有一行小字："住宿费、教材费另计"。',
    category: 'financial', weight: 60, maxTurn: 6, once: true,
    choices: [
      { text: '把账算清楚，报给爸妈', delta: { money: -1200, relations: 3, sanity: -3 }, consequence: '母亲在电话那头说"够用就行，别省"，你听出了她的犹豫。' },
      { text: '自己去申请学费减免', delta: { money: -400, stamina: -6, reputation: 1 }, flagSet: 'ug_tuition_waiver', consequence: '材料交了三轮，最后减了小半。' },
    ],
  },
  {
    id: 'ug_scholarship_notice',
    stage: 'undergrad',
    title: '奖学金评定公示',
    body: '公告栏贴出国家励志奖学金的申报通知。名额按绩点和贫困认定排，五千块，够半年生活费。',
    category: 'financial', weight: 55, minTurn: 3,
    newsTickerAfter: '【高校奖学金评审季：国家励志奖学金名额持续扩大】',
    choices: [
      { text: '认真准备材料去争', delta: { money: 5000, stamina: -8, reputation: 3 }, flagSet: 'ug_got_scholarship', consequence: '公示名单里有你的名字，你截图发给了家里。' },
      { text: '绩点不够，放弃', delta: { sanity: -3, knowledge: 1 }, consequence: '你盯着第一名的绩点看了很久。' },
    ],
  },
  {
    id: 'ug_tutoring_gig',
    stage: 'undergrad',
    title: '家教招聘启事',
    body: '"高三生物一对一，120/小时，要求医学院在读"。红纸黑字贴在最显眼的位置，电话号码已经被撕走了三个。',
    category: 'financial', weight: 55, minTurn: 2,
    choices: [
      { text: '接下来，周末去上课', delta: { money: 1800, stamina: -12, knowledge: 2 }, flagSet: 'ug_tutoring', consequence: '讲生物给别人听，反而把自己那块补牢了。' },
      { text: '嫌耽误时间，不接', delta: { knowledge: 2, stamina: 3 }, consequence: '你把周末还给了图书馆。' },
    ],
  },
  {
    id: 'ug_lab_assistant',
    stage: 'undergrad',
    title: '实验室招勤工助学',
    body: '基础医学院贴出招聘：洗器皿、配试剂、喂实验动物，每月八百，包一顿晚饭。备注写着"优先考虑有意向读研者"。',
    category: 'financial', weight: 50, minTurn: 4,
    choices: [
      { text: '去，顺便认识老师', delta: { money: 800, knowledge: 3, relations: 3, stamina: -10 }, flagSet: 'ug_lab_helper', consequence: '你在通风橱前站了一学期，也混了个脸熟。' },
      { text: '钱太少，不值得', delta: { sanity: 2 }, consequence: '你算了算时薪，摇了摇头。' },
    ],
  },
  {
    id: 'ug_medical_insurance',
    stage: 'undergrad',
    title: '学生医保缴费通知',
    body: '"每人每年三百二，逾期不补办。"你忽然意识到，学医的人自己也是会生病的。',
    category: 'system', weight: 45, minTurn: 2, maxTurn: 12, once: true,
    choices: [
      { text: '按时缴了', delta: { money: -320, sanity: 2 }, flagSet: 'ug_insured', consequence: '交完那一刻莫名踏实。' },
      { text: '忘了这回事', delta: { money: 0, sanity: -2 }, consequence: '直到室友半夜发烧挂急诊，你才想起自己没办。' },
    ],
  },
  {
    id: 'ug_career_talk',
    stage: 'undergrad',
    title: '就业指导讲座',
    body: '海报上写着《临床医学生职业发展路径》。台下坐了三成人，PPT 第一页就是"规培是必经之路"。',
    category: 'career', weight: 55, minTurn: 5,
    choices: [
      { text: '认真听完，记了笔记', delta: { knowledge: 3, reputation: 2, stamina: -4 }, flagSet: 'ug_career_aware', consequence: '你第一次看清了未来十年的时间表，有点喘不过气。' },
      { text: '听了一半提前溜了', delta: { sanity: 3, stamina: 2 }, consequence: '你想：还早呢。' },
    ],
  },
  {
    id: 'ug_alumni_return',
    stage: 'undergrad',
    title: '师兄回校分享',
    body: '公告栏贴着讲座预告：一位在读规培的师兄回来分享。海报上他穿着白大褂笑得很好看，底下有人小声说"听说他一个月拿三千"。',
    category: 'career', weight: 50, minTurn: 6,
    choices: [
      { text: '去听，问了很多问题', delta: { knowledge: 3, relations: 4, sanity: -4 }, flagSet: 'ug_met_alumni', consequence: '他说"别怕，熬过去就好了"，可你注意到他说这话时没抬头。' },
      { text: '不去，怕听到不想听的', delta: { sanity: 2, knowledge: -1 }, consequence: '你绕开了那张海报。' },
    ],
  },
  {
    id: 'ug_double_degree',
    stage: 'undergrad',
    title: '辅修与双学位招生',
    body: '"法学 / 心理学 / 生物信息学辅修班开始报名。"有人说医学生学点别的是退路，也有人说这是分心。',
    category: 'career', weight: 45, minTurn: 4, maxTurn: 14, once: true,
    choices: [
      { text: '报了，给自己留条路', delta: { knowledge: 4, money: -1500, stamina: -10, sanity: -2 }, flagSet: 'ug_double_major', consequence: '周末被填满了，但你心里踏实了些。' },
      { text: '专心本专业', delta: { knowledge: 3, sanity: 3 }, consequence: '你想：一件事做好就够难了。' },
    ],
  },
  {
    id: 'ug_news_wall_violence',
    stage: 'undergrad',
    title: '公告栏上的一则剪报',
    body: '不知谁把一张新闻剪下来贴在了角落：某地医生被患者家属打伤。旁边有人用铅笔写了一行小字——"还来得及转专业吗"。',
    category: 'news', weight: 45, minTurn: 3,
    newsTickerAfter: '【某三甲医院发生伤医事件，院方称已报警】',
    choices: [
      { text: '站着看了很久', delta: { sanity: -6, knowledge: 1 }, flagSet: 'ug_saw_violence_news', consequence: '你想起自己是为什么选这条路的，但一时想不起来了。' },
      { text: '把剪报揭下来扔了', delta: { sanity: -2, relations: 1 }, consequence: '你觉得不该让学弟学妹一进门就看到这个。' },
    ],
  },
  {
    id: 'ug_news_expansion',
    stage: 'undergrad',
    title: '招生规模又扩了',
    body: '教育部数据公示：临床医学专业今年招生人数再创新高。公告栏下有人算了一笔账："等我们毕业，同届有多少人在抢同一个岗位？"',
    category: 'news', weight: 45, minTurn: 5,
    newsTickerAfter: '【今年临床医学专业招生规模同比再增，就业压力引关注】',
    choices: [
      { text: '决定把自己变成少数', delta: { knowledge: 4, stamina: -8, sanity: -3 }, consequence: '你把绩点目标又往上调了一档。' },
      { text: '有点慌，但先不想', delta: { sanity: -4 }, consequence: '你合上手机，回宿舍睡了个午觉。' },
    ],
  },
  {
    id: 'ug_volunteer_recruit',
    stage: 'undergrad',
    title: '义诊志愿者招募',
    body: '红十字会招募社区义诊志愿者：量血压、测血糖、发健康手册。落款写着"计入第二课堂学分"。',
    category: 'career', weight: 50, minTurn: 3,
    choices: [
      { text: '报名去', delta: { relations: 5, reputation: 3, knowledge: 2, stamina: -8 }, flagSet: 'ug_volunteered', consequence: '一位老人握着你的手说"谢谢医生"，你想说自己还不是，但没舍得纠正。' },
      { text: '为学分去，走个过场', delta: { reputation: 1, stamina: -4 }, consequence: '你签了到，坐了两小时。' },
    ],
  },
  {
    id: 'ug_exchange_program',
    stage: 'undergrad',
    title: '交换生项目公示',
    body: '海外短期交换项目开始报名，费用自理。栏目下方贴着往届的照片：白大褂、蓝眼睛的带教、陌生的病房。',
    category: 'career', weight: 40, minTurn: 7, maxTurn: 16, once: true,
    choices: [
      { text: '砸钱去看看世界', delta: { money: -12000, knowledge: 5, reputation: 4, sanity: 6 }, flagSet: 'ug_exchange', consequence: '回来后你常说"原来还能那样管病人"。' },
      { text: '太贵了，看看就好', delta: { sanity: -2, knowledge: 1 }, consequence: '你把照片看了三遍，转身去了自习室。' },
    ],
  },

  // ==========================================================
  // 操场事件（mental）
  // 同理：此前 mental 分类仅 5 条且 3 条被 flag/属性锁住。
  // 操场是"喘口气"的地方，事件基调偏向自我消化与同伴支撑。
  // ==========================================================
  {
    id: 'ug_night_run',
    stage: 'undergrad',
    title: '夜跑的第 N 圈',
    body: '晚上十点的操场，跑道上零星几个人。你听着自己的呼吸，忽然发现这是一整天里唯一没有人跟你说话的时刻。',
    category: 'mental', weight: 55,
    choices: [
      { text: '再多跑两圈', delta: { stamina: -4, sanity: 8 }, consequence: '汗流下来的时候，脑子终于空了。' },
      { text: '坐在看台上发呆', delta: { sanity: 5, stamina: 2 }, consequence: '你看着教学楼还亮着的窗户，一层一层数过去。' },
    ],
  },
  {
    id: 'ug_sports_meet',
    stage: 'undergrad',
    title: '院运动会',
    body: '临床系对阵护理系。你被室友硬拉去凑人数，跑 4×100 的第三棒。',
    category: 'mental', weight: 45, minTurn: 3, maxTurn: 16, once: true,
    choices: [
      { text: '拼了，掉棒也认', delta: { stamina: -8, sanity: 10, relations: 6 }, consequence: '你们拿了第四名，但那晚的烧烤格外香。' },
      { text: '假装脚伤推掉', delta: { sanity: -3, relations: -4, stamina: 2 }, consequence: '你在宿舍刷手机，听见操场那边的欢呼。' },
    ],
  },
  {
    id: 'ug_talk_it_out',
    stage: 'undergrad',
    title: '操场边的长谈',
    body: '室友约你走两圈。走到第三圈时他忽然说："我最近老觉得自己不适合学医。"你发现，原来不止你一个人这么想。',
    category: 'mental', weight: 50, minTurn: 4,
    choices: [
      { text: '认真听他说完', delta: { sanity: 8, relations: 6, stamina: -3 }, flagSet: 'ug_peer_support', consequence: '你们在跑道上走到十一点，什么也没解决，但都轻松了些。' },
      { text: '劝他"都这样，忍忍"', delta: { sanity: 2, relations: -2 }, consequence: '他"嗯"了一声，没再说话。' },
    ],
  },
  {
    id: 'ug_psych_counseling',
    stage: 'undergrad',
    title: '心理咨询室的门',
    body: '操场旁的小楼挂着"大学生心理健康中心"。免费、保密。你在门口走了两个来回。',
    category: 'mental', weight: 45, minTurn: 5, requireStat: { sanity: [0, 55] },
    choices: [
      { text: '推门进去', delta: { sanity: 14, stamina: -2 }, flagSet: 'ug_sought_help', consequence: '咨询师说"你能来这里，本身就是件很勇敢的事"。' },
      { text: '还是算了，怕被人看见', delta: { sanity: -5 }, consequence: '你绕到操场另一头，跑了很久。' },
    ],
  },
  {
    id: 'ug_stargazing',
    stage: 'undergrad',
    title: '躺在草坪上',
    body: '解剖课刚结束，福尔马林的味道还黏在鼻腔里。你走到操场中间的草坪，仰面躺下。',
    category: 'mental', weight: 45, minTurn: 2,
    choices: [
      { text: '就这样躺半小时', delta: { sanity: 7, stamina: 3 }, consequence: '风把味道吹散了，你才起身回宿舍。' },
      { text: '想起大体老师，坐了很久', delta: { sanity: 3, knowledge: 2, relations: 1 }, consequence: '你想：他把身体给了我们，我至少得学明白。' },
    ],
  },
  {
    id: 'ug_call_home',
    stage: 'undergrad',
    title: '操场边给家里打电话',
    body: '信号最好的地方在操场东南角。父母问"钱够不够""吃得好不好"，你说都好。他们没问累不累。',
    category: 'mental', weight: 50, minTurn: 3,
    choices: [
      { text: '说了实话：有点撑不住', delta: { sanity: 10, relations: 5 }, consequence: '母亲沉默了一下，说"实在不行就回来"。你反而哭了。' },
      { text: '还是报喜不报忧', delta: { sanity: -3, relations: 2 }, consequence: '挂了电话，你在操场又坐了二十分钟。' },
    ],
  },

  // ==========================================================
  // 国家奖学金评比链
  // 与已有的 scholarship_review（轻量版）用 excludeFlag 互斥，避免同一局重复讲同一件事。
  // 链路：公示答辩 → 分数争议 → 结果
  // ==========================================================
  {
    id: 'ug_guojiang_apply',
    stage: 'undergrad',
    title: '国奖答辩',
    body: '八千块，一个年级两个名额。答辩现场坐满了人：有人 PPT 里挂着三篇综述，有人列了满屏的学生工作。轮到你了。',
    category: 'career', weight: 60, minTurn: 6, once: true,
    excludeFlag: 'ug_guojiang_done',
    requireStat: { knowledge: [45, 100] },
    choices: [
      {
        text: '实事求是地讲自己做过的',
        delta: { reputation: 4, stamina: -6, sanity: -2 }, flagSet: 'ug_guojiang_honest',
        nextEventId: 'ug_guojiang_result', consequence: '你讲完了，没夸大一句。台下有人小声说"太老实了"。',
      },
      {
        text: '把参与过的都算成"主要负责"',
        delta: { reputation: 6, stamina: -6, sanity: -5 }, flagSet: 'ug_guojiang_inflated',
        nextEventId: 'ug_guojiang_dispute', consequence: '你把"帮忙录数据"说成了"参与课题设计"。没人当场戳穿。',
      },
      { text: '弃权，把机会让出去', delta: { relations: 5, sanity: 3 }, flagSet: 'ug_guojiang_done', consequence: '你说"我今年材料不够"，其实是不想争。' },
    ],
  },
  {
    id: 'ug_guojiang_dispute',
    stage: 'undergrad',
    title: '有人提出了质疑',
    body: '公示期第三天，辅导员找你："有同学反映，你材料里那个课题，实际贡献存疑。"你手心开始出汗。',
    category: 'system', weight: 55, once: true, requireFlag: 'ug_guojiang_inflated',
    choices: [
      {
        text: '承认夸大，主动撤材料',
        delta: { reputation: -4, sanity: -6, relations: 2 }, flagSet: 'ug_guojiang_withdrew',
        consequence: '辅导员说"知错能改"，但名额没了，档案里也留了一行。',
      },
      {
        text: '死不承认，找导师背书',
        delta: { reputation: 3, relations: -6, sanity: -8 }, flagSet: 'ug_pulled_strings',
        nextEventId: 'ug_guojiang_result', consequence: '导师签了字。你拿到了钱，也拿到了一个再也甩不掉的名声。',
      },
    ],
  },
  {
    id: 'ug_guojiang_result',
    stage: 'undergrad',
    title: '国奖公示',
    body: '红榜贴在公告栏最中间。名字、专业、金额，一行一行印得很清楚。',
    category: 'career', weight: 60, once: true,
    requireFlag: 'ug_guojiang_honest',
    newsTickerAfter: '【教育部公示本年度国家奖学金名单，获奖学生超十万人】',
    choices: [
      { text: '名字在上面', delta: { money: 8000, reputation: 6, sanity: 8 }, flagSet: 'ug_guojiang_done', consequence: '你给家里打了电话，第一次听见父亲对别人说"我{son}拿了国奖"。' },
      { text: '差了零点几分', delta: { reputation: 2, sanity: -6, knowledge: 2 }, flagSet: 'ug_guojiang_done', consequence: '你盯着第一名的名字看了很久，然后回图书馆了。' },
    ],
  },

  // ==========================================================
  // 保研竞争链：绩点排名 → 灰色手段 → 举报与被举报
  // ==========================================================
  {
    id: 'ug_baoyan_race',
    stage: 'undergrad',
    title: '保研名单的最后一个位置',
    body: '推免比例 12%，你卡在第 13 名。差距零点零三个绩点。前面那个人，是和你一起上过解剖课的同学。',
    category: 'career', weight: 65, minTurn: 10, once: true,
    excludeFlag: 'baoyan',
    choices: [
      {
        text: '死磕最后一学期，把分刷回来',
        delta: { knowledge: 6, stamina: -16, sanity: -8 }, flagSet: 'ug_baoyan_grind',
        nextEventId: 'ug_baoyan_result', consequence: '你把选修课全换成了给分高的，绩点一分一分往上抠。',
      },
      {
        text: '找导师"沟通"一下加分项',
        delta: { reputation: 3, relations: -4, sanity: -6 }, flagSet: 'ug_pulled_strings',
        nextEventId: 'ug_baoyan_result', consequence: '导师说"你这个科研加分，我可以帮你写得漂亮点"。你说谢谢老师。',
      },
      {
        text: '接受结果，转去考研',
        delta: { sanity: 4, knowledge: 3 }, flagSet: 'ug_kaoyan', consequence: '你把保研的事翻篇了，第二天去买了考研资料。',
      },
    ],
  },
  {
    id: 'ug_baoyan_result',
    stage: 'undergrad',
    title: '推免名单公示',
    body: '教务处的红头文件贴出来了。名单按绩点排序，一行一行往下看。',
    category: 'career', weight: 60, once: true,
    choices: [
      {
        text: '你在名单里', delta: { reputation: 5, sanity: 10, knowledge: 2 }, flagSet: 'baoyan',
        requireStat: { knowledge: [90, 100] },
        consequence: '你反复刷新了三遍页面，确认那确实是自己的名字。',
      },
      {
        text: '还是差了一个位置', delta: { sanity: -10, knowledge: 3 }, flagSet: 'ug_kaoyan',
        consequence: '你在楼道里站了很久，然后去买了考研政治。',
      },
    ],
  },
  {
    id: 'ug_fake_paper',
    stage: 'undergrad',
    title: '"我帮你挂个名"',
    body: '一位师兄发来消息："有个水刊，两千块挂二作，下周就能见刊，保研加分够用了。"聊天框光标闪了很久。',
    category: 'career', weight: 50, minTurn: 8, once: true,
    choices: [
      {
        text: '转账，挂名',
        delta: { money: -2000, papers: 1, reputation: 4, sanity: -10, research: 2 }, flagSet: 'ug_fake_paper',
        effect: { kind: 'fake', severity: 'moderate' },
        consequence: '见刊那天你截了图，却没敢发朋友圈。',
      },
      {
        text: '拒绝，自己写一篇综述',
        delta: { knowledge: 5, stamina: -14, sanity: -3, papers: 1, research: 5 }, flagSet: 'ug_honest_paper',
        consequence: '你查了三个月文献，投了个普通期刊，但每个字都是自己的。',
      },
      { text: '删掉对话，当没看见', delta: { sanity: 2 }, consequence: '你把师兄的消息设成了免打扰。' },
    ],
  },
  {
    id: 'ug_whistleblow',
    stage: 'undergrad',
    title: '你发现了同学的假材料',
    body: '整理公示材料时，你认出那篇"一作论文"——期刊你查过，是本挂名就能上的水刊。而那个人，正好排在你前面。',
    category: 'system', weight: 50, minTurn: 9, once: true,
    excludeFlag: 'ug_fake_paper',
    choices: [
      {
        text: '实名举报，附上证据',
        delta: { reputation: 5, relations: -10, sanity: -8 }, flagSet: 'ug_whistleblower',
        nextEventId: 'ug_whistleblow_after', consequence: '学院受理了。你的名字在举报人一栏，很快就传开了。',
      },
      {
        text: '匿名举报',
        delta: { reputation: 1, relations: -3, sanity: -5 }, flagSet: 'ug_whistleblower_anon',
        nextEventId: 'ug_whistleblow_after', consequence: '你用新注册的邮箱发了出去，然后失眠了。',
      },
      {
        text: '算了，各人有各人的路',
        delta: { sanity: -4, knowledge: 1 }, flagSet: 'ug_looked_away',
        consequence: '你合上材料袋。有些事，你选择了不看见。',
      },
    ],
  },
  {
    id: 'ug_whistleblow_after',
    stage: 'undergrad',
    title: '举报之后',
    body: '通报下来了：材料作废，取消资格。可你走进教室时，说话声会低下去半拍。有人说你"清高"，有人说你"就是想抢名额"。',
    category: 'social', weight: 55, once: true,
    choices: [
      { text: '我做的是对的事', delta: { sanity: 6, reputation: 3, relations: -4 }, flagSet: 'ug_stood_firm', consequence: '你没解释。有个平时不熟的同学，默默给你带了份早饭。' },
      { text: '开始后悔了', delta: { sanity: -8, relations: 2 }, consequence: '你想：如果当初装作没看见，是不是就没这么多事。' },
    ],
  },

  // ==========================================================
  // 校园霸凌 / 孤立
  // ==========================================================
  {
    id: 'ug_bullying',
    stage: 'undergrad',
    title: '被排挤的那个人',
    body: '小组作业没人愿意和你一组；宿舍群把你踢了又说"手滑"；你的实验记录本被人涂花了一页。没人承认，也没人制止。',
    category: 'social', weight: 45, minTurn: 3, once: true,
    choices: [
      {
        text: '找辅导员反映',
        delta: { sanity: 4, relations: -3, reputation: 1 }, flagSet: 'ug_reported_bullying',
        nextEventId: 'ug_bullying_after', consequence: '辅导员说"我会了解一下"。之后开了个班会，没点名。',
      },
      {
        text: '自己忍下来，专心学习',
        delta: { sanity: -14, knowledge: 4, relations: -5 }, flagSet: 'ug_bullied_silent',
        consequence: '你把耳机音量调到最大，成绩反而更好了——这让你更难过。',
      },
      {
        text: '找到那个带头的，当面问清楚',
        delta: { sanity: -6, relations: 4, reputation: 2 }, flagSet: 'ug_confronted',
        nextEventId: 'ug_bullying_after', consequence: '他愣了一下，说"开玩笑而已"。但那之后，没人再动你的东西。',
      },
    ],
  },
  {
    id: 'ug_bullying_after',
    stage: 'undergrad',
    title: '之后的日子',
    body: '事情算是过去了。只是你走进宿舍时还会下意识扫一眼，看有没有人在看你。',
    category: 'mental', weight: 50, once: true,
    choices: [
      { text: '去心理中心聊聊', delta: { sanity: 12 }, flagSet: 'ug_sought_help', consequence: '咨询师说"被排挤不是你的错"。你愣了很久才点头。' },
      { text: '把注意力全放进课本', delta: { knowledge: 5, sanity: -4, stamina: -6 }, consequence: '你把自己活成了一座孤岛，但至少岛上很安静。' },
    ],
  },
  {
    id: 'ug_witness_bullying',
    stage: 'undergrad',
    title: '你看见了',
    body: '几个同学在群里刷屏嘲笑一个转专业过来的女生，说她"跟不上还占名额"。有人截图发到了年级群。',
    category: 'social', weight: 45, minTurn: 4, once: true,
    excludeFlag: 'ug_bullied_silent',
    choices: [
      { text: '在群里替她说话', delta: { relations: -4, reputation: 4, sanity: 5 }, flagSet: 'ug_defended_someone', consequence: '刷屏停了。她私聊你说了声谢谢，只有两个字。' },
      { text: '私下安慰她', delta: { relations: 5, sanity: 3 }, flagSet: 'ug_defended_someone', consequence: '你请她吃了顿饭，她说"你是第一个跟我说话的人"。' },
      { text: '装作没看到', delta: { sanity: -5, relations: 1 }, flagSet: 'ug_looked_away', consequence: '你划过了那些消息。晚上想起来，有点睡不着。' },
    ],
  },

  // ==========================================================
  // 留级与退学
  // 这两条会真正改变流程：ug_holdback 延长本科 4 个季度，
  // left_undergrad 直接触发结局（见 CampusScene.transitionToNext 与 endings.ts）。
  // ==========================================================
  {
    id: 'ug_academic_probation',
    stage: 'undergrad',
    title: '学业警示',
    body: '教务系统弹出红字：本学期两门核心课不及格，累计学分未达标，予以学业警示。附件是《留级与退学管理办法》。',
    category: 'system', weight: 55, minTurn: 5, once: true,
    requireStat: { knowledge: [0, 45] },
    choices: [
      {
        text: '申请重修，咬牙跟下一届读',
        delta: { sanity: -10, knowledge: 3, money: -3000 }, flagSet: 'ug_holdback',
        nextEventId: 'ug_holdback_life', consequence: '你留级了。原来的同学成了学长学姐，你要重新认识一个班。',
      },
      {
        text: '找老师求情，争取补考',
        delta: { knowledge: 4, stamina: -12, sanity: -6, reputation: -2 }, flagSet: 'ug_barely_passed',
        consequence: '补考过了，压线。老师说"下不为例"。',
      },
      {
        text: '这书没法读了',
        delta: { sanity: -8 }, nextEventId: 'ug_dropout_decision',
        consequence: '你把警示单截图发给了家里，然后关了手机。',
      },
    ],
  },
  {
    id: 'ug_holdback_life',
    stage: 'undergrad',
    title: '重修的日子',
    body: '你坐在比你小一届的教室里。老师点名时会多看你一眼，同学不知道该叫你同学还是{senior}。',
    category: 'mental', weight: 55, once: true, requireFlag: 'ug_holdback',
    choices: [
      { text: '把这一年当成重来一次的机会', delta: { knowledge: 8, sanity: 4, stamina: -8 }, flagSet: 'ug_holdback_recovered', consequence: '这次你听懂了。原来当初不是笨，是没喘过气。' },
      { text: '整天抬不起头', delta: { sanity: -12, knowledge: 2, relations: -5 }, consequence: '你坐最后一排，谁也不认识，谁也不想认识。' },
    ],
  },
  {
    id: 'ug_dropout_decision',
    stage: 'undergrad',
    title: '退学申请书',
    body: '表格就摊在桌上。签个字，五年变成一场空，但也就此解脱。父母在电话那头哭着说"再撑一撑"。',
    category: 'mental', weight: 50, minTurn: 4, once: true,
    requireStat: { sanity: [0, 40] },
    choices: [
      {
        text: '签了，我不学医了',
        delta: { sanity: 20, reputation: -10, knowledge: -10 }, flagSet: 'left_undergrad',
        consequence: '走出教务处那一刻，阳光刺得你睁不开眼。你哭了，但也终于能呼吸了。',
      },
      {
        text: '撕了表格，再撑一学期',
        delta: { sanity: -6, stamina: -6, knowledge: 3 }, flagSet: 'ug_stayed_after_urge',
        consequence: '你把碎纸片扔进垃圾桶，回教室上了下午的课。',
      },
      {
        text: '先休学一年，去看看别的活法',
        delta: { sanity: 14, knowledge: -4, money: 2000 }, flagSet: 'ug_gap_year',
        consequence: '你去南方打了一年工。回来时，你说"我想清楚了"。',
      },
    ],
  },
  {
    // 人际高光（关系门槛，外貌→起始人际解锁）：人缘好，班委改选被推举
    id: 'ug_class_rep',
    stage: 'undergrad',
    title: '班委改选',
    body: '班委改选，几个同学起哄让你当班长。你平时人缘好，大家都知道你靠得住——就是事多。',
    category: 'social', weight: 50, once: true, minTurn: 3,
    requireStat: { relations: [60, 100] },
    choices: [
      { text: '接下，组织活动', delta: { relations: 4, reputation: 4, stamina: -10, sanity: -3 }, flagSet: 'ug_class_rep', consequence: '运动会、班会、评奖，你忙得脚不沾地，但大家念你的好。' },
      { text: '推给别人', delta: { relations: 2, sanity: 2 }, consequence: '你把这份差事让了出去，落个清闲。' },
    ],
  },
];
