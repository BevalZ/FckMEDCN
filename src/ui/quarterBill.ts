import { getState } from '../data/gameState';
import { childQuarterCost, houseMonthly } from '../data/economy';
import type { EconomyBreakdown } from '../data/economy';

/** 结构化季度账单文案（卡片场景与行走场景共用）。 */
export function formatQuarterBill(e: {
  income: number;
  cost: number;
  net: number;
  financeNote?: string;
  breakdown?: EconomyBreakdown;
}): string | null {
  if (e.income === 0 && e.cost === 0) return null;
  const s = getState();
  const rows: string[] = [];
  rows.push(`季度结算 ▸ 收入 ¥${e.income.toLocaleString()}`);
  if (e.breakdown) {
    const income = e.breakdown.income;
    const expense = e.breakdown.expense;
    const incomeRows = [
      ['家庭/补贴', income.familySupport + income.trainingAllowance + income.researchStipend],
      ['工资', income.salary],
      ['配偶', income.spouseContribution],
      ['副业', income.sideBusiness],
      ['贷款放款', income.studentLoan],
      ['养老金', income.pensionPayout],
    ].filter((row) => Number(row[1]) > 0) as Array<[string, number]>;
    for (const [label, value] of incomeRows) rows.push(`  ${label} ¥+${Number(value).toLocaleString()}`);
    const expenseRows = [
      ['生活', expense.living + expense.cityPremium - expense.thriftDiscount],
      ['公积金/养老', expense.housingFund + expense.pensionContribution],
      ['房贷', expense.mortgage],
      ['育儿', expense.childcare],
      ['医疗', expense.healthcare],
      ['贷款偿还', expense.studentLoanRepayment],
    ].filter((row) => Number(row[1]) > 0) as Array<[string, number]>;
    for (const [label, value] of expenseRows) rows.push(`  ${label} ¥-${Number(value).toLocaleString()}`);
  }
  if (!e.breakdown && s.flags.has('bought_house')) {
    rows.push(`  其中 房贷 ¥-${houseMonthly().toLocaleString()}`);
  }
  if (!e.breakdown && s.hasChild) rows.push(`  其中 育儿 ¥-${childQuarterCost().toLocaleString()}`);
  rows.push(`  支出 ¥${e.cost.toLocaleString()} = 净 ${e.net >= 0 ? '+' : ''}¥${e.net.toLocaleString()}`);
  if ((s.assets ?? 0) > 0 || (e.financeNote && e.financeNote.length > 0)) {
    rows.push(`  资产 ¥${(s.assets ?? 0).toLocaleString()}${e.financeNote ?? ''}`);
  }
  if ((s.pension ?? 0) > 0) {
    rows.push(`  养老金账户 ¥${(s.pension ?? 0).toLocaleString()}`);
  }
  return rows.join('\n');
}
