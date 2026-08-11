import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test('结局事实卡全部引用注册证据，外部 pending 声明不会进入 UI', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod?.evidence, null, { timeout: 60000 });

  const disclaimer = await page.locator('#title-disclaimer').textContent();
  expect(disclaimer).toContain('趋势推演');
  expect(disclaimer).toContain('不构成现实事实');

  const audit = await page.evaluate(() => {
    const { en, evidence } = (window as any).__mod;
    const refs = evidence.EVIDENCE_REFS as Record<string, { status: string; organization: string }>;
    const usedIds = en.ENDINGS.flatMap((ending: any) => ending.realDataCard)
      .map((card: any) => card.evidenceId as string);
    const missing = usedIds
      .filter((id: string) => !refs[id]);
    return {
      missing,
      unused: Object.keys(refs).filter(id => !usedIds.includes(id)),
      pending: Object.values(refs).filter(ref => ref.status === 'pending').length,
      verified: Object.values(refs).filter(ref => ref.status === 'verified').length,
      hotlineCards: en.ENDINGS.flatMap((ending: any) => ending.realDataCard)
        .filter((card: any) => card.evidenceId === '国家卫健委')
        .map((card: any) => card.value),
    };
  });

  expect(audit.missing).toEqual([]);
  expect(audit.unused, '证据注册表不应保留无事实卡引用的死记录').toEqual([]);
  expect(audit.pending, '外部事实应保持 pending，等待人工闭环').toBeGreaterThan(0);
  expect(audit.verified, '本局状态派生证据可以展示').toBeGreaterThan(0);
  expect(audit.hotlineCards).toEqual([
    '全国统一号码：12356',
    '全国统一号码：12356',
    '全国统一号码：12356',
  ]);

  await page.evaluate(() => {
    (window as any).game.scene.start('EndingScene', { endingId: 'quit_guipei' });
  });
  await page.waitForFunction(
    () => ((window as any).game?.scene?.getScenes(true) ?? []).some((scene: any) => scene.sys.settings.key === 'EndingScene'),
    null,
    { timeout: 30000 },
  );
  const texts = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScene('EndingScene');
    return scene.children.list.filter((item: any) => item.type === 'Text').map((item: any) => item.text as string);
  });
  expect(texts.some((text: string) => text.includes('400-161-9995'))).toBe(false);
  expect(texts.some((text: string) => text.includes('12356'))).toBe(false);
  expect(texts.some((text: string) => /来源：国家卫生健康委员会/.test(text))).toBe(false);
});
