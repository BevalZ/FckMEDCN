import { addNews, changeAttr, getCounter, getState, setCounter, updateStats, advanceTurn, hasFlag, setFlag, clearFlag, patchState } from './gameState';
import type { LifeStage } from './gameState';
import { applyChoiceEffect } from './effects';
import { getAvailableEvents, weightedRandom } from './events';
import type { EventCategory, EventChoice, GameEvent } from './events';
import { applyStageEconomy } from './economy';
import type { QuarterEconomy } from './economy';
import { rollIntegrity } from './integrity';
import type { IntegrityOutcome } from './integrity';
import type { StatDelta } from './stats';
import { checkBadges } from './badges';
import { isKnowledgeStage, tickLongSystemCounter, consumeQuarterDecay, noteStudied } from './knowledge';
import { tickEra3Quarter } from './era3';
import { tickHealthState, collapseRisk } from './health';
import { recordQuarterFinance } from './finance';
import { tickPolicyState } from './policy';
import { tickLateLife } from './lateLife';
import { signalExistingLegalEvent, tickLegalState } from './legal';
import { publishPaper, tickResearchState } from './research';
import { factionBonus, tickMentorFaction } from './mentorFaction';
import { tickColleagues } from './colleagues';
import { tickFamily } from './family';
import { tickLove } from './loveMarriage';
import { changeSpirit, tickSpirit } from './spirit';
import { publicImmunity, tickPublicImage } from './publicImage';
import { tickLeisure } from './leisure';
import { tickAffinityQuarter } from './npc';
import { renderNpcText } from './npc';
import { tickDatingOpportunity, tickNpcRomanceQuarter } from './dating';
import { tickPandemicQuarter } from './pandemic';
import { rollPatientSafety } from './patientSafety';
import { tickSpecialtyCumulative } from './specialtyLoad';

// 回合流程的共享逻辑。
// BaseStageScene（卡片模式）与 CampusScene（可行走地图）都走这里，
// 保证两种交互层的抽事件 / 提交选择 / 季度结算行为完全一致。

// 稀有事件阈值。低于此权重的事件（如跨阶段的家人离世 w=3~6）是"整个阶段偶尔来一次"
// 的设计意图，而非"某个分类里的常客"。
const RARE_WEIGHT = 20;

// 手写事件的优先概率。
//
// 程序生成的事件（eventGen.ts，约 5000 条）是"日常质感"的填充物：值班、查房、上课。
// 手写事件才是叙事主线：双线取舍、学术造假、人生变故、后果链。
// 但按纯权重抽取时，手写事件只占各阶段池的 4%~12%（实测：硕博仅 4.0%），
// 意味着读完 12 个季度的硕士，平均只能看到半个手写事件——精心写的分支几乎见不到。
//
// 故每次抽取先以此概率在**手写池**内抽，抽不到再回落到全池。
// 这样既保留生成事件的日常质感，又保证叙事主线真的能被玩家看到。
const isGenerated = (e: GameEvent) => e.id.startsWith('gen_');
const isDueEvent = (e: GameEvent) => e.requireFlag?.endsWith('_due') === true
  || e.requireFlag === 'dating_opportunity';
const LOW_SAVINGS_THRESHOLD = 10000;
const LOW_SAVINGS_COUNTER = 'career_low_savings_q';

export interface MentalDeclineOutcome {
  level: 'mild' | 'moderate' | 'severe';
  sanityDelta: number;
  message: string;
}

export interface ClinicalSatisfactionOutcome {
  kind: 'rescue' | 'recovery';
  sanityGain: number;
  rawGain: number;
  seniorityDecayPct: number;
  message: string;
}

export interface CommitChoiceOutcome {
  clinicalSatisfaction: ClinicalSatisfactionOutcome | null;
}

// 运气影响手写主线事件的出现率：运气越高，越容易遇到精心编排的主线事件。
// 运气 0 → 0.45，运气 5 → 0.75（默认 0.65 对应运气约 3）。
function handPriority(): number {
  const luck = getState().attrs?.luck ?? 3;
  return Math.min(0.8, Math.max(0.4, 0.45 + luck * 0.06));
}

function pickWithPriority(pool: GameEvent[]): GameEvent | null {
  const hand = pool.filter(e => !isGenerated(e));
  if (hand.length > 0 && Math.random() < handPriority()) {
    const picked = weightedRandom(hand);
    if (picked) return picked;
  }
  return weightedRandom(pool);
}

