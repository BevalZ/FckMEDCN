# 阶段性总结 - B4 已闭环，known-issues 可行动项仅剩 B1/A2

## 当前状态

- **路线图 ①②③④ 全部完成**；known-issues **B2/B6/A3/B3/B7/B4 全部已修已验**。
- 全量 **36 用例绿**（exit=0，balance-sim 首跑 flaky 是 Windows 环境成本，见 known-issues D4）。
- git 仓库健康，工作区干净。
- 剩余项：**B1**（HMR glTexture，疑似仅开发期，需生产 build 验证）、
  **A2**（文字裁剪，纯目视人工项）。

## 下一轮候选

1. **B1（HMR glTexture）** — 生产 build（`npm run build` + `vite preview`）里快速划过
   高考选项，看 `labelText.setColor` 的 null 报错是否复现；同时顺便验证构建本身是否健康
   （回归清单的 build 步骤久未执行）。不复现则标记"仅开发期"关闭。
2. **A2（文字裁剪）** — 纯目视，只能人工，建议用户试玩时确认大标题/卡片标题/HUD 小字。
3. 之后路线图与 known-issues 均无开发项，与用户确认新方向（事件扩充/数值/新系统）。

## 场景转换测试经验（写新测试前先读）

- 医院出生点在办公室门口，**不是**睡觉点：睡觉得先 `tileCenter` 传送到值班室 door `[25,11]`。
- 各场景 MAX_TURNS：本科 20 / 实习 **5** / 规培 12 / 硕 12 / 博 16 / 求职 4 / 职业 12
  （从场景源码读，lifecycle-sim 的 STAGE_PLAN 是模拟自用节拍，别当事实源）。
- 转换断言卡壳时，先写无断言诊断用例打印每步 `getScenes(true)` 列表，比猜快。

## 验证基线（每次大改后）

```bash
npx tsc --noEmit                          # 零错误（include 仅 src，tests/ 不在覆盖范围）
npm run build                             # 构建通过
npx playwright test --reporter=line       # 全量；balance-sim 首跑 flaky 是环境成本（D4），重试即过
```

## 已知陷阱（沿用，前几轮踩过）

1. HANDOFF 可能是错的：接手先 grep 核对现状，别照待办闷头改。
2. dev server HMR 回写：改多处时先停 dev server，或每步 tsc 验证。
3. 大块编辑后用 tsc 逐步验证，防误插重复块。
4. 不轻信单条命令输出，交叉验证（grep 管道曾写坏输出误判文件损坏）。
5. 静态正则校验易假阳性（known-issues C 节）：站位/对话校验要在浏览器里调真实模块跑。
6. 测试一律走 `window.__mod` 取模块，不用 `import()`（会拿到另一个模块实例）。
