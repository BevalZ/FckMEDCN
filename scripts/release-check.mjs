import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateReleaseManifests } from './release-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { failures, manifests } = validateReleaseManifests(root);

const medicalRecords = Array.isArray(manifests.medical?.records) ? manifests.medical.records : [];
const medicalOutstanding = medicalRecords.filter(record => record?.status !== 'verified');
if (medicalOutstanding.length > 0) {
  const flowChecked = medicalOutstanding.filter(record => record?.preReviewStatus === 'flow_checked').length;
  failures.push(`医学人工终审仍有 ${medicalOutstanding.length} 项未闭环（其中 ${flowChecked} 项仅完成流程预审）`);
}

const evidenceEntries = manifests.evidence?.entries && typeof manifests.evidence.entries === 'object'
  ? Object.values(manifests.evidence.entries)
  : [];
const externalEvidenceOutstanding = evidenceEntries
  .filter(record => record?.scope === 'external' && record?.status !== 'verified');
if (externalEvidenceOutstanding.length > 0) {
  failures.push(`外部事实注册表仍有 ${externalEvidenceOutstanding.length} 个证据未闭环`);
}

const audioRoot = path.join(root, 'public', 'audio');
const audioFiles = [];
function collectAudioFiles(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectAudioFiles(absolute);
    else if (/\.(mp3|wav|ogg|m4a)$/i.test(entry.name)) {
      audioFiles.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
  }
}
collectAudioFiles(audioRoot);

const audioRecords = Array.isArray(manifests.audio?.files) ? manifests.audio.files : [];
const recordsByPath = new Map(audioRecords.map(record => [record?.path, record]));
for (const audioPath of audioFiles) {
  const record = recordsByPath.get(audioPath);
  if (!record) failures.push(`音频缺少授权记录：${audioPath}`);
  else if (record.status !== 'verified') failures.push(`音频授权尚未闭环：${audioPath}`);
}
for (const manifestPath of recordsByPath.keys()) {
  if (typeof manifestPath === 'string' && !audioFiles.includes(manifestPath)) {
    failures.push(`授权清单引用不存在的音频：${manifestPath}`);
  }
}

const acceptanceChecks = Array.isArray(manifests.acceptance?.checks) ? manifests.acceptance.checks : [];
for (const check of acceptanceChecks) {
  if (check?.status !== 'verified') {
    const pendingScenarios = Array.isArray(check.scenarios)
      ? check.scenarios
        .filter(scenario => scenario?.status !== 'verified')
        .map(scenario => scenario?.id ?? scenario?.label ?? '未知场景')
      : [];
    const scenarioText = pendingScenarios.length > 0
      ? `（未完成场景：${pendingScenarios.join(', ')}）`
      : '';
    failures.push(`人工验收尚未完成：${check?.label ?? check?.id ?? '未知验收项'}${scenarioText}`);
  }
}

if (failures.length > 0) {
  console.error('Release blocked:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Release readiness checks passed.');
}