function renderEventNpcs(event: GameEvent | null): GameEvent | null {
  if (!event) return null;
  return {
    ...event,
    title: renderNpcText(event.title),
    body: renderNpcText(event.body),
    choices: event.choices.map(choice => ({
      ...choice,
      text: renderNpcText(choice.text),
      consequence: choice.consequence ? renderNpcText(choice.consequence) : undefined,
    })),
  };
}

function rollLowSavingsMentalDecline(): MentalDeclineOutcome {
  const r = Math.random();
  if (r < 0.55) {
    return {
      level: 'mild',
      sanityDelta: -4,
      message: '银行卡余额连续见底，你开始反复计算下一笔账。',
    };
  }
  if (r < 0.88) {
    return {
      level: 'moderate',
      sanityDelta: -7,
      message: '连续三个季度存款低于 ¥10,000，账单像值班铃一样追着你响。',
    };
  }
  return {
    level: 'severe',
    sanityDelta: -11,
    message: '长期低存款击穿了安全感，你在凌晨醒来，脑子里只剩下还款日。',
  };
}

function tickLowSavingsMentalDecline(stageName: string): MentalDeclineOutcome | null {
  if (stageName !== 'career' && stageName !== 'pinnacle') {
    if (getCounter(LOW_SAVINGS_COUNTER) !== 0) setCounter(LOW_SAVINGS_COUNTER, 0);
    return null;
  }
  if (getState().stats.money >= LOW_SAVINGS_THRESHOLD) {
    if (getCounter(LOW_SAVINGS_COUNTER) !== 0) setCounter(LOW_SAVINGS_COUNTER, 0);
    return null;
  }

  const lowQuarters = getCounter(LOW_SAVINGS_COUNTER) + 1;
  setCounter(LOW_SAVINGS_COUNTER, lowQuarters);
  if (lowQuarters < 3) return null;

  const outcome = rollLowSavingsMentalDecline();
  setCounter(LOW_SAVINGS_COUNTER, 0);
  updateStats({ sanity: outcome.sanityDelta });
  const s = getState();
  addNews({
    year: s.year,
    quarter: s.quarter,
    headline: `财务焦虑：连续三季存款低于 ¥${LOW_SAVINGS_THRESHOLD.toLocaleString()}，心理 ${outcome.sanityDelta}`,
    type: outcome.level === 'mild' ? 'warning' : 'tragedy',
  });
  return outcome;
}

function senioritySatisfactionDecayPct(): number {
  const f = getState().flags;
  if (f.has('passed_zhenggao')) return 25;
  if (f.has('passed_fugao')) return 15;
  if (f.has('passed_zhuzhi')) return 5;
  return 0;
}

function hasClinicalSuccessWording(text: string): boolean {
  return /救|好转|恢复|收住|稳住|复查|感谢|表扬|肯定|闭环|规范|按流程|查清|解决|顺利|出院/.test(text);
}

function applyClinicalSatisfaction(choice: EventChoice, event?: GameEvent): ClinicalSatisfactionOutcome | null {
  if (!event || event.category !== 'clinical') return null;
  const stage = getState().stage;
  if (stage === 'undergrad') return null;

  const delta = choice.delta ?? {};
  const clinicalGain = Math.max(0, delta.clinical ?? 0);
  const reputationGain = Math.max(0, delta.reputation ?? 0);
  const harmful = (delta.reputation ?? 0) < 0 || (delta.clinical ?? 0) < 0;
  if (harmful || clinicalGain + reputationGain <= 0) return null;

  const text = `${event.title} ${event.body} ${choice.text} ${choice.consequence ?? ''}`;
  const rescue = /抢救|心肺复苏|CPR|急救|救了回来|救回/.test(text);
  if (!rescue && !hasClinicalSuccessWording(text)) return null;

  const decayPct = senioritySatisfactionDecayPct();
  const multiplier = 1 - decayPct / 100;
  const currentSanity = getState().stats.sanity;
  const rawGain = rescue
    ? Math.max(0, 100 - currentSanity)
    : 10 + Math.floor(Math.random() * 41);
  const sanityGain = Math.max(0, Math.round(rawGain * multiplier));
  if (sanityGain <= 0) return null;

  updateStats({ sanity: sanityGain });
  const outcome: ClinicalSatisfactionOutcome = {
    kind: rescue ? 'rescue' : 'recovery',
    sanityGain,
    rawGain,
    seniorityDecayPct: decayPct,
    message: rescue ? '把人救回来这件事，短暂压过了所有疲惫。' : '病人确实好起来了，你重新想起自己为什么留下。',
  };
  return outcome;
}

