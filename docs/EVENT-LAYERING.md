# 事件分层规范（EVENT LAYERING）

目的：让确定性人生节点、好感度互动与日常生成事件各司其职，避免权重互相打架。

## 三层

| 层 | 触发方式 | 例子 | 权重/强制 |
|---|---|---|---|
| L1 人生节点 | 场景 `forcedEventId` + once flag | 亚专科、诉讼、鉴定、二审、晋升 | 强制到完成；ESC 仅跳过当卡 |
| L2 关系互动 | `requireFlag` trust_/distant_ + 修复链 | 林主治疏远→修复→再信任→职业回声 | weight 35–55；once 链用 flag 门控 |
| L3 日常生成 | `eventGen` / 地点池 / 高 weight 手写 | 排班、门诊、琐事 | 填满季内空档；可被 L1/L2 挤占 |

## 抽取顺序（卡片 / 行走共用 turnFlow）

1. 场景强制节点（L1）
2. `*_due` 系统到期事件
3. `drawStorylet`：手写优先（运气影响）→ 加权随机（L2/L3）

## 写作约束

- L1 不得依赖随机抽中；必须 scene 强制或 `*_due`
- L2 每个 `flagSet` 须有消费者（requireFlag / affinity / 经济），或进叙事白名单
- L3 禁止写可执行剂量/处方；医学表述走审计清单
- 新 NPC 链推荐形状：初识谈话 → `distant_*` 疏远事件 → `*_repaired` + `changeAffinity` → 信任/回声

## 与 QuestLog

任务文案应指向**地点或 NPC**（如「去技能中心」「找林主治」），完成时由 `QuestLog.setItems` 返回提示供飘字，不要只写抽象 flag 名。
