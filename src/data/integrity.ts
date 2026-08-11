import { getState, updateStats, setFlag, hasFlag } from './gameState';

// 学术诚信风险引擎。
//
// 设计要点：
//  1) 造假不是"当场结算"，而是往 stats.fakeRisk 里累加一笔债。
//  2) 每个季度按 fakeRisk 掷一次骰，命中则东窗事发；未命中则风险缓慢衰减
//     （风声过去了），但**不会归零**——只要那篇东西还挂在网上，就永远有被翻出来的可能。
//  3) 因此小造假可能一辈子没事，大造假几乎必爆。同一个玩家两周目的结局可以完全不同。
//
// 现实依据：论文工厂产出的文章常在见刊数年后才被批量撤稿（如 107 篇撤稿事件），
// 举报与期刊预警名单是主要引爆源。故这里的"潜伏期"设计是贴合现实的。

/** 一次造假行为对应的风险增量 */
export const RISK_PER_FAKE = {
  minor: 10,    // 美化一张图、删几个 outlier
  moderate: 18, // 挂名水刊、编一组数据
  severe: 30,   // 整篇代写、伪造原始记录
} as const;

/** 未引爆时每季度的风险衰减（风头过去，但底档还在） */
const DECAY_PER_QUARTER = 1;
/** 风险衰减的下限：只要造过假就不会真正清零，除非主动撤稿 */
const RISK_FLOOR = 3;
/**
 * 引爆概率的缩放：实际概率 = fakeRisk / 100 * SCALE。
 * 该值经蒙特卡洛校准（20000 次 × 60 季）：
 *   一次小造假 → 约 21% 被查；一次重造假 → 约 48%；五次混合 → 约 97%（且多为最重等级）。
 * 目的是让"小造假可能一辈子没事、大造假几乎必爆"成立，保留真实的侥幸心理。
 */
const TRIGGER_SCALE = 0.125;

/** 低运气更容易撞上抽查、举报或批量撤稿；好运只能降低暴露率，不能消除造假风险。 */
export function integrityExposureProbability(fakeRisk: number, luck: number): number {
  const boundedLuck = Math.max(0, Math.min(5, luck));
  const luckMultiplier = 1.5 - boundedLuck * 0.18;
  return Math.max(0, Math.min(0.95, (Math.max(0, fakeRisk) / 100) * TRIGGER_SCALE * luckMultiplier));
}

/** 分级阈值 */
const RUIN_AT = 55;
const RETRACTION_AT = 28;

export type ExposureLevel = 'none' | 'warning' | 'retraction' | 'ruin';

export interface IntegrityOutcome {
  level: ExposureLevel;
  /** 给玩家看的提示文案（none 时为空） */
  message: string;
}

/** 累加造假风险，并打上"造过假"的标记供事件门控使用 */
export function addFakeRisk(kind: keyof typeof RISK_PER_FAKE) {
  updateStats({ fakeRisk: RISK_PER_FAKE[kind] });
  setFlag('has_faked');
  if (kind === 'severe') setFlag('faked_severe');
}

/** 主动撤稿 / 自查说明：显著降低风险，是唯一能把风险压到很低的手段 */
export function selfReport(): number {
  const cur = getState().stats.fakeRisk;
  const cut = Math.round(cur * 0.7);
  updateStats({ fakeRisk: -cut });
  setFlag('self_reported');
  return cut;
}

/**
 * 每季度结算一次学术诚信判定。
 * 返回引爆等级；调用方负责展示提示与后续事件。
 */
export function rollIntegrity(): IntegrityOutcome {
  const risk = getState().stats.fakeRisk;
  if (risk <= 0) return { level: 'none', message: '' };

  const p = integrityExposureProbability(risk, getState().attrs?.luck ?? 0);
  if (Math.random() >= p) {
    // 没事发生：风险缓慢衰减，但保留底档
    const cur = getState().stats.fakeRisk;
    if (cur > RISK_FLOOR) {
      updateStats({ fakeRisk: -Math.min(DECAY_PER_QUARTER, cur - RISK_FLOOR) });
    }
    return { level: 'none', message: '' };
  }

  // 东窗事发：按当前风险高低决定严重程度
  if (risk >= RUIN_AT) {
    setFlag('exposed_ruin');
    updateStats({ reputation: -30, papers: -3, sanity: -25, fakeRisk: -45, money: -20000 });
    return {
      level: 'ruin',
      message: '学术不端调查通报：撤销学位/职称，多篇论文集中撤稿。你的名字出现在了通报正文里。',
    };
  }
  if (risk >= RETRACTION_AT) {
    setFlag('exposed_retraction');
    updateStats({ reputation: -15, papers: -2, sanity: -15, fakeRisk: -22 });
    return {
      level: 'retraction',
      message: '期刊撤稿通知：你的一篇论文因数据问题被撤回，单位已启动核查。',
    };
  }
  // 仅被质疑：**不削减风险**——问题本身没有解决，只是这次没查实。
  // 若在此削减，玩家会靠"被警告一次"洗白，重度后果永远触发不到。
  if (hasFlag('exposed_warning')) return { level: 'none', message: '' };
  setFlag('exposed_warning');
  updateStats({ sanity: -8, reputation: -3 });
  return {
    level: 'warning',
    message: '有人在学术论坛匿名质疑你那篇论文的图。帖子很快沉了，但你睡不着了。',
  };
}

/** 是否处于"造过假但还没被查"的状态——供侥幸心理类事件门控 */
export function isUnexposed(): boolean {
  return hasFlag('has_faked')
    && !hasFlag('exposed_retraction')
    && !hasFlag('exposed_ruin');
}
