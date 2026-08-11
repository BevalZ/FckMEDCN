import type { GameEvent } from './events';
import type { LifeStage } from './gameState';
import { NPCS } from './npc';
import type { NpcDef } from './npc';
import type { Stats } from './stats';

export interface NpcHiddenRule {
  id: string;
  eventId: string;
  npcId: NpcDef['id'];
  stages: LifeStage[];
  spotIds?: string[];
  minTurn?: number;
  maxTurn?: number;
  minAffinity?: number;
  maxAffinity?: number;
  requireFlags?: string[];
  requireAnyFlags?: string[];
  excludeFlags?: string[];
  requireStats?: Partial<Record<keyof Stats, [number, number]>>;
  priority?: number;
}

export const NPC_HIDDEN_EVENTS: GameEvent[] = [
  {
    id: 'npc_roommate_dorm_low_sanity',
    stage: 'undergrad', title: '宿舍灯没关',
    body: '熄灯后，室友没有打游戏。他看见你反复翻身，压低声音问："你是不是又在想，自己到底适不适合学医？"这不是普通聊天，而是一个人终于发现你快撑不住了。',
    category: 'mental', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '承认最近真的很糟', delta: { sanity: 10, relations: 4, stamina: -2 }, effect: { kind: 'changeAffinity', npcId: 'roommate', amount: 12 }, consequence: '他把第二天早课的闹钟也替你设了，说："明天我叫你。先把这一周过完。"' },
      { text: '装作没事，把话题岔开', delta: { sanity: -4, relations: -2 }, effect: { kind: 'changeAffinity', npcId: 'roommate', amount: -6 }, consequence: '他没有追问。宿舍重新安静下来，但那种被看见的机会错过了。' },
    ],
  },
  {
    id: 'npc_senior_exam_window',
    stage: 'undergrad', title: '公告栏前的报名窗口',
    body: '学长在公告栏前指着几张通知：推免材料、考研预报名、导师开放日、医院夏令营，截止时间挤在一起。他提醒你，真正筛人的不是口号，是同专业排名、英语证明和谁愿意在面试前见你一面。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '请他帮你拆时间表和报考清单', delta: { knowledge: 5, relations: 4, stamina: -5 }, effect: { kind: 'changeAffinity', npcId: 'senior', amount: 10 }, consequence: '你把材料、复习、毕业论文和联系导师排到同一张表里，第一次看清下半年会有多挤。' },
      { text: '只问哪家最好上岸', delta: { sanity: 2, reputation: -1 }, effect: { kind: 'changeAffinity', npcId: 'senior', amount: -5 }, consequence: '他皱了下眉："没有单纯好上岸的地方，只有你愿意付出什么成本。"' },
    ],
  },
  {
    id: 'npc_teacher_lab_slot',
    stage: 'undergrad', title: '老师留的一个名额',
    body: '带教老师把你叫到一边。实验室有个本科生名额，不写在通知里，因为进去后要真干活：伦理申请、数据录入、文献汇报、周末补实验，和考试复习会正面冲突。',
    category: 'study', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '接下名额，约定不碰数据底线', delta: { research: 8, knowledge: 4, reputation: 3, stamina: -10, sanity: -3 }, effect: [{ kind: 'changeAffinity', npcId: 'teacher', amount: 8 }, { kind: 'startResearchProject', title: '本科临床数据小课题', paperType: 'clinical', progress: 10 }], consequence: '老师说可以累，但不能糊弄。你从录入第一份病例开始学会什么叫原始记录。' },
      { text: '先补技能和课程，不硬挤科研', delta: { clinical: 5, knowledge: 3, sanity: 3, stamina: -4 }, effect: { kind: 'changeAffinity', npcId: 'teacher', amount: 4 }, consequence: '老师点头："知道自己现在缺什么，比盲目进组更重要。"' },
    ],
  },
  {
    id: 'npc_counselor_crisis_intervention',
    stage: 'undergrad', title: '辅导员的名单',
    body: '辅导员在宿舍楼下等你。他手里不是处分表，而是一张空白申请：临时困难补助、缓考说明、心理咨询预约，都可以现在填。真正难的是承认自己需要制度里的帮助。',
    category: 'personal', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '把困难说完整', delta: { sanity: 12, money: 1000, relations: 3 }, effect: [{ kind: 'changeAffinity', npcId: 'counselor', amount: 12 }, { kind: 'addCrisisCredits', amount: 1 }], consequence: '他帮你把申请理由改得体面，提醒你：求助不是给别人添麻烦。' },
      { text: '只说学习忙，拒绝登记', delta: { sanity: -5, reputation: 1 }, effect: { kind: 'changeAffinity', npcId: 'counselor', amount: -8 }, consequence: '他没有强迫你，但在离开前说："下次别等到失联。"' },
    ],
  },
  {
    id: 'npc_attending_first_assist',
    stage: 'internship', title: '第一助手机会',
    body: '带教主治在手术间门口停住："今天这台你上一助。不是让你表现，是看你能不能听指令、稳住手、知道什么时候闭嘴。"机会突然落下，也意味着任何失误都会被全组看见。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '提前复盘步骤，上台只做该做的事', delta: { clinical: 8, reputation: 4, stamina: -12, sanity: -4 }, effect: { kind: 'changeAffinity', npcId: 'attending', amount: 8 }, consequence: '你没有抢戏，也没有掉链子。主治术后只说了一句："下次继续。"' },
      { text: '硬着头皮表现，频繁插话', delta: { clinical: 2, reputation: -4, sanity: -8 }, effect: { kind: 'changeAffinity', npcId: 'attending', amount: -10 }, consequence: '她当场打断你："手术台上，先学会配合。"之后你很久没再上台。' },
    ],
  },
  {
    id: 'npc_headnurse_order_friction',
    stage: ['internship', 'guipei'], title: '护士站提前拦下的医嘱',
    body: '护士长把你开的医嘱退回来：剂量、执行时间、皮试记录和实际床旁情况对不上。她不是挑刺，是知道一旦执行出问题，医生、护士、患者都会被卷进去。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '当场核对并道谢', delta: { clinical: 5, relations: 5, stamina: -4 }, effect: [{ kind: 'changeAffinity', npcId: 'headnurse', amount: 12 }, { kind: 'changeColleagues', nurseAlliance: 8 }], consequence: '护士站之后会提前提醒你高风险医嘱。你明白协作不是客气话，是安全网。' },
      { text: '觉得被当众下不来台', delta: { sanity: -4, relations: -8 }, effect: [{ kind: 'changeAffinity', npcId: 'headnurse', amount: -12 }, { kind: 'changeColleagues', nurseAlliance: -10 }], consequence: '气氛僵住。之后你每次找人执行医嘱，都要多绕几圈。' },
    ],
  },
  {
    id: 'npc_fellow_quit_edge',
    stage: 'guipei', title: '值班室里的退培边缘',
    body: '高年资规培在值班室递给你一杯热水。她没劝你热爱医学，只把出科考、夜班、导师脸色和找工作时间线摊开：再撑、转轨、直接工作，都有代价。',
    category: 'mental', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '一起把未来半年拆成可执行清单', delta: { sanity: 10, clinical: 3, knowledge: 3, stamina: -3 }, effect: { kind: 'changeAffinity', npcId: 'fellow', amount: 10 }, consequence: '你不是突然有了热情，只是知道下一个夜班之后该做什么。' },
      { text: '承认想走，问直接工作怎么投', delta: { sanity: 4, reputation: -1 }, effect: [{ kind: 'changeAffinity', npcId: 'fellow', amount: 4 }, { kind: 'setTrainingTrack', track: 'clinical' }], consequence: '她把几家单位的招聘节奏写给你，也提醒你：面试会问为什么规培表现一般。' },
    ],
  },
  {
    id: 'npc_advisor_letter_window',
    stage: ['master', 'phd', 'career'], title: '导师的推荐信',
    body: '导师把门关上，问你要投哪里。推荐信不是一句"该生优秀"，而是把你做过的题、可信的能力、可能被问住的短板写给对方。你也知道，这封信会把你放进另一个排名池。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '如实交代目标、短板和备选单位', delta: { reputation: 6, research: 4, sanity: 2 }, effect: [{ kind: 'changeAffinity', npcId: 'advisor', amount: 8 }, { kind: 'changeMentorFaction', mentorBond: 10, reputation: 6 }, { kind: 'setFlag', flag: 'got_recommend' }], consequence: '推荐信写得具体，既没有吹破，也把能打招呼的窗口留住了。' },
      { text: '只报最热门方向，希望导师硬推', delta: { reputation: 2, sanity: -6 }, effect: [{ kind: 'changeAffinity', npcId: 'advisor', amount: -8 }, { kind: 'changeMentorFaction', mentorBond: -8, rivalry: 5 }], consequence: '导师说可以试，但名额、同批排名和对方导师态度，不会因为你想去就改变。' },
    ],
  },
  {
    id: 'npc_career_peer_case_cover',
    stage: ['career', 'pinnacle'], title: '同组医生的病例兜底',
    body: '同组医生把你拉到电脑前：一个病人的诊断链条断在交班处。她愿意帮你一起补，但也提醒你，谁签字谁负责，不能把模糊留给明天。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '一起重看病程并补全交接', delta: { clinical: 5, relations: 4, stamina: -6 }, effect: [{ kind: 'changeAffinity', npcId: 'career_peer', amount: 8 }, { kind: 'changeColleagues', peerBond: 6 }], consequence: '病例变清楚了。她说："以后我忙不过来，也会叫你。"' },
      { text: '让她先顶一下签字', delta: { stamina: 2, reputation: -4, relations: -5 }, effect: [{ kind: 'changeAffinity', npcId: 'career_peer', amount: -10 }, { kind: 'recordColleagueConflict', event: '病例兜底推责', opponent: '同组医生', resolution: 'ongoing' }], consequence: '她没当场翻脸，但之后交班变得冷冰冰。' },
    ],
  },
  {
    id: 'npc_resident_chief_roster',
    stage: ['career', 'pinnacle'], title: '住院总的排班表',
    body: '住院总把排班表摊开。有人婚假，有人病倒，有人论文答辩，夜班缺口最后都压到还算可靠的人身上。你可以接，也可以把边界说清。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '接关键夜班，但要求明确补休', delta: { reputation: 4, relations: 3, stamina: -10, sanity: -3 }, effect: { kind: 'changeAffinity', npcId: 'resident_chief', amount: 7 }, consequence: '住院总在表上给你补了半天休。不是恩惠，是把规则写下来。' },
      { text: '直接拒绝所有临时调整', delta: { sanity: 5, relations: -6, reputation: -2 }, effect: { kind: 'changeAffinity', npcId: 'resident_chief', amount: -8 }, consequence: '你保住了这周，但之后抢救抽人时，很少有人先想到你。' },
    ],
  },
  {
    id: 'npc_ward_nurse_execution_hint',
    stage: ['career', 'pinnacle'], title: '责任护士的床旁提醒',
    body: '责任护士在床旁低声提醒：家属情绪不对，前一班沟通可能有遗漏。她愿意先帮你稳住场面，但你必须亲自把风险解释清楚。',
    category: 'social', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '马上补沟通并记录', delta: { relations: 6, clinical: 3, stamina: -5 }, effect: [{ kind: 'changeAffinity', npcId: 'ward_nurse', amount: 10 }, { kind: 'changeLegal', field: 'communicationRecord', amount: 8 }, { kind: 'changeColleagues', nurseAlliance: 7 }], consequence: '家属没有完全满意，但投诉苗头被提前看见。护士站也知道你愿意承担医生该做的部分。' },
      { text: '让护士先安抚，自己继续查房', delta: { stamina: 2, relations: -6 }, effect: [{ kind: 'changeAffinity', npcId: 'ward_nurse', amount: -9 }, { kind: 'changeLegal', field: 'legalRisk', amount: 4 }], consequence: '你省了十分钟，却把一个本该当场处理的问题留到了下午。' },
    ],
  },
  {
    id: 'npc_medical_admin_quality_check',
    stage: ['career', 'pinnacle'], title: '医务科的抽查名单',
    body: '医务科干事提前告诉你，本周抽查病历质量和知情同意。名单里有你的病区。她不会替你改记录，只能告诉你哪些地方最容易被抓住。',
    category: 'system', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '按清单补齐记录', delta: { knowledge: 3, reputation: 2, stamina: -8 }, effect: [{ kind: 'changeAffinity', npcId: 'medical_admin', amount: 8 }, { kind: 'changeLegal', field: 'recordDefense', amount: 10 }], consequence: '你补得很累，但抽查时每一处关键记录都有出处。' },
      { text: '请她帮忙打个招呼压过去', delta: { sanity: 2, reputation: -5 }, effect: [{ kind: 'changeAffinity', npcId: 'medical_admin', amount: -6 }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: 8 }], consequence: '她沉默了一下，说："这种忙帮一次，就会有第二次。"' },
    ],
  },
  {
    id: 'npc_lab_doctor_critical_value',
    stage: ['career', 'pinnacle'], title: '检验科的危急值电话',
    body: '检验科医生没有只把危急值发系统，而是直接打电话给你：样本状态、复查结果和临床表现不完全一致。这个电话给你争取到重新判断的十分钟。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '亲自回到床旁复核', delta: { clinical: 6, knowledge: 2, stamina: -6 }, effect: { kind: 'changeAffinity', npcId: 'lab_doctor', amount: 8 }, consequence: '你发现病情变化比化验单更早一步。检验科之后更愿意把异常信息说完整。' },
      { text: '让下级先处理，自己等结果', delta: { stamina: 2, clinical: -2 }, effect: { kind: 'changeAffinity', npcId: 'lab_doctor', amount: -7 }, consequence: '结果没有出大事，但对方以后只按流程发系统，不再额外提醒。' },
    ],
  },
  {
    id: 'npc_radiologist_discrepancy',
    stage: ['career', 'pinnacle'], title: '影像科的第二眼',
    body: '影像科医生在阅片室叫住你：报告里的描述没错，但她觉得和症状对不上。她愿意和你一起重看薄层，但这意味着你要推迟下一台操作。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '留下来重看片子', delta: { clinical: 5, knowledge: 4, stamina: -6 }, effect: { kind: 'changeAffinity', npcId: 'radiologist', amount: 8 }, consequence: '你们找到了一个容易漏掉的征象。诊断改变，也改变了患者的路径。' },
      { text: '按原报告处理', delta: { stamina: 2, sanity: -3 }, effect: { kind: 'changeAffinity', npcId: 'radiologist', amount: -6 }, consequence: '她没有再坚持。你后来总觉得那张片子还欠一次真正的讨论。' },
    ],
  },
  {
    id: 'npc_junior_doctor_teaching',
    stage: ['career', 'pinnacle'], title: '低年资医生的求救',
    body: '低年资医生拿着病历追上你：他知道自己写错了，但不知道错在哪里。你现在教他，会耽误自己的事；不教，他下次可能在更危险的地方犯错。',
    category: 'social', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '花半小时逐条带他改', delta: { reputation: 4, relations: 5, stamina: -6 }, effect: [{ kind: 'changeAffinity', npcId: 'junior_doctor', amount: 10 }, { kind: 'changeColleagues', studentLoyalty: 8 }], consequence: '他改完后把模板发给同年级。你损失了时间，却多了一个愿意说真话的年轻人。' },
      { text: '让他自己回去查规范', delta: { knowledge: 1, relations: -4 }, effect: { kind: 'changeAffinity', npcId: 'junior_doctor', amount: -7 }, consequence: '他点头离开。下次交班时，他不再主动暴露自己的问题。' },
    ],
  },
  {
    id: 'npc_department_chief_rank_list',
    stage: ['career', 'pinnacle'], title: '科主任的晋升排序',
    body: '科主任没有明说名额，只把今年的评审口径摊开：临床量、论文、投诉、教学、科室贡献，以及那些不会写进表格的人情熟悉度。每个人都在同一张隐形排名里。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '拿真实病例质量和代表作补短板', delta: { reputation: 6, research: 4, clinical: 3, stamina: -8 }, effect: [{ kind: 'changeAffinity', npcId: 'department_chief', amount: 8 }, { kind: 'changeResearch', field: 'representativeIndex', amount: 8 }], consequence: '主任没有承诺，但告诉你下一轮材料应该怎么摆。' },
      { text: '先打听谁能说上话', delta: { relations: 4, reputation: -3, sanity: -2 }, effect: [{ kind: 'changeAffinity', npcId: 'department_chief', amount: -5 }, { kind: 'changeMentorFaction', factionLoyalty: 6, rivalry: 4 }], consequence: '你得到了一些名字，也失去了一点被当作专业人的信任。' },
    ],
  },
  {
    id: 'npc_pharmacist_med_review',
    stage: ['career', 'pinnacle'], title: '药师的用药审核',
    body: '临床药师把一张用药清单放到你面前：肾功能、相互作用、抗菌药物级别和医保限制都写着红标。她不是挡你开药，而是在替患者和你挡风险。',
    category: 'clinical', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '按建议调整方案并解释给家属', delta: { clinical: 4, knowledge: 4, relations: 3, stamina: -5 }, effect: [{ kind: 'changeAffinity', npcId: 'pharmacist', amount: 9 }, { kind: 'changePolicy', field: 'procurementCompliance', amount: 4 }], consequence: '方案更慢一点，但更稳。药师后来会主动帮你筛高风险用药。' },
      { text: '坚持原方案，先把病压住', delta: { clinical: 2 }, effect: [{ kind: 'changeAffinity', npcId: 'pharmacist', amount: -7 }, { kind: 'changeLegal', field: 'legalRisk', amount: 3 }], consequence: '短期处理顺利，但药师在系统里留下了审核意见。' },
    ],
  },
  {
    id: 'npc_patient_liaison_complaint',
    stage: ['career', 'pinnacle'], title: '投诉前的十分钟',
    body: '患者服务专员在走廊拦住你：家属已经到窗口了，还没正式写投诉。你有十分钟补沟通，解释治疗边界，也可能因为一句话把火点着。',
    category: 'social', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '带着记录当面解释', delta: { relations: 5, sanity: -2, stamina: -4 }, effect: [{ kind: 'changeAffinity', npcId: 'patient_liaison', amount: 10 }, { kind: 'changeLegal', field: 'communicationRecord', amount: 10 }], consequence: '家属仍然难过，但愿意先听完。专员之后更早把苗头告诉你。' },
      { text: '强调流程正确，不多解释', delta: { stamina: 2, relations: -7 }, effect: [{ kind: 'changeAffinity', npcId: 'patient_liaison', amount: -8 }, { kind: 'startLegalDispute', status: 'complaint' }], consequence: '你说的也许没错，但对方听见的是推开。投诉单最终还是递了上去。' },
    ],
  },
  {
    id: 'npc_community_doctor_referral',
    stage: ['career', 'pinnacle'], title: '社区医生的转诊电话',
    body: '社区医生打来电话：一个老病人反复入院，真正的问题可能不在这次化验，而在出院后的随访断层。她想和你建立一个固定转诊和回访口径。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '建立随访清单和回转标准', delta: { clinical: 4, relations: 5, reputation: 3, stamina: -5 }, effect: { kind: 'changeAffinity', npcId: 'community_doctor', amount: 9 }, consequence: '病人少跑了一次急诊。你也第一次感到医院外的网络能改变病程。' },
      { text: '只处理本院这次住院', delta: { stamina: 2, relations: -3 }, effect: { kind: 'changeAffinity', npcId: 'community_doctor', amount: -6 }, consequence: '电话很快结束。患者下次还是会从急诊重新开始。' },
    ],
  },
  {
    id: 'npc_conference_peer_external_rank',
    stage: ['career', 'pinnacle'], title: '外院同行的会场消息',
    body: '外院同行在会议茶歇时告诉你，他们科今年可能放一个位置。简历、文章、亚专业方向都重要，但真正进面后，同批报考者排名和谁愿意提前了解你，同样决定结果。',
    category: 'career', weight: 0, once: true, manualOnly: true,
    choices: [
      { text: '交换材料，请他实话评估竞争力', delta: { reputation: 4, relations: 4, research: 2 }, effect: { kind: 'changeAffinity', npcId: 'conference_peer', amount: 8 }, consequence: '他把优势和短板都说了。机会没有到手，但你知道该不该投。' },
      { text: '只请他帮忙递话', delta: { relations: 2, reputation: -2 }, effect: { kind: 'changeAffinity', npcId: 'conference_peer', amount: -5 }, consequence: '他答应可以介绍，但语气保留。你意识到关系不能替代材料。' },
    ],
  },
];

