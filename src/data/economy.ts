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
  incomeKind: 'family' | 'training' | 'research' | 'salary' | 'pension';
  familyShare?: number;
  entryCost?: number;
  entryIncome?: number;
  label: string;
}

export const STAGE_ECON: Record<string, StageEconSpec> = {
  // 上学阶段：父母补贴（income）应覆盖学费房租伙食（cost），不再恒亏——
  // 此前 income<cost 恒成立，本科生每季净亏、容易触发负债结局，不符合"父母供读书"的现实。
  undergrad: { income: 4500, cost: 3500, entryCost: 4000, label: '本科', incomeKind: 'family', familyShare: 1 },
  internship: { income: 3400, cost: 2400, label: '临床实习', incomeKind: 'training', familyShare: 0.6 },
  guipei: { income: 4200, cost: 3200, entryCost: 2000, label: '规培', incomeKind: 'training', familyShare: 0.4 },
  master: { income: 3600, cost: 2800, entryCost: 1500, label: '学硕', incomeKind: 'research' },
  phd: { income: 4600, cost: 3000, entryCost: 1500, label: '直博', incomeKind: 'research' },
  // 求职待业：父母仍给基本生活费（income），支出压到与之持平，不再每季 -3000。
  jobhunt: { income: 2000, cost: 2000, label: '求职待业', incomeKind: 'family', familyShare: 1 },
  career: { income: 30000, cost: 16000, entryIncome: 6000, label: '职业阶段', incomeKind: 'salary' },
  pinnacle: { income: 42000, cost: 22000, label: '职业巅峰', incomeKind: 'salary' },
  retirement: { income: 12000, cost: 10000, label: '退休生活', incomeKind: 'pension' },
  eternity: { income: 9000, cost: 12000, label: '归途', incomeKind: 'pension' },
};

// 上学阶段：收入来自父母补贴，随随机家庭条件浮动
const SCHOOL_STAGES = new Set(['undergrad', 'internship', 'guipei', 'master', 'phd']);
// 本科、实习、规培和求职仍可能由家庭兜底；研究生补助和职业工资不受家境直接改写。
const FAMILY_SUPPORTED_STAGES = new Set(['undergrad', 'internship', 'guipei', 'jobhunt']);

// 硕博阶段：研究生补助/绩效按带组导师的分配风格浮动（随机），并带小幅随机波动
const RESEARCH_STAGES = new Set(['master', 'phd']);
const MENTOR_FACTOR: Record<string, number> = { equal: 1.0, pyramid: 0.65, generous: 1.25, tight: 0.5 };
export const MENTOR_LABEL: Record<string, string> = {
  equal: '导师按人头平均分', pyramid: '导师金字塔式分配（你拿小头）',
  generous: '导师出手大方', tight: '导师能扣则扣',
};
/** HUD 短标签（完整说明见 MENTOR_LABEL / 阶段简报）。 */
export const MENTOR_HUD_LABEL: Record<string, string> = {
  equal: '均分', pyramid: '金字塔', generous: '大方', tight: '抠门',
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
  cashChange: number;
  assetChange: number;
  pensionChange: number;
  debtChange: number;
  breakdown: EconomyBreakdown;
  assets?: number;
  pension?: number;
}

export interface EconomyBreakdown {
  income: {
    familySupport: number;
    trainingAllowance: number;
    researchStipend: number;
    salary: number;
    spouseContribution: number;
    pensionPayout: number;
    studentLoan: number;
    sideBusiness: number;
  };
  expense: {
    living: number;
    cityPremium: number;
    housingFund: number;
    pensionContribution: number;
    mortgage: number;
    childcare: number;
    healthcare: number;
    studentLoanRepayment: number;
    thriftDiscount: number;
  };
}

const emptyBreakdown = (): EconomyBreakdown => ({
  income: { familySupport: 0, trainingAllowance: 0, researchStipend: 0, salary: 0, spouseContribution: 0, pensionPayout: 0, studentLoan: 0, sideBusiness: 0 },
  expense: { living: 0, cityPremium: 0, housingFund: 0, pensionContribution: 0, mortgage: 0, childcare: 0, healthcare: 0, studentLoanRepayment: 0, thriftDiscount: 0 },
});

