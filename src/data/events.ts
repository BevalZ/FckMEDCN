import type { StatDelta } from './stats';
import { getState, hasFlag } from './gameState';
import type { GameState } from './gameState';
import { UNDERGRAD_EVENTS } from './events_undergrad';
import { INTERNSHIP_EVENTS } from './events_internship';
import { GUIPEI_EVENTS } from './events_guipei';
import { MASTER_PHD_EVENTS } from './events_master_phd';
import { JOBHUNT_EVENTS } from './events_jobhunt';
// —— 求职季回响：博士学历 / 双线偏向 / 造假隐患 / 学术背景在求职时兑现 ——
import { JOBHUNT_ECHO_EVENTS } from './events_jobhunt_echo';
import { CAREER_EVENTS } from './events_career';
import { GENERATED_EVENTS } from './eventGen';
import { CURATED_M2_EVENTS } from './events_curated_m2';
import { LIFE_EVENTS } from './events_life';
import { TRACK_EVENTS } from './events_track';
// —— 临床 ⇄ 科研双线：对抗、互促、造假与其后果（M3）——
import { DUALTRACK_EVENTS } from './events_dualtrack';
// —— 硕博双线正向内容：专硕（临床型）与学硕（科研型）各自读写 clinical/research 轴 ——
import { MASTER_TRACK_EVENTS } from './events_master_track';
// —— 导师关系：trust/distant 阈值兑现为资源或压力 ——
import { ADVISOR_EVENTS } from './events_advisor';
// —— 跨阶段回声：把早期埋下的 flag 在后续阶段兑现，串起"一生"叙事（② 选择后果链）——
import { ECHO_EVENTS } from './events_echoes';
// —— NPC 好感度门控事件：关系决定你在随机事件里的处境（REVIEW-INTERACTION P0）——
import { NPC_AFFINITY_EVENTS } from './events_npc_affinity';
import { DIAGNOSTIC_EVENTS } from './events_diagnostic';
import { MEDICATION_EVENTS } from './events_medication';
import { CLINICAL_WORKFLOW_EVENTS } from './events_clinical_workflow';

export type EventCategory = 'study' | 'clinical' | 'social' | 'financial' | 'mental' | 'career' | 'news' | 'system' | 'personal';

// 选项副作用：声明式描述（纯数据，可序列化），实现见 effects.ts。
export type ChoiceEffect =
  | { kind: 'startDating' }
  | { kind: 'breakup' }
  | { kind: 'marry' }
  | { kind: 'childborn' }
  | { kind: 'loseKin'; who: 'father' | 'mother' | 'grandparent' }
  // —— 学术诚信（M3）——
  | { kind: 'fake'; severity: 'minor' | 'moderate' | 'severe' }
  | { kind: 'selfReport' }
  | { kind: 'buyHouse' }
  | { kind: 'changeAttr'; attr: 'luck' | 'looks'; amount: number; reason: string };

export interface EventChoice {
  text: string; delta: StatDelta; flagSet?: string; flagRequire?: string; flagExclude?: string;
  nextEventId?: string; consequence?: string; hidden?: boolean;
  // 选项级属性门槛：未达到区间 [lo,hi] 则该选项对玩家不可见（与事件级 requireStat 同语义）。
  requireStat?: Partial<Record<string, [number, number]>>;
  // 选择后的自定义副作用（如改变婚姻/家庭状态）。用声明式描述而非闭包，便于校验与调试。
  effect?: ChoiceEffect;
}

export interface GameEvent {
  id: string; stage: string | string[]; title: string; body: string; category: EventCategory;
  weight: number; minTurn?: number; maxTurn?: number; once?: boolean;
  requireFlag?: string; excludeFlag?: string;
  requireMarital?: 'single' | 'dating' | 'married';
  excludeMarital?: Array<'single' | 'dating' | 'married'>;
  requireStat?: Partial<Record<string, [number, number]>>;
  /**
   * 仅手动触发：绝不进入加权抽取池（如论文黑市由秘密地点 / NPC 搭话触发）。
   * 与 weight:0 不同的是，本字段在 getAvailableEvents 中硬性排除，
   * 因此即便未来 weight 被改成正数也不会被自动抽中。
   */
  manualOnly?: boolean;
  choices: EventChoice[]; newsTickerAfter?: string;
  /** M4：若设置，打开事件前先跑对应小游戏，用其结果替换默认选项结算 */
  minigame?: 'suture' | 'cpr' | 'exam' | 'nightshift';
  /** 职业赔付/扣罚事件：金钱损失按职级差异化（住院医轻、主任重） */
  rankScaled?: boolean;
}

