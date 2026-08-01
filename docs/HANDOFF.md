# 阶段性总结 - 全部待办闭环，仅剩一项人工目视

## 当前状态

- **路线图 ①②③④ 全部完成**。
- **known-issues 全部清零**：A1/A2/A3、B2/B3/B4/B6/B7 已修已验，B1/B5 设计如此/已验证，
  D1-D4 为设计记录。
- 全量 **82 用例绿**（exit=0；balance-sim/冷启动首跑 flaky 是 Windows 环境成本，见 D4）。
- `npm run build` 通过；git 仓库健康，工作区干净。
- **唯一剩余**：A2 文字渲染的实际观感（各字号扫一眼），纯人工目视项，无代码待办。

## 下次会话的起点

已完成：题库扩充（35 题）；电梯字符冲突修复（'T'→'U' + tilemap-chars 回归）；
移动端可行性评估（结论见下）；**职业后期叙事**（promote_zhenggao + 8 条 career_late_* 事件，
新结局 chief_at_45 接入判定链，career-late-events 回归 9 事件门控 + 3 flag 消费闭环）；
**人生图鉴**（collection.ts 独立 key 跨周目累计，EndingScene 收录 + CollectionScene 左右栏图鉴，
标题页 G 键/按钮入口，collection-gallery 回归）；
**生涯里程碑徽章**（badges.ts 22 条跨阶段 flag/state 判定，commitChoice 统一检查，
ConsequencePopup 弹窗顶部金色展示，图鉴第二页签 TAB 切换 + ←/→ 翻页，badges-gallery 回归）；
**多周目传承**（collection.ts 加点数经济——通关 +1/每 5 徽章 +1；legacy.ts 8 条克制式开局加成
perk，临床/科研 2 点其余 1 点；TitleScene.create 对每次新开局统一应用加成（继续游戏读档会覆盖，
不受污染）；图鉴第三页签空格购买；legacy-inheritance 回归）。
**数据对比系统**（恢复原 M4 规划：comparison.ts 给 15 结局各配 3 个可比指标——年龄/存款/论文，
带真实区间与"低于参考/在参考区间内/高于参考"判定；EndingScene 中部改为逐项对齐对比表
[你的值 vs 真实值 + 判定]，感情/家人/状态 行与真实数据卡保留；data-comparison 回归）。
**ESC 交互完善**（ConsequencePopup 键盘 handler 改为构造时注册一次——旧 addKey Key 对象在多弹窗
共用 KeyboardPlugin 时会互相 removeAllListeners 误清；支持 opts.escape 'dismiss'/'cancel'；事件卡
卡片阶段 ESC 跳过 [skipCurrentEvent，不耗 once、按无事件推进]；EventCard.hide/cancel 补 container
置空，否则 busy() 首显后恒 true 卡死 R 守卫；restart-game 回归 + 冷启动容忍 120s）。
**技能中心缝合修复**（用户反馈"技能中心没有练习缝合选项"——根因：任务"技能中心练缝合"只认缝合
小游戏 flag，但事件混在大池随机抽、日常"练缝合"不设 flag；修复：技能中心交互优先触发
clinical_skills_lab 缝合小游戏 + 提示改"[E] 技能中心：练缝合；新增 quest-reachability 审计
[4 个任务目标事件可达+小游戏配置正确] 防同类错误复发）。
**三轮回 优化**（① 帮助面板 H 键：操作/阶段提示速查，行走与卡片场景均可切换；② R 键升级为游戏菜单：
继续/返回标题[不清档]/重新开档[先确认可 ESC 反悔]，↑↓+数字键选择；③ 新闻回声：给考研保研/奖学金/
国奖/副高/正高/结婚/生子/退培/通报后 等 9 个里程碑事件补 newsTickerAfter，人生节点在新闻栏回响；
news-echo 静态回归守配置）。**新闻回声可见性增强**（用户试玩反馈"没看见新闻"——回声本身正常，
但事件随机抽取+底部新闻条低调；改：回声触发时屏幕上方弹醒目横幅[newsToast]+播放 news 提示音，
news-echo-toast 行为回归守 log/横幅/优先显示，覆盖校园/医院/结婚/生子）。
**开局性别选择**（用户反馈"为什么假定性别"——放榜夜文案曾写死"儿子"；改：GameState 增 gender
字段[旧档 applySave 兼容默认 male]，GaokaoScene 开头先选 男生/女生，放榜夜用 sonWord() 按性别生成
"儿子/女儿"；其余玩家指向称谓改中性/斜杠[学长/学姐、儿子/女儿]；高考导航测试回车次数 5→6；
gender-selection 回归守两性路径）。
**性别称谓全覆盖**（用户要求覆盖全部文案——核查后玩家本人指向词仅 3 处：国奖"儿子/女儿"、
留级"学长/学姐"、规培"师兄/师姐"，其余"师兄/学姐"均为 NPC 指称不动；实现 src/data/gender.ts
的 renderGendered() 占位符系统，EventCard/ConsequencePopup 渲染时统一按 gender 替换
{son}/{senior}/{seniorFellow} 等，gender-selection 补占位符渲染断言[女生路径后果="我女儿拿了国奖"]）。
**开局点数分配**（用户建议：除性别外可分配点数——家境/成绩/运气/外貌，作为后续随机事件、
家庭支持参考与分数划档依据）：GameState 增 attrs{family,academic,luck,looks}（各 0-5，预算 10），
familyWealth 由 attrs.family 推导（0-1 拮据/2-3 普通/4-5 殷实，旧档默认 middle）；GaokaoScene 性别后
新增"分配你的初始属性"阶段（↑↓ 选行、←/→ 加减、空格确认），确认后写入 attrs + 家庭条件 + 起始加成
（成绩×5 知识、外貌×4 人际+1 声望、运气×2 心理）；成绩决定**分数线划档**（academic≥5 全档、4→684、
3→649、2→609、≤1→540，不足档隐藏并提示"更高的分数档需提升成绩"）；默认分配 家境2成绩5运气1外貌2
（保证测试 685+ 可选）。坑：DEFAULT_ATTRS 须在 createInitialState 前声明否则 TDZ 崩溃。高考流程
gender→attrs→score→reveal→school→track→confirm 共 7 步，导航测试回车 6→7、女生路径 5→6。
attr-allocation 回归守默认值/调整/划档。
**属性→随机事件影响验证**（用户要求继续测试）：①成绩→起始知识→知识门槛事件可用性
（academic5 解锁考研保研[需知≥55]、成绩0 触发学业警示[知≤45]，双向验证）；②运气→手写主线
事件出现率（drawStorylet 的 handPriority 改为随运气 0.45→0.75，luck0 手写率0.46 vs luck5 0.76，
统计验证）；attr-event-influence 回归守这两条。
**经济平衡修复**（按审查优先级）：①助学贷款——属性分配阶段新增第 5 行"助学贷款"开关（家境 0-3
可用），上学期间（本科/实习）每季 +1500 生活费、工作后（职业）每季还 1500；拮据家庭本科净结余
从 -2000/季 改善到 -500/季，把"穷学生必死"变成有代价的活路；②买房真实化——career_mid_house 首付
-3000 → -8000（保留房贷 2500/季）；③全生命周期经济回归 economy-lifecycle（固定 PRNG + 策略化选择跑
完整管线，断言普通家境存活/拮据可贷款缓解/贷款优于不贷/殷实优于普通）。坑：属性阶段 refreshAttrUI
须在贷款行元素创建后调用，否则访问未定义 text 抛错使高考场景崩。economy 补助学贷款单元测试、
attr-allocation 补贷款开关用例。
剩余可选项（与用户确认后再动）：
1. **用户试玩**：回归清单的 5 条试玩路径（known-issues 末尾），顺手确认 A2 文字观感与图鉴/传承手感。
2. **移动端**：评估结论——底子比预想的好，但**不建议现在做**（详见下节）。

