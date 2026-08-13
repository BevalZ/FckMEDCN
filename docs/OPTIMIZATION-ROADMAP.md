# 游戏蓝图回顾与优化任务清单（深度版 · 10 轮）

> 生成：2026-08-01 · 方法：每轮实际翻代码/数据（grep/comm/交叉核对）+ 联网核对真实世界数据，前轮结论带入后轮。
> 现状基线（2026-08-04）：全量 114 项最终通过（113 直接通过、1 项冷启动 retry 后通过），
> `npx tsc --noEmit` 与 `npm run build` 均通过。
> 本版与浅版区别：每轮含"实据"（具体文件/flag/数字），并新增两轮用户提问驱动的检查（地区差异、死 flag 回响）。
>
> **状态口径**：R1–R10 的正文保留历史审计快照，不能直接作为当前完成状态；当前权威状态以本文件
> 底部优先级表和 `DEVPLAN.md` 的 M9–M13 为准。已落地的地区经济、死 flag 回归、职业暴露/飞检、
> 知情同意、分科诉讼和事件池索引不再重复实施；后续只处理明确列出的剩余缺口。

---

## Round 1 · 选择回响审计（死 flag / 无后果抉择）

**实据**：`flagSet` 共 209 个唯一 flag，其中 **114 个设置了但从无 `requireFlag`/`flags.has`/ending/badge/quest 消费**。
抽测关键 flag 的"除 flagSet 外引用次数"：

| flag | 出处 | 引用次数 | 问题 |
|---|---|---|---|
| `jh_fake_gambled` | 求职·本科造假去新单位"赌一把" | **0** | 赌博成功的结局没写 |
| `jh_disclosed_ug_fake` | 求职·向新单位坦白本科造假 | **0** | 坦白的结果没写 |
| `dt_evidence_win` / `dt_owned_gap` / `dt_dual_pillar` | 学术不端·双轨后果 | **0** | 双轨结局无回响 |
| `ca_defensive` / `ca_settle` 等 ca_* | 职业·危机应对 | **0** | 应对结果无后续 |
| `phd_team` / `phd_ok` | 博士·站队/想通 | **0** | 无回声 |
| `ug_exchange` / `ug_tutoring` | 本科·交换/家教 | **0** | 无回声 |

**结论**：早期批次贯彻了"选择要回响"，但新增批次（求职/双轨/博士/部分本科）大量选择**设置了 flag 却没有后果**。这是蓝色级断点。

**任务**：
- [ ] 为 114 个未消费 flag 逐批补 ECHO_EVENTS（至少覆盖：jh_* 求职造假/坦白、dt_* 双轨、phd_team/phd_ok、ug_exchange/ug_tutoring、admin_* 管理层、gp_nurse_ally 护士长人脉、led_project 项目）
- [ ] 建立静态回归 `tests/flag-echo-coverage.spec.ts`：断言每个 flagSet 的 flag 至少有一个消费者（requireFlag 或 ending/badge/quest），把"死 flag"变成测试失败
- [ ] 叙事类标记 flag（仅记录人生事件、无需后果）单独标注 `narrativeOnly` 白名单，避免误报

---

## Round 2 · 经济生命周期闭环（地区/医院抉择零后果）

**实据**：
- 职业收入 = 底薪 30000 + 职称档差 + 绩效(声望)，**无地区/医院因子**。
- 求职 8 个医院/地区 flag（`offer_sanjia` 三甲、`offer_grass` 基层、`base_home` 回老家、`city_home` 回本城、`took_hospital_a/b`、`took_private` 私立、`jh_platform` 编制）**经济消费次数全为 0**。
- 房价固定：`career_mid_house` 首付 -8000、房贷 2500/季，不分城市。
- 现有唯一地区差异是上学阶段 `cityPremiumPct`（tier1 生活成本 +25%），只涨成本不涨收入。

