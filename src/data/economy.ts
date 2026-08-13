import { getState, updateStats, hasFlag, setFlag, patchState } from './gameState';
import type { StatDelta } from './stats';
import type { AssetTransaction, AssetTransactionKind } from './gameState';
import type { LifeStage } from './gameState';
import { policyPerformanceMultiplier } from './policy';

// —— 各阶段经济模型（类星露谷：每月/每季的固定收支 + 入学入职一次性费用）——
// 数值以“季度”为粒度（本游戏一回合 = 一季度）。
// income：每季度固定收入（家庭生活费 / 规培补贴 / 研究生补助 / 工资）
// cost：  每季度固定支出（学费摊销 / 房租伙食 / 房贷育儿）
// entryCost / entryIncome：进入该阶段时的一次性收支（学费押金 / 安家费）
// 注：事件（奖学金、兼职、红包等）会在这些基数上额外浮动，故此处只是“保底”盘口。

interface StageEconSpec {
  income: number;
  cost: number;
  entryCost?: number;
  entryIncome?: number;
  label: string;
}

export const STAGE_ECON: Record<string, StageEconSpec> = {
  // 上学阶段：父母补贴（income）应覆盖学费房租伙食（cost），不再恒亏——
  // 此前 income<cost 恒成立，本科生每季净亏、容易触发负债结局，不符合"父母供读书"的现实。
  undergrad: { income: 4500, cost: 3500, entryCost: 4000, label: '本科' },
  internship: { income: 3400, cost: 2400, label: '临床实习' },
  guipei: { income: 4200, cost: 3200, entryCost: 2000, label: '规培' },
  master: { income: 3600, cost: 2800, entryCost: 1500, label: '学硕' },
  phd: { income: 4600, cost: 3000, entryCost: 1500, label: '直博' },
  // 求职待业：父母仍给基本生活费（income），支出压到与之持平，不再每季 -3000。
  jobhunt: { income: 2000, cost: 2000, label: '求职待业' },
  career: { income: 30000, cost: 16000, entryIncome: 6000, label: '主治医师' },
  pinnacle: { income: 42000, cost: 22000, label: '职业巅峰' },
  retirement: { income: 12000, cost: 10000, label: '退休生活' },
  eternity: { income: 9000, cost: 12000, label: '归途' },
};

// 上学阶段：收入来自父母补贴，随随机家庭条件浮动
const SCHOOL_STAGES = new Set(['undergrad', 'internship', 'guipei', 'master', 'phd']);

// 硕博阶段：研究生补助/绩效按带组导师的分配风格浮动（随机），并带小幅随机波动
const RESEARCH_STAGES = new Set(['master', 'phd']);
const MENTOR_FACTOR: Record<string, number> = { equal: 1.0, pyramid: 0.65, generous: 1.25, tight: 0.5 };
export const MENTOR_LABEL: Record<string, string> = {
  equal: '导师按人头平均分', pyramid: '导师金字塔式分配（你拿小头）',
  generous: '导师出手大方', tight: '导师能扣则扣',
};

const FAMILY_FACTOR: Record<string, number> = { rich: 1.5, middle: 1.0, tight: 0.6 };
export const FAMILY_LABEL: Record<string, string> = { rich: '家境殷实', middle: '家境普通', tight: '家境拮据' };

// 理财策略对季度净结余的影响（R 菜单可调，每季自动应用）：
//  thrifty 节流储蓄：支出 -10%，结余按年化 2% 计息
//  stable  稳健生活：默认收支
//  invest  适度投资：结余投入市场，每季随机 ±15%
export const FINANCE_LABEL: Record<string, string> = { thrifty: '节流储蓄', stable: '稳健生活', invest: '适度投资' };

export interface QuarterEconomy {
  income: number;
  cost: number;
  net: number;
  cityPremiumPct: number;
  financeNote: string;
  assets?: number;
}

export interface AssetWithdrawal {
  requested: number;
  withdrawn: number;
  fee: number;
  received: number;
  assetsAfter: number;
}

export interface HousePayment {
  downPayment: number;
  assetUsed: number;
  cashUsed: number;
  assetsAfter: number;
}

