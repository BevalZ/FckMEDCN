# 星露谷化改造方案：从"文字选择器"到"可操控世界"

> 状态：**M1–M5 主线均已落地**。后续可做阶段真换图、更多题库、移动端摇杆。
> 前置：2026-07 的正确性/结构修复已全部落地（kin_all_gone、金钱单位、权重再平衡、
> 声明式 effect、flagRequire/flagExclude 实装等），本方案在该基线之上展开。

## 0. 目标与不变量

**目标**：把当前"每回合自动弹事件卡"的交互，升级为星露谷式的可行走场景——
玩家用键盘操控角色在地图中移动，走到交互点主动触发事件，配合时间系统形成
"探索 → 交互 → 结算 → 睡觉进入下一季度"的循环。

**不变量（最有价值的资产，不动）**：

- Storylet 事件池：`events_*.ts` + `eventGen.ts` 共 5000+ 事件，
  `getAvailableEvents` 过滤 + `weightedRandom` 加权抽取。
- flag / requireStat / requireMarital 门控体系与 `effects.ts` 声明式副作用。
- 经济系统 `economy.ts`（季度结算）与结局判定 `endings.ts`。
- 事件卡片 UI（`EventCard.ts`）——星露谷的对话框同样是全屏文本+选项，保留即可。
- 零素材管线：所有贴图由 `pixelArt.ts` 程序生成，本方案延续此风格。

**核心改动只有一层**：

```
现在:  advanceTurn → weightedRandom(全部池) → EventCard
目标:  玩家移动 → 走到交互点按E → weightedRandom(该地点分类池) → EventCard
                └ 时间流逝 → 睡觉/下班 → 季度结算(economy不变)
```

---

## M1 — 可行走场景基础（核心投入）✅ 已完成

### 1.1 玩家控制器

- Arcade Physics 精灵；方向键 / WASD 四向移动 + 碰撞。
- 扩展现有 `CharacterSprite` 为 4 方向 × 3 帧行走动画（程序生成帧，
  与 `pixelArt.ts` 同一套调色板）。

### 1.2 地图方案：ASCII 网格 + 程序生成 tile

用字符串定义网格地图，运行时为每种字符生成 16px tile 贴图并拼成 tilemap：

```ts
const WARD_MAP = [
  '################',
  '#B..B..B..B...D#',   // B=病床 D=门 T=办公桌
  '#..............#',
  '#....T.T.......#',
  '######D#########',
];
```

- 美术风格与现有 `pixelArt.ts` 一致；日后想换真素材只需替换 tile 贴图，地图数据不动。
- **不引入 Tiled**：工具链成本高，ASCII 方案对本项目的地图复杂度完全够用。

### 1.3 交互系统

- `Interactable` 类 = 触发区域 + 分类标签 + 提示浮字（`[E] 查房`）。
- 玩家进入范围显示提示，按 E 触发回调（回调里走事件抽取，见 M2）。

### 1.4 摄像机

- `camera.follow(player)` + 地图边界钳制。
- 960×540 视口不变，地图可以比视口大。

---

## M2 — Storylet 接入 + 时间系统（玩法闭环，设计上最关键）✅ 已完成

### 2.1 分类 → 地点映射

交互点触发时，先经 `getAvailableEvents` 全量过滤，再按分类过滤后抽取：

| EventCategory | 地点 |
|---|---|
| `clinical` | 病房 |
| `study` | 图书馆 / 自习室 |
| `social` | 走廊 NPC / 食堂 |
| `mental` | 宿舍 / 天台 |
| `financial` | 公告栏 / 手机 |
| `career` | 主任办公室 |

### 2.2 时间系统

一个"季度"变成一个可行走的"日"，两个候选粒度：

- **A. 星露谷式时钟**：6:00 → 24:00 连续流动，每次交互消耗若干小时。
- **B. 行动点制（更简单，建议先做）**：每季度 3–4 个行动点，每次交互消耗 1 点。

回宿舍睡觉 / 值班结束 → 触发现有 `applyStageEconomy` 结算 + 飘字 → 下一季度。

