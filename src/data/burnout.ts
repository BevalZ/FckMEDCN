import { getState, updateStats } from './gameState';
import { advanceQuarter } from './turnFlow';
import type { IntegrityOutcome } from './integrity';
import type { QuarterEconomy } from './economy';

// 倦怠机制：体力到底（≤0）时崩溃，错过一整个季度，并大幅回血。
// 设计意图见计划文件 §1：在体力归零瞬间触发，比"睡觉才发现"更有戏剧性，
// 且让跳过的那个季度也走正常的季度结算（经济 / 知识衰减 / 学术诚信）。

/** 倦怠触发后回复的体力点数 */
export const BURNOUT_RECOVER = 50;

/** 是否处于倦怠触发条件：体力已到底 */
export function isBurnout(): boolean {
  return getState().stats.stamina <= 0;
}

/**
 * 触发一次倦怠：多推进一个季度（advanceQuarter），并把体力拉回 BURNOUT_RECOVER。
 * 返回该被跳过季度的完整结算结果（经济 / 丧亲 / 诚信），供调用方按既有逻辑展示。
 * 注意：调用方负责在之后走 afterSleep 类的流程分支（崩溃 / 转阶段 / 下一季）。
 */
export function triggerBurnout(): {
  econ: QuarterEconomy; grieving: boolean; integrity: IntegrityOutcome;
} {
  updateStats({ stamina: BURNOUT_RECOVER });
  return advanceQuarter(getState().stage);
}
