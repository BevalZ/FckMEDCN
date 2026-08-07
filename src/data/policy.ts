export type HospitalFinancialStatus = 'healthy' | 'strained' | 'crisis';

export interface PolicyState {
  deptSurplus: number;
  drgPressure: number;
  procurementCompliance: number;
  complianceRisk: number;
  drg: { version: '1.0' | '2.0'; pointTrend: number; knowledge: number; excessPenalty: number };
  procurement: { rounds: string[]; productsAffected: string[]; savingsRetained: number; efficacyComplaints: number };
  hospital: { financialStatus: HospitalFinancialStatus; inspectionHistory: string[] };
  policyViolations: string[];
  totalPenalties: number;
}

export const DEFAULT_POLICY_STATE: PolicyState = {
  deptSurplus: 20,
  drgPressure: 0,
  procurementCompliance: 50,
  complianceRisk: 0,
  drg: { version: '2.0', pointTrend: 0, knowledge: 0, excessPenalty: 0.5 },
  procurement: { rounds: [], productsAffected: [], savingsRetained: 0, efficacyComplaints: 0 },
  hospital: { financialStatus: 'healthy', inspectionHistory: [] },
  policyViolations: [],
  totalPenalties: 0,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export function normalizePolicy(raw?: Partial<PolicyState>): PolicyState {
  const r = raw ?? {};
  return {
    ...DEFAULT_POLICY_STATE,
    ...r,
    deptSurplus: clamp(r.deptSurplus ?? 20, -100, 100),
    drgPressure: clamp(r.drgPressure ?? 0),
    procurementCompliance: clamp(r.procurementCompliance ?? 50),
    complianceRisk: clamp(r.complianceRisk ?? 0),
    drg: { ...DEFAULT_POLICY_STATE.drg, ...(r.drg ?? {}) },
    procurement: {
      ...DEFAULT_POLICY_STATE.procurement, ...(r.procurement ?? {}),
      rounds: [...(r.procurement?.rounds ?? [])],
      productsAffected: [...(r.procurement?.productsAffected ?? [])],
    },
    hospital: {
      ...DEFAULT_POLICY_STATE.hospital, ...(r.hospital ?? {}),
      inspectionHistory: [...(r.hospital?.inspectionHistory ?? [])],
    },
    policyViolations: [...(r.policyViolations ?? [])],
  };
}

export function tickPolicyState(current: PolicyState, stage: string, turn: number): PolicyState {
  const p = normalizePolicy(current);
  if (!['career', 'pinnacle', 'retirement', 'eternity'].includes(stage)) return p;
  const active = stage === 'career' || stage === 'pinnacle';
  const drgPressure = clamp(p.drgPressure + (active ? 2 : 0));
  const pointTrend = turn > 0 && turn % 4 === 0 ? -Math.min(5, 1 + Math.floor(drgPressure / 30)) : p.drg.pointTrend;
  const deptSurplus = clamp(p.deptSurplus + Math.round((p.procurementCompliance - 50) / 20) + pointTrend, -100, 100);
  const financialStatus: HospitalFinancialStatus = deptSurplus < -40 ? 'crisis' : deptSurplus < 0 ? 'strained' : 'healthy';
  return { ...p, drgPressure, deptSurplus, drg: { ...p.drg, pointTrend }, hospital: { ...p.hospital, financialStatus } };
}

export function policyPerformanceMultiplier(policy: PolicyState, stage: string): number {
  if (stage !== 'career' && stage !== 'pinnacle') return 1;
  const pressurePenalty = policy.drgPressure * 0.002;
  const surplus = policy.deptSurplus >= 0 ? Math.min(0.12, policy.deptSurplus / 500) : Math.max(-0.25, policy.deptSurplus / 300);
  return Math.max(0.6, Math.min(1.15, 1 - pressurePenalty + surplus));
}

