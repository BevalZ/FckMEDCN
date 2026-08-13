# Release review workpack

Generated at: 2026-08-13T09:58:22.089Z
Source HEAD at generation: 467683e
Manifest schema versions: evidence v1; medical v1; audio v1; acceptance v1

Generated from the four release manifests. This report is a queue, not an approval record. Do not change `pending` to `verified` without the named reviewer, date, evidence reference, and written conclusion.

- Medical records: 78 total; 78 outstanding
- External evidence: 8 total; 8 outstanding (8 source-complete awaiting reviewer, 0 source-incomplete)
- Manual acceptance checks: 3 total; 3 outstanding

## 1. Medical and pharmacy review queue

Medical queue by reviewerRole: Unassigned medical/pharmacy reviews: 78; Assigned licensed-clinician reviews: 0; Assigned clinical-pharmacist reviews: 0

Suggested reviewer split: licensed-clinician 66; clinical-pharmacist 12
Pre-review split: flow_checked 26; not_started 52
Medical records missing evidenceRefs: 78

Rows with reviewerRole `unassigned` must be assigned to a real reviewer before they can be marked verified. The suggested role is derived from category only and is not an approval.

### Unassigned medical/pharmacy reviews

| id | suggested reviewer | category | label | review focus | pre-review | status | evidenceRefs |
|---|---|---|---|---|---|---|---|
| patient_lonely_elder_hypertension | licensed-clinician | patient | 独居老人·高血压 | 规律服药、家庭支持、复查与用药表 | not_started | pending | — |
| patient_migrant_worker_fall | licensed-clinician | patient | 农民工·工地摔伤 | 外伤分诊、工伤流程与停工建议 | not_started | pending | — |
| patient_white_collar_insomnia | licensed-clinician | patient | 白领·失眠焦虑 | 失眠与焦虑的表述、转诊边界 | not_started | pending | — |
| patient_retired_teacher_arthritis | licensed-clinician | patient | 退休教师·关节炎 | 关节炎症状与康复建议 | not_started | pending | — |
| patient_delivery_rider_gastritis | licensed-clinician | patient | 外卖骑手·胃炎 | 胃痛病因不确定时的检查与用药边界 | not_started | pending | — |
| patient_postpartum_low_mood | licensed-clinician | patient | 产后妈妈·情绪低落 | 产后抑郁识别、家属参与与求助 | not_started | pending | — |
| patient_family_dominant_copd | licensed-clinician | patient | 家属强势·老慢支 | 慢阻肺急性加重、风险告知与记录 | not_started | pending | — |
| patient_farmer_diabetes | licensed-clinician | patient | 老农民·糖尿病 | 糖尿病依从性、复查与基层随访 | not_started | pending | — |
| patient_student_headache_myopia | licensed-clinician | patient | 高中生·头痛近视 | 视力问题与头痛的鉴别、家长沟通 | not_started | pending | — |
| patient_taxi_driver_prostate | licensed-clinician | patient | 出租车司机·前列腺 | 排尿症状、职业因素与检查边界 | not_started | pending | — |
| patient_business_owner_checkup | licensed-clinician | patient | 企业家·全面体检 | 胸部不适不能简化为体检套餐 | not_started | pending | — |
| patient_lonely_man_gi_bleed | licensed-clinician | patient | 独居大爷·胃出血 | 黑便与消化道出血的急诊风险 | not_started | pending | — |
| patient_deaf_pneumonia | licensed-clinician | patient | 聋哑人·肺炎 | 沟通支持、肺炎评估与医嘱传达 | not_started | pending | — |
| patient_superstitious_mass | licensed-clinician | patient | 迷信老人·胃部肿物 | 占位、活检、延误风险，避免直接等同癌症 | not_started | pending | — |
| patient_thyroid_nodule | licensed-clinician | patient | 中年女性·甲状腺结节 | 超声分层、穿刺适应证与随访语境 | not_started | pending | — |
| patient_child_seizure | licensed-clinician | patient | 小学生·抽搐发作 | 首次抽搐评估、脑电图与急救表述 | not_started | pending | — |
| patient_elderly_hip_fracture | licensed-clinician | patient | 独居老太·股骨颈骨折 | 跌倒后处理、骨折与康复/照护 | not_started | pending | — |
| patient_afib_anticoagulation | licensed-clinician | patient | 高知患者·房颤 | 房颤评估、抗凝获益与出血风险 | not_started | pending | — |
| patient_child_high_fever | licensed-clinician | patient | 打工母亲·孩子高烧 | 儿童发热、异地医保与就医建议 | not_started | pending | — |
| patient_cirrhosis_alcohol | licensed-clinician | patient | 嗜酒者·肝硬化 | 肝硬化体征、戒酒支持与复查 | not_started | pending | — |
| patient_anorexia_hypoglycemia | licensed-clinician | patient | 厌食少女·低血糖 | 低血糖急症、进食障碍与心理转介 | not_started | pending | — |
| patient_cataract_rural_elder | licensed-clinician | patient | 农村老太·白内障 | 白内障、术前检查与救助项目表述 | not_started | pending | — |
| patient_voice_nodule_streamer | licensed-clinician | patient | 网红主播·声带结节 | 声带结节、声休与喉镜复查 | not_started | pending | — |
| patient_night_worker_ulcer | licensed-clinician | patient | 夜班工人·胃溃疡 | 胃溃疡、胃镜和疗程依从性 | not_started | pending | — |
| patient_veteran_back_pain | licensed-clinician | patient | 退伍老兵·腰腿旧伤 | 腰椎间盘突出与康复建议 | not_started | pending | — |
| patient_caregiver_anxiety | licensed-clinician | patient | 陪护家属·焦虑 | 陪护者身心负担与就医对象 | not_started | pending | — |
| patient_programmer_neck_pain | licensed-clinician | patient | 程序员·颈椎病 | 颈肩症状、姿势建议与避免过度诊断 | not_started | pending | — |
| patient_teacher_influenza | licensed-clinician | patient | 外教·流感高热 | 流感诊断、抗病毒药与沟通支持 | not_started | pending | — |
| patient_truck_driver_back_pain | licensed-clinician | patient | 大货车司机·腰病 | 腰痛红旗征、驾驶安全与休息建议 | not_started | pending | — |
| patient_health_anxiety | licensed-clinician | patient | 疑病中年·全身不适 | 必要检查、正常结果解释与心理支持 | not_started | pending | — |
| patient_febrile_seizure_toddler | licensed-clinician | patient | 幼儿·高热惊厥 | 年龄、退热和惊厥现场处理表述 | not_started | pending | — |
| patient_appendicitis_child | licensed-clinician | patient | 小学生·急性阑尾炎 | 右下腹痛、超声、手术评估与术后饮食 | not_started | pending | — |
| patient_exam_anxiety | licensed-clinician | patient | 初中生·考前焦虑 | 躯体化表现、心理支持与家长沟通 | not_started | pending | — |
| patient_asthma_attack_teen | licensed-clinician | patient | 少年·哮喘急性发作 | 急性缓解药、吸入技术与肺功能复查 | not_started | pending | — |
| template_emergency | licensed-clinician | clinical-template | 急诊科 | 胸痛、创伤、昏迷、高热惊厥、药物过量；生命体征与上级协作 | not_started | pending | — |
| template_orthopedics | licensed-clinician | clinical-template | 骨科 | 腰痛、胫骨骨折、颈椎病、膝关节积液；影像与会诊 | not_started | pending | — |
| template_cardiology | licensed-clinician | clinical-template | 心内科 | 心悸、气促、夜间呼吸困难；心电图与心脏超声 | not_started | pending | — |
| template_respiratory | licensed-clinician | clinical-template | 呼吸科 | 咯血、低热、慢阻肺加重；胸片与肺功能 | not_started | pending | — |
| template_gastroenterology | licensed-clinician | clinical-template | 消化内科 | 黑便、反酸、腹痛；胃镜与腹部超声 | not_started | pending | — |
| template_neurology | licensed-clinician | clinical-template | 神经内科 | 口角歪斜、头痛、肢体麻木；头颅 CT | not_started | pending | — |
| template_pediatrics | licensed-clinician | clinical-template | 儿科 | 高热、腹泻脱水、抽搐；生长发育评估与补液 | not_started | pending | — |
| template_obstetrics | licensed-clinician | clinical-template | 妇产科 | 孕晚期见红、月经过多、下腹痛；专科会诊 | not_started | pending | — |
| template_dermatology | licensed-clinician | clinical-template | 皮肤科 | 皮疹、药物过敏、湿疹；外用药与抗组胺药表述 | not_started | pending | — |
| template_endocrinology | licensed-clinician | clinical-template | 内分泌科 | 多饮多尿、甲状腺结节、低血糖；血糖与甲功 | not_started | pending | — |
| template_ophthalmology | licensed-clinician | clinical-template | 眼科 | 视力骤降、眼红流泪、飞蚊症；眼底检查 | not_started | pending | — |
| template_psychiatry | licensed-clinician | clinical-template | 精神科 | 失眠、情绪低落、惊恐发作；量表与晤谈 | not_started | pending | — |
| education_penicillin_skin_test | clinical-pharmacist | medication | 青霉素皮试阳性后的处理 | 过敏风险、交叉过敏与不能自行换药 | not_started | pending | — |
| education_cpr_rate | licensed-clinician | education | CPR 按压频率 | 指南版本、按压质量与急救上下文 | not_started | pending | — |
| education_flatline_narrative | licensed-clinician | education | 心电图“拉直”叙事 | 叙事简化，避免把监护波形等同完整诊断 | not_started | pending | — |
| education_anticoagulation_tradeoff | clinical-pharmacist | medication | 抗凝治疗利弊 | 房颤场景的风险沟通，不给出个体化处方 | not_started | pending | — |
| education_pediatric_emergency | licensed-clinician | education | 高热惊厥/哮喘/低血糖 | 儿童急症和现场急救边界 | not_started | pending | — |
| education_suture_consent | licensed-clinician | workflow | 缝合与术前谈话 | 无菌、分层、知情同意和上级监督 | not_started | pending | — |
| diagnostic_workup | licensed-clinician | diagnostic | diagnostic_workup | 生命体征/检查申请；检查申请语境、上级复核顺序；急性胸闷早期心电图等时间敏感检查已点出 | flow_checked | pending | — |
| diagnostic_report_review | licensed-clinician | diagnostic | diagnostic_report_review | 化验/影像报告与鉴别诊断；不把单一异常等同最终诊断 | flow_checked | pending | — |
| diagnostic_report_review_assisted | licensed-clinician | diagnostic | diagnostic_report_review_assisted | 低知识状态下的带教复核；教学措辞与风险边界 | flow_checked | pending | — |
| diagnostic_followup | licensed-clinician | workflow | diagnostic_followup | 复查计划/交班/求助路径；随访时间表的概括性表述 | flow_checked | pending | — |
| diagnostic_shortcut_echo | licensed-clinician | diagnostic | diagnostic_shortcut_echo | 检查单流程回声；避免检查越多越好的暗示 | flow_checked | pending | — |
| diagnostic_rushed_echo | licensed-clinician | diagnostic | diagnostic_rushed_echo | 鉴别诊断复盘回声；不确定性与上级复核表述 | flow_checked | pending | — |
| med_reconciliation | clinical-pharmacist | medication | med_reconciliation | 入院用药清单、过敏史和不确定项核对；核对顺序、记录边界和上级复核 | flow_checked | pending | — |
| med_indication_review | clinical-pharmacist | medication | med_indication_review | 抗菌药物指征与复评目标；抗菌药物管理措辞、药师参与边界 | flow_checked | pending | — |
| med_indication_review_assisted | clinical-pharmacist | medication | med_indication_review_assisted | 低知识状态下的带教/药师复核；教学路径与风险沟通 | flow_checked | pending | — |
| med_adverse_effect_escalation | clinical-pharmacist | medication | med_adverse_effect_escalation | 疑似不良反应的时间线记录与升级；不把时间相关等同因果，及时报告边界 | flow_checked | pending | — |
| med_discharge_teachback | clinical-pharmacist | medication | med_discharge_teachback | 出院清单、复诊安排与复述确认；teach-back 译法、求助路径和交接责任 | flow_checked | pending | — |
| med_reconciliation_echo | clinical-pharmacist | medication | med_reconciliation_echo | 未完成核对的规培复盘；避免把清单抄录等同于核对完成 | flow_checked | pending | — |
| med_indication_echo | clinical-pharmacist | medication | med_indication_echo | 未复评用药指征的复盘；区分继续原方案与临床依据 | flow_checked | pending | — |
| med_adverse_effect_echo | clinical-pharmacist | medication | med_adverse_effect_echo | 忽略疑似不良反应的职业期回声；不确定性、记录和升级流程 | flow_checked | pending | — |
| med_teachback_echo | clinical-pharmacist | medication | med_teachback_echo | 完成复述确认后的职业期回声；沟通确认的适用场景 | flow_checked | pending | — |
| med_teachback_rushed_echo | clinical-pharmacist | medication | med_teachback_rushed_echo | 仓促出院沟通的职业期回声；患者理解与求助路径的表述 | flow_checked | pending | — |
| clinical_schedule_handoff | licensed-clinician | workflow | clinical_schedule_handoff | 轮转交接、责任层级和未完成事项；排班/交接责任边界 | flow_checked | pending | — |
| clinical_rounds_hierarchy | licensed-clinician | workflow | clinical_rounds_hierarchy | 分级查房、风险汇报和上级确认；分级查房语境与教学边界 | flow_checked | pending | — |
| clinical_rounds_assisted | licensed-clinician | workflow | clinical_rounds_assisted | 低知识状态下的带教汇报；辅助路径与上级介入表述 | flow_checked | pending | — |
| clinical_progress_note | licensed-clinician | workflow | clinical_progress_note | 病程记录的变化、判断、措施和复评；避免把模板等同临床判断 | flow_checked | pending | — |
| clinical_consult_request | licensed-clinician | workflow | clinical_consult_request | 会诊问题、关键资料和反馈闭环；会诊申请范围与责任边界 | flow_checked | pending | — |
| clinical_schedule_echo | licensed-clinician | workflow | clinical_schedule_echo | 交接不清的规培复盘；不把我以为他会处理当作责任确认 | flow_checked | pending | — |
| clinical_rounds_echo | licensed-clinician | workflow | clinical_rounds_echo | 仓促分级汇报的职业期回声；风险上报和上级支持 | flow_checked | pending | — |
| clinical_note_echo | licensed-clinician | workflow | clinical_note_echo | 复制病程记录的职业期回声；连续记录与实际变化 | flow_checked | pending | — |
| clinical_consult_echo | licensed-clinician | workflow | clinical_consult_echo | 清晰会诊申请的职业期回声；收到、反馈和记录的闭环 | flow_checked | pending | — |
| clinical_consult_vague_echo | licensed-clinician | workflow | clinical_consult_vague_echo | 模糊会诊申请的职业期回声；具体问题和反馈路径 | flow_checked | pending | — |