export interface AssetExpense {
  amount: number;
  assetUsed: number;
  cashUsed: number;
  assetsAfter: number;
}

export interface CareerFinancialSnapshot {
  region: string;
  title: string;
  quarterlyIncome: number;
  quarterlyCost: number;
  disposable: number;
  housePayment: number;
  mortgageBalance: number;
  cash: number;
  assets: number;
}

const ASSET_LEDGER_LIMIT = 100;
export const WITHDRAWAL_LIMIT = 10000;
export const WITHDRAWAL_FEE_RATE = 0.02;
export const CHILD_EDUCATION_FUND = 5000;

function applyAssetTransaction(
  kind: AssetTransactionKind,
  assetDelta: number,
  cashDelta: number,
  note: string,
  fee = 0,
): AssetTransaction {
  const before = getState();
  const balanceAfter = Math.max(0, before.assets + assetDelta);
  if (cashDelta !== 0) updateStats({ money: cashDelta });
  const current = getState();
  const transaction: AssetTransaction = {
    kind,
    year: before.year,
    quarter: before.quarter,
    assetDelta: balanceAfter - before.assets,
    cashDelta,
    fee,
    balanceAfter,
    note,
  };
  patchState({
    assets: balanceAfter,
    assetLedger: [...(current.assetLedger ?? []), transaction].slice(-ASSET_LEDGER_LIMIT),
  });
  return transaction;
}

/** 应急提现：单次最多 ¥10,000，资产扣除额包含 2% 手续费。 */
export function withdrawAssets(
  requested: number,
  feeRate = WITHDRAWAL_FEE_RATE,
  limit = WITHDRAWAL_LIMIT,
): AssetWithdrawal {
  const safeRequest = Math.max(0, Math.min(Math.floor(requested), limit));
  const withdrawn = Math.min(safeRequest, Math.max(0, Math.floor(getState().assets)));
  const fee = Math.min(withdrawn, Math.round(withdrawn * Math.max(0, feeRate)));
  const received = withdrawn - fee;
  if (withdrawn > 0) {
    applyAssetTransaction('withdrawal', -withdrawn, received, `应急提现 ¥${withdrawn}`, fee);
  }
  return { requested: safeRequest, withdrawn, fee, received, assetsAfter: getState().assets };
}

/** 购房首付优先使用资产余额，不足部分才扣现金。 */
export function payHouseDownPayment(): HousePayment {
  const downPayment = houseDownPayment();
  const assetUsed = Math.min(Math.max(0, getState().assets), downPayment);
  const cashUsed = downPayment - assetUsed;
  applyAssetTransaction('house', -assetUsed, -cashUsed, `购房首付 ¥${downPayment}`);
  patchState({ mortgageBalance: downPayment * 4 });
  return { downPayment, assetUsed, cashUsed, assetsAfter: getState().assets };
}

function payAssetBackedExpense(
  kind: 'education' | 'mortgage',
  amount: number,
  note: string,
): AssetExpense {
  const assetUsed = Math.min(Math.max(0, getState().assets), amount);
  const cashUsed = amount - assetUsed;
  applyAssetTransaction(kind, -assetUsed, -cashUsed, note);
  return { amount, assetUsed, cashUsed, assetsAfter: getState().assets };
}

/** 为已有子女建立教育基金；一次性支出换取后续育儿支出下降。 */
export function fundChildEducation(): AssetExpense | null {
  if (!getState().hasChild || hasFlag('child_education_fund')) return null;
  const result = payAssetBackedExpense('education', CHILD_EDUCATION_FUND, `子女教育基金 ¥${CHILD_EDUCATION_FUND}`);
  setFlag('child_education_fund');
  return result;
}

/** 提前偿还三期地区房贷，后续季度房贷下降 40%。 */
export function prepayMortgage(): AssetExpense | null {
  if (!hasFlag('bought_house') || hasFlag('mortgage_prepaid')) return null;
  const amount = REGION_HOUSE[currentRegionTier()].monthly * 3;
  const result = payAssetBackedExpense('mortgage', amount, `提前还贷 ¥${amount}`);
  patchState({ mortgageBalance: Math.max(0, (getState().mortgageBalance || houseDownPayment() * 4) - amount) });
  setFlag('mortgage_prepaid');
  return result;
}

