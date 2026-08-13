# 白大褂炼狱 - 开发计划

## 项目概述

**目标用户**: 高考志愿填报期犹豫是否选择临床医学的高中生及家长
**核心体验**: 通过像素风人生模拟，让玩家亲历医学生从高考到执业的完整链路，感受每个阶段的真实压力与困境
**游戏类型**: 浏览器端像素风叙事模拟游戏（Storylet 架构）
**技术栈**: Phaser 3 + TypeScript + Vite

## 运行方式

```bash
npm install
npm run dev        # 开发服务器 → http://localhost:5173/
npm run build      # 生产构建（tsc + vite build）
npm run preview    # 预览生产构建
```

## 架构设计

### 场景流程（Scene Flow）

```
BootScene → TitleScene → GaokaoScene → UndergradScene → InternshipScene
  → GuipeiScene → MasterScene → PhDScene → JobHuntScene → CareerScene
  → EndingScene

任意阶段 sanity ≤ 0 → MentalCrisisScene
```

### 核心系统

| 系统 | 文件 | 说明 |
|------|------|------|
| 8维属性 | `src/data/stats.ts` | stamina/knowledge/money/sanity/relations/reputation/papers/age |
| 全局状态 | `src/data/gameState.ts` | 单例 GameState，含 stats/stage/school/track/degree/flags/newsLog |
| 事件系统 | `src/data/events.ts` | Storylet 架构，加权随机抽取，按 stage/flag/stat/turn 过滤 |
| 结局系统 | `src/data/endings.ts` | 根据 flags + stats 判定结局，附带受 evidence gate 控制的事实卡 |
| 常量定义 | `src/data/constants.ts` | 学校/学制/医院定义（谐音替代真实名称） |
| HUD | `src/ui/HUD.ts` | 顶部8维属性条 |
| 事件卡 | `src/ui/EventCard.ts` | 叙事选项卡，支持多选项 |
| 后果弹窗 | `src/ui/ConsequencePopup.ts` | 选择后展示结果 + 属性变化 |
| 像素美术 | `src/ui/pixelArt.ts` | 代码生成纹理，每阶段独立配色方案 |
| 基础场景 | `src/scenes/BaseStageScene.ts` | 抽象基类，封装 HUD/EventCard/ConsequencePopup/回合推进/场景切换 |

### 属性系统说明

```typescript
interface Stats {
  stamina: number;     // 体力 (0-100)
  knowledge: number;   // 知识 (0-100)
  money: number;       // 存款 (无上限，可为负)
  sanity: number;      // 心理健康 (0-100)，≤0 触发 MentalCrisisScene
  relations: number;   // 人际关系 (0-100)
  reputation: number;  // 声望 (0-100)
  papers: number;      // 论文数 (无上限)
  age: number;         // 年龄 (无上限，每过4季度+1)
}
```

### 事件格式

```typescript
interface GameEvent {
  id: string;                          // 唯一标识
  stage: string | string[];            // 触发阶段
  title: string;                       // 事件标题
  body: string;                        // 事件描述
  category: EventCategory;             // 分类
  weight: number;                      // 权重（越大越常出现）
  minTurn?: number;                    // 最早触发回合
  maxTurn?: number;                    // 最晚触发回合
  once?: boolean;                      // 是否只触发一次
  requireFlag?: string;                // 需要的前置 flag
  excludeFlag?: string;                // 排除的 flag
  requireStat?: Record<string, [lo, hi]>; // 属性要求区间
  choices: EventChoice[];              // 选项列表
  newsTickerAfter?: string;            // 选择后滚动的新闻
}

interface EventChoice {
  text: string;           // 选项文本
  delta: StatDelta;       // 属性变化
  flagSet?: string;       // 设置的 flag
  flagRequire?: string;   // 显示条件 flag
  flagExclude?: string;   // 隐藏条件 flag
  nextEventId?: string;   // 链式事件
  consequence?: string;   // 选择后提示文本
  hidden?: boolean;       // 隐藏选项（特殊条件触发）
}
```

### 谐音命名规则

为规避法律风险，所有真实院校/人物使用谐音替代：

