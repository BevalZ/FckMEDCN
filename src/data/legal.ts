export type LegalDisputeStatus = 'none' | 'complaint' | 'mediation' | 'lawsuit' | 'resolved';
export type LegalPath = 'negotiation' | 'mediation' | 'administrative' | 'lawsuit' | 'arbitration';

export interface LegalState {
  legalRisk: number;
  recordDefense: number;
  lawsuitFatigue: number;
  adminPenaltyRisk: number;
  records: { completeness: number; accuracy: number; timeliness: number; violations: string[] };
  disputes: { complaints: number; mediations: number; lawsuits: number; currentStatus: LegalDisputeStatus; totalPenalties: number; totalSuspension: number };
  presumptionOfFault: boolean;
  defensiveMedicine: number;
  communicationRecord: number;
  legalSupport: number;
}

export const DEFAULT_LEGAL_STATE: LegalState = {
  legalRisk: 0,
  recordDefense: 70,
  lawsuitFatigue: 0,
  adminPenaltyRisk: 0,
  records: { completeness: 75, accuracy: 80, timeliness: 70, violations: [] },
  disputes: { complaints: 0, mediations: 0, lawsuits: 0, currentStatus: 'none', totalPenalties: 0, totalSuspension: 0 },
  presumptionOfFault: false,
  defensiveMedicine: 0,
  communicationRecord: 45,
  legalSupport: 0,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export function normalizeLegal(raw?: Partial<LegalState>): LegalState {
  const r = raw ?? {};
  return {
    ...DEFAULT_LEGAL_STATE,
    ...r,
    legalRisk: clamp(r.legalRisk ?? 0),
    recordDefense: clamp(r.recordDefense ?? 70),
    lawsuitFatigue: clamp(r.lawsuitFatigue ?? 0),
    adminPenaltyRisk: clamp(r.adminPenaltyRisk ?? 0),
    records: { ...DEFAULT_LEGAL_STATE.records, ...(r.records ?? {}), violations: [...(r.records?.violations ?? [])] },
    disputes: { ...DEFAULT_LEGAL_STATE.disputes, ...(r.disputes ?? {}) },
    presumptionOfFault: Boolean(r.presumptionOfFault),
    defensiveMedicine: clamp(r.defensiveMedicine ?? 0),
    communicationRecord: clamp(r.communicationRecord ?? 45),
    legalSupport: clamp(r.legalSupport ?? 0),
  };
}

export interface LegalTickContext {
  stage: string;
  turn: number;
  stamina: number;
  specialtyRisk: number;
  administrative: boolean;
  policyRisk: number;
  healthEnergy: number;
}

export function tickLegalState(current: LegalState, ctx: LegalTickContext): LegalState {
  const l = normalizeLegal(current);
  const active = ['guipei', 'master', 'phd', 'career', 'pinnacle', 'retirement', 'eternity'].includes(ctx.stage);
  if (!active) return l;
  const specialty = ctx.specialtyRisk * (ctx.administrative ? 1.1 : 1);
  const workloadRisk = ctx.stamina < 30 || ctx.healthEnergy < 30 ? 3 : 1;
  const riskGain = Math.max(1, Math.round(specialty * workloadRisk + ctx.policyRisk * 0.02));
  const timelyLoss = ctx.stamina < 30 ? 3 : 1;
  const recordDefense = clamp(l.recordDefense - timelyLoss + (l.records.timeliness >= 80 ? 1 : 0));
  const legalRisk = clamp(l.legalRisk + riskGain - (l.recordDefense >= 70 ? 1 : 0));
  const fatigue = clamp(l.lawsuitFatigue - (ctx.stage === 'retirement' ? 4 : 0));
  const adminRisk = clamp(l.adminPenaltyRisk + (ctx.administrative ? 1 : 0) + ctx.policyRisk * 0.01);
  return { ...l, legalRisk, recordDefense, lawsuitFatigue: fatigue, adminPenaltyRisk: adminRisk };
}

export function applyLegalChange(current: LegalState, field: 'legalRisk' | 'recordDefense' | 'lawsuitFatigue' | 'adminPenaltyRisk' | 'defensiveMedicine' | 'communicationRecord' | 'legalSupport', amount: number): LegalState {
  const l = normalizeLegal(current);
  const next = clamp((l[field] ?? 0) + amount);
  return { ...l, [field]: next };
}

export function recordViolation(current: LegalState, violation: string, severity: 'minor' | 'major' = 'minor'): LegalState {
  const l = normalizeLegal(current);
  const violations = l.records.violations.includes(violation) ? l.records.violations : [...l.records.violations, violation];
  const severe = severity === 'major' || ['篡改病历', '隐匿病历', '销毁病历'].includes(violation);
  return {
    ...l,
    records: {
      ...l.records,
      violations,
      completeness: clamp(l.records.completeness - (severe ? 35 : 15)),
      accuracy: clamp(l.records.accuracy - (severe ? 50 : 10)),
    },
    recordDefense: severe ? 0 : clamp(l.recordDefense - 20),
    presumptionOfFault: l.presumptionOfFault || severe,
    legalRisk: clamp(l.legalRisk + (severe ? 35 : 12)),
    adminPenaltyRisk: clamp(l.adminPenaltyRisk + (severe ? 30 : 10)),
  };
}

export function resolveLegalPath(current: LegalState, path: LegalPath, outcome: 'favorable' | 'partial' | 'adverse' = 'favorable'): LegalState {
  const l = normalizeLegal(current);
  const isLitigation = path === 'lawsuit';
  const isMediation = path === 'mediation' || path === 'administrative';
  const fatigue = clamp(l.lawsuitFatigue + (isLitigation ? 35 : isMediation ? 15 : 10));
  const riskReduction = outcome === 'favorable' ? 30 : outcome === 'partial' ? 18 : 8;
  const totalPenalties = l.disputes.totalPenalties + (outcome === 'adverse' ? 50000 : outcome === 'partial' ? 15000 : 3000);
  return {
    ...l,
    legalRisk: clamp(l.legalRisk - riskReduction),
    lawsuitFatigue: fatigue,
    disputes: {
      ...l.disputes,
      mediations: l.disputes.mediations + (isMediation ? 1 : 0),
      lawsuits: l.disputes.lawsuits + (isLitigation ? 1 : 0),
      currentStatus: 'resolved',
      totalPenalties,
    },
  };
}

export function signalExistingLegalEvent(current: LegalState, eventId: string, choiceFlag?: string): LegalState {
  let next = normalizeLegal(current);
  if (eventId.startsWith('career_lawsuit_')) {
    next = resolveLegalPath(next, 'lawsuit', choiceFlag?.includes('done') ? 'partial' : 'adverse');
  } else if (eventId === 'medical_dispute' || eventId === 'career_consent_echo_hasty') {
    next = { ...next, legalRisk: clamp(next.legalRisk + 18), disputes: { ...next.disputes, complaints: next.disputes.complaints + 1, currentStatus: 'complaint' } };
  } else if (eventId === 'career_informed_consent') {
    next = applyLegalChange(next, 'recordDefense', choiceFlag === 'informed_consent_ok' ? 15 : -8);
    next = applyLegalChange(next, 'communicationRecord', choiceFlag === 'informed_consent_ok' ? 20 : -10);
  }
  return next;
}