**现实**（联网核对）：一线三甲 vs 县城基层薪资差 1.5-3 倍；房价差 3-10 倍；编制/私立/规培待遇差异巨大。

**结论**：玩家在求职阶段"选三甲还是回县城"是人生最大经济分岔，游戏里却零影响——**薪资与房价必须按医院/地区差异化**。

**任务**：
- [ ] **P0** 职业收入加"医院/地区系数"：三甲×1.6、市级×1.2、基层×0.9、私立×1.4、回老家/县城×0.8（覆盖 `offer_sanjia/offer_grass/base_home/city_home/took_hospital_a/b/took_private/jh_platform`）
- [ ] **P0** 房价按地区/医院档位：三甲城市首付 -16000/月供 5000；基层县城首付 -3000/月供 800；求职选择决定购房档位
- [ ] 地区差异进事实卡与结局：基层薪资等现实口径必须先完成 evidence gate
- [x] 增加"一线 vs 县城"生活成本与可支配收入对比的结局统计（玩家一眼看到差异）

---

## Round 3 · 时间轴与职称节奏

**实据**：职业期 MAX_TURNS=12（3 年），叙事 42→45 岁；主治→副高→正高三次晋升压缩进 3 年。
**现实**：本科→正高约 15-23 年；主治→副高、副高→正高各约 5 年；基层年限缩但科研门槛升。

**任务**：
- [x] 职业期 MAX_TURNS 12→20；副高/正高首次申报设为第 8/16 季，重申设为第 12/18 季
- [x] 增加"住院总医师"一年期固定剧情（体力/心理双压榨 + 结业奖，`events_career_chief.ts`）
- [x] 晋升增加失败分支（材料被退/差一分/名额被占）并提供后续重申路径
- [x] 结局页事实卡/模拟参照按职称/地区刷新：显示季度收入、支出、可支配现金流，并拆分现金/资产/房贷
  余额与季度还款；数据由当前地区和晋升 flag 动态计算

---

## Round 4 · 属性系统：4 点是否都被"消费"

**实据**：
- 家境 → 父母补贴（有效）；成绩 → 高考定档+知识（有效）；运气 → 心理+手写事件率（有效）；外貌 → 起始人际+声望，且有 6 个 relations 门槛事件（有效，本批已补）。
- **缺口**：属性是开局定死、游戏内不可成长；运气/外貌无"成长/消耗"路径；资产账户只累积无用途。

**任务**：
- [x] 属性成长：职业暴露救助/隐瞒改变运气；职业期每 4 季长期夜班磨损外貌，变化范围 0–5，
  写入 `newsLog` 并由 `attr-growth.spec.ts` 回归
- [x] 资产提现/用途：购房首付优先用资产抵扣；R 菜单支持应急提现、子女教育基金和提前还贷，
  最近 100 条流水与旧档迁移已接入（与 Round 2 地区房价联动）
- [ ] 多周目：属性可"部分继承/重塑"（图鉴解锁后开局可重 roll），强化周目选择

---

## Round 5 · 医患纠纷：从"必发生"到"结果不确定"

**实据**：诉讼事件（第 3/9 季强制）已建，选项含请律师/私了/硬扛；但结果由选项静态决定，与"病历质量/证据"无关。
**现实**：医疗损害纠纷走司法鉴定，**举证责任倒置（医院举证）**，病历/证据质量决定胜负；诉讼周期 1-3 年。

**任务**：
- [x] 诉讼结果接入"病历质量"：`career_fin_record_fine` 若发生过病历扣费，诉讼更被动（证据瑕疵）
- [ ] 增加"医疗损害鉴定"环节：鉴定结论随机（与 knowledge/记录质量加权），决定胜负
- [ ] 私了/胜诉后增加"长期阴影/名誉"echo（1-2 季后 sanity/reputation 变化）
- [ ] 增加低概率"二审/后续追诉"阴影事件

---

## Round 6 · 执业环境：职业暴露与医保监管缺失