| 真实 | 游戏中 | 说明 |
|------|--------|------|
| 协和 | 协哈 | 顶尖医学院 |
| 华西 | 华溪 | 西南顶尖 |
| 湘雅 | 湘雅（保留） | 可直接用 |
| 曹丽萍 | 曹立苹 | 医患事件 |
| 肖骥 | 萧纪 | 规培事件 |
| 王天朝 | 旺填朝 | 反腐事件 |
| 张煜 | 张昱 | 举报事件 |
| 于莺 | 余鹰 | 辞职事件 |
| 刘进 | 刘晋 | 急诊科专访 |
| 湖南省人民医院 | 湖南省立人民医院 | |
| 上海岳阳医院 | 上沪岳洋医院 | |

## 当前完成状态

### 已完成 ✅

- [x] 项目脚手架（Vite + Phaser 3 + TypeScript）
- [x] 全部 12 个场景文件（结构完整，可编译）
- [x] 核心数据层（stats/gameState/constants/events/endings）
- [x] UI 组件（HUD/EventCard/ConsequencePopup/pixelArt）
- [x] BaseStageScene 基类（回合推进/事件触发/场景切换）
- [x] GaokaoScene 完整4阶段流程（选分→选校→选学制→确认）
- [x] TypeScript 编译零错误，生产构建通过
- [x] 15 个结局定义 + 动态年龄/数据对比/跨周目图鉴
- [x] 300+ 手写事件 + 5000+ 程序化事件，覆盖全部人生阶段
- [x] 学校/学制/医院基础数据
- [x] 事件池按阶段预索引；运行时 ID 唯一性、24 抽标题去重率和 `<2ms` 筛选性能回归
- [x] 职业期两轮诉讼按内/外/妇/儿/急诊五科分化，赔付按职级缩放，ESC 补触发有回归
- [x] 职业期延长到 20 季；副高/正高加入第 8/16 季年限门槛、落选分支与重申路径
- [x] 职业期心理回血与内/外/儿亚专科纯被动回归同步覆盖完整 20 季
- [x] 2026-08-04 验收：TypeScript、生产构建通过；Playwright 114 项最终全绿（113 直接通过、1 冷启动 retry 后通过）

### 未完成 ❌（历史快照，2026-07-30 核对：绝大部分已完成，保留原文仅作沿革）

> 以下为立项初期清单。现状核对：
> - ~~事件池不足~~ → 现有 304 个手写事件 id + 程序化生成池 5000+（`event-integrity` 断言）
> - ~~realEvents.ts 未创建~~ → 已建（`src/data/realEvents.ts`）
> - ~~news.ts 未创建~~ → 已建且时序对齐到 2044（`news-timeline.spec.ts` 回归）
> - ~~像素美术简陋~~ → `pixelArt.ts` 程序生成贴图 + tilemap + 行走动画
> - ~~无音效/BGM~~ → `src/audio/sound.ts`（含脚步/BGM 情绪切换）
> - ~~结局仅 3 个~~ → `determineEnding` 现引用 17 个 flag，十余种结局
> - ~~无存档系统~~ → `src/data/save.ts`（自动存档 + 旧档降级，`save-compat.spec.ts`）
> - ~~无数据对比系统~~ → 已恢复（`comparison.ts` + `data-comparison.spec.ts`）
> - ~~缺少阶段间过渡动画~~ → 各场景衔接均有 camerafadeout/in 过渡

- [x] **事件池严重不足** — 已扩充并有多样性回归
- [x] **realEvents.ts 未创建** — 已创建真实事件改编数据卡
- [x] **news.ts 未创建** — 已创建并覆盖完整时间线
- [x] **像素美术简陋** — 已有程序贴图、tilemap、角色与动画
- [x] **无音效/BGM** — 已有 Web Audio 音效与情绪 BGM
- [x] **结局仅 3 个** — 已扩展到 15 个结局
- [x] **无存档系统** — 已有自动存档、读档与旧档降级
- [x] **无数据对比系统** — 结局页已展示玩家数据与真实区间
- [x] **缺少阶段间过渡动画** — 已有阶段淡入淡出

## 开发里程碑

### M1: 项目搭建 + 核心框架 ✅ 已完成

