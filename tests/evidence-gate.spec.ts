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
    const missing = en.ENDINGS.flatMap((ending: any) => ending.realDataCard)
      .map((card: any) => card.evidenceId)
      .filter((id: string) => !refs[id]);
    return {
      missing,
      pending: Object.values(refs).filter(ref => ref.status === 'pending').length,
      verified: Object.values(refs).filter(ref => ref.status === 'verified').length,
    };
  });

  expect(audit.missing).toEqual([]);
  expect(audit.pending, '外部事实应保持 pending，等待人工闭环').toBeGreaterThan(0);
  expect(audit.verified, '本局状态派生证据可以展示').toBeGreaterThan(0);

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
  expect(texts.some((text: string) => /来源：国家卫生健康委员会/.test(text))).toBe(false);
});