**实据**：现有医保拒付/DRG/亚专科劳累/夜班/职业初期压力；缺职业暴露与飞检。
**现实**：针刺伤/院感暴露是真实高频；医保飞行检查/科室自查普遍；急诊/儿科高离职。

**任务**：
- [ ] 新增"职业暴露"事件链：针刺伤 → 上报/预防用药 → 感染风险 → 心理阴影
- [ ] 新增"医保飞检/科室自查"事件（经济+合规压力）
- [x] 亚专科劳累改"累积效应"：外科连续高体力→体力上限降；儿科连续高心理→危机阈值升（`specialtyLoad.ts`）
- [x] 第 5 亚专科"急诊" + 薄轮转（`sub_emergency` / `events_career_rotation.ts`）

---

## Round 7 · 学术与科研：破五唯与一作之争

**实据**：论文/国自然/造假/撤稿已建；缺一作之争与临床型晋升通道。
**现实**：破五唯（唯论文）改革；一作/通讯之争真实高频；国自然中标率 ~15-20%。

**任务**：
- [x] "一作/通讯之争"事件（同门抢一作、导师加名）——科研生态高频痛点
  （ms_first_author_dispute 三向 flag：fa_fought/fa_conceded/fa_placated，
  分别由职业回声 career_first_author_fought/conceded_echo 与硕博回声 ms_first_author_placated_echo 消费）
- [x] "临床型晋升通道"事件（论文少但临床强也能评上）呼应破五唯，与 master_clinician 结局联动
  （career_clinical_track_review：requireStat clinical≥60 + passed_zhuzhi，临床实绩通道拿 passed_fugao）
- [x] 国自然申报做季节事件（固定季度触发，命中率按 papers/research 加权）
  （career_nsfc_season 可重复，rollOutcome base 0.08 + paperBonus 0.03 + knowledgeBonus 0.001 + repPer10 0.01，
  典型画像命中率 25% 贴合现实 15-30%；中标/落榜各有回声，落榜回声 excludeFlag nsfc_won 防先中后败矛盾）

---

## Round 8 · 家庭与代际：医生职业的时间挤压

**实据**：婚姻/育儿/家人离世已建；缺"值班错过家庭时刻"与子女叙事。
**任务**：
- [x] "值班错过家庭重要时刻"事件（纪念日/家长会/父母生日）——真实高频
  （career_missed_family_moment：家长会 vs 排定手术，family_moment_kept/missed 两向 flag
  各有回声——孩子作文正向锚点 / 孩子长大后疏远与修复尝试）
- [x] 配偶职业冲突/怨言事件链
  （career_spouse_strain：认真谈→spouse_talked→调班表修复回声；拖延→spouse_drifting→
  分房睡→婚姻咨询(spouse_reconciled)或冷战(marriage_cold)）
- [x] 子女叙事（孩子是否学医），可与多周目继承联动
  （career_child_asks_medicine 三向：支持/劝退/让 ta 自己决定，志愿表两年后经三条回声揭晓，
  终端 child_in_medschool 与传承主题呼应；玩家称谓全部性别中立）

---

## Round 9 · 交叉系统一致性（本轮最关键的横切检查）

**实据**：逐项核对新批次与旧系统交互：
- 诉讼 × 亚专科：诉讼对所有亚专科一刀切（外科/儿科纠纷场景应不同）——**缺亚专科纠纷变体**
- 诉讼 × 职级：赔偿金额未随职级/医院档位缩放（rankScaled 只用于医保/病历，诉讼没用）——**缺联动**
- 导师风格 × 家境：硕博收入叠加家境补贴——拮据+抠门导师 = 硕博期极端困窘，**可能过苛**（未模拟验证）
- 资产 × 结局：已补应急提现和用途；结局数据卡仍需明确区分现金、资产与负债
- HUD × 新字段：HUD 显示 attrs/家庭/理财/资产，职业期显示科室+医院档位，硕博显示导师风格短标签

