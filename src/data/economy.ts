import { getState, updateStats, hasFlag, setFlag } from './gameState';
import type { StatDelta } from './stats';

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
  undergrad: { income: 3000, cost: 3800, entryCost: 4000, label: '本科' },
  internship: { income: 2200, cost: 2600, label: '临床实习' },
  guipei: { income: 4200, cost: 3200, entryCost: 2000, label: '规培' },
  master: { income: 3600, cost: 2800, entryCost: 1500, label: '学硕' },
  phd: { income: 4600, cost: 3000, entryCost: 1500, label: '直博' },
  jobhunt: { income: 0, cost: 3000, label: '求职待业' },
  career: { income: 30000, cost: 16000, entryIncome: 6000, label: '主治医师' },
};

export interface QuarterEconomy {
  income: number;
  cost: number;
  net: number;
  cityPremiumPct: number;
}

// 一线城市（顶尖/强校）生活成本更高：依据就读院校档次加收房租伙食溢价。
export function cityPremiumPct(): number {
  const t = getState().school?.tier;
  if (t === 1) return 0.25;
  if (t === 2) return 0.12;
  return 0;
}

export function getQuarterEconomy(stage: string): QuarterEconomy {
  const spec = STAGE_ECON[stage] ?? { income: 0, cost: 0, label: stage };
  const prem = cityPremiumPct();
  let cost = Math.round(spec.cost * (1 + prem));
  let income = spec.income;
  // —— 人生状态对收支的持续影响 ——
  const st = getState();
  if (st.marital === 'married') income += 1500; // 双职工 / 配偶补贴
  if (st.hasChild) cost += 1200; // 育儿 / 托育
  return { income, cost, net: income - cost, cityPremiumPct: prem };
}

// 每个季度固定结算一次（无论该回合是否有事件触发），保证收支稳定可预期。
export function applyStageEconomy(stage: string): QuarterEconomy {
  const e = getQuarterEconomy(stage);
  if (e.net !== 0) updateStats({ money: e.net } as StatDelta);
  return e;
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
  return { cost, income, net };
}

// 阶段经济简报文案（用于阶段开始时的说明弹窗）。
export function describeStageEconomy(stage: string): string | null {
  const spec = STAGE_ECON[stage];
  if (!spec) return null;
  const e = getQuarterEconomy(stage);
  const lines = [
    `【${spec.label}阶段 · 经济简报】`,
    `每季度固定收入：¥${e.income}`,
    `每季度固定支出：¥${e.cost}` + (e.cityPremiumPct > 0 ? `（含城市溢价 +${Math.round(e.cityPremiumPct * 100)}%）` : ''),
    `每季度净收支：${e.net >= 0 ? '+' : ''}¥${e.net}`,
  ];
  if (spec.entryCost) lines.push(`入学 / 入职一次性支出：¥${spec.entryCost}`);
  if (spec.entryIncome) lines.push(`入职一次性收入：¥${spec.entryIncome}`);
  lines.push('（具体数额会因你的选择而浮动）');
  return lines.join('\n');
}
