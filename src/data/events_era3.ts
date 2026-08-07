import type { GameEvent } from './events';

// 时代3主线：每个事件只承担一个清晰的压力决策，具体压力与进度由 era3.ts 统一结算。
// 现实注脚不写入未经核验的精确统计；事件正文只保留玩家能体验到的制度与生活压力。
export const ERA3_EVENTS: GameEvent[] = [
  {
    id: 'era3_first_day', stage: 'guipei', title: '入培第一天',
    body: '胸牌上的“实习医生”换成了“住院医师”。你仍然知道自己有很多不会，但今晚的病房不会因为这个事实而暂停。',
    category: 'clinical', weight: 115, once: true,
    choices: [
      { text: '先向上级和护士站报到，问清交接规则', delta: { sanity: 2, clinical: 3 }, effect: [{ kind: 'changeEra3Mentor', amount: 8 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: -4 }], flagSet: 'confident_resident', consequence: '你没有装作无所不知，而是先把团队的边界问清楚。' },
      { text: '把今天的任务写成清单，先从最小的一步开始', delta: { knowledge: 2, clinical: 2 }, effect: [{ kind: 'changeEra3Mentor', amount: 4 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: -2 }], flagSet: 'humble_resident', consequence: '紧张没有消失，但它被拆成了一件件可完成的事。' },
      { text: '躲进值班室，等别人安排', delta: { sanity: -4, clinical: -2 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: 5 }, { kind: 'changeEra3QuitThoughts', amount: 1 }], flagSet: 'quiet_resident', consequence: '你暂时避开了目光，也错过了建立第一印象的机会。' },
    ],
  },
  {
    id: 'era3_first_independent_shift', stage: 'guipei', title: '第一次独立值班',
    body: '夜里，病房的呼叫铃一个接一个。你可以先去现场评估，也可以先向上级汇报。真正困难的不是“敢不敢”，而是知道什么时候必须求助。',
    category: 'clinical', weight: 105, minTurn: 2, once: true,
    choices: [
      { text: '先到床旁评估，再把关键信息向上级汇报', delta: { clinical: 7, stamina: -10, sanity: -3, reputation: 3 }, effect: [{ kind: 'advanceEra3Residency', cases: 4, nightShifts: 1, evaluation: 7 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 8 }], flagSet: 'era3_independent_shift', consequence: '你没有把“独立”误解成“不能求助”。天亮交班时，至少每个决定都有记录。' },
      { text: '遇到不确定的情况立即请示，并留下交接记录', delta: { clinical: 3, stamina: -6, sanity: 1 }, effect: [{ kind: 'advanceEra3Residency', cases: 3, nightShifts: 1, evaluation: 4 }, { kind: 'changeEra3Mentor', amount: 5 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 4 }], flagSet: 'era3_asks_for_help', consequence: '上级说：“会判断什么时候叫人，也是能力。”' },
      { text: '凭印象快速处理，尽量不打电话', delta: { clinical: -5, stamina: -12, sanity: -8, reputation: -4 }, effect: [{ kind: 'advanceEra3Residency', cases: 2, nightShifts: 1, evaluation: -6 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 12 }, { kind: 'changeEra3QuitThoughts', amount: 1 }], flagSet: 'era3_shift_rushed', consequence: '你熬到交班，却发现“看起来处理过”和“真正闭环”不是一回事。' },
    ],
  },
  {
    id: 'era3_first_mentor_meeting', stage: ['master', 'phd'], title: '导师的第一次组会',
    body: '导师把临床轮转、论文、学位要求写在同一张白板上。白板不大，任务却没有一项愿意让路。',
    category: 'study', weight: 110, once: true,
    choices: [
      { text: '把临床时间表拿出来，和导师一起排优先级', delta: { research: 4, sanity: 2 }, effect: [{ kind: 'changeEra3Mentor', amount: 10 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 8 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: -3 }], flagSet: 'era3_dual_identity_plan', consequence: '你第一次把“我做不到同时满分”说出了口，导师也不得不面对现实排班。' },
      { text: '先答应下来，回去再想办法', delta: { research: 5, stamina: -8, sanity: -5 }, effect: [{ kind: 'changeEra3Mentor', amount: 5 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 15 }], flagSet: 'era3_overpromised', consequence: '会议结束得很顺利，真正的代价从今晚才开始。' },
      { text: '明确说明：临床轮转期间需要可执行的科研目标', delta: { research: 2, relations: 2 }, effect: [{ kind: 'changeEra3Mentor', amount: -4 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 5 }], flagSet: 'era3_set_boundary', consequence: '导师皱了皱眉，但你至少没有把自己承诺给一张无法兑现的时间表。' },
    ],
  },
  {
    id: 'era3_first_salary', stage: 'guipei', title: '第一个月的工资',
    body: '到账短信弹出。你回想起这个月的夜班、病历和通勤，再看看余额：这是一笔收入，却不像一份完整工作的收入。',
    category: 'financial', weight: 95, minTurn: 2, once: true,
    choices: [
      { text: '给家里报平安，先把支出压到最低', delta: { money: -300, sanity: 2, relations: 4 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: 2 }], flagSet: 'era3_budgeted', consequence: '你把外卖换成食堂，把“以后再说”改成了本月预算。' },
      { text: '请值班同事吃一顿，换一张互相照应的网', delta: { money: -800, relations: 8, sanity: 3 }, effect: [{ kind: 'changeEra3Mentor', amount: 3 }], flagSet: 'era3_bought_dinner', consequence: '饭不贵，但有人记住了：你愿意在难的时候和大家坐在一起。' },
      { text: '盯着数字发呆：我到底图什么？', delta: { sanity: -8, stamina: -3 }, effect: [{ kind: 'changeEra3QuitThoughts', amount: 1 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 4 }], flagSet: 'era3_income_shock', consequence: '这个问题没有在工资条上消失，反而变得更清楚。' },
    ],
  },
  {
    id: 'era3_independent_beds', stage: 'guipei', title: '第一次独立管床',
    body: '八张床同时落到你名下。你必须决定先看谁、先写什么、哪些事情必须现在交给上级。',
    category: 'clinical', weight: 95, minTurn: 3, once: true,
    choices: [
      { text: '先处理最不稳定的患者，再补常规病历', delta: { clinical: 8, stamina: -12, reputation: 3 }, effect: [{ kind: 'advanceEra3Residency', cases: 8, evaluation: 8 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 8 }], flagSet: 'era3_prioritized_safety', consequence: '有人抱怨等待，但危重患者没有被顺序表耽误。' },
      { text: '按床号推进，尽量让每件事都留下痕迹', delta: { clinical: 4, knowledge: 3, stamina: -10 }, effect: [{ kind: 'advanceEra3Residency', cases: 8, evaluation: 3 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 6 }], consequence: '流程很整齐，可临床现场从来不只按床号排队。' },
      { text: '先把病历模板填满，再去看患者', delta: { knowledge: 3, clinical: -4, stamina: -8, sanity: -5 }, effect: [{ kind: 'advanceEra3Residency', cases: 5, evaluation: -5 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 10 }], consequence: '电脑上的空白少了，床旁真正需要你的时间也少了。' },
    ],
  },
  {
    id: 'era3_first_complaint', stage: 'guipei', title: '第一次被投诉',
    body: '医务科通知你去说明情况。家属认为你查房时态度冷淡；你记得那天自己已经连续工作到凌晨。',
    category: 'social', weight: 85, minTurn: 4, once: true,
    choices: [
      { text: '承认表达有问题，说明事实并提出改进', delta: { reputation: -2, sanity: -3, relations: 4 }, effect: [{ kind: 'changeEra3Mentor', amount: 4 }], flagSet: 'apologized_complaint', consequence: '道歉不是承认所有指责都正确，而是把患者感受到的伤害认真接住。' },
      { text: '只解释工作量，拒绝讨论沟通方式', delta: { reputation: -4, sanity: -6, relations: -3 }, flagSet: 'explained_complaint', consequence: '你说的都是真的，但没有回答对方为什么感到被忽视。' },
      { text: '在医务科情绪崩溃，暂时离开现场', delta: { reputation: -3, sanity: -15, stamina: -8 }, effect: [{ kind: 'changeEra3QuitThoughts', amount: 1 }], flagSet: 'broke_down_complaint', consequence: '你需要先把自己从警报状态里救出来，才有力气处理下一件事。' },
    ],
  },
  {
    id: 'era3_residency_countdown', stage: 'guipei', title: '规培进度报告',
    body: '手册上是轮转、病例和操作的计数。进度在走，论文却几乎没有动——两个身份都在提醒你：时间只有一份。',
    category: 'system', weight: 90, minTurn: 5, once: true,
    choices: [
      { text: '先补临床缺口', delta: { clinical: 6, stamina: -10 }, effect: [{ kind: 'advanceEra3Residency', rotations: 2, cases: 15, procedures: 8, evaluation: 5 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 8 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 4 }], flagSet: 'era3_clinical_first', consequence: '轮转表好看了一些，论文 deadline 也更近了。' },
      { text: '先把论文推进起来', delta: { research: 7, stamina: -12, sanity: -4 }, effect: [{ kind: 'advanceEra3Research', paper: 18, thesis: 12 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 10 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 5 }], flagSet: 'era3_research_first', consequence: '你终于有了可以交给导师看的东西，但临床欠账没有消失。' },
      { text: '向培训秘书和导师申请重新排计划', delta: { sanity: 3, relations: 3 }, effect: [{ kind: 'changeEra3Mentor', amount: 5 }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: -3 }, { kind: 'changeEra3Pressure', axis: 'research', amount: -3 }], flagSet: 'era3_replanned', consequence: '不是所有安排都能改变，但把冲突摆到桌面上，总比一个人硬扛好。' },
    ],
  },
  {
    id: 'era3_paper_deadline', stage: ['guipei', 'master', 'phd'], title: '论文的 deadline',
    body: '导师要初稿。白天的临床工作不会少，夜里的文档也不会自己长出结果。你只能决定把哪一部分风险留到以后。',
    category: 'study', weight: 90, minTurn: 5, once: true,
    choices: [
      { text: '挤出所有碎片时间写完', delta: { research: 8, stamina: -15, sanity: -5 }, effect: [{ kind: 'advanceEra3Research', paper: 22, thesis: 12 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 12 }], flagSet: 'era3_deadline_grind', consequence: '初稿交出去了，代价是连续几天只靠咖啡把自己撑起来。' },
      { text: '和导师谈一个可执行的延期与里程碑', delta: { research: 4, sanity: 2, relations: 2 }, effect: [{ kind: 'advanceEra3Research', paper: 12, thesis: 8 }, { kind: 'changeEra3Mentor', amount: 5 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 3 }], flagSet: 'era3_deadline_negotiated', consequence: '延期没有让任务消失，却把它从一场突袭变成了几段可检查的工作。' },
      { text: '请同门帮你核对数据和结构', delta: { research: 5, relations: 5, stamina: -7 }, effect: [{ kind: 'advanceEra3Research', paper: 15, thesis: 10 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 6 }], flagSet: 'era3_peer_support', consequence: '你没有把论文外包，只是承认一个人不该承担所有校对工作。' },
    ],
  },
  {
    id: 'era3_patient_thanks', stage: ['guipei', 'master', 'phd'], title: '患者深夜的感谢',
    body: '值班结束时，桌上多了一杯热饮和一张纸条：“谢谢你愿意多听我说两分钟。”它不能抵消疲惫，却让疲惫有了名字。',
    category: 'social', weight: 34, minTurn: 5, once: true,
    choices: [
      { text: '把纸条收进白大衣口袋', delta: { sanity: 12, reputation: 2 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: -5 }], flagSet: 'era3_patient_thanks', consequence: '你没有因此变得无坚不摧，但今晚愿意再把下一位患者听完。' },
      { text: '和当班护士分享这点光', delta: { sanity: 8, relations: 6 }, effect: [{ kind: 'changeEra3Mentor', amount: 3 }], consequence: '这份感谢没有停在你一个人手里。' },
    ],
  },
  {
    id: 'era3_peer_comparison', stage: ['guipei', 'master', 'phd'], title: '同期生的朋友圈',
    body: '同龄人晒新工作、旅行和房子的首付。你刚结束一轮夜班，打开电脑还要改论文。',
    category: 'mental', weight: 65, minTurn: 6, once: true,
    choices: [
      { text: '关掉手机，睡够这一觉', delta: { sanity: 5, stamina: 5 }, flagSet: 'ignored_peer_pressure', consequence: '你没有解决人生比较，但至少没有把今晚的睡眠也交出去。' },
      { text: '认真算一遍自己的支出和未来选择', delta: { knowledge: 2, sanity: -5 }, effect: [{ kind: 'changeEra3QuitThoughts', amount: 1 }], flagSet: 'calculated_escape', consequence: '逃离不再只是情绪，而成了一个需要信息、预算和计划的选项。' },
      { text: '在同期群里说一句“我最近也有点撑不住”', delta: { relations: 7, sanity: 4 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: -3 }, { kind: 'changeEra3Pressure', axis: 'research', amount: -3 }], flagSet: 'era3_peer_opened_up', consequence: '群里沉默了几秒，随后冒出好几个“我也是”。' },
    ],
  },
  {
    id: 'era3_midterm_assessment', stage: ['master', 'phd'], title: '中期考核',
    body: '临床技能、理论和科研进展被放在同一张评分表上。考核不是对某一个夜晚的审判，而是过去一年所有取舍的总和。',
    category: 'career', weight: 105, minTurn: 6, once: true,
    choices: [
      { text: '按当前状态参加考核', delta: { stamina: -8, sanity: -3 }, effect: [{ kind: 'resolveEra3Assessment', assessment: 'midterm' }], flagSet: 'era3_midterm_taken', consequence: '结果会写进培养记录。你终于看见这段路目前留下的分数。' },
      { text: '先补一个月短板，再参加考核', delta: { stamina: -14, sanity: -5, knowledge: 3, clinical: 3, research: 3 }, effect: [{ kind: 'advanceEra3Residency', evaluation: 5 }, { kind: 'advanceEra3Research', paper: 8, thesis: 8 }, { kind: 'resolveEra3Assessment', assessment: 'midterm' }], flagSet: 'era3_midterm_prepared', consequence: '你把考核往后推了一点，也把几个明显的漏洞补上了。' },
    ],
  },
  {
    id: 'era3_paper_submission', stage: ['master', 'phd'], title: '论文投稿',
    body: '投稿系统的“提交”按钮近在眼前。高目标可能换来更大的回报，也可能把最后几个月的缓冲一起押上。',
    category: 'career', weight: 95, minTurn: 8, once: true,
    choices: [
      { text: '投更高目标的期刊', delta: { research: 5, stamina: -8, sanity: -4 }, effect: [{ kind: 'resolveEra3Submission', tier: 'ambitious' }], flagSet: 'era3_ambitious_submission', consequence: '你按下提交。接下来只能等待审稿意见。' },
      { text: '选择要求更匹配、风险更可控的期刊', delta: { research: 3, sanity: 2 }, effect: [{ kind: 'resolveEra3Submission', tier: 'safe' }], flagSet: 'era3_safe_submission', consequence: '它未必最耀眼，但更像一条能在截止日前走完的路。' },
    ],
  },
  {
    id: 'era3_deadline_storm', stage: ['master', 'phd'], title: '结业前的多重 deadline',
    body: '结业考、论文修改、轮转收尾和求职同时来到门口。你不可能让四件事都获得同样多的时间。',
    category: 'career', weight: 95, minTurn: 9, once: true,
    choices: [
      { text: '优先结业考，先确保资格', delta: { knowledge: 6, clinical: 2, research: -2, stamina: -12 }, effect: [{ kind: 'changeEra3Pressure', axis: 'research', amount: 8 }], flagSet: 'era3_exam_first', consequence: '论文慢了一点，但你先守住了继续行医的门槛。' },
      { text: '优先论文，赌一次学术跃迁', delta: { research: 7, papers: 1, knowledge: -1, stamina: -14, sanity: -5 }, effect: [{ kind: 'advanceEra3Research', paper: 20, thesis: 18 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 10 }], flagSet: 'era3_paper_first', consequence: '论文有了形状，结业考的倒计时也更刺眼。' },
      { text: '按风险排序，给每项保留最低完成线', delta: { knowledge: 3, clinical: 3, research: 3, stamina: -10, sanity: -2 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: 4 }, { kind: 'changeEra3Pressure', axis: 'research', amount: 4 }], flagSet: 'era3_balanced_deadlines', consequence: '这不是漂亮的胜利，而是把四个可能的崩盘压成了四个还可修补的问题。' },
    ],
  },
  {
    id: 'era3_peer_crisis', stage: ['master', 'phd'], title: '同期生的缺席',
    body: '群里传来消息：一位同期因严重心理危机暂时离开轮转，正在接受家人和专业人员的支持。值班室突然安静下来。',
    category: 'mental', weight: 48, minTurn: 8, once: true,
    choices: [
      { text: '联系心理中心或当地专业援助服务，先照顾自己的反应', delta: { sanity: 14, relations: 2 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: -5 }, { kind: 'changeEra3Pressure', axis: 'research', amount: -5 }], flagSet: 'era3_sought_support', consequence: '求助不是把事情夸大，而是承认这件事已经超出一个人独自消化的范围。' },
      { text: '给同期发消息，约一个不谈绩效的夜宵', delta: { sanity: 10, relations: 8 }, effect: [{ kind: 'changeEra3Mentor', amount: 2 }], flagSet: 'era3_peer_support', consequence: '你们没有给彼此开药方，只是确保对方今晚不是一个人。' },
      { text: '告诉家里：最近真的很累', delta: { sanity: 10, relations: 6 }, flagSet: 'era3_family_support', consequence: '电话那头沉默了一会儿，然后说：“先睡觉，其他的明天再想。”' },
    ],
  },
  {
    id: 'era3_completion_assessment', stage: ['master', 'phd'], title: '结业考核',
    body: '理论、技能和病例分析轮番进行。考官最后说：“恭喜你，医生。”这句话的重量，来自之前每一次不确定时仍然寻求确认。',
    category: 'career', weight: 110, minTurn: 10, once: true,
    choices: [
      { text: '稳住节奏，按当前状态完成考核', delta: { stamina: -10, sanity: -2 }, effect: [{ kind: 'resolveEra3Assessment', assessment: 'completion' }], flagSet: 'era3_completion_taken', consequence: '成绩还没有公布，但你知道自己已经把能准备的都带进了考场。' },
      { text: '最后冲刺理论和技能短板', delta: { knowledge: 4, clinical: 4, stamina: -16, sanity: -4 }, effect: [{ kind: 'advanceEra3Residency', evaluation: 6 }, { kind: 'resolveEra3Assessment', assessment: 'completion' }], flagSet: 'era3_completion_prepared', consequence: '你用最后一段力气换来更熟的手感，也承认这种换取有边界。' },
    ],
  },
  {
    id: 'era3_three_year_review', stage: ['master', 'phd'], title: '三年之约',
    body: '值班室柜子里还放着入培第一天的白大衣。你把规培、论文、夜班和那些没有记录的眼泪，放在同一张回顾表上。',
    category: 'career', weight: 105, minTurn: 11, once: true,
    choices: [
      { text: '如果再选一次，我仍然会来', delta: { sanity: 8, reputation: 3 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: -8 }, { kind: 'changeEra3Pressure', axis: 'research', amount: -8 }], flagSet: 'no_regret_residency', consequence: '不是因为这条路轻松，而是你终于知道自己为什么留下。' },
      { text: '我做到了，但还不确定值不值得', delta: { sanity: 3 }, flagSet: 'mixed_feelings_residency', consequence: '成就感和怀疑可以同时存在。你不必在今天替未来作答。' },
      { text: '我终于可以离开这里了', delta: { sanity: 12 }, effect: [{ kind: 'changeEra3QuitThoughts', amount: 2 }], flagSet: 'relieved_to_leave', consequence: '轻松不是背叛。它只是你的身体终于收到了结束的通知。' },
    ],
  },
  {
    id: 'era3_exit_crossroads', stage: ['guipei', 'master', 'phd'], title: '留下、延期，还是离开',
    body: '你把培养要求、收入和身心状态列在纸上。离开不是一句气话，留下也不自动等于勇敢；现在需要的是一个可承担的决定。',
    category: 'career', weight: 58, minTurn: 4, once: true,
    choices: [
      { text: '申请退出规培，转向医疗相关工作', delta: { sanity: 12, money: 5000 }, effect: [{ kind: 'setEra3Flag', flag: 'left_med' }], consequence: '你把退出申请交了上去。那一刻没有烟花，只有一种迟来的安静。' },
      { text: '保留学籍，申请延期并接受支持', delta: { sanity: -2, stamina: -4 }, effect: [{ kind: 'setEra3Flag', flag: 'era3_extended' }, { kind: 'changeEra3QuitThoughts', amount: -1 }], flagSet: 'delayed', consequence: '延期是缓冲，不是免费重来。你给自己争取了时间，也接受了时间的成本。' },
      { text: '先不做终局决定，找导师/家人/专业人员一起评估', delta: { sanity: 8, relations: 4 }, effect: [{ kind: 'changeEra3QuitThoughts', amount: -1 }], flagSet: 'era3_decision_supported', consequence: '把决定交给支持网络共同讨论，仍然是你在做决定。' },
    ],
  },
  {
    id: 'era3_sleep_error', stage: ['guipei', 'master', 'phd'], title: '睡眠剥夺下的差点出错',
    body: '连续几天没有睡够后，你在晨间核对时发现一处记录和患者不匹配。错误被及时拦住，但你第一次清楚看见：疲惫本身就是风险。',
    category: 'clinical', weight: 46, minTurn: 3, requireFlag: 'era3_sleep_warning', once: true,
    choices: [
      { text: '主动上报近失误，申请调整排班并复盘', delta: { reputation: 2, relations: 3, sanity: -2 }, effect: [{ kind: 'recordEra3MedicalError' }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: -12 }], flagSet: 'era3_near_miss_reported', consequence: '你没有等到真正伤害发生才承认系统已经亮红灯。' },
      { text: '当作没发生，继续把今天撑完', delta: { reputation: -4, sanity: -10, stamina: -8 }, effect: [{ kind: 'recordEra3MedicalError' }, { kind: 'changeEra3Pressure', axis: 'clinical', amount: 8 }], flagSet: 'era3_near_miss_hidden', consequence: '短期看起来平稳，长期却让你更不敢相信自己的状态。' },
      { text: '停止当前工作，立即寻求上级和专业支持', delta: { sanity: 8, stamina: 4 }, effect: [{ kind: 'changeEra3Pressure', axis: 'clinical', amount: -15 }], flagSet: 'era3_safety_stop', consequence: '暂停不是失职。一个不能安全工作的人，需要先被照顾。' },
    ],
  },
];