export const NPC_HIDDEN_RULES: NpcHiddenRule[] = [
  { id: 'rule_roommate_dorm_low_sanity', eventId: 'npc_roommate_dorm_low_sanity', npcId: 'roommate', stages: ['undergrad'], spotIds: ['dorm'], minTurn: 2, minAffinity: 50, requireStats: { sanity: [0, 55] }, priority: 90 },
  { id: 'rule_senior_exam_window', eventId: 'npc_senior_exam_window', npcId: 'senior', stages: ['undergrad'], spotIds: ['library', 'board'], minTurn: 12, minAffinity: 55, requireAnyFlags: ['ug_kaoyan_intent', 'passed_cet6', 'got_senior_notes'], priority: 80 },
  { id: 'rule_teacher_lab_slot', eventId: 'npc_teacher_lab_slot', npcId: 'teacher', stages: ['undergrad'], spotIds: ['teaching', 'library'], minTurn: 4, minAffinity: 58, requireStats: { research: [8, 100] }, priority: 70 },
  { id: 'rule_counselor_crisis_intervention', eventId: 'npc_counselor_crisis_intervention', npcId: 'counselor', stages: ['undergrad'], spotIds: ['board', 'dorm'], minAffinity: 45, requireStats: { sanity: [0, 60] }, priority: 85 },
  { id: 'rule_attending_first_assist', eventId: 'npc_attending_first_assist', npcId: 'attending', stages: ['internship'], spotIds: ['ward', 'or'], minTurn: 1, minAffinity: 58, requireStats: { clinical: [12, 100] }, priority: 70 },
  { id: 'rule_headnurse_order_friction', eventId: 'npc_headnurse_order_friction', npcId: 'headnurse', stages: ['internship', 'guipei'], spotIds: ['nurse', 'er'], minTurn: 1, minAffinity: 50, priority: 60 },
  { id: 'rule_fellow_quit_edge', eventId: 'npc_fellow_quit_edge', npcId: 'fellow', stages: ['guipei'], spotIds: ['callroom', 'lab'], minTurn: 3, minAffinity: 50, requireStats: { sanity: [0, 60] }, priority: 80 },
  { id: 'rule_advisor_letter_window', eventId: 'npc_advisor_letter_window', npcId: 'advisor', stages: ['master', 'phd', 'career'], spotIds: ['lab', 'meeting', 'bench', 'canteen'], minTurn: 6, minAffinity: 68, requireAnyFlags: ['will_phd', 'phd_material_pass', 'got_recommend', 'ms_thesis_secured', 'phd_dissertation_secured'], priority: 90 },
  { id: 'rule_career_peer_case_cover', eventId: 'npc_career_peer_case_cover', npcId: 'career_peer', stages: ['career', 'pinnacle'], spotIds: ['ward', 'canteen'], minAffinity: 55, priority: 50 },
  { id: 'rule_resident_chief_roster', eventId: 'npc_resident_chief_roster', npcId: 'resident_chief', stages: ['career', 'pinnacle'], spotIds: ['er', 'admin'], minTurn: 2, minAffinity: 50, priority: 50 },
  { id: 'rule_ward_nurse_execution_hint', eventId: 'npc_ward_nurse_execution_hint', npcId: 'ward_nurse', stages: ['career', 'pinnacle'], spotIds: ['nurse', 'ward'], minAffinity: 55, priority: 55 },
  { id: 'rule_medical_admin_quality_check', eventId: 'npc_medical_admin_quality_check', npcId: 'medical_admin', stages: ['career', 'pinnacle'], spotIds: ['admin', 'er'], minTurn: 3, minAffinity: 50, priority: 55 },
  { id: 'rule_lab_doctor_critical_value', eventId: 'npc_lab_doctor_critical_value', npcId: 'lab_doctor', stages: ['career', 'pinnacle'], spotIds: ['lab', 'ward'], minAffinity: 55, priority: 50 },
  { id: 'rule_radiologist_discrepancy', eventId: 'npc_radiologist_discrepancy', npcId: 'radiologist', stages: ['career', 'pinnacle'], spotIds: ['lab', 'er', 'ward'], minAffinity: 55, priority: 50 },
  { id: 'rule_junior_doctor_teaching', eventId: 'npc_junior_doctor_teaching', npcId: 'junior_doctor', stages: ['career', 'pinnacle'], spotIds: ['surgery', 'ward', 'rest', 'canteen'], minTurn: 1, minAffinity: 50, priority: 50 },
  { id: 'rule_department_chief_rank_list', eventId: 'npc_department_chief_rank_list', npcId: 'department_chief', stages: ['career', 'pinnacle'], spotIds: ['ward', 'admin', 'surgery', 'canteen'], minTurn: 6, minAffinity: 55, priority: 70 },
  { id: 'rule_pharmacist_med_review', eventId: 'npc_pharmacist_med_review', npcId: 'pharmacist', stages: ['career', 'pinnacle'], spotIds: ['lab', 'ward', 'nurse', 'canteen'], minAffinity: 55, priority: 50 },
  { id: 'rule_patient_liaison_complaint', eventId: 'npc_patient_liaison_complaint', npcId: 'patient_liaison', stages: ['career', 'pinnacle'], spotIds: ['er', 'admin', 'canteen', 'ward'], minTurn: 2, minAffinity: 50, priority: 55 },
  { id: 'rule_community_doctor_referral', eventId: 'npc_community_doctor_referral', npcId: 'community_doctor', stages: ['career', 'pinnacle'], spotIds: ['er', 'canteen', 'ward', 'admin'], minAffinity: 55, priority: 50 },
  { id: 'rule_conference_peer_external_rank', eventId: 'npc_conference_peer_external_rank', npcId: 'conference_peer', stages: ['career', 'pinnacle'], spotIds: ['lab', 'canteen', 'admin', 'rest'], minTurn: 4, minAffinity: 55, priority: 60 },
];