// 按分类集合抽取一个 storylet。categories 省略则不限分类。
// 返回 null 表示当前条件下没有可用事件（调用方应回退到"无事件"分支）。
//
// 关于稀有事件的概率校正：可行走场景按地点做分类切片后，池子会从整阶段的
// 一万多权重骤降到一两百，若直接在切片内加权抽取，w=4 的「母亲走了」会从
// 0.03% 飙到 3%——大一新生第一周就丧母，既荒谬又破坏平衡。
// 故稀有事件一律按**整阶段池**的总权重掷骰，切片只决定它是否在候选集内。
export function drawStorylet(
  stageName: string,
  firedEvents: Set<string>,
  categories?: readonly EventCategory[],
): GameEvent | null {
  const state = getState();
  const full = getAvailableEvents(
    stageName, state.flags,
    state.stats as unknown as Record<string, number>,
    firedEvents, state.turnsInStage, state.marital,
  );
  if (full.length === 0) return null;

  // 持续系统置位的 *_due 事件是“危机已经到期”，不应继续被地点分类或
  // 程序生成日常稀释；玩家下一次领取 storylet 时优先处理。
  const due = full.filter(isDueEvent);
  if (due.length > 0) return renderEventNpcs(pickWithPriority(due));

  const pool = categories && categories.length > 0
    ? full.filter(ev => categories.includes(ev.category))
    : full;
  if (pool.length === 0) return null;

  // 未做切片时无需稀有度校正：加权抽取本身已是正确概率
  if (pool.length === full.length) return renderEventNpcs(pickWithPriority(pool));

  const fullTotal = full.reduce((s, e) => s + e.weight, 0);
  const rare = pool.filter(e => e.weight <= RARE_WEIGHT);
  const common = pool.filter(e => e.weight > RARE_WEIGHT);

  // 稀有事件：各自按"在整阶段池中的占比"独立掷骰，与切片大小无关
  for (const e of rare) {
    if (Math.random() < e.weight / fullTotal) return renderEventNpcs(e);
  }
  return renderEventNpcs(pickWithPriority(common) ?? pickWithPriority(rare));
}

// 该分类集合下是否存在可用事件。仅做存在性判断，不掷骰、不消耗随机数，
// 供每季度刷新 '!' 标记与每帧的提示文案使用。
export function hasStorylet(
  stageName: string,
  firedEvents: Set<string>,
  categories?: readonly EventCategory[],
): boolean {
  const state = getState();
  const full = getAvailableEvents(
    stageName, state.flags,
    state.stats as unknown as Record<string, number>,
    firedEvents, state.turnsInStage, state.marital,
  );
  if (full.some(isDueEvent)) return true;
  if (!categories || categories.length === 0) return full.length > 0;
  return full.some(ev => categories.includes(ev.category));
}

// 提交一个选项的全部副作用：置 flag、执行声明式 effect、结算属性变化。
// 同时评估生涯里程碑（徽章），新达成的进入待展示队列，由 ConsequencePopup 消费。
// rankScaled 事件：职业赔付/扣罚按职级差异化（住院医轻、主任重），比例更真实。
// 注意：不含 UI 反馈（飘字 / 音效 / 后果弹窗），由调用方负责。
export function commitChoice(choice: EventChoice, event?: GameEvent): CommitChoiceOutcome {
  let delta = choice.delta;
  if (event?.rankScaled && (choice.delta?.money ?? 0) < 0) {
    const st = getState();
    // 职级因子：住院医轻、主任重
    const rank = st.flags.has('passed_zhenggao') ? 1.5
      : st.flags.has('passed_fugao') ? 1.3
      : st.flags.has('passed_zhuzhi') ? 1.0 : 0.7;
    delta = { ...choice.delta, money: Math.round(choice.delta!.money! * rank) };
  }
  if (choice.flagSet) setFlag(choice.flagSet);
  if (event) patchState({ legal: signalExistingLegalEvent(getState().legal, event.id, choice.flagSet) });
  if (choice.effect) {
    const effects = Array.isArray(choice.effect) ? choice.effect : [choice.effect];
    for (const effect of effects) applyChoiceEffect(effect);
  }
  updateStats(delta as StatDelta);
  const clinicalSatisfaction = applyClinicalSatisfaction(choice, event);
  if ((delta?.papers ?? 0) > 0 && event) {
    let research = getState().research;
    for (let i = 0; i < (delta?.papers ?? 0); i++) research = publishPaper(research, { title: event.title, journal: '职业生涯成果', impactFactor: 2, authorship: 'co_author', type: 'clinical' }, getState().year);
    patchState({ research });
  }
  const flashbackGain = Math.min(20, Math.max(0, delta?.clinical ?? 0) + Math.max(0, delta?.reputation ?? 0));
  if (flashbackGain > 0) patchState({ spirit: changeSpirit(getState().spirit, { flashbackCharge: flashbackGain }) });
  // 事件选择里加知识也算"本季学过"，季度结算不掉（用进废退）
  if ((choice.delta?.knowledge ?? 0) > 0) noteStudied();
  checkBadges();
  return { clinicalSatisfaction };
}