// 一线城市（顶尖/强校）生活成本更高：依据就读院校档次加收房租伙食溢价。
export function cityPremiumPct(): number {
  const t = getState().school?.tier;
  if (t === 1) return 0.18;
  if (t === 2) return 0.08;
  return 0;
}

// —— 职业阶段：医院/地区档位（深挖第五部分 R2 / OPTIMIZATION-ROADMAP R2 落地）——
// 求职阶段的选择（三甲/市级/基层/私立/回老家）决定职业收入系数与房价档位。
// 模拟校准口径：一线三甲 vs 县城基层在收入与住房压力上拉开可感知差距。
export type RegionTier = 'top' | 'city' | 'county' | 'private';

/** 依据求职 flag 判定玩家当前医院/地区档位。 */
export function currentRegionTier(): RegionTier {
  const f = getState().flags;
  if (f.has('took_private')) return 'private';
  if (f.has('offer_sanjia') || f.has('took_hospital_a') || f.has('took_hospital_b')) {
    // took_hospital_a 是"选A平台(三甲)"、took_hospital_b 是"选B编制"——按城市档计
    return f.has('took_hospital_b') ? 'county' : 'top';
  }
  if (f.has('offer_grass') || f.has('base_home') || f.has('city_home')) return 'county';
  if (f.has('city_tier1')) return 'top';
  return 'city'; // 默认市级
}

export const REGION_LABEL: Record<RegionTier, string> = {
  top: '一线三甲', city: '市级医院', county: '基层/县城', private: '民营私立',
};

/** 职业收入系数：三甲最高、基层最低。
 * 游戏内保持 city 为参考基准（1.1），上调 top、下调 county、微上调 private，
 * 使 top:county ≈ 1.45:0.75 ≈ 1.9 倍差，强化路线差异但仍保平衡。
 */
const REGION_INCOME: Record<RegionTier, number> = { top: 1.45, city: 1.1, county: 0.75, private: 1.25 };

/** 房价档位：三甲城市首付/月供重，基层县城轻（首付 4-5 倍差、月供 6 倍差）。 */
export const REGION_HOUSE: Record<RegionTier, { down: number; monthly: number }> = {
  top: { down: 16000, monthly: 5000 },
  city: { down: 10000, monthly: 3000 },
  county: { down: 3500, monthly: 900 },
  private: { down: 12000, monthly: 3800 },
};

/** 职业期购房首付（随地区档位）。事件里展示用。 */
export function houseDownPayment(): number {
  return REGION_HOUSE[currentRegionTier()].down;
}

/** 职业期房贷月供（随地区档位），季度结算时消费。 */
export function houseMonthly(): number {
  const base = REGION_HOUSE[currentRegionTier()].monthly;
  return hasFlag('mortgage_prepaid') ? Math.round(base * 0.6) : base;
}

export function childQuarterCost(): number {
  return hasFlag('child_education_fund') ? 800 : 1200;
}

/** 结局页财务数据卡使用的动态职业画像，明确拆分现金、资产、房贷和季度可支配收入。 */
export function careerFinancialSnapshot(): CareerFinancialSnapshot {
  const state = getState();
  const economy = getQuarterEconomy('career');
  const title = state.flags.has('passed_zhenggao') ? '主任医师'
    : state.flags.has('passed_fugao') ? '副主任医师'
    : state.flags.has('passed_zhuzhi') ? '主治医师' : '住院医师';
  const mortgageBalance = state.mortgageBalance || (state.flags.has('bought_house') ? houseDownPayment() * 4 : 0);
  return {
    region: REGION_LABEL[currentRegionTier()], title,
    quarterlyIncome: economy.income,
    quarterlyCost: economy.cost,
    disposable: economy.net,
    housePayment: state.flags.has('bought_house') ? houseMonthly() : 0,
    mortgageBalance,
    cash: state.stats.money,
    assets: state.assets ?? 0,
  };
}

