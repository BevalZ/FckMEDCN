import type { GameEvent } from './events';
import { NPCS } from './npc';

interface NpcLifeEchoProfile {
  npcId: string;
  stage: GameEvent['stage'];
  title: string;
  body: string;
  category: GameEvent['category'];
  requireFlag: string;
  minTurn?: number;
  maxTurn?: number;
  weight?: number;
  choices: GameEvent['choices'];
}

const TRUST_ECHOES: NpcLifeEchoProfile[] = [
  {
    npcId: 'roommate', stage: 'retirement', title: '旧宿舍群的消息',
    body: '退休后某天，旧宿舍群里跳出一张泛黄照片。[[npc:roommate]]问你还记不记得那盏总是忘关的台灯。你忽然意识到，有些人没有一直在身边，却一直保存着你最早的样子。',
    category: 'social', requireFlag: 'trust_roommate', minTurn: 3, weight: 45,
    choices: [
      { text: '约老同学见一面', delta: { sanity: 8, relations: 5, money: -500 }, consequence: '你们没有聊成就，只聊谁当年半夜爬起来背书。医学的一生，被还原成了几个年轻人的夜晚。' },
      { text: '在群里慢慢聊完', delta: { sanity: 5, relations: 3 }, consequence: '隔着屏幕也足够。你知道自己并没有把那段日子弄丢。' },
    ],
  },
  {
    npcId: 'classmate_topper', stage: ['master', 'phd'], title: '复试名单上的旧同学',
    body: '复试名单公示时，[[npc:classmate_topper]]的名字排在另一个方向前列。你们曾在同一张排名表里互相追赶，如今又站进新的竞争池。',
    category: 'career', requireFlag: 'trust_classmate_topper', minTurn: 1, maxTurn: 5, weight: 38,
    choices: [
      { text: '互相核对材料和面试题', delta: { knowledge: 4, relations: 4, stamina: -3 }, consequence: '你们没有假装不竞争，也没有把竞争变成敌意。' },
      { text: '只祝一句好运', delta: { sanity: 2, relations: 1 }, consequence: '有些关系能陪你过一段路，已经足够。' },
    ],
  },
  {
    npcId: 'library_partner', stage: ['master', 'phd'], title: '英文摘要前的重逢',
    body: '投稿前夜，你在共享文档里看见[[npc:library_partner]]的批注。她把一句中式英文改得很顺，还留言：“六级真题没有白刷。”',
    category: 'study', requireFlag: 'trust_library_partner', minTurn: 2, maxTurn: 8, weight: 36,
    choices: [
      { text: '请她继续帮你过一遍回复信', delta: { knowledge: 4, research: 3, relations: 3, stamina: -3 }, consequence: '你想起图书馆闭馆铃响的晚上，那些看似无用的训练终于有了去处。' },
    ],
  },
  {
    npcId: 'senior', stage: 'pinnacle', title: '主席台下的师兄',
    body: '你在大会上作报告，台下第一排坐着[[npc:senior]]。当年他帮你拆报考清单，如今你们都成了会场里被后辈追问的人。',
    category: 'career', requireFlag: 'trust_senior', minTurn: 2, weight: 35,
    choices: [
      { text: '报告后专门去打招呼', delta: { sanity: 5, relations: 5, reputation: 2 }, consequence: '他说：“你后来走得比我想的还远。”这句话比掌声更像一个句号。' },
    ],
  },
  {
    npcId: 'attending', stage: 'career', title: '带教主治来会诊',
    body: '多年后，[[npc:attending]]以外院专家身份来会诊。她看完你的病历，还是那句简短的评价：“思路清楚。”你忽然想起第一次上台时，她让你先学会配合。',
    category: 'clinical', requireFlag: 'trust_attending', minTurn: 4, weight: 38,
    choices: [
      { text: '把年轻医生也叫来一起听', delta: { clinical: 4, relations: 4, reputation: 2 }, consequence: '你把当年从她那里学到的分寸，转手递给了下一批人。' },
      { text: '会诊后认真道谢', delta: { sanity: 5, relations: 3 }, consequence: '成年后的感谢不再热烈，但更完整。' },
    ],
  },
  {
    npcId: 'headnurse', stage: 'career', title: '护士长退休前的提醒',
    body: '[[npc:headnurse]]退休前最后一次巡到你病区，仍然能一眼看出医嘱里的风险。她说：“你现在也是上级了，别忘了护士站为什么会拦你。”',
    category: 'clinical', requireFlag: 'trust_headnurse', minTurn: 5, weight: 36,
    choices: [
      { text: '把医护联合核对写进科室制度', delta: { reputation: 4, relations: 5, clinical: 2 }, consequence: '那不是怀旧，是把她护过你的方式变成后来人的安全网。' },
    ],
  },
  {
    npcId: 'fellow', stage: 'career', title: '师姐的科室群消息',
    body: '凌晨，[[npc:fellow]]在群里转来一个招聘和转岗信息。她没有劝你离开，只说：“如果哪天真撑不住，别等到最后一天才说。”',
    category: 'mental', requireFlag: 'trust_fellow', minTurn: 2, weight: 42,
    choices: [
      { text: '回她一句“我会认真想”', delta: { sanity: 7, relations: 3 }, consequence: '有些人不替你做决定，只替你保留选择。' },
      { text: '把消息转给更需要的年轻人', delta: { relations: 5, reputation: 2 }, consequence: '你成了当年她那样的人。' },
    ],
  },
  {
    npcId: 'advisor', stage: 'retirement', title: '导师的旧批注',
    body: '整理书柜时，你翻到[[npc:advisor]]当年改过的开题报告。红笔很密，语气很硬。隔了几十年，你终于能同时看见苛刻和托举。',
    category: 'personal', requireFlag: 'trust_advisor', minTurn: 2, weight: 45,
    choices: [
      { text: '把批注拍给学生看', delta: { sanity: 6, relations: 4, reputation: 2 }, consequence: '你告诉学生：标准可以高，但人不能被标准吞掉。' },
      { text: '给导师或同门打个电话', delta: { sanity: 5, relations: 3 }, consequence: '电话里没人说感人话，只是问近来身体怎么样。' },
    ],
  },
  {
    npcId: 'lab_senior', stage: 'career', title: '原始记录的证人',
    body: '一次论文质疑中，[[npc:lab_senior]]帮你找回多年前的原始记录扫描件。当年他逼你把失败实验也写进去，现在成了最硬的证据。',
    category: 'system', requireFlag: 'trust_lab_senior', minTurn: 3, weight: 34,
    choices: [
      { text: '公开补充数据和记录链', delta: { reputation: 5, research: 3, sanity: 3 }, consequence: '你没有靠关系压质疑，而是靠记录回答质疑。' },
    ],
  },
  {
    npcId: 'statistician', stage: 'pinnacle', title: '评审会上那支红笔',
    body: '项目评审会上，[[npc:statistician]]坐在专家席。她没有因为熟悉就放松问题，反而第一个追问主要终点和样本量。',
    category: 'career', requireFlag: 'trust_statistician', minTurn: 1, weight: 32,
    choices: [
      { text: '正面回答方法学短板', delta: { research: 4, reputation: 4, sanity: -2 }, consequence: '你们的关系没有替代专业，正因为这样才显得可靠。' },
    ],
  },
  {
    npcId: 'ethics_secretary', stage: 'career', title: '伦理审查的老熟人',
    body: '多中心项目启动前，[[npc:ethics_secretary]]再次退回你的材料。她说：“你现在名气大了，更不能把知情同意写虚。”',
    category: 'system', requireFlag: 'trust_ethics_secretary', minTurn: 2, weight: 34,
    choices: [
      { text: '按最高标准重写受试者保护', delta: { reputation: 4, research: 3, stamina: -4 }, consequence: '多年关系没有给你开后门，只让你更早知道哪条门不能走。' },
    ],
  },
  {
    npcId: 'intern_peer', stage: 'career', title: '同组实习生的转诊单',
    body: '一张外院转诊单上签着[[npc:intern_peer]]的名字。你们曾共享一本交接本，如今在不同医院照看同一个病人。',
    category: 'clinical', requireFlag: 'trust_intern_peer', minTurn: 2, weight: 36,
    choices: [
      { text: '把病程闭环完整回传', delta: { clinical: 3, relations: 4, reputation: 2 }, consequence: '她很快回了消息：“收到。还是你靠谱。”' },
    ],
  },
  {
    npcId: 'patient_family_rep', stage: 'career', title: '门诊里熟悉的姓氏',
    body: '多年后，一位患者家属说起当年父亲住院时，有个年轻医生愿意把话讲清。你看见系统备注，才想起那是[[npc:patient_family_rep]]一家。',
    category: 'social', requireFlag: 'trust_patient_family_rep', minTurn: 4, weight: 32,
    choices: [
      { text: '继续把解释说完整', delta: { relations: 5, reputation: 3, sanity: 2 }, consequence: '一次认真沟通，会在陌生人的家庭记忆里停很久。' },
    ],
  },
  {
    npcId: 'career_peer', stage: 'retirement', title: '送别会上的同组医生',
    body: '退休送别会上，[[npc:career_peer]]讲起你们一起补病历、一起扛投诉的那些年。没有宏大叙事，只有具体到床号的旧事。',
    category: 'social', requireFlag: 'trust_career_peer', minTurn: 1, weight: 42,
    choices: [
      { text: '认真听完，不急着谦虚', delta: { sanity: 8, relations: 5 }, consequence: '你承认自己确实和他们一起撑过了很多日子。' },
    ],
  },
  {
    npcId: 'ward_nurse', stage: 'retirement', title: '护士站留下的杯子',
    body: '清东西时，护士站把一只旧保温杯还给你。[[npc:ward_nurse]]说：“你忘在这儿好多年了，我们一直没扔。”',
    category: 'social', requireFlag: 'trust_ward_nurse', minTurn: 2, weight: 40,
    choices: [
      { text: '请护士站吃最后一次下午茶', delta: { relations: 6, sanity: 6, money: -600 }, consequence: '医生退休，护士站还在。你终于有时间慢慢说谢谢。' },
    ],
  },
  {
    npcId: 'graduate_student', stage: 'eternity', title: '学生站在你曾站过的位置',
    body: '病区里，[[npc:graduate_student]]已经能独立带组。你看见他提醒学生先听患者把话说完，像看见一句话绕了一圈又回到人间。',
    category: 'social', requireFlag: 'trust_graduate_student', minTurn: 2, weight: 45,
    choices: [
      { text: '把接力交给他', delta: { sanity: 8, reputation: 4 }, consequence: '传承不是他变成你，而是他在关键处记得你为什么那样做。' },
    ],
  },
];

