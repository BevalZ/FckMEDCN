# 已知问题与潜在隐患

本文件专门记录开发/试玩过程中暴露的 bug、修复后待回归的项，以及排查中注意到但尚未验证的隐患。
与 `stardew-roadmap.md` 的「遗留」区别：那里记的是**功能未做完**，这里记的是**可能出错的地方**。

状态标记：
- `已修待验` — 代码已改、`tsc` 通过，但尚未在浏览器/测试里回归确认
- `待查` — 注意到的隐患，尚未定位或验证是否真会触发
- `已修已验` — 修复且回归通过
- `设计如此` — 看起来像 bug，实为有意为之，记录以免反复

---

## A. 本会话试玩暴露、已修待验

### A1. 行动点耗尽后卡死 ｜ 严重 ｜ 已修待验
- **现象**：一个季度 3 个行动点用完后，画面冻结，无法操作。
- **真正根因**：`refreshInfoBar()` 里 `'●'.repeat(this.actionsLeft)`，当 `actionsLeft` 跌到 -1 时
  `String.prototype.repeat(-1)` 抛 `RangeError: Invalid count value: -1`，刷新函数崩溃 → 画面卡死。
  （来自 dev server 日志 `RangeError ... at CampusScene.refreshInfoBar:172`。）
- **次因**：CampusScene 里 NPC 对话优先级高于地点交互，室友日程 turn 0/2 恰在**宿舍**（睡觉点），
  行动点耗尽走到宿舍时室友挡路，按 E 触发对话而非睡觉。
- **修复**（Campus / Hospital / GuipeiWalk 三个可行走场景）：
  1. 显示层钳制 `'●'.repeat(Math.max(0, this.actionsLeft))`
  2. 源头钳制 所有 `this.actionsLeft--` → `Math.max(0, this.actionsLeft - 1)`
  3. CampusScene：行动点耗尽时禁用 NPC 对话，让"回宿舍睡觉"能触发
- **待验**：3 行动点用完 → 走回睡觉点 → 应正常结束本季、进入下一季。

### A2. 中文文字顶部约 1/3 被裁 ｜ 中 ｜ 已修待验
- **现象**：部分文字上半部分被切走。
- **根因**：`config.pixelArt=false` 时 Phaser 把 Text 渲染成 canvas 贴图，贴图高度按 fontSize
  估算 ascent，中文实际上沿常超出该估算，顶部被裁。
- **修复**：`src/ui/textPatch.ts` 全局补丁，在 `new Phaser.Game()` 前 `installTextPatch()`，
  包装 `GameObjectFactory.text`，给所有 `add.text` 自动补顶部 padding（约 20%，最少 3px），
  一次性覆盖全项目 93 处。clone style 防污染、尊重已写 padding、幂等。
- **待验**：各阶段标题/正文/选项/HUD 文字顶部应完整；尤其 GaokaoScene 52px 大标题、
  EventCard 18px 标题、HUD 10px 小字这三种字号都要看。
- **潜在副作用**：padding 使 Text 变高。基于实测 `height` 的布局（EventCard/InteractPrompt）
  会自适应，但**定死 y 坐标**的文字可能轻微下移。需目视确认没有错位。

### A3. 进入对话无法退出 ｜ 中 ｜ 已修已验
- **现象**：进对话后只能选一项才能出来，没有取消途径。
- **修复**：EventCard 加可选 `onCancel`，ESC 触发；三个可行走场景传入 `cancelEvent(ev)`，
  干净回滚（撤销 once 标记、退还 NPC 可聊资格并重新点亮感叹号、不消耗行动点、解冻角色）。
  卡片右上角显示 `ESC 离开`。
- **设计边界**：卡片式阶段（硕博/求职/职业，BaseStageScene）**不**提供 ESC 取消——
  那里事件即本回合，取消会导致回合无法推进。见 [D1]。
- **已验**（2026-07-30）：新增 `tests/esc-cancel.spec.ts` 两条用例——
  ① NPC 对话 ESC 后 talkedThisQuarter 退还、行动点不扣、可立刻重聊；
  ② once 事件 ESC 后 firedEvents 标记回滚。全量 28 passed。

---

## B. 排查中注意到、待查

### B1. HMR 热重载期的 glTexture null 报错 ｜ 低 ｜ 待查（疑似仅开发期）
- **现象**：dev server 日志出现 `TypeError: Cannot read properties of null (reading 'glTexture')`
  指向 `GaokaoScene.ts:108` 的 `labelText.setColor(...)`，以及类似的 pointerout 回调。
