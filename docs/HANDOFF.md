# 阶段性总结 - B3 链式 ESC 已闭环，发现 B7 场景链缺失

## 当前状态

- **B2（NPC 站位）、B6（lifecycle 偶发）、A3（ESC 取消）、B3（链式 ESC）均已修已验**，
  全量 29 用例绿（exit=0；balance-sim 首跑 flaky 是 Windows 环境成本，见 D4）。
- **测试基建**：场景等待统一 120s；lifecycle-sim 已播种可复现；
  esc-cancel 三例覆盖 NPC 退还 / once 回滚 / 链上禁 ESC。
- **git 仓库健康**，工作区干净，提交历史连续。

## 下一轮候选（按优先级）

1. **B7（实习/规培场景不续接链式事件）** — B3 排查时的连带发现。
   `HospitalScene`/`GuipeiWalkScene` 的 handleChoice 没有 resolveChained，
   规培链（m2_gp_quit_think→confirm→left/stay 等）即时续接被静默丢弃。
   修法：移植 CampusScene 的 `resolveChained` + `openEvent(ev, chained)`（保持链上禁 ESC），
   并在 esc-cancel 或新文件补规培链回归。先确认疏漏 vs 有意（倾向疏漏，见 known-issues B7）。
2. **④ 新闻时序与 NEWS_TICKER 系统性对齐** — 路线图剩余唯一大块。
   `src/data/news.ts` vs 游戏内 year/quarter 推进，逐条核对 ticker 与阶段是否违和。
3. **B4（旧存档 sceneKey 兼容）** — 构造旧格式存档读档，断言不白屏、不串场景；可写成测试。
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
