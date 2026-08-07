import { getState, patchState, setFlag, hasFlag } from './gameState';
import { updateStats } from './gameState';
import type { GameState, MentorStyle } from './gameState';

/** 时代3：规培与硕博并行的共享进度。数值刻意保持在 0..100，便于 HUD 和测试读取。 */
export type Era3Path = 'specialist_master' | 'academic_phd' | 'eight_year_phd';
export type Era3Assessment = 'midterm' | 'completion';
export type MentorType = 'hands_off' | 'push' | 'caring' | 'exploitative';

export interface Era3Progress {
  initialized: boolean;
  path: Era3Path;
  elapsedQuarters: number;
  year: number;
  clinicalPressure: number;
  researchPressure: number;
  sleepDebt: number;
  estimatedSleep: number;
  consecutiveShortSleep: number;
  financialCrisisMonths: number;
  thoughtOfQuitting: number;
  extensionMonths: number;
  medicalErrors: number;
  mentor: { type: MentorType; relationship: number; meetings: number };
  residency: { rotationsCompleted: number; casesCompleted: number; proceduresCompleted: number; nightShifts: number; evaluation: number };
  research: { paperProgress: number; thesisProgress: number; submitted: boolean; accepted: boolean };
  midtermScore: number | null;
  completionScore: number | null;
}