export function getQuarterEconomy(stage: string): QuarterEconomy {
  const spec = STAGE_ECON[stage] ?? { income: 0, cost: 0, label: stage };
  // 城市生活成本溢价只作用于上学/规培阶段（职业阶段由地区档位单独体现，见 currentRegionTier）
  const prem = SCHOOL_STAGES.has(stage) || stage === 'jobhunt' ? cityPremiumPct() : 0;
  let cost = Math.round(spec.cost * (1 + prem));
  let income = spec.income;

  // —— 家庭条件：上学期间的父母补贴/生活费随家境浮动 ——
  if (SCHOOL_STAGES.has(stage)) {
    const factor = FAMILY_FACTOR[getState().familyWealth] ?? 1.0;
    income = Math.round(income * factor);
  }

  // —— 硕博：研究生补助/绩效按带组导师分配风格浮动，带小幅随机波动 ——
  if (RESEARCH_STAGES.has(stage)) {
    const mf = MENTOR_FACTOR[getState().mentorStyle] ?? 1.0;
    income = Math.round(income * mf * (0.9 + Math.random() * 0.2));
  }

  // —— 助学贷款（属性分配阶段可选）：完整在读阶段 +1500/季，工作后 -1500/季还贷 ——
  if (getState().flags.has('student_loan')) {
    if (SCHOOL_STAGES.has(stage)) income += 1500;
    if (stage === 'career') cost += 1500;
  }

  // —— 职业阶段：底薪 + 职称档差 + 绩效（声望），支出含房贷/育儿 ——
  if (stage === 'career' || stage === 'pinnacle') {
    const s = getState();
    if (s.flags.has('passed_zhenggao')) income += 12000;
    else if (s.flags.has('passed_fugao')) income += 8000;
    else if (s.flags.has('passed_zhuzhi')) income += 5000;
    income += Math.round((s.stats.reputation ?? 0) / 10) * 500; // 绩效随声望
    const fixedIncome = Math.round(income * 0.45);
    const performanceIncome = income - fixedIncome;
    income = fixedIncome + Math.round(performanceIncome * policyPerformanceMultiplier(s.policy, stage));
    // 医院/地区系数：三甲/私立上浮、基层/县城下调（求职选择真正影响收入）
    income = Math.round(income * REGION_INCOME[currentRegionTier()]);
    if (s.flags.has('bought_house')) cost += houseMonthly();      // 房贷月供按地区档位
  }

  // —— 人生状态对收支的持续影响 ——
  const st = getState();
  if (st.marital === 'married') income += 1500; // 双职工 / 配偶补贴
  if (st.hasChild) cost += childQuarterCost(); // 育儿 / 托育；教育基金建成后下降
  cost += Math.max(0, st.health?.treatmentCost ?? 0);

  // —— 理财策略：节流储蓄把支出压一成，且真实改写 cost（账单/简报可见）——
  if (st.financeStrategy === 'thrifty') cost = Math.round(cost * 0.9);

  return { income, cost, net: income - cost, cityPremiumPct: prem, financeNote: '' };
}

// 每个季度固定结算一次（无论该回合是否有事件触发），并按理财策略分配结余。
// 资产账户：节流把正结余的 30% 转入储蓄并计息；投资把正结余的 50% 投入资产并随季波动。
export function applyStageEconomy(stage: string): QuarterEconomy {
  const e = getQuarterEconomy(stage);
  const st = getState();
  let net = e.net;
  let financeNote = '';
  let assets = st.assets ?? 0;

  if (st.financeStrategy === 'thrifty') {
    // 节流：支出已通过 getQuarterEconomy 压一成；此处把正结余的 30% 转储蓄，储蓄每季 0.5% 计息
    let deposit = 0;
    const cashBeforeTransfer = net;
    if (cashBeforeTransfer !== 0) updateStats({ money: cashBeforeTransfer } as StatDelta);
    if (net > 0) {
      deposit = Math.round(net * 0.3);
      net -= deposit;
      applyAssetTransaction('deposit', deposit, -deposit, `节流转储蓄 ¥${deposit}`);
    }
    assets = getState().assets;
    const interest = Math.max(0, Math.round(assets * 0.005));
    if (interest > 0) applyAssetTransaction('interest', interest, 0, `季度利息 ¥${interest}`);
    assets = getState().assets;
    financeNote = `（节流省 ${Math.round(e.cost * 0.1)}，转储蓄 ${deposit}，利息 +${interest}）`;
  } else if (st.financeStrategy === 'invest') {
    // 投资：正结余的 50% 投入资产；资产每季 ±8% 波动
    let invested = 0;
    const cashBeforeTransfer = net;
    if (cashBeforeTransfer !== 0) updateStats({ money: cashBeforeTransfer } as StatDelta);
    if (net > 0) {
      invested = Math.round(net * 0.5);
      net -= invested;
      applyAssetTransaction('investment', invested, -invested, `投入市场 ¥${invested}`);
    }
    assets = getState().assets;
    const swing = Math.round(assets * (Math.random() * 0.16 - 0.08));
    if (swing !== 0) applyAssetTransaction('market', swing, 0, `季度市场波动 ${swing >= 0 ? '+' : ''}¥${swing}`);
    assets = getState().assets;
    financeNote = `（投入 ${invested}，资产 ${swing >= 0 ? '+' : ''}${swing}）`;
  } else {
    if (net !== 0) updateStats({ money: net } as StatDelta);
  }

  return { ...e, net, financeNote, assets };
}