### Assigned licensed-clinician reviews

| id | suggested reviewer | category | label | review focus | pre-review | status | evidenceRefs |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

### Assigned clinical-pharmacist reviews

| id | suggested reviewer | category | label | review focus | pre-review | status | evidenceRefs |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

Required medical completion fields: `status: verified`, `reviewerRole`, named reviewer in `reviewedBy`, ISO date in `reviewedAt`, at least one `evidenceRefs` entry, and a concise `notes` conclusion. Medication records require `clinical-pharmacist`; other records require a licensed clinician.

## 2. External evidence queue

| id | title | organization | status | used by ending cards | missing / weak fields | current URL |
|---|---|---|---|---|---|---|
| 国家卫健委 | 国家卫生健康委关于应用“12356”全国统一心理援助热线电话号码的通知 | 国家卫生健康委员会 | pending | quit_guipei: 心理援助热线 = 全国统一号码：12356; left_undergrad: 心理援助热线 = 全国统一号码：12356; era0_escape_white_tower: 心理援助热线 = 全国统一号码：12356 | reviewedBy, reviewedAt, notes | https://www.gov.cn/zhengce/zhengceku/202412/content_6994470.htm |
| 多项职业心理健康研究 | Burnout among doctors in China through 2020: A systematic review and meta-analysis | Heliyon（PubMed PMID: 35855985） | pending | exhausted_attending: 中国医生职业倦怠总体检出率 = 系统综述汇总为 75.48%; burnout_early: 中国医生职业倦怠总体检出率 = 系统综述汇总为 75.48% | reviewedBy, reviewedAt, notes | https://doi.org/10.1016/j.heliyon.2022.e09821 |
| 普通高等学校学生管理规定 | 普通高等学校学生管理规定 | 中华人民共和国教育部 | pending | left_undergrad: 学业警示后可选路径 = 重修 / 转专业 / 休学 / 退学; era0_unchosen_road: 转专业与重新选择 = 选择并非一次性定终身 | reviewedBy, reviewedAt, notes | https://www.gov.cn/gongbao/content/2017/content_5220900.htm |
| 科研诚信案件调查处理规则 | 科研失信行为调查处理规则 | 中华人民共和国科学技术部 | pending | disgraced: 学术不端处理方式 = 撤稿/撤销学位/取消申报资格 | reviewedBy, reviewedAt, notes | https://www.gov.cn/zhengce/zhengceku/2022-09/14/content_5709819.htm |
| 科学撤稿时滞研究 | Why Has the Number of Scientific Retractions Increased? | PLoS ONE（PubMed PMID: 23861902） | pending | lucky_fraud: PubMed 撤稿论文平均时滞 = 2047 篇分析：32.91 个月 | reviewedBy, reviewedAt, notes | https://doi.org/10.1371/journal.pone.0068397 |
| 职称制度改革文件 | 关于深化卫生专业技术人员职称制度改革的指导意见 | 人力资源社会保障部、国家卫生健康委、国家中医药局 | pending | master_clinician: 晋升评价中论文权重 = 长期偏高，近年开始调整 | reviewedBy, reviewedAt, notes | https://www.gov.cn/zhengce/zhengceku/2021-08/05/content_5629566.htm |
| 教育部历年统计 | 2023年全国教育事业发展统计公报 | 中华人民共和国教育部 | pending | worker_steady: 我国高等教育毛入学率 = 2023 年为 60.2% | reviewedBy, reviewedAt, notes | https://www.moe.gov.cn/jyb_sjzl/sjzl_fztjgb/202410/t20241024_1159002.html |
| 人社部职业技能提升计划 | 职业技能提升行动方案 | 人力资源和社会保障部 | pending | worker_steady: 技能工种缺口 = 制造业 / 服务业长期存在 | reviewedBy, reviewedAt, notes | https://www.gov.cn/zhengce/content/2019-05/24/content_5394415.htm |

