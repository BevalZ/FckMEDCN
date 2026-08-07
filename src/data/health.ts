export type FatigueLevel = 'well' | 'tired' | 'exhausted' | 'burnout';

export interface HealthState {
  energy: number;
  constitution: number;
  strain: number;
  chronicDiseases: string[];
  fatigueLevel: FatigueLevel;
  addiction: { caffeine: number; nicotine: number };
  majorIncidents: string[];
  collapseCount: number;
  hardCarryCount: number;
  preventiveCare: boolean;
  treatmentCost: number;
}

export const DEFAULT_HEALTH_STATE: HealthState = {
  energy: 80,
  constitution: 78,
  strain: 0,
  chronicDiseases: [],
  fatigueLevel: 'well',
  addiction: { caffeine: 0, nicotine: 0 },
  majorIncidents: [],
  collapseCount: 0,
  hardCarryCount: 0,
  preventiveCare: false,
  treatmentCost: 0,
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeHealth(raw?: Partial<HealthState>): HealthState {
  const r = raw ?? {};
  return {
    ...DEFAULT_HEALTH_STATE,
    ...r,
    energy: clamp(r.energy ?? DEFAULT_HEALTH_STATE.energy),
    constitution: clamp(r.constitution ?? DEFAULT_HEALTH_STATE.constitution),
    strain: clamp(r.strain ?? DEFAULT_HEALTH_STATE.strain),
    chronicDiseases: [...(r.chronicDiseases ?? [])],
    fatigueLevel: r.fatigueLevel ?? 'well',
    addiction: { ...DEFAULT_HEALTH_STATE.addiction, ...(r.addiction ?? {}) },
    majorIncidents: [...(r.majorIncidents ?? [])],
    collapseCount: Math.max(0, r.collapseCount ?? 0),
    hardCarryCount: Math.max(0, r.hardCarryCount ?? 0),
    treatmentCost: Math.max(0, r.treatmentCost ?? 0),
  };
}

export interface HealthTickContext {
  stage: string;
  age: number;
  quarter: number;
  stamina: number;
  surgical: boolean;
  preventiveCare: boolean;
}

export function tickHealthState(current: HealthState, ctx: HealthTickContext): HealthState {
  const h = normalizeHealth(current);
  const workload: Record<string, number> = {
    undergrad: 4, internship: 8, guipei: 12, master: 8, phd: 9,
    jobhunt: 5, career: 11, pinnacle: 10, retirement: 2, eternity: 4,
  };
  const strainGain: Record<string, number> = {
    undergrad: 1, internship: 2, guipei: 4, master: 2, phd: 3,
    jobhunt: 1, career: 3, pinnacle: 4, retirement: -2, eternity: 1,
  };
  const recovery = ctx.stage === 'retirement' ? 18 : ctx.age < 30 ? 16 : ctx.age < 45 ? 12 : 8;
  const energy = clamp(ctx.stamina + recovery - (workload[ctx.stage] ?? 5));
  let constitution = h.constitution;
  if (ctx.quarter === 1 && ctx.age >= 35) {
    const annualLoss = ctx.age >= 45 ? 3 : h.strain > 50 ? 2 : 1;
    constitution = clamp(constitution - Math.max(1, annualLoss - (ctx.preventiveCare ? 1 : 0)));
  }
  const specialtyExtra = ctx.surgical && ['career', 'pinnacle'].includes(ctx.stage) ? 1 : 0;
  const strain = clamp(h.strain + (strainGain[ctx.stage] ?? 0) + specialtyExtra - (ctx.preventiveCare ? 1 : 0));
  const fatigueLevel: FatigueLevel = energy < 20 ? 'burnout' : energy < 40 ? 'exhausted' : energy < 70 ? 'tired' : 'well';
  const diseases = new Set(h.chronicDiseases);
  if (ctx.age >= 45 && constitution < 40 && diseases.size === 0) diseases.add('高血压');
  if (strain >= 70) diseases.add(ctx.surgical ? '腰椎劳损' : '睡眠障碍');
  const treatmentCost = diseases.size * 800 + (h.preventiveCare ? 500 : 0);
  return { ...h, energy, constitution, strain, fatigueLevel, chronicDiseases: [...diseases], treatmentCost };
}

export function collapseRisk(health: HealthState): number {
  return Math.max(0, 100 - health.constitution + health.strain + (health.hardCarryCount > 0 ? 20 : 0));
}