- **判断**：时间戳都在改代码触发 HMR 的瞬间——旧场景 GameObject 被销毁（WebGL 贴图释放），
  残留的 `pointerover/out` 事件回调仍引用它。**疑似仅热重载产物，正常游玩与生产构建不出现**。
- **待查**：生产 build 里快速划过高考选项时是否复现。若复现，需在 `pointerout` 回调里判空
  或在 `shutdown` 时解绑事件。

### B2. NPC 站位挡交互点 / 站进墙里 ｜ 中 ｜ 已修已验
- **现象**：早期 NPC 距门口 26px，站门口时按 E 永远触发对话、进不去地点（曾导致测试失败）。
- **已处理**：CampusScene 用"谁更近"优先级 + 行动点耗尽禁用对话。
- **修复**：三个可行走场景均改用 `npcTileNear` 搜索门口周围的可行走格，跳过门口本格和
  实心/越界格；同一地点的多个 NPC 按候选序号错开。没有可用格时跳过该 NPC，避免生成不可达对象。
  硬编码偏移 `c.x + 40 + n * 30, c.y + 34` 已从 Campus/Hospital/GuipeiWalk 三处全部移除。
- **顺带发现的更大问题**：`NPCS` 里**根本没有实习/规培阶段的 NpcDef**——
  对话池 TALKS 写好了 `attending`/`headnurse`/`fellow` 三段内容，却没有对应的 NPC 定义，
  于是 `npcsForStage('internship'|'guipei')` 恒返回空数组：两张医院图上一个 NPC 都没有，
  B2 的修复在这两张图上从未被执行到，那三段对话也是永远看不到的死内容。
  已补上三个 NpcDef（林主治 / 刘护士长 / 赵师姐），schedule 只用对应地图真实存在的地点 id
  （跨 internship+guipei 的刘护士长只用两图共有的 `er/canteen/office/nurse/callroom`）。
- **单一事实源**：`tilemap.ts` 抽出纯函数 `makeIsSolid(spec)`，渲染碰撞体、`RenderedTileMap.isSolid`
  与回归测试共用同一份实心判定，避免测试自己复制一份规则后悄悄漂移。
- **回归**：新增 `tests/npc-placement.spec.ts`，覆盖三张地图 × 24 季 × 全部 NPC，断言
  落脚格非空、非实心、不在门口本格、同地点不重叠；并双向校验"对话池 ↔ NpcDef"对齐
  （靠后者才发现上面那个空数组问题）。
- **已验**（2026-07-30）：`npx tsc --noEmit` 零错误；`npx playwright test npc-placement` 2 passed
  （三图上场 NPC 数 campus=4 / hospital=2 / guipei=2，空数组问题确已消除）；全量 26/27，
  唯一失败是 lifecycle-sim 的统计波动（见 B6），与本次改动无关。
  剩余人工项：试玩确认实习场景里林主治站在手术室/病房门口、刘护士长站在护士站/食堂门口，
  走近按 E 能对话（自动测试只断言落格合法，不覆盖按键交互）。

### B3. 链式事件中途 ESC：once 回滚正确，但存在"免费效果"漏洞 ｜ 中 ｜ 已修已验
- **排查结论**（2026-07-30，代码走查 + 回归测试）：原担心的"链上 once 被永久屏蔽"**不成立**——
  `cancelEvent` 回滚的正是当前链卡的 once 标记；上游卡标记保留也对（选项已提交、效果已生效）。
- **但发现真漏洞**：链卡上按 ESC 会"退还"行动点且不置 storyletUsed，
  而上游选项的 delta/flagSet 已提交——玩家可白拿上游效果零成本，再领本季另一个 storylet。
- **修复**：`CampusScene.openEvent(ev, chained)` 加 chained 参数，链式续接卡不再传 onCancel——
  ESC 提示不渲染、按键无效，必须选完。根卡未做选择前 ESC 语义不变（A3 保护的就是这种）。
  语义边界：取消只发生在"尚未做出任何承诺"之前；一旦提交选项进链，就要走到底。
- **已验**：`tests/esc-cancel.spec.ts` 第三例——国奖链（apply → result）：
  链卡 ESC 不关闭、整链只扣 1 行动点、storyletUsed=true、两个 once 标记与 flag 均正确。
  全量 29 用例绿。

