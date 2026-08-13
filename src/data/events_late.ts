import type { GameEvent } from './events';

export const LATE_ERA_EVENTS: GameEvent[] = [
  {
    id: 'era6_role_choice', stage: 'pinnacle', title: '站到队伍最前面之后',
    body: '你终于站到科室最前面。资源、责任和决定都向你集中。接下来的路，不只是继续证明自己，也是决定谁能接过位置。',
    category: 'career', weight: 100, minTurn: 0, maxTurn: 1, once: true,
    choices: [
      { text: '把重心放在培养年轻医生', delta: { relations: 8, reputation: 3 }, flagSet: 'era6_mentor_path', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 20, completion: 5 }, consequence: '你开始把机会分给后来者。' },
      { text: '继续冲刺学术与技术高峰', delta: { research: 6, papers: 1, stamina: -8 }, flagSet: 'era6_academic_peak', effect: { kind: 'changeHealth', field: 'strain', amount: 5 }, consequence: '你的名字继续向上，身体的余量继续向下。' },
      { text: '守住科室制度和临床底线', delta: { reputation: 6, relations: 3 }, flagSet: 'era6_institutional_legacy', effect: { kind: 'changePolicy', field: 'complianceRisk', amount: -10 }, consequence: '制度不像论文醒目，却会替很多人挡住风险。' },
    ],
  },
  {
    id: 'era6_last_round', stage: 'pinnacle', title: '最后一次带队查房',
    body: '你故意走得比平时慢，让年轻医生先开口。病房里没有告别仪式，只有一次普通得不能再普通的床旁讨论。',
    category: 'clinical', weight: 100, minTurn: 4, maxTurn: 6, once: true,
    choices: [
      { text: '把判断过程完整讲给他们', delta: { clinical: 3, relations: 5 }, flagSet: 'era6_last_round_taught', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 20, completion: 10 }, consequence: '这次查房后来被学生讲了很多年。' },
      { text: '让学生独立决定，自己补位', delta: { reputation: 2, relations: 6 }, flagSet: 'era6_successor_tested', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 15, completion: 10 }, consequence: '接力棒不是一句话，而是一次真正的放手。' },
      { text: '照旧由自己做完全部判断', delta: { clinical: 4, stamina: -5 }, effect: { kind: 'changeHealth', field: 'strain', amount: 3 }, consequence: '查房很稳，但队伍仍习惯等你给答案。' },
    ],
  },
  {
    id: 'era6_succession', stage: 'pinnacle', title: '接班人',
    body: '科室需要新的负责人。你可以扶一位最像自己的人，也可以支持一位与你不同、但更适合下一个时代的人。',
    category: 'career', weight: 100, minTurn: 6, once: true,
    choices: [
      { text: '支持最有临床担当的学生', delta: { relations: 8, reputation: 3 }, flagSet: 'era6_legacy_success', effect: { kind: 'completeBucket', item: 'lastPerson', legacy: 25, completion: 10 }, consequence: '你的方法被继承，也被允许继续变化。' },
      { text: '支持最擅长管理制度的人', delta: { reputation: 5 }, flagSet: 'era6_system_successor', effect: [{ kind: 'completeBucket', item: 'lastPerson', legacy: 20, completion: 10 }, { kind: 'changePolicy', field: 'deptSurplus', amount: 10 }], consequence: '科室离开个人英雄，也能继续运转。' },
      { text: '不表态，让竞争自行决定', delta: { relations: -4, sanity: 2 }, flagSet: 'era6_no_successor', consequence: '你退出了争夺，也留下了一段不确定。' },
    ],
  },
  // —— 巅峰薄节奏：交接前一次科室危机（强制 turn 5）——
  {
    id: 'era6_dept_crisis',
    stage: 'pinnacle',
    title: '缺人的夜班表',
    body: '三名住院医同时请病假。护士长把排班表拍在你桌上："今晚红区谁顶？"你知道自己可以亲自顶，也可以把责任推给还没准备好的年轻人。',
    category: 'career',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 5,
    maxTurn: 5,
    choices: [
      {
        text: '自己顶上去，先把夜班扛住',
        delta: { stamina: -12, clinical: 3, sanity: -4, reputation: 3 },
        flagSet: 'era6_crisis_covered',
        effect: { kind: 'changeHealth', field: 'strain', amount: 4 },
        consequence: '天亮时病房稳住了。年轻医生松了口气，也少练了一回独立判断。',
      },
      {
        text: '让二线学生主责，你远程补位',
        delta: { relations: 4, reputation: 2, stamina: -4, sanity: -2 },
        flagSet: 'era6_crisis_delegated',
        effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 8, completion: 5 },
        consequence: '凌晨两点电话响了两次。学生扛住了——你第一次真的把位置让出去半寸。',
      },
      {
        text: '向上级要支援，宁可缓一缓声誉',
        delta: { relations: -2, reputation: -2, sanity: 3 },
        flagSet: 'era6_crisis_escalated',
        consequence: '院值班调来了支援。科室安全了，也有人私下说你"不像以前那么拼"。',
      },
    ],
  },
  {
    id: 'era7_retirement_day', stage: 'retirement', title: '退休那天',
    body: '门诊系统里的名字被移出排班。抽屉清空后只剩一支旧笔。走出医院时，没有戏剧性的音乐，门口仍有人匆匆赶来看病。',
    category: 'personal', weight: 100, minTurn: 0, maxTurn: 1, once: true,
    choices: [
      { text: '接受退休，重新安排生活', delta: { sanity: 10 }, flagSet: 'era7_accepted_retirement', effect: { kind: 'changeHealth', field: 'strain', amount: -5 }, consequence: '身份退后一步，生活重新出现。' },
      { text: '接受半日返聘', delta: { money: 5000, reputation: 3, stamina: -3 }, flagSet: 'era7_rehired', consequence: '你仍被需要，但不再承担整张排班表。' },
      { text: '频繁回科室看看', delta: { relations: 3, sanity: -3 }, flagSet: 'era7_cannot_leave', consequence: '熟悉的走廊给你安慰，也提醒你位置已经改变。' },
    ],
  },
  {
    id: 'era7_memoir', stage: 'retirement', title: '空白的最后一页',
    body: '旧相册最后一页仍是空白。你决定写下的不只是荣誉，还有误判、遗憾、被帮助的时刻，以及医学没有答案的时候。',
    category: 'personal', weight: 100, minTurn: 3, maxTurn: 6, once: true,
    choices: [
      { text: '认真写完回忆录', delta: { research: 3, sanity: 6 }, flagSet: 'era7_memoir_complete', effect: { kind: 'completeBucket', item: 'memoir', legacy: 30, completion: 20 }, consequence: '书稿完成时，你对自己的一生有了更诚实的版本。' },
      { text: '只整理病例札记交给学生', delta: { clinical: 2, relations: 5 }, flagSet: 'era7_notes_to_students', effect: { kind: 'completeBucket', item: 'memoir', legacy: 20, completion: 15 }, consequence: '没有完整自传，但经验找到了接收者。' },
      { text: '不写了，留在记忆里', delta: { sanity: 2 }, consequence: '不是所有人生都需要出版。' },
    ],
  },
  {
    id: 'era7_old_friends', stage: 'retirement', title: '老同事的电话',
    body: '电话那头的声音比记忆里慢了很多。你们聊起值班室、走廊和那些已经离开的人，也聊今天早餐吃了什么。',
    category: 'social', weight: 100, minTurn: 5, once: true,
    choices: [
      { text: '约一次见面', delta: { sanity: 8, relations: 6 }, flagSet: 'era7_reconnected', effect: { kind: 'completeBucket', item: 'lastPerson', legacy: 5, completion: 10 }, consequence: '见面没有解决衰老，却让孤独短了一截。' },
      { text: '在电话里慢慢聊完', delta: { sanity: 5, relations: 3 }, consequence: '有些陪伴不需要抵达同一间屋子。' },
      { text: '不知道说什么，很快挂断', delta: { sanity: -4 }, consequence: '沉默也是真实的，只是之后更难补上。' },
    ],
  },
  // —— 退休薄节奏：身份抽离（强制 turn 4）——
  {
    id: 'era7_identity_gap',
    stage: 'retirement',
    title: '谁还叫你医生',
    body: '社区诊所里，年轻护士看了眼你的身份证："您是家属吧？"白大褂不在身上时，"医生"两个字突然需要解释。',
    category: 'mental',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 4,
    maxTurn: 4,
    choices: [
      {
        text: '笑着纠正，然后认真听她介绍流程',
        delta: { sanity: 6, relations: 2 },
        flagSet: 'era7_identity_soft',
        effect: { kind: 'completeBucket', item: 'lastPerson', legacy: 5, completion: 8 },
        consequence: '你发现身份可以放下，并不等于一生被抹掉。',
      },
      {
        text: '亮出旧工作证，强调你是谁',
        delta: { reputation: 2, sanity: -4 },
        flagSet: 'era7_identity_clung',
        consequence: '对方连声道歉。你走出门，却觉得那张证件比以前更沉。',
      },
      {
        text: '什么也不说，把号挂完就走',
        delta: { sanity: -2 },
        flagSet: 'era7_identity_quiet',
        consequence: '匿名有时是一种保护。回家后你把旧胸牌收进抽屉最深处。',
      },
    ],
  },
  {
    id: 'era8_fireplace', stage: 'eternity', title: '壁炉前的夜晚',
    body: '冬夜里，你翻到十八岁写下的那句话：“我想学医。”相册最后一页仍然空着，但现在你知道该放什么进去。',
    category: 'personal', weight: 100, minTurn: 0, maxTurn: 1, once: true,
    choices: [
      { text: '继续完成回忆录', delta: { sanity: 6 }, flagSet: 'era8_writing', effect: [{ kind: 'completeBucket', item: 'memoir', legacy: 20, completion: 15 }, { kind: 'consumeEcho', echo: 'remember_初心' }], consequence: '十八岁的句子终于有了下文。' },
      { text: '整理照片，按年份排好', delta: { sanity: 5 }, flagSet: 'era8_photos_sorted', effect: { kind: 'consumeEcho', echo: 'life_photos' }, consequence: '一生被装进几只盒子，也被重新看见。' },
      { text: '给家人打电话，约他们回来', delta: { relations: 8 }, flagSet: 'era8_family_called', effect: { kind: 'completeBucket', item: 'lastPerson', legacy: 5, completion: 10 }, consequence: '有些话要趁彼此都听得见时说。' },
    ],
  },
  {
    id: 'era8_last_record', stage: 'eternity', title: '第一份与最后一份病历',
    body: '第一份病历满是红笔，最后一份简洁而清楚。四十多年被压缩成两叠纸：从不会写，到知道什么必须写下。',
    category: 'career', weight: 100, minTurn: 1, maxTurn: 3, once: true,
    choices: [
      { text: '把它们一起捐给院史馆', delta: { reputation: 4 }, flagSet: 'era8_records_donated', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 12, completion: 10 }, consequence: '错误和成熟被放在一起，这比只留下荣誉更完整。' },
      { text: '拍照留给家人和学生', delta: { relations: 4 }, flagSet: 'era8_records_kept', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 8, completion: 8 }, consequence: '纸张会旧，故事有了新的讲述者。' },
      { text: '妥善销毁涉及隐私的材料', delta: { reputation: 2, sanity: 3 }, flagSet: 'era8_records_destroyed', consequence: '留下什么重要，保护什么同样重要。' },
    ],
  },
  {
    id: 'era8_last_hospital_visit', stage: 'eternity', title: '最后一次回医院',
    body: '新楼、新设备、新面孔。走廊还是那条走廊。你坐在门口长椅上，看年轻医生快步经过，像看见多年前的自己。',
    category: 'career', weight: 100, minTurn: 3, maxTurn: 5, once: true,
    choices: [
      { text: '回曾经工作的科室看看', delta: { reputation: 3, sanity: 5 }, flagSet: 'era8_returned_department', effect: [{ kind: 'completeBucket', item: 'lastVisit', legacy: 15, completion: 12 }, { kind: 'consumeEcho', echo: 'era6_last_round' }], consequence: '科室已经不是你的科室，但有些规矩还在。' },
      { text: '去最初实习的病区', delta: { clinical: 1, sanity: 6 }, flagSet: 'era8_returned_first_ward', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 10, completion: 10 }, consequence: '你记起第一次被叫作“医生”时的慌张。' },
      { text: '只在门口坐一会儿', delta: { sanity: 8 }, flagSet: 'era8_sat_outside', effect: { kind: 'completeBucket', item: 'lastVisit', legacy: 5, completion: 8 }, consequence: '无需再证明什么。看着它继续运转，就够了。' },
    ],
  },
  {
    id: 'era8_last_person', stage: 'eternity', title: '见最后一个人',
    body: '名单上还有一个名字。也许是导师、患者、旧友，或一个你曾经亏欠的人。见面不会改写过去，但可以改变过去如何停留。',
    category: 'social', weight: 100, minTurn: 4, maxTurn: 6, once: true,
    choices: [
      { text: '去见，并把该说的话说完', delta: { relations: 10, sanity: 8 }, flagSet: 'era8_last_person_met', effect: { kind: 'completeBucket', item: 'lastPerson', legacy: 10, completion: 15 }, consequence: '没有宏大的和解，只有两个人终于不再回避。' },
      { text: '写一封信', delta: { sanity: 5 }, flagSet: 'era8_last_letter', effect: { kind: 'completeBucket', item: 'apology', legacy: 5, completion: 12 }, consequence: '信是否抵达并不完全由你决定，写下它仍有意义。' },
      { text: '不去了，接受这份遗憾', delta: { sanity: 1 }, flagSet: 'era8_accepted_regret', consequence: '人生并不因有遗憾而全部失效。' },
    ],
  },
  {
    id: 'era8_will', stage: 'eternity', title: '遗嘱',
    body: '你需要分配财产、资料和最后的决定。这支笔写过处方、病历和论文，现在用来确认谁来替你保管身后的秩序。',
    category: 'financial', weight: 100, minTurn: 5, maxTurn: 7, once: true,
    choices: [
      { text: '照顾家人，并捐出一部分建立奖学金', delta: { money: -10000, relations: 8, reputation: 4 }, flagSet: 'era8_will_balanced', effect: { kind: 'completeBucket', item: 'will', legacy: 20, completion: 18 }, consequence: '家庭与传承不必互相排斥。' },
      { text: '主要留给家人', delta: { relations: 12 }, flagSet: 'era8_will_family', effect: { kind: 'completeBucket', item: 'will', legacy: 5, completion: 15 }, consequence: '你先保证活着的人能安稳生活。' },
      { text: '主要捐给医院或医学院', delta: { money: -20000, reputation: 8 }, flagSet: 'era8_will_medicine', effect: { kind: 'completeBucket', item: 'will', legacy: 25, completion: 15 }, consequence: '一部分积累回到曾经塑造你的地方。' },
      { text: '只做清楚、简洁的分配', delta: { sanity: 8 }, flagSet: 'era8_will_simple', effect: { kind: 'completeBucket', item: 'will', completion: 15 }, consequence: '身后事有了明确边界。' },
    ],
  },
  {
    id: 'era8_final_clarity', stage: 'eternity', title: '最后的清醒',
    body: '十八岁：“我想学医。”现在，所有年份都安静下来，等你为这一生留下最后一句完整的话。',
    category: 'personal', weight: 100, minTurn: 7, maxTurn: 9, once: true,
    choices: [
      { text: '“我这一生，值得。”', delta: { sanity: 10 }, effect: [{ kind: 'setFinalChoice', choice: 'worth_it' }, { kind: 'consumeEcho', echo: 'remember_初心' }], consequence: '这不是说一切都完美，而是你愿意承认它有意义。' },
      { text: '“我尽力了。”', delta: { sanity: 8 }, effect: { kind: 'setFinalChoice', choice: 'did_my_best' }, consequence: '尽力不是退而求其次，是对有限人生的诚实。' },
      { text: '“我把接力棒交出去了。”', delta: { relations: 8 }, effect: { kind: 'setFinalChoice', choice: 'passed_the_baton' }, consequence: '你不再需要亲自完成后来的一切。' },
      { text: '“终于可以休息了。”', delta: { sanity: 10 }, effect: { kind: 'setFinalChoice', choice: 'rest' }, consequence: '休息不再是从工作里偷来的时间。' },
    ],
  },
  {
    id: 'era8_memorial', stage: 'eternity', title: '学生的话',
    body: '身后，学生已经成为新的主任。他在讲台上说：“我的老师曾经告诉我，医学先面对的是人。”你留下的话正在别人的选择里继续。',
    category: 'social', weight: 100, minTurn: 8, maxTurn: 10, once: true,
    choices: [
      { text: '听着这句话被继续讲下去', delta: { reputation: 5 }, flagSet: 'era8_student_remembered', effect: [{ kind: 'consumeEcho', echo: 'era6_legacy_success' }, { kind: 'completeBucket', item: 'tree', legacy: 15, completion: 8 }], consequence: '传承不是复制，而是在新的时代继续作出判断。' },
    ],
  },
  {
    id: 'era8_tombstone', stage: 'eternity', title: '墓碑上的一行字',
    body: '名字和年月已经刻好，只剩一行话。它无法概括一生，只能选择你希望陌生人最先看见的部分。',
    category: 'personal', weight: 100, minTurn: 9, maxTurn: 11, once: true,
    choices: [
      { text: '“这里长眠着一位医生。”', delta: {}, effect: { kind: 'setTombstone', tombstone: 'doctor' }, consequence: '一个朴素、足够完整的身份。' },
      { text: '“他/她曾认真医治许多人。”', delta: {}, effect: { kind: 'setTombstone', tombstone: 'healer' }, consequence: '不写传奇，只写认真。' },
      { text: '“他/她留下的文字仍在帮助后来者。”', delta: {}, effect: { kind: 'setTombstone', tombstone: 'book' }, consequence: '文字比姓名走得更远。' },
      { text: '“一个家人，也是一位老师。”', delta: {}, effect: { kind: 'setTombstone', tombstone: 'family_teacher' }, consequence: '职业之外的关系也被留下。' },
      { text: '“健康所系，性命相托。”', delta: {}, effect: { kind: 'setTombstone', tombstone: 'oath' }, consequence: '誓言回到最初，也停在最后。' },
    ],
  },
];

