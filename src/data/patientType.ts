// 患者档案库：≥25 种结构化患者画像，分门别类（年龄段/收入/医保/性格），
// 每种携带 7 种交互特质（costSensitive 重费用 / communicationBarrier 沟通障碍 /
// familyInvolved 家属卷入 / litigious 好诉 / nonCompliant 依从性差 / lonely 孤独 /
// demanding 挑剔），以及 followUp 随访设定。
// 用途：eventGen 用 patientAt 确定性取档案生成门诊/查房/病房互访事件，特质决定交互选项。

export interface PatientTraits {
  costSensitive?: boolean;        // 重费用 → 选项"考虑费用，能省则省"
  communicationBarrier?: boolean; // 沟通障碍 → 选项"放慢语速，讲清楚"
  familyInvolved?: boolean;       // 家属卷入 → 选项"把家属叫进来一起听"
  litigious?: boolean;            // 好诉 → 选项"措辞谨慎，病历写全"
  nonCompliant?: boolean;         // 依从性差 → 选项"反复叮嘱，约好随访"
  lonely?: boolean;               // 孤独 → 选项"多陪他聊了几句"
  demanding?: boolean;            // 挑剔 → 选项"一条条回答他的问题"
}

export interface PatientArchetype {
  id: string;
  name: string;
  profile: string;
  ageGroup: string;
  income: string;
  insurance: string;
  personality: string[];
  traits: PatientTraits;
  followUp: string;
}