### 2.3 强制事件 = 过场

`nextEventId` 链和 `once` 高权重剧情事件（如 `anatomy_first_day`）做成 cutscene：
玩家一进地图就被拉进事件，等价于星露谷的过场动画。

### 2.4 架构：抽出 EventDirector，支持逐阶段迁移

把 `BaseStageScene` 里的事件调度逻辑（`triggerNextEvent` / `handleChoice` /
`pumpNewsForQuarter`）抽成独立的 `EventDirector` 服务：

- 地图场景和现有卡片场景**都能调用**同一个 Director。
- 因此可以**逐阶段迁移**：先把本科做成可行走，实习之后各阶段暂时保持卡片模式，
  游戏在任何时点都是完整可玩的。

---

## M3 — NPC 与日程 ✅ 已完成（见文末「M3」）

- 带教 / 室友 / 导师 / 护士长等 NPC，按阶段有简单巡逻路径或定点日程
  （星露谷 schedule 的极简版：每个时段站在哪个 tile）。
- 对话复用 EventCard；`relations` 属性直接当好感度用。
- 社交事件挂在具体 NPC 身上——"和室友聊天"比"人际事件弹窗"沉浸感强一个量级。

---

## M4 — 小游戏替代部分选择 ✅ 四类节点已落地

把关键节点的"选 A 还是 B"升级成操作，输出仍是 `StatDelta` + flag，
与现有系统无缝对接：

| 场景 | 玩法 | 结果映射 | 状态 |
|---|---|---|---|
| 缝合 / 穿刺 | 时机条（在绿区按键） | perfect/good → `suture_*`，miss → `suture_failed` | ✅ `TimingBarMinigame` + `clinical_skills_lab` |
| 心肺复苏 | 节奏按键（110 BPM，8 拍） | `cpr_saved` / `cpr_done` / `cpr_failed` | ✅ `CprRhythmMinigame` + `first_cpr` / `guipei_code_blue` |
| 期末 / 执医考试 | 限时答题（5 题 × 12s） | `exam_ace`/`exam_pass`/`exam_fail`；执医及格→`licensed` | ✅ `ExamQuizMinigame` + `licensure_exam` |
| 夜班 | 打地鼠式呼叫铃（1–5 键） | `night_shift_ace` / `night_shift_done` / `night_shift_mess` | ✅ `NightShiftMinigame` + `first_night_shift` |

实现要点：
- `GameEvent.minigame?: 'suture'|'cpr'|'exam'|'nightshift'` 声明式挂接。
- `launchMinigame()` 统一工厂；Campus / BaseStage 只认 `ActiveMinigame` 接口。
- 无小游戏路径仍可用默认选项（类型完整、可测）。

---

## M5 — 氛围打磨 ✅ tint + 脚步 + 任务清单

- ✅ 昼夜/季节色调 tint：`stageAmbientTint(stage, quarter)`
  - 本科随 Q1–Q4 春夏秋冬变色；规培/博士偏冷灰；职业偏暖褐。
  - 挂在 `CampusScene` 地图图与 `BaseStageScene` 背景上，跨季睡觉时刷新。
- ✅ 脚步声：`sound.footstep()` + `Walker.update` 按 220ms 节奏左右脚交替。
- ✅ 任务清单 UI：`QuestLog`（Q 键显隐），本科默认可视目标（行动点/事件/缝合/社交）。
- 阶段换图（校园→医院真换贴图）：仍用 tint + palette 区分，未引入新贴图。

---

## 技术要点与约束

1. **物理引擎用 Arcade** 就够（网格碰撞 + AABB），不要上 Matter。
2. **存档粒度不变**：仍按季度存（场景 key + state），玩家坐标不入档，
   进图回到出生点即可——避免 SaveBlob 升版。
3. **手机端**：`index.html` 目前 `user-scalable=no`；若要移动端可玩，
   M1 时就要留虚拟摇杆的口子，别等 M4 再补。