export const STUDENT_LOAN_DISBURSEMENT = 1500;
export const STUDENT_LOAN_REPAYMENT = 1500;
export const STUDENT_LOAN_LIMIT = 30000;

export function totalDebt(state = getState()): number {
  return Math.max(0, state.studentLoanBalance ?? 0) + Math.max(0, state.mortgageBalance ?? 0);
}

function regionTierFromFlags(flags: Set<string>): RegionTier {
  if (flags.has('took_private')) return 'private';
  if (flags.has('offer_sanjia') || flags.has('took_hospital_a') || flags.has('took_hospital_b')) {
    return flags.has('took_hospital_b') ? 'county' : 'top';
  }
  if (flags.has('offer_grass') || flags.has('base_home') || flags.has('city_home')) return 'county';
  if (flags.has('city_tier1')) return 'top';
  return 'city';
}

export function propertyValue(state = getState(), tier = regionTierFromFlags(state.flags)): number {
  return state.flags.has('bought_house') ? REGION_HOUSE[tier].down * 5 : 0;
}

export function netWorth(state = getState()): number {
  return state.stats.money + Math.max(0, state.assets ?? 0) + Math.max(0, state.pension ?? 0)
    + propertyValue(state) - totalDebt(state);
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
  pension: number;
  pensionPayout: number;
  studentLoanBalance: number;
  propertyValue: number;
  netWorth: number;
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
  if (!hasFlag('bought_house') || hasFlag('mortgage_prepaid') || hasFlag('mortgage_paid_off')) return null;
  const balance = Math.max(0, getState().mortgageBalance ?? 0);
  if (balance === 0) return null;
  const amount = Math.min(REGION_HOUSE[currentRegionTier()].monthly * 3, balance);
  const result = payAssetBackedExpense('mortgage', amount, `提前还贷 ¥${amount}`);
  const balanceAfter = Math.max(0, balance - amount);
  patchState({ mortgageBalance: balanceAfter });
  if (balanceAfter === 0) setFlag('mortgage_paid_off');
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
  return regionTierFromFlags(getState().flags);
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
export function houseDownPayment(tier: RegionTier = currentRegionTier()): number {
  return REGION_HOUSE[tier].down;
}

/** 职业期房贷月供（随地区档位），季度结算时消费。 */
export function houseMonthly(tier: RegionTier = currentRegionTier()): number {
  if (hasFlag('mortgage_paid_off')) return 0;
  const base = REGION_HOUSE[tier].monthly;
  return hasFlag('mortgage_prepaid') ? Math.round(base * 0.6) : base;
}

export function childQuarterCost(): number {
  return hasFlag('child_education_fund') ? 800 : 1200;
}

/** 住房公积金缴存比例：编制对等缴存更高；合同制/编外/民营更薄。 */
export function housingFundRates(): { employeeRate: number; employerRate: number } {
  const f = getState().flags;
  if (f.has('jh_bianzhi_in')) return { employeeRate: 0.08, employerRate: 0.08 };
  if (f.has('contract') || f.has('jh_bianzhi_out') || f.has('took_private')) {
    return { employeeRate: 0.05, employerRate: 0.05 };
  }
  return { employeeRate: 0.07, employerRate: 0.07 };
}

/** 按税前口径的当季收入估算公积金：个人部分进支出，个人+单位部分进资产。 */
export function housingFundForIncome(grossIncome: number): { employee: number; deposit: number } {
  const safe = Math.max(0, Math.floor(grossIncome));
  const { employeeRate, employerRate } = housingFundRates();
  const employee = Math.round(safe * employeeRate);
  const employer = Math.round(safe * employerRate);
  return { employee, deposit: employee + employer };
}

/**
 * 养老保险缴存比例（游戏简化口径）：
 * 编制单位对等更高；合同/民营雇主部分更薄。个人部分进支出，合计入独立养老金账户（不进资产）。
 */
export function pensionRates(): { employeeRate: number; employerRate: number } {
  const f = getState().flags;
  if (f.has('jh_bianzhi_in')) return { employeeRate: 0.08, employerRate: 0.16 };
  if (f.has('contract') || f.has('jh_bianzhi_out') || f.has('took_private')) {
    return { employeeRate: 0.08, employerRate: 0.12 };
  }
  return { employeeRate: 0.08, employerRate: 0.14 };
}

/** 按税前口径估算养老金：个人部分进支出，个人+单位部分进 pension 账户。 */
export function pensionForIncome(grossIncome: number): { employee: number; deposit: number } {
  const safe = Math.max(0, Math.floor(grossIncome));
  const { employeeRate, employerRate } = pensionRates();
  const employee = Math.round(safe * employeeRate);
  const employer = Math.round(safe * employerRate);
  return { employee, deposit: employee + employer };
}

/** 退休/归途阶段按账户余额估算的季度养老金领取（不扣减本金，便于结局对照）。 */
export function pensionQuarterlyPayout(balance = getState().pension ?? 0): number {
  if (balance <= 0) return 0;
  return Math.max(0, Math.round(balance * 0.025));
}

function applyPensionDeposit(amount: number): number {
  const next = Math.max(0, (getState().pension ?? 0) + amount);
  patchState({ pension: next });
  return next;
}

/** 结局页财务数据卡使用的动态职业画像，明确拆分现金、资产、房贷和季度可支配收入。 */
export function careerFinancialSnapshot(regionTier?: RegionTier): CareerFinancialSnapshot {
  const state = getState();
  const tier = regionTier ?? currentRegionTier();
  const economy = getQuarterEconomy('career', tier);
  const title = state.flags.has('passed_zhenggao') ? '主任医师'
    : state.flags.has('passed_fugao') ? '副主任医师'
    : state.flags.has('passed_zhuzhi') ? '主治医师' : '住院医师';
  const mortgageBalance = Math.max(0, state.mortgageBalance ?? 0);
  return {
    region: REGION_LABEL[tier], title,
    quarterlyIncome: economy.income,
    quarterlyCost: economy.cost,
    disposable: economy.net,
    housePayment: mortgageBalance > 0 ? Math.min(houseMonthly(tier), mortgageBalance) : 0,
    mortgageBalance,
    cash: state.stats.money,
    assets: state.assets ?? 0,
    pension: state.pension ?? 0,
    pensionPayout: pensionQuarterlyPayout(state.pension ?? 0),
    studentLoanBalance: state.studentLoanBalance ?? 0,
    propertyValue: propertyValue(state, tier),
    netWorth: state.stats.money + Math.max(0, state.assets ?? 0) + Math.max(0, state.pension ?? 0)
      + propertyValue(state, tier) - totalDebt(state),
  };
}

/** 结局对照：同一职称/声望下，一线三甲 vs 基层县城的季度可支配收入（游戏内模拟，非外部事实）。 */
export interface RegionDisposableCompare {
  yoursTier: RegionTier;
  yoursLabel: string;
  yoursDisposable: number;
  topDisposable: number;
  countyDisposable: number;
  gapTopMinusCounty: number;
  blurb: string;
}

export function regionDisposableCompare(): RegionDisposableCompare {
  const yoursTier = currentRegionTier();
  const yours = careerFinancialSnapshot(yoursTier);
  const top = careerFinancialSnapshot('top');
  const county = careerFinancialSnapshot('county');
  const gap = top.disposable - county.disposable;
  const blurb = gap >= 0
    ? `同职称对照：一线三甲季度可支配约比基层/县城高 ¥${gap.toLocaleString()}（含收入系数与房贷差）`
    : `同职称对照：本局参数下基层/县城可支配不低于一线（少见，多因未购房或特殊收支）`;
  return {
    yoursTier,
    yoursLabel: REGION_LABEL[yoursTier],
    yoursDisposable: yours.disposable,
    topDisposable: top.disposable,
    countyDisposable: county.disposable,
    gapTopMinusCounty: gap,
    blurb,
  };
}

export function getQuarterEconomy(stage: string, regionTier?: RegionTier, sideIncome = 0): QuarterEconomy {
  const tier = regionTier ?? currentRegionTier();
  const spec = STAGE_ECON[stage] ?? { income: 0, cost: 0, label: stage, incomeKind: 'family' as const };
  const st = getState();
  const breakdown = emptyBreakdown();
  // 城市生活成本溢价只作用于上学/规培/求职阶段；职业阶段由地区档位单独体现。
  const prem = SCHOOL_STAGES.has(stage) || stage === 'jobhunt' ? cityPremiumPct() : 0;
  breakdown.expense.living = spec.cost;
  breakdown.expense.cityPremium = Math.round(spec.cost * prem);
  let income = spec.income;

  // 家庭条件只改变阶段收入中的家庭支持份额，不放大单位补贴、研究生补助或工资。
  let familySupport = 0;
  if (FAMILY_SUPPORTED_STAGES.has(stage)) {
    const factor = FAMILY_FACTOR[st.familyWealth] ?? 1.0;
    const familyBase = Math.round(income * (spec.familyShare ?? 0));
    familySupport = Math.round(familyBase * factor);
    income = income - familyBase + familySupport;
  }

  // 导师风格本身已经是存档内的随机结果；预算查询必须确定，不再每次额外掷骰。
  if (RESEARCH_STAGES.has(stage)) {
    const mf = MENTOR_FACTOR[st.mentorStyle] ?? 1.0;
    income = Math.round(income * mf);
  }

  if (spec.incomeKind === 'family') breakdown.income.familySupport = income;
  else if (spec.incomeKind === 'training') {
    breakdown.income.familySupport = familySupport;
    breakdown.income.trainingAllowance = income - familySupport;
  }
  else if (spec.incomeKind === 'research') breakdown.income.researchStipend = income;
  else if (spec.incomeKind === 'salary') breakdown.income.salary = income;
  else breakdown.income.pensionPayout = income;

  // 助学贷款是债务融资而非收入奖励：在读放款形成本金，工作后按余额偿还。
  if (st.flags.has('student_loan')) {
    if (SCHOOL_STAGES.has(stage)) {
      breakdown.income.studentLoan = Math.min(
        STUDENT_LOAN_DISBURSEMENT,
        Math.max(0, STUDENT_LOAN_LIMIT - (st.studentLoanBalance ?? 0)),
      );
    }
    if (stage === 'career' || stage === 'pinnacle') {
      breakdown.expense.studentLoanRepayment = Math.min(
        STUDENT_LOAN_REPAYMENT,
        Math.max(0, st.studentLoanBalance ?? 0),
      );
    }
  }

  // 职业阶段：底薪 + 职称档差 + 绩效，并明确列示社保、公积金和房贷。
  if (stage === 'career' || stage === 'pinnacle') {
    if (st.flags.has('passed_zhenggao')) income += 12000;
    else if (st.flags.has('passed_fugao')) income += 8000;
    else if (st.flags.has('passed_zhuzhi')) income += 5000;
    income += Math.round((st.stats.reputation ?? 0) / 10) * 500;
    const fixedIncome = Math.round(income * 0.45);
    const performanceIncome = income - fixedIncome;
    income = fixedIncome + Math.round(performanceIncome * policyPerformanceMultiplier(st.policy, stage));
    income = Math.round(income * REGION_INCOME[tier]);
    if (st.flags.has('contract') || st.flags.has('jh_bianzhi_out')) {
      income = Math.round(income * 1.04);
    } else if (st.flags.has('jh_bianzhi_in')) {
      income = Math.round(income * 0.98);
    }
    breakdown.income.salary = income;
    const fund = housingFundForIncome(income);
    breakdown.expense.housingFund = fund.employee;
    const pen = pensionForIncome(income);
    breakdown.expense.pensionContribution = pen.employee;
    if (st.flags.has('bought_house') && !st.flags.has('mortgage_paid_off')) {
      breakdown.expense.mortgage = Math.min(
        houseMonthly(tier),
        Math.max(0, st.mortgageBalance ?? 0),
      );
    }
  }

  if (stage === 'retirement' || stage === 'eternity') {
    breakdown.income.pensionPayout += pensionQuarterlyPayout();
  }

  if (st.marital === 'married') breakdown.income.spouseContribution = 1500;
  if (st.hasChild) breakdown.expense.childcare = childQuarterCost();
  breakdown.expense.healthcare = Math.max(0, st.health?.treatmentCost ?? 0);
  breakdown.income.sideBusiness = Math.max(0, Math.round(sideIncome));

  if (st.financeStrategy === 'thrifty') {
    breakdown.expense.thriftDiscount = Math.round(breakdown.expense.living * 0.1);
  }

  const totalIncome = Object.values(breakdown.income).reduce((sum, value) => sum + value, 0);
  const cost = Object.entries(breakdown.expense).reduce(
    (sum, [key, value]) => sum + (key === 'thriftDiscount' ? -value : value), 0,
  );
  const net = totalIncome - cost;
  const loanDebt = breakdown.income.studentLoan;
  const repaidDebt = breakdown.expense.studentLoanRepayment + breakdown.expense.mortgage;
  return {
    income: totalIncome, cost, net, cityPremiumPct: prem, financeNote: '',
    cashChange: net, assetChange: 0, pensionChange: 0, debtChange: loanDebt - repaidDebt, breakdown,
  };
}

// 每个季度固定结算一次（无论该回合是否有事件触发），并按理财策略分配结余。
// 资产账户：节流把正结余的 30% 转入储蓄并计息；投资把正结余的 50% 投入资产并随季波动。
export function applyStageEconomy(stage: string, sideIncome = 0): QuarterEconomy {
  const e = getQuarterEconomy(stage, undefined, sideIncome);
  const st = getState();
  const assetsBefore = st.assets ?? 0;
  const pensionBefore = st.pension ?? 0;
  let cashChange = e.net;
  let financeNote = '';
  let assets = st.assets ?? 0;

  // 债务余额与本季预算同源更新。
  let loanBalance = st.studentLoanBalance ?? 0;
  if (e.breakdown.income.studentLoan > 0) loanBalance += e.breakdown.income.studentLoan;
  if (e.breakdown.expense.studentLoanRepayment > 0) {
    loanBalance = Math.max(0, loanBalance - e.breakdown.expense.studentLoanRepayment);
    if (loanBalance === 0) setFlag('student_loan_repaid');
  }
  let mortgageBalance = st.mortgageBalance ?? 0;
  if (e.breakdown.expense.mortgage > 0) {
    mortgageBalance = Math.max(0, mortgageBalance - e.breakdown.expense.mortgage);
    if (mortgageBalance === 0) setFlag('mortgage_paid_off');
  }
  patchState({ studentLoanBalance: loanBalance, mortgageBalance });

  // 职业期公积金：个人部分已计入 getQuarterEconomy.cost；单位+个人合计入资产（不重复扣现金）
  let housingFundDeposit = 0;
  // 职业期养老金：个人部分已计入 cost；单位+个人合计入独立 pension 账户（不进资产、不可提现）
  let pensionDeposit = 0;
  if (stage === 'career' || stage === 'pinnacle') {
    const salaryIncome = e.breakdown.income.salary;
    housingFundDeposit = housingFundForIncome(salaryIncome).deposit;
    if (housingFundDeposit > 0) {
      applyAssetTransaction('deposit', housingFundDeposit, 0, `公积金入账 ¥${housingFundDeposit}`);
      assets = getState().assets;
    }
    pensionDeposit = pensionForIncome(salaryIncome).deposit;
    if (pensionDeposit > 0) {
      applyPensionDeposit(pensionDeposit);
    }
  }

  const fundNoteBits: string[] = [];
  if (housingFundDeposit > 0) fundNoteBits.push(`公积金 +${housingFundDeposit}`);
  if (pensionDeposit > 0) fundNoteBits.push(`养老金 +${pensionDeposit}`);
  const fundNote = fundNoteBits.length > 0 ? fundNoteBits.join('，') : '';

  if (st.financeStrategy === 'thrifty') {
    // 节流：支出已通过 getQuarterEconomy 压一成；此处把正结余的 30% 转储蓄，储蓄每季 0.5% 计息
    let deposit = 0;
    const cashBeforeTransfer = e.net;
    if (cashBeforeTransfer !== 0) updateStats({ money: cashBeforeTransfer } as StatDelta);
    if (e.net > 0) {
      deposit = Math.round(e.net * 0.3);
      cashChange -= deposit;
      applyAssetTransaction('deposit', deposit, -deposit, `节流转储蓄 ¥${deposit}`);
    }
    assets = getState().assets;
    const interest = Math.max(0, Math.round(assets * 0.005));
    if (interest > 0) applyAssetTransaction('interest', interest, 0, `季度利息 ¥${interest}`);
    assets = getState().assets;
    financeNote = `（节流省 ${e.breakdown.expense.thriftDiscount}，转储蓄 ${deposit}，利息 +${interest}`
      + (fundNote ? `，${fundNote}` : '')
      + '）';
  } else if (st.financeStrategy === 'invest') {
    // 投资：正结余的 50% 投入资产；资产每季 ±8% 波动
    let invested = 0;
    const cashBeforeTransfer = e.net;
    if (cashBeforeTransfer !== 0) updateStats({ money: cashBeforeTransfer } as StatDelta);
    if (e.net > 0) {
      invested = Math.round(e.net * 0.5);
      cashChange -= invested;
      applyAssetTransaction('investment', invested, -invested, `投入市场 ¥${invested}`);
    }
    assets = getState().assets;
    const swing = Math.round(assets * (Math.random() * 0.16 - 0.08));
    if (swing !== 0) applyAssetTransaction('market', swing, 0, `季度市场波动 ${swing >= 0 ? '+' : ''}¥${swing}`);
    assets = getState().assets;
    financeNote = `（投入 ${invested}，资产 ${swing >= 0 ? '+' : ''}${swing}`
      + (fundNote ? `，${fundNote}` : '')
      + '）';
  } else {
    if (e.net !== 0) updateStats({ money: e.net } as StatDelta);
    if (fundNote) financeNote = `（${fundNote}）`;
  }

  return {
    ...e,
    financeNote,
    cashChange,
    assetChange: (getState().assets ?? 0) - assetsBefore,
    pensionChange: (getState().pension ?? 0) - pensionBefore,
    assets,
    pension: getState().pension ?? 0,
  };
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
  const familyLine = FAMILY_SUPPORTED_STAGES.has(stage)
    ? `家庭条件：${FAMILY_LABEL[s.familyWealth] ?? '家境普通'}（家庭支持 ¥${e.breakdown.income.familySupport}/季）`
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
    const salaryIncome = e.breakdown.income.salary;
    const fund = housingFundForIncome(salaryIncome);
    const rates = housingFundRates();
    lines.push(`住房公积金：个人 ¥${fund.employee}/季（${Math.round(rates.employeeRate * 100)}%），合计入账资产 ¥${fund.deposit}`);
    const pen = pensionForIncome(salaryIncome);
    const penRates = pensionRates();
    lines.push(`养老保险：个人 ¥${pen.employee}/季（${Math.round(penRates.employeeRate * 100)}%），合计入账养老金账户 ¥${pen.deposit}`);
  }
  if (stage === 'retirement' || stage === 'eternity') {
    const bal = s.pension ?? 0;
    const payout = pensionQuarterlyPayout(bal);
    lines.push(`养老金账户：余额 ¥${bal.toLocaleString()}，本季领取约 ¥${payout.toLocaleString()}`);
  }
  if (e.breakdown.income.studentLoan > 0) lines.push(`助学贷款：本季放款 ¥${e.breakdown.income.studentLoan}，余额上限 ¥${STUDENT_LOAN_LIMIT.toLocaleString()}`);
  if (e.breakdown.expense.studentLoanRepayment > 0) lines.push(`助学贷款偿还：¥${e.breakdown.expense.studentLoanRepayment}/季，当前余额 ¥${s.studentLoanBalance.toLocaleString()}`);
  if (familyLine) lines.splice(2, 0, familyLine);
  if (mentorLine) lines.splice(2, 0, mentorLine);
  if (spec.entryCost) lines.push(`入学 / 入职一次性支出：¥${spec.entryCost}`);
  if (spec.entryIncome) lines.push(`入职一次性收入：¥${spec.entryIncome}`);
  lines.push('（具体数额会因你的选择而浮动）');
  return lines.join('\n');
}
