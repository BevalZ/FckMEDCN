import type { GameEvent } from './events';

// "过去的选择在回响"：把各阶段埋下的 flag 在后续阶段兑现，形成贯穿一生的后果链。
// 每个事件都用 requireFlag 精确门控，确保只在玩家确实做过该选择时才出现。
// 这是把"死 flag"接成真实事件链的最后一块拼图（对应 ② 选择后果链）。
export const ECHO_EVENTS: GameEvent[] = [
  {
    id: 'echo_remember_initial', stage: ['master', 'career'], title: '你说过“我会记得”',
    body: '最疲惫的时候，你想起入学前夜收拾行李的自己。十八岁的你说过：“我会记得。”',
    category: 'mental', weight: 45, once: true, requireFlag: 'remember_初心', minTurn: 2,
    choices: [{ text: '记得不等于不累，但可以再走一步', delta: { sanity: 10, stamina: 5 }, consequence: '初心没有替你解决问题，但它替你挡住了一次彻底放弃。' }],
  },
  {
    id: 'echo_uncertain_initial', stage: 'career', title: '你当年就没有把话说满',
    body: '职业迷茫来临时，你并不意外。入学前夜你说的是“谁知道呢”——怀疑不是背叛，它一直是这条路的一部分。',
    category: 'mental', weight: 42, once: true, requireFlag: 'uncertain_初心', minTurn: 2,
    choices: [{ text: '允许自己重新选择留下的理由', delta: { sanity: 7, knowledge: 2 }, consequence: '你不再逼十八岁的自己替今天做决定。' }],
  },
  {
    id: 'echo_afraid_initial', stage: 'guipei', title: '恐惧重现',
    body: '第一次独立值班，电话响起前的几秒异常安静。你想起入学前夜那句：“其实我有点害怕。”',
    category: 'mental', weight: 48, once: true, requireFlag: 'afraid_初心', minTurn: 1,
    choices: [{ text: '害怕也可以按流程做事', delta: { sanity: 6, clinical: 3 }, consequence: '你没有等恐惧消失，而是先核对信息、再叫上级。' }],
  },
  // —— 时代1早期身份选择：白大衣与解剖课在后来的职业期回响 ——
  {
    id: 'echo_proud_whitecoat', stage: 'career', title: '那句誓词还在',
    body: '职业倦怠最重的一个夜班，你忽然想起大一白大衣仪式上喊出的那句誓词。那时你还相信，穿上它意味着责任，而不只是加班。',
    category: 'mental', weight: 42, once: true, requireFlag: 'proud_whitecoat', minTurn: 2,
    choices: [{ text: '把这份信念传给新人', delta: { sanity: 8, relations: 4, reputation: 2 }, consequence: '你没有立刻变得轻松，但第二天愿意再带一个学生查房。' }],
  },
  {
    id: 'echo_doubting_whitecoat', stage: ['master', 'career'], title: '你早就问过这个问题',
    body: '有人问你为什么还在医院。你想起大一白大衣仪式上的那个念头：这真的适合我吗？原来疑问一直没有消失，只是被日程表盖住了。',
    category: 'mental', weight: 40, once: true, requireFlag: 'doubting_whitecoat', minTurn: 1,
    choices: [{ text: '认真回答自己一次', delta: { sanity: 5, knowledge: 2 }, consequence: '你把“留下”从惯性里捞出来，重新看成了一次选择。' }],
  },
  {
    id: 'echo_showoff_whitecoat', stage: 'career', title: '那张白大衣自拍',
    body: '手机相册自动弹出一张旧照片：大一开学，你把白大衣拍得像一张入职海报。照片里的你还没有见过真正的病房。',
    category: 'personal', weight: 35, once: true, requireFlag: 'showoff_whitecoat', minTurn: 1,
    choices: [{ text: '留下照片，也留下距离感', delta: { sanity: 4, reputation: 2 }, consequence: '你笑了。那不是虚荣，只是十八岁时想证明自己已经长大。' }],
  },
  {
    id: 'echo_respected_cadaver', stage: 'career', title: '无言良师',
    body: '医院举行遗体捐献纪念活动。你想起大一解剖课上第一次向大体老师鞠躬的那个上午。',
    category: 'clinical', weight: 38, once: true, requireFlag: 'respected_cadaver', minTurn: 2,
    choices: [{ text: '向家属认真道谢', delta: { reputation: 4, sanity: 6 }, consequence: '你知道，医生面对的从来不只是器官和指标。' }],
  },
  {
    id: 'echo_cadaver_anxiety', stage: ['guipei', 'career'], title: '福尔马林的气味',
    body: '第一次独立操作前，你闻到消毒水里混着一点熟悉的气味。大一解剖课时的恶心和恐惧，短暂地回来了。',
    category: 'mental', weight: 45, once: true, requireFlag: 'fainted_cadaver', minTurn: 1,
    choices: [
      { text: '告诉带教，先做几次呼吸', delta: { sanity: 8, clinical: 2 }, consequence: '你没有逞强。缓过来以后，手反而稳了。' },
      { text: '假装没事，硬着头皮上', delta: { sanity: -8, stamina: -5 }, consequence: '你完成了操作，但知道这件事还没有真正过去。' },
    ],
  },
  {
    id: 'echo_avoided_cadaver', stage: 'career', title: '你曾经站在后排',
    body: '解剖教学纪念馆里，学生们围着一具人体模型提问。你忽然想起自己大一站在后排、尽量不看的那一节课。',
    category: 'mental', weight: 32, once: true, requireFlag: 'avoided_cadaver', minTurn: 2,
    choices: [{ text: '承认那时害怕过', delta: { sanity: 6, reputation: 2 }, consequence: '恐惧没有让你失去成为医生的资格，它只是提醒你曾经也是个普通人。' }],
  },
  {
    id: 'echo_clinical_anxiety', stage: ['guipei', 'career'], title: '门边的位置',
    body: '新来的学生总是站在病房门边，不敢靠近患者。你认得那个位置——你大二第一次进病房时也站在那里。',
    category: 'clinical', weight: 40, once: true, requireFlag: 'clinical_anxiety', minTurn: 1,
    choices: [{ text: '先让他观察，再请他做最小的一步', delta: { relations: 6, reputation: 3, sanity: 5 }, consequence: '你没有催他成为一个不存在的“完美医生”。' }],
  },
  // —— 本科埋下的回声 ——
  {
    id: 'echo_failed_physiology',
    stage: 'master',
    title: '当年挂的那门课',
    body: '本科生理挂过科。如今带教问起某个机制，你下意识比谁都认真——你不想再栽在同一个坑里。',
    category: 'study', weight: 40, once: true, requireFlag: 'failed_physiology', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '把短板补成强项', delta: { knowledge: 5, sanity: 3 }, consequence: '你成了组里生理问不倒的人。' },
    ],
  },
  {
    id: 'echo_passed_cet6',
    stage: 'master',
    title: '六级的底子',
    body: '当年六级一次过。如今读文献、写投稿，英语没拖后腿，你比同门省下不少力气。',
    category: 'study', weight: 40, once: true, requireFlag: 'passed_cet6', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '趁手熟多读原文', delta: { knowledge: 4 }, consequence: '你直接啃起了英文指南。' },
    ],
  },
  {
    id: 'echo_skills_lazy',
    stage: 'career',
    title: '手生的代价',
    body: '当年你说"真到临床自然就会"。可第一次独立操作，手还是生了，老师不得不接手。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'skills_lazy', minTurn: 1, maxTurn: 5,
    choices: [
      { text: '私下疯狂补练', delta: { knowledge: 4, stamina: -8, reputation: -2, sanity: -3 }, consequence: '你把欠的功课，一点一点还了。' },
      { text: '靠同事兜底', delta: { reputation: -4, relations: -3, sanity: -2 }, consequence: '你被人默默记在了"靠不住"那栏。' },
    ],
  },
  {
    id: 'echo_in_relationship',
    stage: 'career',
    title: '大学那场恋爱',
    body: '医学生的课表容不下太多浪漫。但当年图书馆并肩背书的那个人，你偶尔还会想起。',
    category: 'personal', weight: 35, once: true, requireFlag: 'in_relationship', minTurn: 2, maxTurn: 10,
    choices: [
      { text: '把它当作青春的余温', delta: { sanity: 6, relations: 2 }, consequence: '你笑了笑，继续写今天的病历。' },
    ],
  },

  // —— 实习埋下的回声 ——
  {
    id: 'echo_wrote_record',
    stage: 'career',
    title: '病历被当范本',
    body: '你写的病历，当年带教改了三处就夸"比上届强"。如今科室新人还在传看你的模板。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'wrote_record', minTurn: 1, maxTurn: 6,
    choices: [
      { text: '把经验传给新人', delta: { reputation: 4, relations: 4, knowledge: 2 }, consequence: '你成了"病历写得最好"的那个人。' },
    ],
  },
  {
    id: 'echo_did_puncture',
    stage: 'career',
    title: '那针腰穿的底气',
    body: '实习第一次穿刺手抖，如今你闭着眼都能定位。当年的突破感，成了今天的肌肉记忆。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'did_puncture', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '利落完成，带教放心', delta: { knowledge: 4, reputation: 3, stamina: -3 }, consequence: '年轻护士小声说"好稳"。' },
    ],
  },
  {
    id: 'echo_scolded',
    stage: 'career',
    title: '再没被当众骂过',
    body: '实习被带教当众训的那句"书本吃到狗肚子里"，你记了很多年。如今你做事滴水不漏。',
    category: 'clinical', weight: 40, once: true, requireFlag: 'scolded', minTurn: 1, maxTurn: 5,
    choices: [
      { text: '把教训变成严谨', delta: { reputation: 3, knowledge: 3, sanity: 4 }, consequence: '你再没在同一个坑里栽过。' },
    ],
  },
  {
    id: 'echo_night_shift_done',
    stage: 'career',
    title: '夜班是家常便饭',
    body: '实习第一个夜班你光着拖鞋跑过走廊。如今通宵对你已是常态，反而不觉得苦了。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'night_shift_done', minTurn: 1, maxTurn: 7,
    choices: [
      { text: '把作息调得更稳', delta: { stamina: 4, sanity: 3 }, consequence: '你摸索出了一套夜班生存法。' },
    ],
  },
  {
    id: 'echo_rotation_surgery',
    stage: 'career',
    title: '外科的那股劲儿',
    body: '实习你选了外科轮转，站了一天手术台。如今你站在台上，还是那股"爽"劲儿。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'rotation_surgery', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '把外科手艺练到精', delta: { knowledge: 5, reputation: 3, stamina: -6 }, consequence: '你成了台上靠谱的那把刀。' },
    ],
  },
  {
    id: 'echo_rotation_internal',
    stage: 'career',
    title: '内科的底子',
    body: '实习你选了内科打基础。如今面对复杂共病，你的思路比谁都清楚。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'rotation_internal', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '把功底变现成诊断力', delta: { knowledge: 5, reputation: 3 }, consequence: '疑难病例讨论，你总能点出关键。' },
    ],
  },

  // —— 规培埋下的回声 ——
  {
    id: 'echo_holiday_duty',
    stage: 'career',
    title: '节假日留守的人',
    body: '规培时你常在节假日值班，和同事泡面干杯。如今成家了，你依然习惯把团圆让给更需要的同事。',
    category: 'social', weight: 40, once: true, requireFlag: 'holiday_duty', minTurn: 3, maxTurn: 11,
    choices: [
      { text: '继续默默顶上', delta: { relations: 5, sanity: 4, reputation: 2 }, consequence: '同事念你的好。' },
      { text: '今年也想回家', delta: { relations: 2, sanity: 6 }, consequence: '你第一次排了自己的假。' },
    ],
  },
  {
    id: 'echo_phd_plan',
    stage: 'master',
    title: '早做打算的读博路',
    body: '规培时你就下定决心考博，提前联系了导师、看起了文献。如今过渡比同龄人顺。',
    category: 'study', weight: 40, once: true, requireFlag: 'phd_plan', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '把先发优势用足', delta: { knowledge: 5, reputation: 2, stamina: -4 }, consequence: '你比别人早半年入状态。' },
    ],
  },

  // —— 硕博埋下的回声 ——
  {
    id: 'echo_advisor_strict',
    stage: 'career',
    title: '严师出的高徒',
    body: '当年被导师每周汇报push。如今你带学生，也不自觉地把标准定得高。',
    category: 'career', weight: 45, once: true, requireFlag: 'advisor_strict', minTurn: 1, maxTurn: 8,
    choices: [
      { text: '把严谨传下去', delta: { reputation: 4, relations: 3, knowledge: 2 }, consequence: '你的学生也怕你，也服你。' },
    ],
  },
  {
    id: 'echo_advisor_pua',
    stage: 'career',
    title: '画饼与反画饼',
    body: '当年导师只谈理想不谈实惠。如今有人给你画饼，你一眼就识破。',
    category: 'social', weight: 40, once: true, requireFlag: 'advisor_pua', minTurn: 1, maxTurn: 8,
    choices: [
      { text: '守住自己的节奏', delta: { sanity: 5, reputation: 2 }, consequence: '你不再轻易被空头支票带走。' },
    ],
  },
  {
    id: 'echo_advisor_laissez',
    stage: 'career',
    title: '放养出的独立',
    body: '当年导师放养，你全靠自己摸索。如今遇到没人管的事，你反而最稳得住。',
    category: 'career', weight: 40, once: true, requireFlag: 'advisor_laissez', minTurn: 1, maxTurn: 8,
    choices: [
      { text: '把独立变成担当', delta: { reputation: 4, knowledge: 3 }, consequence: '疑难时刻，大家指望你拿主意。' },
    ],
  },
  {
    id: 'echo_sought_help',
    stage: 'career',
    title: '劝别人也求助',
    body: '当年你拨通了学校心理热线。如今有年轻同事撑不住，你第一个递上那串号码。',
    category: 'mental', weight: 45, once: true, requireFlag: 'sought_help', minTurn: 2, maxTurn: 10,
    choices: [
      { text: '把善意传下去', delta: { sanity: 6, relations: 5, reputation: 3 }, consequence: '你说："求助不丢人，我当年也打过。"' },
    ],
  },
  {
    id: 'echo_cheated',
    stage: 'career',
    title: '那次美化数据的刺',
    body: '当年为了过关改了两个数据。如今每次署名，那根刺还在——你再没碰过红线。',
    category: 'mental', weight: 40, once: true, requireFlag: 'cheated', minTurn: 2, maxTurn: 10,
    choices: [
      { text: '用干净的数据立信', delta: { reputation: 4, sanity: 4, knowledge: 2 }, consequence: '你成了科室里最较真的人。' },
      { text: '偶尔还是想走捷径', delta: { reputation: -3, sanity: -4 }, consequence: '那根刺，又疼了一下。' },
    ],
  },
  {
    id: 'echo_will_work',
    stage: 'career',
    title: '早工作的从容',
    body: '硕士毕业你就去工作，没在延毕和读博里绕。同龄人还在答辩，你已经管起了病人。',
    category: 'career', weight: 40, once: true, requireFlag: 'will_work', minTurn: 1, maxTurn: 6,
    choices: [
      { text: '把临床经验攒厚', delta: { knowledge: 4, reputation: 3, sanity: 3 }, consequence: '你比晚入场的人多三年手感。' },
    ],
  },
  {
    id: 'echo_topic_novel',
    stage: 'career',
    title: '冷门成了热点',
    body: '当年你赌了冷门方向。如今风口转过来，你竟成了前瞻的那个。',
    category: 'career', weight: 40, once: true, requireFlag: 'topic_novel', minTurn: 3, maxTurn: 11,
    choices: [
      { text: '把积累兑现', delta: { reputation: 5, knowledge: 4, money: 1500 }, consequence: '你受邀做了一次主旨报告。' },
    ],
  },
  {
    id: 'echo_delayed',
    stage: 'career',
    title: '延期换来的稳',
    body: '当年你接受延期保质量。如今那份"宁可慢一点"的脾气，让你少犯了很多错。',
    category: 'career', weight: 40, once: true, requireFlag: 'delayed', minTurn: 2, maxTurn: 9,
    choices: [
      { text: '把稳当成风格', delta: { reputation: 3, sanity: 4, knowledge: 2 }, consequence: '病人说：找你看病，踏实。' },
    ],
  },

  // ==========================================================
  // 本科学术诚信的回声
  // 挂名水刊 / 走关系 / 举报他人 / 见死不救式的旁观，都会在后面找回来。
  // ==========================================================
  {
    id: 'echo_fake_paper_audit',
    stage: ['master', 'phd'],
    title: '那本期刊被列入预警名单',
    body: '学校转发了《国际期刊预警名单》。你本科挂名的那本赫然在列，通知要求"自查并说明"。',
    category: 'system', weight: 55, once: true, requireFlag: 'ug_fake_paper', minTurn: 1, maxTurn: 8,
    choices: [
      {
        text: '主动说明，申请撤稿', delta: { papers: -1, reputation: -5, sanity: -6 }, flagSet: 'ug_fake_cleaned',
        effect: { kind: 'selfReport' },
        consequence: '撤稿函发出那天你反而睡了个好觉。导师说："早点了断是对的。"',
      },
      {
        text: '当作没看见，赌没人查到', delta: { sanity: -10, reputation: -1 }, flagSet: 'ug_fake_hidden',
        consequence: '你把那篇从简历里删了，但学位系统里还挂着。',
      },
    ],
  },
  {
    id: 'echo_fake_paper_exposed',
    stage: 'career',
    title: '陈年旧账被翻了出来',
    body: '晋升公示期，有人把你本科那篇挂名论文的截图匿名寄到了学术委员会。十几年前的两千块，现在要用职称来还。',
    category: 'system', weight: 50, once: true, requireFlag: 'ug_fake_hidden', minTurn: 3,
    choices: [
      { text: '坦白全过程，接受处理', delta: { reputation: -8, sanity: 4, papers: -1 }, consequence: '缓评一年。你说："该来的总会来。"心里反而空了下来。' },
      { text: '动用关系压下去', delta: { reputation: -3, relations: -6, sanity: -12 }, flagSet: 'career_covered_up', consequence: '事情压住了。此后每次听到"学术规范"四个字，你都会走神。' },
    ],
  },
  {
    id: 'echo_honest_paper',
    stage: ['master', 'phd'],
    title: '本科那篇综述',
    body: '导师翻你的简历："本科自己写的综述？查了多少文献？"你说三个月、两百多篇。他点点头："底子是那时候打的。"',
    category: 'study', weight: 45, once: true, requireFlag: 'ug_honest_paper', minTurn: 1, maxTurn: 6,
    choices: [
      { text: '把这份笨功夫继续下去', delta: { knowledge: 5, reputation: 3, sanity: 4 }, consequence: '你成了组里最会做文献综述的那个。' },
    ],
  },
  {
    id: 'echo_pulled_strings',
    stage: ['master', 'phd'],
    title: '"你是走关系进来的吧"',
    body: '组会散场，你听见两个同门在走廊上小声说你的名字。当年那份被"写得漂亮点"的加分材料，好像一直跟着你。',
    category: 'social', weight: 50, once: true, requireFlag: 'ug_pulled_strings', minTurn: 2, maxTurn: 9,
    choices: [
      { text: '用实打实的活儿堵住嘴', delta: { knowledge: 6, stamina: -12, reputation: 4, sanity: -4 }, flagSet: 'proved_himself', consequence: '一年后没人再提这事。但你自己记得。' },
      { text: '继续靠人脉铺路', delta: { relations: 3, reputation: -4, sanity: -6 }, consequence: '你越来越熟练，也越来越不敢一个人待着。' },
    ],
  },
  {
    id: 'echo_whistleblower',
    stage: ['master', 'phd', 'career'],
    title: '当年举报的那个人',
    body: '学术会议的茶歇，你和当年被你举报的同学撞了个正着。他现在在一家药企，名片递过来时手很稳。',
    category: 'social', weight: 45, once: true, requireFlag: 'ug_whistleblower', minTurn: 2,
    choices: [
      { text: '坦然打招呼', delta: { sanity: 8, relations: 3, reputation: 2 }, consequence: '他说"当年是我不对"。你们喝完了那杯咖啡。' },
      { text: '假装没看见', delta: { sanity: -5 }, consequence: '你绕去了另一侧的展台。' },
    ],
  },
  {
    id: 'echo_stood_firm',
    stage: 'career',
    title: '科里那个说真话的人',
    body: '科室要报一批"临床数据"，有人提议"美化一下"。所有人看向你——因为大家都知道，你本科时就干过举报这种事。',
    category: 'system', weight: 45, once: true, requireFlag: 'ug_stood_firm', minTurn: 3,
    choices: [
      { text: '还是那句话：数据不能改', delta: { reputation: 5, relations: -4, sanity: 6 }, consequence: '主任沉默了一会儿，说"按他说的办"。' },
      { text: '这次选择沉默', delta: { sanity: -10, relations: 3 }, consequence: '散会后你在楼梯间站了很久。你想起二十岁的自己。' },
    ],
  },
  {
    id: 'echo_looked_away',
    stage: ['guipei', 'career'],
    title: '又一次别过头',
    body: '你看见上级把一支明显过期的药推回了治疗车，什么也没说。那一瞬间你想起本科时合上的那个材料袋。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'ug_looked_away', minTurn: 2,
    choices: [
      { text: '这次开口了', delta: { reputation: 4, relations: -3, sanity: 8 }, flagSet: 'spoke_up_finally', consequence: '你说"老师，这个批号过期了"。空气安静了三秒，然后有人去换了药。' },
      { text: '又一次当作没看见', delta: { sanity: -8, relations: 1 }, consequence: '你发现自己已经很熟练了。这才是最让你难受的地方。' },
    ],
  },

  // ==========================================================
  // 本科经历（霸凌 / 留级 / 国奖）的回声
  // ==========================================================
  {
    id: 'echo_bullied',
    stage: ['guipei', 'career'],
    title: '你认得那种眼神',
    body: '科里新来的规培生总是一个人吃饭，被安排最脏最累的活，没人替他说话。你太熟悉那种缩着肩膀的样子了。',
    category: 'social', weight: 50, once: true, requireFlag: 'ug_bullied_silent', minTurn: 2,
    choices: [
      { text: '把他叫来一起吃饭', delta: { relations: 8, sanity: 12, reputation: 3 }, consequence: '他愣了一下。你说："我当年也这样过来的。"' },
      { text: '不想管，各人自扫门前雪', delta: { sanity: -8, relations: -2 }, consequence: '你从他身边走过去，脚步快了一点。' },
    ],
  },
  {
    id: 'echo_defended_someone',
    stage: 'career',
    title: '她记了很多年',
    body: '一封陌生邮件："李医生，我是XX届转专业的，当年群里只有你替我说话。我现在也是医生了。"',
    category: 'social', weight: 45, once: true, requireFlag: 'ug_defended_someone', minTurn: 4,
    choices: [
      { text: '回了一封长信', delta: { sanity: 14, relations: 5, reputation: 2 }, consequence: '你才知道，那两句话对一个人能有多重。' },
    ],
  },
  {
    id: 'echo_holdback',
    stage: ['internship', 'guipei'],
    title: '比同届晚一年',
    body: '同期规培的人里，有你本科时的学弟。他叫你"{seniorFellow}"，你笑着应了，心里过了一下那一年。',
    category: 'mental', weight: 45, once: true, requireFlag: 'ug_holdback', minTurn: 1, maxTurn: 8,
    choices: [
      { text: '晚一年也是走到了', delta: { sanity: 10, knowledge: 3 }, consequence: '你想：留级那年补的课，现在全用上了。' },
      { text: '还是有点在意', delta: { sanity: -5, knowledge: 2, stamina: -3 }, consequence: '你比谁都拼，怕别人觉得你不行。' },
    ],
  },
  {
    id: 'echo_guojiang',
    stage: ['master', 'phd'],
    title: '简历上那行国奖',
    body: '复试名单公示，你的材料被排在前面。导师说："本科拿过国奖的，底子一般不会差。"',
    category: 'career', weight: 45, once: true, requireFlag: 'ug_guojiang_done', minTurn: 1, maxTurn: 5,
    choices: [
      { text: '不辜负这份信任', delta: { reputation: 4, knowledge: 4, sanity: 4 }, consequence: '你第一个到实验室，最后一个走。' },
    ],
  },
  {
    id: 'echo_gap_year',
    stage: ['internship', 'guipei', 'career'],
    title: '休学那一年',
    body: '有人问你为什么比同届大一岁。你说休学过一年，在南方打工。对方本以为会听到一个失败的故事。',
    category: 'mental', weight: 45, once: true, requireFlag: 'ug_gap_year', minTurn: 2,
    choices: [
      { text: '"那一年我才想明白要什么"', delta: { sanity: 12, relations: 4, reputation: 2 }, consequence: '你说得很平静。对方看你的眼神变了。' },
    ],
  },
];
