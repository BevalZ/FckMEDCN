import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173/';

test('运气细化影响造假暴露和患者事故概率及严重度', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  const result = await page.evaluate(() => {
    const { ig, patientSafety } = (window as any).__mod;
    const base = { stage: 'career', clinical: 50, stamina: 50, strain: 40, specialtyRisk: 1.2, recordDefense: 65, pandemicActive: false };
    const low = { ...base, luck: 0 };
    const high = { ...base, luck: 5 };
    return {
      fraudLow: ig.integrityExposureProbability(40, 0),
      fraudHigh: ig.integrityExposureProbability(40, 5),
      incidentLow: patientSafety.patientIncidentProbability(low),
      incidentHigh: patientSafety.patientIncidentProbability(high),
      lowSeverity: patientSafety.patientIncidentLevel(low, 0.18),
      highSeverity: patientSafety.patientIncidentLevel(high, 0.18),
      exhausted: patientSafety.patientIncidentProbability({ ...high, stamina: 10, clinical: 20, strain: 90, pandemicActive: true }),
    };
  });
  expect(result.fraudLow).toBeGreaterThan(result.fraudHigh * 2);
  expect(result.incidentLow).toBeGreaterThan(result.incidentHigh + 0.025);
  expect(result.lowSeverity).toBe('major');
  expect(result.highSeverity).not.toBe('major');
  expect(result.exhausted).toBeGreaterThan(result.incidentHigh * 3);
});
