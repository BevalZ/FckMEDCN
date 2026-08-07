import { getState, patchState, setFlag } from './gameState';

export type AcademicCrisisLevel = 0 | 1 | 2 | 3 | 4;

export interface UndergradProgress {
  professionalIdentity: number;
  crisisCredits: number;
  crisisLevel: AcademicCrisisLevel;
  academicWarnings: number;
  dropoutThoughts: number;
  crashCount: number;
  isOnLeave: boolean;
}

export const DEFAULT_UNDERGRAD_PROGRESS: UndergradProgress = {
  professionalIdentity: 50,
  crisisCredits: 0,
  crisisLevel: 0,
  academicWarnings: 0,
  dropoutThoughts: 0,
  crashCount: 0,
  isOnLeave: false,
};

export function academicCrisisLevel(credits: number, heldBack: boolean): AcademicCrisisLevel {
  if (heldBack && credits >= 30) return 4;
  if (credits >= 20) return 3;
  if (credits >= 14) return 2;
  if (credits >= 8) return 1;
  return 0;
}

export function normalizeUndergradProgress(raw?: Partial<UndergradProgress> | null): UndergradProgress {
  const crisisCredits = Math.max(0, Math.round(raw?.crisisCredits ?? 0));
  return {
    professionalIdentity: Math.max(0, Math.min(100, Math.round(raw?.professionalIdentity ?? 50))),
    crisisCredits,
    crisisLevel: Math.max(0, Math.min(4, Math.round(raw?.crisisLevel ?? academicCrisisLevel(crisisCredits, false)))) as AcademicCrisisLevel,
    academicWarnings: Math.max(0, Math.round(raw?.academicWarnings ?? 0)),
    dropoutThoughts: Math.max(0, Math.round(raw?.dropoutThoughts ?? 0)),
    crashCount: Math.max(0, Math.round(raw?.crashCount ?? 0)),
    isOnLeave: raw?.isOnLeave === true,
  };
}

export function changeProfessionalIdentity(amount: number): number {
  const current = getState().undergrad.professionalIdentity;
  const next = Math.max(0, Math.min(100, current + Math.round(amount)));
  patchState({ undergrad: { ...getState().undergrad, professionalIdentity: next } });
  return next - current;
}

export function addCrisisCredits(amount: number): AcademicCrisisLevel {
  const state = getState();
  const before = state.undergrad;
  const crisisCredits = Math.max(0, before.crisisCredits + Math.round(amount));
  const crisisLevel = academicCrisisLevel(crisisCredits, state.flags.has('ug_holdback'));
  const warningRaised = crisisLevel > before.crisisLevel && crisisLevel >= 1;
  patchState({
    undergrad: {
      ...before,
      crisisCredits,
      crisisLevel,
      academicWarnings: before.academicWarnings + (warningRaised ? 1 : 0),
    },
  });
  if (warningRaised) setFlag(`academic_crisis_lv${crisisLevel}`);
  return crisisLevel;
}

export function changeDropoutThoughts(amount: number): number {
  const current = getState().undergrad.dropoutThoughts;
  const next = Math.max(0, current + Math.round(amount));
  patchState({ undergrad: { ...getState().undergrad, dropoutThoughts: next } });
  if (next >= 3) setFlag('dropout_decision_ready');
  return next;
}

export function setUndergradLeave(onLeave: boolean) {
  patchState({ undergrad: { ...getState().undergrad, isOnLeave: onLeave } });
}
