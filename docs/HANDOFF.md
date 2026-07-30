# 阶段性总结 - NPC 站位边界校验(B2) 代码完成、待跑验证

## 当前状态

**known-issues.md B2** 的代码修改已全部完成，卡在"跑验证"这一步：
本轮结束时 shell 工具不可用（`npx tsc` / `npx playwright test` 一次都没跑成），
所以下面的改动**只经过人工核对，尚无编译与测试证据**。

### 已完成部分

1. **`npcTileNear` 站位搜索**（上几轮）:
   - `src/ui/npcPlacement.ts` 导出 `npcTileNear(grid, doorCol, doorRow, index)`
   - 按 `CANDIDATE_OFFSETS` 优先级搜门口周围可行走格，跳过门口本格与实心/越界格
   - 同一地点第 n 个 NPC 取第 n 个候选，自然错开；找不到则返回 null，调用方跳过该 NPC

2. **三个可行走场景已全部接入**（上一轮就做完了，旧 HANDOFF 漏记）:
   - `CampusScene` / `HospitalScene` / `GuipeiWalkScene` 各自：
     字段 `private isSolid`、create 里从 `renderTileMap` 存 `isSolid`、`placeNpcs` 改用 `npcTileNear`
   - 硬编码偏移 `c.x + 40 + n * 30, c.y + 34` 三处已全部移除
   - 上一轮结束时 `npx tsc --noEmit` 曾跑通（本轮改动后未再跑）

3. **本轮补的坑：实习/规培 NPC 数据层其实是空的**
   - 旧 HANDOFF 写"`src/data/npc.ts` 已加实习/规培 NPC"，实际**只加了对话池 TALKS**，
     `NPCS` 数组里没有对应的 `NpcDef`
   - 后果：`npcsForStage('internship'|'guipei')` 恒为空 → 两张医院图上一个 NPC 都不出现，
     B2 的修复在这两张图上从未被执行到，三段对话也是永远看不到的死内容
   - 已补 `attending` 林主治 / `headnurse` 刘护士长 / `fellow` 赵师姐三个 NpcDef，
     schedule 只用对应地图真实存在的地点 id（人工逐格核对过，全部落在可行走格）

4. **`makeIsSolid` 提取为单一事实源**
   - `src/ui/tilemap.ts` 新增 `export function makeIsSolid(spec)`；
     碰撞体合并循环与 `RenderedTileMap.isSolid` 都改用它，回归测试也用同一份
   - 目的：不让测试自己复制一遍 `solid.includes(...)` 规则后悄悄漂移

5. **回归测试已写好**（`tests/npc-placement.spec.ts`，未跑过）
   - 用例一：三张地图 × 24 季 × 全部 NPC，逐个断言落脚格
     非空 / 非实心 / 不在门口本格 / 同地点不重叠；并断言三张图各自至少有 1 个 NPC 上场
     （这一条正是能抓住第 3 点那个"空数组"问题的断言）
   - 用例二：对话池 ↔ NpcDef 双向对齐（有立牌没对话、有对话没立牌，两种都报错）
   - 走 `window.__mod` 取模块，不用 `import()`（否则拿到另一个模块实例，见 `src/main.ts` 注释）
   - 为此在 `src/main.ts` 的 DEV 暴露块里加挂了 `gm`(guipeiMap) / `np`(npcPlacement) / `tm`(tilemap)

## 继续的起点

**先跑验证，不要先写新代码**：

```bash
cd "D:/Github_repos/Hydens/FckMedCN"
npx tsc --noEmit                                  # 期望零错误
npx playwright test npc-placement --reporter=line  # 期望 2 passed
npx playwright test --reporter=line                # 全量，确认没碰坏别的
```

注意 `tsconfig.json` 的 `include` 只有 `src`，**`tests/` 不在 tsc 覆盖范围内**，
测试文件的类型错误只会在 playwright 跑起来时才暴露。

三条都过之后：
1. 把 `docs/known-issues.md` B2 从「已修待验」改为「已修已验」，删掉"待验"那两行
2. 试玩确认：进实习场景，林主治在病房/手术室门口、刘护士长在护士站/食堂门口，能走近按 E 对话

若 `npc-placement` 失败，看控制台打印的 `[kind] map turn=N npc@spot — detail`：
- `solid`/`no-tile` → 门口周围候选不够，扩 `npcPlacement.ts` 的 `CANDIDATE_OFFSETS`
- `unknown-spot` → schedule 写了该图不存在的地点 id，改 `src/data/npc.ts` 的 schedule
- `overlap` → 同一地点 NPC 数超过可用候选格，调 schedule 错开

## 已知陷阱(之前几轮踩过的坑)

1. **HANDOFF 自己可能是错的**：上一版 HANDOFF 声称"数据层已完成"和"三个场景待改"，
   两条都与实际相反。接手时先 grep 核对现状，再决定做什么，别照着待办列表闷头改。
2. **dev server HMR 回写**：编辑时若 vite dev server 在跑，HMR 可能在 Edit 间回写文件，
   导致改动看似"没生效"。改多处时先停 dev server，或每步 tsc 验证。
3. **误插重复块**：之前插 `placeNpcs` 时误插两份，导致 8 个"Duplicate function"。
   用大块唯一匹配 + 逐步 tsc 避免。
4. **不轻信单条命令输出**：曾有一次 grep 管道写坏，输出数百个 `};` 误判文件损坏，
   实际 `tsc` 通过即证明文件完好。要交叉验证。
5. **静态正则校验易假阳性**（known-issues C 节）：所以这轮的站位校验是在浏览器里
   调真实模块跑的，不是扫源码文本。

## 文件清单(本轮改动)

- ✅ `src/data/npc.ts` — 补 3 个实习/规培 NpcDef；导出 `TALK_IDS` 供测试双向对齐
- ✅ `src/ui/tilemap.ts` — 抽出 `makeIsSolid(spec)`，渲染与校验共用
- ✅ `src/main.ts` — DEV 暴露块加挂 `gm` / `np` / `tm`
- ✅ `tests/npc-placement.spec.ts` — 新建，2 个用例（**未跑过**）
- ✅ `docs/known-issues.md` — B2 更新为「已修待验」，记录数据层缺口与新回归
- ⏸ 验证 — `tsc` / `playwright` 本轮均未执行