const DISTANT_ECHOES: NpcLifeEchoProfile[] = [
  {
    npcId: 'senior', stage: 'career', title: '会议上的点头之交',
    body: '会议茶歇，你看见[[npc:senior]]站在不远处。你们曾经可以聊很久，如今只剩一个礼貌的点头。医学圈很小，小到疏远也会反复重逢。',
    category: 'mental', requireFlag: 'distant_senior', minTurn: 3, weight: 28,
    choices: [
      { text: '主动补一句近况', delta: { sanity: 3, relations: 3 }, consequence: '关系没有恢复如初，但至少不再只剩躲避。' },
      { text: '装作没看见', delta: { sanity: -3 }, consequence: '你很快走进会场，把这点不自在压进日程里。' },
    ],
  },
  {
    npcId: 'advisor', stage: 'retirement', title: '没有拨出的电话',
    body: '同门群里说[[npc:advisor]]身体不太好。你打开通讯录，又停住。多年疏远不是一件大事，而是很多次没有解释的小事。',
    category: 'mental', requireFlag: 'distant_advisor', minTurn: 2, weight: 32,
    choices: [
      { text: '还是拨过去', delta: { sanity: 5, relations: 2 }, consequence: '电话接通后，你们沉默了几秒。能说出口的已经不多，但至少没有继续拖到来不及。' },
      { text: '把手机放回去', delta: { sanity: -4 }, consequence: '你没有错过一个机会，你只是又一次重复了过去的选择。' },
    ],
  },
  {
    npcId: 'headnurse', stage: 'career', title: '护士站的冷淡',
    body: '你回到旧病区会诊，护士站换了新人，[[npc:headnurse]]却仍记得你当年嫌她多管闲事。她客气、周到，也保持距离。',
    category: 'social', requireFlag: 'distant_headnurse', minTurn: 2, weight: 26,
    choices: [
      { text: '当面承认当年不懂协作', delta: { relations: 5, sanity: 3, reputation: 1 }, consequence: '她没有立刻热络，只说：“懂了就好。”' },
      { text: '只谈会诊，不谈旧事', delta: { clinical: 2, relations: -1 }, consequence: '会诊顺利结束，关系也停在原地。' },
    ],
  },
];