export const DEFAULT_ERA3_PROGRESS: Era3Progress = {
  initialized: false,
  path: 'specialist_master', elapsedQuarters: 0, year: 1,
  clinicalPressure: 0, researchPressure: 0, sleepDebt: 0, estimatedSleep: 8,
  consecutiveShortSleep: 0, financialCrisisMonths: 0, thoughtOfQuitting: 0,
  extensionMonths: 0, medicalErrors: 0,
  mentor: { type: 'hands_off', relationship: 45, meetings: 0 },
  residency: { rotationsCompleted: 0, casesCompleted: 0, proceduresCompleted: 0, nightShifts: 0, evaluation: 0 },
  research: { paperProgress: 0, thesisProgress: 0, submitted: false, accepted: false },
  midtermScore: null, completionScore: null,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export function deriveEra3Path(state: GameState): Era3Path {
  if (state.track === 'eight_year') return 'eight_year_phd';
  if (state.track === 'five_plus_three' || state.degree === 'master_pro') return 'specialist_master';
  return hasFlag('track_research') ? 'academic_phd' : 'specialist_master';
}

export function normalizeEra3(raw: Partial<Era3Progress> | undefined, state?: GameState): Era3Progress {
  const base = DEFAULT_ERA3_PROGRESS;
  const r = raw ?? {};
  const mentor = { ...base.mentor, ...(r.mentor ?? {}) };
  const residency = { ...base.residency, ...(r.residency ?? {}) };
  const research = { ...base.research, ...(r.research ?? {}) };
  return {
    ...base, ...r,
    initialized: Boolean(r.initialized),
    path: r.path ?? (state ? deriveEra3Path(state) : base.path),
    mentor, residency, research,
    elapsedQuarters: Math.max(0, r.elapsedQuarters ?? 0),
    year: Math.max(1, r.year ?? 1),
    clinicalPressure: clamp(r.clinicalPressure ?? 0),
    researchPressure: clamp(r.researchPressure ?? 0),
    sleepDebt: clamp(r.sleepDebt ?? 0),
    estimatedSleep: Math.max(3, Math.min(8, r.estimatedSleep ?? 8)),
    consecutiveShortSleep: Math.max(0, r.consecutiveShortSleep ?? 0),
    financialCrisisMonths: Math.max(0, r.financialCrisisMonths ?? 0),
    thoughtOfQuitting: Math.max(0, r.thoughtOfQuitting ?? 0),
    extensionMonths: Math.max(0, r.extensionMonths ?? 0),
    medicalErrors: Math.max(0, r.medicalErrors ?? 0),
    midtermScore: r.midtermScore ?? null,
    completionScore: r.completionScore ?? null,
  };
}

function mentorFromExistingStyle(style: MentorStyle): MentorType {
  if (style === 'generous') return 'caring';
  if (style === 'pyramid') return 'push';
  if (style === 'tight') return 'exploitative';
  return 'hands_off';
}

export function ensureEra3(): Era3Progress {
  const state = getState();
  const current = normalizeEra3(state.era3, state);
  if (!current.initialized) {
    current.initialized = true;
    current.path = deriveEra3Path(state);
    current.mentor.type = mentorFromExistingStyle(state.mentorStyle);
    patchState({ era3: current });
    setFlag('era3_started');
  }
  return current;
}

export function changeEra3Pressure(axis: 'clinical' | 'research', amount: number) {
  const e = ensureEra3();
  patchState({ era3: { ...e, [axis === 'clinical' ? 'clinicalPressure' : 'researchPressure']:
    clamp((axis === 'clinical' ? e.clinicalPressure : e.researchPressure) + amount) } });
}

export function changeEra3Mentor(amount: number) {
  const e = ensureEra3();
  patchState({ era3: { ...e, mentor: { ...e.mentor, relationship: clamp(e.mentor.relationship + amount) } } });
}

export function changeEra3QuitThoughts(amount: number) {
  const e = ensureEra3();
  patchState({ era3: { ...e, thoughtOfQuitting: Math.max(0, e.thoughtOfQuitting + Math.round(amount)) } });
}

export function advanceResidencyProgress(delta: Partial<Era3Progress['residency']>) {
  const e = ensureEra3();
  const r = e.residency;
  patchState({ era3: { ...e, residency: {
    rotationsCompleted: Math.max(0, r.rotationsCompleted + (delta.rotationsCompleted ?? 0)),
    casesCompleted: Math.max(0, r.casesCompleted + (delta.casesCompleted ?? 0)),
    proceduresCompleted: Math.max(0, r.proceduresCompleted + (delta.proceduresCompleted ?? 0)),
    nightShifts: Math.max(0, r.nightShifts + (delta.nightShifts ?? 0)),
    evaluation: clamp(r.evaluation + (delta.evaluation ?? 0)),
  } } });
}

// 与 ChoiceEffect 的命名保持一致；实际进度写入仍集中在一个实现中。
export const advanceEra3Progress = advanceResidencyProgress;

export function advanceResearchProgress(delta: Partial<Era3Progress['research']>) {
  const e = ensureEra3();
  const r = e.research;
  patchState({ era3: { ...e, research: {
    ...r,
    paperProgress: clamp(r.paperProgress + (delta.paperProgress ?? 0)),
    thesisProgress: clamp(r.thesisProgress + (delta.thesisProgress ?? 0)),
    submitted: delta.submitted ?? r.submitted,
    accepted: delta.accepted ?? r.accepted,
  } } });
}

export function recordMedicalError() {
  const e = ensureEra3();
  patchState({ era3: { ...e, medicalErrors: e.medicalErrors + 1 } });
  setFlag('era3_medical_error');
}

export function resolveEra3Assessment(kind: Era3Assessment): number {
  const e = ensureEra3();
  const s = getState();
  const score = clamp(
    (s.stats.knowledge ?? 0) * 0.25 + (s.stats.clinical ?? 0) * 0.3
      + (s.stats.research ?? 0) * 0.2 + e.mentor.relationship * 0.1
      + e.residency.evaluation * 0.1 + (s.attrs?.luck ?? 0) * 1,
  );
  patchState({ era3: { ...e, [kind === 'midterm' ? 'midtermScore' : 'completionScore']: score } });
  setFlag(`era3_${kind}_${score >= 60 ? 'passed' : 'failed'}`);
  if (score < 60) {
    setFlag('era3_extended');
    patchState({ era3: { ...getState().era3, extensionMonths: Math.max(getState().era3.extensionMonths, 6) } });
  }
  return score;
}

export function resolveEra3Submission(tier: 'safe' | 'ambitious'): string {
  const e = ensureEra3();
  const s = getState();
  const chance = clamp((s.stats.research ?? 0) * 0.45 + (s.stats.knowledge ?? 0) * 0.2
    + e.mentor.relationship * 0.15 + e.research.paperProgress * 0.15
    + (s.attrs?.luck ?? 0) * 2 + (tier === 'ambitious' ? -12 : 8));
  const roll = Math.random() * 100;
  const result = roll < chance * 0.35 ? 'accepted' : roll < chance * 0.75 ? 'minor_revision' : roll < chance ? 'major_revision' : 'rejected';
  advanceResearchProgress({ submitted: true, accepted: result === 'accepted' });
  setFlag(`era3_submission_${result}`);
  return result;
}

/** 每个季度由 turnFlow 调用，保证卡片/地图两种场景一致。 */
export function tickEra3Quarter(stage: string) {
  if (stage !== 'guipei' && stage !== 'master' && stage !== 'phd') return;
  const e = ensureEra3();
  const clinical = stage === 'guipei' ? 9 : 2;
  const research = stage === 'guipei' ? 4 : 9;
  const nextClinical = clamp(e.clinicalPressure + clinical);
  const nextResearch = clamp(e.researchPressure + research);
  const sleep = Math.max(3, Math.min(8, 8 - nextClinical / 28 - nextResearch / 40));
  const short = sleep < 6 ? e.consecutiveShortSleep + 1 : 0;
  const next: Era3Progress = {
    ...e, elapsedQuarters: e.elapsedQuarters + 1,
    year: Math.min(6, Math.floor(e.elapsedQuarters / 4) + 1),
    clinicalPressure: Math.max(0, nextClinical - (sleep >= 6 ? 4 : 1)),
    researchPressure: Math.max(0, nextResearch - (sleep >= 6 ? 3 : 1)),
    estimatedSleep: Number(sleep.toFixed(1)),
    sleepDebt: clamp(e.sleepDebt + Math.max(0, 6 - sleep) * 8),
    consecutiveShortSleep: short,
  };
  if (stage === 'guipei') {
    next.residency = { ...e.residency, casesCompleted: e.residency.casesCompleted + 12,
      proceduresCompleted: e.residency.proceduresCompleted + 4, nightShifts: e.residency.nightShifts + 2,
      rotationsCompleted: Math.min(18, e.residency.rotationsCompleted + (next.elapsedQuarters % 2 === 0 ? 1 : 0)) };
  } else {
    next.research = { ...e.research, thesisProgress: clamp(e.research.thesisProgress + 4) };
  }
  patchState({ era3: next });
  if (sleep < 5) updateStats({ stamina: -4, sanity: -2 });
  if (nextClinical > 80) setFlag('era3_clinical_overload');
  if (nextResearch > 80) setFlag('era3_research_overload');
  if (short >= 3) setFlag('era3_sleep_warning');
  if (getState().stats.money < 0) {
    const updated = { ...getState().era3, financialCrisisMonths: getState().era3.financialCrisisMonths + 3 };
    patchState({ era3: updated });
    if (updated.financialCrisisMonths >= 3) setFlag('era3_financial_crisis');
  }
}

export function era3Label(e = getState().era3): string {
  return `临床压 ${e.clinicalPressure} · 科研压 ${e.researchPressure} · 睡眠 ${e.estimatedSleep}h`;
}