**任务**：
- [x] 诉讼按亚专科分化（外科手术纠纷/儿科诊疗纠纷/产科医疗事故/内科漏诊误诊）与职级缩放
- [x] `balance-matrix.spec.ts` 增加"拮据+抠门导师"极端组合断言，防过苛
- [x] 资产增加 R 菜单"应急提现"入口（2% 手续费、单次 ¥10,000 上限）
- [x] HUD/阶段标签补：亚专科（已有）、导师风格（硕博 HUD）、医院档位（职业期 HUD）

---

## Round 10 · 可维护性与测试防线（真实覆盖率盘点）

**实据（2026-08-04 复核）**：已具备死 flag、地区经济、事件权重、运行时去重和阶段索引性能回归。
**剩余缺口**：
- sim 只有造假 vs 诚实两流，无"临床轨 vs 科研轨 vs 不同地区"矩阵
- 强制事件（诉讼/亚专科）只测了"可达"，未测"ESC 跳过仍补触发"的完整路径

**任务**：
- [x] `flag-echo-coverage.spec.ts`（Round 1 的回归）
- [x] `region-economy.spec.ts`（地区薪资/房价差异化回归）
- [x] `event-pool-diversity.spec.ts`（阶段索引等价、运行时事件去重率、职业期标题唯一率与 `<2ms` 性能门槛）
- [x] 新增 `balance-matrix.spec.ts`：诚实/临床/科研 × 一线三甲/县城基层 × 普通/极端画像，
  断言总财富、双线方向、地区职业收入和生命周期可完成性
- [x] career-nodes 补"ESC 跳过诉讼 → 下季仍强制"用例
- [ ] 建立 `docs/OPTIMIZATION-ROADMAP.md` 与 HANDOFF 的交叉引用，每次大改回勾任务

---

## 优先级总表（重排，含用户提问驱动的两项）

| 优先级 | 项目 | 轮 | 理由 | 状态 |
|---|---|---|---|---|
| **P0** | 地区/医院薪资与房价差异化 | 2 | 用户提问；人生最大经济分岔当前零影响 | ✅ 已落地（REGION_INCOME/REGION_HOUSE，fe92300） |
| **P0** | 死 flag 回响补全 + 回归 | 1 | 114 个选择无后果，"选择要回响"原则大面积失效 | ✅ 已落地（flag-echo-coverage.spec 清零 + bianzhi 补消费者） |
| **P0/P1** | 医学事实审计 + 诊断链 | M10 | 检查/报告/鉴别诊断流程缺少可追踪链路 | 🟨 诊断链已实现，医学人工复核待完成 |
| P1 | 诉讼按亚专科/职级缩放 + 证据反哺 | 5/9 | 让已建诉讼系统有深度与交叉 | ✅ 已落地（8 个专科案件 + record_sloppy 证据链 + ESC 补触发） |
| P1 | 晋升失败分支 + 年限门槛 + 职业期延长 | 3 | 核心职业体验"熬" | ✅ 已落地（20 季，第 8/16 季申报 + 两级重申） |
| P1 | 职业暴露 / 医保飞检 | 6 | 真实高频且教育价值高 | ✅ 已落地（针刺伤/飞检事件链） |
| P1 | 资产提现 + 属性成长 | 4/9 | 让现有系统闭环 | ✅ 已落地（资产/属性/结局财务卡 + 专项回归） |
| P2 | 一作之争 / 临床型晋升 | 7 | 呼应破五唯 | ✅ 已落地（ms_first_author_dispute + career_clinical_track_review + career_nsfc_season，2026-08-06） |
| P2 | 值班错过家庭 / 子女叙事 | 8 | 共鸣向粘性 | ✅ 已落地（career_missed_family_moment / career_spouse_strain / career_child_asks_medicine 三链，2026-08-06） |
| P2 | 极端组合 balance 断言 / 强制事件回归 | 9/10 | 测试防线 | ✅ 已落地（balance-matrix + career-nodes ESC） |
| P3 | 事件池去重回归 / 阶段索引 | 10 | 防重复并降低每回合全池扫描成本 | ✅ 已落地（event-pool-diversity.spec，2026-08-04） |
| P3 | 亚专科第 5 项(急诊)/薄轮转 | 3/6 | 已落地急诊专科+强制轮转一季 | ✅ |

