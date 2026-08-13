# 发布候选版人工复核工作流

本文件把自动化门禁留下的人工事项变成可执行流程。它不能替代临床医师、药师或真机验收人员的判断；任何没有真实审阅人、日期和记录的条目必须保持 `pending`。

## 生成当前工作包

```powershell
npm run release:schema
npm run release:review:write
```

工作包来自 `sources/medical-fact-audit.json`、`sources/evidence.json` 和 `sources/release-acceptance.json`。它是派工视图，不应直接提交为事实来源，也不能据此自动修改状态。

## 医学与药学复核

优先按批次派工，避免 78 条一次摊开：

1. **Batch 1**：[`sources/review-workpacks/batch-1-m10-chains.md`](../sources/review-workpacks/batch-1-m10-chains.md)
   （诊断 / 用药 / 工作流，已流程预审）
2. Batch 2：教育题与高风险沟通
3. Batch 3：患者档案
4. Batch 4：生成临床模板

每条记录：

1. 按工作包中的 `id` 和 `review focus` 定位源码：
   `rg -n "<record-id>|<label 的关键字>" src tests`。
2. `patient`、`diagnostic`、`workflow`、`clinical-template` 和 `education` 由临床医师复核；`medication` 必须由药师复核。
3. 逐条记录：是否需要修改、结论、可追溯来源、审阅人与日期。`flow_checked` ≠ 终审。
4. 只有结论已落地代码并有回归时，才把记录设为 `verified`；填写 `reviewerRole`、`reviewedBy`、`reviewedAt`、`evidenceRefs` 和 `notes`。

## 外部事实证据

每个 `external` 条目必须对应具体出版物、机构、发布日期、直接 HTTP(S) URL 和访问日期。先用 `rg -n "<evidenceId>" src/data/endings.ts` 找到所有卡片原句，再核对来源是否直接支持每条表述。标为 `verified` 时还必须填写审阅人、`reviewedAt` 和具体复核结论 `notes`。机构首页、搜索结果页、泛化的“行业调研”或无法追溯的二手转述不能作为 `verified` 证据。

## 桌面与真机验收

自动化基线先运行：

```powershell
npm run check
```

然后由真人在 `sources/release-acceptance.json` 对应项目中填写 `environment`（设备、操作系统、浏览器和版本），并逐条执行 `scenarios`，包括检查生产包控制台。每条场景通过后设为 `verified` 并填写具体 `notes`；发现问题时保留总体 `pending`，在场景 notes 中记录复现步骤。只有所有必测场景逐项通过，且真实验收者填写 `reviewedBy`、`reviewedAt` 和总体 `notes` 后，才能把父级验收项设为 `verified`。

## 发布顺序

### 预览版（可玩，不宣称医学认证）

标签必须匹配 `vX.Y.Z-preview`（例如 `v0.1.0-preview`）。门禁推迟医学/证据/验收人工项，但仍禁止
ungated「真实*」措辞与自由文本事实卡来源。

```powershell
npm run release:schema
npm run release:check:preview
# 打标签前请用同一轨道构建，使标题页显示预览声明：
$env:VITE_RELEASE_TRACK = 'preview'; npm run build
git tag v0.1.0-preview
git push origin v0.1.0-preview
```

也可在 GitHub Actions「Release to GitHub Pages」手动运行并选择 `track=preview`。

### 正式版（医学/证据/验收全绿）

```powershell
npm run release:schema
npm run release:check:full
```

`release:check:full`（默认 `release:check`）失败时不得通过改门禁、删记录或把流程预审冒充终审来发布。
所有人工项目通过后，再以独立提交整理当前工作树并创建**不含** `-preview` 的候选版标签（如 `v1.0.0`）。
