// M2 程序化事件生成器
// 设计目标：用模板工厂为各阶段批量产出"变体事件"，与手写叙事核心（events_*.ts）混合，
// 形成海量事件池。要点：
//  1) 输出的事件 ID / 内容在每次构建时完全一致（确定性），保证 localStorage 存档可恢复、
//     不会出现重复 ID 漂移。
//  2) 通过 weight 的随机化 + requireFlag/excludeFlag/nextEventId 制造随机性与分支逻辑。
//  3) 部分事件用 requireStat 区间实现"按属性决定出现"（呼应引擎已启用的 requireStat）。
//
// 生成器只是"填充量"——真正有叙事重量的剧情在 events_*.ts 的手写事件中。

import type { GameEvent, EventCategory } from './events';

// —— 确定性取数：保证可复现 ——
function pick<T>(arr: readonly T[], i: number, salt = 0): T {
  return arr[((i + salt) % arr.length + arr.length) % arr.length];
}
function hash(i: number, salt: number): number {
  return (Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0;
}
function chance(i: number, salt: number, p: number): boolean {
  return hash(i, salt) % 1000 < p * 1000;
}

// ============================================================
// 临床模板（实习 / 规培 / 职业 共用，按阶段微调数值）
// ============================================================
interface ClinicSpec {
  spec: string;
  complaints: string[];
  mgmt: string;
}
const CLINIC: ClinicSpec[] = [
  { spec: '急诊科', complaints: ['胸痛30分钟', '车祸多发伤', '醉酒昏迷', '高热惊厥', '药物过量'], mgmt: '按流程评估生命体征并呼叫上级' },
  { spec: '骨科', complaints: ['腰痛半年', '摔伤胫骨骨折', '颈椎病复发', '膝关节积液'], mgmt: '拍片并请主治会诊' },
  { spec: '心内科', complaints: ['反复心悸', '活动后气促', '夜间阵发性呼吸困难'], mgmt: '完善心电图与心超' },
  { spec: '呼吸科', complaints: ['咳嗽伴咯血', '持续低烧', '慢阻肺急性加重'], mgmt: '查胸片与肺功能' },
  { spec: '消化内科', complaints: ['黑便三天', '反复反酸', '急性腹痛'], mgmt: '安排胃镜与腹部超声' },
  { spec: '神经内科', complaints: ['突发口角歪斜', '反复头痛', '肢体麻木'], mgmt: '急查头颅CT' },
  { spec: '儿科', complaints: ['患儿高热', '腹泻脱水', '抽搐一次'], mgmt: '评估生长发育与补液' },
  { spec: '妇产科', complaints: ['孕晚期见红', '月经量过多', '下腹剧痛'], mgmt: '请专科会诊' },
  { spec: '皮肤科', complaints: ['全身皮疹', '药物过敏', '顽固性湿疹'], mgmt: '外用联合抗组胺' },
  { spec: '内分泌科', complaints: ['多饮多尿', '甲状腺结节', '低血糖发作'], mgmt: '查血糖与甲功' },
  { spec: '眼科', complaints: ['视力骤降', '眼红流泪', '飞蚊症加重'], mgmt: '眼底检查' },
  { spec: '精神科', complaints: ['失眠三月', '情绪低落', '惊恐发作'], mgmt: '量表评估与晤谈' },
];

const PATIENTS = ['农民工', '退休教师', '外卖骑手', '高中生', '独居老人', '年轻白领', '产后妈妈', '外地务工者'];
const MOODS = ['焦躁地', '虚弱地', '紧握着病历', '家属在旁不停追问', '沉默不语', '反复强调很疼'];

function clinicEvent(stage: string | string[], i: number, kind: 'routine' | 'difficult' | 'emergency'): GameEvent {
  const c = pick(CLINIC, i, 1);
  const complaint = pick(c.complaints, i, 3);
  const patient = pick(PATIENTS, i, 5);
  const mood = pick(MOODS, i, 7);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const id = `gen_${stageKey}_clinic_${kind}_${i}`;
  // 阶段难度系数：数组阶段（如 ['master','phd']）取末位作为代表阶段。
  const primary = Array.isArray(stage) ? stage[stage.length - 1] : stage;
  const stageTune = primary === 'career' ? 1.4 : primary === 'guipei' ? 1.1 : 0.85;

  if (kind === 'routine') {
    const kn = Math.round(4 * stageTune);
    const st = Math.round(6 * stageTune);
    return {
      id, stage,
      title: `${c.spec}：一名${patient}的${complaint}`,
      body: `诊室里，患者${mood}向你主诉"${complaint}"。带教在隔壁。`,
      category: 'clinical' as EventCategory,
      weight: chance(i, 11, 0.12) ? 80 : 25,
      choices: [
        { text: `按规范处置：${c.mgmt}`, delta: { knowledge: kn, reputation: 2, stamina: -st }, flagSet: `seen_${c.spec}`, consequence: '你稳妥地收住了病人。' },
        { text: '先开检查单再评估', delta: { knowledge: Math.round(kn / 2), stamina: -st, money: -20 }, flagSet: `seen_${c.spec}`, consequence: '检查回报后你心里有了底。' },
        { text: '直接请上级医师', delta: { reputation: -1, stamina: 0 }, consequence: '上级三分钟搞定，你记了笔记。' },
      ],
    };
  }
  if (kind === 'difficult') {
    const kn = Math.round(7 * stageTune);
    const rep = Math.round(4 * stageTune);
    return {
      id, stage,
      title: `${c.spec}疑难：鉴别诊断`,
      body: `一位${patient}的症状不典型，${mood}。这是你第几次碰到${c.spec}了。`,
      category: 'clinical' as EventCategory,
      weight: 22,
      requireFlag: `seen_${c.spec}`,
      choices: [
        { text: '列出鉴别诊断并逐一排查', delta: { knowledge: kn, reputation: rep, stamina: -Math.round(8 * stageTune) }, consequence: '你的思路得到了带教肯定。' },
        { text: '照搬上次经验', delta: { knowledge: 1, reputation: -2, stamina: -Math.round(4 * stageTune) }, consequence: '差点漏诊，被提醒了。' },
      ],
    };
  }
  // emergency
  const kn = Math.round(5 * stageTune);
  return {
    id, stage,
    title: `${c.spec}抢救：${complaint}`,
    body: `平车推进来一位${patient}，${mood}——生命体征在飘。`,
    category: 'clinical' as EventCategory,
    weight: chance(i, 13, 0.15) ? 80 : 25,
    choices: [
      { text: '立刻心肺复苏 + 呼叫团队', delta: { knowledge: kn, reputation: 5, stamina: -Math.round(14 * stageTune), sanity: -3 }, consequence: '团队协作把人救了回来。' },
      { text: '先建立静脉通路再评估', delta: { knowledge: Math.round(kn / 2), stamina: -Math.round(10 * stageTune), sanity: -2 }, consequence: '节奏稍慢但稳住了。' },
      { text: '慌了，站到一边', delta: { reputation: -4, sanity: -8, stamina: -4 }, consequence: '你被排在后面，事后很自责。' },
    ],
  };
}

// 夜班 / 过劳（requireStat 演示：低 sanity 时更易触发崩溃向事件）
function nightShiftEvent(stage: string | string[], i: number): GameEvent {
  const c = pick(CLINIC, i, 9);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const id = `gen_${stageKey}_night_${i}`;
  const low = chance(i, 21, 0.25);
  return {
    id, stage,
    title: `夜班·第${pick([2, 3, 4], i, 2)}个不眠夜`,
    body: `凌晨三点，你刚躺下又被呼叫。${c.spec}又来了一个${pick(c.complaints, i, 4)}。`,
    category: 'clinical' as EventCategory,
    weight: 22,
    ...(low ? { requireStat: { sanity: [0, 35] } as Partial<Record<string, [number, number]>> } : {}),
    choices: [
      { text: '爬起来再撑一轮', delta: { stamina: -10, knowledge: 2, sanity: low ? -6 : -3 }, consequence: '你盯着天花板到天亮。' },
      { text: '让同组替你顶一下', delta: { relations: -2, sanity: 1 }, consequence: '欠了一次人情。' },
      ...(low ? [{ text: '蹲在楼梯间喘口气', delta: { sanity: 4, stamina: -4 }, consequence: '你给家里发了条"没事"的消息。' } as const] : []),
    ],
  };
}

// ============================================================
// 学习 / 科研模板（本科 / 硕博）
// ============================================================
const UG_TOPICS = ['系解', '生理', '生化', '病理', '药理', '免疫', '微生物', '内科', '外科', '公共卫生'];
const UG_ACT = ['随堂测验', '小组汇报', '图书馆自习', '实验报告', '期末复习', '网课打卡', '病例讨论'];
const PHD_TOPICS = ['课题立项', '细胞实验', '动物模型', '数据建模', '文献综述', '组会汇报', '基金申请', '论文返修', '预实验', '统计分析'];
const PHD_ACT = ['跑胶', '养细胞', '写方法学', '补实验', '改图表', '回复审稿意见', '伦理审查', '预答辩'];

function studyEvent(stage: string | string[], i: number): GameEvent {
  const isPhd = Array.isArray(stage) ? (stage.includes('master') || stage.includes('phd')) : stage === 'master_phd';
  const topics = isPhd ? PHD_TOPICS : UG_TOPICS;
  const acts = isPhd ? PHD_ACT : UG_ACT;
  const topic = pick(topics, i, 1);
  const act = pick(acts, i, 3);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const id = `gen_${stageKey}_study_${i}`;
  const kn = isPhd ? 6 : 5;
  const st = isPhd ? 7 : 5;
  return {
    id, stage,
    title: `${topic}·${act}`,
    body: `${act}的截止就在眼前。${isPhd ? '师兄说这组数很重要。' : '室友已经在图书馆占好座了。'}`,
    category: 'study' as EventCategory,
    weight: chance(i, 31, 0.1) ? 80 : 25,
    choices: [
      { text: '专注完成', delta: { knowledge: kn, stamina: -st, sanity: -1 }, consequence: '又啃下一块硬骨头。' },
      { text: '熬夜赶工', delta: { knowledge: Math.round(kn * 1.4), stamina: -Math.round(st * 2), sanity: -5 }, consequence: '黑眼圈又重了。' },
      { text: '战略性放弃', delta: { knowledge: 1, sanity: 3, reputation: -1 }, consequence: '你安慰自己"下次再说"。' },
    ],
  };
}

// ============================================================
// 求职模板（jobhunt）
// ============================================================
const CITIES = ['南柠', '华溪', '协哈', '云港', '江城', '滨海', '麓城', '临江'];
const HOSP_LEVEL = ['三甲', '市属三甲', '区人民', '县医院', '民营专科', '社区中心'];
const POST_ROLE = ['临床医师', '规培学员', '研究岗', '急诊医师', '全科医生', '超声科'];

function jobEvent(stage: string | string[], i: number): GameEvent {
  const city = pick(CITIES, i, 1);
  const lvl = pick(HOSP_LEVEL, i, 3);
  const role = pick(POST_ROLE, i, 5);
  const id = `gen_${stage}_job_${i}`;
  const contract = chance(i, 41, 0.4);
  return {
    id, stage,
    title: `${city}·${lvl}招${role}`,
    body: `一则招聘挂在官网："${lvl}招聘${role}若干，${contract ? '合同制' : '纳入编制'}。"`,
    category: 'career' as EventCategory,
    weight: 25,
    choices: [
      { text: '认真准备简历投递', delta: { reputation: 2, stamina: -4, relations: 1 }, flagSet: `applied_${city}`, consequence: '你按岗位要求改了三版简历。' },
      { text: '托导师推荐', delta: { reputation: 4, relations: -2 }, consequence: '导师一句话顶你十封邮件。' },
      { text: '看看薪资再说', delta: { sanity: 1 }, consequence: '月薪那一栏写着"面议"。' },
      ...(contract ? [{ text: '犹豫：合同制没编制', delta: { sanity: -2, money: 0 }, consequence: '你想起新闻里"博士也合同制"的讨论。' } as const] : []),
    ],
  };
}

// ============================================================
// 生成调度
// ============================================================
function buildStage(stage: string | string[], plan: { routine: number; difficult: number; emergency: number; night: number; study: number; job: number }): GameEvent[] {
  const out: GameEvent[] = [];
  let k = 0;
  for (let i = 0; i < plan.routine; i++) out.push(clinicEvent(stage, k++, 'routine'));
  for (let i = 0; i < plan.difficult; i++) out.push(clinicEvent(stage, k++, 'difficult'));
  for (let i = 0; i < plan.emergency; i++) out.push(clinicEvent(stage, k++, 'emergency'));
  for (let i = 0; i < plan.night; i++) out.push(nightShiftEvent(stage, i));
  for (let i = 0; i < plan.study; i++) out.push(studyEvent(stage, i));
  for (let i = 0; i < plan.job; i++) out.push(jobEvent(stage, i));
  return out;
}

export const GENERATED_EVENTS: GameEvent[] = [
  // 本科：仅课堂/实验/见习（观察），不接触病人、不抢救。
  ...buildStage('undergrad', { routine: 0, difficult: 0, emergency: 0, night: 0, study: 500, job: 0 }),
  // 实习：在带教监督下接触病人、可参与抢救，但非主导。
  ...buildStage('internship', { routine: 450, difficult: 150, emergency: 100, night: 80, study: 0, job: 0 }),
  // 规培：临床一线，独立管理病人、参与抢救。
  ...buildStage('guipei', { routine: 550, difficult: 200, emergency: 100, night: 120, study: 0, job: 0 }),
  // 硕博：按学制分两条线（临床型/科研型由 track_clinical / track_research 标记区分）。
  // 注意：阶段名用 ['master','phd'] 数组，使两个场景都能取到（原 'master_phd' 不会被匹配）。
  ...buildStage(['master', 'phd'], { routine: 400, difficult: 150, emergency: 80, night: 100, study: 0, job: 0 })
    .map(e => ({ ...e, excludeFlag: 'track_research' })),
  ...buildStage(['master', 'phd'], { routine: 0, difficult: 0, emergency: 0, night: 0, study: 600, job: 0 })
    .map(e => ({ ...e, excludeFlag: 'track_clinical' })),
  ...buildStage('jobhunt', { routine: 0, difficult: 0, emergency: 0, night: 0, study: 0, job: 500 }),
  // 职业：临床一线，抢救常态化。
  ...buildStage('career', { routine: 550, difficult: 200, emergency: 100, night: 120, study: 0, job: 0 }),
];
