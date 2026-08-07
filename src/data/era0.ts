import type { AttrAlloc } from './gameState';

export type Era0FamilyStatus = 'wealthy' | 'middle' | 'ordinary' | 'poor';
export type ExamEveChoice = 'review' | 'sleep' | 'text_parents' | 'write_diary';
export type ExamSiteChoice = 'help_student' | 'wave_mom' | 'notice_slogan' | 'calm';
export type EstimateChoice = 'high' | 'low' | 'accurate';
export type Era0ExitReason = 'unchosen_road' | 'fell_short' | 'escaped_white_tower' | 'no_college' | null;

export interface Era0Progress {
  familyStatus: Era0FamilyStatus;
  examScoreModifier: number;
  estimatedScore: number;
  rank: number;
  examEveChoice: ExamEveChoice | null;
  examSiteChoice: ExamSiteChoice | null;
  estimateChoice: EstimateChoice | null;
  dinnerChoice: string | null;
  scoreReaction: string | null;
  teacherAdvice: string | null;
  repeated: boolean;
  ruralOriented: boolean;
  exitReason: Era0ExitReason;
}

export const DEFAULT_ERA0_PROGRESS: Era0Progress = {
  familyStatus: 'ordinary',
  examScoreModifier: 0,
  estimatedScore: 0,
  rank: 0,
  examEveChoice: null,
  examSiteChoice: null,
  estimateChoice: null,
  dinnerChoice: null,
  scoreReaction: null,
  teacherAdvice: null,
  repeated: false,
  ruralOriented: false,
  exitReason: null,
};

export function familyStatusFromAttrs(attrs: AttrAlloc): Era0FamilyStatus {
  if (attrs.family >= 4) return 'wealthy';
  if (attrs.family === 3) return 'middle';
  if (attrs.family >= 1) return 'ordinary';
  return 'poor';
}

export function familyScoreModifier(status: Era0FamilyStatus): number {
  if (status === 'wealthy') return 10;
  if (status === 'poor') return -10;
  return 0;
}

/** 成绩点对应高考基础分中心；后续再叠加家境、考前选择和运气波动。 */
export function academicBaseScore(academic: number): number {
  return [455, 510, 560, 610, 660, 688][Math.max(0, Math.min(5, Math.round(academic)))]!;
}

export function estimateFromChoice(base: number, choice: EstimateChoice): number {
  if (choice === 'high') return Math.min(750, base + 10);
  if (choice === 'low') return Math.max(0, base - 10);
  return base;
}

/** 近似位次映射，只用于叙事反馈，不冒充具体省份的一分一段表。 */
export function approximateRank(score: number): number {
  if (score >= 700) return Math.max(20, Math.round((750 - score) * 8));
  if (score >= 680) return Math.round(400 + (700 - score) * 80);
  if (score >= 650) return Math.round(2000 + (680 - score) * 260);
  if (score >= 600) return Math.round(9800 + (650 - score) * 620);
  if (score >= 550) return Math.round(40800 + (600 - score) * 1100);
  if (score >= 500) return Math.round(95800 + (550 - score) * 1700);
  return Math.round(180800 + Math.max(0, 500 - score) * 2400);
}

export function normalizeEra0(raw?: Partial<Era0Progress> | null): Era0Progress {
  return {
    ...DEFAULT_ERA0_PROGRESS,
    ...raw,
    examScoreModifier: Math.round(raw?.examScoreModifier ?? 0),
    estimatedScore: Math.max(0, Math.min(750, Math.round(raw?.estimatedScore ?? 0))),
    rank: Math.max(0, Math.round(raw?.rank ?? 0)),
    repeated: raw?.repeated === true,
    ruralOriented: raw?.ruralOriented === true,
    exitReason: raw?.exitReason ?? null,
  };
}
