import { getState, hasFlag, setFlag, getCounter, setCounter, incCounter } from './gameState';
import type { LifeStage } from './gameState';

// 知识机制（计划 §3 / §4）：慢增长、每季衰减、太低触发考试危机、长学制连续低分计数。

/** 学籍阶段：这些阶段会继承上一阶知识、每季衰减、过低触发考试危机 */
export const KNOWLEDGE_STAGES: LifeStage[] = ['undergrad', 'master', 'phd'];

/** 知识低于此值，睡眠结算后触发考试不及格 / 留级 */
export const LOW_KNOWLEDGE = 25;

/** 长学制连续低于此知识值的季度数阈值：达 4 季触发转普通班警告 */
export const LONG_SYS_LOW_KNOWLEDGE = 40;
export const LONG_SYS_LOW_QUARTERS = 4;
const LONG_SYS_LOW_KEY = 'long_sys_low_q';

/** 留级 = 多读一年 = 4 个季度（本科/硕博统一来源） */
export const HOLDBACK_TURNS = 4;

/**
 * 「本季是否学过」计数键：任一给正知识的行为（daily spot 或事件选择）都会置 1。
 * 季度结算时若已置位则知识不掉（用进废退），随后清零防跨季泄漏。
 */
const STUDIED_KEY = 'studied_q';

/** 本季产生过知识（去图书馆/实验室/组会，或事件选择里加知识）时调用 */
export function noteStudied() {
  setCounter(STUDIED_KEY, 1);
}

/**
 * 计算本季知识衰减量并消费标记：
 *  · 本季学过 或 知识已为 0 → 返回 0（不掉）；
 *  · 否则 随机 5%~10%。
 * 无论结果如何都清零 STUDIED_KEY，避免跨季残留。
 */
export function consumeQuarterDecay(): number {
  const studied = getCounter(STUDIED_KEY) > 0;
  const k = getState().stats.knowledge;
  setCounter(STUDIED_KEY, 0);
  if (studied || k <= 0) return 0;
  return Math.round(k * (0.05 + Math.random() * 0.05));
}

/** 当前阶段是否处于学籍阶段 */
export function isKnowledgeStage(stage: LifeStage): boolean {
  return KNOWLEDGE_STAGES.includes(stage);
}

/**
 * 考试危机判定：学籍阶段且知识过低 → 返回 'fail'。
 * 调用方据返回结果强制置留级 flag 并展示后果。
 */
export function checkExamCrisis(stage: LifeStage): 'fail' | null {
  if (!isKnowledgeStage(stage)) return null;
  if (getState().stats.knowledge < LOW_KNOWLEDGE) return 'fail';
  return null;
}

/**
 * 长学制连续低知识计数：在 advanceQuarter 内对长学制阶段调用。
 * 知识 < 40 则累加，否则清零；累计达 4 季则置 long_sys_warn_ready，
 * 供 long_sys_transfer_warn 事件抽取（转普通班警告）。
 */
export function tickLongSystemCounter() {
  if (!hasFlag('long_system') || hasFlag('long_sys_transferred')) {
    if (getCounter(LONG_SYS_LOW_KEY) !== 0) setCounter(LONG_SYS_LOW_KEY, 0);
    return;
  }
  const k = getState().stats.knowledge;
  if (k < LONG_SYS_LOW_KNOWLEDGE) {
    const n = incCounter(LONG_SYS_LOW_KEY);
    if (n >= LONG_SYS_LOW_QUARTERS && !hasFlag('long_sys_warned')) {
      setFlag('long_sys_warn_ready');
    }
  } else if (getCounter(LONG_SYS_LOW_KEY) !== 0) {
    setCounter(LONG_SYS_LOW_KEY, 0);
  }
}

/**
 * 各学籍阶段对应的 [留级 flag, 解除 flag]。career 等非学籍阶段返回 null。
 * 统一本科/硕博的留级待遇，避免各自硬编码。
 */
function holdbackFlags(stage: LifeStage): [string, string] | null {
  if (stage === 'undergrad') return ['ug_holdback', 'ug_holdback_recovered'];
  if (stage === 'master') return ['ms_holdback', 'ms_holdback_recovered'];
  if (stage === 'phd') return ['phd_holdback', 'phd_holdback_recovered'];
  return null;
}

/** 处于留级且尚未走出 → 每季 −3 心理负担；否则 0 */
export function holdbackSanityPenalty(stage: LifeStage): number {
  const pair = holdbackFlags(stage);
  if (!pair) return 0;
  const [flag, recovered] = pair;
  return hasFlag(flag) && !hasFlag(recovered) ? -3 : 0;
}

/** 处于留级 → 本阶段额外延长 HOLDBACK_TURNS 个季度；否则 0 */
export function holdbackExtraTurns(stage: LifeStage): number {
  const pair = holdbackFlags(stage);
  if (!pair) return 0;
  return hasFlag(pair[0]) ? HOLDBACK_TURNS : 0;
}
