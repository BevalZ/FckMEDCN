import type { GameEvent } from './events';

export const PANDEMIC_EVENTS: GameEvent[] = [
  {
    id: 'pandemic_response',
    stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career', 'pinnacle', 'retirement'],
    title: '疫情应急响应',
    body: '不明原因呼吸道传染病病例快速增加。医院取消休假、重排病区，你收到了一份应急安排。',
    category: 'system', weight: 120, once: false, requireFlag: 'pandemic_response_due',
    choices: [
      { text: '进入一线应急队伍', delta: { stamina: -15, sanity: -8, clinical: 8, reputation: 6, money: 1800 }, flagSet: 'pandemic_frontline', effect: { kind: 'clearFlag', flag: 'pandemic_response_due' }, consequence: '你开始在防护服里计算时间，姓名写在护目镜上。' },
      { text: '承担普通诊疗和后方轮班', delta: { stamina: -8, sanity: -4, clinical: 3, relations: 3 }, flagSet: 'pandemic_support', effect: { kind: 'clearFlag', flag: 'pandemic_response_due' }, consequence: '常规病人没有消失，你守住了另一条线。' },
      { text: '因身体或家庭原因申请回避', delta: { sanity: 2, reputation: -3, relations: -2 }, flagSet: 'pandemic_withdrew', effect: { kind: 'clearFlag', flag: 'pandemic_response_due' }, consequence: '申请获批，但科室排班表上留下了一个空格。' },
    ],
  },
  {
    id: 'pandemic_fever_clinic', stage: ['internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'],
    title: '发热门诊长队', body: '候诊区坐满了发热患者。有人缺氧，有人焦虑，也有人只是需要一张复工证明。',
    category: 'clinical', weight: 70, minTurn: 1, requireFlag: 'pandemic_active',
    choices: [
      { text: '按危险分层重新梳理队列', delta: { stamina: -10, clinical: 7, reputation: 4, sanity: -3 }, consequence: '真正危重的人被提前识别，队伍也逐渐安静下来。' },
      { text: '按挂号顺序机械推进', delta: { stamina: -6, clinical: 2, sanity: -5, reputation: -2 }, consequence: '效率看似提高，一名沉默的老人却在等候区突然恶化。' },
    ],
  },
  {
    id: 'pandemic_ppe_shortage', stage: ['internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'],
    title: '防护物资告急', body: '库房通知防护服只够两天。护士站开始计算每一只口罩的去向。',
    category: 'clinical', weight: 58, requireFlag: 'pandemic_active',
    choices: [
      { text: '建立高风险岗位优先清单', delta: { stamina: -5, relations: 5, reputation: 4, sanity: -2 }, consequence: '资源仍然紧张，但分配规则公开而清楚。' },
      { text: '先给自己和熟人留一批', delta: { stamina: 3, relations: -8, reputation: -6, sanity: -4 }, flagSet: 'pandemic_hoarded_ppe', consequence: '你安全了一些，科室里却很快传开了。' },
      { text: '向社会公开求援并登记去向', delta: { stamina: -6, relations: 7, reputation: 6 }, flagSet: 'pandemic_transparent_aid', consequence: '几批物资送到医院，捐赠清单同步贴上了墙。' },
    ],
  },
  {
    id: 'pandemic_colleague_infected', stage: ['internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'],
    title: '同事核酸转阳', body: '交班前，一名与你搭班的同事发来检测结果。排班表立刻少了一个人，你也成了密切接触者。',
    category: 'mental', weight: 50, requireFlag: 'pandemic_active',
    choices: [
      { text: '完成检测后接过剩余班次', delta: { stamina: -14, sanity: -7, relations: 7, reputation: 3 }, consequence: '你把他的名字从排班表上划掉，又把自己的名字写了两遍。' },
      { text: '按感染控制要求隔离观察', delta: { stamina: 5, sanity: -3, relations: -2 }, consequence: '你在房间里盯着工作群，明知隔离正确，仍有负罪感。' },
    ],
  },
  {
    id: 'pandemic_family_isolation', stage: ['guipei', 'master', 'phd', 'jobhunt', 'career', 'pinnacle'],
    title: '不敢回家', body: '你在医院附近找了间房住。视频里家人说一切都好，镜头外却传来孩子问你什么时候回来。',
    category: 'personal', weight: 45, requireFlag: 'pandemic_active',
    choices: [
      { text: '每天固定视频，认真听家里说话', delta: { sanity: 5, relations: 6, stamina: -3 }, consequence: '距离没有消失，但你们仍参与彼此的生活。' },
      { text: '下班后只想关机睡觉', delta: { stamina: 4, sanity: -6, relations: -7 }, consequence: '未接来电越来越多，后来也渐渐少了。' },
    ],
  },
  {
    id: 'pandemic_bed_triage', stage: ['guipei', 'career', 'pinnacle'],
    title: '最后一张监护床', body: '两名患者同时需要监护，病区却只剩一张床。所有人都在等你的分流意见。',
    category: 'clinical', weight: 38, requireFlag: 'pandemic_active',
    choices: [
      { text: '按病情与获益概率公开评估', delta: { clinical: 8, sanity: -10, reputation: 5, stamina: -8 }, flagSet: 'pandemic_triage_protocol', consequence: '决定依然残酷，但每一步都有记录，也能向家属解释。' },
      { text: '把床位留给关系更硬的一方', delta: { money: 4000, sanity: -12, reputation: -8, relations: -5 }, flagSet: 'pandemic_unfair_triage', consequence: '另一名患者被转走。你不再敢看那份转院记录。' },
    ],
  },
  {
    id: 'pandemic_fast_paper', stage: ['master', 'phd', 'career', 'pinnacle'],
    title: '疫情论文窗口', body: '病例数据刚积累起来，期刊已开设快速通道。导师催你“先把结果占住”。',
    category: 'study', weight: 42, requireFlag: 'pandemic_active',
    choices: [
      { text: '完成伦理与数据核验再投稿', delta: { research: 7, reputation: 5, stamina: -12 }, flagSet: 'pandemic_research_clean', consequence: '你错过了最快的一班车，但数据经得起复核。' },
      { text: '先写结论，缺失数据后补', delta: { papers: 1, research: 4, reputation: 4, sanity: -5 }, effect: { kind: 'fake', severity: 'moderate' }, flagSet: 'pandemic_research_rushed', consequence: '文章很快上线，原始表格却留下了越来越多解释不通的空白。' },
    ],
  },
];
