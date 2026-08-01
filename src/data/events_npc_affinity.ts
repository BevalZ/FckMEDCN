import type { GameEvent } from './events';

// NPC 好感度门控的随机事件（REVIEW-INTERACTION P0 落地）：
// 让"大学四年和室友处好关系"有真实后果——关系决定你在随机事件里的处境。
// 门控用 npc.ts 自动打的 flag：trust_${id}（好感度≥70）/ distant_${id}（≤25）。
// 每个 NPC 2 个事件（信任向 + 疏远向），另加 2 个跨阶段回响（本科室友好感度延续到实习/职业）。

export const NPC_AFFINITY_EVENTS: GameEvent[] = [
  // ============ 室友 张宁 ============
  {
    id: 'aff_roommate_trust', stage: 'undergrad',
    title: '室友替你去点名',
    body: '今天上午的课，你实在起不来。张宁看了你一眼："行了，我帮你点个到，你多睡会儿。"——这就是把后背交给室友的感觉。',
    category: 'social', weight: 55, minTurn: 2, requireFlag: 'trust_roommate',
    choices: [
      { text: '记在心里，下次帮他顶班', delta: { relations: 5, sanity: 5, stamina: -2 }, consequence: '张宁回来把签到纸拍在你桌上："下次你请。"' },
      { text: '觉得理所当然', delta: { relations: -3, sanity: 1 }, consequence: '张宁没说什么，但你知道有些情分不能白用。' },
    ],
  },
  {
    id: 'aff_roommate_distant', stage: 'undergrad',
    title: '宿舍的冷空气',
    body: '你们已经一周没怎么说话了。今晚张宁打游戏到两点，你翻了个身，他也没关小音量。宿舍的灯亮着，却比夜还黑。',
    category: 'mental', weight: 45, minTurn: 2, requireFlag: 'distant_roommate', excludeFlag: 'trust_roommate',
    choices: [
      { text: '先开口，问他"最近是不是有事"', delta: { relations: 10, sanity: 6 }, flagSet: 'roommate_repaired', consequence: '他愣了半天，说"我家里出了点事，没处说"。那晚你们聊到很晚。' },
      { text: '戴上耳机，各过各的', delta: { sanity: -6, relations: -4 }, consequence: '你在自己的世界里待着，宿舍更安静了。' },
    ],
  },
  // ============ 学长 陈师兄 ============
  {
    id: 'aff_senior_trust', stage: 'undergrad',
    title: '师兄的实习内推',
    body: '陈师兄实习的医院有个暑期机会，名额紧俏。他直接把你名字报上去了："你基础扎实，别浪费了。"',
    category: 'career', weight: 45, minTurn: 3, requireFlag: 'trust_senior',
    choices: [
      { text: '谢过他，认真准备', delta: { knowledge: 4, reputation: 4, stamina: -6, relations: 3 }, flagSet: 'senior_referral', consequence: '面试那天师兄还帮你对了遍流程。你进去了。' },
      { text: '怕搞砸，让他换人', delta: { sanity: 4, relations: -3 }, consequence: '师兄说"行"，但眼神里有那么一点失望。' },
    ],
  },
  {
    id: 'aff_senior_distant', stage: 'undergrad',
    title: '被师兄冷落',
    body: '路上遇到陈师兄，你打招呼，他只"嗯"了一声就走。你想起上次借他资料没还、他问话你爱答不理——攒下的疏远，都在这一刻显形。',
    category: 'social', weight: 40, minTurn: 2, requireFlag: 'distant_senior',
    choices: [
      { text: '追上去，诚恳道歉补关系', delta: { relations: 10, sanity: 4, stamina: -3 }, flagSet: 'senior_repaired', consequence: '他说"不是生你的气，是我最近烦"。话开了，关系还有救。' },
      { text: '也冷着脸走开', delta: { sanity: -4, relations: -5 }, consequence: '你们互相绕道走了很久。' },
    ],
  },
  // ============ 带教 李老师 ============
  {
    id: 'aff_teacher_trust', stage: 'undergrad',
    title: '老师给你留了个名额',
    body: '李老师把你叫到办公室："下个月有个病例讨论会，学生代表有个发言位，你来。"——能让老师想到的学生，不多。',
    category: 'study', weight: 40, minTurn: 3, requireFlag: 'trust_teacher',
    choices: [
      { text: '认真备稿，讲出自己的思考', delta: { knowledge: 6, reputation: 5, stamina: -8, relations: 3 }, consequence: '你讲完，李老师带头鼓了掌。会后有几个同学来找你讨论。' },
      { text: '紧张到发挥失常', delta: { sanity: -8, reputation: -2 }, consequence: '你讲得磕磕绊绊，但老师还是说"勇气可嘉"。' },
    ],
  },
  {
    id: 'aff_teacher_distant', stage: 'undergrad',
    title: '带教不带你',
    body: '这学期的临床技能课，分组时李老师把别人都点了名，唯独跳过你。你知道是因为上次你说"知道了"转身就走的态度。',
    category: 'study', weight: 35, minTurn: 2, requireFlag: 'distant_teacher',
    choices: [
      { text: '主动找老师补上差距', delta: { clinical: 4, relations: 6, stamina: -5 }, flagSet: 'teacher_repaired', consequence: '你课后留下，把上次那个结练到标准。老师脸色缓和了。' },
      { text: '赌气不来上课', delta: { clinical: -2, sanity: -5, reputation: -2 }, consequence: '期末你的技能分不太好。' },
    ],
  },
  // ============ 辅导员 王辅导员 ============
  {
    id: 'aff_counselor_trust', stage: 'undergrad',
    title: '辅导员帮你争取助学金',
    body: '系里助学金名额紧，王辅导员把你的材料往前排了排："你家里情况我了解，这个名额该给你。"',
    category: 'financial', weight: 40, minTurn: 3, requireFlag: 'trust_counselor',
    choices: [
      { text: '记下这份帮助，努力学习', delta: { money: 2000, relations: 4, knowledge: 3 }, consequence: '补助到账那天，你给家里打了电话。' },
      { text: '拿到钱，觉得理所应当', delta: { money: 2000, relations: -3 }, consequence: '王老师看你的眼神淡了淡。' },
    ],
  },
  {
    id: 'aff_counselor_distant', stage: 'undergrad',
    title: '被叫去谈话',
    body: '王辅导员让你去办公室。你以为是出勤的事，开口却是："你最近状态不太对，是不是遇到什么了？"——你没打算告诉他。',
    category: 'mental', weight: 35, minTurn: 2, requireFlag: 'distant_counselor',
    choices: [
      { text: '破天荒说了真话', delta: { sanity: 10, relations: 8 }, flagSet: 'counselor_repaired', consequence: '他听完没批评，只说了句"早该来找我"。那晚你睡了个踏实觉。' },
      { text: '敷衍两句，说没事', delta: { sanity: -6, relations: -4 }, consequence: '他目送你离开，没再多问。' },
    ],
  },
  // ============ 实习带教 林主治 ============
  {
    id: 'aff_attending_trust', stage: 'internship',
    title: '林主治让你独立查房',
    body: '查房时，林主治把一组病人的听诊器递给你："你来，我在后面听着。"——这是实习以来最大的信任。',
    category: 'clinical', weight: 50, minTurn: 2, requireFlag: 'trust_attending',
    choices: [
      { text: '稳住，一条条查完', delta: { clinical: 6, reputation: 4, stamina: -10, sanity: -3 }, consequence: '你查完，林主治只说了句"不错"。她很少夸人。' },
      { text: '紧张到漏了一项', delta: { clinical: 2, sanity: -6, reputation: -2 }, consequence: '她补上了你漏的那一项，没多说，但你记住了。' },
    ],
  },
  // ============ 护士长 刘护士长 ============
  {
    id: 'aff_headnurse_trust', stage: 'internship',
    title: '护士长替你挡了一次',
    body: '家属闹事时，刘护士长挡在你前面："他是实习生，你有事冲我来。"她一个人把场面顶住了。',
    category: 'clinical', weight: 45, minTurn: 3, requireFlag: 'trust_headnurse',
    choices: [
      { text: '事后郑重道谢，记下这份护持', delta: { relations: 6, sanity: 6, reputation: 2 }, consequence: '她说"年轻人，我们都这么过来的"。' },
      { text: '觉得她多管闲事', delta: { relations: -5, sanity: -2 }, consequence: '后来你再有麻烦，护士站没人替你说话了。' },
    ],
  },
  // ============ 高年资规培 赵师姐 ============
  {
    id: 'aff_fellow_trust', stage: 'guipei',
    title: '师姐帮你顶了夜班',
    body: '你连轴转了三天，赵师姐看你脸色不对，把今晚的夜班接了过去："去睡吧，明早交班别迟到。"',
    category: 'social', weight: 45, minTurn: 2, requireFlag: 'trust_fellow',
    choices: [
      { text: '睡了一觉，第二天帮她分担', delta: { relations: 6, sanity: 8, stamina: 4 }, consequence: '她说"算你有良心"。你俩成了搭档。' },
      { text: '心安理得地接受', delta: { relations: -3, sanity: 4 }, consequence: '她没说什么，但下次有事不一定想到你了。' },
    ],
  },

  // ============ 跨阶段回响：本科室友好感度延续 ============
  {
    id: 'echo_roommate_career', stage: 'guipei',
    title: '老同学在医院重逢',
    body: '规培轮转时，你在电梯里遇见一个熟悉的身影——本科室友张宁。他转行政岗了，但一见你就笑："当年那张签到表，你还欠我一顿。"',
    category: 'social', weight: 40, minTurn: 2, requireFlag: 'trust_roommate',
    choices: [
      { text: '笑着请回那顿饭', delta: { relations: 6, sanity: 6, money: -300 }, consequence: '你们聊了一晚：有人转了行，有人还在临床。他祝你"站稳了"。' },
      { text: '寒暄几句就散', delta: { sanity: 3, relations: 2 }, consequence: '电梯门关上，你们各自奔忙。' },
    ],
  },
  {
    id: 'echo_senior_fellow_doctor', stage: 'career',
    title: '当年的师兄成了同行',
    body: '一场学术会议，茶歇时有人叫你名字——是陈师兄。他读了研、进了三甲，你们俩一个临床一个科研，隔了这些年又在同一个会场碰上了。',
    category: 'career', weight: 35, minTurn: 3, requireFlag: 'trust_senior',
    choices: [
      { text: '交换名片，约好以后多交流', delta: { relations: 5, reputation: 3, sanity: 4 }, consequence: '师兄说"这行越走越窄，还好老朋友还在"。' },
      { text: '点头致意，各自去听会', delta: { sanity: 2 }, consequence: '你们在各自的分会场里，成了对方回忆里的一角。' },
    ],
  },
];
