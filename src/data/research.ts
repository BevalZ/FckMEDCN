export type PaperType = 'basic' | 'clinical' | 'translational' | 'review' | 'case_report';
export type Authorship = 'first' | 'co_first' | 'corresponding' | 'co_author';
export type JournalTier = 'top' | 'high' | 'sci' | 'core' | 'warning';
export type GrantType = 'hospital' | 'city' | 'provincial' | 'nsfc_youth' | 'nsfc_general' | 'nsfc_elite';
export type GrantStatus = 'pending' | 'approved' | 'rejected' | 'retracted';

export interface PublishedPaper {
  title: string;
  journal: string;
  impactFactor: number;
  authorship: Authorship;
  year: number;
  citations: number;
  isRetracted: boolean;
  type: PaperType;
}

export interface ResearchState {
  researchAbility: number;
  paperProgress: number;
  academicReputation: number;
  misconductRisk: number;
  clinicalTime: number;
  researchTime: number;
  representativeIndex: number;
  papers: {
    published: PublishedPaper[];
    inProgress: { title: string; progress: number; type: PaperType; estimatedCompletion: number } | null;
  };
  grants: {
    applied: { type: GrantType; year: number; status: GrantStatus; amount: number }[];
    active: { type: GrantType; remainingFunds: number; remainingYears: number }[];
  };
  misconduct: {
    violations: string[];
    investigationStatus: 'none' | 'pending' | 'ongoing' | 'resolved';
    penalty: { fundingBan: number; paperRetraction: boolean; reputationLoss: number };
  };
  researchDirection: 'basic' | 'clinical' | 'translational' | 'mixed';
  failedGrantYears: number;
}