4. **工作量预估**：M1+M2 是大头（玩家控制器、tile 生成、时间系统、
   EventDirector 抽取，约 8–12 个新文件）；M3 起每期都是独立可发布的增量。

---

## 第一步：垂直切片

只把「本科阶段」改成可行走的校园地图：

- 宿舍、教学楼、图书馆、操场 4 个交互点；
- 行动点制时间条；
- 睡觉 → 季度结算；
- 其余阶段保持卡片模式（经由 EventDirector 共用调度逻辑）。

切片跑通后，所有后续阶段都是内容填充而非架构风险。

---

## 已实施（2026-07-26）

垂直切片已完成并通过构建与浏览器冒烟测试。实际落地与原方案的差异记录如下。

### 新增文件

| 文件 | 作用 |
|---|---|
| `src/data/turnFlow.ts` | 共享回合逻辑：`drawStorylet` / `hasStorylet` / `commitChoice` / `advanceQuarter` |
| `src/ui/tilemap.ts` | ASCII 网格 → 单张贴图 + 合并的静态碰撞体（水平连续段合并，420 格 → 42 个刚体） |
| `src/data/campusMap.ts` | 30×14 校园网格 + 6 个交互点（门口坐标 / 分类集合 / 日常活动） |
| `src/ui/Walker.ts` | 四向行走角色：4 方向 × 3 帧 24×36 贴图 + 动画 + 键位映射 |
| `src/ui/InteractPrompt.ts` | 地点标牌、`!` 事件标记、靠近时的 `[E]` 提示 |
| `src/scenes/CampusScene.ts` | 可行走的本科场景 |
| `tests/campus.spec.ts` | 冒烟测试：进入 / 行走 / 交互 / 睡觉推进季度 |
| `tests/storylet-rarity.spec.ts` | 回归测试：稀有事件不因分类切片被放大 |

### 与原方案的偏差

1. **未做 EventDirector 大抽取**。全量抽取会触及 7 个 stage 场景，风险与收益不匹配。
   改为抽出 3 个小函数放进 `turnFlow.ts`，`BaseStageScene` 与 `CampusScene` 共用。
   等第二个阶段也上地图时再考虑真正的 Director。
2. **交互键只用 E，不用空格**。`EventCard` 把 A..I 映射为选项，空格/回车用于提交，
   复用会误触。同时用 `JustDown` 守卫避免长按穿透。
3. **新增 `hasStorylet`**。存在性判断与掷骰分离——`!` 标记与每帧提示只需前者，
   否则每帧都要过滤 5000+ 事件并浪费随机数。可用性按季度缓存在 `availability` 里。

### 实测发现并修复的设计缺陷 ⚠️

浏览器实跑时，**第一次交互就抽到了「母亲走了」**。根因是分类切片：

| | 卡片模式（全池） | 切片后（宿舍，turn 0） |
|---|---|---|
| 池权重 | ~15,255 | 133 |
| 「母亲走了」单次抽中 | 0.03% | **3.0%** |
| 任一家人变故 | 0.11% | **12.8%** |

跨阶段人生事件（`life_death_*` w=3~6）的设计意图是"整个阶段偶尔来一次"，
按分类切片后池子缩小两个数量级，稀有度被放大约 100 倍。

**修复**：`drawStorylet` 中权重 ≤ 20 的稀有事件不参与切片内加权抽取，
改为各自按"在**整阶段池**中的占比"独立掷骰；切片只决定它是否在候选集内。
蒙特卡洛验证（每地点 4000 次）：宿舍家人变故率 **12.8% → 0.1%**，与卡片模式同量级。

> 教训：任何"缩小抽样池"的改动都会改变稀有事件的相对概率。
> 后续阶段地图化时，若引入新的池切分维度（如按 NPC、按时段），需重新验证这一点。

### 验证方式

```bash
npm run build     # tsc + vite，零错误
npm test          # Playwright 冒烟 + 稀有度回归，3 passed
```

`window.game` / `window.__state` 仅在 `import.meta.env.DEV` 下暴露给测试读取场景状态，
已确认不进生产包。

### 已知遗留

