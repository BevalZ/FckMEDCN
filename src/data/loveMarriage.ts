export type RelationshipStatus = 'single' | 'dating' | 'engaged' | 'married' | 'separated' | 'divorced' | 'widowed';
export interface LoveMarriageState {
  intimacy: number; passion: number; commitment: number; maritalSatisfaction: number; status: RelationshipStatus; ageAtFirstMarriage: number;
  spouse: { exists: boolean; name: string; type: 'physician' | 'nurse' | 'civil_servant' | 'teacher' | 'other'; occupation: string; support: number; workHours: number; firstMet: string; marriageYear: number };
  datingHistory: { partner: string; duration: number; ended: 'married' | 'broke_up' | 'other'; reason: string }[];
  crises: { type: 'absence' | 'exhaustion' | 'conflict' | 'infidelity'; year: number; resolution: 'resolved' | 'ongoing' | 'divorce'; impact: number }[];
  temptations: { occurred: boolean; type: 'emotional' | 'physical' | 'both'; resolved: boolean; discovered: boolean };
  workMarriageConflict: number; missedAnniversaries: number;
}

export const DEFAULT_LOVE_STATE: LoveMarriageState = {
  intimacy: 0, passion: 0, commitment: 0, maritalSatisfaction: 0, status: 'single', ageAtFirstMarriage: 0,
  spouse: { exists: false, name: '', type: 'other', occupation: '', support: 0, workHours: 40, firstMet: '', marriageYear: 0 },
  datingHistory: [], crises: [], temptations: { occurred: false, type: 'emotional', resolved: true, discovered: false }, workMarriageConflict: 0, missedAnniversaries: 0,
};
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeLove(raw?: Partial<LoveMarriageState>, legacyStatus: 'single' | 'dating' | 'married' = 'single', spouseName: string | null = null): LoveMarriageState {
  const r = raw ?? {}; const spouse = (r.spouse ?? {}) as Partial<LoveMarriageState['spouse']>;
  const status = r.status ?? legacyStatus; const exists = spouse.exists ?? (Boolean(spouseName) || status !== 'single');
  const intimacy = clamp(r.intimacy ?? (status === 'married' ? 60 : status === 'dating' ? 50 : 0));
  const passion = clamp(r.passion ?? (status === 'single' ? 0 : 65)); const commitment = clamp(r.commitment ?? (status === 'married' ? 75 : status === 'dating' ? 40 : 0));
  return { ...DEFAULT_LOVE_STATE, ...r, status, intimacy, passion, commitment,
    maritalSatisfaction: clamp(r.maritalSatisfaction ?? (intimacy * 0.4 + passion * 0.2 + commitment * 0.4)),
    spouse: { ...DEFAULT_LOVE_STATE.spouse, ...spouse, exists, name: spouse.name ?? spouseName ?? '' }, datingHistory: [...(r.datingHistory ?? [])], crises: [...(r.crises ?? [])], temptations: { ...DEFAULT_LOVE_STATE.temptations, ...(r.temptations ?? {}) } };
}

export function changeLove(current: LoveMarriageState, changes: Partial<Pick<LoveMarriageState, 'intimacy' | 'passion' | 'commitment'>>): LoveMarriageState {
  const s = normalizeLove(current); return normalizeLove({ ...s, intimacy: clamp(s.intimacy + (changes.intimacy ?? 0)), passion: clamp(s.passion + (changes.passion ?? 0)), commitment: clamp(s.commitment + (changes.commitment ?? 0)) });
}

export function tickLove(current: LoveMarriageState, workHours: number, nightShifts: number, burnout: number, newYear = false): LoveMarriageState {
  const s = normalizeLove(current); if (!['married', 'engaged', 'dating', 'separated'].includes(s.status)) return s;
  const conflict = clamp(Math.max(0, workHours - 50) * 0.5 + nightShifts * 2 + burnout * 0.15 + (s.spouse.type === 'physician' || s.spouse.type === 'nurse' ? 8 : 0));
  const intimacyLoss = conflict > 60 ? 2 : conflict > 40 ? 1 : 0; const passionLoss = s.status === 'married' && newYear ? 2 : 0;
  return normalizeLove({ ...s, intimacy: clamp(s.intimacy - intimacyLoss), passion: clamp(s.passion - passionLoss), workMarriageConflict: conflict });
}

export function divorceProbability(s: LoveMarriageState): number {
  const n = normalizeLove(s); return clamp((100 - n.maritalSatisfaction) * 0.45 + n.workMarriageConflict * 0.25 + (n.temptations.discovered ? 25 : 0));
}
