import { ALL_EVENTS } from './events';
import { hasFlag } from './gameState';
import type { GameEvent } from './events';

// 论文黑市：秘密地点的隐藏入口（paper_blackmarket 事件）。
// 已转普通班 / 已身败名裂则不再出现，避免"被查了还能继续买"的不合理。

const PAPER_EVENT_ID = 'paper_blackmarket';

/** 秘密地点（secret_lab）是否可触发论文黑市 */
export function canOpenPaperMarket(): boolean {
  return !hasFlag('long_sys_transferred') && !hasFlag('exposed_ruin');
}

/** 返回论文黑市事件；不可用时返回 null */
export function paperMarketEvent(): GameEvent | null {
  if (!canOpenPaperMarket()) return null;
  return ALL_EVENTS.find(e => e.id === PAPER_EVENT_ID) ?? null;
}
