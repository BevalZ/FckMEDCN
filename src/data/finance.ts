import type { QuarterEconomy } from './economy';

export interface FinanceState {
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  debt: number;
  income: { baseSalary: number; performance: number; allowance: number; extra: number };
  expense: { housing: number; food: number; transport: number; social: number; child: number; parent: number; healthcare: number; education: number; insurance: number; debt: number };
  corruption: number;
  financialAnxiety: boolean;
  lifetimeEarnings: number;
  lifetimeExpenses: number;
  majorPurchases: string[];
}

export const DEFAULT_FINANCE_STATE: FinanceState = {
  cash: 5000,
  monthlyIncome: 0,
  monthlyExpense: 0,
  debt: 0,
  income: { baseSalary: 0, performance: 0, allowance: 0, extra: 0 },
  expense: { housing: 0, food: 0, transport: 0, social: 0, child: 0, parent: 0, healthcare: 0, education: 0, insurance: 0, debt: 0 },
  corruption: 0,
  financialAnxiety: false,
  lifetimeEarnings: 0,
  lifetimeExpenses: 0,
  majorPurchases: [],
};

export function normalizeFinance(raw?: Partial<FinanceState>, cash = 5000): FinanceState {
  const r = raw ?? {};
  return {
    ...DEFAULT_FINANCE_STATE,
    ...r,
    cash,
    income: { ...DEFAULT_FINANCE_STATE.income, ...(r.income ?? {}) },
    expense: { ...DEFAULT_FINANCE_STATE.expense, ...(r.expense ?? {}) },
    majorPurchases: [...(r.majorPurchases ?? [])],
    corruption: Math.max(0, Math.min(100, r.corruption ?? 0)),
  };
}

export function recordQuarterFinance(
  current: FinanceState,
  input: { cash: number; assets?: number; economy: QuarterEconomy; mortgage: number; studentLoanBalance?: number },
): FinanceState {
  const f = normalizeFinance(current, input.cash);
  const { economy } = input;
  const monthlyIncome = Math.round(economy.income / 3);
  const monthlyExpense = Math.round(economy.cost / 3);
  const salaryMonthly = Math.round(economy.breakdown.income.salary / 3);
  const performance = Math.round(salaryMonthly * 0.55);
  const baseSalary = salaryMonthly - performance;
  const allowance = Math.round((
    economy.breakdown.income.familySupport
    + economy.breakdown.income.trainingAllowance
    + economy.breakdown.income.researchStipend
    + economy.breakdown.income.spouseContribution
    + economy.breakdown.income.pensionPayout
    + economy.breakdown.income.studentLoan
  ) / 3);
  const expense = {
    ...f.expense,
    housing: Math.round(economy.breakdown.expense.mortgage / 3),
    food: Math.round((economy.breakdown.expense.living + economy.breakdown.expense.cityPremium - economy.breakdown.expense.thriftDiscount) / 3),
    transport: 0,
    social: 0,
    child: Math.round(economy.breakdown.expense.childcare / 3),
    healthcare: Math.round(economy.breakdown.expense.healthcare / 3),
    education: 0,
    insurance: Math.round((economy.breakdown.expense.housingFund + economy.breakdown.expense.pensionContribution) / 3),
    debt: Math.round(economy.breakdown.expense.studentLoanRepayment / 3),
  };
  const debt = Math.max(0, input.mortgage) + Math.max(0, input.studentLoanBalance ?? 0);
  return {
    ...f,
    cash: input.cash,
    monthlyIncome,
    monthlyExpense,
    debt,
    income: { ...f.income, baseSalary, performance, allowance, extra: Math.round(economy.breakdown.income.sideBusiness / 3) },
    expense,
    financialAnxiety: input.cash + Math.max(0, input.assets ?? 0) < monthlyExpense * 3 || monthlyIncome < monthlyExpense,
    lifetimeEarnings: f.lifetimeEarnings + economy.income - economy.breakdown.income.studentLoan,
    lifetimeExpenses: f.lifetimeExpenses + economy.cost
      - economy.breakdown.expense.studentLoanRepayment
      - economy.breakdown.expense.mortgage,
  };
}
