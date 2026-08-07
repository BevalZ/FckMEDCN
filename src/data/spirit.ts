export type PurposeType = 'idealistic' | 'family' | 'pragmatic' | 'accidental';
export interface SpiritState {
  purposePurity: number; meaning: number; flashbackCharge: number; resilience: number;
  purpose: { type: PurposeType; originStory: string; history: { event: string; delta: number; year: number }[] };
  meaningSources: { patients: number; teaching: number; peerRecognition: number; socialRecognition: number };
  meaningHistory: number[];
  flashbacks: { triggered: number; totalCharge: number; recentFlashback: { event: string; impact: number; year: number } | null };
  resiliencePillars: { belief: number; relationship: number; habit: number };
  crises: { type: 'doubt' | 'numbness' | 'aversion' | 'collapse'; year: number; resolved: boolean; resolution: 'self' | 'family' | 'peer' | 'professional' | 'none' }[];
}

export const DEFAULT_SPIRIT_STATE: SpiritState = {
  purposePurity: 50, meaning: 50, flashbackCharge: 0, resilience: 50,
  purpose: { type: 'accidental', originStory: '尚未回答为什么学医', history: [] },
  meaningSources: { patients: 0, teaching: 0, peerRecognition: 0, socialRecognition: 0 }, meaningHistory: [50],
  flashbacks: { triggered: 0, totalCharge: 0, recentFlashback: null }, resiliencePillars: { belief: 50, relationship: 50, habit: 50 }, crises: [],
};
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeSpirit(raw?: Partial<SpiritState>, purposeType: PurposeType = 'accidental'): SpiritState {
  const r = raw ?? {}; const purpose = (r.purpose ?? {}) as Partial<SpiritState['purpose']>; const sources = (r.meaningSources ?? {}) as Partial<SpiritState['meaningSources']>;
  const flashbacks = (r.flashbacks ?? {}) as Partial<SpiritState['flashbacks']>; const pillars = (r.resiliencePillars ?? {}) as Partial<SpiritState['resiliencePillars']>;
  const purity = clamp(r.purposePurity ?? ({ idealistic: 70, family: 55, pragmatic: 50, accidental: 40 }[purposeType])); const meaning = clamp(r.meaning ?? 50);
  const mergedPillars = { ...DEFAULT_SPIRIT_STATE.resiliencePillars, ...pillars, belief: purity };
  return { ...DEFAULT_SPIRIT_STATE, ...r, purposePurity: purity, meaning, flashbackCharge: clamp(r.flashbackCharge ?? 0), resilience: clamp(r.resilience ?? (mergedPillars.belief * 0.4 + mergedPillars.relationship * 0.35 + mergedPillars.habit * 0.25)),
    purpose: { ...DEFAULT_SPIRIT_STATE.purpose, ...purpose, type: purpose.type ?? purposeType, history: [...(purpose.history ?? [])] }, meaningSources: { ...DEFAULT_SPIRIT_STATE.meaningSources, ...sources }, meaningHistory: [...(r.meaningHistory ?? [meaning])],
    flashbacks: { ...DEFAULT_SPIRIT_STATE.flashbacks, ...flashbacks }, resiliencePillars: mergedPillars, crises: [...(r.crises ?? [])] };
}

export function changeSpirit(current: SpiritState, changes: Partial<Pick<SpiritState, 'purposePurity' | 'meaning' | 'flashbackCharge'>>, event?: string, year = 0): SpiritState {
  const s = normalizeSpirit(current); const purposePurity = clamp(s.purposePurity + (changes.purposePurity ?? 0)); const meaning = clamp(s.meaning + (changes.meaning ?? 0)); const flashbackCharge = clamp(s.flashbackCharge + (changes.flashbackCharge ?? 0));
  const history = event && changes.purposePurity ? [...s.purpose.history, { event, delta: changes.purposePurity, year }] : s.purpose.history;
  return normalizeSpirit({ ...s, purposePurity, meaning, flashbackCharge, purpose: { ...s.purpose, history }, meaningHistory: [...s.meaningHistory.slice(-39), meaning] });
}

export function tickSpirit(current: SpiritState, relationship: number, habit: number, strain: number): SpiritState {
  const s = normalizeSpirit(current); const pillars = { belief: s.purposePurity, relationship: clamp(relationship), habit: clamp(habit) };
  const resilience = clamp(pillars.belief * 0.4 + pillars.relationship * 0.35 + pillars.habit * 0.25); const meaningLoss = strain > 80 ? 2 : strain > 60 ? 1 : 0;
  return normalizeSpirit({ ...s, meaning: clamp(s.meaning - meaningLoss), resilience, resiliencePillars: pillars });
}

export const meaningCrisisRisk = (s: SpiritState) => clamp((100 - s.meaning) + (100 - s.resilience) - 100);