// 进入阶段时的一次性收支（如学费押金 / 安家费）。用 flag 守护，避免读档重入重复扣费。
export function applyStageEntry(stage: string): { cost: number; income: number; net: number } | null {
  const spec = STAGE_ECON[stage];
  if (!spec) return null;
  const flag = 'entry_' + stage;
  if (hasFlag(flag)) return null;
  setFlag(flag);
  const cost = spec.entryCost ?? 0;
  const income = spec.entryIncome ?? 0;
  const net = income - cost;
  if (net !== 0) updateStats({ money: net } as StatDelta);

  // 知识继承：进入硕士 / 博士 / 职业阶段时，知识重置为上阶结束值的 30%。
  // 本科为第一阶段不继承（保持默认 30）。applyStageEntry 由 entry_<stage>
  // flag 守护，仅进入阶段时执行一次，故继承只发生一次。
  const inheritStages: LifeStage[] = ['master', 'phd', 'career'];
  if (inheritStages.includes(stage as LifeStage)) {
    const inherited = Math.floor(getState().stats.knowledge * 0.3);
    updateStats({ knowledge: inherited - getState().stats.knowledge } as StatDelta);
  }
  return { cost, income, net };
}

// 阶段经济简报文案（用于阶段开始时的说明弹窗）。
export function describeStageEconomy(stage: string): string | null {
  const spec = STAGE_ECON[stage];
  if (!spec) return null;
  const e = getQuarterEconomy(stage);
  const s = getState();
  const familyLine = SCHOOL_STAGES.has(stage)
    ? `\n家庭条件：${FAMILY_LABEL[s.familyWealth] ?? '家境普通'}（父母每季补贴 ¥${e.income}）`
    : '';
  const mentorLine = RESEARCH_STAGES.has(stage)
    ? `\n带组导师绩效风格：${MENTOR_LABEL[s.mentorStyle] ?? '按人头平均'}`
    : '';
  const lines = [
    `【${spec.label}阶段 · 经济简报】`,
    `每季度固定收入：¥${e.income}`,
    `每季度固定支出：¥${e.cost}` + (e.cityPremiumPct > 0 ? `（含城市溢价 +${Math.round(e.cityPremiumPct * 100)}%）` : ''),
    `每季度净收支：${e.net >= 0 ? '+' : ''}¥${e.net}`,
    `理财策略：${FINANCE_LABEL[s.financeStrategy] ?? '稳健生活'}（R 菜单可调）`,
  ];
  if (stage === 'career' || stage === 'pinnacle') {
    lines.splice(1, 0, `工作单位：${REGION_LABEL[currentRegionTier()]}`);
  }
  if (familyLine) lines.splice(2, 0, familyLine);
  if (mentorLine) lines.splice(2, 0, mentorLine);
  if (spec.entryCost) lines.push(`入学 / 入职一次性支出：¥${spec.entryCost}`);
  if (spec.entryIncome) lines.push(`入职一次性收入：¥${spec.entryIncome}`);
  lines.push('（具体数额会因你的选择而浮动）');
  return lines.join('\n');
}
