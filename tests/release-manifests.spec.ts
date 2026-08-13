import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
  expect(manifest.records.every((record: any) => Object.prototype.hasOwnProperty.call(record, 'reviewerRole'))).toBe(true);
  // reviewerRole 预填资质类别（派工用），不等于终审；pending 记录仍不得有 reviewedBy。
  expect(manifest.records.filter((record: any) => record.category === 'medication')
    .every((record: any) => record.reviewerRole === 'clinical-pharmacist')).toBe(true);
  expect(manifest.records.filter((record: any) => record.category !== 'medication')
    .every((record: any) => record.reviewerRole === 'licensed-clinician')).toBe(true);
  expect(manifest.records.filter((record: any) => record.status === 'pending')
    .every((record: any) => !record.reviewedBy)).toBe(true);
  expect(manifest.records.filter((record: any) =>
    record.preReviewStatus === 'flow_checked' && record.status === 'verified')).toEqual([]);
});

test('医学终审 reviewerRole 必须是空值或白名单角色', async () => {
  // @ts-expect-error Runtime release validator is intentionally plain ESM JavaScript.
  const { validateReleaseManifests } = await import('../scripts/release-schema.mjs');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-medical-schema-'));
  try {
    fs.cpSync(path.join(ROOT, 'sources'), path.join(tempRoot, 'sources'), { recursive: true });
    const manifestPath = path.join(tempRoot, 'sources', 'medical-fact-audit.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.records[0].reviewerRole = 'ai-reviewer';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('medical-fact-audit.json[patient_lonely_elder_hypertension].reviewerRole 非法');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
test('人工验收证据目录记录 artifact 路径规范', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'sources', 'review-artifacts', 'README.md'), 'utf8');
  expect(readme).toContain('sources/review-artifacts/');
  expect(readme).toContain('Do not record local absolute paths');
  expect(readme).toContain('protected health information');
  expect(readme).toContain('evidenceArtifacts');
  expect(readme).toContain('TEMPLATE.md');
  const template = fs.readFileSync(path.join(ROOT, 'sources', 'review-artifacts', 'TEMPLATE.md'), 'utf8');
  expect(template).toContain('Acceptance artifact template');
  expect(template).toContain('Privacy check');
  const acceptance = JSON.stringify(readJson('sources/release-acceptance.json'));
  expect(acceptance).not.toContain('sources/review-artifacts/TEMPLATE.md');
});

test('人工验收清单覆盖桌面生命周期与移动端必测场景', () => {
  const manifest = readJson('sources/release-acceptance.json');
  const expectedScenarios: Record<string, string[]> = {
    'desktop-lifecycle': [
      'new-game', 'continue-save', 'clinical-route', 'research-route',
      'exit-route', 'late-life-route', 'restart-save', 'console-clean',
    ],
    'ios-safari-device': [
      'portrait', 'landscape', 'safe-area', 'touch-minigames', 'long-session', 'audio-unlock', 'console-clean',
    ],
    'android-chrome-device': [
      'portrait', 'landscape', 'safe-area', 'touch-minigames', 'long-session', 'audio-unlock', 'console-clean',
    ],
  };

  for (const [id, expected] of Object.entries(expectedScenarios)) {
    const check = manifest.checks.find((record: any) => record.id === id);
    expect(check, `缺少 ${id}`).toBeTruthy();
    expect(Object.keys(check.environment).sort()).toEqual(['browser', 'browserVersion', 'device', 'os']);
    expect(check.scenarios.map((scenario: any) => scenario.id)).toEqual(expected);
    expect(check.scenarios.every((scenario: any) => scenario.status === 'pending')).toBe(true);
    expect(check.scenarios.every((scenario: any) =>
      scenario.steps && scenario.passCriteria && scenario.evidenceToRecord)).toBe(true);
    expect(check.scenarios.every((scenario: any) => Array.isArray(scenario.evidenceArtifacts))).toBe(true);
  }
});

test('verified 人工验收必须逐场景通过并填写完整环境', async () => {
  // @ts-expect-error Runtime release validator is intentionally plain ESM JavaScript.
  const { validateReleaseManifests } = await import('../scripts/release-schema.mjs');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-release-schema-'));
  try {
    fs.cpSync(path.join(ROOT, 'sources'), path.join(tempRoot, 'sources'), { recursive: true });
    const acceptancePath = path.join(tempRoot, 'sources', 'release-acceptance.json');
    const acceptance = JSON.parse(fs.readFileSync(acceptancePath, 'utf8'));
    const desktop = acceptance.checks.find((record: any) => record.id === 'desktop-lifecycle');
    desktop.status = 'verified';
    desktop.reviewedBy = '真实验收者';
    desktop.reviewedAt = '2026-08-12';
    desktop.notes = '完整生命周期逐项验收通过。';
    desktop.environment = {
      device: 'Desktop PC', os: 'Windows 11', browser: 'Chromium', browserVersion: '140',
    };
    for (const scenario of desktop.scenarios) {
      scenario.status = 'verified';
      scenario.notes = '真机验收通过。';
      scenario.evidenceArtifacts = [`sources/review-artifacts/desktop-lifecycle/${scenario.id}.md`];
    }

    desktop.scenarios[0].status = 'pending';
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle] 标为 verified 时所有验收场景必须逐项 verified');

    desktop.scenarios[0].status = 'verified';
    desktop.scenarios[0].notes = '';
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game] 完成或拒绝时必须填写具体 notes');

    desktop.scenarios[0].notes = '真机验收通过。';
    desktop.environment.browserVersion = '';
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle] 标为 verified 时必须填写设备、操作系统、浏览器和版本');

    desktop.environment.browserVersion = '140';
    desktop.scenarios[0].steps = '';
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game].steps 必须填写验收指引');

    desktop.scenarios[0].steps = 'Launch production build, start a new game, allocate attrs, enter first playable scene.';
    desktop.scenarios[0].evidenceArtifacts = [];
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game] 完成或拒绝时必须至少记录一条 evidenceArtifacts');

    desktop.scenarios[0].evidenceArtifacts = ['C:/Users/reviewer/Desktop/new-game.png'];
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game].evidenceArtifacts 必须使用 sources/review-artifacts/ 下的相对路径');

    desktop.scenarios[0].evidenceArtifacts = ['sources/review-artifacts/TEMPLATE.md'];
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game].evidenceArtifacts 不能引用 sources/review-artifacts/TEMPLATE.md 模板');

    desktop.scenarios[0].evidenceArtifacts = ['sources/review-artifacts/desktop-lifecycle/new-game.md'];
    fs.writeFileSync(acceptancePath, JSON.stringify(acceptance));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('release-acceptance.json[desktop-lifecycle].scenarios[new-game].evidenceArtifacts 引用的证据文件不存在：sources/review-artifacts/desktop-lifecycle/new-game.md');

    const artifactPath = path.join(tempRoot, 'sources', 'review-artifacts', 'desktop-lifecycle', 'new-game.md');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, '# new-game acceptance evidence\n');
    expect(validateReleaseManifests(tempRoot).failures
      .filter((failure: string) => failure.includes('release-acceptance.json[desktop-lifecycle].scenarios[new-game]'))).toEqual([]);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('候选外部来源使用直接链接但保持 pending，等待真人复核', () => {
  const evidence = readJson('sources/evidence.json').entries;
  const retainedExternalIds = [
    '国家卫健委',
    '多项职业心理健康研究',
    '科学撤稿时滞研究',
    '普通高等学校学生管理规定',
    '科研诚信案件调查处理规则',
    '职称制度改革文件',
    '教育部历年统计',
    '人社部职业技能提升计划',
  ];
  expect(Object.entries(evidence)
    .filter(([, record]: any) => record.scope === 'external')
    .map(([id]) => id)
    .sort()).toEqual(retainedExternalIds.toSorted());
  for (const id of retainedExternalIds) {
    expect(evidence[id].status).toBe('pending');
    expect(evidence[id].reviewedBy).toBe('');
    expect(evidence[id].reviewedAt).toBe('');
    expect(evidence[id].notes).toBe('');
    expect(evidence[id].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new URL(evidence[id].url).pathname).not.toBe('/');
  }
});

