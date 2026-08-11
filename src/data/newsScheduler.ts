import type { LifeStage } from './gameState';
import { NEWS_TICKER } from './news';
import type { NewsTickerItem, NewsType } from './news';

const LATE_LIFE_STAGES = new Set<LifeStage>(['pinnacle', 'retirement', 'eternity']);

const LATE_LIFE_ECHOES: ReadonlyArray<{ id: string; headline: string; type: NewsType }> = [
  { id: 'late_echo_patient', headline: '个人回声：一位旧患者托人捎来近况，说仍记得当年的那次解释。', type: 'event' },
  { id: 'late_echo_student', headline: '学生回声：曾经带过的年轻医生开始独立值班，也学会把风险讲清楚。', type: 'event' },
  { id: 'late_echo_family', headline: '家庭回声：家人翻出一张旧合影，谈起那些被值班表错过的节日。', type: 'irony' },
];

export interface NewsScheduleInput {
  stage: LifeStage;
  year: number;
  quarter: number;
  firedIds: ReadonlySet<string>;
}

/**
 * Returns public news for active training/career stages and personal echoes for late life.
 * Public items may fall back within the same year, but are never replayed as invented late-life news.
 */
export function scheduleNewsForQuarter(input: NewsScheduleInput): NewsTickerItem[] {
  const { stage, year, quarter, firedIds } = input;
  if (LATE_LIFE_STAGES.has(stage)) {
    const echo = LATE_LIFE_ECHOES.find(item => !firedIds.has(item.id));
    return echo ? [{ ...echo, year, quarter }] : [];
  }

  let pool = NEWS_TICKER.filter(item =>
    !firedIds.has(item.id) && item.year === year && item.quarter === quarter);
  if (pool.length === 0) {
    pool = NEWS_TICKER.filter(item => !firedIds.has(item.id) && item.year === year);
  }
  if (pool.length > 0) return pool;

  const unfired = NEWS_TICKER.filter(item => !firedIds.has(item.id));
  if (unfired.length === 0) return [];
  const latestAvailableYear = unfired.reduce((latest, item) => Math.max(latest, item.year), 0);
  return latestAvailableYear <= year + 1
    ? unfired.filter(item => item.year === latestAvailableYear)
    : [];
}
