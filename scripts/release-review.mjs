import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateReleaseManifests } from './release-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

  const roleFor = category => category === 'medication'
    ? 'clinical-pharmacist'
    : 'licensed-clinician';
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
  const externalEvidence = evidence.filter(record => record.scope === 'external');
  const outstandingExternal = externalEvidence.filter(record => record.status !== 'verified');
  const sourceComplete = outstandingExternal.filter(record => (
    record.status !== 'verified'
    && record.publishedAt
    && record.accessedAt
    && isDirectHttpUrl(record.url)
  ));

  console.log('# Release review workpack');
  console.log('');
  console.log('Generated from the four release manifests. This report is a queue, not an approval record. Do not change `pending` to `verified` without the named reviewer, date, evidence reference, and written conclusion.');
  console.log('');
  console.log(`- Medical records: ${medical.length} total; ${medical.filter(record => record.status !== 'verified').length} outstanding`);
  console.log(`- External evidence: ${externalEvidence.length} total; ${outstandingExternal.length} outstanding (${sourceComplete.length} source-complete awaiting reviewer, ${outstandingExternal.length - sourceComplete.length} source-incomplete)`);
  console.log(`- Manual acceptance checks: ${acceptance.length} total; ${acceptance.filter(record => record.status !== 'verified').length} outstanding`);
  console.log('');

  console.log('## 1. Medical and pharmacy review queue');
  console.log('');
  console.log('| id | required reviewer | category | label | review focus | pre-review | status | evidenceRefs |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const record of medical) {
    console.log(`| ${cell(record.id)} | ${roleFor(record.category)} | ${cell(record.category)} | ${cell(record.label)} | ${cell(record.focus)} | ${cell(record.preReviewStatus)} | ${cell(record.status)} | ${cell(record.evidenceRefs.join(', ') || '—')} |`);
  }
  console.log('');
  console.log('Required medical completion fields: `status: verified`, `reviewerRole`, named reviewer in `reviewedBy`, ISO date in `reviewedAt`, at least one `evidenceRefs` entry, and a concise `notes` conclusion. Medication records require `clinical-pharmacist`; other records require a licensed clinician.');
  console.log('');

  console.log('## 2. External evidence queue');
  console.log('');
  console.log('| id | title | organization | status | missing / weak fields | current URL |');
  console.log('|---|---|---|---|---|---|');
  for (const record of externalEvidence) {
    console.log(`| ${cell(record.id)} | ${cell(record.title)} | ${cell(record.organization)} | ${cell(record.status)} | ${cell(missingEvidence(record))} | ${cell(record.url || '—')} |`);
  }
  console.log('');
  console.log('External evidence is releasable only when the publication is traceable, the URL points to the specific source rather than a portal homepage, and publication/access/reviewer fields are complete. A reviewer must also record an ISO review date and a concise conclusion that the source supports the exact card wording.');
  console.log('');

  console.log('## 3. Manual acceptance queue');
  console.log('');
  console.log('| id | label | status | scenario progress | environment |');
  console.log('|---|---|---|---|---|');
  for (const record of acceptance) {
    const scenarios = Array.isArray(record.scenarios) ? record.scenarios : [];
    const passed = scenarios.filter(scenario => scenario.status === 'verified').length;
    const environment = record.environment
      ? [record.environment.device, record.environment.os, record.environment.browser, record.environment.browserVersion]
        .filter(Boolean).join(' / ')
      : '';
    console.log(`| ${cell(record.id)} | ${cell(record.label)} | ${cell(record.status)} | ${passed}/${scenarios.length} verified | ${cell(environment || '—')} |`);
  }
  console.log('');
  for (const record of acceptance) {
    console.log(`### ${cell(record.label)}`);
    console.log('');
    console.log('| scenario id | check | status | notes |');
    console.log('|---|---|---|---|');
    for (const scenario of record.scenarios ?? []) {
      console.log(`| ${cell(scenario.id)} | ${cell(scenario.label)} | ${cell(scenario.status)} | ${cell(scenario.notes || '—')} |`);
    }
    console.log('');
  }
  console.log('A parent acceptance record may be `verified` only after every scenario is individually `verified`, each scenario has concrete notes, and the reviewer, ISO date, device, OS, browser, and browser version are recorded.');
  console.log('');
  console.log('After each real review, run `npm run release:schema`, inspect the diff, and only then rerun `npm run release:check`.');
}