> 验收基线沿用：`npx tsc --noEmit` + `npm run build` + `npx playwright test`（全量）。

---

## Round 11 · 事业编竞争比（写实化旧 flavor 事件）

**实据**（联网）：2024 全国事业编平均报录比 21:1、录取率 4.8%；热门医疗岗 >100:1；广东统考 50.74:1；笔试进面率不足 15%。
**结论**：旧 `bianzhi_result` 50/50 双选严重失真——"死磕编制"不该是抛硬币。
**改动**：`events_jobhunt.ts` 的 `bianzhi_result` 改为 `rollOutcome`（base 0.05）置 `jh_bianzhi_in/out`，并新增"边考边找退路"安全选项。录取率≈4.8% 贴近现实。

## Round 12 · 三方违约金额度

**实据**：法律无统一标准，超实际损失 30% 可请求减少；常见 5000–10000+；公立安家费倒追案例（返还 60 万 + 利息 45 万）。
**结论**：3k–5w 区间合理，私立安家费另算。
**改动**：`jobhunt_units.ts` 维持 `breachPenalty` 30k/20k/15k/8k/5k/20k；私立补"安家费可倒追"注释。`BETTER_OFFER_EVENT` 违约金随 `breachPenalty` 走、且 `rankScaled` 缩放。

## Round 13 · 本校附属医院留院率

**实据**：安医大 69.20% 留安徽、省内 85% 三甲临床岗优先本校；大医二院本校博士 48.15%；本院规培生笔试 +10 分。
**结论**：`affiliateBonus` 取 0.15–0.25 合理。
**改动**：维持 `affiliateBonus: 0.18`；`huaxi_h` 注释补"本院规培笔试 +10 分"。面试 `affiliateFlag:'jh_affil_<u>'` 仅在母校匹配时计入。

## Round 14 · 导师/内推成功率

**实据**：导师一句话顶十份简历是行业共识；内推显著提进面率（人情黑箱真实存在）。
**结论**：`referralBonus` 面试 0.22、backdoor 0.45+0.3 合理。
**改动**：维持；文档记录"推荐信加分但看硬实力与缘分"的口径（`referralFlag` 默认 `got_recommend`）。

## Round 15 · 笔试/面试淘汰率

**实据**：市直三甲热门岗报录比 20–50:1、进面率 <15%、笔试 60% + 面试 40%；顶尖 100:1。
**结论**：base 是"已满足学历/硬门槛的合格考生"口径，应低于全社会报录比但顶尖档仍要压低。
**改动**：`events_jobhunt_real.ts` `EXAM_BASE`：sanjiajia 0.35→0.3、sanjiayi 0.5→0.42；`IV_BASE`：0.3→0.28、0.45→0.4。erjia/community 基本不动。

## Round 16 · 学历门槛趋势

**实据**：三甲临床岗 90% 硬性博士；2023 县域近 1/4 岗硕博、本科留院率 <5%；东部县医院开始与三甲抢人。
**结论**：学历通胀严重，门槛必须真生效。
**改动**：phd 岗硬卡 `requireFlag:'phd_graduated'`；市级三甲（`took_hospital_a`）/公立三乙（`took_public`）加 `has_gp_cert` 硬门槛；master 岗以 `requireStat` 阈值代理（项目无独立 `master_graduated` flag，避免误伤硕士玩家）。`APPLY_EVENT` `maxTurn` 1→2 体现秋招+春招窗口。

## Round 17 · 地区薪资差