## 移动端可行性评估（2026-07-30，只出方案未改代码）

**已具备（触屏开箱即用）**：EventCard 选项 pointerdown 可点、ConsequencePopup 点击关闭、
考试小游戏选项可点、HUD 部分可点、Scale.FIT 自适应 + user-scalable=no。

**缺口（按阻塞程度排序）**：
1. **移动/交互**：Walker 只读键盘（`createWalkerKeys` 已预留"接摇杆从这里改"的口子）；
   三场景的 E 交互走 `JustDown(interactKey)`，需抽 `interactPressed()` 供触屏复用。
2. **三类小游戏是纯键盘**：缝合时机条（按键定帧）、CPR（节奏按键）、夜班（1-5 数字键）
   ——每个都要单独设计触屏区（点按代替按键不难，但要逐个做+逐个回归）。
3. ESC 取消、Q 任务清单、T 导师对话：次要，可在 UI 加小按钮。

**最小可行方案**（若要做）：`VirtualJoystick`（左下四向吸附摇杆 + 右下 E 钮，
仅 `maxTouchPoints>0` 时显示）→ `walker.setExternalDir()` → 三场景 interact 抽取。
但小游戏触屏化是绕不开的大头，**移动版体验完整度取决于它**。
建议：本项目定位桌面键盘体验，移动端等用户明确提出再立项。

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
