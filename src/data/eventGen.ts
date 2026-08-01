// M2 程序化事件生成器
// 设计目标：用模板工厂为各阶段批量产出"变体事件"，与手写叙事核心（events_*.ts）混合，
// 形成海量事件池。要点：
//  1) 输出的事件 ID / 内容在每次构建时完全一致（确定性），保证 localStorage 存档可恢复、
//     不会出现重复 ID 漂移。
//  2) 通过 weight 的随机化 + requireFlag/excludeFlag/nextEventId 制造随机性与分支逻辑。
//  3) 部分事件用 requireStat 区间实现"按属性决定出现"（呼应引擎已启用的 requireStat）。
//
// 生成器只是"填充量"——真正有叙事重量的剧情在 events_*.ts 的手写事件中。
//
// 患者多样性：患者不再是 8 个固定标签，而是由 patientType.ts 的数十种真实患者档案驱动。
// 每种患者带交互特质（费用敏感/沟通障碍/家属在场/诉讼倾向/依从性差/孤独/苛刻），
// 生成器据此动态追加不同的可用选项——同样的病情，面对不同的患者能做的选择不一样。
// 另有"病房互访"模板：查房/探视类事件，同样按患者特质出选项。

import type { GameEvent, EventCategory, EventChoice } from './events';
import type { PatientArchetype } from './patientType';
import { patientAt } from './patientType';
import { createCharacter } from './npcGen';

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

// 患者交互特质 → 追加的可用选项。
// 让"同样的病情、不同的患者"给出不同的交互面：经济、沟通、家属、诉讼、依从、孤独、苛刻。
function traitChoices(a: PatientArchetype, stageTune: number): EventChoice[] {
  const out: EventChoice[] = [];
  const st = (n: number) => -Math.round(n * stageTune);
  if (a.traits.costSensitive) {
    out.push({
      text: '考虑费用，用最经济的方案',
      delta: { relations: 2, money: -20, knowledge: 1, stamina: st(3) },
      consequence: '你替他把账算明白了，他松了一口气。',
    });
  }
  if (a.traits.communicationBarrier) {
    out.push({
      text: '放慢语速，用纸笔/手势多解释几遍',
      delta: { relations: 2, stamina: st(4) },
      consequence: '他终于听懂了，朝你点了点头。',
    });
  }
  if (a.traits.familyInvolved) {
    out.push({
      text: '把家属叫进来一起交代',
      delta: { relations: 2, stamina: st(3) },
      consequence: '家属握住你的手，连声道谢。',
    });
  }
  if (a.traits.litigious) {
    out.push({
      text: '措辞谨慎，把风险都说清楚',
      delta: { reputation: 1, stamina: st(3), sanity: -1 },
      consequence: '他盯着你看了一会儿，没再多说。',
    });
  }
  if (a.traits.nonCompliant) {
    out.push({
      text: '反复叮嘱按时服药、定期复查',
      delta: { knowledge: 1, stamina: st(3), relations: 1 },
      consequence: '你在他病历本首页写下大大的"随访"。',
    });
  }
  if (a.traits.lonely) {
    out.push({
      text: '多陪他聊了几句，听听以前的事',
      delta: { sanity: 3, relations: 2, stamina: st(2) },
      consequence: '他笑了，说你像他年轻时认识的一个人。',
    });
  }
  if (a.traits.demanding) {
    out.push({
      text: '耐着性子，一条条回答他的问题',
      delta: { reputation: 2, stamina: st(4), sanity: -2 },
      consequence: '他满意地点头，放你走了。',
    });
  }
  return out;
}

