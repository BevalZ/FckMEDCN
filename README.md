# FckMEDCN

一款基于 Vite 与 Phaser 的中文临床医学人生模拟游戏。玩家从高考和大学阶段出发，经历实习、规培、
深造、求职与职业生涯，并在医学能力、心理状态、人际关系、经济压力和职业选择之间取舍。

## 本地运行

需要本机已安装 Node.js 与 npm。

```bash
npm install
npm run dev
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

## 操作

- 行走场景：WASD 或方向键移动，E 交互，Q 查看任务。
- 卡片场景：数字键、字母键或方向键选择，Enter 确认。
- 通用快捷键：H 帮助，R 游戏菜单，M 静音；各场景的 ESC 语义以帮助面板为准。
- 触屏设备提供方向、交互、任务、帮助、菜单及事件卡“点击 / ESC 离开”入口；移动端刘海安全区、横竖屏切换和长时间操作仍需真机验收。

## 测试

```bash
npm run typecheck
npm run typecheck:test
npm run build
npm run test:preview:subpath
npm run test:ci
```

普通 push 和 pull request 会执行上述自动化并上传 `dist` 预览产物。GitHub Pages 发布由 `v*` 标签或手动
workflow 触发，并额外要求 `npm run release:check`（或对应 track）通过。

### 发布轨道

| Track | 触发方式 | 门禁 |
|---|---|---|
| **preview** | 标签 `vX.Y.Z-preview`（可带后缀，如 `v0.1.0-preview.1`），或手动 workflow 选 preview | 仍强制：manifest schema、禁止 ungated「真实*」措辞、结局卡必须 `evidenceId`、音频授权。**推迟**：医学终审、外部证据终审、桌面/真机人工验收 |
| **full** | 其它 `v*` 标签（如 `v1.0.0`），或手动 workflow 默认 full | 上述硬门禁 + 全部人工项必须 `verified` |

本地：

```bash
npm run release:check:preview   # 可玩预览门禁
npm run release:check:full      # 认证发布门禁
```

预览构建会设置 `VITE_RELEASE_TRACK=preview`，标题页声明“医学内容尚未终审”；未 `verified` 的结局事实卡仍不展示。

## 文档速览

- 结局最短路径：[`docs/ENDING-REACHABILITY.md`](docs/ENDING-REACHABILITY.md)
- 交接与门禁：[`docs/HANDOFF.md`](docs/HANDOFF.md)

## 医学内容声明

本项目是叙事游戏，不构成医学建议、诊断或治疗依据。当前医学内容仍在事实审计中，尚未完成临床医师与药师终审；
详情见 [`docs/MEDICAL-FACT-AUDIT.md`](docs/MEDICAL-FACT-AUDIT.md)。
