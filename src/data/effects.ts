import { changeAttr, clearFlag, getState, patchState, setFlag, hasFlag, incCounter, updateStats } from './gameState';
import { addFakeRisk, selfReport } from './integrity';
import { payHouseDownPayment } from './economy';
import { getUnit } from './jobhunt_units';
import type { ChoiceEffect } from './events';
import { addMotivation } from './motivation';
import { addCrisisCredits, changeDropoutThoughts, changeProfessionalIdentity, setUndergradLeave } from './undergradProgress';
import {
  advanceEra3Progress, advanceResearchProgress, changeEra3Mentor, changeEra3Pressure,
  changeEra3QuitThoughts, recordMedicalError, resolveEra3Assessment, resolveEra3Submission,
} from './era3';
import { normalizeHealth } from './health';
import { normalizeFinance } from './finance';
import { normalizePolicy } from './policy';
import { normalizeLateLife } from './lateLife';
import { applyLegalChange, normalizeLegal, recordViolation, resolveLegalPath } from './legal';
import { changeResearchState, grantAmount, grantSuccessRate, normalizeResearch, publishPaper, recordMisconduct, retractLatestPaper, startResearchProject } from './research';
import { changeMentorFaction, establishOwnFaction, normalizeMentorFaction } from './mentorFaction';
import { changeColleagues, mentorStudents, normalizeColleagues, recruitStudent } from './colleagues';
import { changeFamily, normalizeFamily } from './family';
import { changeLove, normalizeLove } from './loveMarriage';
import { changeSpirit, normalizeSpirit } from './spirit';
import { changePublicImage, normalizePublicImage } from './publicImage';
import { changeLeisure, normalizeLeisure } from './leisure';
import { attemptDating, startNpcRomance } from './dating';
import { changeAffinity } from './npc';
import { transferLongSystem } from './longSystem';
import { setTrainingTrack } from './trainingTrack';

// 选项副作用的集中实现。
// 事件数据里只写"声明式"的 effect 描述（纯数据、可序列化、可静态检查），
// 真正改写全局状态的逻辑只存在于这里一处，便于测试与排查。

const PARTNERS = ['林晚', '苏念', '陈屿', '周遥', '许知', '沈星', '白露', '江屿', '温言', '顾川', '何夕', '宋词'];
const pickPartner = () => PARTNERS[Math.floor(Math.random() * PARTNERS.length)];

const LOST_FLAG: Record<'father' | 'mother' | 'grandparent', string> = {
  father: 'lost_father', mother: 'lost_mother', grandparent: 'lost_grandparent',
};