### M2: 事件池填充 ✅ 已完成

**目标**: 每个阶段 10-20 个事件，总计 100+ 事件

以下是立项时的内容目标，现均已有手写事件和程序化事件覆盖；新增事件应放入对应的
`events_*.ts` 模块，由 `events.ts` 汇总并建立阶段索引。

#### 本科阶段 (undergrad) — 需要 15+ 事件
- 解剖课、生理生化考试、英语四六级
- 第一次见习、临床技能操作
- 考研 vs 保研抉择
- 室友关系、恋爱
- 医学教材太厚背不下来
- 暑期社会实践

#### 实习阶段 (internship) — 需要 10+ 事件
- 第一次写病历、第一次穿刺
- 被带教老师骂
- 值第一个夜班
- 遇到不配合的患者
- 实习科室轮转选择

#### 规培阶段 (guipei) — 需要 15+ 事件
- 低工资困境（已有1个）
- 考执业医师资格证
- 值班猝死新闻
- 医患冲突目击
- 是否继续读博的抉择
- 规培基地选择

#### 硕博阶段 (master/phd) — 需要 15+ 事件
- 导师关系（PUA/放养/严格）
- 发 SCI 压力
- 实验失败
- 学术会议
- 延期毕业风险
- 学术不端诱惑

#### 求职阶段 (jobhunt) — 需要 10+ 事件
- 三甲 vs 基层选择
- 编制 vs 合同制
- 面试笔试
- 城市选择（一线 vs 回老家）
- 薪资谈判

#### 职业阶段 (career) — 需要 15+ 事件
- 升主治/副高/正高
- 科研指标压力
- 带教实习生
- 医疗纠纷
- 科室政治
- 多点执业
- 互联网医疗

**每个事件需要**:
- 真实的医学教育/行业细节
- 2-4 个选项，每个选项有不同的属性影响
- 部分选项设置 flag 用于后续事件链
- 部分事件附带 newsTickerAfter 新闻

### M3: 真实事件数据卡 + 新闻系统 ✅ 已完成

#### 创建 `src/data/realEvents.ts`
将 2022-2025 年真实医疗事件改编为游戏内数据卡：

```typescript
export interface RealEventCard {
  id: string;
  year: number;
  title: string;              // 谐音化标题
  body: string;               // 事件描述
  realContext: string;         // 真实背景说明
  homophoneMapping: Record<string, string>; // 谐音映射
  relatedStages: string[];    // 关联的游戏阶段
  triggerCondition?: string;  // 触发条件 flag
}

export const REAL_EVENTS_AS_CARDS: RealEventCard[] = [
  // 2·23事件（谐音：2·23事件）
  // 南宁手术室事件（谐音：南柠手术室事件）
  // 医疗反腐风暴（2023）
  // 张昱举报案（谐音：张昱举报案）
  // 余鹰辞职事件（谐音：余鹰辞职）
  // 刘晋急诊科专访（谐音：刘晋急诊科专访）
  // 107篇撤稿事件
  // 医学生就业危机
];
```

#### 创建 `src/data/news.ts`
新闻滚动条数据，按年份/季度组织：

```typescript
export interface NewsTickerItem {
  year: number;
  quarter: number;
  headline: string;
  type: 'event' | 'warning' | 'irony' | 'tragedy';
}

export const NEWS_TICKER: NewsTickerItem[] = [
  { year: 2024, quarter: 3, headline: '【教育部：2024年临床医学专业报考人数同比增长23%】', type: 'event' },
  { year: 2024, quarter: 4, headline: '【两会代表提案：建议规培生补助提升至8万元/年】', type: 'warning' },
  // ... 每阶段至少 5 条
];
```

### M4: 结局扩展 + 数据对比系统 ✅ 已完成

#### 新增结局（目标 8+ 个）
- `quit_guipei` — 退出规培 ✅ 已有
- `exhausted_attending` — 精疲力竭的主治 ✅ 已有
- `stable_at_45` — 45岁的稳定 ✅ 已有
- `top_surgeon` — 顶级外科主任（高声望+高论文）
- `community_doctor` — 社区全科医生（低声望但高sanity）
- `medical_affairs` — 转行医疗企业/医药代表
- `overseas_doctor` — 出国行医
- `burnout_early` — 早期职业倦怠（30岁前sanity归零）
- `academic_star` — 学术明星（高论文+高knowledge）
- `grassroots_hero` — 基层英雄（县城/社区，高relations）