External evidence is releasable only when the publication is traceable, the URL points to the specific source rather than a portal homepage, and publication/access/reviewer fields are complete. A reviewer must also record an ISO review date and a concise conclusion that the source supports the exact card wording listed in `used by ending cards`.

## 3. Manual acceptance queue

| id | label | status | scenario progress | environment |
|---|---|---|---|---|
| desktop-lifecycle | 桌面 Chromium：新开局、旧档、临床、科研、退出、晚年和重开档 | pending | 0/8 verified | — |
| ios-safari-device | iOS Safari 真机：竖横屏、安全区、触控、长时操作和音频解锁 | pending | 0/7 verified | — |
| android-chrome-device | Android Chrome 真机：竖横屏、安全区、触控、长时操作和音频解锁 | pending | 0/7 verified | — |

### 桌面 Chromium：新开局、旧档、临床、科研、退出、晚年和重开档

| scenario id | check | steps | pass criteria | evidence to record | status | notes |
|---|---|---|---|---|---|---|
| new-game | 新开局 | Launch production build, start a new game, allocate attrs, enter first playable scene. | No crash; state initializes from defaults; first scene is interactable. | Record device/browser, route notes, screenshot if layout is suspect. | pending | — |
| continue-save | 继续旧档 | Create or load an existing save, reload browser, continue from title. | Save loads without unsafe migration; age/year/stage and key flags remain coherent. | Record save origin/version and resumed stage. | pending | — |
| clinical-route | 完整临床线 | Play a full clinical-oriented lifecycle through job/career into a final ending. | Clinical route reaches a route-appropriate ending; no early dropout/quit ending after full practice. | Record route choices, final stage, ending id, age/year. | pending | — |
| research-route | 完整科研线 | Play a research-oriented lifecycle through master/PhD/career into a final ending. | Research route reaches a route-appropriate ending; papers/reputation effects are visible. | Record route choices, final stage, ending id, age/year/papers. | pending | — |
| exit-route | 退出线提前终止 | Choose a supported exit path such as leaving undergrad or quitting guipei. | Route terminates immediately at the matching exit ending and does not continue later seasons. | Record exit choice, ending id, age/year. | pending | — |
| late-life-route | 晚年三阶段 | Reach pinnacle/retirement/eternity phases and play through late-life decisions. | Late-life personal echoes appear; age/year/quarter remain coherent; final ending matches legacy/health state. | Record late-life phases visited, ending id, age/year. | pending | — |
| restart-save | 重开档并确认状态重置 | From a populated save, start over and then reload once. | New run resets prior flags/resources and persists its own fresh state. | Record old/new stage and any reset anomalies. | pending | — |
| console-clean | 生产包控制台无错误 | Open production build with DevTools console while exercising the target scenarios. | No uncaught errors, failed asset loads, or persistent console error spam. | Record console status; paste exact errors if any. | pending | — |