export const DEFAULT_RESEARCH_STATE: ResearchState = {
  researchAbility: 5,
  paperProgress: 0,
  academicReputation: 0,
  misconductRisk: 0,
  clinicalTime: 0,
  researchTime: 0,
  representativeIndex: 0,
  papers: { published: [], inProgress: null },
  grants: { applied: [], active: [] },
  misconduct: { violations: [], investigationStatus: 'none', penalty: { fundingBan: 0, paperRetraction: false, reputationLoss: 0 } },
  researchDirection: 'mixed',
  failedGrantYears: 0,
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeResearch(raw?: Partial<ResearchState>, legacyResearch = 5, legacyPapers = 0): ResearchState {
  const r = raw ?? {};
  const papers = (r.papers ?? {}) as Partial<ResearchState['papers']>;
  const grants = (r.grants ?? {}) as Partial<ResearchState['grants']>;
  const misconduct = (r.misconduct ?? {}) as Partial<ResearchState['misconduct']>;
  return {
    ...DEFAULT_RESEARCH_STATE,
    ...r,
    researchAbility: clamp(r.researchAbility ?? legacyResearch),
    paperProgress: clamp(r.paperProgress ?? 0),
    academicReputation: clamp(r.academicReputation ?? Math.min(100, legacyPapers * 5)),
    misconductRisk: clamp(r.misconductRisk ?? 0),
    clinicalTime: Math.max(0, r.clinicalTime ?? 0),
    researchTime: Math.max(0, r.researchTime ?? 0),
    representativeIndex: Math.max(0, r.representativeIndex ?? 0),
    papers: {
      ...DEFAULT_RESEARCH_STATE.papers,
      ...papers,
      published: [...(papers.published ?? [])],
      inProgress: papers.inProgress ? { ...papers.inProgress, progress: clamp(papers.inProgress.progress ?? 0) } : null,
    },
    grants: { ...DEFAULT_RESEARCH_STATE.grants, ...grants, applied: [...(grants.applied ?? [])], active: [...(grants.active ?? [])] },
    misconduct: {
      ...DEFAULT_RESEARCH_STATE.misconduct,
      ...misconduct,
      violations: [...(misconduct.violations ?? [])],
      penalty: { ...DEFAULT_RESEARCH_STATE.misconduct.penalty, ...(misconduct.penalty ?? {}) },
    },
    failedGrantYears: Math.max(0, r.failedGrantYears ?? 0),
  };
}

export interface ResearchTickContext {
  stage: string;
  age: number;
  statsResearch: number;
  statsPapers: number;
  mentorBond: number;
  factionBonus: number;
  healthEnergy: number;
  policyPressure: number;
}

export function tickResearchState(current: ResearchState, ctx: ResearchTickContext): ResearchState {
  const r = normalizeResearch(current, ctx.statsResearch, ctx.statsPapers);
  const active = ['undergrad', 'guipei', 'master', 'phd', 'career', 'pinnacle', 'retirement', 'eternity'].includes(ctx.stage);
  if (!active) return r;
  const researchShare = ctx.stage === 'master' || ctx.stage === 'phd' ? 2 : ctx.stage === 'career' || ctx.stage === 'pinnacle' ? 1 : 0;
  const ability = clamp(r.researchAbility * 0.85 + ctx.statsResearch * 0.1 + ctx.mentorBond * 0.03 + ctx.factionBonus * 0.02);
  let paperProgress = r.paperProgress;
  let inProgress = r.papers.inProgress;
  if (inProgress && researchShare > 0) {
    const gain = Math.max(1, Math.round(ability * 0.05 + researchShare - ctx.policyPressure * 0.02 - (ctx.healthEnergy < 30 ? 2 : 0)));
    const nextProgress = clamp(inProgress.progress + gain);
    inProgress = { ...inProgress, progress: nextProgress };
    paperProgress = nextProgress;
    if (nextProgress >= 100) inProgress = { ...inProgress, progress: 100 };
  }
  const misconductRisk = clamp(Math.max(r.misconductRisk, 0));
  const activeFunds = r.grants.active.map(g => ({ ...g, remainingYears: Math.max(0, g.remainingYears - (ctx.stage === 'career' || ctx.stage === 'pinnacle' ? 1 : 0)) }));
  return { ...r, researchAbility: ability, paperProgress, papers: { ...r.papers, inProgress }, misconductRisk, grants: { ...r.grants, active: activeFunds } };
}

export function changeResearchState(current: ResearchState, field: 'researchAbility' | 'paperProgress' | 'academicReputation' | 'misconductRisk' | 'clinicalTime' | 'researchTime' | 'representativeIndex', amount: number): ResearchState {
  const r = normalizeResearch(current);
  const next = field === 'clinicalTime' || field === 'researchTime' || field === 'representativeIndex'
    ? Math.max(0, (r[field] ?? 0) + amount) : clamp((r[field] ?? 0) + amount);
  return { ...r, [field]: next };
}

export function startResearchProject(current: ResearchState, title: string, type: PaperType, progress = 0): ResearchState {
  const r = normalizeResearch(current);
  const project = { title, type, progress: clamp(progress), estimatedCompletion: 4 };
  return { ...r, paperProgress: project.progress, papers: { ...r.papers, inProgress: project } };
}

export function publishPaper(current: ResearchState, paper: Omit<PublishedPaper, 'year' | 'citations' | 'isRetracted'>, year: number): ResearchState {
  const r = normalizeResearch(current);
  const published: PublishedPaper = { ...paper, year, citations: 0, isRetracted: false };
  const active = [...r.papers.published, published];
  const representativeIndex = Math.max(r.representativeIndex, published.impactFactor);
  return { ...r, paperProgress: 0, academicReputation: clamp(r.academicReputation + Math.max(2, Math.round(published.impactFactor * (published.authorship === 'first' ? 1 : 0.5)))), representativeIndex, papers: { ...r.papers, published: active, inProgress: null } };
}

export function grantAmount(type: GrantType): number {
  return { hospital: 30000, city: 100000, provincial: 300000, nsfc_youth: 300000, nsfc_general: 700000, nsfc_elite: 2500000 }[type];
}

export function grantSuccessRate(r: ResearchState, type: GrantType, mentorBond: number, luck: number): number {
  const base = { hospital: 0.55, city: 0.3, provincial: 0.2, nsfc_youth: 0.1055, nsfc_general: 0.0892, nsfc_elite: 0.07 }[type];
  const abilityBonus = Math.max(-0.04, Math.min(0.14, (r.researchAbility - 50) / 400));
  const reputationBonus = Math.min(0.08, r.academicReputation / 1500);
  const mentorBonus = Math.min(0.08, mentorBond / 1500);
  const luckBonus = Math.min(0.03, luck / 500);
  return Math.max(0.01, Math.min(0.75, base + abilityBonus + reputationBonus + mentorBonus + luckBonus));
}

export function recordMisconduct(current: ResearchState, violation: string, amount: number): ResearchState {
  const r = normalizeResearch(current);
  const violations = r.misconduct.violations.includes(violation) ? r.misconduct.violations : [...r.misconduct.violations, violation];
  return { ...r, misconductRisk: clamp(r.misconductRisk + amount), misconduct: { ...r.misconduct, violations, investigationStatus: r.misconduct.investigationStatus === 'none' ? 'pending' : r.misconduct.investigationStatus } };
}

export function retractLatestPaper(current: ResearchState): ResearchState {
  const r = normalizeResearch(current);
  const index = [...r.papers.published].reverse().findIndex(p => !p.isRetracted);
  if (index < 0) return r;
  const realIndex = r.papers.published.length - 1 - index;
  const published = r.papers.published.map((p, i) => i === realIndex ? { ...p, isRetracted: true } : p);
  return { ...r, academicReputation: clamp(r.academicReputation - 20), misconduct: { ...r.misconduct, penalty: { ...r.misconduct.penalty, paperRetraction: true, reputationLoss: r.misconduct.penalty.reputationLoss + 20 } }, papers: { ...r.papers, published } };
}
