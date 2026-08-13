import { getState } from '../data/gameState';
import { childQuarterCost, houseMonthly } from '../data/economy';

/** 结构化季度账单文案（卡片场景与行走场景共用）。 */
export function formatQuarterBill(e: {
  income: number;
  cost: number;
  net: number;
  financeNote?: string;
}): string | null {
  if (e.income === 0 && e.cost === 0) return null;
  const s = getState();
  const rows: string[] = [];
  rows.push(`季度结算 ▸ 收入 ¥${e.income.toLocaleString()}`);
  if (s.flags.has('bought_house')) {
    rows.push(`  其中 房贷 ¥-${houseMonthly().toLocaleString()}`);
  }
  if (s.hasChild) rows.push(`  其中 育儿 ¥-${childQuarterCost().toLocaleString()}`);
  rows.push(`  支出 ¥${e.cost.toLocaleString()} = 净 ${e.net >= 0 ? '+' : ''}¥${e.net.toLocaleString()}`);
  if ((s.assets ?? 0) > 0 || (e.financeNote && e.financeNote.length > 0)) {
    rows.push(`  资产 ¥${(s.assets ?? 0).toLocaleString()}${e.financeNote ?? ''}`);
  }
  return rows.join('\n');
}
