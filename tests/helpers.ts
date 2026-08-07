import type { Page } from '@playwright/test';

export async function advanceByEnterUntilScene(
  page: Page,
  sceneKey: string,
  maxPresses = 24,
  delayMs = 700,
) {
  for (let i = 0; i < maxPresses; i++) {
    const reached = await page.evaluate((key) =>
      ((window as any).game?.scene?.getScenes(true) ?? [])
        .some((s: any) => s.sys.settings.key === key),
    sceneKey);
    if (reached) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(delayMs);
  }
  await page.waitForFunction(
    (key) => ((window as any).game?.scene?.getScenes(true) ?? [])
      .some((s: any) => s.sys.settings.key === key),
    sceneKey,
    { timeout: 30000 },
  );
}
