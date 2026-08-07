export interface FinanceState {
  cash: number;
  monthlyIncome: number;
  monthlyExpense: number;
  debt: number;
  income: { baseSalary: number; performance: number; allowance: number; extra: number };
  expense: { housing: number; food: number; transport: number; social: number; child: number; parent: number; healthcare: number; education: number };
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
  expense: { housing: 0, food: 0, transport: 0, social: 0, child: 0, parent: 0, healthcare: 0, education: 0 },
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
  input: { cash: number; income: number; expense: number; mortgage: number; healthCost: number; hasChild: boolean },
): FinanceState {
  const f = normalizeFinance(current, input.cash);
  const monthlyIncome = Math.round(input.income / 3);
  const monthlyExpense = Math.round(input.expense / 3);
  const baseSalary = Math.round(monthlyIncome * 0.38);
  const performance = Math.round(monthlyIncome * 0.47);
  const allowance = monthlyIncome - baseSalary - performance;
  const expense = {
    ...f.expense,
    housing: input.mortgage > 0 ? Math.round(input.mortgage / 3) : Math.round(monthlyExpense * 0.3),
    food: Math.round(monthlyExpense * 0.25),
    transport: Math.round(monthlyExpense * 0.08),
    social: Math.round(monthlyExpense * 0.1),
    child: input.hasChild ? Math.round(monthlyExpense * 0.15) : 0,
    healthcare: input.healthCost,
  };
  const debt = Math.max(0, input.mortgage);
  return {
    ...f,
    cash: input.cash,
    monthlyIncome,
    monthlyExpense,
    debt,
    income: { ...f.income, baseSalary, performance, allowance },
    expense,
    financialAnxiety: input.cash < monthlyExpense * 3 || monthlyIncome < monthlyExpense,
    lifetimeEarnings: f.lifetimeEarnings + input.income,
    lifetimeExpenses: f.lifetimeExpenses + input.expense,
  };
}

