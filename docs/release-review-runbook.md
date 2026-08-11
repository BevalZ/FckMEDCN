# 发布候选版人工复核工作流

本文件把自动化门禁留下的人工事项变成可执行流程。它不能替代临床医师、药师或真机验收人员的判断；任何没有真实审阅人、日期和记录的条目必须保持 `pending`。

## 生成当前工作包

```powershell
npm run release:schema
npm run release:review > release-review-workpack.md
```

工作包来自 `sources/medical-fact-audit.json`、`sources/evidence.json` 和 `sources/release-acceptance.json`。它是派工视图，不应直接提交为事实来源，也不能据此自动修改状态。

## 医学与药学复核

1. 按工作包中的 `id` 和 `review focus` 定位源码内容：
   `rg -n "<record-id>|<label 的关键字>" src tests`。
2. `patient`、`diagnostic`、`workflow`、`clinical-template` 和 `education` 记录由具备相应资质的临床医师复核；`medication` 记录必须由药师复核。
3. 逐条记录：是否需要修改、修改后的结论、引用的可追溯来源、审阅人身份和日期。流程预审 (`flow_checked`) 不等于终审。
4. 只有在结论已落地代码并有回归测试时，才把记录设为 `verified`；同时填写 `reviewerRole`、`reviewedBy`、`reviewedAt`、`evidenceRefs` 和 `notes`。

## 外部事实证据

每个 `external` 条目必须对应具体出版物、机构、发布日期、直接 HTTP(S) URL、访问日期和审阅人。机构首页、搜索结果页、泛化的“行业调研”或无法追溯的二手转述不能作为 `verified` 证据。

## 桌面与真机验收

自动化基线先运行：

```powershell
npm run check
```

然后由真人在 `sources/release-acceptance.json` 对应项目中记录：设备/操作系统、浏览器版本、屏幕方向、刘海或安全区表现、触控小游戏、长时间操作、音频首次解锁，以及发现问题的复现步骤。只有真实验收者填写 `reviewedBy`、`reviewedAt` 和具体 `notes` 后才能设为 `verified`。

## 发布顺序

```powershell
npm run release:schema
npm run release:check
```

`release:check` 失败时不得通过改门禁、删记录或把流程预审冒充终审来发布。所有人工项目通过后，再以独立提交整理当前工作树并创建候选版标签。
