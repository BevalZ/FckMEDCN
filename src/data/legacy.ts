import { getCollection, buyPerk } from './collection';
import { applyDelta } from './stats';
import type { Stats, StatDelta } from './stats';

// 多周目传承：用传承点购买永久开局加成。
// 设计意图是"克制式继承"——单次通关 1 点 + 每 5 个徽章 1 点，
// 每点只买一个 +10 左右的初始属性；临床/科研这类能影响结局的轴定 2 点。
// 不继承金钱以外的硬资源、不继承 flag/事件，避免高周目碾压难度曲线。

export interface LegacyPerk {
  id: string;
  title: string;
  desc: string;
  cost: number;
  delta: StatDelta;
}

export const LEGACY_PERKS: LegacyPerk[] = [
  { id: 'legacy_knowledge', title: '家学渊源', desc: '开局知识 +12。家里书多，耳濡目染。', cost: 1, delta: { knowledge: 12 } },
  { id: 'legacy_money', title: '家族资助', desc: '开局存款 +10,000。第一笔启动金。', cost: 1, delta: { money: 10000 } },
  { id: 'legacy_sanity', title: '心态从容', desc: '开局心理 +12。更扛得住夜班与纠纷。', cost: 1, delta: { sanity: 12 } },
  { id: 'legacy_reputation', title: '名校光环', desc: '开局声望 +10。长辈嘴里的"别人家孩子"。', cost: 1, delta: { reputation: 10 } },
  { id: 'legacy_stamina', title: '强健体魄', desc: '开局体力 +10。熬大夜的底气。', cost: 1, delta: { stamina: 10 } },
  { id: 'legacy_relations', title: '处世圆融', desc: '开局人际 +10。师兄师姐更愿意带你。', cost: 1, delta: { relations: 10 } },
  { id: 'legacy_clinical', title: '老练手感', desc: '开局临床 +6。上手就是熟手。', cost: 2, delta: { clinical: 6 } },
  { id: 'legacy_research', title: '文献功底', desc: '开局科研 +6。读得懂别人的文章。', cost: 2, delta: { research: 6 } },
];

// 把已购买的传承一次性叠加到初始属性上（经 applyDelta 走 clamp，安全）。
export function applyLegacyPerks(stats: Stats): Stats {
  const purchased = new Set(getCollection().purchased);
  let out = stats;
  for (const p of LEGACY_PERKS) {
    if (purchased.has(p.id)) out = applyDelta(out, p.delta);
  }
  return out;
}

export function tryBuyPerk(id: string): boolean {
  const perk = LEGACY_PERKS.find(p => p.id === id);
  if (!perk) return false;
  return buyPerk(id, perk.cost);
}
