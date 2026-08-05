import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173/';
const IDS = [
  'med_reconciliation', 'med_indication_review', 'med_indication_review_assisted',
  'med_adverse_effect_escalation', 'med_discharge_teachback',
  'med_reconciliation_echo', 'med_indication_echo', 'med_adverse_effect_echo',
  'med_teachback_echo', 'med_teachback_rushed_echo',
];

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M10 用药安全链：核对→复核→升级→出院沟通，高低知识路径均可达', async ({ page }) => {
  await boot(page);
  const report = await page.evaluate((ids) => {
    const { ev, tf, gs, stats: statModule } = (window as any).__mod;
    const all = new Map(ev.ALL_EVENTS.map((event: any) => [event.id, event]));
    const base = statModule.createDefaultStats();
    const pool = (stage: string, flags: string[], stats: any, turn: number) =>
      ev.getAvailableEvents(stage, new Set(flags), stats, new Set(), turn, 'single').map((event: any) => event.id);
    const reconciliation = all.get('med_reconciliation');

    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 55, clinical: 50 } });
    tf.commitChoice(reconciliation.choices[0], reconciliation);
    const highReview = pool('internship', [...gs.getState().flags], { ...gs.getState().stats }, 3);
    const reviewed = all.get('med_indication_review');
    tf.commitChoice(reviewed.choices[0], reviewed);
    const escalated = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 1);
    const adverse = all.get('med_adverse_effect_escalation');
    tf.commitChoice(adverse.choices[0], adverse);
    const discharge = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 2);
    tf.commitChoice(all.get('med_discharge_teachback').choices[0], all.get('med_discharge_teachback'));
    const positiveEcho = pool('career', [...gs.getState().flags], { ...gs.getState().stats }, 2);

    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 25, clinical: 10 } });
    tf.commitChoice(reconciliation.choices[0], reconciliation);
    const assistedReview = pool('internship', [...gs.getState().flags], { ...gs.getState().stats }, 3);

    const branches = {
      reconciliationFlags: reconciliation.choices.map((choice: any) => choice.flagSet),
      reviewFlags: reviewed.choices.map((choice: any) => choice.flagSet),
      adverseFlags: adverse.choices.map((choice: any) => choice.flagSet),
      teachbackFlags: all.get('med_discharge_teachback').choices.map((choice: any) => choice.flagSet),
      highReview: highReview.includes('med_indication_review'),
      assistedReview: assistedReview.includes('med_indication_review_assisted'),
      escalated: escalated.includes('med_adverse_effect_escalation'),
      discharge: discharge.includes('med_discharge_teachback'),
      positiveEcho: positiveEcho.includes('med_teachback_echo'),
      skippedEcho: pool('guipei', ['med_reconciliation_incomplete'], { ...base }, 1).includes('med_reconciliation_echo'),
      rushedEcho: pool('guipei', ['med_indication_unreviewed'], { ...base }, 1).includes('med_indication_echo'),
      minimizedEcho: pool('career', ['med_safety_minimized'], { ...base }, 2).includes('med_adverse_effect_echo'),
      teachbackEcho: pool('career', ['med_teachback_rushed'], { ...base }, 2).includes('med_teachback_rushed_echo'),
    };
    return { idsPresent: ids.every((id: string) => all.has(id)), branches };
  }, IDS);

  expect(report.idsPresent).toBe(true);
  expect(report.branches.reconciliationFlags).toEqual(['med_reconciliation_complete', 'med_reconciliation_incomplete']);
  expect(report.branches.reviewFlags).toEqual(['med_indication_reviewed', 'med_indication_unreviewed']);
  expect(report.branches.adverseFlags).toEqual(['med_safety_escalated', 'med_safety_minimized']);
  expect(report.branches.teachbackFlags).toEqual(['med_teachback_done', 'med_teachback_rushed']);
  expect(report.branches.highReview).toBe(true);
  expect(report.branches.assistedReview).toBe(true);
  expect(report.branches.escalated).toBe(true);
  expect(report.branches.discharge).toBe(true);
  expect(report.branches.positiveEcho).toBe(true);
  expect(report.branches.skippedEcho).toBe(true);
  expect(report.branches.rushedEcho).toBe(true);
  expect(report.branches.minimizedEcho).toBe(true);
  expect(report.branches.teachbackEcho).toBe(true);
});

test('M10 用药事件均有事实审计记录且不写剂量或处方化措辞', async ({ page }) => {
  await boot(page);
  const audit = fs.readFileSync(path.resolve(process.cwd(), 'docs/MEDICAL-FACT-AUDIT.md'), 'utf8');
  const events = await page.evaluate((ids) => {
    const { ev } = (window as any).__mod;
    return ids.map((id: string) => ev.ALL_EVENTS.find((event: any) => event.id === id));
  }, IDS);
  for (const id of IDS) expect(audit, `${id} 必须在医学事实清单中登记`).toContain(id);
  const text = events.map((event: any) => [event.title, event.body, ...event.choices.map((choice: any) => choice.text)].join(' ')).join(' ');
  expect(text, '用药安全链不应出现剂量或处方化表述').not.toMatch(/\b\d+\s*(mg|毫克|片\/日|次\/日)\b/i);
  expect(text).not.toMatch(/每[日天]服用|自行加减|自行停药|开具处方/);
});
