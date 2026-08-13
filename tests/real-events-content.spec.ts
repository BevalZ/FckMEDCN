import { test, expect } from '@playwright/test';

import { REAL_EVENTS_AS_CARDS } from '../src/data/realEvents';

test('叙事情境灵感卡不携带未经证据门禁的现实事实说明', () => {
  const serialized = JSON.stringify(REAL_EVENTS_AS_CARDS);

  expect(serialized).not.toContain('realContext');
  expect(serialized).not.toMatch(/真实事件|真实背景|现实中|公开报道|据真实数据校准/);
  expect(REAL_EVENTS_AS_CARDS.every(card => card.inspiredContext.length > 0)).toBe(true);
});