- ~~`field`（操场）与 `board`（公告栏）在阶段早期没有可用事件~~ → 已补写（见下）。
- ~~数值平衡尚未做 20 回合完整通关验证~~ → 已模拟并重调（见下）。

---

## 补完：事件覆盖与数值平衡（2026-07-26）

### 一、补写公告栏与操场事件

原先 `board` 只有 4 条本科事件（2 条被 flag 锁、1 条要 turn 12+），`field` 只有 5 条
（3 条被 flag/属性锁），玩家走过去常年 `!` 不亮。新增 18 条：

- **公告栏（financial / career / news / system）+12**：学费单、奖学金公示、家教招聘、
  实验室勤工助学、医保缴费、就业指导讲座、师兄返校分享、辅修双学位、伤医剪报、
  扩招新闻、义诊招募、交换生项目。
- **操场（mental）+6**：夜跑、院运动会、操场边长谈、心理咨询室的门、躺在草坪上、
  操场边给家里打电话。

新增回归测试 `tests/spot-coverage.spec.ts`：遍历 6 个地点 × 21 个回合，断言无空转回合。
修复前 `field`/`board` 在 turn 0 空转，现全部为 0。

### 二、20 回合数值平衡

新增 `tests/balance-sim.spec.ts`：在真实事件池 + 真实经济模型下跑满 20 回合，
对比 5 种打法。**首轮模拟暴露了原数值的严重问题**：

| 打法 | 体力 | 知识 | 心理 | 问题 |
|---|---|---|---|---|
| 极限自习 | 6（T8 触底） | 100（T8 封顶） | 65 | 触底后 12 回合毫无变化 |
| 均衡 | 100（T4 触顶） | 38 | **100** | 完全没有张力 |
| 摆烂 | 100 | 46 | 98 | 与均衡几乎无差别 |

体力在 T4~T8 就钉死在两端，心理从不低于 65——"卷 vs 保命"的核心张力根本不存在。
根因：休息类活动给得太慷慨，且**没有任何机制持续消耗心理**。

**调整**（`src/data/campusMap.ts`）：

1. 学习类成本上调、休息类恢复下调，吃饭改为花钱（-150）。
2. 新增 `academicAnxiety(turnsInStage, knowledge)`：按"期望知识曲线 vs 实际"的缺口
   扣心理。跟得上只扣 1，落后 30 点扣 6。
   *为什么不用固定扣减*：固定 -2 会被跑步 +5 完全抵消，摆烂流心理仍停在 98。
3. 新增 `exhaustionPenalty(stamina)`：体力低于 25 时折算成心理消耗。
   *此前体力只是个好看的数字——游戏里没有任何地方检查它，熬到 0 也没后果。*

**调整后**（自适应打法 = 模拟真实玩家按需调整）：

```
极限自习 / 贪心   → T8 心理归零，触发 MentalCrisisScene
摆烂             → 活下来，但知识仅 34、存款 -17000
自适应           → 知识 100、心理 55、体力在 24~41 间真实起伏
                   心理轨迹 63 → 36 → 55（有下探也有恢复）
```

### 三、测试配置

`playwright.config.ts` 固定 `workers: 1`：多 worker 会并发抢同一个 Vite dev server，
冷启动转译期容易超时，且各用例都会 `localStorage.clear()`，并行互相干扰。
连续 3 次全量运行均通过。

`tests/campus.spec.ts` 过滤无头环境的 AudioContext 设备报错（与游戏逻辑无关）。

## M3：NPC、临床/科研双线、学术造假机制（2026-07-26）

三个系统一起落地，因为它们互相咬合：科研压力产生造假诱惑，造假换来资源，
资源又反过来挤占临床时间。

### 一、临床 ⇄ 科研 双线（数值轴）

`Stats` 新增三个轴：`clinical`（临床力）、`research`（科研力）、`fakeRisk`（学术风险）。
放在 `Stats` 而非 `GameState` 里，是为了让 `StatDelta` 自动支持它们——
事件数据不需要任何引擎改动就能读写。

三条设计原则：

