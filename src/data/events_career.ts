import type { GameEvent } from './events';

// 职业阶段事件池（career）。20 回合，覆盖晋升、科研、医患、科室政治、倦怠等。
// 注意：promote_zhuzhi 设置 passed_zhuzhi，与 endings.ts 的 stable_at_45 结局判定联动。
const LAWSUIT_CASES = [
  {
    key: 'internal', flag: 'sub_internal', label: '内科漏诊争议',
    first: '一位胸痛患者初诊心电图不典型，数小时后确诊心肌梗死。家属认为你延误诊断，把医院和你告上法庭。',
    second: '一位反复腹痛患者后来查出肿瘤，家属申请医疗损害鉴定，争议焦点是当时是否充分鉴别并安排复查。',
  },
  {
    key: 'surgery', flag: 'sub_surgery', label: '外科并发症争议',
    first: '一位患者术后出现出血并再次手术。家属质疑术中操作和术后观察，一纸诉状把医院和你告上法庭。',
    second: '一位患者术后发生吻合口漏，家属申请医疗损害鉴定，争议焦点是并发症告知与发现后的处置时机。',
  },
  {
    key: 'obgyn', flag: 'sub_obgyn', label: '产科急症争议',
    first: '一次分娩中突发产后出血，团队紧急抢救后家属仍质疑处置不够及时，把医院和你告上法庭。',
    second: '一位高危孕产妇出现新生儿不良结局，家属申请医疗损害鉴定，争议焦点是风险评估、监护与转剖宫产时机。',
  },
  {
    key: 'pediatrics', flag: 'sub_pediatrics', label: '儿科诊疗争议',
    first: '一名高热患儿病情进展很快，转入重症监护。家长认为首诊判断过于乐观，把医院和你告上法庭。',
    second: '一名反复喘息患儿再次急诊住院，家长申请医疗损害鉴定，争议焦点是出院交代、随访和吸入治疗指导。',
  },
] as const;

function lawsuitEvents(): GameEvent[] {
  return LAWSUIT_CASES.flatMap(spec => ([1, 2] as const).map(round => ({
    id: `career_lawsuit_${round}_${spec.key}`,
    stage: 'career',
    title: round === 1 ? `一纸诉状：${spec.label}` : `损害鉴定：${spec.label}`,
    body: `${round === 1 ? spec.first : spec.second}医务科让你准备病历、知情同意记录和应诉材料。`,
    category: 'clinical',
    weight: 1,
    once: true,
    minTurn: round === 1 ? 3 : 9,
    requireFlag: spec.flag,
    rankScaled: true,
    choices: round === 1 ? [
      { text: '请专业律师，整理证据正面应诉', delta: { money: -8000, stamina: -12, sanity: -6, reputation: 4 }, flagSet: 'lawsuit_done_1', consequence: '鉴定围绕诊疗规范和因果关系展开。你陈述清楚，执业记录保住了。' },
      { text: '接受医患办调解，赔偿后结案', delta: { money: -15000, sanity: 2, relations: -3 }, flagSet: 'lawsuit_done_1', consequence: '调解书签了，争议告一段落，但这份经历留在了心里。' },
      { text: '不请律师，自己准备答辩', delta: { money: -3000, sanity: -12, reputation: -4 }, flagSet: 'lawsuit_done_1', consequence: '对方围绕病历细节连续追问，你的答辩十分被动。' },
    ] : [
      { text: '请律师团队并申请补充鉴定', delta: { money: -12000, stamina: -14, sanity: -8, reputation: 3 }, flagSet: 'lawsuit_done_2', consequence: '补充鉴定厘清了部分责任，流程上保住了你的执业记录。' },
      { text: '主动调解，赔偿后终结争议', delta: { money: -20000, sanity: 4, relations: -4 }, flagSet: 'lawsuit_done_2', consequence: '赔偿到账，程序终结。你第一次认真考虑要不要换条路。' },
      { text: '由医院统一应对，完整配合调查', delta: { money: -6000, reputation: 2, relations: -2 }, flagSet: 'lawsuit_done_2', consequence: '医院承担主要应诉工作，你提交说明并参加了整改。' },
    ],
  })));
}

