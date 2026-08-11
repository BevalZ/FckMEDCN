import { addNews, getState, patchState, setFlag, updateStats } from './gameState';
import { applyLegalChange, normalizeLegal } from './legal';

export type PatientSafetyLevel = 'none' | 'near_miss' | 'adverse' | 'major';

export interface PatientSafetyContext {
  stage: string;
  luck: number;
  clinical: number;
  stamina: number;
  strain: number;
  specialtyRisk: number;
  recordDefense: number;
  pandemicActive: boolean;
}

export interface PatientSafetyOutcome {
  level: PatientSafetyLevel;
  probability: number;
  message: string;
}

export function patientIncidentProbability(context: PatientSafetyContext): number {
  if (!['internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'].includes(context.stage)) return 0;
  const luckRisk = (5 - Math.max(0, Math.min(5, context.luck))) * 0.008;
  const fatigueRisk = Math.max(0, 45 - context.stamina) * 0.001;
  const strainRisk = Math.max(0, context.strain - 35) * 0.0007;
  const skillProtection = Math.max(0, Math.min(100, context.clinical)) * 0.00045;
  const recordProtection = Math.max(0, context.recordDefense - 50) * 0.00025;
  const pandemicRisk = context.pandemicActive ? 0.025 : 0;
  const probability = 0.018 * Math.max(0.7, context.specialtyRisk) + luckRisk + fatigueRisk + strainRisk + pandemicRisk - skillProtection - recordProtection;
  return Math.max(0.004, Math.min(0.24, probability));
}

export function patientIncidentLevel(context: PatientSafetyContext, severityRoll: number): PatientSafetyLevel {
  const lowLuck = (5 - Math.max(0, Math.min(5, context.luck))) * 0.035;
  const exhaustion = Math.max(0, 35 - context.stamina) * 0.004;
  const weakSkill = Math.max(0, 50 - context.clinical) * 0.003;
  const majorAt = Math.min(0.48, 0.08 + lowLuck + exhaustion + weakSkill + (context.pandemicActive ? 0.06 : 0));
  const adverseAt = Math.min(0.88, majorAt + 0.34 + Math.max(0, context.specialtyRisk - 1) * 0.12);
  if (severityRoll < majorAt) return 'major';
  if (severityRoll < adverseAt) return 'adverse';
  return 'near_miss';
}

export function rollPatientSafety(stage: string, random: () => number = Math.random): PatientSafetyOutcome {
  const state = getState();
  const specialtyRisk = state.flags.has('sub_surgery') ? 1.7 : state.flags.has('sub_obgyn') ? 1.5 : state.flags.has('sub_pediatrics') ? 1.25 : 1;
  const context: PatientSafetyContext = {
    stage,
    luck: state.attrs?.luck ?? 0,
    clinical: state.stats.clinical,
    stamina: state.stats.stamina,
    strain: state.health.strain,
    specialtyRisk,
    recordDefense: state.legal.recordDefense,
    pandemicActive: state.pandemic.active,
  };
  const probability = patientIncidentProbability(context);
  if (random() >= probability) return { level: 'none', probability, message: '' };
  const level = patientIncidentLevel(context, random());
  if (level === 'near_miss') {
    setFlag('patient_near_miss');
    updateStats({ sanity: -4, clinical: 1, stamina: -2 });
    return { level, probability, message: '一次用药或处置险些出错，团队在最后复核时拦住了。' };
  }
  if (level === 'adverse') {
    setFlag('patient_adverse_event');
    updateStats({ sanity: -10, reputation: -4, stamina: -5, money: -3000 });
    patchState({ legal: applyLegalChange(normalizeLegal(getState().legal), 'legalRisk', 12) });
    addNews({ year: state.year, quarter: state.quarter, headline: '患者安全事件：一名患者出现可处理的不良结局，医院启动复盘。', type: 'warning' });
    return { level, probability, message: '患者出现不良结局，虽然及时处理，科室仍启动了事件复盘。' };
  }
  setFlag('patient_major_accident');
  setFlag('legal_dispute_due');
  updateStats({ sanity: -22, reputation: -12, stamina: -8, money: -15000 });
  let legal = applyLegalChange(normalizeLegal(getState().legal), 'legalRisk', 30);
  legal = applyLegalChange(legal, 'lawsuitFatigue', 12);
  patchState({ legal });
  addNews({ year: state.year, quarter: state.quarter, headline: '重大医疗安全事件：患者严重受损，医疗损害鉴定程序启动。', type: 'tragedy' });
  return { level, probability, message: '患者发生严重损害，医务科、鉴定机构和家属同时进入程序。' };
}