export function applyChoiceEffect(effect: ChoiceEffect) {
  switch (effect.kind) {
    case 'attemptDating':
      attemptDating();
      return;
    case 'startNpcRomance':
      startNpcRomance(effect.npcId);
      return;
    case 'clearFlag':
      clearFlag(effect.flag);
      return;
    case 'changeAffinity':
      changeAffinity(effect.npcId, effect.amount);
      return;
    case 'startDating':
      {
        const name = pickPartner();
        const love = normalizeLove(getState().love, 'dating', name);
        const family = normalizeFamily(getState().family, getState().familyWealth, name);
        patchState({ marital: 'dating', spouse: name, family: { ...family, spouse: { ...family.spouse, exists: true, name }, spouseBond: Math.max(45, family.spouseBond) }, love: { ...love, status: 'dating', intimacy: Math.max(50, love.intimacy), passion: Math.max(65, love.passion), spouse: { ...love.spouse, exists: true, name } } });
      }
      return;
    case 'breakup':
      patchState({ marital: 'single', spouse: null, family: { ...normalizeFamily(getState().family), spouseBond: 0, spouse: { ...normalizeFamily(getState().family).spouse, exists: false, name: '', bond: 0 } }, love: { ...normalizeLove(getState().love), status: 'single', intimacy: 0, passion: 0, spouse: { ...normalizeLove(getState().love).spouse, exists: false, name: '' } } });
      return;
    case 'marry':
      patchState({ marital: 'married', family: { ...normalizeFamily(getState().family, getState().familyWealth, getState().spouse), spouseBond: Math.max(55, getState().family.spouseBond) }, love: { ...normalizeLove(getState().love, 'married', getState().spouse), status: 'married', commitment: Math.max(75, getState().love.commitment), ageAtFirstMarriage: getState().love.ageAtFirstMarriage || getState().stats.age } });
      return;
    case 'childborn':
      {
        const family = normalizeFamily(getState().family, getState().familyWealth, getState().spouse, true);
        patchState({ hasChild: true, family });
      }
      setFlag('has_child');
      return;
    case 'loseKin': {
      patchState({ familyAlive: Math.max(0, getState().familyAlive - 1) });
      const family = normalizeFamily(getState().family);
      patchState({ family: { ...family, familyOrigin: Math.max(0, family.familyOrigin - 15), events: { ...family.events, familyTragedies: [...family.events.familyTragedies, `${effect.who}离世`] } } });
      setFlag(LOST_FLAG[effect.who]);
      setFlag('grieving');
      // kin_all_gone 以"三位至亲的离世事件全部发生过"为准（flag 判定），
      // 而非 familyAlive 归零——初始 familyAlive=4 而离世事件只有 3 个，数值永远减不到 0。
      if (hasFlag('lost_father') && hasFlag('lost_mother') && hasFlag('lost_grandparent')) {
        setFlag('kin_all_gone');
      }
      return;
    }
    // —— 学术诚信：造假不当场结算，而是累加风险，由 integrity.ts 每季判定 ——
    case 'fake':
      addFakeRisk(effect.severity);
      return;
    case 'selfReport':
      selfReport();
      return;
    case 'buyHouse':
      payHouseDownPayment();
      return;
    case 'changeAttr':
      changeAttr(effect.attr, effect.amount, effect.reason);
      return;
    case 'changeMotivation': {
      const state = getState();
      patchState({ motivation: addMotivation(state.motivation, { [effect.motive]: effect.amount }) });
      return;
    }
    case 'changeProfessionalIdentity':
      changeProfessionalIdentity(effect.amount);
      return;
    case 'addCrisisCredits':
      addCrisisCredits(effect.amount);
      return;
    case 'changeDropoutThoughts':
      changeDropoutThoughts(effect.amount);
      return;
    case 'setUndergradLeave':
      setUndergradLeave(effect.value);
      return;
    case 'transferLongSystem':
      transferLongSystem();
      return;
    case 'setTrainingTrack':
      setTrainingTrack(effect.track);
      return;
    case 'changeEra3Pressure':
      changeEra3Pressure(effect.axis, effect.amount);
      return;
    case 'changeEra3Mentor':
      changeEra3Mentor(effect.amount);
      return;
    case 'changeEra3QuitThoughts':
      changeEra3QuitThoughts(effect.amount);
      return;
    case 'advanceEra3Residency':
      advanceEra3Progress({
        rotationsCompleted: effect.rotations, casesCompleted: effect.cases,
        proceduresCompleted: effect.procedures, nightShifts: effect.nightShifts,
        evaluation: effect.evaluation,
      });
      return;
    case 'advanceEra3Research':
      advanceResearchProgress({
        paperProgress: effect.paper, thesisProgress: effect.thesis,
        submitted: effect.submitted, accepted: effect.accepted,
      });
      return;
    case 'resolveEra3Assessment':
      resolveEra3Assessment(effect.assessment);
      return;
    case 'resolveEra3Submission':
      resolveEra3Submission(effect.tier);
      return;
    case 'recordEra3MedicalError':
      recordMedicalError();
      return;
    case 'setEra3Flag':
      setFlag(effect.flag);
      return;
    case 'changeHealth': {
      const h = normalizeHealth(getState().health);
      const next = Math.max(0, Math.min(100, Math.round((h[effect.field] ?? 0) + effect.amount)));
      patchState({ health: { ...h, [effect.field]: next } });
      if (effect.incident && !h.majorIncidents.includes(effect.incident)) {
        patchState({ health: {
          ...getState().health,
          majorIncidents: [...getState().health.majorIncidents, effect.incident],
          collapseCount: getState().health.collapseCount + (effect.incident === '倒下' ? 1 : 0),
        } });
      }
      return;
    }
    case 'useHealthCare': {
      const h = normalizeHealth(getState().health);
      const next = {
        ...h,
        constitution: Math.max(0, Math.min(100, h.constitution + (effect.constitution ?? 0))),
        strain: Math.max(0, Math.min(100, h.strain + (effect.strain ?? 0))),
        energy: Math.max(0, Math.min(100, h.energy + (effect.energy ?? 0))),
        preventiveCare: effect.preventive ?? h.preventiveCare,
      };
      patchState({ health: next });
      if (effect.cost) updateStats({ money: -effect.cost });
      return;
    }
    case 'hardCarry': {
      const h = normalizeHealth(getState().health);
      patchState({ health: { ...h, hardCarryCount: h.hardCarryCount + 1, energy: Math.min(100, h.energy + 30), constitution: Math.max(0, h.constitution - 1), strain: Math.min(100, h.strain + 4) } });
      setFlag('health_hard_carried');
      return;
    }
    case 'changeFinance': {
      const f = normalizeFinance(getState().finance, getState().stats.money);
      patchState({ finance: { ...f, corruption: Math.max(0, Math.min(100, f.corruption + effect.amount)), majorPurchases: effect.purchase ? [...f.majorPurchases, effect.purchase] : f.majorPurchases } });
      if (f.corruption + effect.amount >= 20) setFlag('finance_corruption_warning');
      if (f.corruption + effect.amount >= 50) setFlag('finance_corruption_investigation');
      return;
    }
    case 'changePolicy': {
      const p = normalizePolicy(getState().policy);
      const value = effect.field === 'deptSurplus'
        ? Math.max(-100, Math.min(100, p.deptSurplus + effect.amount))
        : Math.max(0, Math.min(100, p[effect.field] + effect.amount));
      patchState({ policy: { ...p, [effect.field]: value, policyViolations: effect.violation ? [...p.policyViolations, effect.violation] : p.policyViolations } });
      if (effect.violation) setFlag('policy_historical_violation');
      return;
    }
    case 'recordProcurement': {
      const p = normalizePolicy(getState().policy);
      const procurement = {
        ...p.procurement,
        rounds: p.procurement.rounds.includes(effect.round) ? p.procurement.rounds : [...p.procurement.rounds, effect.round],
        productsAffected: effect.product && !p.procurement.productsAffected.includes(effect.product) ? [...p.procurement.productsAffected, effect.product] : p.procurement.productsAffected,
        efficacyComplaints: p.procurement.efficacyComplaints + (effect.complaint ? 1 : 0),
        savingsRetained: p.procurement.savingsRetained + (effect.savings ?? 0),
      };
      patchState({ policy: { ...p, procurement, procurementCompliance: Math.min(100, p.procurementCompliance + 10) } });
      return;
    }
    case 'completeBucket': {
      const l = normalizeLateLife(getState().lateLife);
      if (l.bucketList[effect.item]) return;
      patchState({ lateLife: { ...l, bucketList: { ...l.bucketList, [effect.item]: true }, legacy: Math.min(100, l.legacy + (effect.legacy ?? 0)), completion: Math.min(100, l.completion + (effect.completion ?? 15)) } });
      setFlag(`late_bucket_${effect.item}`);
      return;
    }
    case 'setFinalChoice':
      patchState({ lateLife: { ...normalizeLateLife(getState().lateLife), finalChoice: effect.choice } });
      setFlag(`late_final_${effect.choice}`);
      return;
    case 'setTombstone':
      patchState({ lateLife: { ...normalizeLateLife(getState().lateLife), tombstone: effect.tombstone } });
      return;
    case 'consumeEcho': {
      const l = normalizeLateLife(getState().lateLife);
      if (!l.echoesConsumed.includes(effect.echo)) patchState({ lateLife: { ...l, echoesConsumed: [...l.echoesConsumed, effect.echo], legacy: Math.min(100, l.legacy + 5) } });
      return;
    }
    case 'changeLegal': {
      let legal = applyLegalChange(normalizeLegal(getState().legal), effect.field, effect.amount);
      if (effect.violation) legal = recordViolation(legal, effect.violation, effect.severity);
      patchState({ legal });
      if (effect.violation) setFlag('legal_historical_violation');
      return;
    }
    case 'recordLegalViolation':
      patchState({ legal: recordViolation(normalizeLegal(getState().legal), effect.violation, effect.severity) });
      setFlag('legal_historical_violation');
      return;
    case 'startLegalDispute': {
      const l = normalizeLegal(getState().legal);
      patchState({ legal: {
        ...l,
        disputes: {
          ...l.disputes,
          complaints: l.disputes.complaints + (effect.status === 'complaint' ? 1 : 0),
          currentStatus: effect.status,
        },
      } });
      return;
    }
    case 'resolveLegalDispute': {
      const before = normalizeLegal(getState().legal);
      let outcome = effect.outcome;
      if (!outcome) {
        const score = before.recordDefense * 0.4 + before.communicationRecord * 0.2
          + before.legalSupport * 0.15 + (getState().attrs?.luck ?? 0) * 4
          - before.legalRisk * 0.2 - (before.presumptionOfFault ? 25 : 0);
        const roll = Math.random() * 100;
        outcome = score - roll > 25 ? 'favorable' : score - roll > -10 ? 'partial' : 'adverse';
      }
      const cost = effect.path === 'lawsuit' ? 15000 : effect.path === 'arbitration' ? 7000 : effect.path === 'mediation' ? 5000 : 3000;
      const damages = outcome === 'adverse' ? 50000 : outcome === 'partial' ? 15000 : 3000;
      patchState({ legal: resolveLegalPath(before, effect.path, outcome) });
      updateStats({ money: -(cost + damages), sanity: outcome === 'adverse' ? -18 : outcome === 'partial' ? -10 : -4 });
      setFlag(`legal_${effect.path}_${outcome}`);
      if (outcome === 'adverse') setFlag('legal_adverse_outcome');
      return;
    }
    case 'changeResearch':
      patchState({ research: changeResearchState(getState().research, effect.field, effect.amount) });
      if (effect.field === 'researchAbility') updateStats({ research: effect.amount });
      return;
    case 'startResearchProject':
      patchState({ research: startResearchProject(getState().research, effect.title, effect.paperType, effect.progress) });
      return;
    case 'publishResearchPaper':
      patchState({ research: publishPaper(getState().research, { title: effect.title, journal: effect.journal, impactFactor: effect.impactFactor, authorship: effect.authorship, type: effect.paperType }, getState().year) });
      updateStats({ papers: 1, reputation: Math.max(1, Math.round(effect.impactFactor / 2)) });
      return;
    case 'applyResearchGrant': {
      const research = normalizeResearch(getState().research);
      const rate = grantSuccessRate(research, effect.grantType, getState().mentorFaction.mentorBond, (getState().attrs.luck ?? 0) * 20);
      const approved = Math.random() < rate; const amount = grantAmount(effect.grantType);
      const applied = [...research.grants.applied, { type: effect.grantType, year: getState().year, status: approved ? 'approved' as const : 'rejected' as const, amount }];
      const active = approved ? [...research.grants.active, { type: effect.grantType, remainingFunds: amount, remainingYears: 3 }] : research.grants.active;
      patchState({ research: { ...research, grants: { applied, active }, failedGrantYears: approved ? 0 : research.failedGrantYears + 1, academicReputation: Math.min(100, research.academicReputation + (approved ? 20 : 0)) } });
      setFlag(approved ? `grant_${effect.grantType}_approved` : `grant_${effect.grantType}_rejected`);
      return;
    }
    case 'recordResearchMisconduct':
      patchState({ research: recordMisconduct(getState().research, effect.violation, effect.amount) });
      addFakeRisk(effect.amount >= 35 ? 'severe' : effect.amount >= 20 ? 'moderate' : 'minor');
      return;
    case 'retractResearchPaper':
      patchState({ research: retractLatestPaper(getState().research) });
      if (getState().stats.papers > 0) updateStats({ papers: -1, reputation: -15 });
      return;
    case 'changeMentorFaction':
      patchState({ mentorFaction: changeMentorFaction(getState().mentorFaction, effect) });
      return;
    case 'establishOwnFaction':
      patchState({ mentorFaction: establishOwnFaction(getState().mentorFaction, {
        name: effect.name,
        type: effect.factionType,
        research: effect.research,
        clinical: effect.clinical,
        administrative: effect.administrative,
        rivalry: effect.rivalry,
      }) });
      setFlag('own_faction');
      return;
    case 'setFaction': {
      const s = normalizeMentorFaction(getState().mentorFaction, getState().stats.reputation);
      const mentor = effect.factionType === 'none' ? s.mentor : s.mentor ?? { name: '导师', type: effect.factionType, tier: 'senior' as const, relationship: s.mentorBond, favors: 0 };
      patchState({ mentorFaction: { ...s, mentor, factionLoyalty: effect.factionType === 'none' ? 0 : Math.max(25, s.factionLoyalty), faction: { ...s.faction, name: effect.name, type: effect.factionType } } });
      return;
    }
    case 'changeColleagues':
      patchState({ colleagues: changeColleagues(getState().colleagues, effect) });
      return;
    case 'recruitStudent':
      patchState({ colleagues: recruitStudent(getState().colleagues, {
        id: effect.id,
        name: effect.name,
        type: effect.studentType,
        loyalty: effect.loyalty,
        betrayalRisk: effect.betrayalRisk,
      }) });
      setFlag('mentored');
      setFlag('has_students');
      return;
    case 'mentorStudents':
      patchState({ colleagues: mentorStudents(getState().colleagues, effect) });
      return;
    case 'recordColleagueConflict': {
      const s = normalizeColleagues(getState().colleagues);
      patchState({ colleagues: { ...s, conflicts: [...s.conflicts, { event: effect.event, opponent: effect.opponent, resolution: effect.resolution }] } });
      return;
    }
    case 'changeFamily':
      patchState({ family: changeFamily(getState().family, effect) });
      return;
    case 'setSpouseType': {
      const name = effect.name ?? getState().spouse ?? pickPartner(); const family = normalizeFamily(getState().family, getState().familyWealth, name);
      const familyType = effect.spouseType === 'teacher' ? 'civil_servant' : effect.spouseType;
      const love = normalizeLove(getState().love, getState().marital, name);
      patchState({ spouse: name, family: { ...family, spouseBond: Math.max(50, family.spouseBond), spouse: { ...family.spouse, exists: true, name, type: familyType } }, love: { ...love, spouse: { ...love.spouse, exists: true, name, type: effect.spouseType === 'full_time' ? 'other' : effect.spouseType } } });
      return;
    }
    case 'recordFamilyAbsence': {
      const s = normalizeFamily(getState().family); const events = { ...s.events };
      if (effect.absence === 'birthday') events.missedBirthdays++;
      else if (effect.absence === 'parent_meeting') events.missedParentMeetings++;
      else events.holidaysAlone++;
      patchState({ family: changeFamily({ ...s, events }, { familyOrigin: effect.absence === 'holiday' ? -8 : 0, childBond: effect.absence === 'parent_meeting' ? -10 : 0, spouseBond: effect.absence === 'birthday' ? -8 : 0, conflict: 6 }) });
      return;
    }
    case 'setChildCareer': {
      const s = normalizeFamily(getState().family); const children = s.children.length ? s.children.map((c, i) => i === 0 ? { ...c, careerChoice: effect.career } : c) : [{ name: '孩子', age: 18, bond: s.childBond || 50, mentalHealth: 75, careerChoice: effect.career }];
      patchState({ hasChild: true, family: { ...s, children } }); setFlag(`child_career_${effect.career}`); return;
    }
    case 'changeLove': {
      const love = changeLove(getState().love, effect); patchState({ love, family: changeFamily(getState().family, { spouseBond: (effect.intimacy ?? 0) * 0.5 }) }); return;
    }
    case 'setRelationshipStatus': {
      const love = normalizeLove(getState().love); const legacy = effect.status === 'married' ? 'married' : effect.status === 'dating' || effect.status === 'engaged' ? 'dating' : 'single';
      patchState({ love: { ...love, status: effect.status }, marital: legacy, spouse: legacy === 'single' && effect.status !== 'widowed' ? null : getState().spouse }); return;
    }
    case 'recordLoveCrisis': {
      const s = normalizeLove(getState().love); const resolution = effect.resolution ?? 'ongoing';
      patchState({ love: changeLove({ ...s, crises: [...s.crises, { type: effect.crisisType, year: getState().year, resolution, impact: effect.impact }] }, { intimacy: -effect.impact, commitment: effect.crisisType === 'infidelity' ? -effect.impact : 0 }) }); return;
    }
    case 'changeSpirit':
      patchState({ spirit: changeSpirit(getState().spirit, effect, effect.event, getState().year) }); return;
    case 'setPurposeType': {
      const s = normalizeSpirit(getState().spirit, effect.purposeType); patchState({ spirit: { ...s, purpose: { ...s.purpose, type: effect.purposeType, originStory: effect.originStory } } }); return;
    }
    case 'triggerFlashback': {
      const s = changeSpirit(getState().spirit, { meaning: effect.impact, purposePurity: Math.round(effect.impact / 3), flashbackCharge: -100 }, effect.event, getState().year);
      patchState({ spirit: { ...s, flashbacks: { triggered: s.flashbacks.triggered + 1, totalCharge: s.flashbacks.totalCharge + 100, recentFlashback: { event: effect.event, impact: effect.impact, year: getState().year } } } }); updateStats({ sanity: Math.round(effect.impact / 2) }); return;
    }
    case 'changePublicImage':
      patchState({ publicImage: changePublicImage(getState().publicImage, effect) }); return;
    case 'startOnlineHarassment': {
      const s = changePublicImage(getState().publicImage, { publicRisk: effect.severity, onlineHeat: -Math.round(effect.severity / 2) });
      patchState({ publicImage: { ...s, onlineHarassment: { ...s.onlineHarassment, active: true, duration: 0, postCount: 1 } } }); return;
    }
    case 'setSocialMedia': {
      const s = normalizePublicImage(getState().publicImage); patchState({ publicImage: { ...s, socialMedia: { ...s.socialMedia, strategy: effect.strategy, monetized: effect.monetized ?? s.socialMedia.monetized, mcnContract: effect.mcnContract ?? s.socialMedia.mcnContract } } }); return;
    }
    case 'changeLeisure':
      patchState({ leisure: changeLeisure(getState().leisure, effect) }); return;
    case 'setHobby': {
      const s = normalizeLeisure(getState().leisure); const existing = s.hobbies.find(h => h.type === effect.hobbyType); const hobbies = existing ? s.hobbies.map(h => h.type === effect.hobbyType ? { ...h, active: true, level: Math.max(h.level, effect.level ?? 10) } : h) : [...s.hobbies, { type: effect.hobbyType, level: effect.level ?? 10, timeInvested: 0, achievements: [], active: true }];
      patchState({ leisure: normalizeLeisure({ ...s, hobbies, hobbyLevel: Math.max(s.hobbyLevel, effect.level ?? 10) }) }); return;
    }
    case 'setSideBusiness': {
      const s = normalizeLeisure(getState().leisure); const riskLevel = effect.compliance === 'illegal' ? 'high' : effect.compliance === 'gray' ? 'medium' : 'low';
      patchState({ leisure: { ...s, sideBusiness: { type: effect.businessType, quarterlyIncome: effect.quarterlyIncome, timeCost: effect.timeCost, compliance: effect.compliance, riskLevel, active: effect.businessType !== 'none', investigationRisk: effect.compliance === 'illegal' ? 30 : effect.compliance === 'gray' ? 10 : 0 } } }); return;
    }
    // —— 求职写实：概率结算 / 投简历 / 多offer / 签三方 / 违约 ——
    case 'rollOutcome': {
      const s = getState();
      const rep = s.stats.reputation;
      const papers = s.stats.papers;
      const knowledge = s.stats.knowledge;
      const clinical = s.stats.clinical;
      const luck = s.attrs?.luck ?? 0;
      let p = effect.base
        + (effect.repPer10 ?? 0) * (rep / 10)
        + (effect.paperBonus ?? 0) * papers
        + (effect.knowledgeBonus ?? 0) * knowledge
        + (effect.clinicalBonus ?? 0) * clinical
        + (effect.luckBonus ?? 0) * luck;
      // 本校附属加成 / 导师推荐（人情黑箱）/ 海归 / 博士后 加成：仅当对应 flag 已置时计入
      if (effect.affiliateFlag && hasFlag(effect.affiliateFlag) && effect.affiliateBonus) {
        p += effect.affiliateBonus;
      }
      if (effect.referralFlag && hasFlag(effect.referralFlag ?? 'got_recommend') && effect.referralBonus) {
        p += effect.referralBonus;
      }
      if (effect.overseasFlag && hasFlag(effect.overseasFlag) && effect.overseasBonus) {
        p += effect.overseasBonus;
      }
      if (effect.postdocFlag && hasFlag(effect.postdocFlag) && effect.postdocBonus) {
        p += effect.postdocBonus;
      }
      p = Math.max(0.05, Math.min(0.98, p));
      if (Math.random() < p) setFlag(effect.successFlag);
      else setFlag(effect.failFlag);
      return;
    }
    case 'applyUnit': {
      setFlag(`jh_applied_${effect.unitId}`);
      setFlag('jh_has_applied');
      const u = getUnit(effect.unitId);
      // 本校附属医院：玩家母校 id 与单位 affiliatedSchoolId 匹配 → 置附属标记（面试/笔试加成读取）
      if (u?.affiliatedSchoolId && getState().school?.id === u.affiliatedSchoolId) {
        setFlag(`jh_affil_${effect.unitId}`);
      }
      return;
    }
    case 'receiveOffer': {
      setFlag(`offer_${effect.unitId}`);
      setFlag('jh_has_offer');
      const s = getState();
      if (!s.jobOffers.includes(effect.unitId)) {
        patchState({ jobOffers: [...s.jobOffers, effect.unitId] });
      }
      return;
    }
    case 'signUnit': {
      const u = getUnit(effect.unitId);
      if (u) setFlag(u.regionFlag);
      setFlag('signed');
      patchState({ signedUnitId: effect.unitId });
      return;
    }
    case 'breachUnit': {
      const s = getState();
      // 清掉旧单位（此前 signedUnitId）的 region flag，再落新单位
      const oldU = s.signedUnitId ? getUnit(s.signedUnitId) : undefined;
      if (oldU) s.flags.delete(oldU.regionFlag);
      const u = getUnit(effect.unitId);
      if (u) setFlag(u.regionFlag);
      patchState({ signedUnitId: effect.unitId });
      incCounter('breachCount');
      setFlag('jh_breached');
      return;
    }
    case 'setFlag': {
      setFlag(effect.flag);
      return;
    }
  }
}