// 推进一个季度：回合数 / 年份季度递增 + 固定收支结算 + 学术诚信判定。
// grieving 表示玩家处于丧亲状态，调用方需额外扣心理并给出提示。
// integrity 为本季的学术风险判定结果，level !== 'none' 时调用方应展示通报。
export function advanceQuarter(stageName: string): {
  econ: QuarterEconomy; grieving: boolean; integrity: IntegrityOutcome; mentalDecline: MentalDeclineOutcome | null; affinity: ReturnType<typeof tickAffinityQuarter>; datingOpportunity: boolean; pandemic: ReturnType<typeof tickPandemicQuarter>; patientSafety: ReturnType<typeof rollPatientSafety>; specialtyNote: string | null;
} {
  advanceTurn();
  const pandemic = tickPandemicQuarter(stageName);
  updateStats(pandemic.delta);
  tickEra3Quarter(stageName);
  const beforeSystems = getState();
  const policy = tickPolicyState(beforeSystems.policy, stageName, beforeSystems.turnsInStage);
  patchState({ policy });
  const afterPolicy = getState();
  const legal = tickLegalState(afterPolicy.legal, {
    stage: stageName,
    turn: afterPolicy.turnsInStage,
    stamina: afterPolicy.stats.stamina,
    specialtyRisk: afterPolicy.flags.has('sub_emergency') ? 1.7
      : afterPolicy.flags.has('sub_surgery') ? 1.6
      : afterPolicy.flags.has('sub_obgyn') ? 1.4
      : afterPolicy.flags.has('sub_pediatrics') ? 1.2 : 1,
    administrative: afterPolicy.flags.has('took_admin'),
    policyRisk: afterPolicy.policy.complianceRisk,
    healthEnergy: afterPolicy.health.energy,
    luck: afterPolicy.attrs?.luck ?? 0,
  });
  patchState({ legal });
  if (legal.legalRisk >= 50 && !hasFlag('legal_complaint_due')) setFlag('legal_complaint_due');
  if (legal.legalRisk >= 70 && !hasFlag('legal_dispute_due')) setFlag('legal_dispute_due');
  if (legal.legalRisk >= 90 && !hasFlag('legal_lawsuit_due')) setFlag('legal_lawsuit_due');
  if (legal.adminPenaltyRisk >= 50 && !hasFlag('legal_admin_due')) setFlag('legal_admin_due');
  if (legal.adminPenaltyRisk >= 80 && !hasFlag('legal_suspension_due')) setFlag('legal_suspension_due');
  if (legal.lawsuitFatigue >= 60) {
    setFlag('legal_fatigue_penalty');
    updateStats({ stamina: -4, sanity: -4 });
  }
  if (legal.lawsuitFatigue >= 80) setFlag('legal_burnout_risk');
  if (stageName === 'retirement' && (hasFlag('policy_historical_violation') || hasFlag('legal_historical_violation')) && !hasFlag('legal_retrospective_due')) setFlag('legal_retrospective_due');
  const health = tickHealthState(afterPolicy.health, {
    stage: stageName,
    age: afterPolicy.stats.age,
    quarter: afterPolicy.quarter,
    stamina: afterPolicy.stats.stamina,
    surgical: afterPolicy.flags.has('sub_surgery'),
    preventiveCare: afterPolicy.health.preventiveCare,
  });
  patchState({ health, lateLife: tickLateLife(afterPolicy.lateLife, stageName) });
  updateStats({ stamina: health.energy - getState().stats.stamina });
  if (collapseRisk(health) >= 170) setFlag('health_collapse_warning');
  if (health.energy <= 5 && health.constitution < 40) setFlag('health_collapse_due');
  // 模块5-12共享季度推进。顺序体现依赖：关系/生活 -> 家庭婚姻 -> 精神 -> 舆论。
  const beforeLife = getState();
  const mentorFaction = tickMentorFaction(beforeLife.mentorFaction, beforeLife.stats.reputation);
  const colleagues = tickColleagues(beforeLife.colleagues, beforeLife.stats.reputation, mentorFaction.rivalry);
  const workPressure = Math.max(beforeLife.policy.drgPressure, beforeLife.health.strain, beforeLife.era3.clinicalPressure, beforeLife.era3.researchPressure);
  const leisure = tickLeisure(beforeLife.leisure, workPressure);
  const economicStability = beforeLife.finance.financialAnxiety ? 25 : beforeLife.stats.money < 0 ? 15 : 70;
  const newYear = beforeLife.quarter === 1;
  const family = tickFamily(beforeLife.family, workPressure, economicStability, newYear);
  const estimatedHours = 40 + Math.round(workPressure * 0.35) + leisure.sideBusiness.timeCost;
  const nightShifts = beforeLife.era3.residency.nightShifts > 0 ? Math.min(8, Math.round(beforeLife.era3.residency.nightShifts / 4)) : (stageName === 'career' ? 3 : 1);
  const love = tickLove(beforeLife.love, estimatedHours, nightShifts, beforeLife.health.strain, newYear);
  tickNpcRomanceQuarter(stageName);
  const relationshipSupport = Math.round((family.familyFunction + colleagues.integration + (love.status === 'married' ? love.maritalSatisfaction : 50)) / 3);
  const spirit = tickSpirit(beforeLife.spirit, relationshipSupport, leisure.workLifeBalance, beforeLife.health.strain);
  const publicImage = tickPublicImage(beforeLife.publicImage);
  const research = tickResearchState(beforeLife.research, {
    stage: stageName, age: beforeLife.stats.age, statsResearch: beforeLife.stats.research, statsPapers: beforeLife.stats.papers,
    mentorBond: mentorFaction.mentorBond, factionBonus: factionBonus(mentorFaction), healthEnergy: health.energy, policyPressure: beforeLife.policy.drgPressure,
  });
  patchState({ mentorFaction, colleagues, leisure, family, love, spirit, publicImage, research });
  if (research.researchAbility > beforeLife.stats.research) updateStats({ research: Math.min(3, research.researchAbility - beforeLife.stats.research) });
  if (mentorFaction.mentorBond + mentorFaction.factionLoyalty < 60) setFlag('faction_outsider_debuff');
  if (mentorFaction.rivalry > 50 || colleagues.peerEnvy > 50) setFlag('social_obstruction_due');
  if (family.familyFunction < 30) setFlag('family_crisis_due');
  if (love.status === 'married' && love.maritalSatisfaction < 30) setFlag('love_crisis_due');
  if (spirit.meaning < 30) setFlag('meaning_crisis_due');
  if (spirit.flashbackCharge >= 100) setFlag('spirit_flashback_due');
  if (publicImage.publicRisk > 50) setFlag('public_exposure_due');
  if (publicImage.publicRisk > 70) setFlag('public_harassment_due');
  if (leisure.workLifeBalance < 30) setFlag('work_consumed_life');
  if (leisure.sideBusiness.investigationRisk > 70) setFlag('side_business_investigation_due');
  if (publicImage.onlineHarassment.active) {
    const immunity = publicImmunity(publicImage, spirit.resilience);
    updateStats({ sanity: immunity >= 65 ? -2 : -6, stamina: immunity >= 65 ? -1 : -3 });
  } else if (spirit.resilience >= 70 && leisure.workLifeBalance >= 50) updateStats({ sanity: 2 });

  const sideIncome = leisure.sideBusiness.active ? Math.max(0, leisure.sideBusiness.quarterlyIncome) : 0;
  const baseEcon = applyStageEconomy(stageName, sideIncome);
  const econ: QuarterEconomy = sideIncome > 0
    ? { ...baseEcon, financeNote: `${baseEcon.financeNote}（副业 +¥${sideIncome.toLocaleString()}）` }
    : baseEcon;
  // 职业期亚专科被动消耗 + 日常回血（深挖第五部分 R28 落地）。
  // 放在共享季度结算层，保证真实游戏（场景调用）与纯模拟（直接调 advanceQuarter）行为一致。
  if (stageName === 'career' || stageName === 'pinnacle') {
    const f = getState().flags;
    const onWardRot = f.has('ward_rotation_active');
    const onErRot = f.has('er_rotation_active');
    const isPeds = f.has('sub_pediatrics');
    const isSurg = f.has('sub_surgery');
    const isObgyn = f.has('sub_obgyn');
    const isEr = f.has('sub_emergency');
    // 被动消耗：急诊体心双压最狠；外科最费体力；儿科最费心理；病房支援轮转当季减压
    const drain: StatDelta = onWardRot ? { stamina: -6, knowledge: 2, sanity: -1 }
      : isEr ? { stamina: -12, knowledge: 2, sanity: -4 }
      : isSurg ? { stamina: -13, knowledge: 3, sanity: -2 }
      : isObgyn ? { stamina: -10, knowledge: 2, sanity: -2 }
      : isPeds ? { stamina: -8, knowledge: 2, sanity: -5 }
      : { stamina: -8, knowledge: 2, sanity: -2 };
    // 日常回血：在职靠门诊/科室生活回 +2；儿科额外 +2（暖色时刻）
    const heal: StatDelta = isPeds && !onWardRot ? { sanity: 4 } : { sanity: 2 };
    updateStats(heal);
    updateStats(drain);
    // 急诊轮转当季：在本科室消耗之上再加一截红区负荷
    if (onErRot) updateStats({ stamina: -6, sanity: -3, clinical: 2 });
    // 职业期每四季结算一次长期夜班/疲劳磨损，属性只在 0..5 内变化。
    if (getState().turnsInStage > 0 && getState().turnsInStage % 4 === 0) {
      changeAttr('looks', -1, '长期夜班与职业疲劳留下了痕迹');
    }
    // 住院总任期内：额外体力/心理双压，并累计满一年（4 季）
    if (f.has('chief_resident_year') && !f.has('chief_graduated')) {
      updateStats({ stamina: -4, sanity: -3 });
      setCounter('chief_quarters', getCounter('chief_quarters') + 1);
    }
  }
  const specialtyNote = tickSpecialtyCumulative(stageName);
  // 轮转当季效果结算完毕后清掉 active（done flag 保留）
  if (hasFlag('er_rotation_active')) clearFlag('er_rotation_active');
  if (hasFlag('ward_rotation_active')) clearFlag('ward_rotation_active');
  const grieving = hasFlag('grieving');
  if (grieving) updateStats({ sanity: -2 });
  const mentalDecline = tickLowSavingsMentalDecline(stageName);
  const affinity = tickAffinityQuarter(stageName as LifeStage);
  updateStats(affinity.delta);
  const datingOpportunity = tickDatingOpportunity(stageName);

  // 知识衰减（仅学籍阶段）：本季学过则不掉（用进废退），否则随机 5%~10%。
  // 衰减在诚信判定之前，让被跳过/ Burnout 的季度同样自然掉知识。
  if (isKnowledgeStage(stageName as any)) {
    const decay = consumeQuarterDecay();
    if (decay > 0) updateStats({ knowledge: -decay });
    // 长学制连续低知识计数（转普通班警告触发）
    tickLongSystemCounter();
  }

  const integrity = rollIntegrity();
  const patientSafety = rollPatientSafety(stageName);
  // 财务快照必须最后落账：诚信处罚、患者安全赔付等会在固定收支后改变现金。
  // income/expense 仍表示本季固定经济流水，cash 则必须与季度结束时的真实余额一致。
  const settled = getState();
  const finance = recordQuarterFinance(settled.finance, {
    cash: settled.stats.money,
    assets: settled.assets,
    economy: econ,
    mortgage: settled.mortgageBalance,
    studentLoanBalance: settled.studentLoanBalance,
  });
  patchState({ finance });
  if (finance.financialAnxiety) updateStats({ sanity: -2 });
  return { econ, grieving, integrity, mentalDecline, affinity, datingOpportunity, pandemic, patientSafety, specialtyNote };
}
