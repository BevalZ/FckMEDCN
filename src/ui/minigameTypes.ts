import type { StatDelta } from '../data/stats';

/** 所有小游戏共用的结算结构，最终都会被包装成 EventChoice 走原结算管线 */
export type MinigameResult = {
  grade: 'perfect' | 'good' | 'miss';
  delta: StatDelta;
  flagSet?: string;
  consequence: string;
};

export type MinigameKind = 'suture' | 'cpr' | 'exam' | 'nightshift';
