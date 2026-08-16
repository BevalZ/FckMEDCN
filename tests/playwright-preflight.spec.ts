import { test, expect } from '@playwright/test';
import { assertFckMedCnHtml } from './globalSetup';

test('Playwright 预检接受本项目并拒绝占用端口的其他页面', () => {
  expect(() => assertFckMedCnHtml(
    '<title>白大衣模拟器 — 临床医学人生模拟</title>',
  )).not.toThrow();

  expect(() => assertFckMedCnHtml('<title>aipocket</title>')).toThrow(
    /返回的不是本项目（检测到标题：aipocket）/,
  );
});
