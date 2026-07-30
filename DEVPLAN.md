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
| 结局系统 | `src/data/endings.ts` | 根据 flags + stats 判定结局，附带真实数据卡 |
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
- [x] 3 个结局定义（quit_guipei / exhausted_attending / stable_at_45）
- [x] 3 个示例事件（gaokao_parents / anatomy_first_day / guipei_first_paycheck）
- [x] 学校/学制/医院基础数据

### 未完成 ❌

- [ ] **事件池严重不足** — 仅 3 个事件，每阶段需要 10-20 个
- [ ] **realEvents.ts 未创建** — 真实事件改编数据卡
- [ ] **news.ts 未创建** — 新闻滚动条数据
- [ ] **像素美术简陋** — 仅纯色背景，缺少角色/场景装饰
- [ ] **无音效/BGM**
- [ ] **结局仅 3 个** — 目标 8+ 个
- [ ] **无存档系统**
- [ ] **无数据对比系统** — 结局后展示"真实数据 vs 你的数据"
- [ ] **缺少阶段间过渡动画**

## 开发里程碑

### M1: 项目搭建 + 核心框架 ✅ 已完成

### M2: 事件池填充（最高优先级）

**目标**: 每个阶段 10-20 个事件，总计 100+ 事件

需要为以下阶段添加事件（在 `src/data/events.ts` 的 `ALL_EVENTS` 数组中添加）：

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

### M3: 真实事件数据卡 + 新闻系统

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

### M4: 结局扩展 + 数据对比系统

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
结局画面展示"你的数据 vs 真实数据"：
```
你的存款: ¥300,000  |  真实主治平均存款: ¥80,000-200,000
你的年龄: 35岁      |  真实主治平均年龄: 32-38岁
```

### M5: 像素美术增强

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

### M6: 音效 + BGM

- 标题画面 BGM（压抑/紧张）
- 各阶段环境音
- 选项点击音效
- 属性变化音效（正面/负面）
- 结局音乐（根据结局基调）
- 可使用 Web Audio API 生成简单音效（无需外部资源）

### M7: 存档 + 辅助系统

- localStorage 自动存档
- 存档/读档 UI
- 游戏内帮助/说明
- 属性变化历史日志
- 已触发事件回顾

### M8: 打磨 + 发布

- 移动端适配（触控优化）
- 性能优化
- 无障碍支持
- SEO / 分享卡片
- 部署到 GitHub Pages / Vercel

## 文件结构

```
src/
├── main.ts                    # Phaser 游戏入口，注册所有场景
├── data/
│   ├── constants.ts           # 学校/学制/医院/属性常量定义
│   ├── stats.ts               # 属性系统（clamp/apply）
│   ├── gameState.ts           # 全局状态单例
│   ├── events.ts              # 事件定义 + 过滤/抽取逻辑 ← 需要大量扩充
│   ├── endings.ts             # 结局定义 + 判定逻辑 ← 需要扩充
│   ├── realEvents.ts          # [未创建] 真实事件改编数据卡
│   └── news.ts                # [未创建] 新闻滚动条数据
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
7. **真实数据引用**: 结局数据卡需标注来源（如"丁香园薪酬调查2024"）

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