const ROMANCE_LATE_ECHOES: NpcLifeEchoProfile[] = NPCS
  .filter(n => n.sex !== 'same_as_player' && Math.abs(n.ageOffset) <= 10)
  .map(n => ({
    npcId: n.id,
    stage: 'retirement',
    title: `和[[npc:${n.id}]]的旧排班表`,
    body: `退休后整理抽屉，你翻到一张很多年前的排班表。[[npc:${n.id}]]的名字和你的名字挨在一起。那时你们以为最难的是熬过下一个夜班，后来才知道，长期陪伴本身也是一门医学没有教的课。`,
    category: 'personal',
    requireFlag: `npc_romance_sustained_${n.id}`,
    minTurn: 1,
    weight: 30,
    choices: [
      { text: '把那张表夹进相册', delta: { sanity: 8, relations: 4 }, consequence: `[[npc:${n.id}]]看了很久，说：“原来我们真的走了这么远。”` },
      { text: '一起笑当年太能硬扛', delta: { sanity: 6, stamina: 2 }, consequence: '你们没有把苦日子说成浪漫，只承认彼此都在。' },
    ],
  }));

const knownNpcIds = new Set(NPCS.map(n => n.id));
const STATIC_ECHOES = [...TRUST_ECHOES, ...DISTANT_ECHOES];
for (const echo of STATIC_ECHOES) {
  if (!knownNpcIds.has(echo.npcId)) {
    throw new Error(`NPC life echo references unknown NPC: ${echo.npcId}`);
  }
}

export const NPC_LIFE_ECHO_EVENTS: GameEvent[] = [...STATIC_ECHOES, ...ROMANCE_LATE_ECHOES].map(echo => ({
  id: `npc_life_echo_${echo.npcId}_${Array.isArray(echo.stage) ? echo.stage.join('_') : echo.stage}_${echo.requireFlag.startsWith('distant_') ? 'distant' : echo.requireFlag.startsWith('npc_romance_sustained_') ? 'romance' : 'trust'}`,
  stage: echo.stage,
  title: echo.title,
  body: echo.body,
  category: echo.category,
  weight: echo.weight ?? 35,
  once: true,
  requireFlag: echo.requireFlag,
  minTurn: echo.minTurn,
  maxTurn: echo.maxTurn,
  choices: echo.choices,
}));
