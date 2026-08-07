export type MotivationKind = 'idealism' | 'family' | 'pragmatism';

export interface MotivationProfile {
  idealism: number;
  family: number;
  pragmatism: number;
}

export type InitialAnswer = 'remember' | 'uncertain' | 'afraid';

export const DEFAULT_MOTIVATION: MotivationProfile = {
  idealism: 0,
  family: 0,
  pragmatism: 0,
};

const MOTIVATION_ORDER: MotivationKind[] = ['idealism', 'family', 'pragmatism'];

export const MOTIVATION_META: Record<MotivationKind, { label: string; summary: string }> = {
  idealism: {
    label: '理想主义',
    summary: '你学医，是因为你想成为能改变别人命运的人。',
  },
  family: {
    label: '家庭期望',
    summary: '你学医，是因为这份选择也承载着家人的期待。',
  },
  pragmatism: {
    label: '现实考量',
    summary: '你学医，是因为你相信这是一条值得投入的现实道路。',
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

export function normalizeMotivation(profile?: Partial<MotivationProfile> | null): MotivationProfile {
  return {
    idealism: clampScore(profile?.idealism ?? 0),
    family: clampScore(profile?.family ?? 0),
    pragmatism: clampScore(profile?.pragmatism ?? 0),
  };
}

export function addMotivation(
  profile: MotivationProfile,
  delta: Partial<MotivationProfile>,
): MotivationProfile {
  return normalizeMotivation({
    idealism: profile.idealism + (delta.idealism ?? 0),
    family: profile.family + (delta.family ?? 0),
    pragmatism: profile.pragmatism + (delta.pragmatism ?? 0),
  });
}

/**
 * 最高分为主导动机。平分时优先采用玩家在“初心之问”中明确选择的动机，
 * 再按固定顺序兜底，保证旧档和测试结果稳定。
 */
export function dominantMotivation(
  profile: MotivationProfile,
  tieBreak?: MotivationKind | null,
): MotivationKind {
  const normalized = normalizeMotivation(profile);
  const max = Math.max(normalized.idealism, normalized.family, normalized.pragmatism);
  if (tieBreak && normalized[tieBreak] === max) return tieBreak;
  return MOTIVATION_ORDER.find(kind => normalized[kind] === max) ?? 'idealism';
}

export function motivationBar(score: number, width = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round((clampScore(score) / 10) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * 主导动机只改变“何时承认自己已经撑不住”，不评价哪一种理由更高尚。
 * 理想主义者更容易硬撑；现实导向者更早止损；家庭导向保持基础阈值。
 */
export function burnoutStaminaThreshold(kind: MotivationKind): number {
  if (kind === 'idealism') return -5;
  if (kind === 'pragmatism') return 5;
  return 0;
}
