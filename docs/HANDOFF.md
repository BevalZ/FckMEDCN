# 阶段性总结 - A3 回归已补、测试基建稳定

## 当前状态

- **B2（NPC 站位）、B6（lifecycle-sim 偶发）、A3（ESC 取消）均已修已验**，
  全量 28 用例绿（exit=0）。
- **测试基建**：所有场景等待统一放宽到 120s（Windows 首启 Chromium + Phaser 环境成本，
  见 known-issues D4）；lifecycle-sim 已播种（mulberry32），结果确定可复现。
- **git 仓库已重建**（2026-07-30），三个提交：initial → B6 → A3。
- ⚠️ `reuseExistingServer` 会复用 5173 残留 dev server；行为异常先查端口（已杀过 3 天前的残留进程）。

## 下一轮候选（按优先级）

1. **B3（链式事件 ESC 回滚）** — 与 esc-cancel 测试同文件续写最顺手：
   领带 nextEventId 的事件 → 选项进链 → 中途 ESC → 断言链上 once 事件未被永久屏蔽。
   若复现 bug，修法：进链时记录涉及的所有 once id 统一回滚（cancelEvent 目前只回滚当前 ev）。
2. **④ 新闻时序与 NEWS_TICKER 系统性对齐** — 路线图剩余唯一大块。
   `src/data/news.ts` vs 游戏内 year/quarter 推进，逐条核对 ticker 与阶段是否违和。
3. **B4（旧存档 sceneKey 兼容）** — 构造旧格式存档（sceneKey: 'InternshipScene' 等卡片场景）
   读档，断言不白屏、不串场景；可写成测试。
4. **A2（文字裁剪）** — 纯目视项，只能人工；A1 已有 campus.spec 覆盖视为已验。

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
