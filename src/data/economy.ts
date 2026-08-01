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

// 上学阶段：收入来自父母补贴，随随机家庭条件浮动
const SCHOOL_STAGES = new Set(['undergrad', 'internship', 'guipei', 'master', 'phd']);

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

  // —— 家庭条件：上学期间的父母补贴/生活费随家境浮动 ——
  if (SCHOOL_STAGES.has(stage)) {
    const factor = FAMILY_FACTOR[getState().familyWealth] ?? 1.0;
    income = Math.round(income * factor);
  }

  // —— 助学贷款（属性分配阶段可选）：上学期间 +1500/季 生活费，工作后 -1500/季 还贷 ——
  if (getState().flags.has('student_loan')) {
    if (stage === 'undergrad' || stage === 'internship') income += 1500;
    if (stage === 'career') cost += 1500;
  }

  // —— 职业阶段：底薪 + 职称档差 + 绩效（声望），支出含房贷/育儿 ——
  if (stage === 'career') {
    const s = getState();
    if (s.flags.has('passed_zhenggao')) income += 12000;
    else if (s.flags.has('passed_fugao')) income += 8000;
    else if (s.flags.has('passed_zhuzhi')) income += 5000;
    income += Math.round((s.stats.reputation ?? 0) / 10) * 500; // 绩效随声望
    if (s.flags.has('bought_house')) cost += 2500;              // 房贷月供折算
  }

  // —— 人生状态对收支的持续影响 ——
  const st = getState();
  if (st.marital === 'married') income += 1500; // 双职工 / 配偶补贴
  if (st.hasChild) cost += 1200; // 育儿 / 托育

  return { income, cost, net: income - cost, cityPremiumPct: prem, financeNote: '' };
}

// 每个季度固定结算一次（无论该回合是否有事件触发），并按理财策略分配结余。
export function applyStageEconomy(stage: string): QuarterEconomy {
  const e = getQuarterEconomy(stage);
  const st = getState();
  let net = e.net;
  let financeNote = '';

  if (st.financeStrategy === 'thrifty') {
    // 节流：支出减一成，正结余按年化 2%（每季约 0.5%）计息
    const saved = Math.round(e.cost * 0.1);
    net = e.net + saved;
    if (e.net > 0) net += Math.max(0, Math.round(e.net * 0.005));
    financeNote = `（节流 +${saved}，利息计息）`;
  } else if (st.financeStrategy === 'invest' && e.net !== 0) {
    // 投资：结余 ±15% 随机波动
    const swing = Math.round(e.net * (Math.random() * 0.3 - 0.15));
    net = e.net + swing;
    financeNote = swing >= 0 ? `（投资 +${swing}）` : `（投资 ${swing}）`;
  }

  if (net !== 0) updateStats({ money: net } as StatDelta);
  return { ...e, net, financeNote };
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
  const s = getState();
  const familyLine = SCHOOL_STAGES.has(stage)
    ? `\n家庭条件：${FAMILY_LABEL[s.familyWealth] ?? '家境普通'}（父母每季补贴 ¥${e.income}）`
    : '';
  const lines = [
    `【${spec.label}阶段 · 经济简报】`,
    `每季度固定收入：¥${e.income}`,
    `每季度固定支出：¥${e.cost}` + (e.cityPremiumPct > 0 ? `（含城市溢价 +${Math.round(e.cityPremiumPct * 100)}%）` : ''),
    `每季度净收支：${e.net >= 0 ? '+' : ''}¥${e.net}`,
    `理财策略：${FINANCE_LABEL[s.financeStrategy] ?? '稳健生活'}（R 菜单可调）`,
  ];
  if (familyLine) lines.splice(2, 0, familyLine);
  if (spec.entryCost) lines.push(`入学 / 入职一次性支出：¥${spec.entryCost}`);
  if (spec.entryIncome) lines.push(`入职一次性收入：¥${spec.entryIncome}`);
  lines.push('（具体数额会因你的选择而浮动）');
  return lines.join('\n');
}