function clinicEvent(stage: string | string[], i: number, kind: 'routine' | 'difficult' | 'emergency'): GameEvent {
  const c = pick(CLINIC, i, 1);
  const complaint = pick(c.complaints, i, 3);
  const arch = patientAt(i, 5);
  const patient = arch.name;
  const mood = pick(arch.personality, i, 7);
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
      body: `诊室里，患者${mood}，向你主诉"${complaint}"。${arch.profile}带教在隔壁。`,
      category: 'clinical' as EventCategory,
      weight: chance(i, 11, 0.12) ? 80 : 25,
      choices: [
        { text: `按规范处置：${c.mgmt}`, delta: { knowledge: kn, reputation: 2, stamina: -st }, flagSet: `seen_${c.spec}`, consequence: '你稳妥地收住了病人。' },
        { text: '先开检查单再评估', delta: { knowledge: Math.round(kn / 2), stamina: -st, money: -20 }, flagSet: `seen_${c.spec}`, consequence: '检查回报后你心里有了底。' },
        { text: '直接请上级医师', delta: { reputation: -1, stamina: 0 }, consequence: '上级三分钟搞定，你记了笔记。' },
        ...traitChoices(arch, stageTune),
      ],
    };
  }
  if (kind === 'difficult') {
    const kn = Math.round(7 * stageTune);
    const rep = Math.round(4 * stageTune);
    return {
      id, stage,
      title: `${c.spec}疑难：鉴别诊断`,
      body: `一位${patient}的症状不典型，${mood}。${arch.profile}这是你第几次碰到${c.spec}了。`,
      category: 'clinical' as EventCategory,
      weight: 22,
      requireFlag: `seen_${c.spec}`,
      choices: [
        { text: '列出鉴别诊断并逐一排查', delta: { knowledge: kn, reputation: rep, stamina: -Math.round(8 * stageTune) }, consequence: '你的思路得到了带教肯定。' },
        { text: '照搬上次经验', delta: { knowledge: 1, reputation: -2, stamina: -Math.round(4 * stageTune) }, consequence: '差点漏诊，被提醒了。' },
        ...traitChoices(arch, stageTune),
      ],
    };
  }
  // emergency
  const kn = Math.round(5 * stageTune);
  return {
    id, stage,
    title: `${c.spec}抢救：${complaint}`,
    body: `平车推进来一位${patient}，${mood}——生命体征在飘。${arch.profile}`,
    category: 'clinical' as EventCategory,
    weight: chance(i, 13, 0.15) ? 80 : 25,
    choices: [
      { text: '立刻心肺复苏 + 呼叫团队', delta: { knowledge: kn, reputation: 5, stamina: -Math.round(14 * stageTune), sanity: -3 }, consequence: '团队协作把人救了回来。' },
      { text: '先建立静脉通路再评估', delta: { knowledge: Math.round(kn / 2), stamina: -Math.round(10 * stageTune), sanity: -2 }, consequence: '节奏稍慢但稳住了。' },
      { text: '慌了，站到一边', delta: { reputation: -4, sanity: -8, stamina: -4 }, consequence: '你被排在后面，事后很自责。' },
      ...traitChoices(arch, stageTune),
    ],
  };
}

// 病房互访模板：查房 / 探视型事件。患者由真实档案驱动，按特质出选项。
// 关键：查体/调整方案的选择会设 met_${arch.id}——"你认真管过这位病人"被记录，
// 后续 patientEchoEvent（复诊/感谢/投诉）要求该 flag，让患者真的会回来。
function wardVisitEvent(stage: string | string[], i: number): GameEvent {
  const arch = patientAt(i, 5);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const primary = Array.isArray(stage) ? stage[stage.length - 1] : stage;
  const stageTune = primary === 'career' ? 1.4 : primary === 'guipei' ? 1.1 : 0.85;
  const id = `gen_${stageKey}_ward_${i}`;
  return {
    id, stage,
    title: `病房互访：${arch.name}的床位`,
    body: `你推门走进病房，${arch.name}正靠在床头。${arch.followUp}`,
    category: 'clinical' as EventCategory,
    weight: 22,
    choices: [
      { text: '仔细查体，逐条核对用药', delta: { clinical: 4, knowledge: 3, stamina: -Math.round(6 * stageTune) }, flagSet: `met_${arch.id}`, consequence: '你把每条医嘱都对了一遍。' },
      { text: '聊聊恢复情况，调整方案', delta: { knowledge: 3, relations: 1, stamina: -Math.round(5 * stageTune) }, flagSet: `met_${arch.id}`, consequence: '他用力点了点头，说好多了。' },
      ...traitChoices(arch, stageTune),
    ],
  };
}