1. **对抗**：二者共享同一份时间。多数选项一升一降，
   如「今晚去实验室还是查房」：科研+6 临床-4 ／ 临床+6 科研-4 ／ 两头跑但体力-20。
2. **互促**：`requireStat` 门控，一侧攒到位才出现。
   `dt_clinical_question`（临床≥45）——管过足够多病人才能看见真问题；
   `dt_evidence_based`（科研≥40）——读过文献才敢和主任讨论指南之外的用法。
3. **偏科惩罚**：`dt_lopsided` 在求职时把短板摆到台面上。

HUD 第二行加了天平条 `🩺58 ⇄ 41🔬`（左青右紫，中线为均衡）与风险指示 `⚠️●●○○○`。
风险为 0 时不显示，避免给没造假的玩家无谓压力。

### 二、学术造假：累积风险 + 概率引爆

`src/data/integrity.ts`。造假不当场结算，而是往 `fakeRisk` 记一笔债：

```
addFakeRisk('minor'|'moderate'|'severe')  →  +10 / +18 / +30
每季度 rollIntegrity()：
  命中(risk/100 × 0.12) → 按风险分级引爆
      ≥55  ruin        撤销学位职称、多篇撤稿、声望-30、罚款
      ≥28  retraction  单篇撤稿、单位核查、声望-15
      其他 warning     匿名质疑，**不削减风险**（问题没解决）
  未命中 → 风险 -1，但保留底档 3（只要东西还挂在网上就有可能被翻出来）
selfReport() → 风险砍掉 70%，是唯一能真正洗白的手段
```

**参数经蒙特卡洛校准**（3000 局 × 60 季，见 `tests/m3-systems.spec.ts`）：

| 造假强度 | 被查率 | 最重等级分布 |
|---|---|---|
| 从不造假 | 0% | — |
| 一次小造假 | 22.9% | 全部止于 warning |
| 一次重造假 | 48.7% | warning 1158 / retraction 304 |
| 五次混合 | 98.0% | **ruin 2760** |

调参过程中改了两处：
- `TRIGGER_SCALE` 从 0.5 降到 0.12。原值下**连一次小造假都有 77% 被查**，赌博感荡然无存。
- `warning` 不再削减风险。原本会削减，导致玩家"被警告一次"就洗白，
  `ruin` 等级在 2 万次模拟里**一次都没触发过**。

**造假换来的资源是真实的**：`dt_fake_dividend_grant`（青年基金中标：40 万经费+学生名额）、
`dt_fake_dividend_title`（评上副高）、`dt_fake_dividend_recruit`（人才引进 30 万安家费）。
不给真收益，这个选择就没有诱惑力，也就不真实。

**未被查期间的侥幸事件**：专项自查没抽到你、论坛上一条"Figure 3 有点眼熟"、
学生来要原始数据、又一批集中撤稿的新闻。每一个都给出"主动撤稿"的出口。

已有的造假选项（`ug_fake_paper`、`academic_misconduct`、`m2_phd_deadend`）
也接入了风险引擎——此前它们只设一个死 flag。

### 三、NPC 与好感度

`src/data/npc.ts` + `src/ui/NpcSprite.ts`。本科 4 位（室友张宁、学长陈师兄、
带教李老师、辅导员王辅导员）按季度轮换所在地点；导师周教授跨硕博到职业阶段。

- 好感度 0..100，默认 40；跨过 70 打 `trust_<id>`、跌破 25 打 `distant_<id>`，
  供事件池门控（事件系统只认 flag）。
- 对话内容按好感度分档：疏远时是「张宁戴着耳机打游戏，你进门时他没抬头」，
  信任后是「张宁把泡面推过来一半」。
- NPC 对话消耗行动点，但**不占用**每季一次的 storylet 额度。

### 四、发现并修复的问题

**⚠️ 测试模块实例不一致（影响此前所有测试的可信度）**