**实据**：全国均值 18.5 万；一线 25.3 万 / 二三线 19 万 / 四线 12.8 万，一线≈县城 2 倍；职称差 30–50%。
**结论**：旧 `REGION_INCOME` top1.35:county0.85 倍差不足。
**改动**：`economy.ts` `REGION_INCOME` 调为 `{ top:1.45, city:1.15, county:0.75, private:1.25 }`，top:county≈1.9×，更贴近真实但仍保平衡。

## Round 18 · 规培证硬门槛

**实据**：规培是临床上岗硬门槛；无规培证独立值班致一级甲等事故；"两个同等对待"政策保障规培合格本科按应届对待。
**结论**：无规培证不能独立值班/入职。
**改动**：`applyChoice` 对 `took_hospital_a`/`took_public` 单位加 `requireFlag:'has_gp_cert'`；县/社区（`offer_grass`）不卡以保本科路径。

## Round 19 · 招聘时间窗口

**实据**：秋招 9–11 月黄金窗口、春招 3–5 月补录、事业编统考 6–8 月；规培合格当年按应届同等对待。
**结论**：求职窗口应有弹性，不能一回合锁死。
**改动**：`APPLY_EVENT` `maxTurn` 1→2（秋招+春招），笔试/面试 `minTurn:1 / maxTurn:2-3` 已覆盖窗口。

## Round 20 · 违约后果（档案/信用）

**实据**：三方违约记入就业诚信档案，影响未来求职与派遣；学校可记入档案；毁约需担责。
**结论**：违约不只是赔钱，留记录。
**改动**：`BETTER_OFFER_EVENT` 声誉罚 -8→-10；`breachUnit` 仍置 `jh_breached`；新增 career 阶段 `jh_real_breach_echo`（requireFlag `jh_breached`）作为回响事件，"选择要回响"原则落地。

## Round 21 · 民营医院坑

**实据**：私立"流水不足 7000 开除医生"；提成写进合同常落空；安家费倒追；离职纠纷高发。
**结论**：高薪合同有陷阱。
**改动**：`sili_h.salaryNote` 补"流水不足 7000 开除 / 安家费倒追 / 离职纠纷高发"；维持 `breachPenalty:20k`。

## Round 22 · 规培留院

**实据**：专硕四证合一留本院概率最大，社会人留院 <10–20%；本院规培生笔试 +10 分；急诊/儿科等紧缺科室留用多。
**结论**：本院规培是留院捷径。
**改动**：`huaxi_h.salaryNote` 补"本院规培笔试 +10 分"；不做独立规培基地追踪以控复杂度（留待职业期轮次）。

## Round 23 · 定向/委培

**实据**：单位委培有编制/人事关系，须回原单位且有服务年限、违约赔多；"县管乡用"新招医师 5 年内须下乡镇。
**改动**：`xianyi_h.salaryNote` 补"县管乡用：新招医师 5 年内须下乡镇"；文档记录。

## Round 24 · 博士后过渡

**实据**：医学博士进站做博后年薪 21–36 万，出站 86% 进三甲；海归博士常先博后。
**结论**：博后是进顶尖三甲的常见跳板。
**改动**：引擎加 `postdocBonus`/`postdocFlag`（`events.ts` 联合 + `effects.ts`）；`APPLY_EVENT` 加"进博士后"选项（`setFlag:'did_postdoc'`，`flagRequire:'phd_graduated'`）；`interviewEvent` 对 phd 岗加 `postdocFlag:'did_postdoc', postdocBonus:0.12`。另加通用 `setFlag` effect kind（避免污染死 flag 白名单）。

## Round 25 · 非升即走

**实据**：预聘-长聘向三甲蔓延，>80% 双一流高校已实施；6 年内未达标解聘/转岗；45 岁上不了副高被优化。
**结论**：顶尖科研岗不是铁饭碗。
**改动**：`xiehe_h.salaryNote` 已含"非升即走"；文档记录（职业期后续轮可加非升即走事件）。

