import { getState, getCounter, setCounter, patchState, hasFlag } from './gameState';

// 亚专科累积效应（OPTIMIZATION R6 / REVIEW-PATIENT-DIVERSITY P1）：
// 外科：连续站台 → surg_stamina_wear 升高 → 体力上限下降（最低 70）
// 儿科：连续高压沟通 → peds_crisis_floor 升高 → sanity≤阈值即进心理危机（最高 15）
// 妇产科：体/心双轨各半速（每 2 季 +1），上限同外/儿但爬升更慢
// 急诊：体/心双轨全速（每季各 +1）；病房支援轮转当季暂停
// 急诊轮转当季：非急诊也会各 +1（er_rotation_active）
// 内科：只吃单季被动，不累积

export const SURG_WEAR_KEY = 'surg_stamina_wear';
export const PEDS_FLOOR_KEY = 'peds_crisis_floor';
export const OBGYN_TICK_KEY = 'obgyn_cumul_tick';

const SURG_WEAR_MAX = 30;
const PEDS_FLOOR_MAX = 15;
const STAMINA_CAP_FLOOR = 70;

export function staminaCap(): number {
  const wear = Math.min(SURG_WEAR_MAX, Math.max(0, getCounter(SURG_WEAR_KEY)));
  return Math.max(STAMINA_CAP_FLOOR, 100 - wear);
}

export function sanityCrisisFloor(): number {
  return Math.min(PEDS_FLOOR_MAX, Math.max(0, getCounter(PEDS_FLOOR_KEY)));
}

/** 场景共用：是否触发心理危机结局场景。 */
export function isInMentalCrisis(): boolean {
  return getState().stats.sanity <= sanityCrisisFloor();
}

/** updateStats 之后调用：把体力压回当前上限。 */
export function enforceStaminaCap() {
  const cap = staminaCap();
  const st = getState().stats;
  if (st.stamina > cap) {
    patchState({ stats: { ...st, stamina: cap } });
  }
}

function bumpWear(amount: number, notes: string[]) {
  const before = getCounter(SURG_WEAR_KEY);
  const next = Math.min(SURG_WEAR_MAX, before + amount);
  if (next === before) return;
  setCounter(SURG_WEAR_KEY, next);
  if (next === 10 || next === 20 || next === 30) {
    notes.push(`长期站台：体力上限降至 ${100 - next}`);
  }
}

function bumpCrisisFloor(amount: number, notes: string[], label: string) {
  const before = getCounter(PEDS_FLOOR_KEY);
  const next = Math.min(PEDS_FLOOR_MAX, before + amount);
  if (next === before) return;
  setCounter(PEDS_FLOOR_KEY, next);
  if (next === 5 || next === 10 || next === 15) {
    notes.push(`${label}：危机阈值升至 ${next}`);
  }
}

/**
 * 职业/巅峰期每季结算一次累积。
 * 须在亚专科单季 drain 之后调用，以便外科用「本季末体力」决定加速磨损。
 */
export function tickSpecialtyCumulative(stage: string): string | null {
  if (stage !== 'career' && stage !== 'pinnacle') return null;
  const f = getState().flags;
  const notes: string[] = [];
  const onWardRot = hasFlag('ward_rotation_active');
  const onErRot = hasFlag('er_rotation_active');

  if (f.has('sub_surgery')) {
    const tired = getState().stats.stamina < 40;
    bumpWear(tired ? 2 : 1, notes);
  }

  if (f.has('sub_pediatrics')) {
    bumpCrisisFloor(1, notes, '儿科高压');
  }

  // 妇产科：体/心双轨半速——每 2 季各 +1（不叠加疲劳加速，保持「轻累积」）
  if (f.has('sub_obgyn')) {
    const tick = getCounter(OBGYN_TICK_KEY) + 1;
    setCounter(OBGYN_TICK_KEY, tick);
    if (tick % 2 === 0) {
      bumpWear(1, notes);
      bumpCrisisFloor(1, notes, '产科急诊节律');
    }
  }

  // 急诊：体/心双轨全速；病房支援轮转当季暂停累积
  if (f.has('sub_emergency') && !onWardRot) {
    const tired = getState().stats.stamina < 40;
    bumpWear(tired ? 2 : 1, notes);
    bumpCrisisFloor(1, notes, '急诊高压');
  }

  // 非急诊的急诊轮转当季：各 +1（不叠疲劳加速，避免一轮转直接崩）
  if (onErRot) {
    bumpWear(1, notes);
    bumpCrisisFloor(1, notes, '急诊轮转');
  }

  enforceStaminaCap();
  return notes.length > 0 ? notes.join('；') : null;
}

/** HUD 短文案（无累积时返回空）。 */
export function specialtyLoadHudHint(): string {
  const f = getState().flags;
  const bits: string[] = [];
  const showStamina = f.has('sub_surgery') || f.has('sub_obgyn') || f.has('sub_emergency');
  const showCrisis = f.has('sub_pediatrics') || f.has('sub_obgyn') || f.has('sub_emergency');
  if (showStamina && getCounter(SURG_WEAR_KEY) > 0) bits.push(`体限${staminaCap()}`);
  if (showCrisis && sanityCrisisFloor() > 0) bits.push(`危阈${sanityCrisisFloor()}`);
  return bits.length ? bits.join(' ') : '';
}
