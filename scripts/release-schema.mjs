import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const RELEASE_MANIFEST_FILES = Object.freeze({
  evidence: 'sources/evidence.json',
  medical: 'sources/medical-fact-audit.json',
  audio: 'sources/audio-licenses.json',
  acceptance: 'sources/release-acceptance.json',
});

const EVIDENCE_STATUSES = new Set(['pending', 'verified', 'rejected']);
const EVIDENCE_SCOPES = new Set(['external', 'session']);
const MEDICAL_STATUSES = new Set(['pending', 'verified', 'needs_changes', 'rejected']);
const MEDICAL_PRE_REVIEW_STATUSES = new Set(['not_started', 'flow_checked']);
const MEDICAL_REVIEWER_ROLES = new Set(['licensed-clinician', 'clinical-pharmacist']);
const MEDICAL_CATEGORIES = new Set([
  'patient', 'clinical-template', 'education', 'diagnostic', 'medication', 'workflow',
]);
const REVIEW_STATUSES = new Set(['pending', 'verified', 'rejected']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_ACCEPTANCE_SCENARIOS = new Map([
  ['desktop-lifecycle', [
    'new-game', 'continue-save', 'clinical-route', 'research-route',
    'exit-route', 'late-life-route', 'restart-save', 'console-clean',
  ]],
  ['ios-safari-device', [
    'portrait', 'landscape', 'safe-area', 'touch-minigames', 'long-session', 'audio-unlock', 'console-clean',
  ]],
  ['android-chrome-device', [
    'portrait', 'landscape', 'safe-area', 'touch-minigames', 'long-session', 'audio-unlock', 'console-clean',
  ]],
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasString(object, field) {
  return typeof object?.[field] === 'string';
}

function hasText(object, field) {
  return hasString(object, field) && object[field].trim().length > 0;
}

function hasIsoDate(object, field) {
  return hasText(object, field) && ISO_DATE.test(object[field]);
}

function isHttpUrl(value, requireDirectPath = false) {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && (!requireDirectPath || (url.pathname !== '/' && url.pathname !== ''));
  } catch {
    return false;
  }
}

function checkSchemaVersion(manifest, label, failures) {
  if (!isObject(manifest)) {
    failures.push(`${label} 顶层必须是 JSON 对象`);
    return false;
  }
  if (manifest.schemaVersion !== 1) failures.push(`${label} schemaVersion 必须为 1`);
  return true;
}

function checkUniqueIds(records, label, failures) {
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    if (!hasText(record, 'id')) {
      failures.push(`${label}[${index}] 缺少非空 id`);
      continue;
    }
    if (seen.has(record.id)) failures.push(`${label} id 重复：${record.id}`);
    seen.add(record.id);
  }
}

function validateEvidence(manifest, failures) {
  if (!checkSchemaVersion(manifest, RELEASE_MANIFEST_FILES.evidence, failures)) return;
  if (!isObject(manifest.entries) || Object.keys(manifest.entries).length === 0) {
    failures.push('evidence.json entries 必须是非空对象');
    return;
  }

  for (const [id, record] of Object.entries(manifest.entries)) {
    const prefix = `evidence.json[${id}]`;
    if (!isObject(record)) {
      failures.push(`${prefix} 必须是对象`);
      continue;
    }
    if (!EVIDENCE_SCOPES.has(record.scope)) failures.push(`${prefix}.scope 非法`);
    if (!EVIDENCE_STATUSES.has(record.status)) failures.push(`${prefix}.status 非法`);
    for (const field of ['title', 'organization', 'publishedAt', 'url', 'accessedAt', 'reviewedBy', 'reviewedAt', 'notes']) {
      if (!hasString(record, field)) failures.push(`${prefix}.${field} 必须是字符串`);
    }
    if (!hasText(record, 'title') || !hasText(record, 'organization')) {
      failures.push(`${prefix} 缺少标题或发布机构`);
    }
    if (hasText(record, 'accessedAt') && !hasIsoDate(record, 'accessedAt')) {
      failures.push(`${prefix}.accessedAt 必须是 YYYY-MM-DD`);
    }
    if (hasText(record, 'reviewedAt') && !hasIsoDate(record, 'reviewedAt')) {
      failures.push(`${prefix}.reviewedAt 必须是 YYYY-MM-DD`);
    }

    if (record.status !== 'verified') continue;
    if (!hasIsoDate(record, 'publishedAt') || !hasIsoDate(record, 'accessedAt')
      || !hasText(record, 'reviewedBy') || !hasIsoDate(record, 'reviewedAt') || !hasText(record, 'notes')) {
      failures.push(`${prefix} 标为 verified 时必须有发布日期、访问日期、审阅人、复核日期和结论`);
    }
    if (record.scope === 'external' && !isHttpUrl(record.url, true)) {
      failures.push(`${prefix} 外部 verified 证据必须使用可追溯的直接 HTTP(S) URL`);
    }
    if (record.scope === 'session' && !record.url.startsWith('urn:fckmedcn:')) {
      failures.push(`${prefix} 本局派生证据必须使用 urn:fckmedcn: URL`);
    }
  }
}

function validateMedical(manifest, evidence, failures) {
  if (!checkSchemaVersion(manifest, RELEASE_MANIFEST_FILES.medical, failures)) return;
  if (!hasText(manifest, 'sourceDocument')) failures.push('medical-fact-audit.json 缺少 sourceDocument');
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    failures.push('medical-fact-audit.json records 必须是非空数组');
    return;
  }
  checkUniqueIds(manifest.records, 'medical-fact-audit.json records', failures);
  const evidenceIds = new Set(Object.keys(evidence?.entries ?? {}));

  for (const [index, record] of manifest.records.entries()) {
    const prefix = `medical-fact-audit.json[${record?.id ?? index}]`;
    if (!isObject(record)) {
      failures.push(`${prefix} 必须是对象`);
      continue;
    }
    if (!MEDICAL_CATEGORIES.has(record.category)) failures.push(`${prefix}.category 非法`);
    if (!MEDICAL_STATUSES.has(record.status)) failures.push(`${prefix}.status 非法`);
    if (!MEDICAL_PRE_REVIEW_STATUSES.has(record.preReviewStatus)) failures.push(`${prefix}.preReviewStatus 非法`);
    for (const field of ['label', 'focus', 'reviewerRole', 'reviewedBy', 'reviewedAt', 'notes']) {
      if (!hasString(record, field)) failures.push(`${prefix}.${field} 必须是字符串`);
    }
    if (!hasText(record, 'label') || !hasText(record, 'focus')) failures.push(`${prefix} 缺少名称或复核重点`);
    if (hasText(record, 'reviewerRole') && !MEDICAL_REVIEWER_ROLES.has(record.reviewerRole)) {
      failures.push(`${prefix}.reviewerRole 非法`);
    }
    if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.some(id => typeof id !== 'string')) {
      failures.push(`${prefix}.evidenceRefs 必须是字符串数组`);
    } else {
      for (const id of record.evidenceRefs) {
        if (!evidenceIds.has(id)) failures.push(`${prefix} 引用不存在的 evidenceId：${id}`);
      }
    }

    if (record.status === 'verified') {
      if (!hasText(record, 'reviewedBy') || !hasIsoDate(record, 'reviewedAt')) {
        failures.push(`${prefix} 标为 verified 时必须有审阅人和 YYYY-MM-DD 日期`);
      }
      if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) {
        failures.push(`${prefix} 标为 verified 时必须至少引用一条证据`);
      }
      if (!MEDICAL_REVIEWER_ROLES.has(record.reviewerRole)) {
        failures.push(`${prefix} 标为 verified 时必须填写 reviewerRole（licensed-clinician 或 clinical-pharmacist）`);
      }
      if (!hasText(record, 'notes')) {
        failures.push(`${prefix} 标为 verified 时必须填写审阅结论 notes`);
      }
      if (record.category === 'medication' && record.reviewerRole !== 'clinical-pharmacist') {
        failures.push(`${prefix} medication 类必须由 clinical-pharmacist 终审`);
      }
    }
  }
}