// 患者回声：你认真管过的患者（met_${arch.id}）在之后回来复查 / 感谢 / 投诉。
// 让"你关照过的独居老人、好诉的家属"真的会再次出现——患者线有了跨事件回响。
const ECHO_TEMPLATES: Array<{ scene: (a: PatientArchetype) => string; title: (a: PatientArchetype) => string; text: string; delta: any; consequence: string }> = [
  {
    scene: a => `门诊日，${a.name}又来了——这次是复查。${a.profile}气色比上次好，主动跟你打招呼。`,
    title: a => `${a.name}来复查`,
    text: '仔细复查，按他的经济状况调整后续方案',
    delta: { clinical: 3, relations: 3, knowledge: 2, stamina: -6 },
    consequence: '他复查指标好转，走时连声道谢。',
  },
  {
    scene: a => `你刚下夜班，${a.name}的家属等在办公室门口，手里提着一袋水果，说是"上次多亏你"。`,
    title: () => `患者家属来道谢`,
    text: '收下心意，叮嘱别再破费',
    delta: { relations: 4, sanity: 3, reputation: 2 },
    consequence: '家属点头说"以后就认你了"。',
  },
  {
    scene: a => `投诉科转来一封信——是${a.name}写的。不是投诉，是表扬："上次那位年轻医生，问得很细。"`,
    title: a => `${a.name}的表扬信`,
    text: '把表扬信收进自己的档案夹',
    delta: { reputation: 4, sanity: 3 },
    consequence: '医务科在例会上念了这封信。',
  },
  {
    scene: a => `${a.name}出院后没按医嘱来复查。你翻出病历拨了电话，对面支支吾吾："忙……忘了。"`,
    title: a => `随访电话：${a.name}`,
    text: '耐着性子约好复查时间，把注意事项再说一遍',
    delta: { relations: 3, knowledge: 1, stamina: -4 },
    consequence: '他答应下周一定来。',
  },
];