`tests/m3-systems.spec.ts` 首次运行时，"一次小造假"被查率是 **0%**，
且 `has_faked` 标记也没打上。探针显示 `__state() === gs.getState()` 为 **false**——
测试里 `await import('/src/data/gameState.ts')` 拿到的是**另一个模块实例**
（Vite 按 URL 缓存，应用内用的是相对路径 `./gameState`），
两边的模块级单例互不相通，测试实际上在测一个影子状态。

修复：所有共享状态的模块统一从 `main.ts` 的 `window.__mod` 挂出，测试不再自行 import。
**此前的 balance-sim / storylet-rarity / spot-coverage / event-reachability 四个测试
都受此影响，已一并改正并重新验证**（结论未变，但此前的数字是测影子模块得到的）。

**NPC 挡住地点交互**：NPC 原本站在门口旁 26px，导致玩家站在门口时
按 E 永远触发对话而进不去地点——两个既有测试因此失败。
修复：NPC 下移到门口下方 34px，且 `nearestNpc()` 只返回比地点更近的 NPC。

### 五、验证

```
tsc + build 零错误 ｜ npm test 11 passed
309 个事件 ID 无重复、无悬空 nextEventId
生产包不含 __mod / window.game 调试钩子
```

新增 `tests/m3-systems.spec.ts` 三个用例：风险引擎概率分布、
双线此消彼长（24 个双线事件中 9 个选项明确一升一降、8 个造假选项全部接入风险引擎）、
NPC 好感度阈值与每季限聊一次。

### 六、遗留

- ~~导师周教授卡片场景对话 UI~~ → 已接入（`BaseStageScene` 按 T + `events_advisor.ts`）。
- ~~双线数值接入结局判定~~ → 已接入：`disgraced` / `lucky_fraud` / `master_clinician`，
  `academic_star` 认 research 轴。
- 造假被查后的职业阶段事件已写；长周期模拟（`lifecycle-sim`）显示造假流 50%+ 被查。
- ~~M4 其余小游戏（CPR / 考试 / 夜班）~~ → 已实现（`CprRhythmMinigame` / `ExamQuizMinigame`
  / `NightShiftMinigame`，经 `launchMinigame` 分发，`minigames-full.spec.ts` 覆盖）。
- ~~M5 脚步声、任务清单 UI~~ → 已实现（`sound.footstep`；`QuestLog` 按 Q 打开，
  各可行走场景有 `undergradQuests`/`internshipQuests`/`guipeiQuests`）。
- 实习/规培可行走场景（`HospitalScene`/`GuipeiWalkScene`）已落地，从 CampusScene 顺次过渡。
- 求职阶段前置联动（`events_jobhunt_echo.ts`，9 条）已补，兑现学历/双线/造假/推荐信等 flag。
- 静态回归（不启浏览器）：`ending-flag-sources`（死结局/死事件）、`event-integrity`
  （断链/重复 id/requireStat/effect 实现）——守配置类隐患。

---

## 全生命周期、手写优先、M4/M5 首批落地（2026-07-27）

### 手写事件优先

各阶段候选池中手写事件权重占比仅 4%–12%。`turnFlow.drawStorylet` 以
`HANDWRITTEN_PRIORITY = 0.65` 优先手写池；`BaseStageScene` 统一走 `drawStorylet`。

### 全生命周期模拟

`tests/lifecycle-sim.spec.ts`：40 局 × 造假/诚实两流。诚实流 0 被查；
造假流约 50%+ 被查，能走到 `disgraced` / `lucky_fraud`。

### 结局判定扩展

| 结局 | 条件 |
|---|---|
| `disgraced` 通报里的那个名字 | `exposed_ruin` |
| `lucky_fraud` 没有人来敲门 | 造过假、未重度处理、评上副高/多论文 |
| `master_clinician` 一把好刀 | clinical≥60、papers≤3、reputation≥40 |
| `academic_star` | papers≥6 且 (research≥55 或 knowledge≥70) |

### M4 缝合时机条 + M5 氛围 tint

见上文 M4 / M5 章节勾选状态。测试：`tests/minigame-atmosphere.spec.ts`、
`tests/endings.spec.ts`。

新增 20 条本科事件 + 13 条跨阶段回声，并把**退学与留级做成真实的流程分支**。

