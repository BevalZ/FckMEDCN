import { STATS } from './constants';
import type { StatKey } from './constants';

export interface Stats {
  stamina: number; knowledge: number; money: number; sanity: number;
  relations: number; reputation: number; papers: number; age: number;
  // —— 临床 / 科研双线（M3）——
  // 二者共享同一份时间与精力：多数事件会一升一降，形成真实的取舍。
  // 也存在互促（临床积累让临床研究更容易出成果，反之亦然），见 events_dualtrack.ts。
  clinical: number;   // 临床力：管病人、操作、应变
  research: number;   // 科研力：设计、实验、写作、基金
  // 学术诚信风险：每次造假累加，每季度按此值掷骰判定是否东窗事发。见 integrity.ts。
  fakeRisk: number;
}

export type StatDelta = Partial<Stats>;

export function createDefaultStats(): Stats {
  return {
    stamina: 80, knowledge: 30, money: 5000, sanity: 85,
    relations: 50, reputation: 10, papers: 0, age: 18,
    clinical: 5, research: 5, fakeRisk: 0,
  };
}

export function clampStat(key: StatKey, value: number): number {
  if (key === STATS.MONEY || key === STATS.PAPERS || key === STATS.AGE) return value;
  return Math.max(0, Math.min(100, value));
}

export function applyDelta(stats: Stats, delta: StatDelta): Stats {
  const next = { ...stats };
  for (const k of Object.keys(delta) as StatKey[]) {
    const val = delta[k];
    if (val !== undefined) {
      const cur = (next as Record<string, number>)[k] ?? 0; // 旧存档可能缺少新增轴
      (next as Record<string, number>)[k] = clampStat(k, cur + val);
    }
  }
  return next;
}

// 旧存档补齐：新增的数值轴在老档里不存在，直接参与运算会变成 NaN。
export function migrateStats(raw: Partial<Stats> | undefined): Stats {
  const base = createDefaultStats();
  if (!raw) return base;
  const out = { ...base, ...raw } as Record<string, number>;
  for (const k of Object.keys(base) as Array<keyof Stats>) {
    if (typeof out[k] !== 'number' || Number.isNaN(out[k])) out[k] = base[k];
  }
  return out as unknown as Stats;
}
