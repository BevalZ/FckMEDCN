import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateReleaseManifests } from './release-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {'preview' | 'full'} ReleaseTrack */

/**
 * Preview tags ship a playable narrative build without claiming medical certification.
 * Full tags keep the human medical / evidence / acceptance gates.
 *
 * Track resolution order:
 * 1. `--track=preview|full`
 * 2. `RELEASE_TRACK=preview|full`
 * 3. Git tag from `RELEASE_TAG` or `GITHUB_REF` matching `vX.Y.Z-preview[...]`
 * 4. default `full`
 *
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {ReleaseTrack}
 */
export function resolveReleaseTrack(argv = process.argv, env = process.env) {
  const trackArg = argv.find(arg => arg.startsWith('--track='));
  if (trackArg) {
    const value = trackArg.slice('--track='.length);
    if (value === 'preview' || value === 'full') return value;
    throw new Error(`非法 --track 值：${value}（仅允许 preview 或 full）`);
  }
  if (env.RELEASE_TRACK === 'preview' || env.RELEASE_TRACK === 'full') {
    return env.RELEASE_TRACK;
  }
  const ref = env.GITHUB_REF ?? '';
  const tag = env.RELEASE_TAG
    || (ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : '');
  if (/^v\d+\.\d+\.\d+-preview(?:[.-][0-9A-Za-z.-]+)?$/.test(tag)) return 'preview';
  return 'full';
}

/**
 * @param {{ track?: ReleaseTrack, rootDir?: string, argv?: string[], env?: NodeJS.ProcessEnv }} [opts]
 */
export function runReleaseCheck(opts = {}) {
  const rootDir = opts.rootDir ?? root;
  const track = opts.track ?? resolveReleaseTrack(opts.argv ?? process.argv, opts.env ?? process.env);
  const { failures: schemaFailures, manifests } = validateReleaseManifests(rootDir);
  /** @type {string[]} */
  const hardFailures = [...schemaFailures];
  /** @type {string[]} */
  const deferredFailures = [];

  const ungatedRealityClaimPatterns = [
    /真实事件/u,
    /真实背景/u,
    /真实数据/u,
    /真实参照/u,
    /现实口径/u,
    /现实中/u,
    /据真实数据校准/u,
    /公开报道/u,
    /行业公开数据/u,
  ];
  const sourceDataRoot = path.join(rootDir, 'src', 'data');
  function collectSourceDataFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...collectSourceDataFiles(absolute));
      else if (/\.(ts|tsx|js|json)$/i.test(entry.name)) files.push(absolute);
    }
    return files;
  }
  for (const file of collectSourceDataFiles(sourceDataRoot)) {
    const text = fs.readFileSync(file, 'utf8');
    const matched = ungatedRealityClaimPatterns
      .filter(pattern => pattern.test(text))
      .map(pattern => pattern.source);
    if (matched.length > 0) {
      hardFailures.push(`源码数据包含未经证据门禁的现实声明：${path.relative(rootDir, file).replaceAll('\\', '/')}（${matched.join(', ')}）`);
    }
  }

  const endingsSourcePath = path.join(rootDir, 'src', 'data', 'endings.ts');
  if (fs.existsSync(endingsSourcePath)) {
    const endingsSource = fs.readFileSync(endingsSourcePath, 'utf8');
    if (/realDataCard\s*:\s*\[[\s\S]*?\bsource\s*:/u.test(endingsSource)) {
      hardFailures.push('结局事实卡必须通过 evidenceId 引用 EvidenceRef，不得使用自由文本 source 字段');
    }
    const cardArrays = endingsSource.match(/realDataCard\s*:\s*\[[\s\S]*?\]/gu) ?? [];
    for (const block of cardArrays) {
      const cards = block.match(/\{[^{}]*\}/gu) ?? [];
      for (const card of cards) {
        if (!/\bevidenceId\s*:/u.test(card)) {
          hardFailures.push('结局事实卡存在未引用 evidenceId 的卡片对象');
          break;
        }
      }
    }
  }

  const medicalRecords = Array.isArray(manifests.medical?.records) ? manifests.medical.records : [];
  const medicalOutstanding = medicalRecords.filter(record => record?.status !== 'verified');
  if (medicalOutstanding.length > 0) {
    const flowChecked = medicalOutstanding.filter(record => record?.preReviewStatus === 'flow_checked').length;
    deferredFailures.push(`医学人工终审仍有 ${medicalOutstanding.length} 项未闭环（其中 ${flowChecked} 项仅完成流程预审）`);
  }

  const evidenceEntries = manifests.evidence?.entries && typeof manifests.evidence.entries === 'object'
    ? Object.values(manifests.evidence.entries)
    : [];
  const externalEvidenceOutstanding = evidenceEntries
    .filter(record => record?.scope === 'external' && record?.status !== 'verified');
  if (externalEvidenceOutstanding.length > 0) {
    deferredFailures.push(`外部事实注册表仍有 ${externalEvidenceOutstanding.length} 个证据未闭环`);
  }

  const audioRoot = path.join(rootDir, 'public', 'audio');
  const audioFiles = [];
  function collectAudioFiles(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collectAudioFiles(absolute);
      else if (/\.(mp3|wav|ogg|m4a)$/i.test(entry.name)) {
        audioFiles.push(path.relative(rootDir, absolute).replaceAll('\\', '/'));
      }
    }
  }
  collectAudioFiles(audioRoot);

  const audioRecords = Array.isArray(manifests.audio?.files) ? manifests.audio.files : [];
  const recordsByPath = new Map(audioRecords.map(record => [record?.path, record]));
  for (const audioPath of audioFiles) {
    const record = recordsByPath.get(audioPath);
    if (!record) hardFailures.push(`音频缺少授权记录：${audioPath}`);
    else if (record.status !== 'verified') hardFailures.push(`音频授权尚未闭环：${audioPath}`);
  }
  for (const manifestPath of recordsByPath.keys()) {
    if (typeof manifestPath === 'string' && !audioFiles.includes(manifestPath)) {
      hardFailures.push(`授权清单引用不存在的音频：${manifestPath}`);
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
      deferredFailures.push(`人工验收尚未完成：${check?.label ?? check?.id ?? '未知验收项'}${scenarioText}`);
    }
  }

  const blocking = track === 'preview'
    ? hardFailures
    : [...hardFailures, ...deferredFailures];

  return { track, hardFailures, deferredFailures, blocking, ok: blocking.length === 0 };
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  let track;
  try {
    track = resolveReleaseTrack();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }

  if (track) {
    const result = runReleaseCheck({ track });
    console.log(`Release track: ${result.track}`);
    if (result.track === 'preview') {
      console.log('Preview track defers medical / external-evidence / acceptance human gates.');
      console.log('Unverified ending fact cards stay hidden at runtime via verifiedEvidence().');
    }
    if (result.deferredFailures.length > 0) {
      const label = result.track === 'preview' ? 'Deferred (allowed on preview)' : 'Human gates';
      console.error(`${label}:`);
      for (const failure of result.deferredFailures) console.error(`- ${failure}`);
    }
    if (result.blocking.length > 0) {
      console.error('Release blocked:');
      for (const failure of result.blocking) console.error(`- ${failure}`);
      process.exitCode = 1;
    } else if (result.track === 'preview') {
      console.log('Preview release checks passed (human medical/evidence/acceptance gates deferred).');
    } else {
      console.log('Release readiness checks passed.');
    }
  }
}