## Round 26 · 县管乡用 / 编制备案制

**实据**：卫健委推广"县管乡用/乡聘村用"；编制备案制无传统铁饭碗但进编易。
**改动**：`xianyi_h`/`wangtian_h.salaryNote` 补"县管乡用 / 编制备案制"注释。

## Round 27 · 规培与考研冲突

**实据**：规培期间考研/退培冲突，退培需赔违约金且影响诚信。
**改动**：文档记录（叙事层，求职阶段不易直接模拟；与 R20 违约记录呼应）。

## Round 28 · 35 岁年龄门槛

**实据**：本科/初级岗常限 35 岁以下，硕士 28–30，博士 35–38 可放宽；顶尖三甲临床岗 35 岁。
**结论**：年龄是隐性硬门槛。
**改动**：文档记录（本作无年龄 stat，留待后续轮；现有 `phd_graduated` 已隐含年龄优势）。

## Round 29 · 性别因素

**实据**：某些科室（妇产/护理）招聘存在隐性偏好，但属敏感且应避免刻板印象。
**改动**：仅文档记录，不落具体门槛，维持中立、避免强化偏见。

## Round 30 · 海归认可度

**实据**：海归医学博士是一线三甲争夺焦点，但需学历认证 + 常再规培 2–3 年；真正红利在人才引进/博后。
**结论**：海归在科研岗有优势。
**改动**：引擎加 `overseasBonus`/`overseasFlag`（`events.ts` + `effects.ts`）；`interviewEvent` 对 `xiehe_h` 加 `overseasFlag:'abroad', overseasBonus:0.12`（需 `abroad` flag，由硕博公派联培置）。

---

### R11–R30 改动总览

| 轮 | 文件 | 关键改动 |
|---|---|---|
| R11 | events_jobhunt.ts | `bianzhi_result` → rollOutcome base 0.05 |
| R12 | jobhunt_units.ts | 维持 breachPenalty，私立补安家费注释 |
| R13 | jobhunt_units.ts | 维持 affiliateBonus 0.18，huaxi 补规培+10分 |
| R14 | events_jobhunt_real.ts | 维持 referralBonus |
| R15 | events_jobhunt_real.ts | EXAM_BASE/IV_BASE 顶尖档下调 |
| R16 | events_jobhunt_real.ts | phd 硬卡、市级/公立加 has_gp_cert、maxTurn→2 |
| R17 | economy.ts | REGION_INCOME 放大 top:county 倍差 |
| R18 | events_jobhunt_real.ts | applyChoice 加 has_gp_cert 门槛 |
| R19 | events_jobhunt_real.ts | APPLY_EVENT maxTurn 1→2 |
| R20 | events_jobhunt_real.ts | 声誉 -8→-10 + 新增 jh_real_breach_echo |
| R21 | jobhunt_units.ts | sili_h 补民营坑注释 |
| R22 | jobhunt_units.ts | huaxi_h 补规培留院 |
| R23 | jobhunt_units.ts | xianyi_h 补县管乡用 |
| R24 | events.ts / effects.ts / events_jobhunt_real.ts | postdocBonus + 博后选项 + setFlag effect |
| R25 | jobhunt_units.ts | xiehe_h 非升即走（已注） |
| R26 | jobhunt_units.ts | 县管乡用/编制备案制注释 |
| R27 | （文档） | 规培考研冲突 |
| R28 | （文档） | 35 岁门槛（无 age stat） |
| R29 | （文档） | 性别因素（中立，不落门槛） |
| R30 | events.ts / effects.ts / events_jobhunt_real.ts | overseasBonus + 海归加成 |

> 引擎扩展均以"单位无关、数值由事件作者按单位写好"为原则：`rollOutcome` 仅新增 `overseasBonus/overseasFlag`、`postdocBonus/postdocFlag` 两个可选加成 + 通用 `setFlag` effect kind，全部局部、可逆。