export const PATIENT_ARCHETYPES: PatientArchetype[] = [
  {
    id: 'lonely_elderly_hypertension', name: '独居老人·高血压', profile: '儿女在外，血压常年高，药吃吃停停，没人提醒', ageGroup: '老年', income: '退休金不多', insurance: '职工医保',
    personality: ['沉默寡言，怕麻烦人'], traits: { costSensitive: true, communicationBarrier: true, lonely: true, nonCompliant: true },
    followUp: '留了子女的电话，约好下周复查并教他写用药表',
  },
  {
    id: 'migrant_worker_injury', name: '农民工·工地摔伤', profile: '建筑工地高处摔落，腿肿得厉害，担心耽误工期', ageGroup: '中年', income: '日结工钱', insurance: '工伤待认定',
    personality: ['能忍则忍，心疼钱'], traits: { costSensitive: true, familyInvolved: true, nonCompliant: true },
    followUp: '叮嘱停工静养，并把工伤认定流程写给他',
  },
  {
    id: 'whitecollar_stress_insomnia', name: '白领·失眠焦虑', profile: '加班三年，凌晨三点睁着眼到天亮，白天心慌手抖', ageGroup: '青年', income: '月薪尚可', insurance: '职工医保',
    personality: ['焦虑，反复确认'], traits: { demanding: true, nonCompliant: true },
    followUp: '给他一张作息表，约两周后复诊看睡眠日志',
  },
  {
    id: 'retired_teacher_arthritis', name: '退休教师·关节炎', profile: '站了一辈子讲台，膝盖肿痛，走路吱呀作响', ageGroup: '老年', income: '退休金稳定', insurance: '公费医疗',
    personality: ['温和讲理，把医生当学生考'], traits: { demanding: true },
    followUp: '约了理疗，叮嘱坚持热敷和适度活动',
  },
  {
    id: 'takeout_rider_gastritis', name: '外卖骑手·胃炎', profile: '风里来雨里去，饭没准点，胃痛得直不起腰还惦记接单', ageGroup: '青年', income: '按单结算', insurance: '无医保流动人口',
    personality: ['急，嫌看病耽误赚钱'], traits: { costSensitive: true, nonCompliant: true },
    followUp: '给开便宜药，叮嘱规律三餐，约复查',
  },
  {
    id: 'postpartum_mom_depression', name: '产后妈妈·情绪低落', profile: '刚出月子，整夜睡不着，动不动掉眼泪，不敢跟家里说', ageGroup: '青年', income: '家庭收入一般', insurance: '城乡居民医保',
    personality: ['欲言又止，怕被说矫情'], traits: { lonely: true, familyInvolved: true, communicationBarrier: true },
    followUp: '建议家属一起复诊，给心理援助热线',
  },
  {
    id: 'litigious_family_oldman', name: '家属强势·老慢支', profile: '老人慢阻肺急性加重，儿子全程录音，开口就是"治不好告你们"', ageGroup: '老年', income: '家庭宽裕', insurance: '职工医保',
    personality: ['家属强势，患者本人插不上话'], traits: { litigious: true, familyInvolved: true },
    followUp: '把病情和风险逐条写进病历，请家属签字确认',
  },
  {
    id: 'farmer_untreated_diabetes', name: '老农民·糖尿病', profile: '血糖高得吓人还不当回事，"我壮得很，吃得多是福"', ageGroup: '老年', income: '种地收入', insurance: '城乡居民医保',
    personality: ['固执，迷信"是药三分毒"'], traits: { nonCompliant: true, costSensitive: true, communicationBarrier: true },
    followUp: '请村医帮忙盯着，约每月复查一次',
  },
  {
    id: 'student_myopia_headache', name: '高中生·头痛近视', profile: '被妈妈带来查"学习差是不是脑子问题"，全程低头玩手机', ageGroup: '少年', income: '父母负担', insurance: '居民医保',
    personality: ['问一句答一句'], traits: { familyInvolved: true, demanding: true },
    followUp: '配镜+建议家长减少补习压力，约复查',
  },
  {
    id: 'driver_prostate_issue', name: '出租车司机·前列腺', profile: '一开就是十个小时，憋尿憋出病，急着交班', ageGroup: '中年', income: '跑车收入', insurance: '灵活就业医保',
    personality: ['说话急，怕耽误拉活'], traits: { costSensitive: true, nonCompliant: true },
    followUp: '叮嘱多喝水别憋尿，约复查，提醒注意职业健康',
  },
  {
    id: 'rich_boss_physical', name: '企业家·全面体检', profile: '行程排满，胸口发紧三天，只给了你十分钟", 要求"最快的方案', ageGroup: '中年', income: '殷实', insurance: '干部保健',
    personality: ['要权威，要效率'], traits: { demanding: true, familyInvolved: true },
    followUp: '安排了当天全套检查，让秘书盯着报告',
  },
  {
    id: 'lonely_widower_stomach', name: '独居大爷·胃出血', profile: '老伴走后一个人，顿顿凑合，黑便三天才来', ageGroup: '老年', income: '退休金', insurance: '职工医保',
    personality: ['怕住院没人管'], traits: { lonely: true, costSensitive: true, communicationBarrier: true, nonCompliant: true },
    followUp: '联系了社区志愿者，叮嘱留了邻居电话',
  },
  {
    id: 'deaf_patient_pneumonia', name: '聋哑人·肺炎', profile: '发烧咳嗽一周，进诊室就递过一张字条"我听不见，请写字"', ageGroup: '中年', income: '残疾补贴', insurance: '居民医保',
    personality: ['用手势比划，着急'], traits: { communicationBarrier: true, lonely: true },
    followUp: '全程写字沟通，把医嘱逐条写给他，联系家人',
  },
  {
    id: 'old_man_superstition_tumor', name: '迷信老人·胃部肿物', profile: '查出胃部占位，死活不来，"喝偏方三个月，我自己觉得好多了"', ageGroup: '老年', income: '积蓄不多', insurance: '居民医保',
    personality: ['信偏方，不信医院'], traits: { costSensitive: true, nonCompliant: true, litigious: true, familyInvolved: true },
    followUp: '请家属一起谈，把延误后果讲清楚，约活检',
  },
  {
    id: 'career_woman_thyroid', name: '中年女性·甲状腺结节', profile: '体检发现结节，网上搜了一夜，进门就问"是不是癌"', ageGroup: '中年', income: '稳定', insurance: '职工医保',
    personality: ['焦虑，反复确认'], traits: { demanding: true, costSensitive: true },
    followUp: '把超声和穿刺的利弊讲透，约随访',
  },
  {
    id: 'boy_epilepsy_school', name: '小学生·抽搐发作', profile: '课堂上突然倒地抽搐，家长吓坏了，查了半天没查出大问题', ageGroup: '儿童', income: '双职工', insurance: '居民医保',
    personality: ['家长焦虑，孩子安静'], traits: { familyInvolved: true, demanding: true, litigious: true },
    followUp: '教家长发作时处理，约脑电图复查',
  },
  {
    id: 'old_woman_fracture_bed', name: '独居老太·股骨颈骨折', profile: '在浴室滑倒起不来，躺了一天才被邻居发现送来', ageGroup: '老年', income: '退休金', insurance: '居民医保',
    personality: ['沉默，怕拖累家人'], traits: { lonely: true, communicationBarrier: true, costSensitive: true },
    followUp: '联系子女，安排康复计划，叮嘱防跌倒',
  },
  {
    id: 'intellectual_patient', name: '高知患者·房颤', profile: '大学教授，房颤伴心悸，自己把文献都看了一遍，进门要跟你"探讨方案"', ageGroup: '老年', income: '丰厚', insurance: '公费医疗',
    personality: ['理性，要数据'], traits: { demanding: true, familyInvolved: true },
    followUp: '把抗凝利弊数据摆出来，尊重他的选择',
  },
  {
    id: 'migrant_mother_child_fever', name: '打工母亲·孩子高烧', profile: '孩子烧到39.5℃，母亲在车间请了假，急得直搓手，兜里钱不多', ageGroup: '儿童', income: '打工收入紧', insurance: '异地医保',
    personality: ['焦虑，怕花钱又怕误了孩子'], traits: { costSensitive: true, familyInvolved: true, communicationBarrier: true },
    followUp: '开便宜有效的药，教物理降温，叮嘱留票据报销',
  },
  {
    id: 'alcoholic_liver', name: '嗜酒者·肝硬化', profile: '脸色发黑，肚子鼓着，还惦记"来口白的压压惊"', ageGroup: '中年', income: '不稳定', insurance: '无医保',
    personality: ['自暴自弃，嘴上硬'], traits: { nonCompliant: true, litigious: true, costSensitive: true },
    followUp: '谈戒酒，约肝功能复查，给戒酒咨询',
  },
  {
    id: 'teenager_eating_disorder', name: '厌食少女·低血糖', profile: '瘦得脱相，进门就晕，家长说是"减肥减的"，她低着头不吭声', ageGroup: '少年', income: '家庭负担', insurance: '居民医保',
    personality: ['沉默，回避眼神'], traits: { lonely: true, familyInvolved: true, communicationBarrier: true, nonCompliant: true },
    followUp: '联系心理科，约家长一起谈，约定营养方案',
  },
  {
    id: 'rural_elder_no_insurance', name: '农村老太·白内障', profile: '眼睛快看不见了，一直拖，"去医院得花好多钱，等儿女回来再说"', ageGroup: '老年', income: '种地+补贴', insurance: '无医保',
    personality: ['节俭，怕花钱'], traits: { costSensitive: true, lonely: true, nonCompliant: true },
    followUp: '申请白内障复明救助项目，约术前检查',
  },
  {
    id: 'online_anchor_voice', name: '网红主播·声带结节', profile: '直播嗓子哑得说不出话，还怕破相怕掉粉，口罩压得低低的', ageGroup: '青年', income: '打赏收入', insurance: '灵活就业医保',
    personality: ['要面子，怕人设塌'], traits: { demanding: true, familyInvolved: true, litigious: true },
    followUp: '叮嘱声休，约喉镜复查，劝他调整直播时长',
  },
  {
    id: 'double_shift_worker_ulcer', name: '夜班工人·胃溃疡', profile: '三班倒十年，胃溃疡反复，值完夜班胃痛到冒冷汗才来', ageGroup: '中年', income: '工厂工资', insurance: '职工医保',
    personality: ['能忍，怕请假扣钱'], traits: { nonCompliant: true, costSensitive: true },
    followUp: '约胃镜，开足疗程药，叮嘱规律作息',
  },
  {
    id: 'old_military_back_pain', name: '退伍老兵·腰腿旧伤', profile: '腰椎间盘突出，走路瘸着，说"当年行军落下的，不碍事"', ageGroup: '老年', income: '优抚金', insurance: '职工医保',
    personality: ['硬汉，能扛就扛'], traits: { nonCompliant: true, lonely: true },
    followUp: '安排康复理疗，叮嘱适度锻炼，约随访',
  },
  {
    id: 'caregiver_anxiety', name: '陪护家属·焦虑', profile: '照顾老伴累到心悸，自己挂了号，进来却先问"我老伴那个检查怎么样"', ageGroup: '中年', income: '退休+子女', insurance: '职工医保',
    personality: ['操心，把自己放最后'], traits: { lonely: true, demanding: true },
    followUp: '开了调理药，叮嘱他也得照顾自己，约复诊',
  },
  {
    id: 'programmer_cervical', name: '程序员·颈椎病', profile: '改需求改到头昏手麻，脖子咔咔响，还惦记晚上上线', ageGroup: '青年', income: '尚可', insurance: '职工医保',
    personality: ['自嘲，拖延'], traits: { nonCompliant: true, costSensitive: true },
    followUp: '给拉伸操清单，约复查，提醒换人体工学椅',
  },
  {
    id: 'foreign_teacher_flu', name: '外教·流感高热', profile: '中文磕磕绊绊，发烧两天，比划着要"不吃药扛过去"', ageGroup: '青年', income: '外教工资', insurance: '商保加持',
    personality: ['沟通靠比划'], traits: { communicationBarrier: true, familyInvolved: true },
    followUp: '用翻译软件沟通，开抗病毒药，留了联系方式',
  },
  {
    id: 'truck_driver_fatigue', name: '大货车司机·腰病', profile: '长途开两天两夜，腰像断了一样，货单催着走', ageGroup: '中年', income: '跑长途', insurance: '灵活就业医保',
    personality: ['急，想开点药就走'], traits: { costSensitive: true, nonCompliant: true, communicationBarrier: true },
    followUp: '开了止痛和理疗，反复叮嘱休息，约复查',
  },
  {
    id: 'rich_hypochondriac', name: '疑病中年·全身不适', profile: '总觉得浑身是病，各科都查过没大事，进门第一句"我是不是得癌了"', ageGroup: '中年', income: '生意人', insurance: '商保加持',
    personality: ['多疑，反复检查'], traits: { demanding: true, litigious: true, costSensitive: true },
    followUp: '安排必要检查后明确告知无异常，建议心理科疏导',
  },
];

/** 确定性取患者档案（与 eventGen 取数方式一致，可复现） */
export function patientAt(i: number, salt = 0): PatientArchetype {
  return PATIENT_ARCHETYPES[((i + salt) % PATIENT_ARCHETYPES.length + PATIENT_ARCHETYPES.length) % PATIENT_ARCHETYPES.length];
}
