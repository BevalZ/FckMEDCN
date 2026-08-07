export type FinalChoice = 'worth_it' | 'did_my_best' | 'passed_the_baton' | 'rest' | null;
export type TombstoneChoice = 'doctor' | 'healer' | 'book' | 'family_teacher' | 'oath' | null;

export interface LateLifeState {
  legacy: number;
  social: number;
  cognition: number;
  completion: number;
  bucketList: { memoir: boolean; lastVisit: boolean; lastPerson: boolean; apology: boolean; will: boolean; tree: boolean };
  finalChoice: FinalChoice;
  tombstone: TombstoneChoice;
  echoesConsumed: string[];
}

export const DEFAULT_LATE_LIFE_STATE: LateLifeState = {
  legacy: 0,
  social: 75,
  cognition: 90,
  completion: 0,
  bucketList: { memoir: false, lastVisit: false, lastPerson: false, apology: false, will: false, tree: false },
  finalChoice: null,
  tombstone: null,
  echoesConsumed: [],
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeLateLife(raw?: Partial<LateLifeState>): LateLifeState {
  const r = raw ?? {};
  return {
    ...DEFAULT_LATE_LIFE_STATE,
    ...r,
    legacy: clamp(r.legacy ?? 0), social: clamp(r.social ?? 75),
    cognition: clamp(r.cognition ?? 90), completion: clamp(r.completion ?? 0),
    bucketList: { ...DEFAULT_LATE_LIFE_STATE.bucketList, ...(r.bucketList ?? {}) },
    echoesConsumed: [...(r.echoesConsumed ?? [])],
  };
}

export function tickLateLife(current: LateLifeState, stage: string): LateLifeState {
  const s = normalizeLateLife(current);
  if (stage === 'retirement') return { ...s, social: clamp(s.social - 2), cognition: clamp(s.cognition - 1) };
  if (stage === 'eternity') return { ...s, social: clamp(s.social - 3), cognition: clamp(s.cognition - 2) };
  return s;
}

