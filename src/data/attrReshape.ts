import type { AttrAlloc } from './gameState';
import { normalizeAttrAlloc } from './gameState';
import { getCollection, getLastAttrs } from './collection';

// 多周目属性部分继承 / 重塑（OPTIMIZATION Round 4）：
// 通关 ≥1 后解锁；R 随机重分配 10 点（每维 0–5）；I 继承上局通关时的 attrs。
// 重塑次数：1 通关 → 1 次；通关≥3 或结局≥3 → 2 次。不改预算、不叠传承，防高周目碾压。

export const ATTR_BUDGET = 10;
export const ATTR_KEYS = ['family', 'academic', 'luck', 'looks'] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];

export interface ReshapeAccess {
  unlocked: boolean;
  maxRerolls: number;
  canInherit: boolean;
}

export function reshapeAccess(): ReshapeAccess {
  const col = getCollection();
  const unlocked = col.runs >= 1;
  if (!unlocked) return { unlocked: false, maxRerolls: 0, canInherit: false };
  const maxRerolls = (col.runs >= 3 || col.endings.size >= 3) ? 2 : 1;
  return { unlocked: true, maxRerolls, canInherit: getLastAttrs() !== null };
}

/** 随机合法分配：四维各 0–5，总和 = ATTR_BUDGET。 */
export function randomAttrAlloc(rng: () => number = Math.random): AttrAlloc {
  for (let i = 0; i < 200; i++) {
    const family = Math.floor(rng() * 6);
    const academic = Math.floor(rng() * 6);
    const luck = Math.floor(rng() * 6);
    const looks = ATTR_BUDGET - family - academic - luck;
    if (looks >= 0 && looks <= 5) {
      return normalizeAttrAlloc({ family, academic, luck, looks });
    }
  }
  // 极端退化：退回默认档
  return normalizeAttrAlloc({ family: 2, academic: 5, luck: 1, looks: 2 });
}

export function attrBudgetUsed(a: AttrAlloc): number {
  return a.family + a.academic + a.luck + a.looks;
}

export function isValidAttrAlloc(a: AttrAlloc): boolean {
  const n = normalizeAttrAlloc(a);
  return attrBudgetUsed(n) === ATTR_BUDGET
    && ATTR_KEYS.every(k => n[k] >= 0 && n[k] <= 5);
}
