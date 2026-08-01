import { getState, updateStats, advanceTurn, hasFlag, setFlag } from './gameState';
import { applyChoiceEffect } from './effects';
import { getAvailableEvents, weightedRandom } from './events';
import type { EventCategory, EventChoice, GameEvent } from './events';
import { applyStageEconomy } from './economy';
import type { QuarterEconomy } from './economy';
import { rollIntegrity } from './integrity';
import type { IntegrityOutcome } from './integrity';
import type { StatDelta } from './stats';
import { checkBadges } from './badges';

// 回合流程的共享逻辑。
// BaseStageScene（卡片模式）与 CampusScene（可行走地图）都走这里，
// 保证两种交互层的抽事件 / 提交选择 / 季度结算行为完全一致。

// 稀有事件阈值。低于此权重的事件（如跨阶段的家人离世 w=3~6）是"整个阶段偶尔来一次"
// 的设计意图，而非"某个分类里的常客"。
const RARE_WEIGHT = 20;

// 手写事件的优先概率。
//
// 程序生成的事件（eventGen.ts，约 5000 条）是"日常质感"的填充物：值班、查房、上课。
// 手写事件才是叙事主线：双线取舍、学术造假、人生变故、后果链。
// 但按纯权重抽取时，手写事件只占各阶段池的 4%~12%（实测：硕博仅 4.0%），
// 意味着读完 12 个季度的硕士，平均只能看到半个手写事件——精心写的分支几乎见不到。
//
// 故每次抽取先以此概率在**手写池**内抽，抽不到再回落到全池。
// 这样既保留生成事件的日常质感，又保证叙事主线真的能被玩家看到。
const isGenerated = (e: GameEvent) => e.id.startsWith('gen_');

// 运气影响手写主线事件的出现率：运气越高，越容易遇到精心编排的主线事件。
// 运气 0 → 0.45，运气 5 → 0.75（默认 0.65 对应运气约 3）。
function handPriority(): number {
  const luck = getState().attrs?.luck ?? 3;
  return Math.min(0.8, Math.max(0.4, 0.45 + luck * 0.06));
}

function pickWithPriority(pool: GameEvent[]): GameEvent | null {
  const hand = pool.filter(e => !isGenerated(e));
  if (hand.length > 0 && Math.random() < handPriority()) {
    const picked = weightedRandom(hand);
    if (picked) return picked;
  }
  return weightedRandom(pool);
}

// 按分类集合抽取一个 storylet。categories 省略则不限分类。
// 返回 null 表示当前条件下没有可用事件（调用方应回退到"无事件"分支）。
//
// 关于稀有事件的概率校正：可行走场景按地点做分类切片后，池子会从整阶段的
// 一万多权重骤降到一两百，若直接在切片内加权抽取，w=4 的「母亲走了」会从
// 0.03% 飙到 3%——大一新生第一周就丧母，既荒谬又破坏平衡。
// 故稀有事件一律按**整阶段池**的总权重掷骰，切片只决定它是否在候选集内。
export function drawStorylet(
  stageName: string,
  firedEvents: Set<string>,
  categories?: readonly EventCategory[],
): GameEvent | null {
  const state = getState();
  const full = getAvailableEvents(
    stageName, state.flags,
    state.stats as unknown as Record<string, number>,
    firedEvents, state.turnsInStage, state.marital,
  );
  if (full.length === 0) return null;

  const pool = categories && categories.length > 0
    ? full.filter(ev => categories.includes(ev.category))
    : full;
  if (pool.length === 0) return null;

  // 未做切片时无需稀有度校正：加权抽取本身已是正确概率
  if (pool.length === full.length) return pickWithPriority(pool);

  const fullTotal = full.reduce((s, e) => s + e.weight, 0);
  const rare = pool.filter(e => e.weight <= RARE_WEIGHT);
  const common = pool.filter(e => e.weight > RARE_WEIGHT);

  // 稀有事件：各自按"在整阶段池中的占比"独立掷骰，与切片大小无关
  for (const e of rare) {
    if (Math.random() < e.weight / fullTotal) return e;
  }
  return pickWithPriority(common) ?? pickWithPriority(rare);
}

// 该分类集合下是否存在可用事件。仅做存在性判断，不掷骰、不消耗随机数，
// 供每季度刷新 '!' 标记与每帧的提示文案使用。
export function hasStorylet(
  stageName: string,
  firedEvents: Set<string>,
  categories?: readonly EventCategory[],
): boolean {
  const state = getState();
  const full = getAvailableEvents(
    stageName, state.flags,
    state.stats as unknown as Record<string, number>,
    firedEvents, state.turnsInStage, state.marital,
  );
  if (!categories || categories.length === 0) return full.length > 0;
  return full.some(ev => categories.includes(ev.category));
}

// 提交一个选项的全部副作用：置 flag、执行声明式 effect、结算属性变化。
// 同时评估生涯里程碑（徽章），新达成的进入待展示队列，由 ConsequencePopup 消费。
// 注意：不含 UI 反馈（飘字 / 音效 / 后果弹窗），由调用方负责。
export function commitChoice(choice: EventChoice) {
  if (choice.flagSet) setFlag(choice.flagSet);
  if (choice.effect) applyChoiceEffect(choice.effect);
  updateStats(choice.delta as StatDelta);
  checkBadges();
}

// 推进一个季度：回合数 / 年份季度递增 + 固定收支结算 + 学术诚信判定。
// grieving 表示玩家处于丧亲状态，调用方需额外扣心理并给出提示。
// integrity 为本季的学术风险判定结果，level !== 'none' 时调用方应展示通报。
export function advanceQuarter(stageName: string): {
  econ: QuarterEconomy; grieving: boolean; integrity: IntegrityOutcome;
} {
  advanceTurn();
  const econ = applyStageEconomy(stageName);
  const grieving = hasFlag('grieving');
  if (grieving) updateStats({ sanity: -2 });
  const integrity = rollIntegrity();
  return { econ, grieving, integrity };
}