#### 结局数据对比
结局画面展示"你的数据 vs 模拟参照"（不作为现实事实来源）：
```
你的存款: ¥300,000  |  模拟参照存款: ¥80,000-200,000
你的年龄: 35岁      |  模拟参照年龄: 32-38岁
```

### M5: 像素美术增强 ✅ 已完成

#### 角色精灵
- 用代码生成简单像素角色（类似 `createCharTexture`）
- 不同阶段穿不同服装（白大褂/手术衣/便装）
- 表情变化（开心/疲惫/焦虑）

#### 场景背景
- 每个阶段需要特色背景元素：
  - 本科：教室/解剖室/宿舍
  - 实习：医院走廊/病房
  - 规培：值班室/手术室
  - 硕博：实验室/图书馆
  - 求职：面试室/招聘会
  - 职业：办公室/手术室

#### 动画
- 场景过渡动画（淡入淡出已有）
- 属性变化时的浮动数字
- 新闻滚动条动画

### M6: 音效 + BGM ✅ 已完成

- 标题画面 BGM（压抑/紧张）
- 各阶段环境音
- 选项点击音效
- 属性变化音效（正面/负面）
- 结局音乐（根据结局基调）
- 可使用 Web Audio API 生成简单音效（无需外部资源）

### M7: 存档 + 辅助系统 ✅ 已完成

- localStorage 自动存档
- 存档/读档 UI
- 游戏内帮助/说明
- 属性变化历史日志
- 已触发事件回顾

### M8: 打磨 + 发布 🚧 进行中

- 移动端适配（触控优化）
- 性能优化
- 无障碍支持
- SEO / 分享卡片（薄方案已落地：OG meta + `og-share.svg`）
- 部署到 GitHub Pages / Vercel

## 后续开发计划（2026-08-04 重排）

当前基线：事件池阶段索引、运行时去重、职业期 20 季、分科诉讼、晋升失败/重申、地区收入/房价、
知情同意、患者回声和职业心理回归均已落地；`tsc`、生产构建和 114 项 Playwright 回归已通过（1 项
冷启动 retry 后通过）。后续按依赖分批推进，每批完成后同步本节、`docs/OPTIMIZATION-ROADMAP.md`
和 `docs/HANDOFF.md`。

### M9 · 经济与属性闭环（已完成，P1）

目标：让地区、资产和开局属性在职业期继续产生可见且可管理的后果。

1. [x] 建立 `tests/balance-matrix.spec.ts` 基线：诚实/科研/临床三轨 × 三甲/县城 × 普通/拮据家境，
   加入“抠门导师”极端组合；记录 20 季职业期的存款、资产、sanity、职称和结局分布，先固定可接受区间。
   2026-08-04 固定种子实测 12 个组合均完成 89 季生命周期，总财富均为正，临床/科研成长方向和
   三甲 > 县城职业收入顺序均通过断言；旧 `economy-lifecycle` 同步改为 20 季职业期。
2. [x] 增加资产操作闭环：购房首付可用资产抵扣、应急提现（2% 手续费/单次 ¥10,000 上限）、
   子女教育基金和提前还贷；
   所有操作写入资产流水，禁止资产和现金重复计入，旧存档缺字段时安全降级。
   已接入 R 菜单与声明式 `buyHouse` effect；流水保留最近 100 条，教育基金降低季度育儿支出，
   提前还贷降低后续房贷，专项资产守恒/防重复扣款/菜单持久化回归已覆盖。
3. [x] 增加属性成长：职业暴露及时救助/隐瞒分别改变运气；职业期每 4 季长期夜班磨损外貌；
   变化限制在 0–5，写入新闻历史，HUD 复用属性行实时显示，`attr-growth.spec.ts` 覆盖上限与解释。