test('verified 外部证据必须记录复核日期与原句支持结论', async () => {
  // @ts-expect-error Runtime release validator is intentionally plain ESM JavaScript.
  const { validateReleaseManifests } = await import('../scripts/release-schema.mjs');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-evidence-schema-'));
  try {
    fs.cpSync(path.join(ROOT, 'sources'), path.join(tempRoot, 'sources'), { recursive: true });
    const evidencePath = path.join(tempRoot, 'sources', 'evidence.json');
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const record = evidence.entries['国家卫健委'];
    record.status = 'verified';
    record.reviewedBy = '真实证据审阅人';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('evidence.json[国家卫健委] 标为 verified 时必须有发布日期、访问日期、审阅人、复核日期和结论');

    record.reviewedAt = '2026-08-12';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence));
    expect(validateReleaseManifests(tempRoot).failures)
      .toContain('evidence.json[国家卫健委] 标为 verified 时必须有发布日期、访问日期、审阅人、复核日期和结论');

    record.notes = '逐字核对通知，直接支持全国统一号码 12356 的卡片表述。';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence));
    expect(validateReleaseManifests(tempRoot).failures
      .filter((failure: string) => failure.includes('evidence.json[国家卫健委]'))).toEqual([]);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

function copyReleaseCheckFixture(tempRoot: string) {
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(tempRoot, 'scripts'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'sources'), path.join(tempRoot, 'sources'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'src', 'data'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'src', 'data', 'endings.ts'), path.join(tempRoot, 'src', 'data', 'endings.ts'));
}

