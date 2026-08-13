import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateReleaseManifests } from './release-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shouldWrite = process.argv.includes('--write');
const workpackPath = path.join(root, 'sources', 'review-workpacks', 'release-review-workpack.md');
const lines = [];
const emit = line => lines.push(line);
const generatedAt = new Date().toISOString();
const gitCommit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();
const manifestVersions = manifestMap => Object.entries(manifestMap)
  .map(([name, manifest]) => `${name} v${manifest?.schemaVersion ?? 'unknown'}`)
  .join('; ');
const { failures, manifests } = validateReleaseManifests(root);

if (failures.length > 0) {
  console.error('Release review workpack unavailable because manifest schema is invalid:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  const medical = manifests.medical.records;
  const evidence = Object.entries(manifests.evidence.entries)
    .map(([id, record]) => ({ id, ...record }));
  const acceptance = manifests.acceptance.checks;

  const suggestedRoleFor = category => category === 'medication'
    ? 'clinical-pharmacist'
    : 'licensed-clinician';
  const assignedRoleFor = record => record.reviewerRole || 'unassigned';
  const cell = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
  const isDirectHttpUrl = value => {
    try {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:')
        && url.pathname !== '/'
        && url.pathname !== '';
    } catch {
      return false;
    }
  };
  const missingEvidence = record => [
    !record.publishedAt && 'publishedAt',
    !isDirectHttpUrl(record.url) && 'direct URL',
    !record.accessedAt && 'accessedAt',
    !record.reviewedBy && 'reviewedBy',
    !record.reviewedAt && 'reviewedAt',
    !record.notes && 'notes',
  ].filter(Boolean).join(', ') || 'none';
  const acceptanceChecklist = {
    'new-game': { steps: 'Launch production build, start a new game, allocate attrs, enter first playable scene.', pass: 'No crash; state initializes from defaults; first scene is interactable.', evidence: 'Record device/browser, route notes, screenshot if layout is suspect.' },
    'continue-save': { steps: 'Create or load an existing save, reload browser, continue from title.', pass: 'Save loads without unsafe migration; age/year/stage and key flags remain coherent.', evidence: 'Record save origin/version and resumed stage.' },
    'clinical-route': { steps: 'Play a full clinical-oriented lifecycle through job/career into a final ending.', pass: 'Clinical route reaches a route-appropriate ending; no early dropout/quit ending after full practice.', evidence: 'Record route choices, final stage, ending id, age/year.' },
    'research-route': { steps: 'Play a research-oriented lifecycle through master/PhD/career into a final ending.', pass: 'Research route reaches a route-appropriate ending; papers/reputation effects are visible.', evidence: 'Record route choices, final stage, ending id, age/year/papers.' },
    'exit-route': { steps: 'Choose a supported exit path such as leaving undergrad or quitting guipei.', pass: 'Route terminates immediately at the matching exit ending and does not continue later seasons.', evidence: 'Record exit choice, ending id, age/year.' },
    'late-life-route': { steps: 'Reach pinnacle/retirement/eternity phases and play through late-life decisions.', pass: 'Late-life personal echoes appear; age/year/quarter remain coherent; final ending matches legacy/health state.', evidence: 'Record late-life phases visited, ending id, age/year.' },
    'restart-save': { steps: 'From a populated save, start over and then reload once.', pass: 'New run resets prior flags/resources and persists its own fresh state.', evidence: 'Record old/new stage and any reset anomalies.' },
    'console-clean': { steps: 'Open production build with DevTools console while exercising the target scenarios.', pass: 'No uncaught errors, failed asset loads, or persistent console error spam.', evidence: 'Record console status; paste exact errors if any.' },
    portrait: { steps: 'Open on the target phone in portrait and navigate title, HUD, event cards, endings.', pass: 'No clipped primary controls; text remains readable; scrolling/taps work.', evidence: 'Record device model, OS/browser version, screenshots for issues.' },
    landscape: { steps: 'Rotate to landscape and repeat title, HUD, event cards, endings.', pass: 'Layout adapts without hidden controls or unusable hit targets.', evidence: 'Record rotation behavior and screenshots for issues.' },
    'safe-area': { steps: 'Check notch/home-indicator/status-bar areas on title, gameplay, modal/card, ending.', pass: 'Interactive UI stays outside unsafe areas or remains comfortably tappable.', evidence: 'Record affected screens and screenshots if unsafe.' },
    'touch-minigames': { steps: 'Play touch-driven minigames and dismiss overlays using only touch.', pass: 'Gestures register reliably; no keyboard-only blocker; ESC alternatives exist where needed.', evidence: 'Record minigames tried and any missed taps.' },
    'long-session': { steps: 'Play continuously with multiple scene transitions, save/load, and orientation changes.', pass: 'No memory/performance degradation, stuck overlay, or lost input after long operation.', evidence: 'Record duration, transitions, and final state.' },
    'audio-unlock': { steps: 'Start from a fresh browser session, perform first user gesture, trigger sound.', pass: 'Audio starts only after user gesture and does not throw browser autoplay errors.', evidence: 'Record gesture used, sound status, console status.' },
  };
  const checklistFor = scenario => acceptanceChecklist[scenario.id] ?? {
    steps: 'Execute the scenario named by the manifest.',
    pass: 'Scenario behavior matches the label with no production console errors.',
    evidence: 'Record concrete steps, result, and environment.',
  };
  const parseEndingEvidenceUsage = () => {
    const endingsPath = path.join(root, 'src', 'data', 'endings.ts');
    if (!fs.existsSync(endingsPath)) return new Map();
    const source = fs.readFileSync(endingsPath, 'utf8');
    const usage = new Map();
    const endingBlocks = source.match(/\{\s*id:\s*'[^']+'[\s\S]*?realDataCard:\s*\[[\s\S]*?\]\s*,?\s*\}/gu) ?? [];
    for (const block of endingBlocks) {
      const endingId = block.match(/id:\s*'([^']+)'/u)?.[1] ?? 'unknown-ending';
      const cardBlock = block.match(/realDataCard:\s*\[([\s\S]*?)\]\s*,?\s*\}/u)?.[1] ?? '';
      const cards = cardBlock.match(/\{[^{}]*\}/gu) ?? [];
      for (const card of cards) {
        const evidenceId = card.match(/evidenceId:\s*'([^']+)'/u)?.[1];
        if (!evidenceId) continue;
        const label = card.match(/label:\s*'([^']*)'/u)?.[1] ?? '';
        const value = card.match(/value:\s*'([^']*)'/u)?.[1] ?? '';
        if (!usage.has(evidenceId)) usage.set(evidenceId, []);
        usage.get(evidenceId).push({ endingId, label, value });
      }
    }
    return usage;
  };
  const evidenceUsage = parseEndingEvidenceUsage();
  const externalEvidence = evidence.filter(record => record.scope === 'external');
  const outstandingExternal = externalEvidence.filter(record => record.status !== 'verified');
  const sourceComplete = outstandingExternal.filter(record => (
    record.status !== 'verified'
    && record.publishedAt
    && record.accessedAt
    && isDirectHttpUrl(record.url)
  ));

  emit('# Release review workpack');
  emit('');
  emit(`Generated at: ${generatedAt}`);
  emit(`Source HEAD at generation: ${gitCommit}`);
  emit(`Manifest schema versions: ${manifestVersions(manifests)}`);
  emit('');
  emit('Generated from the four release manifests. This report is a queue, not an approval record. Do not change `pending` to `verified` without the named reviewer, date, evidence reference, and written conclusion.');
  emit('');
  emit(`- Medical records: ${medical.length} total; ${medical.filter(record => record.status !== 'verified').length} outstanding`);
  emit(`- External evidence: ${externalEvidence.length} total; ${outstandingExternal.length} outstanding (${sourceComplete.length} source-complete awaiting reviewer, ${outstandingExternal.length - sourceComplete.length} source-incomplete)`);
  emit(`- Manual acceptance checks: ${acceptance.length} total; ${acceptance.filter(record => record.status !== 'verified').length} outstanding`);
  emit('');

  emit('## 1. Medical and pharmacy review queue');
  emit('');
  const outstandingMedical = medical.filter(record => record.status !== 'verified');
  const suggestedClinician = outstandingMedical.filter(record => suggestedRoleFor(record.category) === 'licensed-clinician').length;
  const suggestedPharmacist = outstandingMedical.filter(record => suggestedRoleFor(record.category) === 'clinical-pharmacist').length;
  const flowCheckedMedical = outstandingMedical.filter(record => record.preReviewStatus === 'flow_checked').length;
  const notStartedMedical = outstandingMedical.filter(record => record.preReviewStatus === 'not_started').length;
  const missingMedicalEvidence = outstandingMedical.filter(record => !Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0).length;
  const medicalGroups = [
    ['unassigned', 'Unassigned medical/pharmacy reviews'],
    ['licensed-clinician', 'Assigned licensed-clinician reviews'],
    ['clinical-pharmacist', 'Assigned clinical-pharmacist reviews'],
  ];
  const groupCounts = medicalGroups
    .map(([role, label]) => `${label}: ${outstandingMedical.filter(record => assignedRoleFor(record) === role).length}`)
    .join('; ');
  emit(`Medical queue by reviewerRole: ${groupCounts}`);
  emit('');
  emit(`Suggested reviewer split: licensed-clinician ${suggestedClinician}; clinical-pharmacist ${suggestedPharmacist}`);
  emit(`Pre-review split: flow_checked ${flowCheckedMedical}; not_started ${notStartedMedical}`);
  emit(`Medical records missing evidenceRefs: ${missingMedicalEvidence}`);
  emit('');
  emit('Rows with reviewerRole `unassigned` must be assigned to a real reviewer before they can be marked verified. The suggested role is derived from category only and is not an approval.');
  emit('');
  for (const [role, label] of medicalGroups) {
    const rows = outstandingMedical.filter(record => assignedRoleFor(record) === role);
    emit(`### ${label}`);
    emit('');
    emit('| id | suggested reviewer | category | label | review focus | pre-review | status | evidenceRefs |');
    emit('|---|---|---|---|---|---|---|---|');
    if (rows.length === 0) {
      emit('| — | — | — | — | — | — | — | — |');
    } else {
      for (const record of rows) {
        emit(`| ${cell(record.id)} | ${suggestedRoleFor(record.category)} | ${cell(record.category)} | ${cell(record.label)} | ${cell(record.focus)} | ${cell(record.preReviewStatus)} | ${cell(record.status)} | ${cell(record.evidenceRefs.join(', ') || '—')} |`);
      }
    }
    emit('');
  }
  emit('Required medical completion fields: `status: verified`, `reviewerRole`, named reviewer in `reviewedBy`, ISO date in `reviewedAt`, at least one `evidenceRefs` entry, and a concise `notes` conclusion. Medication records require `clinical-pharmacist`; other records require a licensed clinician.');
  emit('');
  emit('## 2. External evidence queue');
  emit('');
  emit('| id | title | organization | status | used by ending cards | missing / weak fields | current URL |');
  emit('|---|---|---|---|---|---|---|');
  for (const record of externalEvidence) {
    const usages = evidenceUsage.get(record.id) ?? [];
    const usageText = usages.length > 0
      ? usages.map(usage => `${usage.endingId}: ${usage.label} = ${usage.value}`).join('; ')
      : '—';
    emit(`| ${cell(record.id)} | ${cell(record.title)} | ${cell(record.organization)} | ${cell(record.status)} | ${cell(usageText)} | ${cell(missingEvidence(record))} | ${cell(record.url || '—')} |`);
  }
  emit('');
  emit('External evidence is releasable only when the publication is traceable, the URL points to the specific source rather than a portal homepage, and publication/access/reviewer fields are complete. A reviewer must also record an ISO review date and a concise conclusion that the source supports the exact card wording listed in `used by ending cards`.');
  emit('');

  emit('## 3. Manual acceptance queue');
  emit('');
  emit('| id | label | status | scenario progress | environment |');
  emit('|---|---|---|---|---|');
  for (const record of acceptance) {
    const scenarios = Array.isArray(record.scenarios) ? record.scenarios : [];
    const passed = scenarios.filter(scenario => scenario.status === 'verified').length;
    const environment = record.environment
      ? [record.environment.device, record.environment.os, record.environment.browser, record.environment.browserVersion]
        .filter(Boolean).join(' / ')
      : '';
    emit(`| ${cell(record.id)} | ${cell(record.label)} | ${cell(record.status)} | ${passed}/${scenarios.length} verified | ${cell(environment || '—')} |`);
  }
  emit('');
  for (const record of acceptance) {
    emit(`### ${cell(record.label)}`);
    emit('');
    emit('| scenario id | check | steps | pass criteria | evidence to record | status | notes |');
    emit('|---|---|---|---|---|---|---|');
    for (const scenario of record.scenarios ?? []) {
      const checklist = checklistFor(scenario);
      emit(`| ${cell(scenario.id)} | ${cell(scenario.label)} | ${cell(checklist.steps)} | ${cell(checklist.pass)} | ${cell(checklist.evidence)} | ${cell(scenario.status)} | ${cell(scenario.notes || '—')} |`);
    }
    emit('');
  }
  emit('A parent acceptance record may be `verified` only after every scenario is individually `verified`, each scenario has concrete notes, and the reviewer, ISO date, device, OS, browser, and browser version are recorded.');
  emit('');
  emit('After each real review, run `npm run release:schema`, inspect the diff, and only then rerun `npm run release:check`.');
  const output = `${lines.join('\n')}\n`;
  process.stdout.write(output);
  if (shouldWrite) {
    fs.mkdirSync(path.dirname(workpackPath), { recursive: true });
    fs.writeFileSync(workpackPath, output);
    process.stderr.write(`Wrote release review workpack: ${path.relative(root, workpackPath).replaceAll('\\', '/')}\n`);
  }
}