### iOS Safari 真机：竖横屏、安全区、触控、长时操作和音频解锁

| scenario id | check | steps | pass criteria | evidence to record | status | notes |
|---|---|---|---|---|---|---|
| portrait | 竖屏布局 | Open on the target phone in portrait and navigate title, HUD, event cards, endings. | No clipped primary controls; text remains readable; scrolling/taps work. | Record device model, OS/browser version, screenshots for issues. | pending | — |
| landscape | 横屏布局 | Rotate to landscape and repeat title, HUD, event cards, endings. | Layout adapts without hidden controls or unusable hit targets. | Record rotation behavior and screenshots for issues. | pending | — |
| safe-area | 刘海与安全区 | Check notch/home-indicator/status-bar areas on title, gameplay, modal/card, ending. | Interactive UI stays outside unsafe areas or remains comfortably tappable. | Record affected screens and screenshots if unsafe. | pending | — |
| touch-minigames | 触控小游戏 | Play touch-driven minigames and dismiss overlays using only touch. | Gestures register reliably; no keyboard-only blocker; ESC alternatives exist where needed. | Record minigames tried and any missed taps. | pending | — |
| long-session | 长时间操作与多次切场景 | Play continuously with multiple scene transitions, save/load, and orientation changes. | No memory/performance degradation, stuck overlay, or lost input after long operation. | Record duration, transitions, and final state. | pending | — |
| audio-unlock | 首次用户手势解锁音频 | Start from a fresh browser session, perform first user gesture, trigger sound. | Audio starts only after user gesture and does not throw browser autoplay errors. | Record gesture used, sound status, console status. | pending | — |
| console-clean | 生产包控制台无错误 | Open production build with DevTools console while exercising the target scenarios. | No uncaught errors, failed asset loads, or persistent console error spam. | Record console status; paste exact errors if any. | pending | — |

