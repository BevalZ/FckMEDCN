# Batch 1 · M10 诊断 / 用药 / 临床工作流终审包

派工日期：2026-08-13  
范围：`preReviewStatus: flow_checked` 且仍 `status: pending` 的 26 条记录  
目标：由真实临床医师 / 药师完成终审，使对应 JSON 记录可标 `verified`（或 `needs_changes`）

本文件是派工视图，**不是**审批记录。不得把流程预审冒充终审。

## 关闭一条记录的最低要求

在 [`sources/medical-fact-audit.json`](../medical-fact-audit.json) 中为该 `id` 填写：

| 字段 | 要求 |
|---|---|
| `status` | `verified` 或 `needs_changes` / `rejected` |
| `reviewerRole` | 已预填：用药链 = `clinical-pharmacist`；其余 = `licensed-clinician` |
| `reviewedBy` | 真实姓名或可追溯标识 |
| `reviewedAt` | `YYYY-MM-DD` |
| `evidenceRefs` | ≥1 条可追溯来源（指南 / 教材 / 机构文件 / DOI） |
| `notes` | 结论：通过 / 需改写何处 |

改写源码后：补回归 → `npm run release:schema` → 再标 `verified`。

## A. 诊断链 · licensed-clinician（6）

源码：[`src/data/events_diagnostic.ts`](../../src/data/events_diagnostic.ts)  
回归：`tests/diagnostic-chain.spec.ts`

| id | 审阅焦点 | 建议打开位置 |
|---|---|---|
| `diagnostic_workup` | 生命体征/检查申请；急性胸闷尽早心电图 | 事件标题「胸闷患者的第一张检查单」 |
| `diagnostic_report_review` | 不把单一异常等同最终诊断 | 「把报告放回鉴别诊断里」 |
| `diagnostic_report_review_assisted` | 低知识带教路径措辞 | 「带教带你逐项读报告」 |
| `diagnostic_followup` | 复查/交班概括性表述 | 「把复查计划交给下一班」 |
| `diagnostic_shortcut_echo` | 避免「检查越多越好」 | 「那张检查单留下的课」 |
| `diagnostic_rushed_echo` | 不确定性与上级复核 | 「鉴别诊断不能靠一个醒目数字」 |

## B. 用药安全链 · clinical-pharmacist（10）

源码：[`src/data/events_medication.ts`](../../src/data/events_medication.ts)  
回归：`tests/medication-safety-chain.spec.ts`

| id | 审阅焦点 |
|---|---|
| `med_reconciliation` | 入院用药清单、过敏史、不确定项；无剂量 |
| `med_indication_review` | 抗菌药物指征复评；药师参与边界 |
| `med_indication_review_assisted` | 带教/药师教学路径 |
| `med_adverse_effect_escalation` | 疑似 ADR：时间线 ≠ 因果；升级报告 |
| `med_discharge_teachback` | 出院 teach-back；求助路径 |
| `med_reconciliation_echo` | 未核对后果回声 |
| `med_indication_echo` | 「继续原方案」≠ 复评 |
| `med_adverse_effect_echo` | 忽略新变化的职业期回声 |
| `med_teachback_echo` | 复述确认适用场景 |
| `med_teachback_rushed_echo` | 点头 ≠ 理解 |

硬规则：全文不得出现可执行剂量、处方或个体化用药建议；若发现，标 `needs_changes` 并指出原文。

## C. 临床工作流链 · licensed-clinician（10）

源码：[`src/data/events_clinical_workflow.ts`](../../src/data/events_clinical_workflow.ts)  
回归：`tests/clinical-workflow-chain.spec.ts`

| id | 审阅焦点 |
|---|---|
| `clinical_schedule_handoff` | 轮转交接责任边界 |
| `clinical_rounds_hierarchy` | 分级查房 / 教学边界 |
| `clinical_rounds_assisted` | 低知识辅助汇报 |
| `clinical_progress_note` | 病程记录 ≠ 模板粘贴 |
| `clinical_consult_request` | 会诊问题与闭环 |
| `clinical_schedule_echo` | 交班漏项回声 |
| `clinical_rounds_echo` | 风险上报回声 |
| `clinical_note_echo` | 复制病程回声 |
| `clinical_consult_echo` | 清晰会诊闭环 |
| `clinical_consult_vague_echo` | 模糊会诊缺问题 |

## 审阅人勾选（纸质/聊天派工用）

- [ ] A 诊断 6 条已结论写入 JSON  
- [ ] B 用药 10 条已结论写入 JSON  
- [ ] C 工作流 10 条已结论写入 JSON  
- [ ] 若有 `needs_changes`：源码已改 + 专项回归绿  
- [ ] `npm run release:schema` 通过  

## 下一批（勿与 Batch 1 混审）

1. Batch 2：教育题 / CPR / 皮试 / 抗凝沟通（`education_*` + 部分 medication）  
2. Batch 3：患者档案（`patient_*`）  
3. Batch 4：`eventGen` 临床模板（`template_*`）  
4. 并行：外部证据 8 条 + `release-acceptance.json` 桌面/真机  
