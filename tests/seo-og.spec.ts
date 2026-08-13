import { test, expect } from '@playwright/test';

// 薄 SEO / 分享卡片：首页 meta 与 OG 图必须可被爬虫读到。

const BASE = 'http://127.0.0.1:5173/';

test('首页含 description / Open Graph / 分享图', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const meta = await page.evaluate(() => {
    const g = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? '';
    return {
      description: g('meta[name="description"]'),
      ogTitle: g('meta[property="og:title"]'),
      ogDesc: g('meta[property="og:description"]'),
      ogUrl: g('meta[property="og:url"]'),
      ogImage: g('meta[property="og:image"]'),
      twitterCard: g('meta[name="twitter:card"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      title: document.title,
    };
  });
  expect(meta.description.length).toBeGreaterThan(20);
  expect(meta.description).toContain('非医学建议');
  expect(meta.ogTitle).toContain('白大衣');
  expect(meta.ogDesc.length).toBeGreaterThan(10);
  expect(meta.ogUrl).toContain('FckMEDCN');
  expect(meta.ogImage).toContain('og-share.svg');
  expect(meta.twitterCard).toBe('summary_large_image');
  expect(meta.canonical).toContain('FckMEDCN');
  expect(meta.title).toContain('白大衣');

  const img = await page.request.get(`${BASE}og-share.svg`);
  expect(img.ok()).toBe(true);
  const body = await img.text();
  expect(body).toContain('Bai Dayi Sim');
  expect(body).toContain('Clinical Medicine');
});