function patientEchoEvent(stage: string | string[], i: number): GameEvent {
  const arch = patientAt(i, 23); // 不同 salt：回声患者与首诊患者不同索引，避免一一绑定
  const tpl = pick(ECHO_TEMPLATES, i, 41);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const id = `gen_${stageKey}_echo_${i}`;
  const primary = Array.isArray(stage) ? stage[stage.length - 1] : stage;
  const stageTune = primary === 'career' ? 1.4 : primary === 'guipei' ? 1.1 : 0.85;
  return {
    id, stage,
    title: tpl.title(arch),
    body: tpl.scene(arch),
    category: 'clinical' as EventCategory,
    weight: 24,
    requireFlag: `met_${arch.id}`,
    choices: [
      { text: tpl.text, delta: tpl.delta, consequence: tpl.consequence },
      { text: '客气回应两句，没往心里去', delta: { relations: 0, sanity: 0 }, consequence: '你礼貌笑了笑，继续忙手头的活。' },
      ...traitChoices(arch, stageTune),
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
function buildStage(stage: string | string[], plan: { routine: number; difficult: number; emergency: number; night: number; ward: number; echo: number; study: number; job: number; social: number }): GameEvent[] {
  const out: GameEvent[] = [];
  let k = 0;
  for (let i = 0; i < plan.routine; i++) out.push(clinicEvent(stage, k++, 'routine'));
  for (let i = 0; i < plan.difficult; i++) out.push(clinicEvent(stage, k++, 'difficult'));
  for (let i = 0; i < plan.emergency; i++) out.push(clinicEvent(stage, k++, 'emergency'));
  for (let i = 0; i < plan.night; i++) out.push(nightShiftEvent(stage, i));
  for (let i = 0; i < plan.ward; i++) out.push(wardVisitEvent(stage, i));
  for (let i = 0; i < plan.echo; i++) out.push(patientEchoEvent(stage, i));
  for (let i = 0; i < plan.study; i++) out.push(studyEvent(stage, i));
  for (let i = 0; i < plan.job; i++) out.push(jobEvent(stage, i));
  for (let i = 0; i < plan.social; i++) out.push(socialEncounterEvent(stage, k++));
  return out;
}

// 社会人物遭遇：从 npcGen 的 ≥10 万人物模板确定性抽一位"普通人"，随机进入游戏，
// 交互选项按其性格/经济 traits 定制——"在生活里遇见谁"是随机的，"怎么相处"看人。
const CHAR_OPTIONS: Array<{ trait: string; text: string; delta: any; consequence: string }> = [
  { trait: '安抚情绪', text: '先听他发泄完，再搭话', delta: { relations: 3, sanity: -1 }, consequence: '他平静下来，跟你多说了几句。' },
  { trait: '多解释原理', text: '把他的疑问解释清楚', delta: { relations: 2, knowledge: 1 }, consequence: '他豁然开朗，说"你懂行"。' },
  { trait: '给经济方案', text: '替他算了笔账，给省钱的建议', delta: { relations: 3 }, consequence: '他连声道谢，记住了你。' },
  { trait: '讲科学依据', text: '摆事实讲道理', delta: { relations: 2, knowledge: 1 }, consequence: '他将信将疑，但态度软了。' },
  { trait: '大声慢说', text: '放慢语速，大声多讲几遍', delta: { relations: 2, stamina: -1 }, consequence: '他听清了，说你这人实在。' },
  { trait: '保持距离', text: '保持距离，别惹麻烦', delta: { sanity: 1, relations: -2 }, consequence: '你绕开了这场是非。' },
  { trait: '明确拒绝', text: '明确拒绝，不留余地', delta: { relations: -1, reputation: 1 }, consequence: '对方碰了钉子，悻悻走了。' },
  { trait: '多给选择', text: '把选项和利弊都摆出来', delta: { relations: 3 }, consequence: '他自己做了决定，感谢你尊重他。' },
  { trait: '耐心引导', text: '放慢节奏，耐心听他讲', delta: { relations: 3, sanity: -1 }, consequence: '他说出了心里的难处。' },
  { trait: '纠正误区', text: '温和纠正他的误解', delta: { knowledge: 1, relations: 2 }, consequence: '他想了想，承认自己之前想岔了。' },
  { trait: '引导聚焦', text: '礼貌打断，抓重点', delta: { relations: 2 }, consequence: '你从他的一堆话里听出了关键。' },
  { trait: '给希望要实', text: '给实在的鼓励，不空许诺', delta: { sanity: 3, relations: 2 }, consequence: '他眼里有了光。' },
  { trait: '重点重复', text: '把要紧的话重复一遍', delta: { relations: 2 }, consequence: '他记住了。' },
  { trait: '尊重知情', text: '尊重他的判断，不强行说服', delta: { relations: 2, sanity: 1 }, consequence: '他说"你是个讲理的人"。' },
  { trait: '坦然面对', text: '坦荡回应，不藏着掖着', delta: { relations: 2, reputation: 1 }, consequence: '他反而更信你了。' },
  { trait: '面对家属', text: '把话说给一家人听', delta: { relations: 3 }, consequence: '一家人都点了头。' },
  { trait: '让家属翻译', text: '请家属帮忙传话', delta: { relations: 2 }, consequence: '经翻译，对方终于懂了。' },
  { trait: '关注心理', text: '多问一句"你还好吗"', delta: { sanity: 3, relations: 2 }, consequence: '他愣了一下，眼眶有点红。' },
  { trait: '医保覆盖', text: '提醒他可以走医保', delta: { relations: 2, knowledge: 1 }, consequence: '他一拍大腿："那我不怕了。"' },
  { trait: '全自费', text: '提醒他费用能省则省', delta: { relations: 2 }, consequence: '他松了口气，说"你替我想到了"。' },
  { trait: '没医保', text: '提醒他先问清楚报销', delta: { relations: 2, knowledge: 1 }, consequence: '他记下了，说谢谢提醒。' },
  { trait: '异地报销麻烦', text: '提醒他留好票据', delta: { relations: 2 }, consequence: '他把票据收好，连声道谢。' },
  { trait: '怕住院', text: '安慰他"未必需要住院"', delta: { sanity: 2, relations: 2 }, consequence: '他放松下来，说"那就好"。' },
];

function socialEncounterEvent(stage: string | string[], i: number): GameEvent {
  const ch = createCharacter(i);
  const stageKey = Array.isArray(stage) ? stage.join('+') : stage;
  const id = `gen_${stageKey}_social_${i}`;
  const custom = ch.traits.map((t) => CHAR_OPTIONS.find(o => o.trait === t))
    .filter((o): o is NonNullable<typeof o> => !!o).slice(0, 2)
    .map(o => ({ text: o.text, delta: o.delta, consequence: o.consequence }));
  return {
    id, stage,
    title: `楼道里遇见${ch.identity}`,
    body: `下班路上/楼道里，你遇见了${ch.name}——${ch.identityDesc}。${ch.name}${ch.speech}`,
    category: 'social' as EventCategory,
    weight: 25,
    choices: [
      { text: '停下来聊几句', delta: { relations: 3, sanity: 1, stamina: -2 }, consequence: '你们聊了一路，对方觉得你这人不错。' },
      ...custom,
      { text: '点头打了个招呼就走', delta: { sanity: 1 }, consequence: '你赶着回宿舍/值班室，没深聊。' },
    ],
  };
}

export const GENERATED_EVENTS: GameEvent[] = [
  // 本科：仅课堂/实验/见习（观察），不接触病人、不抢救。
  ...buildStage('undergrad', { routine: 0, difficult: 0, emergency: 0, night: 0, ward: 0, echo: 0, study: 500, job: 0, social: 60 }),
  // 实习：在带教监督下接触病人、可参与抢救，但非主导。
  ...buildStage('internship', { routine: 450, difficult: 150, emergency: 100, night: 80, ward: 80, echo: 40, study: 0, job: 0, social: 20 }),
  // 规培：临床一线，独立管理病人、参与抢救。
  ...buildStage('guipei', { routine: 550, difficult: 200, emergency: 100, night: 120, ward: 120, echo: 60, study: 0, job: 0, social: 40 }),
  // 硕博：按学制分两条线（临床型/科研型由 track_clinical / track_research 标记区分）。
  // 注意：阶段名用 ['master','phd'] 数组，使两个场景都能取到（原 'master_phd' 不会被匹配）。
  ...buildStage(['master', 'phd'], { routine: 400, difficult: 150, emergency: 80, night: 100, ward: 80, echo: 40, study: 0, job: 0, social: 20 })
    .map(e => ({ ...e, excludeFlag: 'track_research' })),
  ...buildStage(['master', 'phd'], { routine: 0, difficult: 0, emergency: 0, night: 0, ward: 0, echo: 0, study: 600, job: 0, social: 10 })
    .map(e => ({ ...e, excludeFlag: 'track_clinical' })),
  ...buildStage('jobhunt', { routine: 0, difficult: 0, emergency: 0, night: 0, ward: 0, echo: 0, study: 0, job: 500, social: 0 }),
  // 职业：临床一线，抢救常态化。
  ...buildStage('career', { routine: 550, difficult: 200, emergency: 100, night: 120, ward: 120, echo: 60, study: 0, job: 0, social: 60 }),
];
