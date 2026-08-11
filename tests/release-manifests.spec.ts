import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const ROOT = process.cwd();

function readJson(relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

test('四份发布 manifest 通过共享 schema 校验', () => {
  const result = spawnSync(process.execPath, ['scripts/release-schema.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  expect(`${result.stdout}${result.stderr}`).toContain('Release manifest schemas passed.');
});

test('医学事实清单完整保留当前 78 个复核对象，流程预审不冒充终审', () => {
  const manifest = readJson('sources/medical-fact-audit.json');
  const ids = manifest.records.map((record: any) => record.id);
  expect(manifest.records).toHaveLength(78);
  expect(new Set(ids).size).toBe(ids.length);
  expect(manifest.records.filter((record: any) => record.preReviewStatus === 'flow_checked')).toHaveLength(26);
  expect(manifest.records.filter((record: any) =>
    record.preReviewStatus === 'flow_checked' && record.status === 'verified')).toEqual([]);
});

test('release:check 的退出码与结构化清单中的未闭环状态一致', () => {
  const evidence = readJson('sources/evidence.json');
  const medical = readJson('sources/medical-fact-audit.json');
  const audio = readJson('sources/audio-licenses.json');
  const acceptance = readJson('sources/release-acceptance.json');
  const outstanding = [
    ...Object.values(evidence.entries).filter((record: any) =>
      record.scope === 'external' && record.status !== 'verified'),
    ...medical.records.filter((record: any) => record.status !== 'verified'),
    ...audio.files.filter((record: any) => record.status !== 'verified'),
    ...acceptance.checks.filter((record: any) => record.status !== 'verified'),
  ];

  const result = spawnSync(process.execPath, ['scripts/release-check.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, output).toBe(outstanding.length === 0 ? 0 : 1);
  expect(output).toContain(outstanding.length === 0 ? 'Release readiness checks passed.' : 'Release blocked:');
});

test('release:review 生成完整的人工复核工作包，不改变 pending 状态', () => {
  const manifest = readJson('sources/medical-fact-audit.json');
  const result = spawnSync(process.execPath, ['scripts/release-review.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, output).toBe(0);
  expect(output).toContain('# Release review workpack');
  expect(output).toContain('clinical-pharmacist');
  expect(output).toContain('External evidence queue');
  for (const record of manifest.records) expect(output).toContain(record.id);
});
