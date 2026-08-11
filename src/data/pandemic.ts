import { addNews, clearFlag, getState, hasFlag, patchState, setFlag } from './gameState';
import type { StatDelta } from './stats';

export type PandemicSeverity = 'localized' | 'regional' | 'global';

export interface PandemicState {
  active: boolean;
  severity: PandemicSeverity;
  remainingQuarters: number;
  nextOutbreakAt: number;
  outbreakCount: number;
  quartersServed: number;
}

export interface PandemicQuarterOutcome {
  active: boolean;
  started: boolean;
  ended: boolean;
  severity: PandemicSeverity | null;
  delta: StatDelta;
  message: string;
}

const quarterIndex = (year: number, quarter: number) => year * 4 + quarter - 1;
const nextInterval = (random: () => number) => 40 + Math.floor(random() * 21);

export function createPandemicState(year = 2024, quarter = 3, random: () => number = Math.random): PandemicState {
  return {
    active: false,
    severity: 'localized',
    remainingQuarters: 0,
    nextOutbreakAt: quarterIndex(year, quarter) + nextInterval(random),
    outbreakCount: 0,
    quartersServed: 0,
  };
}

export function normalizePandemic(raw: Partial<PandemicState> | undefined, year: number, quarter: number): PandemicState {
  const fallback = createPandemicState(year, quarter);
  if (!raw) return fallback;
  return {
    active: Boolean(raw.active),
    severity: raw.severity === 'regional' || raw.severity === 'global' ? raw.severity : 'localized',
    remainingQuarters: Math.max(0, Math.round(raw.remainingQuarters ?? 0)),
    nextOutbreakAt: Math.max(0, Math.round(raw.nextOutbreakAt ?? fallback.nextOutbreakAt)),
    outbreakCount: Math.max(0, Math.round(raw.outbreakCount ?? 0)),
    quartersServed: Math.max(0, Math.round(raw.quartersServed ?? 0)),
  };
}

function rollSeverity(random: () => number): PandemicSeverity {
  const roll = random();
  if (roll < 0.5) return 'localized';
  if (roll < 0.84) return 'regional';
  return 'global';
}

function severityLabel(severity: PandemicSeverity): string {
  if (severity === 'global') return '大流行';
  if (severity === 'regional') return '区域疫情';
  return '局部疫情';
}

function pandemicDelta(stage: string, severity: PandemicSeverity): StatDelta {
  const clinicalStage = ['internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'].includes(stage);
  const scale = severity === 'global' ? 3 : severity === 'regional' ? 2 : 1;
  if (clinicalStage) {
    return { stamina: -3 * scale, sanity: -2 * scale, clinical: scale, money: severity === 'global' ? 1200 : 0 };
  }
  return { sanity: -scale, stamina: -scale, money: -400 * scale };
}

const PANDEMIC_CHOICE_FLAGS = [
  'pandemic_frontline', 'pandemic_support', 'pandemic_withdrew',
  'pandemic_hoarded_ppe', 'pandemic_transparent_aid',
  'pandemic_triage_protocol', 'pandemic_unfair_triage',
  'pandemic_research_clean', 'pandemic_research_rushed',
] as const;

function addDelta(target: StatDelta, extra: StatDelta): StatDelta {
  const result = { ...target };
  for (const [key, value] of Object.entries(extra)) {
    const stat = key as keyof StatDelta;
    result[stat] = (result[stat] ?? 0) + (value ?? 0);
  }
  return result;
}

/** 疫情选择不是一次性文案：在本轮疫情余下季度持续形成工作与关系回响。 */
function pandemicChoiceDelta(): StatDelta {
  let delta: StatDelta = {};
  if (hasFlag('pandemic_frontline')) delta = addDelta(delta, { stamina: -2, clinical: 1, reputation: 1 });
  if (hasFlag('pandemic_support')) delta = addDelta(delta, { stamina: -1, relations: 1 });
  if (hasFlag('pandemic_withdrew')) delta = addDelta(delta, { sanity: 1, reputation: -1 });
  if (hasFlag('pandemic_hoarded_ppe')) delta = addDelta(delta, { stamina: 1, relations: -1, sanity: -1 });
  if (hasFlag('pandemic_transparent_aid')) delta = addDelta(delta, { relations: 1, reputation: 1 });
  if (hasFlag('pandemic_triage_protocol')) delta = addDelta(delta, { clinical: 1, sanity: -1 });
  if (hasFlag('pandemic_unfair_triage')) delta = addDelta(delta, { sanity: -2, reputation: -1 });
  if (hasFlag('pandemic_research_clean')) delta = addDelta(delta, { research: 1 });
  if (hasFlag('pandemic_research_rushed')) delta = addDelta(delta, { sanity: -1 });
  return delta;
}

export function tickPandemicQuarter(stage: string, random: () => number = Math.random): PandemicQuarterOutcome {
  const state = getState();
  let pandemic = normalizePandemic(state.pandemic, state.year, state.quarter);
  const now = quarterIndex(state.year, state.quarter);
  let started = false;
  let ended = false;

  if (!pandemic.active && now >= pandemic.nextOutbreakAt) {
    const severity = rollSeverity(random);
    const baseDuration = severity === 'global' ? 6 : severity === 'regional' ? 4 : 3;
    pandemic = {
      ...pandemic,
      active: true,
      severity,
      remainingQuarters: baseDuration + Math.floor(random() * 3),
      // 周期按两次爆发起点计算；若从结束后再计时，实际间隔会被持续期额外拉长。
      nextOutbreakAt: now + nextInterval(random),
      outbreakCount: pandemic.outbreakCount + 1,
    };
    started = true;
    setFlag('pandemic_active');
    setFlag('pandemic_response_due');
    addNews({
      year: state.year,
      quarter: state.quarter,
      headline: `突发公共卫生事件：${severityLabel(severity)}进入应急响应。`,
      type: severity === 'global' ? 'tragedy' : 'warning',
    });
  }

  if (!pandemic.active) {
    patchState({ pandemic });
    return { active: false, started, ended: false, severity: null, delta: {}, message: '' };
  }

  const severity = pandemic.severity;
  const delta = addDelta(pandemicDelta(stage, severity), pandemicChoiceDelta());
  const remainingQuarters = pandemic.remainingQuarters - 1;
  pandemic = { ...pandemic, remainingQuarters, quartersServed: pandemic.quartersServed + 1 };
  if (remainingQuarters <= 0) {
    pandemic = {
      ...pandemic,
      active: false,
      remainingQuarters: 0,
    };
    ended = true;
    clearFlag('pandemic_active');
    clearFlag('pandemic_response_due');
    for (const flag of PANDEMIC_CHOICE_FLAGS) clearFlag(flag);
    addNews({ year: state.year, quarter: state.quarter, headline: '疫情应急响应结束，医院逐步恢复常态诊疗。', type: 'event' });
  }
  patchState({ pandemic });
  return {
    active: !ended,
    started,
    ended,
    severity,
    delta,
    message: ended ? '疫情应急响应结束' : `${severityLabel(severity)}持续，医疗系统处于高负荷`,
  };
}
