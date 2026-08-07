export interface FamilyState {
  familyOrigin: number; spouseBond: number; childBond: number; familyFunction: number;
  origin: { parents: { alive: boolean; health: 'good' | 'fair' | 'poor' | 'deceased'; location: 'same_city' | 'different_city' | 'different_province'; financialNeed: number }; siblings: { count: number; supportDistribution: number } };
  spouse: { exists: boolean; name: string; type: 'physician' | 'nurse' | 'civil_servant' | 'full_time' | 'other'; bond: number; conflicts: number; support: number };
  children: { name: string; age: number; bond: number; mentalHealth: number; careerChoice: 'medicine' | 'other' | 'undecided' }[];
  events: { missedBirthdays: number; missedParentMeetings: number; holidaysAlone: number; familyTragedies: string[] };
  conflict: { index: number; guilt: number; absence: number; complaints: number };
}

export const DEFAULT_FAMILY_STATE: FamilyState = {
  familyOrigin: 50, spouseBond: 0, childBond: 0, familyFunction: 50,
  origin: { parents: { alive: true, health: 'good', location: 'different_city', financialNeed: 20 }, siblings: { count: 0, supportDistribution: 0 } },
  spouse: { exists: false, name: '', type: 'other', bond: 0, conflicts: 0, support: 0 }, children: [],
  events: { missedBirthdays: 0, missedParentMeetings: 0, holidaysAlone: 0, familyTragedies: [] }, conflict: { index: 0, guilt: 0, absence: 0, complaints: 0 },
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function normalizeFamily(raw?: Partial<FamilyState>, wealth: 'rich' | 'middle' | 'tight' = 'middle', spouseName: string | null = null, hasChild = false): FamilyState {
  const r = raw ?? {}; const origin = (r.origin ?? {}) as Partial<FamilyState['origin']>; const parents = (origin.parents ?? {}) as Partial<FamilyState['origin']['parents']>;
  const siblings = (origin.siblings ?? {}) as Partial<FamilyState['origin']['siblings']>; const spouse = (r.spouse ?? {}) as Partial<FamilyState['spouse']>;
  const events = (r.events ?? {}) as Partial<FamilyState['events']>; const conflict = (r.conflict ?? {}) as Partial<FamilyState['conflict']>;
  const children = r.children?.length ? [...r.children] : hasChild ? [{ name: '孩子', age: 0, bond: 50, mentalHealth: 75, careerChoice: 'undecided' as const }] : [];
  const familyOrigin = clamp(r.familyOrigin ?? ({ rich: 70, middle: 55, tight: 40 }[wealth]));
  const spouseExists = spouse.exists ?? Boolean(spouseName); const spouseBond = clamp(r.spouseBond ?? spouse.bond ?? (spouseExists ? 55 : 0));
  const childBond = clamp(r.childBond ?? (children.length ? children.reduce((a, c) => a + c.bond, 0) / children.length : 0));
  const conflictIndex = clamp(conflict.index ?? 0); const familyFunction = clamp(r.familyFunction ?? familyOrigin * 0.25 + spouseBond * 0.35 + childBond * 0.25 + 15 - conflictIndex * 0.15);
  return { ...DEFAULT_FAMILY_STATE, ...r, familyOrigin, spouseBond, childBond, familyFunction,
    origin: { ...DEFAULT_FAMILY_STATE.origin, ...origin, parents: { ...DEFAULT_FAMILY_STATE.origin.parents, ...parents }, siblings: { ...DEFAULT_FAMILY_STATE.origin.siblings, ...siblings } },
    spouse: { ...DEFAULT_FAMILY_STATE.spouse, ...spouse, exists: spouseExists, name: spouse.name ?? spouseName ?? '', bond: spouseBond }, children,
    events: { ...DEFAULT_FAMILY_STATE.events, ...events, familyTragedies: [...(events.familyTragedies ?? [])] }, conflict: { ...DEFAULT_FAMILY_STATE.conflict, ...conflict, index: conflictIndex } };
}

export function changeFamily(current: FamilyState, changes: Partial<Pick<FamilyState, 'familyOrigin' | 'spouseBond' | 'childBond'>> & { conflict?: number }): FamilyState {
  const s = normalizeFamily(current); const conflict = clamp(s.conflict.index + (changes.conflict ?? 0));
  return normalizeFamily({ ...s, familyOrigin: clamp(s.familyOrigin + (changes.familyOrigin ?? 0)), spouseBond: clamp(s.spouseBond + (changes.spouseBond ?? 0)), childBond: clamp(s.childBond + (changes.childBond ?? 0)), conflict: { ...s.conflict, index: conflict } });
}

export function tickFamily(current: FamilyState, workPressure: number, economicStability: number, newYear = false): FamilyState {
  const s = normalizeFamily(current); const conflictGain = workPressure > 70 ? 2 : workPressure > 50 ? 1 : -1;
  const conflict = clamp(s.conflict.index + conflictGain); const functionScore = clamp(s.familyOrigin * 0.25 + s.spouseBond * 0.35 + s.childBond * 0.25 + economicStability * 0.15 - conflict * 0.1);
  return { ...s, familyFunction: functionScore, children: newYear ? s.children.map(child => ({ ...child, age: child.age + 1 })) : s.children, conflict: { ...s.conflict, index: conflict } };
}