export const CAREER_EVENTS: GameEvent[] = [
  {
    id: 'promote_zhuzhi',
    stage: 'career',
    title: '升主治医师',
    body: '聘任文件下来了。你从"住院医"变成"主治医师"，名字后面能挂主治了。',
    category: 'career',
    weight: 90,
    minTurn: 1,
    maxTurn: 4,
    once: true,
    choices: [
      { text: '踏实接下这副担子', delta: { reputation: 6, knowledge: 4, stamina: -6 }, flagSet: 'passed_zhuzhi', consequence: '独立管组的第一晚，你失眠了。' },
      { text: '觉得也就那样', delta: { reputation: 2, sanity: 2 }, flagSet: 'passed_zhuzhi', consequence: '你请同事吃了顿饭，算过了关。' },
    ],
  },
  {
    id: 'promote_fugao',
    stage: 'career',
    title: '冲刺副主任医师',
    body: '年限到了，材料齐了。副高答辩在即，差一篇 SCI 可能就卡住。',
    category: 'career',
    weight: 75,
    minTurn: 8,
    once: true,
    requireFlag: 'passed_zhuzhi',
    newsTickerAfter: '【卫生高级职称评审结果公布：评价体系加快向临床实绩倾斜】',
    choices: [
      { text: '埋头补文章、备答辩', delta: { reputation: 6, knowledge: 5, papers: 1, stamina: -14, sanity: -4 }, flagSet: 'passed_fugao', consequence: '答辩通过那天，你给恩师发了条消息。' },
      { text: '递交现有材料，接受评审结果', delta: { reputation: -2, stamina: -8, sanity: -7 }, flagSet: 'fugao_failed', consequence: '公示名单没有你：临床工作量差一分，名额也已用完。材料被退回，你只能等下一批。' },
      { text: '顺其自然，下批再战', delta: { sanity: 4 }, consequence: '你把材料收进抽屉。' },
    ],
  },
  {
    id: 'promote_fugao_retry',
    stage: 'career',
    title: '副高重申',
    body: '又熬过一年。你补齐临床工作量、论文和继续教育学分，把上次被退的材料重新装订。',
    category: 'career', weight: 80, once: true, minTurn: 12,
    requireFlag: 'fugao_failed',
    choices: [
      { text: '再进一次评审室', delta: { reputation: 6, knowledge: 4, stamina: -12, sanity: -4 }, flagSet: 'passed_fugao', consequence: '这次名单上有你。落选那一年没有白熬。' },
      { text: '暂缓申报，先把临床做好', delta: { clinical: 4, sanity: 3, stamina: -4 }, consequence: '你把材料留到下一轮，先回病房。' },
    ],
  },
  {
    id: 'research_metric',
    stage: 'career',
    title: '科研指标压顶',
    body: '科室墙上贴着"国自然命中率""SCI 数量排名"。你临床忙成狗，还得挤时间写标书。',
    category: 'career',
    weight: 85,
    choices: [
      { text: '熬夜写标书', delta: { papers: 1, knowledge: 4, stamina: -14, sanity: -5 }, consequence: '你把周末交给了文献。' },
      { text: '专注临床，放下指标', delta: { knowledge: 3, sanity: 3, reputation: -3 }, consequence: '你选择了病人，放弃了排名。' },
    ],
  },
  {
    id: 'teach_intern',
    stage: 'career',
    title: '带教实习生',
    body: '今年你分到一个规培生。他笨手笨脚的样子，像极了当年的你。',
    category: 'career',
    weight: 65,
    choices: [
      { text: '耐心带，像当年被带的那样', delta: { reputation: 4, relations: 4, stamina: -6 }, flagSet: 'mentored', consequence: '他第一次独立穿刺成功，冲你笑。' },
      { text: '嫌麻烦，丢给他跑腿', delta: { stamina: -2, reputation: -2 }, consequence: '你想起自己也曾被这样对待。' },
    ],
  },
  {
    id: 'medical_dispute',
    stage: 'career',
    title: '医疗纠纷',
    body: '一位家属认定"手术没做好"，拉横幅、写投诉、要赔偿。医务科找你谈话。',
    category: 'clinical',
    weight: 80,
    choices: [
      { text: '配合调查，留好病历', delta: { reputation: 2, sanity: -8, stamina: -6 }, flagSet: 'dispute_happened', consequence: '鉴定结果还了你清白，但那周很难熬。' },
      { text: '委屈、自我怀疑', delta: { sanity: -12, stamina: -4 }, flagSet: 'dispute_happened', consequence: '你开始犹豫当初为什么选这行。' },
    ],
  },
  {
    id: 'dept_politics',
    stage: 'career',
    title: '科室政治',
    body: '主任快退了，两个副主任暗暗较劲。你被隐约要求"站队"。',
    category: 'social',
    weight: 60,
    choices: [
      { text: '两头不得罪，干好活', delta: { reputation: 2, sanity: -3 }, consequence: '你把自己埋进病历里。' },
      { text: '靠近实权副主任', delta: { reputation: 4, relations: -4, sanity: -2 }, flagSet: 'picked_side', consequence: '你押了一注。' },
      { text: '公然不站队', delta: { relations: -3, sanity: 3 }, consequence: '你保持了自己的节奏。' },
    ],
  },
  {
    id: 'multi_site_practice',
    stage: 'career',
    title: '多点执业',
    body: '政策允许医师多点执业。一家私立机构请你周末出诊，报酬可观。',
    category: 'career',
    weight: 60,
    choices: [
      { text: '周末去多点执业', delta: { money: 4000, stamina: -12, knowledge: 2 }, flagSet: 'multi_site', consequence: '你多了一份收入，少了一天休息。' },
      { text: '不折腾，专心本职', delta: { sanity: 3 }, consequence: '你怕惹麻烦，婉拒了。' },
    ],
  },
  {
    id: 'internet_med',
    stage: 'career',
    title: '互联网医疗',
    body: '某平台邀请你线上问诊，按单提成。碎片时间能变现，但评价系统像外卖打分。',
    category: 'career',
    weight: 55,
    choices: [
      { text: '开个线上诊室', delta: { money: 2000, reputation: 3, stamina: -6 }, flagSet: 'internet_doc', consequence: '你多了几百个"关注"。' },
      { text: '不碰，怕差评', delta: { sanity: 2 }, consequence: '你见过同行被一条差评搞崩心态。' },
    ],
  },
  {
    id: 'career_night_shift',
    stage: 'career',
    title: '十年后的夜班',
    body: '你早已不是那个光脚跑走廊的实习生。但凌晨三点的监护仪，依旧刺眼。',
    category: 'clinical',
    weight: 80,
    choices: [
      { text: '习惯性地顶住', delta: { stamina: -10, knowledge: 3, sanity: -3 }, consequence: '你泡了杯浓茶，继续看片子。' },
      { text: '偶尔也犯怵', delta: { stamina: -6, sanity: -5 }, consequence: '你想起了当年那个想退学的夜晚。' },
    ],
  },
  {
    id: 'patient_complaint',
    stage: 'career',
    title: '一条差评',
    body: '出院随访系统里，你被打了"态度冷淡"的一星。你记得那天你连轴转了 16 小时。',
    category: 'social',
    weight: 55,
    choices: [
      { text: '反思，下次更耐心', delta: { relations: 4, sanity: -2 }, consequence: '你把那条评价设成了屏保。' },
      { text: '觉得委屈，无所谓', delta: { sanity: -4, relations: -2 }, consequence: '你关掉页面，安慰自己"清者自清"。' },
    ],
  },
  {
    id: 'colleague_competition',
    stage: 'career',
    title: '同侪的压力',
    body: '同学群里，有人升了副高，有人发了顶刊，有人年薪翻倍。你默默退了群。',
    category: 'social',
    weight: 55,
    choices: [
      { text: '把它当动力', delta: { knowledge: 4, stamina: -6, sanity: -2 }, consequence: '你重新打开文献管理软件。' },
      { text: '关掉比较，过自己的', delta: { sanity: 6, relations: -2 }, consequence: '你退了群，世界安静了。' },
    ],
  },
  {
    id: 'burnout_career',
    stage: 'career',
    title: '职业倦怠',
    body: '你发现自己开始机械地问诊、开单、签字。听诊器挂在脖子上，却听不进心跳。',
    category: 'mental',
    weight: 65,
    once: true,
    excludeFlag: 'ca_rested',
    choices: [
      { text: '请个年假，出门走走', delta: { sanity: 12, stamina: 6, money: -2000 }, flagSet: 'burnout_seen', consequence: '海边三天，你重新听见了浪声。' },
      { text: '硬撑，假期也值班', delta: { sanity: -8, stamina: -6 }, flagSet: 'burnout_seen', consequence: '你把自己又塞回了白大褂。' },
    ],
  },
  {
    id: 'family_vs_duty',
    stage: 'career',
    title: '家庭的电话',
    body: '孩子发烧，爱人说"你能不能回来一趟"。而你刚换上手术衣，台上躺着病人。',
    category: 'social',
    weight: 60,
    requireMarital: 'married',
    choices: [
      { text: '托家人，先上台', delta: { relations: -6, sanity: -4, reputation: 3 }, consequence: '手术很成功，你下了台才回拨电话。' },
      { text: '协调换台，回家一趟', delta: { relations: 6, stamina: -4, reputation: -2 }, consequence: '同事替了你，你抱了抱孩子。' },
    ],
  },
  {
    id: 'career_single_life',
    stage: 'career',
    title: '一个人的除夕',
    body: '值班室只剩你。家人问"今年回不回来"，你回"科里走不开"。单身的好处是自由，代价是没人专门等你。',
    category: 'social', weight: 50, requireMarital: 'single',
    choices: [
      { text: '给家里打个长电话', delta: { relations: 6, sanity: 4, stamina: -2 }, consequence: '母亲在那一头念叨"早点找一个"。' },
      { text: '约朋友出来跨年', delta: { sanity: 6, relations: 3, money: -500 }, consequence: '你们在火锅店碰了杯。' },
    ],
  },
  {
    id: 'academic_recognition',
    stage: 'career',
    title: '一丝认可',
    body: '你的一篇论文被同行引用，一位前辈说"你这块做得不错"。',
    category: 'career',
    weight: 50,
    choices: [
      { text: '把它记在心里', delta: { reputation: 4, knowledge: 2, sanity: 6 }, consequence: '这点光，够你撑一阵。' },
    ],
  },
  {
    id: 'lawsuit_fear',
    stage: 'career',
    title: '执业环境的寒意',
    body: '新闻里又一起伤医事件。你下意识把白大褂脱在更衣室，不想穿出院门。',
    category: 'mental',
    weight: 50,
    choices: [
      { text: '和同事抱团取暖', delta: { relations: 5, sanity: -2 }, consequence: '你们在值班室聊到天亮。' },
      { text: '独自消化不安', delta: { sanity: -6 }, consequence: '你给家人设了"别提医院"的规矩。' },
    ],
  },
  {
    id: 'midlife_review',
    stage: 'career',
    title: '中年的镜子',
    body: '某天你路过镜子，发现鬓角白了。从高考填志愿到现在，二十年了。值得吗？',
    category: 'mental',
    weight: 45,
    minTurn: 9,
    once: true,
    choices: [
      { text: '"虽苦，但不悔"', delta: { sanity: 8, reputation: 2 }, consequence: '你拍了拍镜子里那个年轻人。' },
      { text: '"如果重来，未必还选"', delta: { sanity: -4, stamina: -2 }, consequence: '你叹了口气，转身去交班。' },
    ],
  },
  // —— 以下为"前期选择后果链"：让规培/实习埋下的 flag 在职业阶段真正兑现 ——
  {
    id: 'career_licensed',
    stage: 'career',
    title: '执业证在手',
    body: '当年咬牙考下的执业医师证，此刻成了独立值班、开方、签医嘱的硬门槛。',
    category: 'career', weight: 70, once: true, requireFlag: 'licensed', minTurn: 1, maxTurn: 3,
    choices: [
      { text: '独立管组，底气更足', delta: { reputation: 4, knowledge: 3, sanity: 4 }, consequence: '你签下的每一张医嘱，都不再需要别人兜底。' },
    ],
  },
  {
    id: 'career_relicense',
    stage: 'career',
    title: '补考执业医师资格',
    body: '规培时那次裸考差了几分。如今要独立执业，这张证绕不过去，只能重来。',
    category: 'career', weight: 55, once: true, requireFlag: 'licensure_risk', minTurn: 1, maxTurn: 4,
    choices: [
      { text: '脱产突击，把证拿下', delta: { knowledge: 6, stamina: -14, sanity: -4 }, flagSet: 'licensed', consequence: '查分通过那刻，你长出一口气。' },
      { text: '边干边考，险象环生', delta: { knowledge: 3, stamina: -10, sanity: -8 }, flagSet: 'licensed', consequence: '你在值班间隙刷完了题库。' },
    ],
  },
  {
    id: 'career_safe_case',
    stage: 'career',
    title: '当年那次差错',
    body: '医务部把你在规培时主动上报的那次用药差错，写成了科室安全案例。你成了"会报错"的人。',
    category: 'career', weight: 50, once: true, requireFlag: 'near_error', minTurn: 2, maxTurn: 7,
    choices: [
      { text: '把经验分享给新人', delta: { reputation: 5, relations: 4, knowledge: 2 }, consequence: '你带的规培生少走了弯路。' },
    ],
  },
  {
    id: 'career_patient_loss',
    stage: 'career',
    title: '又一次送走病人',
    body: '你主管的病人还是走了。和当年实习第一次见死亡不同，这次你更稳，却也更沉。',
    category: 'clinical', weight: 55, requireFlag: 'saw_death',
    choices: [
      { text: '和家属好好交代', delta: { reputation: 3, relations: 3, sanity: -4 }, consequence: '你见过太多这样的告别，却依然认真。' },
      { text: '自己消化，继续看下一位', delta: { stamina: -4, sanity: -6 }, consequence: '你把那页病历轻轻合上。' },
    ],
  },
  {
    id: 'career_er_veteran',
    stage: 'career',
    title: '急诊练出的手感',
    body: '当年实习在急诊轮科攒下的那点"应变本能"，如今在突发抢救里真用上了。',
    category: 'clinical', weight: 50, once: true, requireFlag: 'rotation_er', minTurn: 4, maxTurn: 9,
    choices: [
      { text: '带组冲在前面', delta: { knowledge: 5, reputation: 4, stamina: -8 }, consequence: '年轻医生看你一眼，安心了。' },
    ],
  },
  // —— 新增：职业生涯里"被需要"的回响（R15，契合高中生体验医生一生）——
  {
    id: 'career_patient_recognizes',
    stage: 'career',
    title: '街头被认出来了',
    body: '超市里，一位大姐拽住你："你是不是X医院的李大夫？当年我爸就是你救回来的！"你其实早忘了，但她记得。',
    category: 'social', weight: 55, minTurn: 5,
    choices: [
      { text: '笑着听她讲完', delta: { sanity: 12, relations: 5, reputation: 3 }, consequence: '那一刻，白大褂的分量突然具体起来。' },
      { text: '客气说"应该的"', delta: { sanity: 6, relations: 1 }, consequence: '你心里却暖了很久。' },
    ],
  },
  {
    id: 'career_routine_heroism',
    stage: 'career',
    title: '没有新闻的平凡一天',
    body: '没有抢救，没有热搜。你只是把三十七个病人稳稳看完，把一个老人的药调准了半片。',
    category: 'clinical', weight: 60, minTurn: 2,
    choices: [
      { text: '把这"无聊"当作踏实', delta: { sanity: 6, knowledge: 2, reputation: 2 }, consequence: '你发现，大多数医生的大多数日子都是这样。' },
      { text: '还是渴望点大场面', delta: { sanity: -2, knowledge: 1 }, consequence: '你羡慕朋友圈里同行的高光。' },
    ],
  },
  // —— "过去的选择在回响"：把规培/实习/本科埋下的 flag 在职业阶段兑现（R19–R24）——
  {
    id: 'career_calm_in_dispute',
    stage: 'career',
    title: '面对医闹，你很稳',
    body: '当年规培时亲眼见过医患冲突。这次家属拍桌子，你竟比周围人都冷静，三言两语把火压了下去。',
    category: 'clinical', weight: 50, once: true, requireFlag: 'saw_conflict', minTurn: 1, maxTurn: 6,
    choices: [
      { text: '把经验传给年轻医生', delta: { reputation: 4, relations: 4, sanity: 3 }, consequence: '你成了科室里"压得住场"的那个人。' },
    ],
  },
  {
    id: 'career_top_base_legacy',
    stage: 'career',
    title: '顶尖基地的光环',
    body: '简历上"XX顶尖医院规培"几个字，让同行和患者都多信你三分。光环也意味着更高的期待。',
    category: 'career', weight: 50, once: true, requireFlag: 'base_top', minTurn: 1, maxTurn: 5,
    choices: [
      { text: '把期待变成动力', delta: { reputation: 5, knowledge: 3, stamina: -4 }, consequence: '你不想给母校丢脸。' },
      { text: '压力有点喘不过气', delta: { sanity: -3, reputation: 2 }, consequence: '你怕哪天被人发现"也就那样"。' },
    ],
  },
  {
    id: 'career_no_phd_ok',
    stage: 'career',
    title: '没读博，也站稳了',
    body: '当年规培时你说"不读博去基层也行"。如今你靠手艺和口碑，在科里有一席之地。',
    category: 'career', weight: 45, once: true, requireFlag: 'no_phd', minTurn: 3, maxTurn: 9,
    choices: [
      { text: '挺满意现在的自己', delta: { sanity: 8, reputation: 3, relations: 3 }, consequence: '路不止一条。' },
    ],
  },
  {
    id: 'career_suture_confidence',
    stage: 'career',
    title: '第一次缝合的底气',
    body: '台上遇到要缝合，你手不抖了。当年规培第一次主刀缝合的记忆，成了今日的肌肉记忆。',
    category: 'clinical', weight: 45, once: true, requireFlag: 'suture_done', minTurn: 2, maxTurn: 8,
    choices: [
      { text: '利落收尾', delta: { knowledge: 4, reputation: 3, stamina: -4 }, consequence: '年轻护士小声说"好稳"。' },
    ],
  },
  {
    id: 'career_reunion_quitter',
    stage: 'career',
    title: '和当年退培的朋友吃饭',
    body: '规培时退培去药企的老友约你。他现在年薪可观，你成了主治。两杯酒下肚，谁也没说谁选错了。',
    category: 'social', weight: 45, once: true, requireFlag: 'colleague_left', minTurn: 4, maxTurn: 11,
    choices: [
      { text: '真心替他高兴', delta: { relations: 6, sanity: 6 }, consequence: '你们约好明年再聚。' },
      { text: '暗暗比较得失', delta: { sanity: -3, relations: -2 }, consequence: '你回去路上有点怅然。' },
    ],
  },
  {
    id: 'career_glad_stayed',
    stage: 'career',
    title: '庆幸没退学',
    body: '某个寻常的门诊午后，你忽然想起本科那个想退学的夜晚。如果真退了，就看不到今天的这些瞬间了。',
    category: 'mental', weight: 45, once: true, requireFlag: 'dropout_urge', minTurn: 6, maxTurn: 12,
    choices: [
      { text: '给当年的自己点头', delta: { sanity: 12, reputation: 2 }, consequence: '你治好了一个人——也包括当年的自己。' },
    ],
  },

  // —— 职业中期：已站稳脚跟、却开始被"中年命题"围住的主治/副主任医师 ——
  // 职业期小游戏回归（深挖第五部分 R29 / REVIEW-PLAYABILITY R11 落地）：
  // 主治后"手术/抢救/操作"终于有动手检验——不再零小游戏。
  {
    id: 'career_er_rescue',
    stage: 'career',
    title: '急诊的深夜抢救',
    body: '120 推进来一个呼吸心跳骤停的病人。麻醉/内科刚被叫走，监护仪在滴——你上，还是呼叫支援？',
    category: 'clinical', weight: 55, minTurn: 1, minigame: 'cpr',
    choices: [
      { text: '顶上去，按节拍抢救', delta: { clinical: 6, reputation: 4, stamina: -14, sanity: -4 }, flagSet: 'career_rescue_done', consequence: '病人被拉了回来。你摘下手套，手心全是汗。' },
      { text: '呼叫支援，维持现场', delta: { clinical: 3, stamina: -10, sanity: -2 }, consequence: '团队接手后把人救了回来。你在一旁打下手，也算出了一份力。' },
    ],
  },
  {
    id: 'career_high_difficulty_surgery',
    stage: 'career',
    title: '一台高难度手术',
    body: '一台复杂的腹腔手术排到了你名下。主刀盯着你："你来缝最后一层。"台下十几双眼睛等着。',
    category: 'clinical', weight: 50, minTurn: 2, minigame: 'suture',
    choices: [
      { text: '稳住手，一针一针来', delta: { clinical: 6, reputation: 4, stamina: -12, sanity: -3 }, flagSet: 'career_surgery_done', consequence: '缝完最后一针，主刀点了点头。你才知道自己已能独当一面。' },
      { text: '请主刀收尾', delta: { clinical: 2, reputation: -1, stamina: -8 }, consequence: '主刀利落地收完，没说什么。你记下了这台的每个细节。' },
    ],
  },

  {
    id: 'career_mid_health_alarm',
    stage: 'career',
    title: '体检单上的箭头',
    body: '你给别人看了十几年报告，如今自己的体检单上多了几个向上的箭头。你比谁都清楚这意味着什么。',
    category: 'mental', weight: 60, once: true, minTurn: 4,
    choices: [
      { text: '认真干预，开始运动', delta: { sanity: 6, stamina: -2, knowledge: 2 }, consequence: '你把给病人的叮嘱，用在了自己身上。' },
      { text: '安慰自己"还年轻"', delta: { sanity: -6, stamina: -4 }, consequence: '你把单子塞进了抽屉最底层。' },
    ],
  },
  {
    id: 'career_mid_parents_aging',
    stage: 'career',
    title: '轮到你接住了',
    body: '父亲体检出了点问题，母亲在电话里欲言又止。当年是他们替你扛，如今该你接住了。',
    category: 'social', weight: 55, once: true, minTurn: 5,
    choices: [
      { text: '把父母接来同住照顾', delta: { relations: 6, sanity: -2, money: -1000, stamina: -6 }, consequence: '你在家里的角色，悄悄换了位。' },
      { text: '请护工，自己多打电话', delta: { relations: 4, sanity: 2, money: -1500 }, consequence: '你每周视频，盯着他按时吃药。' },
    ],
  },
  {
    id: 'career_mid_research_clinic_tug',
    stage: 'career',
    title: '两头烧',
    body: '白天门诊手术连轴转，晚上标书改到凌晨。你怀疑自己是不是被劈成了两半。',
    category: 'career', weight: 70, minTurn: 4,
    choices: [
      { text: '先把临床顶住', delta: { knowledge: 3, stamina: -10, reputation: 2, sanity: -3 }, consequence: '病人等你，文章可以晚点。' },
      { text: '挤时间冲科研', delta: { papers: 1, knowledge: 3, stamina: -12, sanity: -4 }, consequence: '你又熬了个通宵。' },
    ],
  },
  {
    id: 'career_mid_kickback',
    stage: 'career',
    title: '递过来的信封',
    body: '一位药代临走"忘"下一个信封；也有患者家属硬塞红包，想求你"多上心"。白大褂的口袋忽然很沉。',
    category: 'social', weight: 55, once: true, minTurn: 3,
    choices: [
      { text: '原封退回去，立规矩', delta: { reputation: 4, sanity: 4, relations: -2 }, consequence: '你说："治病是我的本分，不用这个。"' },
      { text: '犹豫着收下', delta: { money: 3000, reputation: -6, sanity: -6 }, consequence: '那晚你没睡好，总觉得自己脏了点。' },
    ],
  },
  {
    id: 'career_mid_drg',
    stage: 'career',
    title: 'DRG 来了',
    body: '医保按病种打包付费。同样的病，治贵了科室倒贴。你开始精打细算每一张化验单。',
    category: 'career', weight: 50, once: true, minTurn: 5,
    choices: [
      { text: '适应新考核，规范诊疗', delta: { knowledge: 4, reputation: 2, stamina: -4 }, consequence: '你把临床路径背得滚瓜烂熟。' },
      { text: '抱怨"看病变算账"', delta: { sanity: -4, reputation: -1 }, consequence: '你在交班会上吐槽了几句。' },
    ],
  },
  {
    id: 'career_mid_mentor',
    stage: 'career',
    title: '你有了自己的研究生',
    body: '今年你分到一个专硕。他眼里那股劲，像极了当年的你。带人，比被人带难。',
    category: 'career', weight: 50, once: true, requireFlag: 'passed_zhuzhi', minTurn: 6,
    choices: [
      { text: '像当年恩师那样带', delta: { reputation: 4, relations: 4, stamina: -6, knowledge: 2 }, flagSet: 'mentored', consequence: '他第一篇一作接收，请你吃了碗面。' },
      { text: '放养，让他自己闯', delta: { relations: -2, sanity: 3, stamina: 2 }, consequence: '你想起自己也曾被放养。' },
    ],
  },
  {
    id: 'career_mid_title_fail',
    stage: 'career',
    title: '副高又落了',
    body: '公示名单没有你。年限够了、材料齐了，可名额就那么几个。你想起去年说过的"下批再战"。',
    category: 'mental', weight: 50, once: true, excludeFlag: 'passed_fugao', minTurn: 7,
    choices: [
      { text: '复盘，再准备一年', delta: { knowledge: 4, stamina: -8, sanity: -3 }, consequence: '你把落选意见逐条记了下来。' },
      { text: '怀疑这条路值不值', delta: { sanity: -8, reputation: -2 }, consequence: '你第一次认真想，要不要转行。' },
    ],
  },
  {
    id: 'career_mid_house',
    stage: 'career',
    title: '房贷的重量',
    body: '同事都在聊月供。你算了算自己的存款，犹豫要不要在这个城市"上车"。',
    category: 'financial', weight: 50, once: true, minTurn: 4,
    choices: [
      { text: '咬牙付首付，扎根', delta: { sanity: -3, relations: 2 }, flagSet: 'bought_house', effect: { kind: 'buyHouse' }, consequence: '合同签完那晚，你站在空荡荡的客厅里，既踏实又有点慌。' },
      { text: '继续租房，自由些', delta: { money: 500, sanity: 4 }, consequence: '你把首付留在了账户里。' },
    ],
  },
  {
    id: 'career_mid_colleague_exit',
    stage: 'career',
    title: '身边的人一个个走了',
    body: '同期的同事转医药、转保险的转了行。科室群里越来越安静。你问自己：还撑得住吗？',
    category: 'social', weight: 50, once: true, minTurn: 5,
    choices: [
      { text: '留下，守着这间诊室', delta: { reputation: 3, sanity: 3, relations: 2 }, consequence: '你说："总得有人留下。"' },
      { text: '也开始留意外界机会', delta: { knowledge: 2, sanity: -2, relations: -2 }, consequence: '你悄悄更新了简历。' },
    ],
  },
  {
    id: 'career_mid_public_health',
    stage: 'career',
    title: '应急任务下来了',
    body: '突发公卫任务，医院抽人去一线。名单里有你。你想起当年宣誓的那句"健康所系，性命相托"。',
    category: 'clinical', weight: 50, once: true, minTurn: 4,
    choices: [
      { text: '报名去一线', delta: { reputation: 6, relations: 4, stamina: -12, sanity: -3, knowledge: 3 }, consequence: '你在前线见了更大的世面。' },
      { text: '留在本科室顶班', delta: { reputation: 2, stamina: -6, sanity: 2 }, consequence: '你把去前线同事的班都顶了。' },
    ],
  },
  {
    id: 'career_mid_science_pop',
    stage: 'career',
    title: '你成了"网红医生"',
    body: '你随手发的一条科普短视频火了。评论区有人问"大夫您看看我这个报告"。流量来了，也来了麻烦。',
    category: 'career', weight: 45, once: true, minTurn: 5,
    choices: [
      { text: '认真做科普，帮更多人', delta: { reputation: 5, relations: 4, sanity: 4, stamina: -4 }, consequence: '你开辟了诊室之外的另一间"诊室"。' },
      { text: '怕惹事，关掉评论', delta: { sanity: 2, reputation: 1 }, consequence: '你把账号设成了仅自己可见。' },
    ],
  },
  {
    id: 'career_mid_referral_net',
    stage: 'career',
    title: '同行开始往你这儿转病人',
    body: '几年下来，基层和兄弟科室信得过你，疑难的、复杂的都往你手里转。你成了那个"兜底的人"。',
    category: 'career', weight: 45, once: true, minTurn: 6,
    choices: [
      { text: '把口碑接住，更较真', delta: { reputation: 5, knowledge: 3, stamina: -4 }, consequence: '你成了圈里那块"金字招牌"。' },
      { text: '压力有点大', delta: { sanity: -3, reputation: 2 }, consequence: '你怕哪天接不住。' },
    ],
  },

  // —— 职业后期（第 8 回合起，叙事年龄约 40+）：正高、行政、学会、传承与身体 ——
  // 注：游戏叙事终点约 45 岁（见 endings.ts），"退休"主题经由恩师视角呈现。
  {
    id: 'promote_zhenggao',
    stage: 'career',
    title: '冲刺主任医师',
    body: '正高评审开始了。这一次，材料、年限、口碑都齐了，差的只是最后再熬一熬。',
    category: 'career', weight: 70, once: true, requireFlag: 'passed_fugao', minTurn: 16,
    newsTickerAfter: '【正高职称评审新规落地：论文不再是唯一"硬杠杠"】',
    choices: [
      { text: '全力冲刺正高', delta: { reputation: 8, knowledge: 5, papers: 1, stamina: -16, sanity: -5 }, flagSet: 'passed_zhenggao', consequence: '公示名单里有你。你第一个电话打给了家里。' },
      { text: '按临床实绩申报，不临时凑论文', delta: { clinical: 4, reputation: -2, stamina: -10, sanity: -8 }, flagSet: 'zhenggao_failed', consequence: '你只差零点几分。评委认可临床能力，但这一轮名额没有留给你。' },
      { text: '副高也挺好，不折腾了', delta: { sanity: 5, stamina: 2 }, consequence: '你把机会让给了更年轻的人。' },
    ],
  },
  {
    id: 'promote_zhenggao_retry',
    stage: 'career',
    title: '正高再评',
    body: '落选后的两年里，你把疑难病例、带教和质控成果逐项补齐。评审通知再次到了。',
    category: 'career', weight: 80, once: true, minTurn: 18,
    requireFlag: 'zhenggao_failed',
    choices: [
      { text: '带着补齐的材料再评一次', delta: { reputation: 8, knowledge: 4, stamina: -14, sanity: -4 }, flagSet: 'passed_zhenggao', consequence: '公示名单里终于有你。你知道这不是一次答辩换来的。' },
      { text: '不再申报，把精力留给病人', delta: { clinical: 5, sanity: 5, reputation: 2 }, consequence: '职称停在副高，你在病房里的分量却没有变轻。' },
    ],
  },
  {
    id: 'career_late_director_offer',
    stage: 'career',
    title: '院领导找你谈话',
    body: '"科里需要你这样的同志挑担子。"言下之意：行政岗，副主任主持工作。接了，离临床就远了一步。',
    category: 'career', weight: 55, once: true, requireFlag: 'passed_zhenggao', minTurn: 17,
    choices: [
      { text: '接下这副担子', delta: { reputation: 6, relations: 2, sanity: -5, stamina: -6 }, flagSet: 'took_admin', consequence: '你的日程表从此被会议切成碎片。' },
      { text: '只想当医生，婉拒', delta: { knowledge: 3, sanity: 4 }, consequence: '你说："我的位置在诊室里。"' },
    ],
  },
  {
    id: 'career_late_admin_burden',
    stage: 'career',
    title: '行政的代价',
    body: '三甲复审、医保检查、绩效分配……文件堆得比病历高。你已经两周没完整看过一个门诊了。',
    category: 'career', weight: 45, once: true, requireFlag: 'took_admin', minTurn: 10,
    choices: [
      { text: '在会议里找临床的意义', delta: { sanity: 3, relations: 3, reputation: 2 }, consequence: '你把流程改顺了一点，全科都松了口气。' },
      { text: '怀念纯临床的日子', delta: { sanity: -3, stamina: -2 }, consequence: '路过门诊楼，你会放慢脚步。' },
    ],
  },
  {
    id: 'career_late_society',
    stage: 'career',
    title: '学会递来的聘书',
    body: '省医学会专科分会换届，你的名字出现在委员候选名单里。这意味着开会、评审、还有更广阔的话语权。',
    category: 'career', weight: 50, once: true, requireFlag: 'passed_fugao', minTurn: 8,
    choices: [
      { text: '接下，为学科发点声', delta: { reputation: 5, relations: 4, stamina: -6, money: -1000 }, consequence: '你在指南讨论会上，替基层医生说了句话。' },
      { text: '婉拒，时间留给病人', delta: { sanity: 3, knowledge: 2 }, consequence: '你把那封聘书压在了听诊器下面。' },
    ],
  },
  {
    id: 'career_late_mentor_retires',
    stage: 'career',
    title: '恩师退休了',
    body: '当年手把手教你的老主任办了退休手续。收拾办公室时，他把用了三十年的听诊器递给你："留着，比放我这儿有用。"',
    category: 'social', weight: 50, once: true, minTurn: 8,
    choices: [
      { text: '接下他的老病人们', delta: { reputation: 4, relations: 4, stamina: -4, sanity: 2 }, consequence: '老人们进门还是那句："我找 X 主任——哦，现在是你了。"' },
      { text: '给他办个体面的欢送会', delta: { relations: 5, sanity: 5, money: -800 }, consequence: '他红着眼眶说："科里交给你们，我放心。"' },
    ],
  },
  {
    id: 'career_late_student_return',
    stage: 'career',
    title: '学生回来看你',
    body: '你带过的学生如今也能独当一面了。他拎着水果站在诊室门口，开口还是那声"老师"。',
    category: 'social', weight: 50, once: true, requireFlag: 'mentored', minTurn: 9,
    choices: [
      { text: '叮嘱他别熬坏身体', delta: { relations: 5, sanity: 6 }, consequence: '你说的话，正是当年恩师对你说的。' },
      { text: '把他引荐到更好的平台', delta: { relations: 3, reputation: 3 }, consequence: '你替他铺的路，比你自己走过的平一点。' },
    ],
  },
  {
    id: 'career_late_body_protests',
    stage: 'career',
    title: '身体开始讨债',
    body: '一站六小时的手术，你开始要在台边放张高脚凳；病历上的小字，也得拿远了才看得清。',
    category: 'mental', weight: 50, once: true, minTurn: 9,
    choices: [
      { text: '接受节奏，把活干得更细', delta: { sanity: 4, knowledge: 2, stamina: 2 }, consequence: '慢下来的你，反而漏得更少。' },
      { text: '不服老，继续硬顶', delta: { stamina: -8, sanity: -4, reputation: 2 }, consequence: '年轻医生私下说："老师还是那么拼。"' },
    ],
  },
  {
    id: 'career_late_tough_case',
    stage: 'career',
    title: '全科的目光落在你身上',
    body: '外院转来一个疑难病人，讨论了一圈，年轻医生们的目光最后都落在你身上——像当年你看着老主任那样。',
    category: 'clinical', weight: 50, once: true, requireFlag: 'track_clinical', minTurn: 8,
    choices: [
      { text: '亲自带队拿下来', delta: { knowledge: 5, reputation: 5, stamina: -10, sanity: -2 }, consequence: '病理回报那天，全科都服了。' },
      { text: '带着年轻人一起做', delta: { relations: 5, reputation: 3, stamina: -6, knowledge: 2 }, consequence: '你把高光让给了他们，把责任留给了自己。' },
    ],
  },
  {
    id: 'career_late_keynote',
    stage: 'career',
    title: '年会主旨报告',
    body: '全国年会邀请你做主旨报告。台下坐着的，有当年毙过你稿子的审稿人。',
    category: 'career', weight: 50, once: true, requireFlag: 'track_research', minTurn: 8,
    choices: [
      { text: '把这十年的工作讲透', delta: { reputation: 6, papers: 1, stamina: -6, sanity: 3 }, consequence: '提问环节，那位审稿人第一个举手——是来道贺的。' },
      { text: '紧张，但稳稳讲完', delta: { reputation: 3, sanity: 2 }, consequence: '掌声响起来时，你想起实验室的无数个深夜。' },
    ],
  },

  // —— 职业经济损失：医保拒付 / 病历扣费（现实医生会遇到的"白干活倒贴钱"）——
  {
    id: 'career_fin_insurance_denial',
    stage: 'career',
    title: '医保拒付',
    body: '一个昂贵治疗方案被医保拒付了——材料没问题，流程挑得出毛病。科室要自担这笔钱，主任把名单放到了你桌上。',
    category: 'clinical', weight: 55, rankScaled: true,
    choices: [
      { text: '整理证据去申诉', delta: { money: -1500, stamina: -10, reputation: 2, knowledge: 2 }, flagSet: 'fin_appealed', consequence: '流程跑了三周，追回来一半。另一半，科室认了。' },
      { text: '认了，从绩效里扣', delta: { money: -3000, sanity: -3 }, consequence: '那个月你看着工资条，沉默了。' },
      { text: '跟主任据理力争', delta: { money: -2000, relations: -3, sanity: -3 }, consequence: '钱还是扣了，你多了个"难缠"的名声。' },
    ],
  },
  {
    id: 'career_fin_record_fine',
    stage: 'career',
    title: '病历扣费',
    body: '病历质控抽查，你三份病历的书写有缺陷——病程记录缺一段、签字时间对不上。医院按制度扣钱。',
    category: 'career', weight: 50, rankScaled: true,
    choices: [
      { text: '连夜整改补写', delta: { money: -800, stamina: -8, knowledge: 2 }, flagSet: 'record_fixed', consequence: '凌晨的办公室里，你把每一份病历重新顺了一遍。' },
      { text: '申诉"是系统bug"', delta: { money: -1500, relations: -2, sanity: -2 }, flagSet: 'record_sloppy', consequence: '最后按"书写不规范"定性，扣得更多。' },
    ],
  },

  // —— 人际高光（关系门槛，外貌→起始人际解锁）——
  {
    id: 'career_patient_follow',
    stage: 'career',
    title: '病人认你',
    body: '一位出院的老病人，逢人就推荐你，还特意带亲戚来挂你的号。走廊里有人喊你"X大夫"——是你。',
    category: 'social', weight: 45, once: true, minTurn: 3,
    requireStat: { relations: [60, 100] },
    choices: [
      { text: '把口碑接住，更较真', delta: { reputation: 5, relations: 4, stamina: -6, sanity: 2 }, consequence: '你多了一群"回头客"，也多了份沉甸甸的信任。' },
      { text: '受宠若惊，也更谨慎', delta: { sanity: 3, reputation: 2 }, consequence: '你把每个字都写得更仔细了。' },
    ],
  },
  {
    id: 'career_leader_pick',
    stage: 'career',
    title: '领导点名',
    body: '院里一个新项目缺个牵头人，领导第一个想到你——因为你人缘好，大家愿意跟你干。',
    category: 'career', weight: 40, once: true, minTurn: 5,
    requireStat: { relations: [65, 100] },
    choices: [
      { text: '接，把队伍带起来', delta: { reputation: 6, relations: 4, stamina: -10, sanity: -2 }, flagSet: 'led_project', consequence: '项目磕磕绊绊成了，你在科里的分量不一样了。' },
      { text: '让贤，甘当副手', delta: { relations: 2, sanity: 2 }, consequence: '你把风头让了出去，落个人情。' },
    ],
  },

  // —— 人生必经：第 3/9 季各一次，案件按亚专科分化，赔付按职级缩放。——
  ...lawsuitEvents(),
  // 病历质量反哺诉讼（深挖第五部分 R5 落地）：病历书写差（record_sloppy）的人，
  // 在仲裁/诉讼里举证被动——即使流程上没输，职业声誉也受损。
  {
    id: 'career_record_sloppy_lawsuit',
    stage: 'career',
    title: '病历成了把柄',
    body: '仲裁庭上，对方律师翻出你几份有缺陷的病历："病程记录缺一段、签字时间对不上——连记录都不规范，谈何规范诊疗？"',
    category: 'clinical', weight: 1, once: true, minTurn: 4,
    requireFlag: 'record_sloppy',
    choices: [
      { text: '当场承认疏漏，把当时的诊疗过程讲清楚', delta: { reputation: -2, sanity: -8, stamina: -6 }, flagSet: 'record_owned', consequence: '你诚实陈述，鉴定结果判医院次要责任，但你"病历不规范"进了通报。' },
      { text: '辩称病历是事后补录', delta: { reputation: -6, sanity: -12 }, flagSet: 'record_sloppy_exposed', consequence: '补录的说法反而坐实了流程漏洞。医务科让你做了书面检讨。' },
    ],
  },

  // —— 知情同意 / 术前谈话（医疗最核心的法律伦理流程，深挖第五部分 R31）——
  // 手术/高风险操作前与家属谈话签字：谈得好 → 纠纷少一分；谈得糊 → 埋下诉讼隐患。
  // 与 career_lawsuit_1 联动：有 informed_consent_ok 的玩家，诉讼更被动时仍有转圜。
  {
    id: 'career_informed_consent',
    stage: 'career',
    title: '术前谈话',
    body: '明天一台手术，患者家属坐在谈话室里，面前摊着一叠知情同意书。你刚下门诊，白大褂还没换。家属问："大夫，这手术有风险吗？"',
    category: 'clinical', weight: 1, once: true, minTurn: 1, maxTurn: 2,
    choices: [
      { text: '把并发症、替代方案、不做的后果都讲透，让家属签明白字', delta: { knowledge: 4, reputation: 3, stamina: -8, sanity: -2 }, flagSet: 'informed_consent_ok', consequence: '家属听完沉默了一会儿，郑重签了字。你多花了二十分钟，但心里踏实。' },
      { text: '按惯例快速过一遍流程，让他们签字', delta: { stamina: -3, reputation: -1 }, flagSet: 'informed_consent_hasty', consequence: '谈话十分钟搞定。家属签了字，但你没敢细看他们的表情。' },
      { text: '让护士代签，自己去准备手术', delta: { stamina: -2, relations: -2, reputation: -2 }, consequence: '护士喊了你好几次，家属最后签字时有点犹豫。' },
    ],
  },
  // 知情同意的回响：谈得好的人，术后纠纷来临时有底气
  {
    id: 'career_consent_echo_ok',
    stage: 'career',
    title: '那场谈话起了作用',
    body: '术后出现并发症，家属情绪激动地找到你。但话说到一半，对方想起了术前那晚你坐下来的二十分钟，语气缓和了些。',
    category: 'clinical', weight: 1, once: true, minTurn: 4,
    requireFlag: 'informed_consent_ok',
    choices: [
      { text: '坦诚复盘，把术后处理讲清楚', delta: { relations: 4, reputation: 3, sanity: -3 }, consequence: '家属最后说："你们尽力了。"纠纷没有升级成诉讼。' },
      { text: '强调术前已签字，责任不在己', delta: { relations: -2, sanity: -2, reputation: 1 }, consequence: '家属没再多说，但医务科收到了一封投诉信。' },
    ],
  },
  // 谈话糊弄的人：同样的事故，直接滑向诉讼
  {
    id: 'career_consent_echo_hasty',
    stage: 'career',
    title: '签字单救不了你',
    body: '术后并发症，家属把一叠东西拍在桌上——术前谈话记录上，"风险"一栏几乎是空白的。医务科的人看了你一眼。',
    category: 'clinical', weight: 1, once: true, minTurn: 4,
    requireFlag: 'informed_consent_hasty',
    choices: [
      { text: '承认谈话不充分，配合补记录', delta: { money: -5000, reputation: -2, sanity: -6 }, flagSet: 'lawsuit_done_1', consequence: '你补了记录，但还是被列为被告之一。那晚你复盘了很久。' },
      { text: '咬定流程走了，签字为证', delta: { reputation: -4, sanity: -10 }, flagSet: 'lawsuit_done_1', consequence: '仲裁时你被问到"当时讲清楚了吗"，你答不上来。' },
    ],
  },

  // —— 职业暴露：针刺伤 → 上报/预防用药 → 感染风险 → 心理阴影（深挖第五部分 R30 落地）——
  {
    id: 'career_needlestick',
    stage: 'career',
    title: '针刺伤',
    body: '抢救结束时拔针，一根用过的针头扎进了你的手指。血珠渗出来，患者病历上"乙肝"一栏是阳性。',
    category: 'clinical', weight: 45, once: true, minTurn: 2,
    choices: [
      { text: '立即挤血、消毒、上报感染科', delta: { stamina: -4, sanity: -6, reputation: 2 }, flagSet: 'needlestick_reported', effect: { kind: 'changeAttr', attr: 'luck', amount: 1, reason: '及时上报职业暴露，给自己留了退路' }, consequence: '感染科开了预防用药。你盯着注射器，第一次觉得白大褂没那么安全。' },
      { text: '挤了挤血，没当回事', delta: { sanity: -3, stamina: -2 }, flagSet: 'needlestick_hidden', effect: { kind: 'changeAttr', attr: 'luck', amount: -1, reason: '忽视职业暴露，风险没有消失' }, consequence: '你用水冲了冲继续忙。夜里想起那管血，你睡不着。' },
    ],
  },
  // 上报后的回响：预防用药的副作用与随访
  {
    id: 'career_needlestick_followup',
    stage: 'career',
    title: '预防用药的三个月',
    body: '暴露后第 6 周、第 3 个月要去抽血复查。这期间你不敢告诉家人，药吃得胃里翻江倒海。',
    category: 'mental', weight: 40, once: true, minTurn: 3,
    requireFlag: 'needlestick_reported',
    choices: [
      { text: '按时复查，熬过去', delta: { stamina: -8, sanity: -8, knowledge: 3 }, flagSet: 'needlestick_cleared', consequence: '三个月后结果阴性。你抱着化验单，在走廊站了很久。' },
      { text: '工作太忙，漏了一次复查', delta: { sanity: -12, stamina: -4 }, flagSet: 'needlestick_anxious', consequence: '漏查那几天，你满脑子都是最坏的结果。后来补查没事，但那份恐慌留了很久。' },
    ],
  },
  // 没上报的回响：担惊受怕
  {
    id: 'career_needlestick_guilt',
    stage: 'career',
    title: '那根针的阴影',
    body: '过去快一个月了。你时不时想起那管血，查了几次资料，越想越怕，又不敢去医院查。',
    category: 'mental', weight: 40, once: true, minTurn: 3,
    requireFlag: 'needlestick_hidden',
    choices: [
      { text: '终于去抽血，给自己一个交代', delta: { sanity: -6, stamina: -3 }, flagSet: 'needlestick_cleared', consequence: '结果阴性。你发誓下次一定当场上报。' },
      { text: '继续硬扛着', delta: { sanity: -10, stamina: -4 }, flagSet: 'needlestick_anxious', consequence: '心理的阴影比针尖还细，却扎得深。' },
    ],
  },

  // —— 医保飞检 / 科室自查（经济+合规压力，复用病历质量 flag）——
  {
    id: 'career_insurance_flycheck',
    stage: 'career',
    title: '医保飞行检查',
    body: '医保局不打招呼进了科室，抽查近一年的病历与收费。主任脸色发白——DRG 下"超支"是悬在头上的刀。',
    category: 'financial', weight: 40, once: true, minTurn: 2,
    choices: [
      { text: '主动配合，把问题病历整理清楚', delta: { stamina: -10, sanity: -4, reputation: 2, money: -2000 }, flagSet: 'flycheck_ok', consequence: '检查组没抓到实质违规，但医院按例追回了两笔超支费用。' },
      { text: '拖一拖，等风声过去', delta: { sanity: -6, money: -4000, reputation: -2 }, flagSet: 'flycheck_fined', consequence: '拖的结果是被从重处理，科室被扣了一笔绩效，你写了检讨。' },
    ],
  },

  // 飞检被罚的回响：整改压力
  {
    id: 'career_flycheck_aftermath',
    stage: 'career',
    title: '整改的日子',
    body: '飞检被罚后，科室要求全员补病历、开规范培训。主任点名让你负责整理历史病历。',
    category: 'financial', weight: 35, once: true, minTurn: 3,
    requireFlag: 'flycheck_fined',
    choices: [
      { text: '硬着头皮补完，学会规范', delta: { knowledge: 4, stamina: -12, sanity: -6, reputation: 2 }, flagSet: 'flycheck_reformed', consequence: '你通宵补完所有病历，顺手把科室的模板也规范了。主任难得说了句"辛苦了"。' },
      { text: '敷衍应付，能拖就拖', delta: { stamina: -6, sanity: -4, reputation: -2 }, flagSet: 'flycheck_resisted', consequence: '你交上去的补录被打了回来，又重写了一遍。' },
    ],
  },
  // 飞检过关的回响：成为科室的"医保明白人"
  {
    id: 'career_flycheck_clean_echo',
    stage: 'career',
    title: '科室的"医保明白人"',
    body: '飞检过后，大家发现你懂 DRG 结算的门道，新来的同事开始来问你"这个病怎么编码"。',
    category: 'career', weight: 35, once: true, minTurn: 3,
    requireFlag: 'flycheck_ok',
    choices: [
      { text: '耐心教，自己也学得更透', delta: { reputation: 4, relations: 4, knowledge: 3, stamina: -6 }, flagSet: 'flycheck_mentor', consequence: '你带出了几个"小明白人"，科室的扣款率降了。' },
      { text: '保留一点，够用就行', delta: { relations: 1, stamina: -3 }, consequence: '你帮了几个人，但没把自己彻底搭进去。' },
    ],
  },

  // —— 一作之争的职业回响（OPTIMIZATION-ROADMAP R7）——
  // 当年争来的署名，评职称时是实打实的一作；当年让出的人情，十年后连本带息。
  {
    id: 'career_first_author_fought_echo',
    stage: 'career',
    title: '一作那一栏',
    body: '评职称填表，一作那一栏你写得理直气壮。当年争来的署名，如今是材料里最硬的一行。',
    category: 'career', weight: 40, once: true, minTurn: 4,
    requireFlag: 'fa_fought',
    choices: [
      { text: '不后悔当年争过', delta: { reputation: 3, sanity: 4 }, consequence: '有些底线，退一步就再也回不来。' },
    ],
  },
  {
    id: 'career_first_author_conceded_echo',
    stage: 'career',
    title: '师兄还的人情',
    body: '当年你让出共一的师兄，如今是另一家的学科带头人。他牵线把你的疑难病例讨论请进了省年会。',
    category: 'career', weight: 40, once: true, minTurn: 4,
    requireFlag: 'fa_conceded',
    choices: [
      { text: '人情这东西，存十年也有利息', delta: { relations: 4, reputation: 4, sanity: 2 }, consequence: '你们相视一笑，谁都没提当年那篇文章。' },
    ],
  },

  // —— 破五唯：临床型晋升通道（OPTIMIZATION-ROADMAP R7，与 master_clinician 结局联动）——
  // 论文少但临床强也能评上：临床实绩突出者经"临床为主"评审通道拿副高，
  // passed_fugao 由结局判定与正高事件消费，无新死 flag。
  {
    id: 'career_clinical_track_review',
    stage: 'career',
    title: '破五唯：临床型晋升通道',
    body: '省里下发职称改革文件：长期扎根临床、工作量与同行评议突出者，可经"临床实绩"通道申报副高——论文不再是硬杠杠。你的手术量和门诊量全科第一，SCI 却寥寥几篇。',
    category: 'career', weight: 65, once: true, minTurn: 8,
    requireFlag: 'passed_zhuzhi', excludeFlag: 'passed_fugao',
    requireStat: { clinical: [60, 100] },
    newsTickerAfter: '【卫生职称改革深化：多省落地"以临床为主"评价通道】',
    choices: [
      { text: '走临床实绩通道申报副高', delta: { reputation: 6, clinical: 4, stamina: -12, sanity: -4 }, flagSet: 'passed_fugao', consequence: '评审专家翻完你的病案和手术记录："这样的大夫，该评上。"' },
      { text: '再等等，先把文章补上', delta: { sanity: 2, knowledge: 2 }, consequence: '你把文件折好收进口袋，转身回了病房。' },
    ],
  },

  // —— 国自然申报季（OPTIMIZATION-ROADMAP R7）：可重复的季节事件 ——
  // 命中率按 papers/knowledge/reputation 加权，落在现实 15-25% 区间；中/不中都有回响。
  {
    id: 'career_nsfc_season',
    stage: 'career',
    title: '国自然申报季',
    body: '三月，又到了写标书的季节。科里年轻人都在熬，你把去年的评审意见翻出来——"创新性不足，建议修改后再报"。',
    category: 'career', weight: 50, minTurn: 2, once: false,
    choices: [
      {
        text: '再报一次，逐条打磨', delta: { stamina: -14, sanity: -4, knowledge: 3 },
        effect: { kind: 'rollOutcome', base: 0.08, paperBonus: 0.03, knowledgeBonus: 0.001, repPer10: 0.01, successFlag: 'nsfc_won', failFlag: 'nsfc_failed' },
        consequence: '提交截止那晚，你按下"确认"——剩下的交给评审。',
      },
      { text: '今年不报了，歇一年', delta: { sanity: 4 }, consequence: '你关掉模板，难得准点下了班。' },
    ],
  },
  {
    id: 'career_nsfc_won_echo',
    stage: 'career',
    title: '中标通知',
    body: '八月放榜。资助名单里有你的名字——四年期项目。科主任在群里发了个红包，备注："请客。"',
    category: 'career', weight: 60, once: true, minTurn: 3,
    requireFlag: 'nsfc_won',
    newsTickerAfter: '【国家自然科学基金资助名单公布：医学部中标率约 16%】',
    choices: [
      { text: '请全组吃饭，开始张罗课题', delta: { reputation: 6, relations: 4, money: 12000, stamina: -6 }, consequence: '经费到账那天，你把标书里写的设备一件件下单。' },
    ],
  },
  {
    id: 'career_nsfc_failed_echo',
    stage: 'career',
    title: '又没中',
    body: '放榜名单从头看到尾，没有你。评审意见还是那几句。同事安慰你："国自然嘛，中一次够吃五年。"',
    category: 'mental', weight: 50, once: true, minTurn: 3,
    requireFlag: 'nsfc_failed', excludeFlag: 'nsfc_won',
    choices: [
      { text: '把意见钉在桌上，明年再战', delta: { sanity: -3, knowledge: 2 }, consequence: '你在日历上圈了明年三月。' },
      { text: '算了，把精力还给临床', delta: { sanity: 3, clinical: 2 }, consequence: '你想通了：病人不等基金。' },
    ],
  },

  // —— 家庭与代际（OPTIMIZATION-ROADMAP R8，医生职业的时间挤压）——
  // 值班错过家庭重要时刻：家长会 vs 排定的手术。两向 flag 各自回响——
  // 守住的成为撑下去的动力，错过的在孩子长大后连本带息地还回来。
  {
    id: 'career_missed_family_moment',
    stage: 'career',
    title: '错过的家长会',
    body: '下午三点，孩子的家长会；三点半，一台排了两周的手术。爱人发来消息："孩子问，你这次能不能来。"',
    category: 'social', weight: 55, minTurn: 2,
    requireMarital: 'married', requireFlag: 'has_child',
    choices: [
      { text: '请同事替台，赶去学校的尾巴', delta: { relations: 5, sanity: 3, reputation: -2, stamina: -2 }, flagSet: 'family_moment_kept', consequence: '你赶到时只剩尾声，孩子却一眼就从人堆里认出了你。' },
      { text: '手术不能放，下次一定', delta: { relations: -5, sanity: -4, reputation: 2 }, flagSet: 'family_moment_missed', consequence: '深夜回家，桌上留着孩子画的全家福——你的位置空着。' },
    ],
  },
  {
    id: 'career_kept_family_echo',
    stage: 'career',
    title: '孩子的作文',
    body: '老师布置作文《我的家人》。孩子写："我的家长是医生，很忙，但重要的日子都在。"老师打了个优。',
    category: 'social', weight: 45, once: true, minTurn: 5,
    requireFlag: 'family_moment_kept',
    choices: [
      { text: '把作文拍照存进手机', delta: { sanity: 8, relations: 3 }, flagSet: 'family_anchored', consequence: '后来每个难熬的夜班，你都会翻出来看一眼。' },
    ],
  },
  {
    id: 'career_missed_family_echo',
    stage: 'career',
    title: '孩子长大了',
    body: '孩子上了初中，家长会通知不再转发给你了。ta 说："反正你也来不了。"语气平静得像在陈述天气预报。',
    category: 'mental', weight: 45, once: true, minTurn: 6,
    requireFlag: 'family_moment_missed',
    choices: [
      { text: '这个月推掉应酬，认真陪一次', delta: { relations: 6, sanity: 5, reputation: -2 }, flagSet: 'family_repaired', consequence: 'ta 嘴上嫌你烦，却把合影设成了手机桌面。' },
      { text: '多打点钱，算是补偿', delta: { money: -3000, relations: -2, sanity: -3 }, consequence: '转账被退回了，附言只有两个字："不用。"' },
    ],
  },

  // —— 配偶怨言事件链（R8）：认真谈 → 修复回声；拖延 → 分房睡 → 咨询或冷战 ——
  {
    id: 'career_spouse_strain',
    stage: 'career',
    title: '"这个家你还要不要"',
    body: '连续第三个周末值班。爱人把你们的合影扣在桌上："孩子以为你住在医院宿舍。我呢？我算什么——室友吗？"',
    category: 'social', weight: 50, once: true, minTurn: 3,
    requireMarital: 'married',
    choices: [
      { text: '请年假，认真谈一次', delta: { relations: 6, sanity: 4, money: -1500, reputation: -2 }, flagSet: 'spouse_talked', consequence: '你们谈到凌晨。ta 说："我不是要你不当医生，我是要你别把我们忘了。"' },
      { text: '"等忙完这阵再说"', delta: { relations: -6, sanity: -5 }, flagSet: 'spouse_drifting', consequence: 'ta 没再说话。从那以后，很多事 ta 不再跟你说了。' },
    ],
  },
  {
    id: 'career_spouse_echo_talk',
    stage: 'career',
    title: '重新排开的班表',
    body: '你把夜班和家里的重要日子画在同一张日历上。主任看了你的调班申请，签了字。',
    category: 'social', weight: 40, once: true, minTurn: 5,
    requireFlag: 'spouse_talked',
    choices: [
      { text: '结婚纪念日这顿饭，补上', delta: { relations: 5, sanity: 6, money: -800 }, flagSet: 'spouse_reconciled', consequence: 'ta 笑了，说你还是当年那个人。' },
    ],
  },
  {
    id: 'career_spouse_echo_drift',
    stage: 'career',
    title: '分房睡的第几个月',
    body: '你们开始分房睡。不是吵架——是连吵架的力气都没有了。白大褂挂在两个房间中间的门上。',
    category: 'mental', weight: 40, once: true, minTurn: 5,
    requireFlag: 'spouse_drifting',
    choices: [
      { text: '请婚姻咨询，拉一把这个家', delta: { money: -3000, sanity: -3, relations: 4 }, flagSet: 'spouse_reconciled', consequence: '咨询师说："你们的问题不是不爱，是没时间爱。"' },
      { text: '随它去，工作才是避风港', delta: { sanity: -8, relations: -3, reputation: 2 }, flagSet: 'marriage_cold', consequence: '你把更多时间泡在医院——至少病房还需要你。' },
    ],
  },

  // —— 子女叙事（R8）："我要学医"——你比谁都清楚这条路上有什么 ——
  // 支持/劝退/让 ta 自己决定，志愿表在两年后揭晓（与多周目传承主题呼应）。
  {
    id: 'career_child_asks_medicine',
    stage: 'career',
    title: '"我想学医"',
    body: '晚饭桌上，读高中的孩子忽然说："我想好了，高考就报医学院。"你夹菜的手停在半空——这条路上有什么，你比谁都清楚。',
    category: 'social', weight: 45, once: true, minTurn: 9,
    requireMarital: 'married', requireFlag: 'has_child',
    choices: [
      { text: '支持：把这条路的好坏都讲透', delta: { relations: 5, sanity: 4, knowledge: 2 }, flagSet: 'child_med_supported', consequence: '你说："苦是真的，值得也是真的。"ta 听完了，没改主意。' },
      { text: '劝退：把苦水全倒出来', delta: { relations: -3, sanity: -2 }, flagSet: 'child_med_deterred', consequence: 'ta 沉默很久："可是我看你下手术台的样子，从来没后悔过。"' },
      { text: '让 ta 自己决定', delta: { sanity: 2 }, flagSet: 'child_med_own_choice', consequence: '你只说了一句："想清楚了，我们都支持。"' },
    ],
  },
  {
    id: 'career_child_med_echo',
    stage: 'career',
    title: '白大褂的传承',
    body: '孩子的高考志愿表发下来。第一志愿栏，端端正正写着：临床医学。',
    category: 'social', weight: 45, once: true, minTurn: 11,
    requireFlag: 'child_med_supported',
    choices: [
      { text: '把当年自己穿白袍的照片发给 ta', delta: { relations: 5, sanity: 6 }, flagSet: 'child_in_medschool', consequence: 'ta 回："以后查房遇上难题，可要跟你请教了。"' },
    ],
  },
  {
    id: 'career_child_deterred_echo',
    stage: 'career',
    title: '志愿表上没有医学院',
    body: '孩子最终报了计算机。ta 说想通了，你却从 ta 的眼神里读到一丝没死心的光。',
    category: 'mental', weight: 40, once: true, minTurn: 11,
    requireFlag: 'child_med_deterred',
    choices: [
      { text: '告诉 ta：哪天想学医，永远来得及', delta: { relations: 4, sanity: 3 }, consequence: '你说的是真心话——这条路晚一点走，反而走得稳。' },
    ],
  },
  {
    id: 'career_child_own_choice_echo',
    stage: 'career',
    title: '孩子自己做的决定',
    body: '志愿表交上去那天，孩子才告诉你：第一志愿，临床医学。ta 说："你没劝过我，也没拦过我——所以这是我自己的决定。"',
    category: 'social', weight: 40, once: true, minTurn: 11,
    requireFlag: 'child_med_own_choice',
    choices: [
      { text: '拍拍 ta 的肩，什么都没说', delta: { relations: 5, sanity: 6 }, flagSet: 'child_in_medschool', consequence: '你转身进了厨房，眼眶有点热。' },
    ],
  },

  // —— 开局选亚专科（第 0 季强制）：内科/外科/妇产科/儿科，劳累程度不同 ——
  {
    id: 'career_specialty_choice',
    stage: 'career',
    title: '选择亚专科',
    body: '执业方向定了。内科平稳，外科最累但手术有成就感，妇产科节奏紧，儿科心理消耗大。选一个吧。',
    category: 'career', weight: 1, once: true, minTurn: 0,
    choices: [
      { text: '内科：动脑多，动身少', delta: { knowledge: 3 }, flagSet: 'sub_internal', consequence: '你在内科扎下根，节奏稳，细水长流。' },
      { text: '外科：站台久，最累', delta: { stamina: -4, clinical: 3 }, flagSet: 'sub_surgery', consequence: '外科的手术台，把你练成了"站神"。' },
      { text: '妇产科：节奏紧，急诊多', delta: { stamina: -2, clinical: 2, sanity: -1 }, flagSet: 'sub_obgyn', consequence: '产科急诊的铃一响，你比谁都快。' },
      { text: '儿科：压力大，心理消耗高', delta: { relations: 2, sanity: -2 }, flagSet: 'sub_pediatrics', consequence: '儿科难，难在家长比孩子更难哄。' },
    ],
  },

  // —— 管理层带下属：培训还是训诫，影响下属去留（临床决策）——
  {
    id: 'career_admin_manage',
    stage: 'career',
    title: '手下的住院医出岔子了',
    body: '你带的一名住院医在值班时犯了错，被护士长告到医务科。作为带组上级，怎么处理？',
    category: 'career', weight: 45, once: true, minTurn: 6,
    requireFlag: 'took_admin',
    choices: [
      { text: '私下培训，陪他把流程练熟', delta: { relations: 5, stamina: -8, sanity: 2 }, flagSet: 'admin_trained', consequence: '他后来成了科里最稳的住院医，逢人说是你带出来的。' },
      { text: '当众训诫，立规矩', delta: { reputation: 4, relations: -5, stamina: -2 }, flagSet: 'admin_drilled', consequence: '规矩立住了，但他递交了转组申请——你少了一员干将。' },
      { text: '替他兜底，各打五十大板', delta: { relations: 2, sanity: -4, stamina: -3 }, flagSet: 'admin_covered', consequence: '事情压下去了，但你知道这样管不长久。' },
    ],
  },

  // —— 职业初期压力事件（按亚专科差异化）：从规培/住院医到独立执业的第一波冲击 ——
  {
    id: 'career_early_independent',
    stage: 'career',
    title: '第一次独立管床',
    body: '没人再给你兜底了。床位上十几位病人的医嘱、签字、抢救，全落在你一个人身上。值班电话一响，你心跳先漏一拍。',
    category: 'mental', weight: 60, once: true, minTurn: 1, maxTurn: 4,
    choices: [
      { text: '硬着头皮顶上去', delta: { stamina: -10, knowledge: 3, sanity: -4 }, consequence: '一个月后，你发现自己真的扛下来了。' },
      { text: '频繁呼叫上级', delta: { relations: -2, sanity: 2, reputation: -1 }, consequence: '上级没说什么，但你知道"成长"两个字有代价。' },
    ],
  },
  {
    id: 'career_early_surgery_pressure',
    stage: 'career',
    title: '手术排满的清晨',
    body: '外科的早晨从一台接一台开始。巡回护士喊"下一台准备好了"，你灌了口浓茶，白大褂还没干透。',
    category: 'clinical', weight: 55, once: true, minTurn: 2, maxTurn: 5,
    requireFlag: 'sub_surgery',
    choices: [
      { text: '顶住，站完今天的台', delta: { stamina: -14, clinical: 4, sanity: -3 }, consequence: '下台时腿在抖，但手是稳的。' },
      { text: '申请休整半日', delta: { sanity: 6, relations: 2, reputation: -2 }, consequence: '你在值班室眯了一觉，醒来觉得丢人。' },
    ],
  },
  {
    id: 'career_early_peds_pressure',
    stage: 'career',
    title: '被家长围住的诊室',
    body: '儿科诊室外排着队，一个家长嗓门越来越大："等了俩小时了！"孩子在你怀里哭，你喉咙发紧。',
    category: 'social', weight: 55, once: true, minTurn: 2, maxTurn: 5,
    requireFlag: 'sub_pediatrics',
    choices: [
      { text: '一个个安抚，先稳情绪', delta: { relations: 4, sanity: -5, stamina: -4 }, consequence: '那位家长最后说了声"大夫辛苦了"。' },
      { text: '让护士帮忙压场', delta: { relations: -2, sanity: -2, reputation: -1 }, consequence: '场面压住了，但你心里不是滋味。' },
    ],
  },
  {
    id: 'career_early_obgyn_pressure',
    stage: 'career',
    title: '深夜的产科急诊',
    body: '凌晨两点，电话把你从值班室拽起来：胎盘早剥。你一边往手术室跑，一边在脑子里过流程。',
    category: 'clinical', weight: 55, once: true, minTurn: 2, maxTurn: 5,
    requireFlag: 'sub_obgyn',
    choices: [
      { text: '顶住，主刀接生', delta: { clinical: 4, stamina: -12, sanity: -3 }, consequence: '天亮时母婴平安，你在走廊长出一口气。' },
      { text: '呼叫二线支援', delta: { relations: 3, stamina: -4, reputation: -1 }, consequence: '有惊无险，但你记下了自己的边界。' },
    ],
  },
  {
    id: 'career_early_internal_pressure',
    stage: 'career',
    title: '大查房的难堪',
    body: '主任带着一群人查房，当众指出你一份医嘱的漏洞："这么开，病人肾功能怎么办？"二十几双眼睛看着你。',
    category: 'mental', weight: 55, once: true, minTurn: 2, maxTurn: 5,
    requireFlag: 'sub_internal',
    choices: [
      { text: '虚心记下，回去改', delta: { knowledge: 3, sanity: -3, reputation: 1 }, consequence: '你把那条医嘱背了下来，从此再没犯过。' },
      { text: '当场辩解两句', delta: { relations: -2, sanity: -3, reputation: -2 }, consequence: '主任没再追问，但查房的气氛冷了下来。' },
    ],
  },
];
