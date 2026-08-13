# 结局可达矩阵

真相源：[`src/data/endings.ts`](../src/data/endings.ts) 的 `determineEnding()`。  
**先匹配先生效**——下表按判定优先级排列；更靠前的条件会截住后面的成功结局。

图鉴线索见 [`endingHints.ts`](../src/data/endingHints.ts)；负向薄路径见 [`events_career_integrity.ts`](../src/data/events_career_integrity.ts)。

## 最短路径一览

| 优先级 | 结局 ID | 标题 | 最短可达路径（玩家动作） | 诚实局？ |
|--------|---------|------|--------------------------|----------|
| 晚年生效 | `meteor_life` | 流星 | 走到时代 8；`collapseCount≥2` 或重大身体事件≥4 | ✅ |
| 晚年生效 | `final_rest` | 安息 | 时代 8 选「终于可以休息了」或 `strain≥85` | ✅ |
| 晚年生效 | `great_healer` | 大医精诚 | 时代 6–8 高完成度/传承 + 声望≥45 + 家庭仍在 + 内在稳定 | ✅ 难 |
| 晚年生效 | `inheritor` | 传承者 | 时代 6 接班成功 / `legacy≥60` / 选「把接力棒交出去」 | ✅ |
| 晚年生效 | `ordinary_road` | 平凡之路 | 走到归途且 `completion≥60`（或意义/生活满意度够） | ✅ |
| 晚年生效 | `unfinished_life` | 未尽 | 走到归途但完成度低；或舆论/科研风险极高 | ✅ |
| 早退 | `era0_unchosen_road` | 未选择的路 | 高考志愿前主动选另一专业 | ✅ |
| 早退 | `era0_fell_short` | 差一点 | 分数不够医学院且不复读/不定向 | ✅ |
| 早退 | `era0_escape_white_tower` | 逃离白色巨塔 | 放榜后拒绝继续谈学医 | ✅ |
| 早退 | `left_undergrad` | 没读完的白大褂 | 本科递交退学 | ✅ |
| 早退 | `quit_guipei` | 我不干了 | 规培 `left_med`；或考虑退出且 sanity\<25（非职业期） | ✅ |
| 非医 | `worker_struggle` | 浮沉打工路 | `no_college` 且总财富\<−1万 或 sanity\<30 | ✅ |
| 非医 | `worker_steady` | 安稳的日子 | `no_college` 且经济/心理不崩 | ✅ |
| 诚信 | `disgraced` | 通报里的那个名字 | `exposed_ruin`（挂名风暴硬刚失败 / 重度造假曝光）或 `misconductRisk≥90` | ✅ 薄路径 |
| 诚信 | `lucky_fraud` | 没有人来敲门 | `has_faked` 且未重度曝光，并 `passed_fugao`（或论文≥5 / 造假调岗） | ✅ 薄路径 |
| 分岔 | `overseas_doctor` | 太平洋彼岸的执照 | `abroad` + knowledge\>60 | ✅ |
| 分岔 | `medical_affairs` | 脱下白大褂 | `industry_intern` 或 `took_private` | ✅ |
| 顶流 | `top_surgeon` | 无影灯下的王 | papers≥8 且 reputation≥70（优先于学术星） | ✅ 难 |
| 顶流 | `academic_star` | 论文署名者 | papers≥6 且（research≥55 或 knowledge≥70） | ✅ |
| 临床 | `master_clinician` | 一把好刀 | clinical≥60、papers≤3、reputation≥40 | ✅ |
| 基层 | `grassroots_hero` | 县城里的主心骨 | `offer_grass`/`base_home`/`chose_grassroots` 且 relations≥60 | ✅ |
| 基层 | `community_doctor` | 社区里的熟人 | 同上但 relations\<60 | ✅ |
| 倦怠 | `burnout_early` | 35岁以前的倦怠 | 丧亲重创 sanity\<35；或 age\<35 且 sanity\<30 / meaning\<20 | ✅ |
| 默认带 | `chief_at_45` | 主任医师的日常 | `passed_zhenggao`（且未被诚信结局截住） | ✅ |
| 默认带 | `stable_at_45` | 45岁的稳定 | 主治/副高 + 声望过线（已婚 35 / 未婚 50） | ✅ |
| 默认 | `exhausted_attending` | 精疲力竭的主治 | 走完职业但声望不够；或总财富\<−3万；或其他条件未命中 | ✅ |

「诚实局」= 不必早开硕博买论文/删数据流；可用职业期强制诚信节点触达负向结局。

## 判定顺序（简化）

```
时代8 已触发？ → 晚年六结局
否则早退 / 退学 / 弃医？
否则 no_college → 打工两结局
否则 exposed_ruin / 高不端风险 → disgraced
否则 has_faked + 职称红利且未重度曝光 → lucky_fraud
否则 出国 / 产业私立 / 顶流论文 / 临床专家 / 基层 / 倦怠 / 负债
否则 正高 → chief；副高/主治 → stable 或 exhausted
否则 exhausted_attending
```

## 负向结局最短操作（诚实起步）

### `lucky_fraud`
1. 正常读到职业期，升主治（`passed_zhuzhi`）。
2. 第 7 季起强制「职称材料差一篇」→ 选补数据或礼品挂名（`has_faked`）。
3. 评上副高（`passed_fugao`），且不要走到 `exposed_ruin` / 重度撤稿。
4. 进入结局判定前保持上述 flag。

### `disgraced`
1. 职业期第 11 季起强制「科室挂名被点名」。
2. 选「一口咬定参与充分，硬刚核查」。
3. `rollOutcome` 失败 → `exposed_ruin` → 结局截为通报。

（造假流仍可通过季度诚信引擎自然引爆 `exposed_ruin`，路径更长、随机性更高。）

## 易被截住的成功结局

| 你想要的 | 常被谁截住 | 注意 |
|----------|------------|------|
| `stable_at_45` / `chief_at_45` | `lucky_fraud` | 灰色论文 + 副高会先落侥幸 |
| `top_surgeon` | `disgraced` / `lucky_fraud` | 诚信优先于顶流 |
| `master_clinician` | 基层旗 / 产业旗 | 先清 `offer_grass`/`took_private` 意图 |
| `academic_star` | `top_surgeon` | papers≥8 且 rep≥70 会走外科王 |

## 维护

- 改 `determineEnding` 条件时，同步改本表与图鉴雾面/清晰文案。
- 新增结局：在本表加一行，并补 `ENDING_HINTS` / `ENDING_HINT_FOG`。