### Android Chrome 真机：竖横屏、安全区、触控、长时操作和音频解锁

| scenario id | check | steps | pass criteria | evidence to record | status | notes |
|---|---|---|---|---|---|---|
| portrait | 竖屏布局 | Open on the target phone in portrait and navigate title, HUD, event cards, endings. | No clipped primary controls; text remains readable; scrolling/taps work. | Record device model, OS/browser version, screenshots for issues. | pending | — |
| landscape | 横屏布局 | Rotate to landscape and repeat title, HUD, event cards, endings. | Layout adapts without hidden controls or unusable hit targets. | Record rotation behavior and screenshots for issues. | pending | — |
| safe-area | 刘海与安全区 | Check notch/home-indicator/status-bar areas on title, gameplay, modal/card, ending. | Interactive UI stays outside unsafe areas or remains comfortably tappable. | Record affected screens and screenshots if unsafe. | pending | — |
| touch-minigames | 触控小游戏 | Play touch-driven minigames and dismiss overlays using only touch. | Gestures register reliably; no keyboard-only blocker; ESC alternatives exist where needed. | Record minigames tried and any missed taps. | pending | — |
| long-session | 长时间操作与多次切场景 | Play continuously with multiple scene transitions, save/load, and orientation changes. | No memory/performance degradation, stuck overlay, or lost input after long operation. | Record duration, transitions, and final state. | pending | — |
| audio-unlock | 首次用户手势解锁音频 | Start from a fresh browser session, perform first user gesture, trigger sound. | Audio starts only after user gesture and does not throw browser autoplay errors. | Record gesture used, sound status, console status. | pending | — |
| console-clean | 生产包控制台无错误 | Open production build with DevTools console while exercising the target scenarios. | No uncaught errors, failed asset loads, or persistent console error spam. | Record console status; paste exact errors if any. | pending | — |

A parent acceptance record may be `verified` only after every scenario is individually `verified`, each scenario has concrete notes, and the reviewer, ISO date, device, OS, browser, and browser version are recorded.

After each real review, run `npm run release:schema`, inspect the diff, and only then rerun `npm run release:check`.