// 合并各阶段事件池。按阶段拆分文件便于维护，最终统一展开到 ALL_EVENTS。
export const ALL_EVENTS: GameEvent[] = [
  ...UNDERGRAD_EVENTS,
  ...INTERNSHIP_EVENTS,
  ...GUIPEI_EVENTS,
  ...MASTER_PHD_EVENTS,
  ...JOBHUNT_EVENTS,
  ...JOBHUNT_ECHO_EVENTS,
  ...CAREER_EVENTS,
  // —— M2 程序化生成器产出的海量变体事件（确定性，ID 稳定）——
  ...GENERATED_EVENTS,
  // —— M2 手写叙事核心（研究接地、分支链、逻辑门）——
  ...CURATED_M2_EVENTS,
  // —— 真实人生事件：恋爱 / 结婚 / 生子 / 家人离世 ——
  ...LIFE_EVENTS,
  ...TRACK_EVENTS,
  ...DUALTRACK_EVENTS,
  ...MASTER_TRACK_EVENTS,
  ...ADVISOR_EVENTS,
  // —— 跨阶段回声事件：早期 flag 在后续阶段回响，仅在玩家确实做过该选择时才触发 ——
  ...ECHO_EVENTS,
  // —— NPC 好感度门控事件：trust_xxx/distant_xxx 决定事件走向 ——
  ...NPC_AFFINITY_EVENTS,
  ...DIAGNOSTIC_EVENTS,
  ...MEDICATION_EVENTS,
  ...CLINICAL_WORKFLOW_EVENTS,
  // —— 以下为原有示例事件，保留以兼容旧流程 ——
  {
    id: 'anatomy_first_day', stage: 'undergrad', title: '解剖课第一天',
    body: '解剖室的气味扑面而来。台子上躺着一位捐献者。',
    category: 'study', weight: 100, minTurn: 1, maxTurn: 3, once: true,
    choices: [
      { text: '深呼吸，专注学习', delta: { stamina: -10, knowledge: 8, sanity: -5 }, consequence: '你撑过去了。' },
      { text: '跑出去了', delta: { stamina: -5, sanity: -15 }, consequence: '你在走廊蹲了20分钟。' },
    ],
  },
];

// 事件池在模块加载时按阶段建立只读索引。事件顺序保持与 ALL_EVENTS 一致，
// 因而不会改变同一随机数下的加权抽取结果；每回合只需过滤当前阶段的候选。
const EVENTS_BY_STAGE = new Map<string, GameEvent[]>();
for (const ev of ALL_EVENTS) {
  const stages = Array.isArray(ev.stage) ? ev.stage : [ev.stage];
  for (const stage of stages) {
    const pool = EVENTS_BY_STAGE.get(stage);
    if (pool) pool.push(ev);
    else EVENTS_BY_STAGE.set(stage, [ev]);
  }
}

const EMPTY_EVENT_POOL: readonly GameEvent[] = [];

export function getEventsForStage(stage: string): readonly GameEvent[] {
  return EVENTS_BY_STAGE.get(stage) ?? EMPTY_EVENT_POOL;
}

export function getAvailableEvents(
  stage: string, flags: Set<string>, stats: Record<string, number>,
  firedEvents: Set<string>, turnsInStage: number,
  marital: GameState['marital']
): GameEvent[] {
  return getEventsForStage(stage).filter(ev => {
    if (ev.manualOnly) return false; // 仅手动触发，永不进入加权抽取池
    if (ev.once && firedEvents.has(ev.id)) return false;
    if (ev.requireFlag && !flags.has(ev.requireFlag)) return false;
    if (ev.excludeFlag && flags.has(ev.excludeFlag)) return false;
    // —— 婚姻状态门槛（真实人生事件的触发条件）——
    if (ev.requireMarital && marital !== ev.requireMarital) return false;
    if (ev.excludeMarital && ev.excludeMarital.includes(marital)) return false;
    // —— requireStat：按属性数值区间决定是否出现（M2 启用，此前为死代码）——
    if (ev.requireStat) {
      for (const key of Object.keys(ev.requireStat) as string[]) {
        const [lo, hi] = ev.requireStat[key]!;
        const v = stats[key] ?? 0;
        if (v < lo || v > hi) return false;
      }
    }
    if (ev.minTurn !== undefined && turnsInStage < ev.minTurn) return false;
    if (ev.maxTurn !== undefined && turnsInStage > ev.maxTurn) return false;
    return true;
  });
}

/**
 * 选项是否对玩家可见：综合 flagRequire / flagExclude / hidden / requireStat 门槛。
 * 供 EventCard 渲染过滤，也供测试断言。requireStat 区间 [lo,hi] 为闭区间。
 */
export function choiceVisible(choice: EventChoice): boolean {
  if (choice.hidden) return false;
  if (choice.flagRequire && !hasFlag(choice.flagRequire)) return false;
  if (choice.flagExclude && hasFlag(choice.flagExclude)) return false;
  if (choice.requireStat) {
    const stats = getState().stats as unknown as Record<string, number>;
    for (const key of Object.keys(choice.requireStat) as string[]) {
      const range = choice.requireStat[key];
      if (!range) continue;
      const [lo, hi] = range;
      const v = stats[key] ?? 0;
      if (v < lo || v > hi) return false;
    }
  }
  return true;
}

export function weightedRandom(events: GameEvent[]): GameEvent | null {
  if (events.length === 0) return null;
  const total = events.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of events) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return events[events.length - 1];
}