4. [x] 完善结局事实卡：按职称和地区刷新季度收入/支出/可支配区间；结局页拆分现金、资产、
   房贷估算余额和季度还款，购房/提前还贷会同步更新数据卡。

验收：新增经济矩阵、资产操作和结局财务卡回归；地区收入顺序保持三甲 > 市级/私立 > 基层，资产操作前后
总财富守恒（扣除明确手续费）；`npx tsc --noEmit`、`npm run build`、相关 Playwright 全部通过。

### M10 · 医疗真实性与医学事实审计（进行中，P0/P1）

目标：补齐“医生每天如何诊断和管理治疗”的教育缺口，同时控制医学表述风险。

1. [ ] 先完成 `docs/MEDICAL-FACT-AUDIT.md` 的逐条复核：患者档案、手写临床事件、生成模板分别记录
   来源、审阅状态和需要改写的术语；未复核内容不得标记为“医学认证”。当前新增诊断链已登记为“待核对”，
   未宣称医学认证。
2. [x] 新增诊断链事件：检查单、化验/影像报告解读、鉴别诊断讨论；知识/临床力门控高低两条带教路径，
   结果进入规培阶段复查/复盘回声。`diagnostic-chain.spec.ts` 覆盖可达、审计登记和剂量表述禁用。
3. [x] 新增用药安全链：用药清单核对、抗菌药物指征复评、疑似不良反应升级和出院 teach-back 沟通；
   高知识/临床力与带教辅助两条路径均可达，分支回声覆盖遗漏核对、未复评、忽略风险和仓促沟通。
   `medication-safety-chain.spec.ts` 覆盖审计登记、消费者闭环和剂量/处方化措辞禁用；医学事实仍待人工复核。
4. [x] 补医疗流程事件：新增排班/轮转交接、分级查房、病程记录和会诊申请链，包含低知识带教路径与职业期回声；
   `clinical-workflow-chain.spec.ts` 覆盖可达性、审计登记和流程措辞边界。
5. [ ] 给生成模板建立统一术语规范：继续核对 `eventGen.ts` 的检查、鉴别诊断、管理建议和会诊措辞，
   在人工医学复核后再统一改写并更新审计状态。

验收：每条新增医学事件有事实审计记录、至少一个后果消费者和静态结构测试；诊断→治疗→随访链可达，
事件 ID/flag/nextEventId 无死链；相关内容由人工医学审阅后再勾选路线图任务。

### M11 · 诉讼长期后果（P1）

目标：把当前“选律师/调解”扩展为证据、鉴定和长期职业风险的组合决策。

1. 增加医疗损害鉴定节点：由 knowledge、clinical、`record_sloppy`、知情同意质量和职级共同加权，
   使用可注入种子的随机源，保证测试可复现。
2. 为胜诉、调解、败诉分别增加 1–2 季后的 sanity、reputation、现金和岗位影响回声。
3. 增加低概率二审/后续追诉，但设置一次性 flag 和时间窗，避免职业期末无限阻塞。

验收：固定种子下证据质量改变结果分布；八个分科案件均覆盖至少一种长期回声；ESC 跳过、存档读档、
重复触发和职业期第 20 季边界均有回归。

### M12 · 人物互动与留存（P1/P2）✅

目标：让 NPC 好感度从单次门控升级为跨阶段关系和任务反馈。

1. ✅ 为主治、护士长、师姐补疏远向随机事件；保留现有室友/师兄信任与跨阶段回响。
2. ✅ 将 QuestLog 从静态文本改为 NPC/地点指向，完成任务后给出飘字反馈。
3. ✅ 林主治“疏远→修复→再信任→职业回声”多阶段链（`events_npc_affinity.ts`）。
4. ✅ `docs/EVENT-LAYERING.md`：L1 人生节点 / L2 好互动 / L3 日常生成。

验收：`tests/m12-npc-quests.spec.ts` + 既有 `npc-affinity-events.spec.ts`。

### M13 · 发布硬化与体验打磨（P1/P2）✅（人工验收仍 pending）

目标：降低新手理解成本和回归环境噪声，完成发布前验收。