### 一、国奖与保研竞争链

| 事件 | 说明 |
|---|---|
| `ug_guojiang_apply` → `ug_guojiang_dispute` / `ug_guojiang_result` | 国奖答辩。可以老实讲、也可以把"帮忙录数据"说成"参与课题设计"——夸大会进入质疑分支 |
| `ug_baoyan_race` → `ug_baoyan_result` | 卡在推免线第 13 名，差 0.03 绩点。死磕 / 找导师"沟通"加分项 / 转考研 |
| `ug_fake_paper` | 师兄的水刊挂名，两千块换保研加分 |
| `ug_whistleblow` → `ug_whistleblow_after` | 发现同学假材料。实名举报 / 匿名举报 / 装作没看见——举报后要承受班里的目光 |

已有的轻量版 `scholarship_review` 用 `excludeFlag: 'ug_guojiang_done'` 与新链互斥，
避免同一局重复讲同一件事。

### 二、霸凌与孤立

`ug_bullying`（被排挤：反映 / 忍受 / 当面对质）→ `ug_bullying_after`；
`ug_witness_bullying`（作为旁观者：出声 / 私下安慰 / 划过去）。

### 三、留级与退学 —— 真实流程分支 ⚠️

这两条**不只是文本和 flag，会真正改变流程**：

```
ug_academic_probation（学业警示，requireStat knowledge ≤45）
  ├ 申请重修 → flag: ug_holdback
  │    → CampusScene.totalTurns() 20 → 24（多读一年）
  │    → 信息条显示"重修中"，每季额外 心理 -3
  │    → ug_holdback_life：走出来则清除额外惩罚
  ├ 求情补考 → 压线过
  └ 读不下去 → ug_dropout_decision

ug_dropout_decision（requireStat sanity ≤40）
  ├ 签字退学 → flag: left_undergrad
  │    → 本季结束直接进 EndingScene
  │    → 新结局「没读完的白大褂」（tone: escape）
  ├ 撕了表格，再撑一学期
  └ 休学一年 → flag: ug_gap_year（后续阶段有回声）
```

改动文件：`endings.ts`（新结局 + 判定链首位）、`CampusScene.ts`（`totalTurns()` /
`goToEnding()` / 重修心理惩罚）、`UndergradScene.ts`（旧存档场景同步这两条逻辑）。

### 四、跨阶段回声（13 条）

学术诚信的账，后面要还：

- `ug_fake_paper` → 硕博期刊预警名单自查 → 若隐瞒，职业阶段晋升公示被匿名举报
- `ug_pulled_strings` → 硕博"你是走关系进来的吧"
- `ug_whistleblower` → 会议茶歇撞见当年被举报的人
- `ug_stood_firm` → 科室要"美化数据"时，所有人看向你
- `ug_looked_away` → 又一次看见问题，又一次别过头
- `ug_bullied_silent` → 规培时遇到被孤立的新人，你认得那种眼神
- 另有 `ug_holdback` / `ug_guojiang_done` / `ug_gap_year` / `ug_defended_someone` 的回声

### 五、验证

新增两个测试：

- `tests/branches.spec.ts` — 退学确实进 EndingScene 且 endingId 正确；
  留级确实把 20 季变成 24 季、信息条出现"重修中"。
- `tests/event-reachability.spec.ts` — 8 个新根事件在 3 种玩家画像 × 25 回合内
  是否真能进候选池（防止 requireStat/minTurn 配错导致永远沉底）。
  结果符合设计：国奖需 knowledge ≥45（2/3 画像）、学业警示与退学只对困境玩家开放（1/3）。

同时用脚本校验了 **280 个事件 ID 无重复、无悬空 `nextEventId`**——
这一步实际抓到一个 bug：我引用了 `ug_baoyan_result` 两次却忘了写这个事件。

平衡回归：新增事件让自适应打法的最终心理从 55 降到 41，方向正确（压力内容变多），
未出现新的触顶/触底。

```
tsc + build 零错误 ｜ npm test 8 passed
```