interface ExtraNpcHiddenProfile {
  title: string;
  body: string;
  good: string;
  goodConsequence: string;
  bad: string;
  badConsequence: string;
  category: GameEvent['category'];
  goodDelta: GameEvent['choices'][number]['delta'];
  badDelta: GameEvent['choices'][number]['delta'];
  minTurn?: number;
  minAffinity?: number;
  requireStats?: Partial<Record<keyof Stats, [number, number]>>;
}

const EXTRA_NPC_HIDDEN_PROFILES: Record<string, ExtraNpcHiddenProfile> = {
  classmate_topper: {
    title: '同专业排名表',
    body: '高绩点同学把综测表翻给你看：均分、排名、英语六级、科研经历和面试表达都在暗暗排队。她提醒你，大四下到大五上的窗口很窄，考研、推免和毕业论文会同时挤过来。',
    good: '互换清单，按排名差距补短板',
    goodConsequence: '你第一次把复习、六级、论文和目标专业排名放在一张表里，而不是只盯着总分。',
    bad: '只问她能不能把资料发你',
    badConsequence: '她发了资料，却没有再解释那些真正决定排名的细节。',
    category: 'study', goodDelta: { knowledge: 5, reputation: 2, stamina: -4 }, badDelta: { knowledge: 1, relations: -2 }, minTurn: 8, minAffinity: 52,
  },
  classmate_slacker: {
    title: '食堂里的摆烂联盟',
    body: '摸鱼同学把手机推过来：有人准备二战，有人直接投县医院，有人说先考个编。他说得轻松，但你听出来，失败后的选择并不是退出，而是换一套风险。',
    good: '认真聊Plan B和再考一年的成本',
    goodConsequence: '你们把直接工作、二战和继续升学的代价摊开，连面试时“为什么空了一年”都会被问到。',
    bad: '跟着一起嘲笑努力的人',
    badConsequence: '那一刻很轻松，但你离真正的安排更远了一点。',
    category: 'mental', goodDelta: { sanity: 5, knowledge: 2, relations: 3 }, badDelta: { sanity: 3, reputation: -2, knowledge: -1 }, minTurn: 6, minAffinity: 50,
  },
  anatomy_ta: {
    title: '技能中心的补课',
    body: '解剖助教发现你几个操作动作总是变形。他没有在同学面前拆穿，只约你在技能中心加练，并提醒你临床面试不只问书本，还会看你能不能把操作讲清楚。',
    good: '留下来把动作和口述都练一遍',
    goodConsequence: '你不只是会做，还能解释为什么这么做。之后碰到操作题时，手没有先抖。',
    bad: '说自己回去看视频就行',
    badConsequence: '他没有勉强。你的动作看起来会了，但关键处仍然虚。',
    category: 'clinical', goodDelta: { clinical: 6, knowledge: 2, stamina: -6 }, badDelta: { clinical: 1, relations: -2 }, minTurn: 3, minAffinity: 52,
  },
  library_partner: {
    title: '闭馆铃前的英语题',
    body: '自习搭子把六级真题和专业英语面试题摊在桌上。她说，真正进复试后，英语自我介绍、文献摘要和导师追问会把很多人卡住。',
    good: '一起练英语问答和文献摘要',
    goodConsequence: '你答得磕巴，但知道该把六级成绩、英文摘要和专业动机连成一句完整的话。',
    bad: '只背模板，不互相追问',
    badConsequence: '模板很顺，但一被追问细节就露出空白。',
    category: 'study', goodDelta: { knowledge: 5, relations: 3, stamina: -5 }, badDelta: { knowledge: 2, sanity: -2 }, minTurn: 10, minAffinity: 54,
  },
  student_union_rep: {
    title: '公示名单的另一面',
    body: '学生会干部在公告栏前换公示表。你看见奖项、志愿服务和竞赛经历被一项项量化，也看见有人提前找老师确认材料怎么写。',
    good: '按规则补材料，不让履历空着',
    goodConsequence: '你补齐了能公开摆出来的经历，也知道哪些“打招呼”会让人反感。',
    bad: '让他帮你把名字往前递',
    badConsequence: '他没有拒绝得很难听，但你们的关系从互相帮忙变成了互相提防。',
    category: 'career', goodDelta: { reputation: 4, relations: 2, stamina: -3 }, badDelta: { relations: 1, reputation: -4, sanity: -2 }, minTurn: 5, minAffinity: 50,
  },
  scholarship_peer: {
    title: '奖学金答辩前夜',
    body: '奖学金同学把答辩PPT改到深夜。她提醒你，成绩只是第一轮，答辩时老师还会问科研、服务、专业认同和未来规划。',
    good: '互相模拟答辩问题',
    goodConsequence: '你被问到短板时没有乱编，而是给出下一步计划。',
    bad: '只让她帮你润色漂亮话',
    badConsequence: '话变好听了，但空的地方仍然空。',
    category: 'career', goodDelta: { reputation: 4, knowledge: 3, stamina: -4 }, badDelta: { reputation: -1, sanity: 1 }, minTurn: 6, minAffinity: 52,
  },
  dorm_neighbor: {
    title: '隔壁宿舍的求助声',
    body: '隔壁宿舍同学半夜敲门，说有人情绪崩了，不知道该不该叫辅导员。医学课教你处理病人，却很少教你处理身边人的崩溃。',
    good: '一起联系辅导员和心理中心',
    goodConsequence: '事情没有闹大。你也记住，求助链条比一个人硬扛可靠。',
    bad: '让他们别声张，明早再说',
    badConsequence: '夜里暂时安静了，但你知道自己把风险推迟了。',
    category: 'personal', goodDelta: { sanity: 4, relations: 5, stamina: -4 }, badDelta: { sanity: -5, relations: -2 }, minTurn: 2, minAffinity: 48, requireStats: { sanity: [0, 70] },
  },
  sports_captain: {
    title: '操场上的体测名单',
    body: '院队队长拦住你，说你这学期脸色太差。体测、考试和见习排在一起时，身体先开始抗议。',
    good: '按他给的节奏恢复训练',
    goodConsequence: '你没有突然变强，但夜里不再一躺下就心慌。',
    bad: '逞强加练一整晚',
    badConsequence: '第二天你腿软地进教室，发现透支不是自律。',
    category: 'mental', goodDelta: { stamina: 5, sanity: 4, relations: 2 }, badDelta: { stamina: -8, reputation: 1 }, minTurn: 3, minAffinity: 50,
  },
  intern_peer: {
    title: '同组实习生的交接本',
    body: '同组实习生把交接本递给你。床号、检查、家属问题和带教偏好都写在上面。她说，实习期最怕的不是不会，而是漏。',
    good: '一起补全交接并分工',
    goodConsequence: '你们少挨了一顿骂，也第一次像一个小团队。',
    bad: '只抄自己负责的床号',
    badConsequence: '你的部分没出错，但组里漏掉的事还是会回来找你。',
    category: 'clinical', goodDelta: { clinical: 4, relations: 4, stamina: -4 }, badDelta: { stamina: 1, relations: -3 }, minTurn: 1, minAffinity: 50,
  },
  emergency_resident: {
    title: '急诊留观区的三分钟',
    body: '急诊住院医让你在三分钟内说出胸痛病人的下一步。他不是故意为难你，急诊不会等你把书翻完。',
    good: '按危重优先级说清处理',
    goodConsequence: '他说你还嫩，但至少顺序没错。',
    bad: '先背鉴别诊断，绕开处置',
    badConsequence: '他打断你：“先保命，再漂亮。”',
    category: 'clinical', goodDelta: { clinical: 6, knowledge: 2, sanity: -2 }, badDelta: { clinical: 1, reputation: -2, sanity: -3 }, minTurn: 1, minAffinity: 52,
  },
  scrub_nurse: {
    title: '手术台旁的眼神',
    body: '洗手护士在你伸手前轻轻摇头：无菌区、器械顺序和台上节奏都不能靠“差不多”。她愿意提醒你一次，但不会无限兜底。',
    good: '停下来按规矩重新核对',
    goodConsequence: '手术没有被你打乱。她之后会提前告诉你该站哪里。',
    bad: '觉得自己被当众管教',
    badConsequence: '她没再说话，台上的空气冷了下来。',
    category: 'clinical', goodDelta: { clinical: 5, relations: 3, stamina: -3 }, badDelta: { relations: -5, reputation: -2 }, minTurn: 1, minAffinity: 50,
  },
  anesthetist: {
    title: '麻醉记录上的警报',
    body: '麻醉医生指着监护记录问你：血压掉下去之前，哪些信号已经出现？你突然意识到，手术不是只有刀口。',
    good: '留下来复盘围术期风险',
    goodConsequence: '你看懂了麻醉记录，也更懂“全身情况”四个字。',
    bad: '说自己主要学外科操作',
    badConsequence: '他笑了笑，没有继续讲。你错过了一次把病人看完整的机会。',
    category: 'clinical', goodDelta: { clinical: 5, knowledge: 3, stamina: -4 }, badDelta: { clinical: -1, relations: -2 }, minTurn: 1, minAffinity: 52,
  },
  ward_secretary: {
    title: '病区秘书的材料袋',
    body: '病区秘书把一叠出院材料推给你：章、签字、检查单、医保编码，少一样都会让患者在窗口来回跑。她说，医生的错误不总在病历里。',
    good: '按清单把流程走完',
    goodConsequence: '患者少跑了两趟，秘书也愿意下次提前提醒你。',
    bad: '让患者自己去窗口问',
    badConsequence: '半小时后电话打回来，问题还是回到你这里。',
    category: 'system', goodDelta: { relations: 4, reputation: 2, stamina: -4 }, badDelta: { relations: -4, reputation: -2, stamina: 1 }, minTurn: 1, minAffinity: 48,
  },
  patient_family_rep: {
    title: '走廊尽头的家属',
    body: '患者家属代表拦住你，问题很尖锐：为什么还没好，为什么还要检查，为什么没人早点说清楚。你知道答不好，后面就不是医学问题了。',
    good: '用病程和风险重新解释一遍',
    goodConsequence: '他仍然焦虑，但愿意先等下一次结果。',
    bad: '只说“去问上级医生”',
    badConsequence: '你暂时脱身，却把不信任留在走廊里发酵。',
    category: 'social', goodDelta: { relations: 5, clinical: 2, sanity: -2 }, badDelta: { relations: -6, reputation: -2 }, minTurn: 1, minAffinity: 50,
  },
  co_resident: {
    title: '同届规培的出科排名',
    body: '同届规培把出科评价表给你看：病例数、操作数、夜班表现、老师印象都在排。大家嘴上说一起熬，最后仍要被同一张表比较。',
    good: '互相核对病例和操作缺口',
    goodConsequence: '你发现自己少了几项硬指标，趁还没出科先补上。',
    bad: '只打听谁和老师关系好',
    badConsequence: '你听到了一些名字，却没补上自己的短板。',
    category: 'career', goodDelta: { clinical: 4, relations: 3, stamina: -3 }, badDelta: { relations: 1, reputation: -3 }, minTurn: 2, minAffinity: 50,
  },
  rotation_secretary: {
    title: '轮转秘书的系统截图',
    body: '轮转秘书发现你的病例登记漏了两项。系统不会因为你值夜班就自动原谅，结业审核也不会听解释太久。',
    good: '当场补齐并问清审核口径',
    goodConsequence: '她帮你指出了几个常见退回点，你少走了一轮流程。',
    bad: '拜托她先帮你点通过',
    badConsequence: '她表情淡下来：“系统留痕，别害人。”',
    category: 'system', goodDelta: { reputation: 3, knowledge: 2, stamina: -4 }, badDelta: { reputation: -4, relations: -3 }, minTurn: 2, minAffinity: 50,
  },
  chief_resident: {
    title: '总住院医的抢救复盘',
    body: '总住院医把你叫到值班室复盘。抢救时你没有犯大错，但有几次犹豫被他看见了。',
    good: '承认卡点，按流程重走一遍',
    goodConsequence: '他没有安慰你，只把下一次该先做什么讲得很清楚。',
    bad: '强调自己只是听上级指挥',
    badConsequence: '他点点头，却在评价里写下“主动性不足”。',
    category: 'clinical', goodDelta: { clinical: 6, reputation: 2, sanity: -3 }, badDelta: { reputation: -3, sanity: -3 }, minTurn: 2, minAffinity: 52,
  },
  exam_partner: {
    title: '出科考前的互问',
    body: '出科搭子拿着题库来找你。她说，考场不只考知识，还考你能不能在疲惫时把病史、体查和处理顺序说完整。',
    good: '轮流当考官追问细节',
    goodConsequence: '你被问得满头汗，但知道了自己真正不会的地方。',
    bad: '只背高频答案',
    badConsequence: '高频题背熟了，稍微换个问法就开始飘。',
    category: 'study', goodDelta: { knowledge: 4, clinical: 3, stamina: -4 }, badDelta: { knowledge: 2, sanity: -2 }, minTurn: 3, minAffinity: 50,
  },
  ultrasound_doctor: {
    title: '超声室的床旁判断',
    body: '超声医生让你看一眼床旁图像：报告会晚一点出，但病人的处理不能只等报告。她问你，临床问题到底是什么。',
    good: '说清楚要排除的风险',
    goodConsequence: '她把关键切面讲给你看。你知道下次申请检查不能只写“请协助”。',
    bad: '只催她快点出报告',
    badConsequence: '报告出了，但她没有再多解释那几个临床细节。',
    category: 'clinical', goodDelta: { clinical: 5, knowledge: 2, relations: 2 }, badDelta: { relations: -4, clinical: -1 }, minTurn: 2, minAffinity: 52,
  },
  blood_bank_doctor: {
    title: '输血申请被退回',
    body: '输血科医生退回你的申请：指征、知情同意、备血量和替代方案都需要写清。抢救时流程慢半拍会要命，平时乱写也会要命。',
    good: '补齐指征并复盘输血风险',
    goodConsequence: '你学会了什么时候该快，什么时候必须完整。',
    bad: '抱怨流程耽误临床',
    badConsequence: '他没有争辩，只让你把制度再读一遍。',
    category: 'clinical', goodDelta: { clinical: 4, knowledge: 3, stamina: -3 }, badDelta: { reputation: -2, relations: -3 }, minTurn: 2, minAffinity: 50,
  },
  night_shift_peer: {
    title: '夜班搭子的咖啡',
    body: '夜班搭子把咖啡递给你，说她刚才也差点漏掉一个复查。凌晨三点，人会变钝，制度也会变薄。',
    good: '互相设提醒，重新查一遍待办',
    goodConsequence: '你们补上了一个关键复查。天亮时，两个人都还站着。',
    bad: '喝完咖啡继续硬扛',
    badConsequence: '你撑过去了，但交班时脑子像被掏空。',
    category: 'mental', goodDelta: { sanity: 5, relations: 4, stamina: -2 }, badDelta: { stamina: -5, sanity: -3 }, minTurn: 2, minAffinity: 50, requireStats: { stamina: [0, 70] },
  },
  outpatient_teacher: {
    title: '门诊三句话',
    body: '门诊带教让你用三句话向患者解释诊断、风险和复诊。你突然发现，真正难的是把复杂问题说成人听得懂的话。',
    good: '按患者能理解的方式重说',
    goodConsequence: '患者点头了，老师也点头了。你知道沟通不是医学之外的附加题。',
    bad: '把指南原文背给患者听',
    badConsequence: '话都对，但患者更迷糊了。',
    category: 'social', goodDelta: { clinical: 4, relations: 4, reputation: 2 }, badDelta: { relations: -4, clinical: 1 }, minTurn: 2, minAffinity: 52,
  },
  lab_senior: {
    title: '实验室师兄的原始记录',
    body: '实验室师兄把原始记录本递给你：每个失败实验都要写，不能只留下好看的图。开题、投稿和答辩时，追问往往从这里开始。',
    good: '按原始记录重整实验链',
    goodConsequence: '进度慢了，但数据终于能经得起追问。',
    bad: '只整理能放进文章的结果',
    badConsequence: '图看起来顺了，心里却多了一块不敢碰的地方。',
    category: 'study', goodDelta: { research: 6, knowledge: 3, stamina: -6 }, badDelta: { research: 2, sanity: -4, reputation: -1 }, minTurn: 2, minAffinity: 52,
  },
  lab_junior: {
    title: '师妹的失败实验',
    body: '实验室师妹拿着一组失败数据来问你。你可以花时间带她排错，也可以把自己的论文进度放在前面。',
    good: '带她从试剂和设计逐项排查',
    goodConsequence: '她的问题解决了一半，你也发现自己方案里同样的漏洞。',
    bad: '让她自己先查文献',
    badConsequence: '她说谢谢，之后再也没拿真正的问题来找你。',
    category: 'social', goodDelta: { research: 4, relations: 4, stamina: -5 }, badDelta: { stamina: 1, relations: -4 }, minTurn: 2, minAffinity: 50,
  },
  statistician: {
    title: '统计老师的红笔',
    body: '统计老师把你的表格圈得满是红线：样本量、缺失值、重复比较和结局指标都不能靠“差不多显著”糊过去。',
    good: '按统计建议重做分析计划',
    goodConsequence: '结果没那么漂亮，但方法站得住。',
    bad: '只问怎么把P值做出来',
    badConsequence: '她把笔放下：“这个问题本身就危险。”',
    category: 'study', goodDelta: { research: 5, knowledge: 4, stamina: -5 }, badDelta: { research: -2, reputation: -3, sanity: -2 }, minTurn: 2, minAffinity: 54,
  },
  ethics_secretary: {
    title: '伦理秘书的退回意见',
    body: '伦理秘书退回你的申请：知情同意、隐私保护、入排标准和数据使用边界都写得太虚。她说，伦理不是最后盖章，是研究开始前的底线。',
    good: '按退回意见逐条补齐',
    goodConsequence: '申请晚了一周，但后面的研究不再摇摇晃晃。',
    bad: '找熟人问能不能先过',
    badConsequence: '她没有把话说死，但你的名字被她记住了。',
    category: 'system', goodDelta: { research: 4, reputation: 3, stamina: -5 }, badDelta: { reputation: -4, relations: -2 }, minTurn: 1, minAffinity: 50,
  },
  animal_room_keeper: {
    title: '动物房门口的登记本',
    body: '动物房老师指着登记本：笼位、给药、死亡记录和安乐死标准都要写清。实验动物不会在答辩会上替你说话，记录必须替它们说。',
    good: '按规范补登记并复盘流程',
    goodConsequence: '你对实验的敬畏从论文标题落回到每一天的记录。',
    bad: '觉得这些只是杂活',
    badConsequence: '他没有继续教你，只让你把规定贴在门口读完。',
    category: 'study', goodDelta: { research: 4, knowledge: 3, stamina: -4 }, badDelta: { research: -1, reputation: -2 }, minTurn: 2, minAffinity: 50,
  },
  platform_engineer: {
    title: '平台工程师的质控图',
    body: '平台工程师把质控图发给你：测序深度、批次效应、样本污染都可能让漂亮故事变成假故事。',
    good: '按质控结果调整分析',
    goodConsequence: '你删掉了一部分数据，也保住了后面整篇文章的可信度。',
    bad: '要求先按原计划出图',
    badConsequence: '图出了，但他在邮件里保留了质控意见。',
    category: 'study', goodDelta: { research: 5, knowledge: 3, stamina: -4 }, badDelta: { research: 1, reputation: -3 }, minTurn: 2, minAffinity: 52,
  },
  journal_editor_peer: {
    title: '编辑部同学的退修意见',
    body: '编辑部同学把一封匿名审稿意见给你看：创新性、统计、伦理和临床意义都被问到了。她提醒你，回复审稿人不是辩解，是把证据补齐。',
    good: '逐条拆回复和补实验计划',
    goodConsequence: '你知道哪些问题能答，哪些必须承认局限。',
    bad: '只想写强硬回复',
    badConsequence: '气势有了，证据却没有变多。',
    category: 'career', goodDelta: { research: 5, knowledge: 2, relations: 2, stamina: -4 }, badDelta: { reputation: -2, sanity: -2 }, minTurn: 3, minAffinity: 52,
  },
  grant_officer: {
    title: '科研处的形式审查',
    body: '科研处老师把你的申请书退回来：预算、合作单位、伦理批件和前期基础都有缺口。项目还没到专家手里，已经先被格式筛了一轮。',
    good: '按审查清单重排材料',
    goodConsequence: '申请书不一定中，但至少不会死在第一道门。',
    bad: '抱怨行政流程不懂科研',
    badConsequence: '他没有反驳，只把下一批截止日期圈给你看。',
    category: 'career', goodDelta: { research: 4, reputation: 3, stamina: -5 }, badDelta: { relations: -3, reputation: -2 }, minTurn: 3, minAffinity: 50,
  },
  icu_consultant: {
    title: 'ICU会诊的床旁决断',
    body: 'ICU会诊医生到床旁后只问三个问题：可逆因素、升级治疗边界、家属是否理解。危重病人的窗口不会等完整病历写完。',
    good: '按她的问题重整治疗目标',
    goodConsequence: '方案更清楚，家属沟通也少了很多含糊。',
    bad: '只强调本科室已经尽力',
    badConsequence: '她没有责备你，但会诊意见写得很硬。',
    category: 'clinical', goodDelta: { clinical: 5, reputation: 3, stamina: -4 }, badDelta: { reputation: -3, sanity: -2 }, minTurn: 2, minAffinity: 52,
  },
  infectious_consultant: {
    title: '感染科的抗菌药追问',
    body: '感染科医生追问你：培养送了吗，降阶梯计划呢，院感风险有没有报？抗菌药不是越猛越安全。',
    good: '按证据调整抗菌方案',
    goodConsequence: '病程多写了十分钟，但用药终于能说清楚。',
    bad: '先把广谱药顶上去再说',
    badConsequence: '指标可能会降，但他在会诊单上留下了明确提醒。',
    category: 'clinical', goodDelta: { clinical: 4, knowledge: 3, reputation: 2 }, badDelta: { clinical: 1, reputation: -3 }, minTurn: 2, minAffinity: 52,
  },
  cardiology_consultant: {
    title: '心内会诊的风险分层',
    body: '心内会诊医生看完心电图，提醒你不能只盯一个异常值。风险分层、用药禁忌和转运时机都要一起考虑。',
    good: '一起重算风险并调整监测',
    goodConsequence: '你把一个“差不多稳定”的病人重新放回了高风险列表。',
    bad: '等明天主任查房再定',
    badConsequence: '她皱了皱眉：“明天之前也会出事。”',
    category: 'clinical', goodDelta: { clinical: 5, knowledge: 2, stamina: -3 }, badDelta: { clinical: -1, sanity: -3 }, minTurn: 2, minAffinity: 52,
  },
  neuro_consultant: {
    title: '神内会诊的时间窗',
    body: '神内会诊医生问你发病时间到底几点。你发现病史里一个含糊的“上午”会直接改变治疗窗口。',
    good: '重新追问家属并修正病史',
    goodConsequence: '时间窗被重新确认，治疗选择也变得清楚。',
    bad: '按最保守说法记录',
    badConsequence: '你避开了争议，也可能关上了一个机会。',
    category: 'clinical', goodDelta: { clinical: 5, relations: 2, stamina: -3 }, badDelta: { sanity: -2, clinical: -1 }, minTurn: 2, minAffinity: 52,
  },
  oncology_doctor: {
    title: '肿瘤科的坏消息沟通',
    body: '肿瘤科医生提醒你，坏消息不能丢给一句“结果不好”。分期、目标、获益和代价都要用患者听得懂的方式说。',
    good: '一起准备分层沟通方案',
    goodConsequence: '谈话很难，但患者和家属至少知道下一步为什么这么走。',
    bad: '把问题留给专科门诊解释',
    badConsequence: '转诊完成了，信任却在等待中流失。',
    category: 'social', goodDelta: { relations: 5, clinical: 3, sanity: -3 }, badDelta: { relations: -4, reputation: -2 }, minTurn: 2, minAffinity: 52,
  },
  pathologist: {
    title: '病理科的追加切片',
    body: '病理科医生说诊断还差一个关键切片。你急着推进治疗，但她提醒你，快不能替代准。',
    good: '等追加结果并同步解释',
    goodConsequence: '治疗晚了一点，却避免了方向性的错误。',
    bad: '按初步印象先推进',
    badConsequence: '流程快了，但病理科之后不会再主动多说那一句。',
    category: 'clinical', goodDelta: { clinical: 4, knowledge: 3, stamina: -3 }, badDelta: { clinical: 1, relations: -3 }, minTurn: 2, minAffinity: 52,
  },
  medical_insurance_officer: {
    title: '医保办的拒付预警',
    body: '医保办老师把几条拒付规则圈给你：适应证、耗材、路径外用药和病案首页都会影响科室结余。她不是让你少治，是让你把理由写清。',
    good: '补齐适应证和沟通记录',
    goodConsequence: '你没有改变治疗目标，只是让每一步都有证据。',
    bad: '先用再说，后面补理由',
    badConsequence: '病人眼前的问题解决了，科室后面的账却埋了雷。',
    category: 'financial', goodDelta: { reputation: 3, knowledge: 3, stamina: -4 }, badDelta: { reputation: -3, sanity: -2 }, minTurn: 2, minAffinity: 50,
  },
  information_engineer: {
    title: '信息科的病历权限',
    body: '信息科工程师提醒你，一个账号异常登录过病历系统。隐私泄露不会因为“大家都这么用”就变小。',
    good: '立刻改密码并报备异常',
    goodConsequence: '流程麻烦，但风险被截住了。',
    bad: '继续借用公共账号省事',
    badConsequence: '你省了几分钟，也让未来的责任边界变得模糊。',
    category: 'system', goodDelta: { reputation: 3, knowledge: 2, stamina: -2 }, badDelta: { reputation: -4, sanity: -2 }, minTurn: 2, minAffinity: 50,
  },
  social_worker: {
    title: '医务社工的家庭地图',
    body: '医务社工把患者家庭情况画成一张图：谁照护、谁付钱、谁能做决定。治疗方案如果没有落到这个家庭里，就很难真正执行。',
    good: '把出院计划接到家庭支持上',
    goodConsequence: '病人出院后不再只是“自行复诊”四个字。',
    bad: '只写医学建议，不管执行',
    badConsequence: '病历完成了，但患者回家的路仍然断着。',
    category: 'social', goodDelta: { relations: 5, reputation: 2, stamina: -3 }, badDelta: { relations: -4, clinical: -1 }, minTurn: 2, minAffinity: 50,
  },
  security_guard: {
    title: '安保队长的预警',
    body: '安保队长在急诊门口叫住你：一个家属情绪不对，已经开始拍视频。先沟通、先留痕、先叫人，往往比事后解释更有用。',
    good: '提前通知上级并留沟通记录',
    goodConsequence: '冲突没有消失，但没有升级成失控场面。',
    bad: '觉得叫安保会显得心虚',
    badConsequence: '你独自走过去，声音很快被围观盖住。',
    category: 'system', goodDelta: { sanity: 3, reputation: 2, relations: 2 }, badDelta: { sanity: -5, reputation: -2 }, minTurn: 2, minAffinity: 50,
  },
  hospital_accountant: {
    title: '财务科的报销单',
    body: '财务科老师把你的会议报销退回来：发票、审批、课题号和实际参会证明对不上。科研和临床之外，还有一套会卡住人的规则。',
    good: '按流程补齐并重新规划经费',
    goodConsequence: '钱到账慢了，但你的课题账没有留下窟窿。',
    bad: '找熟人先签字',
    badConsequence: '她没有当场翻脸，却把单子压回了你手里。',
    category: 'financial', goodDelta: { knowledge: 2, reputation: 2, money: 500, stamina: -3 }, badDelta: { reputation: -3, relations: -2 }, minTurn: 2, minAffinity: 50,
  },
  device_engineer: {
    title: '设备科的停机记录',
    body: '设备科工程师告诉你，一台关键设备今晚要停机维护。你可以提前调整检查顺序，也可以等系统报错后再解释。',
    good: '提前调整患者检查和告知',
    goodConsequence: '没人因此空跑，设备科也愿意以后提前给你消息。',
    bad: '先照常开单，出了问题再改',
    badConsequence: '系统不会替你解释，窗口的抱怨最后还是回到病区。',
    category: 'system', goodDelta: { relations: 4, reputation: 2, stamina: -2 }, badDelta: { relations: -4, reputation: -2 }, minTurn: 2, minAffinity: 50,
  },
  union_representative: {
    title: '工会老师的调解表',
    body: '工会老师问你最近是不是连续加班太多。她手里有调解表、补休建议和困难帮扶，但前提是你愿意把问题说成规则问题，而不是个人忍耐。',
    good: '把加班和补休写清楚',
    goodConsequence: '你没有马上轻松，但至少把边界从抱怨变成了记录。',
    bad: '说大家都这样，算了',
    badConsequence: '她叹了口气，表格仍然空着。',
    category: 'personal', goodDelta: { sanity: 5, relations: 3, stamina: 2 }, badDelta: { sanity: -3, stamina: -2 }, minTurn: 2, minAffinity: 50, requireStats: { stamina: [0, 75] },
  },
  teaching_secretary: {
    title: '教学秘书的带教反馈',
    body: '教学秘书把学生反馈发给你：他们不是不尊重你，只是不知道你为什么总是临时取消小讲课。临床忙和教学责任撞在了一起。',
    good: '重排固定教学时间',
    goodConsequence: '你牺牲了一点休息，但学生终于知道什么时候能找到你。',
    bad: '让学生先自己看书',
    badConsequence: '反馈表安静了，学生也不再主动问你。',
    category: 'career', goodDelta: { reputation: 4, relations: 3, stamina: -4 }, badDelta: { reputation: -3, relations: -3 }, minTurn: 2, minAffinity: 50,
  },
  graduate_student: {
    title: '研究生的选题焦虑',
    body: '研究生拿着开题报告来找你。他担心毕业、规培、找工作和论文撞车，而你太熟悉这种被时间夹住的感觉。',
    good: '帮他拆开半年时间线',
    goodConsequence: '你没有替他承诺结果，只让他看见每个节点的真实顺序。',
    bad: '只让他多努力一点',
    badConsequence: '这句话正确得没有用。他拿着报告离开，背影很沉。',
    category: 'social', goodDelta: { relations: 5, reputation: 3, stamina: -4 }, badDelta: { relations: -4, reputation: -1 }, minTurn: 2, minAffinity: 50,
  },
  visiting_scholar: {
    title: '进修医生的手术名额',
    body: '进修医生问你能不能旁听下一台关键手术。名额有限，本院年轻医生也在等机会。你知道一句话就会改变别人这半年的收获。',
    good: '按学习目标和规则安排旁听',
    goodConsequence: '有人没排上，但理由摆在明面上，怨气少了很多。',
    bad: '看关系临时加一个位置',
    badConsequence: '表面上大家都没说什么，暗里的账却开始记了。',
    category: 'career', goodDelta: { reputation: 4, relations: 3, stamina: -2 }, badDelta: { relations: 2, reputation: -4 }, minTurn: 2, minAffinity: 50,
  },
};

