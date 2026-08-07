import type { GameEvent } from './events';

// 模块5-12的核心人生事件。这里复用统一事件引擎、数值和flag，不创建平行流程。
export const LIFE_SYSTEM_EVENTS: GameEvent[] = [
  // 模块5：导师 / 贵人 / 派系
  { id: 'mf_choose_mentor', stage: ['master', 'phd'], title: '选导师', body: '名单上，一边是资源雄厚但竞争激烈的大团队，一边是愿意亲自带人的年轻导师。', category: 'career', weight: 100, minTurn: 0, maxTurn: 3, once: true, choices: [
    { text: '进入大团队', delta: { research: 5, stamina: -5 }, effect: [{ kind: 'setFaction', name: '学院学术派', factionType: 'academic' }, { kind: 'changeMentorFaction', mentorBond: 5, factionLoyalty: 20 }], consequence: '你拿到了资源，也进入了更拥挤的赛道。' },
    { text: '选择年轻导师', delta: { research: 3, relations: 5 }, effect: [{ kind: 'setFaction', name: '青年课题组', factionType: 'academic' }, { kind: 'changeMentorFaction', mentorBond: 20, factionLoyalty: 8 }], consequence: '资源有限，但每次讨论都有人认真听。' },
    { text: '暂不站队', delta: { sanity: 3 }, effect: { kind: 'changeMentorFaction', factionLoyalty: -5 }, consequence: '你保留独立，也失去了部分优先权。' },
  ] },
  { id: 'mf_recommendation', stage: ['master', 'phd', 'jobhunt'], title: '导师的推荐信', body: '一个关键岗位需要推荐。导师愿不愿意落笔，取决于这些年累积的信任。', category: 'career', weight: 65, minTurn: 3, once: true, choices: [
    { text: '带着完整成果去沟通', delta: { reputation: 5 }, flagSet: 'got_recommend', effect: { kind: 'changeMentorFaction', mentorBond: 8, reputation: 5 }, consequence: '推荐信写得具体而有分量。' },
    { text: '请同门代为开口', delta: { relations: 3 }, effect: { kind: 'changeMentorFaction', mentorBond: 2, factionLoyalty: 5 }, consequence: '这也是圈内互助的一部分。' },
    { text: '只凭自己申请', delta: { sanity: 2 }, effect: { kind: 'changeMentorFaction', factionLoyalty: -5 }, consequence: '路更窄，但选择属于你。' },
  ] },
  { id: 'mf_director_succession', stage: 'career', title: '老主任退下来了', body: '新主任上任后重新分配手术、课题和进修名额。每个人都在观察你站在哪里。', category: 'career', weight: 80, minTurn: 5, once: true, choices: [
    { text: '明确支持新主任', delta: { reputation: 4, relations: -3 }, effect: [{ kind: 'setFaction', name: '主任团队', factionType: 'clinical' }, { kind: 'changeMentorFaction', factionLoyalty: 20, rivalry: 12 }], consequence: '资源开始向你倾斜，对立面也记住了你。' },
    { text: '保持专业中立', delta: { clinical: 3 }, effect: { kind: 'changeMentorFaction', factionLoyalty: -5, rivalry: -3 }, consequence: '你不被信任为核心，也较少承担连坐。' },
  ] },
  { id: 'mf_core_invitation', stage: ['career', 'pinnacle'], title: '核心圈的邀请', body: '一次闭门会议只邀请“自己人”。主任问你是否愿意承担更多事务。', category: 'career', weight: 55, minTurn: 7, once: true, choices: [
    { text: '接下责任', delta: { stamina: -8, reputation: 8 }, effect: { kind: 'changeMentorFaction', mentorBond: 10, factionLoyalty: 18, rivalry: 8 }, consequence: '你走近了决策桌，也暴露在更多风险里。' },
    { text: '只承担专业工作', delta: { clinical: 4, sanity: 2 }, effect: { kind: 'changeMentorFaction', factionLoyalty: -8 }, consequence: '你守住边界，晋升速度却可能慢下来。' },
  ] },
  { id: 'mf_faction_split', stage: 'career', title: '科室分成了两组', body: '主任与副主任公开分歧，排班、病例和论文都开始按阵营切分。', category: 'social', weight: 60, minTurn: 8, once: true, choices: [
    { text: '跟随现有导师', delta: { relations: 4 }, effect: { kind: 'changeMentorFaction', factionLoyalty: 15, rivalry: 15 }, consequence: '立场清楚，收益和风险都更集中。' },
    { text: '推动病例协作规则', delta: { stamina: -4, reputation: 3 }, effect: { kind: 'changeMentorFaction', factionLoyalty: -5, rivalry: -8 }, consequence: '你没消除派系，但减少了患者承担的代价。' },
  ] },
  { id: 'mf_betrayal', stage: ['career', 'pinnacle'], title: '背叛', body: '你支持多年的上级在关键评审中没有投你。那句“再等等”听起来比拒绝更冷。', category: 'mental', weight: 100, once: true, requireFlag: 'social_obstruction_due', choices: [
    { text: '当面问清楚', delta: { sanity: -5 }, effect: [{ kind: 'changeMentorFaction', mentorBond: -25, rivalry: 10 }, { kind: 'changeSpirit', meaning: -8, event: '贵人背叛' }], consequence: '答案不体面，但你不再靠猜。' },
    { text: '建立自己的团队', delta: { stamina: -8, reputation: 5 }, effect: [{ kind: 'changeMentorFaction', factionLoyalty: -15, reputation: 8 }, { kind: 'changeSpirit', purposePurity: 5, meaning: 5 }], consequence: '你开始从门徒变成带路的人。' },
  ] },
  { id: 'mf_return_favor', stage: 'pinnacle', title: '该还的人情', body: '曾帮助你的前辈请你为一位年轻人争取机会。对方条件尚可，却不是最优秀的。', category: 'career', weight: 65, minTurn: 3, once: true, choices: [
    { text: '给机会，但公开标准', delta: { relations: 5, reputation: 2 }, effect: { kind: 'changeMentorFaction', factionLoyalty: 8, rivalry: 3 }, consequence: '人情被放进了可解释的边界。' },
    { text: '直接安排', delta: { relations: 8, reputation: -5 }, effect: [{ kind: 'changeMentorFaction', factionLoyalty: 12, rivalry: 8 }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: 5 }], consequence: '旧账还了，新账开始累积。' },
    { text: '拒绝', delta: { reputation: 3, relations: -8 }, effect: { kind: 'changeMentorFaction', mentorBond: -10, factionLoyalty: -8 }, consequence: '规则更干净，关系更冷。' },
  ] },
  { id: 'mf_twilight', stage: 'retirement', title: '派系的黄昏', body: '导师、同门、学生逐渐散去。你曾投入半生的圈子，如今只剩几条仍有人走的路。', category: 'mental', weight: 100, minTurn: 4, once: true, choices: [
    { text: '把资源交给学生', delta: { sanity: 8, reputation: 5 }, effect: [{ kind: 'changeMentorFaction', factionLoyalty: 10 }, { kind: 'completeBucket', item: 'tree', legacy: 15 }], consequence: '传承不等于复制，而是让后来者能继续生长。' },
    { text: '接受人走茶凉', delta: { sanity: 4 }, effect: { kind: 'changeSpirit', meaning: 5 }, consequence: '江湖还在，只是不再需要你站在中心。' },
  ] },

  // 模块6：科研 / 学术
  { id: 'rs_innovation_training', stage: 'undergrad', title: '大学生创新训练项目', body: '实验室开放了本科生项目。它会占掉周末，也可能成为科研的第一张门票。', category: 'study', weight: 70, minTurn: 3, maxTurn: 7, once: true, choices: [
    { text: '报名参加', delta: { stamina: -5, research: 5 }, effect: { kind: 'changeResearch', field: 'researchAbility', amount: 10 }, consequence: '你第一次学会把问题拆成假设和方法。' },
    { text: '专注课程', delta: { knowledge: 6 }, effect: { kind: 'changeResearch', field: 'researchAbility', amount: -3 }, consequence: '基础更扎实，科研入场稍晚。' },
  ] },
  { id: 'rs_mentor_project', stage: ['master', 'phd'], title: '导师的课题', body: '导师把一部分实验交给你：“做好了，论文有你名字。”', category: 'study', weight: 100, minTurn: 1, once: true, choices: [
    { text: '全力投入', delta: { stamina: -10, research: 8 }, effect: [{ kind: 'startResearchProject', title: '导师课题子研究', paperType: 'basic', progress: 15 }, { kind: 'changeResearch', field: 'researchAbility', amount: 12 }, { kind: 'changeMentorFaction', mentorBond: 12 }], consequence: '实验台和病房开始争夺同一段时间。' },
    { text: '适度参与', delta: { stamina: -4, research: 4 }, effect: [{ kind: 'startResearchProject', title: '导师课题子研究', paperType: 'clinical', progress: 8 }, { kind: 'changeMentorFaction', mentorBond: 5 }], consequence: '进度慢一些，但生活没有完全失控。' },
  ] },
  { id: 'rs_first_paper', stage: ['master', 'phd'], title: '第一次写论文', body: '空白文档上，标题和摘要来回改了十几遍。', category: 'study', weight: 75, minTurn: 3, once: true, choices: [
    { text: '每天推进一点', delta: { stamina: -5, research: 4 }, effect: { kind: 'changeResearch', field: 'paperProgress', amount: 25 }, consequence: '缓慢但可持续的进度出现了。' },
    { text: '连续通宵突击', delta: { stamina: -15, sanity: -6, research: 7 }, effect: [{ kind: 'changeResearch', field: 'paperProgress', amount: 45 }, { kind: 'changeHealth', field: 'strain', amount: 6 }], consequence: '文档完成得快，身体把账记下了。' },
  ] },
  { id: 'rs_authorship_fight', stage: ['master', 'phd', 'career'], title: '一作之争', body: '你完成了主要工作，但导师想把第一作者给更急需职称的同门。', category: 'career', weight: 65, minTurn: 4, once: true, choices: [
    { text: '据理争取一作', delta: { reputation: 6, relations: -8 }, effect: [{ kind: 'publishResearchPaper', title: '第一篇完整研究', journal: '临床医学期刊', impactFactor: 5, authorship: 'first', paperType: 'clinical' }, { kind: 'changeResearch', field: 'academicReputation', amount: 8 }, { kind: 'changeMentorFaction', mentorBond: -12, rivalry: 10 }], consequence: '贡献得到看见，关系出现裂缝。' },
    { text: '接受共同一作', delta: { reputation: 3, relations: 2 }, effect: [{ kind: 'publishResearchPaper', title: '第一篇完整研究', journal: '临床医学期刊', impactFactor: 5, authorship: 'co_first', paperType: 'clinical' }, { kind: 'changeResearch', field: 'academicReputation', amount: 5 }], consequence: '价值被分享，冲突没有扩大。' },
    { text: '让出署名', delta: { relations: 8, reputation: -3 }, effect: [{ kind: 'publishResearchPaper', title: '第一篇完整研究', journal: '临床医学期刊', impactFactor: 5, authorship: 'co_author', paperType: 'clinical' }, { kind: 'changeMentorFaction', mentorBond: 10 }], consequence: '人情留下了，成果价值打了折扣。' },
  ] },
  { id: 'rs_nsfc_season', stage: 'career', title: '国自然申报季', body: '申报系统的光标停在项目名称一栏。准备数月，最终仍要面对很低的资助率。', category: 'career', weight: 100, minTurn: 6, once: true, choices: [
    { text: '申报青年基金', delta: { stamina: -10, sanity: -5 }, effect: { kind: 'applyResearchGrant', grantType: 'nsfc_youth' }, consequence: '结果由准备、支持和运气共同决定。' },
    { text: '申报面上项目', delta: { stamina: -14, sanity: -6 }, effect: { kind: 'applyResearchGrant', grantType: 'nsfc_general' }, consequence: '你把几年积累压进一份本子。' },
    { text: '今年不报，先补基础', delta: { research: 4 }, effect: { kind: 'changeResearch', field: 'researchAbility', amount: 5 }, consequence: '你放弃一次窗口，换来更完整的准备。' },
  ] },
  { id: 'rs_bad_data', stage: ['master', 'phd', 'career'], title: '实验数据不理想', body: '三个月的数据与假设相反。重做意味着延迟，修饰意味着埋雷。', category: 'mental', weight: 55, minTurn: 4, once: true, choices: [
    { text: '重做并保留原始记录', delta: { stamina: -10, research: 4 }, effect: [{ kind: 'changeResearch', field: 'paperProgress', amount: -15 }, { kind: 'changeResearch', field: 'researchAbility', amount: 5 }], consequence: '时间被拉长，证据链保持完整。' },
    { text: '轻微调整数据', delta: { research: 6, sanity: -8 }, flagSet: 'research_data_adjusted', effect: { kind: 'recordResearchMisconduct', violation: '数据修饰', amount: 25 }, consequence: '图变得好看，风险开始潜伏。' },
    { text: '改写为阴性结果', delta: { research: 8, reputation: 2 }, effect: { kind: 'changeResearch', field: 'researchAbility', amount: 8 }, consequence: '你让不符合预期的数据仍然说真话。' },
  ] },
  { id: 'rs_reform_five_only', stage: ['career', 'pinnacle'], title: '破五唯改革', body: '医院宣布临床研究、指南和诊疗优化将进入评价，但旧标准不会一夜消失。', category: 'system', weight: 65, minTurn: 9, once: true, choices: [
    { text: '转向临床研究', delta: { clinical: 5, research: 3 }, effect: { kind: 'changeResearch', field: 'researchAbility', amount: 5 }, flagSet: 'research_clinical_reform', consequence: '短期产出变慢，问题与患者更近。' },
    { text: '坚持基础研究', delta: { research: 6 }, effect: { kind: 'changeResearch', field: 'academicReputation', amount: 5 }, consequence: '你押注旧体系仍有很长惯性。' },
    { text: '两边都做', delta: { stamina: -15, research: 7, clinical: 4 }, effect: { kind: 'changeHealth', field: 'strain', amount: 8 }, consequence: '风险被对冲，精力被透支。' },
  ] },
  { id: 'rs_retraction_notice', stage: ['pinnacle', 'retirement'], title: '撤稿通知', body: '期刊要求你解释多年前论文的数据问题。每一份原始记录都变得重要。', category: 'system', weight: 100, once: true, requireFlag: 'research_data_adjusted', choices: [
    { text: '承认问题并配合调查', delta: { reputation: -18, sanity: -12 }, effect: [{ kind: 'recordResearchMisconduct', violation: '撤稿调查', amount: 35 }, { kind: 'retractResearchPaper' }, { kind: 'changePublicImage', publicRisk: 30, onlineHeat: -25 }], consequence: '处理从轻，学术生涯留下永久记录。' },
    { text: '提交完整原始数据申诉', delta: { stamina: -8, sanity: -5 }, effect: [{ kind: 'changeLegal', field: 'recordDefense', amount: 8 }, { kind: 'changeResearch', field: 'misconductRisk', amount: -10 }], consequence: '能否翻盘取决于当年是否真的留下证据。' },
  ] },

  // 模块7：好友 / 同事 / 对手
  { id: 'co_intern_comrade', stage: 'internship', title: '实习生的战友情', body: '凌晨三点抢救结束，你和同期实习生靠在走廊墙边，相视一笑。', category: 'social', weight: 95, minTurn: 1, maxTurn: 4, once: true, choices: [
    { text: '以后互相照应', delta: { relations: 7 }, effect: { kind: 'changeColleagues', peerBond: 20 }, consequence: '共同扛过的夜班成了关系的底色。' },
    { text: '各自把事情做好', delta: { clinical: 2 }, effect: { kind: 'changeColleagues', peerBond: -3 }, consequence: '你们保持礼貌，没有走近。' },
  ] },
  { id: 'co_head_nurse_first', stage: 'internship', title: '护士长的第一印象', body: '护士长打量着新来的你：“手脚麻利点，别给科室添乱。”', category: 'social', weight: 100, minTurn: 2, maxTurn: 5, once: true, choices: [
    { text: '认真回应并询问流程', delta: { relations: 5, knowledge: 2 }, effect: { kind: 'changeColleagues', nurseAlliance: 12 }, consequence: '尊重从记住工作流程开始。' },
    { text: '顶回去', delta: { sanity: 2, relations: -10 }, effect: { kind: 'changeColleagues', nurseAlliance: -25 }, consequence: '你出了气，也让之后的配合变得困难。' },
  ] },
  { id: 'co_night_shift_talk', stage: 'guipei', title: '一起值夜班', body: '护士站只剩你和同期生。对方问：“我们什么时候才能熬出头？”', category: 'social', weight: 70, minTurn: 2, once: true, choices: [
    { text: '互相熬着，总会过去', delta: { sanity: 4, relations: 5 }, effect: { kind: 'changeColleagues', peerBond: 15 }, consequence: '一句普通的话，在深夜里有了重量。' },
    { text: '不想谈这些', delta: { sanity: 1 }, effect: { kind: 'changeColleagues', peerBond: -5 }, consequence: '沉默保护了你，也隔开了你们。' },
  ] },
  { id: 'co_promotion_rival', stage: 'career', title: '升副高：同期变对手', body: '你和同期都申报副高，名额只有一个。过去的战友如今坐在同一张评审表里。', category: 'career', weight: 100, minTurn: 8, once: true, choices: [
    { text: '公平竞争', delta: { reputation: 4 }, effect: { kind: 'changeColleagues', peerEnvy: 18 }, consequence: '竞争存在，底线也还在。' },
    { text: '主动打压对方', delta: { reputation: 6, relations: -12 }, effect: [{ kind: 'changeColleagues', peerBond: -25, peerEnvy: 45 }, { kind: 'recordColleagueConflict', event: '副高竞争', opponent: '同期医生', resolution: 'ongoing' }], consequence: '优势扩大，敌意也越过了临界线。' },
    { text: '主动退出', delta: { relations: 10, reputation: 2 }, effect: { kind: 'changeColleagues', peerBond: 25, peerEnvy: -10 }, consequence: '你付出时间，保住了一段关系。' },
  ] },
  { id: 'co_nurse_favor', stage: 'career', title: '护士长的人情', body: '护士长帮你调了周末班，又希望你照看一位刚转来的亲属。', category: 'social', weight: 55, minTurn: 5, once: true, choices: [
    { text: '按正规流程接收并照看', delta: { relations: 5 }, effect: { kind: 'changeColleagues', nurseAlliance: 8 }, consequence: '人情有了回应，规则也没有被跳过。' },
    { text: '直接答应特殊照顾', delta: { relations: 8 }, effect: [{ kind: 'changeColleagues', nurseAlliance: 12 }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: 4 }], consequence: '关系更近，边界更模糊。' },
    { text: '拒绝', delta: { reputation: 2, relations: -5 }, effect: { kind: 'changeColleagues', nurseAlliance: -15 }, consequence: '原则清楚，合作温度下降。' },
  ] },
  { id: 'co_two_camps', stage: 'career', title: '科室里的两派', body: '同期生分别加入主任和副主任阵营，你被夹在中间。', category: 'social', weight: 60, minTurn: 7, once: true, choices: [
    { text: '跟随主任派', delta: { reputation: 3 }, effect: [{ kind: 'setFaction', name: '主任派', factionType: 'clinical' }, { kind: 'changeColleagues', peerBond: -5, peerEnvy: 10 }], consequence: '朋友圈被重新排列。' },
    { text: '保持中立', delta: { clinical: 3 }, effect: [{ kind: 'changeColleagues', peerBond: -5, peerEnvy: -5 }, { kind: 'changeMentorFaction', factionLoyalty: -8 }], consequence: '双方都不完全信任你，但你保留了空间。' },
  ] },
  { id: 'co_student_betrayal', stage: ['pinnacle', 'retirement'], title: '学生的背叛', body: '你培养的学生投向竞争阵营，还把一件旧事当作筹码。', category: 'mental', weight: 100, once: true, requireFlag: 'social_obstruction_due', choices: [
    { text: '公开对峙', delta: { reputation: -5, sanity: -8 }, effect: [{ kind: 'changeColleagues', studentLoyalty: -35, peerEnvy: 10 }, { kind: 'recordColleagueConflict', event: '学生背叛', opponent: '学生', resolution: 'ongoing' }], consequence: '真相进入公开场合，关系无法回到从前。' },
    { text: '找中间人调解', delta: { relations: 3, money: -2000 }, effect: { kind: 'changeColleagues', studentLoyalty: 5, peerEnvy: -5 }, consequence: '冲突被控制，没有真正消失。' },
    { text: '反思并修正带教方式', delta: { sanity: 4 }, effect: [{ kind: 'changeColleagues', studentLoyalty: 10 }, { kind: 'changeSpirit', meaning: 5, purposePurity: 4 }], consequence: '你没有替背叛开脱，但愿意看见自己的责任。' },
  ] },
  { id: 'co_farewell_attendance', stage: 'retirement', title: '谁来参加送别会', body: '会议室门打开，来的人由几十年的相处决定。', category: 'social', weight: 100, minTurn: 5, once: true, choices: [
    { text: '感谢每一位到场的人', delta: { sanity: 10, relations: 8 }, effect: [{ kind: 'changeColleagues', peerBond: 5, nurseAlliance: 5, studentLoyalty: 5 }, { kind: 'changeSpirit', meaning: 12 }], consequence: '职业生涯最终被具体的人记住。' },
    { text: '也想起那些没来的人', delta: { sanity: 3 }, effect: { kind: 'changeSpirit', meaning: 4 }, consequence: '遗憾和感激可以同时存在。' },
  ] },

  // 模块8：家庭 / 血缘
  { id: 'fa_admission_letter', stage: 'gaokao', title: '录取通知书的背后', body: '父母一个在笑，一个在抹眼泪。学费和期待都夹在那张纸里。', category: 'personal', weight: 100, minTurn: 0, once: true, choices: [
    { text: '认真说声谢谢', delta: { relations: 8 }, effect: { kind: 'changeFamily', familyOrigin: 18 }, consequence: '这句话成了以后艰难时刻的一根线。' },
    { text: '答应会好好学', delta: { knowledge: 2 }, effect: { kind: 'changeFamily', familyOrigin: 8 }, consequence: '你把承诺写进了漫长学制。' },
  ] },
  { id: 'fa_first_departure', stage: 'undergrad', title: '第一次离家', body: '安检口外，父母还在挥手。从今天起，家开始被称作“老家”。', category: 'personal', weight: 85, minTurn: 0, maxTurn: 2, once: true, choices: [
    { text: '回头挥手，说会常回来', delta: { sanity: 3, relations: 4 }, effect: { kind: 'changeFamily', familyOrigin: 10 }, consequence: '距离出现了，连接仍在。' },
    { text: '头也不回地走', delta: { sanity: -2 }, effect: { kind: 'changeFamily', familyOrigin: -8 }, consequence: '独立来得很快，也有一点锋利。' },
  ] },
  { id: 'fa_new_year_absence', stage: ['guipei', 'master', 'phd'], title: '过年不回家', body: '排班表覆盖了抢票页面。电话那头沉默了几秒，才说“工作要紧”。', category: 'personal', weight: 75, minTurn: 3, once: true, choices: [
    { text: '请父母来身边过年', delta: { money: -3000, relations: 6 }, effect: { kind: 'changeFamily', familyOrigin: 6 }, consequence: '团圆换了地点。' },
    { text: '值班结束后视频拜年', delta: { sanity: -2 }, effect: [{ kind: 'recordFamilyAbsence', absence: 'holiday' }, { kind: 'changeFamily', familyOrigin: 2 }], consequence: '屏幕连接了彼此，也提醒着缺席。' },
    { text: '忙到忘记打电话', delta: { clinical: 3, sanity: -6 }, effect: { kind: 'recordFamilyAbsence', absence: 'holiday' }, consequence: '这个春节成为家庭记忆里的空白。' },
  ] },
  { id: 'fa_blind_date', stage: ['jobhunt', 'career'], title: '相亲', body: '咖啡厅里坐着一个可能与你共度很多年的人。你还穿着没来得及换下的白大衣。', category: 'social', weight: 80, once: true, requireMarital: 'single', choices: [
    { text: '选择同行', delta: { relations: 5 }, effect: [{ kind: 'startDating' }, { kind: 'setSpouseType', spouseType: 'physician' }, { kind: 'changeLove', intimacy: 20 }], consequence: '理解来得容易，时间冲突也更直接。' },
    { text: '选择稳定职业者', delta: { sanity: 3 }, effect: [{ kind: 'startDating' }, { kind: 'setSpouseType', spouseType: 'civil_servant' }, { kind: 'changeLove', intimacy: 15, commitment: 5 }], consequence: '你们的时间表不同，却可能互相补位。' },
    { text: '再等等', delta: { sanity: 1 }, consequence: '机会没有消失，只是窗口会越来越窄。' },
  ] },
  { id: 'fa_parent_meeting', stage: 'career', title: '孩子的家长会', body: '家长会与一台排好的手术撞在同一天。孩子问：“你能来吗？”', category: 'personal', weight: 75, minTurn: 7, once: true, requireFlag: 'has_child', choices: [
    { text: '调班参加', delta: { clinical: -2, relations: 8 }, effect: { kind: 'changeFamily', childBond: 15, spouseBond: 5 }, consequence: '你坐在教室后排，孩子一直回头看你。' },
    { text: '让配偶去，提前和孩子解释', delta: { relations: 3 }, effect: { kind: 'changeFamily', childBond: 3, spouseBond: 5 }, consequence: '缺席仍在，但没有被当作理所当然。' },
    { text: '工作优先', delta: { clinical: 3, sanity: -5 }, effect: { kind: 'recordFamilyAbsence', absence: 'parent_meeting' }, consequence: '手术完成了，空着的座位也被记住。' },
  ] },
  { id: 'fa_spouse_night_talk', stage: 'career', title: '配偶的深夜谈话', body: '你值完夜班回家，配偶坐在客厅：“我们谈谈。”', category: 'personal', weight: 100, once: true, requireFlag: 'family_crisis_due', choices: [
    { text: '坐下听完', delta: { sanity: 5 }, effect: [{ kind: 'changeFamily', spouseBond: 18, conflict: -15 }, { kind: 'changeLove', intimacy: 18 }], consequence: '问题没有一夜解决，但对话重新开始。' },
    { text: '工作就是这样', delta: { sanity: -4 }, effect: [{ kind: 'changeFamily', spouseBond: -15, conflict: 15 }, { kind: 'recordLoveCrisis', crisisType: 'exhaustion', impact: 12 }], consequence: '解释变成了拒绝沟通。' },
    { text: '明天再说', delta: { stamina: 3 }, effect: [{ kind: 'changeFamily', spouseBond: -20, conflict: 20 }, { kind: 'recordLoveCrisis', crisisType: 'absence', impact: 18 }], consequence: '明天没有自动带来更好的时机。' },
  ] },
  { id: 'fa_child_choice', stage: 'pinnacle', title: '孩子的高考志愿', body: '孩子问你：“我该不该学医？”这个问题突然回到了原点。', category: 'personal', weight: 100, minTurn: 2, once: true, requireFlag: 'has_child', choices: [
    { text: '想学就支持你', delta: { relations: 8 }, effect: [{ kind: 'setChildCareer', career: 'medicine' }, { kind: 'changeFamily', childBond: 15 }], consequence: '传承来自选择，而不是命令。' },
    { text: '别学医，去过自己的生活', delta: { relations: 6 }, effect: [{ kind: 'setChildCareer', career: 'other' }, { kind: 'changeFamily', childBond: 10 }], consequence: '职业没有传下去，尊重传下去了。' },
    { text: '必须学医', delta: { reputation: 2, relations: -12 }, effect: [{ kind: 'setChildCareer', career: 'medicine' }, { kind: 'changeFamily', childBond: -20, conflict: 15 }], consequence: '路线延续了，关系出现裂痕。' },
  ] },
  { id: 'fa_parent_last_moment', stage: ['pinnacle', 'retirement'], title: '父母的最后一面', body: '电话里只剩一句：“快回来。”你手头仍有无法轻易交接的工作。', category: 'mental', weight: 65, minTurn: 4, once: true, choices: [
    { text: '立刻请假回去', delta: { reputation: -3, sanity: -8 }, effect: [{ kind: 'changeFamily', familyOrigin: 15 }, { kind: 'changeSpirit', meaning: 3 }], consequence: '你没有改变结局，但没有留下最后一次缺席。' },
    { text: '安排完工作再回去', delta: { clinical: 3, sanity: -18 }, flagSet: 'lifelong_family_regret', effect: [{ kind: 'changeFamily', familyOrigin: -30 }, { kind: 'changeSpirit', meaning: -15, purposePurity: -5 }], consequence: '你赶到时，很多话已经来不及说。' },
  ] },

  // 模块9：爱情 / 婚姻
  { id: 'lv_library_encounter', stage: 'undergrad', title: '图书馆的偶遇', body: '你和对面的人同时伸手去拿同一本《系统解剖学》。', category: 'social', weight: 50, minTurn: 3, maxTurn: 7, once: true, requireMarital: 'single', choices: [
    { text: '主动搭话', delta: { relations: 5, sanity: 3 }, effect: [{ kind: 'startDating' }, { kind: 'changeLove', intimacy: 20, passion: 15 }], consequence: '一段校园恋爱从一本书开始。' },
    { text: '微笑后继续复习', delta: { knowledge: 3 }, effect: { kind: 'changeLove', intimacy: 3 }, consequence: '这一页翻过去了。' },
  ] },
  { id: 'lv_residency_date', stage: ['guipei', 'master', 'phd'], title: '值班后的约会', body: '你迟到了四十分钟，袖口还有消毒水的味道。对方仍在等。', category: 'personal', weight: 65, minTurn: 3, once: true, requireMarital: 'dating', choices: [
    { text: '认真道歉并留下完整时间', delta: { stamina: -4, sanity: 5 }, effect: { kind: 'changeLove', intimacy: 12, commitment: 5 }, consequence: '忙碌没有消失，但对方感到被重视。' },
    { text: '这份工作就是这样', delta: { clinical: 2 }, effect: { kind: 'changeLove', intimacy: -12, passion: -5 }, consequence: '事实没有错，却没能承担关系。' },
  ] },
  { id: 'lv_department_romance', stage: ['guipei', 'jobhunt'], title: '科室恋情', body: '你和同院的人产生情愫，但同组关系会让排班与评价变得复杂。', category: 'social', weight: 45, once: true, requireMarital: 'single', choices: [
    { text: '公开关系并申请回避', delta: { reputation: -2, relations: 5 }, effect: [{ kind: 'startDating' }, { kind: 'setSpouseType', spouseType: 'physician' }, { kind: 'changeLove', intimacy: 18, commitment: 8 }], consequence: '职业路径多了一次调整，关系少了一层秘密。' },
    { text: '保持地下恋情', delta: { sanity: 3 }, flagSet: 'secret_department_romance', effect: [{ kind: 'startDating' }, { kind: 'changeLove', intimacy: 15, commitment: -5 }, { kind: 'changePublicImage', publicRisk: 5 }], consequence: '亲密和风险一起增长。' },
    { text: '放弃', delta: { sanity: -5 }, consequence: '你选择了职业边界，也承受了失落。' },
  ] },
  { id: 'lv_proposal', stage: ['jobhunt', 'career'], title: '求婚', body: '戒指不大，问题却足够覆盖未来很多年。', category: 'personal', weight: 85, minTurn: 1, once: true, requireMarital: 'dating', choices: [
    { text: '认真准备一次求婚', delta: { money: -8000, sanity: 8 }, effect: [{ kind: 'marry' }, { kind: 'changeLove', intimacy: 20, passion: 15, commitment: 25 }], consequence: '承诺从一句话变成共同生活。' },
    { text: '简单地问：我们结婚吧', delta: { sanity: 5 }, effect: [{ kind: 'marry' }, { kind: 'changeLove', intimacy: 10, commitment: 20 }], consequence: '仪式很轻，承诺仍然真实。' },
    { text: '再等等', delta: { sanity: -2 }, effect: { kind: 'changeLove', commitment: -8 }, consequence: '等待需要理由，否则会变成消耗。' },
  ] },
  { id: 'lv_living_room', stage: 'career', title: '深夜的客厅', body: '凌晨一点，客厅灯还亮着。配偶没有吵，只说：“我们谈谈。”', category: 'personal', weight: 100, once: true, requireFlag: 'love_crisis_due', choices: [
    { text: '听对方说完', delta: { sanity: 4 }, effect: [{ kind: 'changeLove', intimacy: 20, commitment: 5 }, { kind: 'changeFamily', spouseBond: 12, conflict: -12 }], consequence: '关系从红线边退回了一步。' },
    { text: '我也没办法', delta: { sanity: -4 }, effect: { kind: 'recordLoveCrisis', crisisType: 'exhaustion', impact: 15 }, consequence: '无力感变成了彼此的敌人。' },
    { text: '明天再说', delta: { stamina: 2 }, effect: { kind: 'recordLoveCrisis', crisisType: 'absence', impact: 22 }, consequence: '沉默继续累积。' },
  ] },
  { id: 'lv_anniversary_absence', stage: 'career', title: '纪念日的缺席', body: '今天是结婚纪念日，急诊手术和预订的晚餐同时出现在日历上。', category: 'personal', weight: 60, minTurn: 6, once: true, requireMarital: 'married', choices: [
    { text: '协调交接，回家吃晚餐', delta: { clinical: -2, sanity: 6 }, effect: { kind: 'changeLove', intimacy: 15, passion: 8 }, consequence: '患者得到妥善交接，你也没有再次缺席。' },
    { text: '完成手术，提前准备礼物', delta: { money: -1500, clinical: 3 }, effect: { kind: 'changeLove', intimacy: 4, passion: 2 }, consequence: '人没有到场，但心意并非零。' },
    { text: '让对方理解', delta: { clinical: 4 }, effect: [{ kind: 'recordFamilyAbsence', absence: 'birthday' }, { kind: 'recordLoveCrisis', crisisType: 'absence', impact: 10 }], consequence: '又一次缺席被解释成职业必然。' },
  ] },
  { id: 'lv_temptation', stage: ['career', 'pinnacle'], title: '婚外诱惑', body: '有人给了你超出工作边界的关注。你在婚姻中孤独，也清楚这一步的后果。', category: 'personal', weight: 45, minTurn: 8, once: true, requireMarital: 'married', choices: [
    { text: '明确拒绝并保持距离', delta: { sanity: 4 }, effect: { kind: 'changeLove', commitment: 10 }, consequence: '边界不是没有诱惑，而是在诱惑出现时仍然有效。' },
    { text: '暧昧回应', delta: { sanity: 6, reputation: -3 }, flagSet: 'love_emotional_affair', effect: [{ kind: 'recordLoveCrisis', crisisType: 'infidelity', impact: 25 }, { kind: 'changePublicImage', publicRisk: 12 }], consequence: '短暂被看见的感觉，开始侵蚀长期承诺。' },
    { text: '告诉配偶', delta: { sanity: -2 }, effect: { kind: 'changeLove', intimacy: 8, commitment: 8 }, consequence: '坦诚带来不安，也建立新的信任。' },
  ] },
  { id: 'lv_divorce_agreement', stage: ['pinnacle', 'retirement'], title: '离婚协议书', body: '协议放在桌上。对方说：“我累了。”', category: 'mental', weight: 100, once: true, requireFlag: 'love_crisis_due', requireMarital: 'married', choices: [
    { text: '和平签字', delta: { money: -30000, sanity: -18 }, effect: [{ kind: 'setRelationshipStatus', status: 'divorced' }, { kind: 'changeFamily', spouseBond: -40, childBond: -20, conflict: 30 }, { kind: 'changeSpirit', meaning: -15 }], consequence: '婚姻结束，责任和记忆不会立即结束。' },
    { text: '共同接受婚姻咨询', delta: { money: -6000, stamina: -4 }, effect: [{ kind: 'changeLove', intimacy: 18, commitment: 15 }, { kind: 'changeFamily', spouseBond: 12, conflict: -20 }], consequence: '修复不是保证，但你们开始面对问题。' },
    { text: '拖延不谈', delta: { sanity: -10 }, effect: [{ kind: 'setRelationshipStatus', status: 'separated' }, { kind: 'recordLoveCrisis', crisisType: 'conflict', impact: 18 }], consequence: '关系进入更漫长的不确定。' },
  ] },

  // 模块10：精神 / 初心
  { id: 'sp_purpose_diary', stage: 'gaokao', title: '初心日记', body: '入学前夜，你写下“我想学医”。后面的理由，决定这句话怎样承受现实。', category: 'mental', weight: 100, minTurn: 0, once: true, choices: [
    { text: '我想成为一名好医生', delta: { sanity: 5 }, effect: [{ kind: 'setPurposeType', purposeType: 'idealistic', originStory: '希望通过医学改变他人的命运' }, { kind: 'changeSpirit', purposePurity: 20, meaning: 10 }], consequence: '理想会给你力量，也会让失败更痛。' },
    { text: '这是家人的期待', delta: { relations: 5 }, effect: [{ kind: 'setPurposeType', purposeType: 'family', originStory: '承载家人的期待走入医学' }, { kind: 'changeSpirit', purposePurity: 8 }], consequence: '你带着不只属于自己的愿望出发。' },
    { text: '这是一条稳定的路', delta: { money: 500 }, effect: [{ kind: 'setPurposeType', purposeType: 'pragmatic', originStory: '把医学视为值得投入的现实道路' }, { kind: 'changeSpirit', purposePurity: 3 }], consequence: '理由并不浪漫，但可以很稳。' },
  ] },
  { id: 'sp_anatomy_doubt', stage: 'undergrad', title: '解剖课后的怀疑', body: '洗手间镜子里，你第一次怀疑自己是否适合这件白大衣。', category: 'mental', weight: 65, minTurn: 1, maxTurn: 4, once: true, choices: [
    { text: '害怕也继续学', delta: { knowledge: 3, sanity: -3 }, effect: { kind: 'changeSpirit', purposePurity: 8, meaning: 4, event: '解剖课后的坚持' }, consequence: '勇气不是没有恐惧。' },
    { text: '允许自己暂时迷茫', delta: { sanity: 3 }, effect: { kind: 'changeSpirit', purposePurity: -3 }, consequence: '你没有立刻得到答案，也没有否定自己。' },
  ] },
  { id: 'sp_first_called_doctor', stage: 'internship', title: '第一次被叫“医生”', body: '患者在走廊拉住你：“医生，我什么时候能出院？”你愣了一下。', category: 'mental', weight: 100, minTurn: 1, once: true, choices: [
    { text: '认真回应并请上级确认', delta: { clinical: 3, sanity: 6 }, effect: { kind: 'changeSpirit', meaning: 15, flashbackCharge: 20 }, consequence: '这个称呼第一次落在你身上。' },
    { text: '说明自己是实习医生', delta: { reputation: 2 }, effect: { kind: 'changeSpirit', meaning: 8, flashbackCharge: 10 }, consequence: '诚实没有削弱那一刻的重量。' },
  ] },
  { id: 'sp_36h_dawn', stage: 'guipei', title: '36小时值班后的清晨', body: '走出医院时太阳刚升起。你看着早餐摊，突然不知道自己为何过这样的生活。', category: 'mental', weight: 90, minTurn: 3, once: true, choices: [
    { text: '为了治病救人', delta: { sanity: 2, stamina: -3 }, effect: { kind: 'changeSpirit', meaning: 10, purposePurity: 5 }, consequence: '理由不能消除疲劳，但暂时托住了你。' },
    { text: '为了生存', delta: { money: 500, sanity: -3 }, effect: { kind: 'changeSpirit', meaning: -8 }, consequence: '这个答案真实，也显得寒冷。' },
    { text: '坐下来哭一会儿', delta: { sanity: 5 }, effect: { kind: 'changeSpirit', meaning: -2 }, consequence: '情绪得到出口，不必立刻变成答案。' },
  ] },
  { id: 'sp_midlife_collapse', stage: 'career', title: '坐在车里的中年医生', body: '车停在楼下，你不想上楼，也不想回医院。你问自己：“到底图什么？”', category: 'mental', weight: 100, once: true, requireFlag: 'meaning_crisis_due', choices: [
    { text: '给家人打电话', delta: { sanity: 8 }, effect: [{ kind: 'changeSpirit', meaning: 8 }, { kind: 'changeFamily', spouseBond: 5, familyOrigin: 5 }], consequence: '求助没有让你变弱。' },
    { text: '联系同期生', delta: { sanity: 6, relations: 4 }, effect: [{ kind: 'changeSpirit', meaning: 6 }, { kind: 'changeColleagues', peerBond: 8 }], consequence: '有人知道你现在并不好。' },
    { text: '预约心理咨询', delta: { money: -1200, sanity: 12 }, effect: { kind: 'changeSpirit', meaning: 12, purposePurity: 3 }, consequence: '专业帮助让危机有了可以处理的边界。' },
  ] },
  { id: 'sp_flashback_highlight', stage: ['career', 'pinnacle'], title: '十年前的患者', body: '陌生人叫住你：“您可能不记得我，但十年前您救过我。”', category: 'mental', weight: 100, once: true, requireFlag: 'spirit_flashback_due', choices: [
    { text: '问问对方这些年过得怎样', delta: { sanity: 12 }, effect: { kind: 'triggerFlashback', event: '十年前的患者', impact: 25 }, consequence: '你不记得那一天，对方记得。' },
    { text: '这是医生应该做的', delta: { reputation: 3, sanity: 8 }, effect: { kind: 'triggerFlashback', event: '职业职责的回响', impact: 18 }, consequence: '平常职责在另一个人的人生里并不平常。' },
  ] },
  { id: 'sp_last_lesson', stage: 'retirement', title: '最后一课', body: '台下是年轻医生。你需要决定，最后留下成功、失败，还是诚实。', category: 'mental', weight: 100, minTurn: 3, once: true, choices: [
    { text: '讲最失败的病例', delta: { reputation: 5, sanity: -3 }, effect: [{ kind: 'changeSpirit', meaning: 12, purposePurity: 10 }, { kind: 'changeColleagues', studentLoyalty: 12 }], consequence: '经验从坦诚中获得了传承价值。' },
    { text: '讲所有后悔与边界', delta: { sanity: 8 }, effect: [{ kind: 'changeSpirit', meaning: 18, purposePurity: 15 }, { kind: 'completeBucket', item: 'memoir', legacy: 15 }], consequence: '年轻人听到的不是神话，而是一条可以走的路。' },
  ] },
  { id: 'sp_final_question', stage: 'eternity', title: '最后的自问', body: '你仿佛看见十八岁的自己，仍坐在书桌前写“我想学医”。', category: 'mental', weight: 100, minTurn: 9, once: true, choices: [
    { text: '我做到了', delta: { sanity: 15 }, effect: [{ kind: 'changeSpirit', meaning: 50 }, { kind: 'setFinalChoice', choice: 'worth_it' }], consequence: '初心与一生在此刻相认。' },
    { text: '我尽力了', delta: { sanity: 10 }, effect: [{ kind: 'changeSpirit', meaning: 30 }, { kind: 'setFinalChoice', choice: 'did_my_best' }], consequence: '不完美的一生，也可以完整。' },
    { text: '我把接力棒交出去了', delta: { sanity: 10 }, effect: [{ kind: 'changeSpirit', meaning: 30 }, { kind: 'setFinalChoice', choice: 'passed_the_baton' }], consequence: '答案继续活在后来者身上。' },
    { text: '终于可以休息了', delta: { sanity: 8 }, effect: [{ kind: 'changeSpirit', meaning: 20 }, { kind: 'setFinalChoice', choice: 'rest' }], consequence: '这一次，休息不需要请假。' },
  ] },

  // 模块11：社会形象 / 舆论
  { id: 'pi_moments_taboo', stage: 'guipei', title: '朋友圈的禁忌', body: '你发了凌晨值班照，医务科提醒画面里可能出现患者信息。', category: 'system', weight: 65, minTurn: 1, maxTurn: 5, once: true, choices: [
    { text: '删除并学习隐私规范', delta: { reputation: 2 }, effect: { kind: 'changePublicImage', privacyAwareness: 12 }, consequence: '一次提醒避免了更大的代价。' },
    { text: '设为仅自己可见', delta: { sanity: 1 }, effect: { kind: 'changePublicImage', privacyAwareness: 5 }, consequence: '风险降低，但规范意识仍需补课。' },
    { text: '这有什么问题', delta: { reputation: -2 }, effect: { kind: 'changePublicImage', privacyAwareness: -12, publicRisk: 5 }, consequence: '镜头里看似普通的细节也可能识别一个人。' },
  ] },
  { id: 'pi_filmed_clinic', stage: 'career', title: '被偷拍的门诊', body: '一段被剪辑的问诊视频传播开来，只留下你说“情况严重”的几秒。', category: 'system', weight: 100, once: true, requireFlag: 'public_exposure_due', choices: [
    { text: '联系平台并保全证据', delta: { stamina: -5, sanity: -5 }, effect: [{ kind: 'changePublicImage', publicRisk: -12, crisisManagement: 8 }, { kind: 'changeLegal', field: 'recordDefense', amount: 5 }], consequence: '视频未必立刻消失，但证据开始完整。' },
    { text: '请医院发布完整说明', delta: { relations: -2, reputation: 3 }, effect: { kind: 'changePublicImage', publicRisk: -15, onlineHeat: 8, crisisManagement: 5 }, consequence: '机构回应给事实增加了传播能力。' },
    { text: '清者自清', delta: { sanity: -10 }, effect: { kind: 'startOnlineHarassment', severity: 20 }, consequence: '沉默留下的信息真空被更多叙事填满。' },
  ] },
  { id: 'pi_hanging_post', stage: ['career', 'pinnacle'], title: '患者的挂人帖', body: '帖子标题写着“某医院医生害了我家人”，评论已经过千。', category: 'system', weight: 100, once: true, requireFlag: 'public_harassment_due', choices: [
    { text: '报警、投诉并同步留证', delta: { stamina: -8, money: -3000 }, effect: [{ kind: 'changePublicImage', publicRisk: -10, crisisManagement: 10 }, { kind: 'changeLegal', field: 'legalSupport', amount: 8 }], consequence: '程序很慢，但每一步都留下记录。' },
    { text: '委托律师起诉诽谤', delta: { money: -12000, stamina: -5 }, effect: [{ kind: 'changePublicImage', publicRisk: -18, onlineHeat: 8 }, { kind: 'changeLegal', field: 'legalSupport', amount: 12 }], consequence: '争议进入可裁判的程序。' },
    { text: '等风波过去', delta: { sanity: -15 }, effect: { kind: 'startOnlineHarassment', severity: 25 }, consequence: '网络攻击开始按季度侵蚀生活。' },
  ] },
  { id: 'pi_influencer_offer', stage: ['career', 'pinnacle'], title: '网红医生的诱惑', body: '一条科普视频突然走红，机构和品牌方同时发来合作邀请。', category: 'financial', weight: 60, minTurn: 6, once: true, choices: [
    { text: '继续做纯科普', delta: { reputation: 5, stamina: -4 }, effect: [{ kind: 'setSocialMedia', strategy: 'pure_education' }, { kind: 'changePublicImage', onlineHeat: 12, privacyAwareness: 5 }], consequence: '增长较慢，但专业边界清楚。' },
    { text: '接正规广告并保留审核权', delta: { money: 5000, reputation: 2 }, effect: [{ kind: 'setSocialMedia', strategy: 'mixed', monetized: true }, { kind: 'changePublicImage', onlineHeat: 10, publicRisk: 8 }], consequence: '商业化开始，审查责任也随之增加。' },
    { text: '签约MCN全力变现', delta: { money: 15000, reputation: -8 }, effect: [{ kind: 'setSocialMedia', strategy: 'commercial', monetized: true, mcnContract: true }, { kind: 'changePublicImage', onlineHeat: 25, publicRisk: 25 }, { kind: 'setSideBusiness', businessType: 'science_blogger', quarterlyIncome: 12000, timeCost: 6, compliance: 'gray' }], consequence: '流量和失控风险同时放大。' },
  ] },
  { id: 'pi_health_authority_investigation', stage: 'pinnacle', title: '卫健委的调查', body: '调查人员要求说明账号内容、患者授权和商业合作。', category: 'system', weight: 100, once: true, requireFlag: 'public_harassment_due', choices: [
    { text: '提交授权与审核记录', delta: { stamina: -5 }, effect: [{ kind: 'changePublicImage', publicRisk: -20, crisisManagement: 8 }, { kind: 'changeLegal', field: 'recordDefense', amount: 10 }], consequence: '合规记录把争议限制在整改范围。' },
    { text: '主动下架并整改', delta: { money: -5000, reputation: -4 }, effect: [{ kind: 'setSocialMedia', strategy: 'none', monetized: false }, { kind: 'changePublicImage', publicRisk: -15, onlineHeat: -10 }], consequence: '收入和热度下降，风险停止扩张。' },
    { text: '隐瞒商业合作', delta: { money: 3000, sanity: -8 }, flagSet: 'public_hidden_commercial_deal', effect: [{ kind: 'changePublicImage', publicRisk: 25 }, { kind: 'recordLegalViolation', violation: '隐瞒互联网医疗商业合作', severity: 'major' }], consequence: '调查从内容问题升级为诚信问题。' },
  ] },
  { id: 'pi_edited_truth', stage: ['career', 'pinnacle'], title: '被剪辑的真相', body: '完整版显示患者先辱骂你，但传播最广的仍是你语气强硬的十秒。', category: 'mental', weight: 55, minTurn: 8, once: true, choices: [
    { text: '发布完整材料与时间线', delta: { stamina: -5, reputation: 3 }, effect: { kind: 'changePublicImage', publicRisk: -12, onlineHeat: 10, crisisManagement: 8 }, consequence: '事实开始追赶情绪。' },
    { text: '起诉剪辑者', delta: { money: -8000, sanity: -4 }, effect: [{ kind: 'changePublicImage', publicRisk: -8 }, { kind: 'changeLegal', field: 'legalSupport', amount: 10 }], consequence: '你把解释转成了证据。' },
    { text: '放弃解释', delta: { sanity: -12 }, effect: [{ kind: 'changePublicImage', onlineHeat: -15 }, { kind: 'changeSpirit', meaning: -10 }], consequence: '舆论会过去，伤害不会同步归零。' },
  ] },
  { id: 'pi_anticorruption_storm', stage: 'pinnacle', title: '医疗反腐的舆论风暴', body: '同科室有人被调查，媒体开始翻找所有人的利益往来。', category: 'system', weight: 70, minTurn: 3, once: true, choices: [
    { text: '配合调查并公开利益冲突', delta: { stamina: -8, reputation: 5 }, effect: [{ kind: 'changePublicImage', privacyAwareness: 5, crisisManagement: 8 }, { kind: 'changeLegal', field: 'recordDefense', amount: 8 }], consequence: '透明不能消除审视，但能减少猜测。' },
    { text: '暂停公开活动', delta: { money: -3000 }, effect: { kind: 'changePublicImage', onlineHeat: -15, publicRisk: -8 }, consequence: '你减少曝光，等待事实边界清晰。' },
    { text: '把责任推给同事', delta: { relations: -12, reputation: -5 }, effect: [{ kind: 'changeColleagues', peerEnvy: 20 }, { kind: 'changePublicImage', publicRisk: 15 }], consequence: '注意力暂时转移，团队关系彻底恶化。' },
  ] },
  { id: 'pi_retirement_old_case', stage: 'retirement', title: '退休后的翻旧账', body: '一例正常并发症被重新包装成“退休名医当年治死人”。', category: 'system', weight: 65, minTurn: 4, once: true, choices: [
    { text: '委托医院和律师回应', delta: { money: -5000, stamina: -4 }, effect: [{ kind: 'changePublicImage', publicRisk: -12, crisisManagement: 5 }, { kind: 'changeLegal', field: 'legalSupport', amount: 5 }], consequence: '退休不等于失去辩护权。' },
    { text: '整理病历，写下完整经过', delta: { stamina: -5, knowledge: 2 }, effect: [{ kind: 'changePublicImage', publicRisk: -8 }, { kind: 'completeBucket', item: 'memoir', legacy: 8 }], consequence: '事实被保存，未必立刻被所有人看见。' },
    { text: '不再回应', delta: { sanity: -4 }, effect: { kind: 'changeSpirit', meaning: 3 }, consequence: '你接受无法控制所有人的定义。' },
  ] },

  // 模块12：业余生活 / 第二曲线
  { id: 'le_club_recruitment', stage: 'undergrad', title: '社团招新', body: '运动、文学、摄影和音乐社团沿路摆开。医学课程还没开始吞掉所有时间。', category: 'personal', weight: 75, minTurn: 1, maxTurn: 4, once: true, choices: [
    { text: '加入运动社团', delta: { stamina: 5, relations: 3 }, effect: [{ kind: 'setHobby', hobbyType: 'sports', level: 15 }, { kind: 'changeLeisure', lifeSatisfaction: 8, socialCircle: 5 }], consequence: '你为未来保留了一种身体记忆。' },
    { text: '加入文艺社团', delta: { sanity: 6, relations: 3 }, effect: [{ kind: 'setHobby', hobbyType: 'arts', level: 15 }, { kind: 'changeLeisure', lifeSatisfaction: 10, socialCircle: 5 }], consequence: '白大衣之外，你开始有另一种表达。' },
    { text: '加入学术社团', delta: { research: 4, knowledge: 3 }, effect: [{ kind: 'setHobby', hobbyType: 'learning', level: 15 }, { kind: 'changeLeisure', hobbyLevel: 5 }], consequence: '学习也成了你的休闲方式。' },
  ] },
  { id: 'le_intern_weekend', stage: 'internship', title: '实习生的周末', body: '同学群在讨论去哪玩，你的排班表写着周末值班。', category: 'personal', weight: 80, minTurn: 3, once: true, choices: [
    { text: '值班前去运动', delta: { stamina: 5, sanity: 4 }, effect: [{ kind: 'setHobby', hobbyType: 'sports', level: 10 }, { kind: 'changeLeisure', lifeSatisfaction: 5 }], consequence: '时间不多，你仍给身体留了一小块。' },
    { text: '继续睡觉', delta: { stamina: 12, sanity: 3 }, effect: { kind: 'changeHealth', field: 'energy', amount: 8 }, consequence: '睡眠不是浪费，它是欠账的偿还。' },
    { text: '和同期生吃饭', delta: { relations: 6, sanity: 4 }, effect: [{ kind: 'changeLeisure', socialCircle: 5 }, { kind: 'changeColleagues', peerBond: 8 }], consequence: '有限的周末变成了关系维护。' },
  ] },
  { id: 'le_36h_weekend', stage: 'guipei', title: '36小时后的周末', body: '你站在医院门口，不知道回去睡觉，还是做点“像人”的事。', category: 'personal', weight: 85, minTurn: 4, once: true, choices: [
    { text: '回家睡觉', delta: { stamina: 18, sanity: 3 }, effect: { kind: 'changeHealth', field: 'energy', amount: 12 }, consequence: '生活被错过，身体得到必要修复。' },
    { text: '去公园走一圈', delta: { stamina: 4, sanity: 8 }, flagSet: 'kept_humanity', effect: [{ kind: 'changeLeisure', lifeSatisfaction: 8 }, { kind: 'changeSpirit', meaning: 5 }], consequence: '你记起医院之外仍有季节。' },
    { text: '约朋友吃饭', delta: { relations: 6, sanity: 6 }, flagSet: 'kept_humanity', effect: { kind: 'changeLeisure', socialCircle: 8, lifeSatisfaction: 5 }, consequence: '有人只把你当朋友，不把你当医生。' },
  ] },
  { id: 'le_salary_cut_choice', stage: 'career', title: '降薪后的选择', body: '工资条少了一截，房贷、教育和赡养没有同步下降。', category: 'financial', weight: 100, minTurn: 5, once: true, choices: [
    { text: '开始线上问诊', delta: { stamina: -4 }, effect: [{ kind: 'setSideBusiness', businessType: 'online_consultation', quarterlyIncome: 5000, timeCost: 4, compliance: 'legal' }, { kind: 'changeLeisure', secondCurve: 12 }], consequence: '收入增加，休息时间继续缩短。' },
    { text: '做医学培训', delta: { stamina: -5, reputation: 3 }, effect: [{ kind: 'setSideBusiness', businessType: 'training', quarterlyIncome: 9000, timeCost: 5, compliance: 'legal' }, { kind: 'changeLeisure', secondCurve: 15, socialCircle: 5 }], consequence: '经验开始转化成另一种收入。' },
    { text: '尝试医疗科普', delta: { stamina: -5 }, effect: [{ kind: 'setSideBusiness', businessType: 'science_blogger', quarterlyIncome: 3000, timeCost: 6, compliance: 'gray' }, { kind: 'setSocialMedia', strategy: 'mixed', monetized: true }, { kind: 'changeLeisure', secondCurve: 10 }], consequence: '第二曲线与舆论风险同时启动。' },
    { text: '先压缩支出', delta: { sanity: -2 }, effect: { kind: 'changeLeisure', lifeSatisfaction: -5 }, consequence: '账面暂时平衡，生活空间变得更小。' },
  ] },
  { id: 'le_running_club', stage: ['career', 'pinnacle'], title: '跑团的医生', body: '跑完后，律师、教师和程序员围着早餐桌聊天。你是唯一的医生。', category: 'social', weight: 55, minTurn: 7, once: true, choices: [
    { text: '分享职业故事，也听他们的生活', delta: { sanity: 6, relations: 4 }, effect: [{ kind: 'changeLeisure', socialCircle: 15, lifeSatisfaction: 8 }, { kind: 'setHobby', hobbyType: 'sports', level: 35 }], consequence: '医疗圈之外的人开始进入你的生活。' },
    { text: '只跑步，不聊工作', delta: { stamina: 6, sanity: 4 }, effect: { kind: 'changeLeisure', socialCircle: 5, lifeSatisfaction: 6 }, consequence: '在这里，你不需要一直扮演医生。' },
  ] },
  { id: 'le_feidao_offer', stage: ['career', 'pinnacle'], title: '飞刀的诱惑', body: '外地医院邀请你周末主刀，并问费用走单位还是直接结算。', category: 'financial', weight: 70, minTurn: 8, once: true, choices: [
    { text: '公对公备案', delta: { money: 10000, stamina: -8, reputation: 3 }, effect: [{ kind: 'setSideBusiness', businessType: 'feidao_sunshine', quarterlyIncome: 10000, timeCost: 5, compliance: 'legal' }, { kind: 'changeLeisure', secondCurve: 15 }], consequence: '收入少一些，流程和责任清楚。' },
    { text: '私下收取现金', delta: { money: 25000, stamina: -10, sanity: -5 }, flagSet: 'shadow_feidao', effect: [{ kind: 'setSideBusiness', businessType: 'feidao_shadow', quarterlyIncome: 25000, timeCost: 5, compliance: 'illegal' }, { kind: 'changeFinance', field: 'corruption', amount: 15 }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: 15, violation: '私下飞刀取酬', severity: 'major' }], consequence: '收益翻倍，合规风险也被写进记录。' },
    { text: '拒绝，保留周末', delta: { sanity: 8, relations: 3 }, effect: { kind: 'changeLeisure', lifeSatisfaction: 10 }, consequence: '你放弃收入，买回自己的时间。' },
  ] },
  { id: 'le_side_investigation', stage: ['pinnacle', 'retirement'], title: '副业调查', body: '纪委通知有人反映你在外兼职取酬。过去的备案与转账记录会决定边界。', category: 'system', weight: 100, once: true, requireFlag: 'side_business_investigation_due', choices: [
    { text: '主动说明并补正', delta: { money: -15000, reputation: -4 }, effect: [{ kind: 'setSideBusiness', businessType: 'none', quarterlyIncome: 0, timeCost: 0, compliance: 'legal' }, { kind: 'changeLegal', field: 'adminPenaltyRisk', amount: -8 }], consequence: '副业停止，主业得以保住。' },
    { text: '提交完整备案记录', delta: { stamina: -5 }, effect: [{ kind: 'changeLegal', field: 'recordDefense', amount: 10 }, { kind: 'changeLeisure', secondCurve: -5 }], consequence: '合规记录为你划出清晰边界。' },
    { text: '否认并销毁记录', delta: { sanity: -10 }, effect: [{ kind: 'recordLegalViolation', violation: '副业调查中隐匿记录', severity: 'major' }, { kind: 'changePublicImage', publicRisk: 20 }], consequence: '问题从兼职合规升级为证据风险。' },
  ] },
  { id: 'le_retirement_time', stage: 'retirement', title: '终于有时间了', body: '退休后的第一个早晨，没有排班，也没有人等你签字。', category: 'personal', weight: 100, minTurn: 0, maxTurn: 3, once: true, choices: [
    { text: '重新拾起年轻时的爱好', delta: { sanity: 12, stamina: 5 }, effect: [{ kind: 'changeLeisure', hobbyLevel: 30, lifeSatisfaction: 25 }, { kind: 'changeSpirit', meaning: 8 }], consequence: '时间重新属于你。' },
    { text: '开始旅行', delta: { money: -12000, sanity: 15 }, effect: [{ kind: 'setHobby', hobbyType: 'travel', level: 25 }, { kind: 'changeLeisure', socialCircle: 10, lifeSatisfaction: 25 }], consequence: '地图不再只标医院和会议中心。' },
    { text: '继续返聘', delta: { money: 8000, reputation: 5, stamina: -6 }, effect: [{ kind: 'changeLeisure', lifeSatisfaction: -3 }, { kind: 'changeSpirit', meaning: 5 }], consequence: '职业连接仍在，自由来得更慢。' },
    { text: '不知道做什么', delta: { sanity: -8 }, flagSet: 'retirement_syndrome', effect: { kind: 'changeLeisure', lifeSatisfaction: -12 }, consequence: '工作退场后，空白本身也需要学习。' },
  ] },
];
