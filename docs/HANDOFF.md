# 阶段性总结 - ④ 新闻时序已对齐，路线图四大项全部闭环

## 当前状态

- **路线图 ①②③④ 全部完成**：④ 新闻时序 2026-07-30 收尾——
  管线实测 81 季（2024Q3→2044Q3），ticker 原止 2035Q2（硕博起断粮 8 年），
  已延伸 2036-2044 共 18 条并修正两会（Q4→2025Q1）、医师节（Q2→Q3）两处季节违和；
  静态回归 `tests/news-timeline.spec.ts` 从场景源码读 MAX_TURNS 逐年断言不断粮。
- **known-issues 已修已验**：B2、B6、A3、B3、B7；全量 **33 用例绿**（exit=0，
  balance-sim 首跑 flaky 是 Windows 环境成本，见 D4）。
- git 仓库健康，工作区干净。

## 下一轮候选（按优先级）

1. **B4（旧存档 sceneKey 兼容）** — 构造旧格式存档（sceneKey: 'InternshipScene' 等卡片场景）
   读档，断言不白屏、不串场景；可写成测试。这是 known-issues 里最后一个"待查"。
2. **B1（HMR glTexture）** — 低优先，疑似仅开发期热重载产物；生产 build 快速划过高考选项验证。
3. **A2（文字裁剪）** — 纯目视项，只能人工；A1 已有 campus.spec 覆盖视为已验。
4. 之后：路线图本身已无待办，可转向新内容（事件扩充/数值微调/新系统），
   届时与用户确认方向。

## 场景转换测试经验（B7 排障得来，写新测试前先读）

- 医院出生点在办公室门口，**不是**睡觉点：睡觉得先 `tileCenter` 传送到值班室 door `[25,11]`。
- 各场景 MAX_TURNS：本科 20 / 实习 **5** / 规培 12 / 硕 12 / 博 16 / 求职 4 / 职业 12
  （从场景源码读，lifecycle-sim 的 STAGE_PLAN 是模拟自用节拍，别当事实源）。
- 转换断言卡壳时，先写无断言诊断用例打印每步 `getScenes(true)` 列表，比猜快。

## 验证基线（每次大改后）

```bash
npx tsc --noEmit                          # 零错误（include 仅 src，tests/ 不在覆盖范围）
npx playwright test --reporter=line       # 全量；balance-sim 首跑 flaky 是环境成本（D4），重试即过
```

## 已知陷阱（沿用，前几轮踩过）

1. HANDOFF 可能是错的：接手先 grep 核对现状，别照待办闷头改。
2. dev server HMR 回写：改多处时先停 dev server，或每步 tsc 验证。
3. 大块编辑后用 tsc 逐步验证，防误插重复块。
4. 不轻信单条命令输出，交叉验证（grep 管道曾写坏输出误判文件损坏）。
5. 静态正则校验易假阳性（known-issues C 节）：站位/对话校验要在浏览器里调真实模块跑。
6. 测试一律走 `window.__mod` 取模块，不用 `import()`（会拿到另一个模块实例）。