const coveredNpcIds = new Set(NPC_HIDDEN_RULES.map(rule => rule.npcId));

function uniqueScheduleSpots(def: NpcDef): string[] | undefined {
  const spots = [...new Set(def.schedule ?? [])];
  return spots.length > 0 ? spots : undefined;
}

function fallbackProfile(def: NpcDef): ExtraNpcHiddenProfile {
  const role = def.role;
  const isStudent = def.stages.some(stage => stage === 'undergrad' || stage === 'master' || stage === 'phd');
  const isClinical = def.stages.some(stage => stage === 'internship' || stage === 'guipei' || stage === 'career' || stage === 'pinnacle');
  return {
    title: `${role}的提醒`,
    body: `[[npc:${def.id}]]把你叫到一边，提醒你这条路上真正卡人的往往不是单次事件，而是提前半年开始堆叠的清单、评价、关系和时间冲突。`,
    good: '把提醒整理成可执行清单',
    goodConsequence: `[[npc:${def.id}]]愿意继续把关键节点告诉你。你少了一点盲区，也多了一份需要兑现的信任。`,
    bad: '先记着，回头再说',
    badConsequence: '你当时觉得还有时间，后来才发现很多窗口关闭得很安静。',
    category: isStudent ? 'study' : isClinical ? 'clinical' : 'career',
    goodDelta: { knowledge: 3, relations: 3, stamina: -2 },
    badDelta: { sanity: -2, relations: -2 },
    minTurn: 2,
    minAffinity: 50,
  };
}