### B4. 存档跨场景兼容 ｜ 中 ｜ 待查
- **现象/疑点**：新增了 CampusScene/HospitalScene/GuipeiWalkScene 三个可行走场景，
  存档以 `sceneKey` 恢复。旧存档 `sceneKey` 可能是 `UndergradScene`/`InternshipScene`/`GuipeiScene`
  （卡片版）。这些卡片场景仍注册着，理论上能读，但玩家会在同一周目里从可行走版切到卡片版。
- **待查**：用旧格式存档（`sceneKey: 'InternshipScene'`）读档，确认不白屏、不串场景；
  以及可行走场景存的档在卡片场景注册被移除后是否安全降级。

### B5. determineEnding 的 flag 来源已核实 ｜ — ｜ 已验证无死结局
- **背景**：核对 `determineEnding` 引用的全部 flag 是否都有事件 `flagSet` 来源，
  防止出现"永远触发不到的死结局"。
- **结论**：全部有来源，**无死结局**。曾一度怀疑 `industry_intern`/`base_home`/
  `chose_grassroots` 无来源，是校验脚本的假阳性；实际来源：
  `industry_intern` → events_master_phd.ts、`base_home` → events_guipei.ts、
  `chose_grassroots` → events_track.ts。
- **待办**：把可靠的校验脚本（扫 `flagSet:'x'` vs `flags.has('x')`，注意引号/空格）
  纳入回归，防止将来新增结局判定又漏配来源。

### B6. lifecycle-sim 曝光率断言骑线、偶发失败 ｜ 低 ｜ 已修已验
- **现象**（2026-07-30 全量回归时发现）：`lifecycle-sim.spec.ts` 断言造假流
  `exposedRate > 40`（n=40），实测在 35% / 37.5% / 53% 间波动，全量跑时偶发失败，
  单跑重试常能通过。
- **根因**：`runLife` 的 `seedTag` 只记录不使用，随机数未播种；真实曝光率约 40~50%，
  阈值 40 恰好骑在分布下沿，n=40 的蒙特卡洛波动（标准误约 ±7~8%）必然偶发越线。
- **修复**（2026-07-30）：双管齐下——`page.evaluate` 开头用 mulberry32(20260730)
  替换 `Math.random`（页面内所有模块共用，整个模拟变为确定性），同时把阈值降到 30
  给未来数值平衡微调留余量（仍足以与诚实流 0% 区分）。播种后确定结果：造假 45% / 诚实 0%。
- **已验**：单测连跑 3 次全过；全量 exit=0（26 passed + balance-sim 1 flaky，重试即过）。
- **遗留观察**：balance-sim 同样未播种，本次全量出现过 1 flaky（重试即过），
  若日后成为瓶颈可按同法播种。

### B7. 实习/规培可行走场景不续接链式事件 ｜ 中 ｜ 已修已验
- **现象**（2026-07-30 B3 排查时发现）：`HospitalScene` / `GuipeiWalkScene` 的
  `handleChoice` 没有 `resolveChained`/`nextEventId` 处理（CampusScene 有）——
  选项带 nextEventId 时链条被静默丢弃。
- **影响**：规培链 `m2_gp_tonggang→reply`、`m2_gp_quit_think→confirm→left/stay`、
  `m2_gp_26h→after_26h` 在可行走规培场景里不会即时续接。链目标都是 once+requireFlag，
  flag 由根选项设置，故后续季度仍可能被自然抽到——内容不死，但失去即时的戏剧连贯性
  （"今晚交申请，当晚出结果"变成"几季后莫名其妙抽到后续"）。
  实习阶段目前无 nextEventId 事件，暂不受损。
- **修复**（2026-07-30）：两个场景补齐 CampusScene 同款 `resolveChained` +
  `openEvent(ev, chained)`（链上禁 ESC 的 B3 语义一并保持）。确认为疏漏：
  三场景 handleChoice 同模板复制，Campus 后加链条时未同步。
- **已验**：新增 `tests/guipei-chain.spec.ts`——真实走过 校园→医院→规培 两级转换，
  开「同岗同酬」选「跟教学部反映」即时续接「教学部的回复」，链上 ESC 不关闭、
  整链只扣 1 行动点、双 once 标记与 gp_asked/gp_tonggang_no flag 均正确。全量 30 用例绿。
- **测试经验**（下次写场景转换测试用得上）：
  ① 医院出生点在办公室门口，**不是**睡觉点——睡觉得先传送到值班室 `[25,11]`；
  ② 实习 `MAX_TURNS=5`（不是 lifecycle-sim STAGE_PLAN 写的 4，那是模拟自用的节拍）；
  ③ 断言卡壳时先写无断言的诊断用例打印每步场景列表，比猜快。

