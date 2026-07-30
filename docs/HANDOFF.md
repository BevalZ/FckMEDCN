# 阶段性总结 - B2/B6 已验证闭环、git 仓库已重建

## 当前状态

known-issues.md 的 **B2（NPC 站位）与 B6（lifecycle-sim 偶发失败）均已修已验**，
全量回归绿（exit=0，27 用例；balance-sim 偶发 flaky 但重试即过，暂未处理）。
**git 仓库已重建**：此前 `.git/` 是空目录（无 HEAD/objects），工作成果长期无版本控制；
2026-07-30 已 `git init` + 首次提交（`4c2b184`，master，工作区干净）。
`.codebuddy/` 已加入 .gitignore。

## 下一轮候选（按优先级）

1. **A3（ESC 取消对话）补自动化回归** — 目前零测试覆盖，只验过人工。
   可复用 `tests/campus.spec.ts` 的行走/交互套路：
   走到 NPC 旁按 E 开卡 → ESC → 断言行动点不减、感叹号恢复、可再次交互；
   再补一例"地点事件 ESC 后 once 标记回滚"。
   注意 `cancelEvent` 在三个可行走场景各自接线，都要验（或至少 campus+hospital）。
2. **B3（链式事件 ESC 回滚）** — 与 A3 测试天然连着：
   领带 nextEventId 的事件 → 进链 → 中途 ESC → 断言链上 once 事件未被永久屏蔽。
   若复现 bug，修法方向：进链时记录涉及的所有 once id 统一回滚。
3. **④ 新闻时序与 NEWS_TICKER 系统性对齐** — 路线图剩余的唯一大块。
   `src/data/news.ts` vs 游戏内年份推进（year/quarter），逐条核对 ticker 内容
   与所处阶段是否违和（如 2030 年新闻出现在本科 2024）。
4. **A1/A2/B4** — A1 已有 campus.spec 覆盖可视为已验；A2（文字裁剪）纯目视，只能人工；
   B4（旧存档 sceneKey 兼容）需构造旧格式存档读档，适合写测试。

## 验证基线（每次大改后）

```bash
npx tsc --noEmit                          # 零错误（include 仅 src，tests/ 不在覆盖范围）
npx playwright test --reporter=line       # 全量；balance-sim 偶发 flaky 属已知
```

## 已知陷阱（沿用，前几轮踩过）

1. HANDOFF 可能是错的：接手先 grep 核对现状，别照待办闷头改。
2. dev server HMR 回写：改多处时先停 dev server，或每步 tsc 验证。
3. 大块编辑后用 tsc 逐步验证，防误插重复块。
4. 不轻信单条命令输出，交叉验证（grep 管道曾写坏输出误判文件损坏）。
5. 静态正则校验易假阳性（known-issues C 节）：站位/对话校验要在浏览器里调真实模块跑。
6. 测试一律走 `window.__mod` 取模块，不用 `import()`（会拿到另一个模块实例）。