for (const def of NPCS) {
  if (coveredNpcIds.has(def.id)) continue;
  const profile = EXTRA_NPC_HIDDEN_PROFILES[def.id] ?? fallbackProfile(def);
  const eventId = `npc_${def.id}_special`;
  NPC_HIDDEN_EVENTS.push({
    id: eventId,
    stage: def.stages.length === 1 ? def.stages[0] : [...def.stages],
    title: profile.title,
    body: profile.body,
    category: profile.category,
    weight: 0,
    once: true,
    manualOnly: true,
    choices: [
      {
        text: profile.good,
        delta: profile.goodDelta,
        effect: { kind: 'changeAffinity', npcId: def.id, amount: 8 },
        consequence: profile.goodConsequence,
      },
      {
        text: profile.bad,
        delta: profile.badDelta,
        effect: { kind: 'changeAffinity', npcId: def.id, amount: -7 },
        consequence: profile.badConsequence,
      },
    ],
  });
  NPC_HIDDEN_RULES.push({
    id: `rule_${def.id}_special`,
    eventId,
    npcId: def.id,
    stages: [...def.stages],
    spotIds: uniqueScheduleSpots(def),
    minTurn: profile.minTurn ?? 2,
    minAffinity: profile.minAffinity ?? 50,
    requireStats: profile.requireStats,
    priority: 40,
  });
}