function validateAudio(manifest, failures) {
  if (!checkSchemaVersion(manifest, RELEASE_MANIFEST_FILES.audio, failures)) return;
  if (!Array.isArray(manifest.files)) {
    failures.push('audio-licenses.json files 必须是数组');
    return;
  }
  if (manifest.files.length === 0) {
    if (!isObject(manifest.delivery)
      || manifest.delivery.mode !== 'web-audio-synthesis'
      || !hasText(manifest.delivery, 'implementation')
      || !hasText(manifest.delivery, 'notes')) {
      failures.push('audio-licenses.json 无预录文件时必须记录 Web Audio 合成实现');
    }
  }
  const seen = new Set();
  for (const [index, record] of manifest.files.entries()) {
    const prefix = `audio-licenses.json[${record?.path ?? index}]`;
    if (!isObject(record)) {
      failures.push(`${prefix} 必须是对象`);
      continue;
    }
    if (!hasText(record, 'path')) failures.push(`${prefix} 缺少音频路径`);
    else if (seen.has(record.path)) failures.push(`audio-licenses.json 路径重复：${record.path}`);
    else seen.add(record.path);
    if (!REVIEW_STATUSES.has(record.status)) failures.push(`${prefix}.status 非法`);
    if (typeof record.distributionPermission !== 'boolean') failures.push(`${prefix}.distributionPermission 必须是布尔值`);
    for (const field of ['title', 'author', 'sourceUrl', 'license', 'reviewedBy', 'reviewedAt']) {
      if (!hasString(record, field)) failures.push(`${prefix}.${field} 必须是字符串`);
    }
    if (record.status === 'verified') {
      const complete = record.distributionPermission === true
        && ['title', 'author', 'license', 'reviewedBy'].every(field => hasText(record, field))
        && hasIsoDate(record, 'reviewedAt')
        && isHttpUrl(record.sourceUrl);
      if (!complete) failures.push(`${prefix} 标为 verified 时授权元数据必须完整且允许再分发`);
    }
  }
}

