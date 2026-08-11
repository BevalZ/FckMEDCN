import { addNews, clearFlag, getState, patchState, setFlag, updateStats } from './gameState';
import { normalizeFamily } from './family';
import { normalizeLove } from './loveMarriage';
import { getNpcName, NPC_ROMANCE_SUSTAINED_QUARTERS, NPCS_BY_ID } from './npc';

export interface DatingAttemptOutcome {
  success: boolean;
  chance: number;
  partner: string | null;
}

export interface NpcRomanceTickOutcome {
  npcId: string;
  duration: number;
  sustainedNow: boolean;
}

const PARTNERS = ['林晚', '苏念', '陈屿', '周遥', '许知', '沈星', '白露', '江屿', '温言', '顾川', '何夕', '宋词'];

export function datingOpportunityChance(sanity: number, age: number): number {
  const mentalFactor = 0.12 + Math.max(0, Math.min(100, sanity)) / 100 * 0.88;
  const ageFactor = age <= 35 ? 1 : Math.pow(0.91, age - 35);
  return Math.max(0.006, Math.min(0.24, 0.24 * mentalFactor * ageFactor));
}

export function datingSuccessChance(looks: number, money: number, assets: number, sanity: number): number {
  const economy = money + assets;
  const economyBonus = economy < 0 ? -15 : economy < 10000 ? 0 : economy < 50000 ? 9 : economy < 150000 ? 19 : 29;
  const chance = 12 + Math.max(0, Math.min(5, looks)) * 11 + economyBonus + Math.max(0, Math.min(100, sanity)) * 0.08;
  return Math.max(5, Math.min(92, chance)) / 100;
}

export function tickDatingOpportunity(stage: string): boolean {
  const s = getState();
  const eligible = ['undergrad', 'internship', 'guipei', 'master', 'phd', 'jobhunt', 'career', 'pinnacle'].includes(stage);
  if (!eligible || s.marital !== 'single' || s.flags.has('dating_opportunity')) return false;
  // 主动拒绝后留出一个季度冷却，避免下一季立刻重复弹出同类机会。
  if (s.flags.has('dating_opportunity_declined')) {
    clearFlag('dating_opportunity_declined');
    return false;
  }
  if (Math.random() >= datingOpportunityChance(s.stats.sanity, s.stats.age)) return false;
  setFlag('dating_opportunity');
  addNews({ year: s.year, quarter: s.quarter, headline: '生活回响：一次认识新朋友的机会出现了。', type: 'event' });
  return true;
}

export function attemptDating(): DatingAttemptOutcome {
  const s = getState();
  const chance = datingSuccessChance(s.attrs.looks, s.stats.money, s.assets, s.stats.sanity);
  clearFlag('dating_opportunity');
  if (Math.random() >= chance) {
    updateStats({ sanity: -3, relations: 1 });
    addNews({ year: s.year, quarter: s.quarter, headline: '相亲或约会没有继续发展（成功率 ' + Math.round(chance * 100) + '%）。', type: 'irony' });
    return { success: false, chance, partner: null };
  }
  const name = PARTNERS[Math.floor(Math.random() * PARTNERS.length)];
  const love = normalizeLove(s.love, 'dating', name);
  const family = normalizeFamily(s.family, s.familyWealth, name);
  patchState({
    marital: 'dating', spouse: name,
    family: { ...family, spouse: { ...family.spouse, exists: true, name }, spouseBond: Math.max(45, family.spouseBond) },
    love: { ...love, status: 'dating', intimacy: Math.max(45, love.intimacy), passion: Math.max(55, love.passion), spouse: { ...love.spouse, exists: true, name } },
  });
  updateStats({ sanity: 8, relations: 8, money: -300 });
  addNews({ year: s.year, quarter: s.quarter, headline: '你和' + name + '开始交往（成功率 ' + Math.round(chance * 100) + '%）。', type: 'event' });
  return { success: true, chance, partner: name };
}

function spouseTypeForNpc(npcId: string): 'physician' | 'nurse' | 'civil_servant' | 'teacher' | 'other' {
  const role = NPCS_BY_ID[npcId]?.role ?? '';
  if (/护士/.test(role)) return 'nurse';
  if (/老师|导师|辅导员/.test(role)) return 'teacher';
  if (/医|主治|规培|药师|检验|影像|主任/.test(role)) return 'physician';
  return 'other';
}

export function startNpcRomance(npcId: string) {
  const s = getState();
  if (s.marital !== 'single') return;
  const name = getNpcName(npcId);
  const spouseType = spouseTypeForNpc(npcId);
  const love = normalizeLove(s.love, 'dating', name);
  const family = normalizeFamily(s.family, s.familyWealth, name);

  patchState({
    marital: 'dating',
    spouse: name,
    counters: { ...s.counters, [`npc_romance_duration_${npcId}`]: 0 },
    family: {
      ...family,
      spouseBond: Math.max(48, family.spouseBond),
      spouse: { ...family.spouse, exists: true, name, type: spouseType === 'teacher' ? 'civil_servant' : spouseType },
    },
    love: {
      ...love,
      status: 'dating',
      intimacy: Math.max(55, love.intimacy),
      passion: Math.max(60, love.passion),
      commitment: Math.max(42, love.commitment),
      spouse: {
        ...love.spouse,
        exists: true,
        name,
        type: spouseType,
        occupation: NPCS_BY_ID[npcId]?.role ?? '',
        firstMet: `${s.stage} 第${s.turnsInStage}季`,
      },
    },
  });
  setFlag(`npc_romance_${npcId}`);
  setFlag('npc_romance_active');
  addNews({ year: s.year, quarter: s.quarter, headline: `关系变化：你和${name}开始交往。`, type: 'event' });
}

export function tickNpcRomanceQuarter(_stageName: string): NpcRomanceTickOutcome | null {
  const s = getState();
  const npcId = Object.keys(NPCS_BY_ID).find(id => s.flags.has(`npc_romance_${id}`));
  if (!npcId) return null;
  const name = getNpcName(npcId);
  if ((s.marital !== 'dating' && s.marital !== 'married') || s.spouse !== name) return null;

  const key = `npc_romance_duration_${npcId}`;
  const duration = (s.counters[key] ?? 0) + 1;
  patchState({ counters: { ...getState().counters, [key]: duration } });

  const sustainedFlag = `npc_romance_sustained_${npcId}`;
  const sustainedNow = duration >= NPC_ROMANCE_SUSTAINED_QUARTERS && !getState().flags.has(sustainedFlag);
  if (sustainedNow) {
    setFlag(sustainedFlag);
    addNews({
      year: getState().year,
      quarter: getState().quarter,
      headline: `${name}与你的关系稳定下来，之后会在合适的后续场景出现。`,
      type: 'event',
    });
  }
  return { npcId, duration, sustainedNow };
}
