import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173/';
const IDS = [
  'clinical_schedule_handoff', 'clinical_rounds_hierarchy', 'clinical_rounds_assisted',
  'clinical_progress_note', 'clinical_consult_request', 'clinical_schedule_echo',
  'clinical_rounds_echo', 'clinical_note_echo', 'clinical_consult_echo', 'clinical_consult_vague_echo',
];

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
}

test('M10 临床工作流链：轮转交接→分级查房→病程记录→会诊，高低知识路径均可达', async ({ page }) => {
  await boot(page);
  const report = await page.evaluate((ids) => {
    const { ev, tf, gs, stats: statModule } = (window as any).__mod;
    const all = new Map<string, any>(ev.ALL_EVENTS.map((event: any) => [event.id, event]));
    const base = statModule.createDefaultStats();
    const pool = (stage: string, flags: string[], stats: any, turn: number) =>
      ev.getAvailableEvents(stage, new Set(flags), stats, new Set(), turn, 'single').map((event: any) => event.id);
    const schedule = all.get('clinical_schedule_handoff');

    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 55, clinical: 50 } });
    tf.commitChoice(schedule.choices[0], schedule);
    const highRounds = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 1);
    const rounds = all.get('clinical_rounds_hierarchy');
    tf.commitChoice(rounds.choices[0], rounds);
    const notePool = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 2);
    const note = all.get('clinical_progress_note');
    tf.commitChoice(note.choices[0], note);
    const consultPool = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 3);
    const consult = all.get('clinical_consult_request');
    tf.commitChoice(consult.choices[0], consult);
    const positiveEcho = pool('career', [...gs.getState().flags], { ...gs.getState().stats }, 2);

    gs.resetGame();
    gs.patchState({ stage: 'internship', turnsInStage: 2, stats: { ...base, knowledge: 25, clinical: 10 } });
    tf.commitChoice(schedule.choices[0], schedule);
    const assistedRounds = pool('guipei', [...gs.getState().flags], { ...gs.getState().stats }, 1);

    const branches = {
      scheduleFlags: schedule.choices.map((choice: any) => choice.flagSet),
      roundsFlags: rounds.choices.map((choice: any) => choice.flagSet),
      noteFlags: note.choices.map((choice: any) => choice.flagSet),
      consultFlags: consult.choices.map((choice: any) => choice.flagSet),
      highRounds: highRounds.includes('clinical_rounds_hierarchy'),
      assistedRounds: assistedRounds.includes('clinical_rounds_assisted'),
      note: notePool.includes('clinical_progress_note'),
      consult: consultPool.includes('clinical_consult_request'),
      positiveEcho: positiveEcho.includes('clinical_consult_echo'),
      scheduleEcho: pool('guipei', ['workflow_schedule_unclear'], { ...base }, 1).includes('clinical_schedule_echo'),
      roundsEcho: pool('career', ['workflow_rounds_rushed'], { ...base }, 2).includes('clinical_rounds_echo'),
      noteEcho: pool('career', ['workflow_note_copied'], { ...base }, 2).includes('clinical_note_echo'),
      vagueEcho: pool('career', ['workflow_consult_vague'], { ...base }, 2).includes('clinical_consult_vague_echo'),
    };
    return { idsPresent: ids.every((id: string) => all.has(id)), branches };
  }, IDS);

  expect(report.idsPresent).toBe(true);
  expect(report.branches.scheduleFlags).toEqual(['workflow_schedule_clarified', 'workflow_schedule_unclear']);
  expect(report.branches.roundsFlags).toEqual(['workflow_rounds_completed', 'workflow_rounds_rushed']);
  expect(report.branches.noteFlags).toEqual(['workflow_note_structured', 'workflow_note_copied']);
  expect(report.branches.consultFlags).toEqual(['workflow_consult_clear', 'workflow_consult_vague']);
  expect(report.branches.highRounds).toBe(true);
  expect(report.branches.assistedRounds).toBe(true);
  expect(report.branches.note).toBe(true);
  expect(report.branches.consult).toBe(true);
  expect(report.branches.positiveEcho).toBe(true);
  expect(report.branches.scheduleEcho).toBe(true);
  expect(report.branches.roundsEcho).toBe(true);
  expect(report.branches.noteEcho).toBe(true);
  expect(report.branches.vagueEcho).toBe(true);
});

test('M10 临床工作流事件均有事实审计记录且不写处方剂量', async ({ page }) => {
  await boot(page);
  const audit = fs.readFileSync(path.resolve(process.cwd(), 'docs/MEDICAL-FACT-AUDIT.md'), 'utf8');
  const events = await page.evaluate((ids) => {
    const { ev } = (window as any).__mod;
    return ids.map((id: string) => ev.ALL_EVENTS.find((event: any) => event.id === id));
  }, IDS);
  for (const id of IDS) expect(audit, `${id} 必须在医学事实清单中登记`).toContain(id);
  const text = events.map((event: any) => [event.title, event.body, ...event.choices.map((choice: any) => choice.text)].join(' ')).join(' ');
  expect(text, '临床工作流链不应出现剂量或处方化表述').not.toMatch(/\b\d+\s*(mg|毫克|片\/日|次\/日)\b/i);
  expect(text).not.toMatch(/自行加减|自行停药|开具处方|具体剂量/);
});