---

## C. 更早修复、已验（存档，防回归时遗忘）

- **稀有事件在分类切片下被放大** — 已修（`turnFlow.RARE_WEIGHT`），有回归测试 `storylet-rarity.spec.ts`。
- **测试拿到不同模块实例**（`import()` vs 应用相对路径）— 已统一从 `window.__mod` 取，
  修正了 balance-sim / storylet-rarity / spot-coverage / event-reachability 四个测试。
- **手写事件被程序化事件淹没**（占比仅 4%~12%）— 已修（`turnFlow` 手写优先 65%）。
- **hospital.spec.ts `spotsCount: -1`** — 曾误读 `__mod.cm`（campusMap），已改为 `__mod.hm`（hospitalMap），2 passed。
- **配置类隐患已有静态回归兜底** — 新增两个纯静态测试（不启浏览器，约 0.6s）：
  `ending-flag-sources.spec.ts`（结局 flag 无死结局 + 全部 requireFlag 无死事件）、
  `event-integrity.spec.ts`（nextEventId 无悬空、事件 id 无重复、requireStat 区间合法、
  effect.kind 声明/实现/使用三方对齐）。已核实：296 事件 id 无重复、27 个 nextEventId 无悬空、
  22 个 requireStat 合法、7 种 effect 完全对齐、80 个 requireFlag 无死事件。

### 静态校验的假阳性陷阱（反复踩中，记录以警示）
写这类"扫源码文本"的校验时，字面量正则会漏掉**动态构造**的 flag/kind，产生假阳性：
- `setFlag(\`trust_${id}\`)`、`setFlag('school_tier_' + tier)` — 模板/拼接，字面量正则扫不到。
  解法：requireFlag 校验用**动态前缀白名单**（`trust_`/`distant_`/`school_tier_`）。
- `clinicEvent(..., kind: 'routine'|...)` — 函数参数里的 `kind:`，被"抓所有 kind:'x'"的正则
  误当成 effect.kind。解法：effect 校验必须限定 `effect: { kind: 'x' }` 上下文。
**教训**：任何"扫出的孤儿项"都要 grep 二次确认再下结论，不可直接写进文档（见 B5 的更正过程）。

---

## D. 设计如此（非 bug，记录以免反复改）

### D1. 卡片式阶段无 ESC 取消
硕博/求职/职业（BaseStageScene）每回合自动弹一个事件，事件即本回合。若允许 ESC 取消，
回合无法推进，会造成新的"卡死"。故 ESC 取消**只给可行走场景**。见 [A3]。

### D2. 造假一次也可能不被查
`integrity.ts` 是概率引擎：小造假约 23% 被查，不是必被查。玩家一次侥幸过关是**设计意图**
（对应 `lucky_fraud` 结局），不要当成"造假检测失效"去修。

### D3. 本科多数打法存款为负
本科阶段 income(3000) < cost(3800) 是刻意设计（学制长、花费大）。负债是真实后果，
不是数值配错。

### D4. balance-sim 首跑超时是环境成本，非游戏逻辑
全量回归常报 `balance-sim 1 flaky`（重试即过）。已逐层排除：
 vite 服务器秒回（curl 实测 <0.1s）、该用例无断言、杀了 7-27 残留的 vite 进程也无改善。
真因是 Windows 上每轮首次启动 Chromium + 解析 Phaser 1.4MB 的环境成本（杀软扫描），
偶超 120s 卡在 `waitForScene('TitleScene')`；retry 时环境已热，秒过。
`retries:1` 是为此设的兜底，exit 恒为 0，看到 "1 flaky" 不必排查。
另：`reuseExistingServer:true` 会复用 5173 上残留的旧 dev server——
若行为异常先查端口占用（曾发现 3 天前的 vite 还在跑）。

---

## 回归清单（每次大改后过一遍）

```
npx tsc --noEmit                       # 零错误
npm run build                          # 构建通过
npx playwright test --reporter=line    # 冷启动可能超时，retries:1 已配
```

试玩必测路径：
1. 高考 → 本科校园：走动、进地点领事件、和 NPC 说话、ESC 取消、行动点耗尽睡觉推进
2. 本科毕业 → 实习医院：场景过渡、交互点、小游戏（缝合）
3. 实习 → 规培可行走 → 硕博卡片：阶段衔接不白屏
4. 造假线：硕博选造假 → 观察风险指示 → 数季后可能东窗事发 → 对应结局
5. 心理归零：连续高压 → 触发 MentalCrisisScene
