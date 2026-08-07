export type HobbyType = 'sports' | 'reading' | 'arts' | 'travel' | 'gardening' | 'cooking' | 'learning';
export type SideBusinessType = 'online_consultation' | 'multi_site' | 'training' | 'consulting' | 'expert_witness' | 'science_blogger' | 'feidao_sunshine' | 'feidao_shadow' | 'none';
export interface LeisureState {
  lifeSatisfaction: number; hobbyLevel: number; socialCircle: number; secondCurve: number; workLifeBalance: number;
  hobbies: { type: HobbyType; level: number; timeInvested: number; achievements: string[]; active: boolean }[];
  sideBusiness: { type: SideBusinessType; quarterlyIncome: number; timeCost: number; riskLevel: 'low' | 'medium' | 'high'; compliance: 'legal' | 'gray' | 'illegal'; active: boolean; investigationRisk: number };
  social: { circles: { type: 'work' | 'hobby' | 'online' | 'academic' | 'family'; size: number; intimacy: number }[]; newContacts: number; opportunities: string[] };
  leisureHistory: { event: string; impact: number; year: number }[];
}

export const DEFAULT_LEISURE_STATE: LeisureState = { lifeSatisfaction: 40, hobbyLevel: 0, socialCircle: 20, secondCurve: 0, workLifeBalance: 22, hobbies: [],
  sideBusiness: { type: 'none', quarterlyIncome: 0, timeCost: 0, riskLevel: 'low', compliance: 'legal', active: false, investigationRisk: 0 },
  social: { circles: [{ type: 'work', size: 5, intimacy: 40 }], newContacts: 0, opportunities: [] }, leisureHistory: [] };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function normalizeLeisure(raw?: Partial<LeisureState>): LeisureState {
  const r = raw ?? {}; const side = (r.sideBusiness ?? {}) as Partial<LeisureState['sideBusiness']>; const social = (r.social ?? {}) as Partial<LeisureState['social']>;
  const hobbies = [...(r.hobbies ?? [])]; const hobbyLevel = clamp(r.hobbyLevel ?? (hobbies.length ? Math.max(...hobbies.map(h => h.level)) : 0)); const life = clamp(r.lifeSatisfaction ?? 40); const circle = clamp(r.socialCircle ?? 20);
  return { ...DEFAULT_LEISURE_STATE, ...r, lifeSatisfaction: life, hobbyLevel, socialCircle: circle, secondCurve: clamp(r.secondCurve ?? 0), workLifeBalance: clamp(r.workLifeBalance ?? life * 0.4 + hobbyLevel * 0.3 + circle * 0.3), hobbies,
    sideBusiness: { ...DEFAULT_LEISURE_STATE.sideBusiness, ...side }, social: { ...DEFAULT_LEISURE_STATE.social, ...social, circles: [...(social.circles ?? DEFAULT_LEISURE_STATE.social.circles)], opportunities: [...(social.opportunities ?? [])] }, leisureHistory: [...(r.leisureHistory ?? [])] };
}

export function changeLeisure(current: LeisureState, changes: Partial<Pick<LeisureState, 'lifeSatisfaction' | 'hobbyLevel' | 'socialCircle' | 'secondCurve'>>): LeisureState {
  const s = normalizeLeisure(current); return normalizeLeisure({ ...s, lifeSatisfaction: clamp(s.lifeSatisfaction + (changes.lifeSatisfaction ?? 0)), hobbyLevel: clamp(s.hobbyLevel + (changes.hobbyLevel ?? 0)), socialCircle: clamp(s.socialCircle + (changes.socialCircle ?? 0)), secondCurve: clamp(s.secondCurve + (changes.secondCurve ?? 0)) });
}

export function tickLeisure(current: LeisureState, workPressure: number): LeisureState {
  const s = normalizeLeisure(current); const activeHobbies = s.hobbies.filter(h => h.active); const hobbyGain = activeHobbies.length ? 1 : 0; const lifeDelta = workPressure > 75 ? -2 : activeHobbies.length ? 1 : -1;
  const hobbies = s.hobbies.map(h => h.active ? { ...h, level: clamp(h.level + 1), timeInvested: h.timeInvested + 1 } : h);
  const side = s.sideBusiness.active ? { ...s.sideBusiness, investigationRisk: clamp(s.sideBusiness.investigationRisk + (s.sideBusiness.compliance === 'illegal' ? 8 : s.sideBusiness.compliance === 'gray' ? 3 : -1)) } : s.sideBusiness;
  return normalizeLeisure({ ...s, hobbies, lifeSatisfaction: clamp(s.lifeSatisfaction + lifeDelta), hobbyLevel: clamp(s.hobbyLevel + hobbyGain), secondCurve: clamp(s.secondCurve + (side.active ? 2 : 0)), sideBusiness: side });
}