1. ✅ 资产/HUD 闪色、理财 toast、季度结构化账单；H 帮助列明 ESC 语义；行走场景首次 Q/E 引导。
2. ⏳ Playwright 冷启动 flaky：沿用既有 `?renderer` / 冷启动容忍策略；全量连续回归仍建议发版前手跑。
3. ✅ 更新 HANDOFF；删除空 `src/systems`、`src/platform` 与示例 `.cnb.yml`。

人工医学终审与 `release-acceptance` 真机项仍阻塞 **full** 发布；**preview** 轨道可用。

### 暂缓项

完整移动端触控和大规模结局重构暂缓；
SEO/分享卡片薄方案已落地（`index.html` OG + `public/og-share.svg`）。
急诊第五亚专科与薄轮转已落地（`sub_emergency` + `events_career_rotation.ts`）。

## 文件结构

```
src/
├── main.ts                    # Phaser 游戏入口，注册所有场景
├── data/
│   ├── constants.ts           # 学校/学制/医院/属性常量定义
│   ├── stats.ts               # 属性系统（clamp/apply）
│   ├── gameState.ts           # 全局状态单例
│   ├── events.ts              # 汇总事件、阶段索引与过滤/抽取逻辑
│   ├── endings.ts             # 结局定义 + 动态判定逻辑
│   ├── realEvents.ts          # 真实事件改编数据卡
│   └── news.ts                # 新闻时间线与滚动条数据
├── ui/
│   ├── pixelArt.ts            # 像素美术工具函数 + 配色方案
│   ├── HUD.ts                 # 顶部属性条
│   ├── EventCard.ts           # 事件选项卡
│   └── ConsequencePopup.ts    # 后果弹窗
└── scenes/
    ├── BaseStageScene.ts      # 场景抽象基类
    ├── BootScene.ts           # 启动场景（直接跳转TitleScene）
    ├── TitleScene.ts          # 标题画面
    ├── GaokaoScene.ts         # 高考志愿填报（4阶段流程）
    ├── UndergradScene.ts      # 本科5年
    ├── InternshipScene.ts     # 实习
    ├── GuipeiScene.ts         # 规培
    ├── MasterScene.ts         # 硕士 + 博士（export两个class）
    ├── JobHuntScene.ts        # 求职
    ├── CareerScene.ts         # 职业
    ├── EndingScene.ts         # 结局 + 心理危机（export两个class）
```

## 开发注意事项

1. **TypeScript 配置**: `verbatimModuleSyntax: true`，类型导入必须用 `import type`
2. **Phaser 纹理**: 所有美术资源用代码生成（`generateTexture`），不依赖外部图片
3. **事件权重**: `weight` 越大越常出现，普通事件 50-100，稀有事件 5-20
4. **Flag 命名约定**: `阶段_动作`，如 `passed_zhuzhi`、`enrolled_xieha`
5. **谐音一致性**: 所有谐音映射在 `realEvents.ts` 中统一定义，场景内引用
6. **属性平衡**: 每个选项的 delta 总和应大致平衡，避免某个选择明显最优
7. **事实来源引用**: 结局事实卡需通过 `sources/evidence.json`，未复核来源不得在 UI 中展示

## 快速上手指南（给其他 Agent）

### 添加新事件
在 `src/data/events.ts` 的 `ALL_EVENTS` 数组中添加对象：
```typescript
{
  id: 'unique_event_id',
  stage: 'undergrad',           // 或 ['undergrad', 'internship'] 多阶段
  title: '事件标题',
  body: '事件描述文本...',
  category: 'study',            // study/clinical/social/financial/mental/career/news/system/personal
  weight: 80,
  minTurn: 2,                   // 可选
  once: true,                   // 可选
  choices: [
    { text: '选项A', delta: { knowledge: 5, stamina: -10 }, consequence: '结果描述' },
    { text: '选项B', delta: { sanity: 5, knowledge: -3 }, flagSet: 'skipped_class' },
  ],
}
```

### 添加新结局
在 `src/data/endings.ts` 的 `ENDINGS` 数组中添加，并在 `determineEnding()` 中添加判定逻辑。

### 添加新闻
在 `src/data/news.ts`（需创建）中添加 `NewsTickerItem`，或在事件的 `newsTickerAfter` 字段中直接写。