function validateAcceptance(manifest, failures) {
  if (!checkSchemaVersion(manifest, RELEASE_MANIFEST_FILES.acceptance, failures)) return;
  if (!Array.isArray(manifest.checks) || manifest.checks.length === 0) {
    failures.push('release-acceptance.json checks 必须是非空数组');
    return;
  }
  checkUniqueIds(manifest.checks, 'release-acceptance.json checks', failures);
  for (const [index, record] of manifest.checks.entries()) {
    const prefix = `release-acceptance.json[${record?.id ?? index}]`;
    if (!isObject(record)) {
      failures.push(`${prefix} 必须是对象`);
      continue;
    }
    if (!REVIEW_STATUSES.has(record.status)) failures.push(`${prefix}.status 非法`);
    for (const field of ['label', 'reviewedBy', 'reviewedAt', 'notes']) {
      if (!hasString(record, field)) failures.push(`${prefix}.${field} 必须是字符串`);
    }
    if (!hasText(record, 'label')) failures.push(`${prefix} 缺少验收名称`);

    const environmentFields = ['device', 'os', 'browser', 'browserVersion'];
    if (!isObject(record.environment)) {
      failures.push(`${prefix}.environment 必须是对象`);
    } else {
      for (const field of environmentFields) {
        if (!hasString(record.environment, field)) failures.push(`${prefix}.environment.${field} 必须是字符串`);
      }
    }

    const scenarios = Array.isArray(record.scenarios) ? record.scenarios : [];
    if (!Array.isArray(record.scenarios) || scenarios.length === 0) {
      failures.push(`${prefix}.scenarios 必须是非空数组`);
    } else {
      checkUniqueIds(scenarios, `${prefix}.scenarios`, failures);
      for (const [scenarioIndex, scenario] of scenarios.entries()) {
        const scenarioPrefix = `${prefix}.scenarios[${scenario?.id ?? scenarioIndex}]`;
        if (!isObject(scenario)) {
          failures.push(`${scenarioPrefix} 必须是对象`);
          continue;
        }
        if (!REVIEW_STATUSES.has(scenario.status)) failures.push(`${scenarioPrefix}.status 非法`);
        for (const field of ['label', 'steps', 'passCriteria', 'evidenceToRecord', 'notes']) {
          if (!hasString(scenario, field)) failures.push(`${scenarioPrefix}.${field} 必须是字符串`);
        }
        if (!hasText(scenario, 'label')) failures.push(`${scenarioPrefix} 缺少场景名称`);
        for (const field of ['steps', 'passCriteria', 'evidenceToRecord']) {
          if (!hasText(scenario, field)) failures.push(`${scenarioPrefix}.${field} 必须填写验收指引`);
        }
        if (scenario.status !== 'pending' && !hasText(scenario, 'notes')) {
          failures.push(`${scenarioPrefix} 完成或拒绝时必须填写具体 notes`);
        }
      }
    }

    const requiredScenarios = REQUIRED_ACCEPTANCE_SCENARIOS.get(record.id) ?? [];
    const scenarioIds = new Set(scenarios.map(scenario => scenario?.id));
    for (const scenarioId of requiredScenarios) {
      if (!scenarioIds.has(scenarioId)) failures.push(`${prefix} 缺少必需场景：${scenarioId}`);
    }

    if (record.status === 'verified') {
      if (!hasText(record, 'reviewedBy') || !hasIsoDate(record, 'reviewedAt') || !hasText(record, 'notes')) {
        failures.push(`${prefix} 标为 verified 时必须有审阅人、日期和总体结论`);
      }
      if (!isObject(record.environment)
        || environmentFields.some(field => !hasText(record.environment, field))) {
        failures.push(`${prefix} 标为 verified 时必须填写设备、操作系统、浏览器和版本`);
      }
      if (scenarios.length === 0 || scenarios.some(scenario => scenario?.status !== 'verified')) {
        failures.push(`${prefix} 标为 verified 时所有验收场景必须逐项 verified`);
      }
    }
  }

  for (const id of REQUIRED_ACCEPTANCE_SCENARIOS.keys()) {
    if (!manifest.checks.some(record => record?.id === id)) failures.push(`release-acceptance.json 缺少必需验收项：${id}`);
  }
}

function readManifest(root, relativePath, failures) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    failures.push(`${relativePath} 无法读取或不是合法 JSON：${error.message}`);
    return null;
  }
}

export function validateReleaseManifests(root) {
  const failures = [];
  const manifests = Object.fromEntries(Object.entries(RELEASE_MANIFEST_FILES)
    .map(([key, relativePath]) => [key, readManifest(root, relativePath, failures)]));

  if (manifests.evidence) validateEvidence(manifests.evidence, failures);
  if (manifests.medical) validateMedical(manifests.medical, manifests.evidence, failures);
  if (manifests.audio) validateAudio(manifests.audio, failures);
  if (manifests.acceptance) validateAcceptance(manifests.acceptance, failures);
  return { failures, manifests };
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const root = path.resolve(path.dirname(modulePath), '..');
  const { failures } = validateReleaseManifests(root);
  if (failures.length > 0) {
    console.error('Release manifest schema invalid:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('Release manifest schemas passed.');
  }
}
