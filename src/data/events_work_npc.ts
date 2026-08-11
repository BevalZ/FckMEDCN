import type { GameEvent } from './events';

interface WorkNpcSpec {
  id: string;
  role: string;
  situation: string;
  help: string;
  friction: string;
  helpDelta: Record<string, number>;
  frictionDelta: Record<string, number>;
}

const WORK_NPCS: WorkNpcSpec[] = [
  { id: 'career_peer', role: '同组医生', situation: '门诊与病房同时爆满', help: '主动和对方重新分配病人', friction: '把最棘手的病人推过去', helpDelta: { stamina: -4, relations: 6, clinical: 3 }, frictionDelta: { stamina: 2, relations: -7, reputation: -2 } },
  { id: 'resident_chief', role: '住院总', situation: '夜班表出现三个缺口', help: '一起重排班次并补上空缺', friction: '只保住自己的休息日', helpDelta: { stamina: -8, relations: 7, reputation: 3 }, frictionDelta: { stamina: 4, relations: -6 } },
  { id: 'ward_nurse', role: '责任护士', situation: '一条高风险医嘱需要复核', help: '停下来逐项双人核对', friction: '催促先执行再说', helpDelta: { clinical: 4, relations: 6, reputation: 2 }, frictionDelta: { clinical: -2, relations: -8, sanity: -4 } },
  { id: 'medical_admin', role: '医务科干事', situation: '一宗投诉进入院内调查', help: '完整提交病历和沟通记录', friction: '要求对方帮忙把事情压下去', helpDelta: { reputation: 4, sanity: -4, stamina: -4 }, frictionDelta: { money: -3000, reputation: -6, sanity: -6 } },
  { id: 'lab_doctor', role: '检验科医生', situation: '危急值与临床表现不一致', help: '电话复核标本与采集过程', friction: '按报告数值直接处理', helpDelta: { clinical: 5, knowledge: 3, relations: 4 }, frictionDelta: { clinical: -3, sanity: -5 } },
  { id: 'radiologist', role: '影像科医生', situation: '夜间片子上有一个模糊征象', help: '带着病史当面会诊', friction: '只在系统里发一句“结合临床”', helpDelta: { clinical: 5, knowledge: 4, relations: 4 }, frictionDelta: { clinical: -2, relations: -3 } },
  { id: 'junior_doctor', role: '低年资医生', situation: '第一次独立处理急症后明显慌乱', help: '留下来复盘并示范交接', friction: '当众批评让其长记性', helpDelta: { reputation: 4, relations: 5, stamina: -5, sanity: 2 }, frictionDelta: { reputation: -3, relations: -7 } },
  { id: 'department_chief', role: '科主任', situation: '科室指标与患者安全发生冲突', help: '拿数据说明风险并争取调整', friction: '先完成指标再考虑后果', helpDelta: { reputation: 5, stamina: -6, sanity: -3 }, frictionDelta: { money: 2500, reputation: -5, sanity: -5 } },
  { id: 'pharmacist', role: '临床药师', situation: '多重用药患者出现相互作用风险', help: '邀请药师共同制定减药方案', friction: '认为临床用药不需要药师插手', helpDelta: { clinical: 5, knowledge: 4, relations: 5 }, frictionDelta: { clinical: -2, relations: -6 } },
  { id: 'patient_liaison', role: '患者服务专员', situation: '家属对等待时间非常不满', help: '一起解释流程并给出明确节点', friction: '让服务台自己安抚', helpDelta: { relations: 6, reputation: 3, stamina: -3 }, frictionDelta: { relations: -5, reputation: -4 } },
  { id: 'community_doctor', role: '社区医生', situation: '一位慢病患者在医院和社区之间反复失联', help: '建立转诊和随访闭环', friction: '只处理本次住院问题', helpDelta: { clinical: 4, relations: 5, reputation: 3 }, frictionDelta: { clinical: -1, relations: -4 } },
  { id: 'conference_peer', role: '外院同行', situation: '会议上有人质疑你的治疗路径', help: '会后交换病例与证据', friction: '在台上针锋相对', helpDelta: { knowledge: 4, reputation: 4, relations: 4 }, frictionDelta: { reputation: -2, relations: -5, sanity: -3 } },
];

export const WORK_NPC_EVENTS: GameEvent[] = WORK_NPCS.flatMap((npc, index) => ([
  {
    id: `work_npc_${npc.id}_cooperate`, stage: ['career', 'pinnacle'],
    title: `[[npc:${npc.id}]] · ${npc.role}`,
    body: `${npc.situation}。[[npc:${npc.id}]]正在等你的决定。`, category: index % 3 === 0 ? 'social' : 'clinical', weight: 34, minTurn: 1,
    choices: [
      { text: npc.help, delta: npc.helpDelta, effect: { kind: 'changeAffinity', npcId: npc.id, amount: 10 }, consequence: `[[npc:${npc.id}]]记住了这次合作。` },
      { text: npc.friction, delta: npc.frictionDelta, effect: { kind: 'changeAffinity', npcId: npc.id, amount: -10 }, consequence: `你和[[npc:${npc.id}]]之间多了一层隔阂。` },
    ],
  },
  {
    id: `work_npc_${npc.id}_trust`, stage: ['career', 'pinnacle'],
    title: `[[npc:${npc.id}]]来搭把手`, body: `因为此前建立的信任，[[npc:${npc.id}]]在关键节点主动补位。`,
    category: 'social', weight: 24, minTurn: 3, requireFlag: `trust_${npc.id}`,
    choices: [
      { text: '接受帮助并把功劳说清楚', delta: { sanity: 6, stamina: 4, relations: 4, reputation: 2 }, effect: { kind: 'changeAffinity', npcId: npc.id, amount: 4 }, consequence: '可靠的关系让这一季没有那么难熬。' },
      { text: '接受帮助但把成果算在自己名下', delta: { reputation: 3, relations: -5, sanity: -2 }, effect: { kind: 'changeAffinity', npcId: npc.id, amount: -12 }, consequence: `[[npc:${npc.id}]]没有当场拆穿，但信任开始松动。` },
    ],
  },
] as GameEvent[]));