test('release:check 要求结局事实卡只能通过 EvidenceRef 引用来源', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-ending-evidence-'));
  try {
    copyReleaseCheckFixture(tempRoot);
    const endingsPath = path.join(tempRoot, 'src', 'data', 'endings.ts');
    let source = fs.readFileSync(endingsPath, 'utf8');
    source = source.replace("evidenceId: '国家卫健委'", "source: '国家卫健委'");
    fs.writeFileSync(endingsPath, source);

    const result = spawnSync(process.execPath, ['scripts/release-check.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(1);
    expect(output).toContain('结局事实卡必须通过 evidenceId 引用 EvidenceRef');
    expect(output).toContain('结局事实卡存在未引用 evidenceId 的卡片对象');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('release:check 阻止源码数据中的未经门禁现实声明', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-release-content-'));
  try {
    copyReleaseCheckFixture(tempRoot);
    fs.writeFileSync(
      path.join(tempRoot, 'src', 'data', 'unsafe.ts'),
      "export const unsafe = '真实数据：未经 evidence registry 复核';\n",
    );

    const result = spawnSync(process.execPath, ['scripts/release-check.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(1);
    expect(output).toContain('源码数据包含未经证据门禁的现实声明：src/data/unsafe.ts');
    expect(output).toContain('真实数据');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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

  const result = spawnSync(process.execPath, ['scripts/release-check.mjs', '--track=full'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, output).toBe(outstanding.length === 0 ? 0 : 1);
  expect(output).toContain(outstanding.length === 0 ? 'Release readiness checks passed.' : 'Release blocked:');
  if (outstanding.length > 0) {
    expect(output).toContain('未完成场景：new-game, continue-save, clinical-route, research-route, exit-route, late-life-route, restart-save, console-clean');
    expect(output).toContain('未完成场景：portrait, landscape, safe-area, touch-minigames, long-session, audio-unlock, console-clean');
  }
});

test('release:check --track=preview 在仅有人工门禁未闭环时可通过', () => {
  const result = spawnSync(process.execPath, ['scripts/release-check.mjs', '--track=preview'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, output).toBe(0);
  expect(output).toContain('Release track: preview');
  expect(output).toContain('Preview release checks passed');
  expect(output).toContain('Deferred (allowed on preview)');
  expect(output).toContain('医学人工终审仍有');
});

test('release:check 把 vX.Y.Z-preview 标签解析为 preview 轨道', () => {
  const result = spawnSync(process.execPath, ['scripts/release-check.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      RELEASE_TRACK: '',
      RELEASE_TAG: 'v0.1.0-preview',
      GITHUB_REF: 'refs/tags/v0.1.0-preview',
    },
  });
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, output).toBe(0);
  expect(output).toContain('Release track: preview');
});

test('release:check --track=preview 仍阻止 ungated 现实声明', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-preview-unsafe-'));
  try {
    copyReleaseCheckFixture(tempRoot);
    fs.writeFileSync(
      path.join(tempRoot, 'src', 'data', 'unsafe.ts'),
      "export const unsafe = '真实数据：未经 evidence registry 复核';\n",
    );

    const result = spawnSync(process.execPath, ['scripts/release-check.mjs', '--track=preview'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(1);
    expect(output).toContain('Release track: preview');
    expect(output).toContain('源码数据包含未经证据门禁的现实声明：src/data/unsafe.ts');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('release:review --write 生成可归档 Markdown 工作包', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fckmedcn-review-write-'));
  try {
    copyReleaseCheckFixture(tempRoot);
    const result = spawnSync(process.execPath, ['scripts/release-review.mjs', '--write'], {
      cwd: tempRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout}\n${result.stderr}`;
    const workpackPath = path.join(tempRoot, 'sources', 'review-workpacks', 'release-review-workpack.md');
    expect(result.status, output).toBe(0);
    expect(output).toContain('Wrote release review workpack: sources/review-workpacks/release-review-workpack.md');
    expect(fs.existsSync(workpackPath)).toBe(true);
    const workpack = fs.readFileSync(workpackPath, 'utf8');
    expect(workpack).toContain('# Release review workpack');
    expect(workpack).toMatch(/Generated at: \d{4}-\d{2}-\d{2}T/);
    expect(workpack).toMatch(/Source HEAD at generation: [0-9a-f]{7,}|Source HEAD at generation: unknown/);
    expect(workpack).toContain('Manifest schema versions: evidence v1; medical v1; audio v1; acceptance v1');
    expect(workpack).toContain('used by ending cards');
    expect(workpack).toContain('Medical queue by reviewerRole');
    expect(workpack).toContain('| scenario id | check | steps | pass criteria | evidence to record | artifacts | status | notes |');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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
  expect(output).toMatch(/Generated at: \d{4}-\d{2}-\d{2}T/);
  expect(output).toMatch(/Source HEAD at generation: [0-9a-f]{7,}|Source HEAD at generation: unknown/);
  expect(output).toContain('Manifest schema versions: evidence v1; medical v1; audio v1; acceptance v1');
  expect(output).toContain('Medical queue by reviewerRole: Unassigned medical/pharmacy reviews: 0; Assigned licensed-clinician reviews: 66; Assigned clinical-pharmacist reviews: 12');
  expect(output).toContain('Suggested reviewer split: licensed-clinician 66; clinical-pharmacist 12');
  expect(output).toContain('Pre-review split: flow_checked 26; not_started 52');
  expect(output).toContain('Medical records missing evidenceRefs: 78');
  expect(output).toContain('Rows with reviewerRole `unassigned` must be assigned to a real reviewer');
  expect(output).toContain('### Unassigned medical/pharmacy reviews');
  expect(output).toContain('### Assigned licensed-clinician reviews');
  expect(output).toContain('### Assigned clinical-pharmacist reviews');
  expect(output).toContain('| — | — | — | — | — | — | — | — |');
  expect(output).toContain('clinical-pharmacist');
  expect(output).toContain('diagnostic_workup');
  expect(output).toContain('med_reconciliation');
  expect(output).toContain('External evidence queue');
  expect(output).toContain('used by ending cards');
  expect(output).toContain('quit_guipei: 心理援助热线 = 全国统一号码：12356');
  expect(output).toContain('exhausted_attending: 中国医生职业倦怠总体检出率 = 系统综述汇总为 75.48%');
  expect(output).toContain('worker_steady: 技能工种缺口 = 制造业 / 服务业长期存在');
  expect(output).toContain('exact card wording listed in `used by ending cards`');
  expect(output).toContain('8 source-complete awaiting reviewer, 0 source-incomplete');
  expect(output).toContain('reviewedBy, reviewedAt, notes');
  expect(output).toContain('0/8 verified');
  expect(output).toContain('| scenario id | check | steps | pass criteria | evidence to record | artifacts | status | notes |');
  expect(output).toContain('new-game | 新开局 | Launch production build, start a new game, allocate attrs');
  expect(output).toContain('Clinical route reaches a route-appropriate ending');
  expect(output).toContain('Record late-life phases visited, ending id, age/year');
  expect(output).toContain('Audio starts only after user gesture and does not throw browser autoplay errors');
  expect(output).toContain('late-life-route');
  expect(output).toContain('audio-unlock');
  for (const record of manifest.records) expect(output).toContain(record.id);
});
