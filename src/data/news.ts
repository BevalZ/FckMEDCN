import { GENERATED_NEWS_TICKER } from './newsGenerated';

// 新闻滚动条数据（M3）。按年份/季度组织公开报道主题的匿名综合改写。
// 与 gameState.NewsItem 结构保持一致（year/quarter/headline/type），额外带 id 供去重。

export type NewsType = 'event' | 'warning' | 'irony' | 'tragedy';

export interface NewsTickerItem {
  id: string;
  year: number;
  quarter: number;
  headline: string;
  type: NewsType;
}

const CURATED_NEWS_TICKER: NewsTickerItem[] = [
  // —— 公开裁判、监管通报与媒体报道主题的匿名综合改写 ——
  { id: 'neg_med_2024_1', year: 2024, quarter: 3, headline: '【医疗损害案：病历多处补记且时间矛盾，医院举证陷入被动】', type: 'warning' },
  { id: 'neg_med_2024_2', year: 2024, quarter: 4, headline: '【某医学访问学者在海外因猥亵、性侵女性被司法机关处理，派出单位启动追责】', type: 'tragedy' },
  { id: 'neg_med_2025_1', year: 2025, quarter: 1, headline: '【急诊延误诊断争议宣判：法院围绕检查时机与因果关系分配责任】', type: 'warning' },
  { id: 'neg_med_2025_2', year: 2025, quarter: 2, headline: '【患者术后死亡，知情同意书只签字未充分告知，医院承担相应责任】', type: 'tragedy' },
  { id: 'neg_med_2025_3', year: 2025, quarter: 4, headline: '【输液剂量录入错误造成损害，医生、护士与系统审核流程同时被追问】', type: 'warning' },
  { id: 'neg_med_2026_1', year: 2026, quarter: 1, headline: '【医疗美容纠纷增多：超范围诊疗、虚假宣传与麻醉风险成为争点】', type: 'warning' },
  { id: 'neg_med_2026_2', year: 2026, quarter: 2, headline: '【产科急症处置引发诉讼，鉴定聚焦监护记录和手术决策时机】', type: 'tragedy' },
  { id: 'neg_med_2026_3', year: 2026, quarter: 4, headline: '【多篇医学论文因图片重复被撤稿，作者单位启动科研诚信调查】', type: 'warning' },
  { id: 'neg_med_2027_1', year: 2027, quarter: 1, headline: '【患者出院后失联恶化，医院与社区间转诊随访责任成庭审焦点】', type: 'warning' },
  { id: 'neg_med_2027_2', year: 2027, quarter: 2, headline: '【手术器械遗留体内引发索赔，院方承认清点流程存在漏洞】', type: 'tragedy' },
  { id: 'neg_med_2027_3', year: 2027, quarter: 4, headline: '【互联网问诊误判急症，平台资质与接诊医师责任边界进入诉讼】', type: 'warning' },
  { id: 'neg_med_2028_1', year: 2028, quarter: 1, headline: '【检验危急值未及时闭环，一名患者错过最佳处置窗口】', type: 'tragedy' },
  { id: 'neg_med_2028_2', year: 2028, quarter: 2, headline: '【抗菌药使用不规范被通报，科室绩效与处方权同步受限】', type: 'warning' },
  { id: 'neg_med_2028_3', year: 2028, quarter: 4, headline: '【医院采购负责人收受回扣获刑，多名临床骨干接受调查】', type: 'warning' },
  { id: 'neg_med_2029_1', year: 2029, quarter: 1, headline: '【儿童漏诊案进入鉴定：首诊记录过于简略成为关键证据缺口】', type: 'tragedy' },
  { id: 'neg_med_2029_2', year: 2029, quarter: 3, headline: '【夜班医生连续工作后发生处置差错，排班制度被纳入责任审查】', type: 'warning' },
  { id: 'neg_med_2030_1', year: 2030, quarter: 1, headline: '【AI辅助诊断漏报病灶，医院称“机器建议不能替代医师复核”】', type: 'warning' },
  { id: 'neg_med_2030_2', year: 2030, quarter: 2, headline: '【患者隐私被上传社交平台，涉事医务人员停职并公开道歉】', type: 'warning' },
  { id: 'neg_med_2030_3', year: 2030, quarter: 4, headline: '【未经充分评估转院途中患者恶化，两家机构互指交接不清】', type: 'tragedy' },
  { id: 'neg_med_2031_1', year: 2031, quarter: 1, headline: '【罕见病误诊多年获赔，法院认定复查建议和风险提示不足】', type: 'warning' },
  { id: 'neg_med_2031_2', year: 2031, quarter: 3, headline: '【医学论文代写链条曝光，多家医院撤销相关人员晋升资格】', type: 'warning' },
  { id: 'neg_med_2032_1', year: 2032, quarter: 1, headline: '【术后并发症并非当然过错，但观察记录缺失令医院承担部分责任】', type: 'warning' },
  { id: 'neg_med_2032_2', year: 2032, quarter: 4, headline: '【精神科患者院内意外死亡，安全评估与巡视记录接受调查】', type: 'tragedy' },
  { id: 'neg_med_2033_1', year: 2033, quarter: 2, headline: '【院前急救调度延误案开庭，通话录音和车辆轨迹成为核心证据】', type: 'warning' },
  { id: 'neg_med_2034_1', year: 2034, quarter: 1, headline: '【未经伦理审批使用病例数据，研究团队被要求撤稿并停止招生】', type: 'warning' },
  { id: 'neg_med_2035_1', year: 2035, quarter: 3, headline: '【血型核对流程失守引发严重输血事故，多岗位被追责】', type: 'tragedy' },
  { id: 'neg_med_2036_1', year: 2036, quarter: 2, headline: '【过度检查纠纷进入诉讼，患者质疑费用与诊疗必要性】', type: 'warning' },
  { id: 'neg_med_2037_1', year: 2037, quarter: 1, headline: '【病理切片标识错误导致扩大手术，医院承担主要赔偿责任】', type: 'tragedy' },
  { id: 'neg_med_2038_1', year: 2038, quarter: 2, headline: '【多学科会诊记录缺失，复杂病例责任在多个科室间反复拉扯】', type: 'warning' },
  { id: 'neg_med_2039_1', year: 2039, quarter: 3, headline: '【医保飞检发现分解住院与虚假收费，涉事机构被暂停结算】', type: 'warning' },
  { id: 'neg_med_2040_1', year: 2040, quarter: 2, headline: '【机器人手术故障造成损害，医生操作、设备维护和厂商说明同时受审查】', type: 'tragedy' },
  { id: 'neg_med_2041_1', year: 2041, quarter: 3, headline: '【安宁疗护告知争议进入法院，家属对治疗边界意见严重分裂】', type: 'warning' },
  { id: 'neg_med_2042_1', year: 2042, quarter: 2, headline: '【远程会诊建议未被执行，基层医院与上级专家责任如何划分引争议】', type: 'warning' },
  { id: 'neg_med_2043_1', year: 2043, quarter: 1, headline: '【护士提醒未被采纳后患者恶化，团队沟通记录成为庭审关键】', type: 'tragedy' },
  { id: 'neg_med_2044_1', year: 2044, quarter: 2, headline: '【医生直播展示病例细节被处罚，流量收益不足以覆盖赔偿】', type: 'irony' },
  { id: 'neg_med_2045_1', year: 2045, quarter: 2, headline: '【基因检测报告解释错误引发预防性手术争议，实验室与医院共同应诉】', type: 'tragedy' },
  { id: 'neg_med_2046_1', year: 2046, quarter: 2, headline: '【电子病历批量复制被鉴定机构质疑，诊疗过程难以还原】', type: 'warning' },
  // —— 2024 ——
  { id: 'n2024q3_1', year: 2024, quarter: 3, headline: '【教育部：2024年临床医学专业报考人数同比增长23%】', type: 'event' },
  { id: 'n2024q3_2', year: 2024, quarter: 3, headline: '【某头部医学院分数线再创新高，八年制本博连读投档位次前移】', type: 'event' },
  { id: 'n2024q4_2', year: 2024, quarter: 4, headline: '【某三甲医院原负责人因收受回扣获刑，采购与工程流程同步整改】', type: 'warning' },
  { id: 'n2024q4_3', year: 2024, quarter: 4, headline: '【临床医生公开反映不规范诊疗问题，相关机构启动独立核查】', type: 'event' },
  { id: 'n2024q4_4', year: 2024, quarter: 4, headline: '【一名急诊医生离职转向基层执业：长期高负荷让人重新选择生活】', type: 'irony' },

  // —— 2025 ——
  { id: 'n2025q1_1', year: 2025, quarter: 1, headline: '【2·23伤医事件后续：多地医院上线安检与警医联动】', type: 'tragedy' },
  { id: 'n2025q1_2', year: 2025, quarter: 1, headline: '【急诊医生谈夜班压力：高峰期整夜接诊，医务人员自身健康也亮红灯】', type: 'irony' },
  { id: 'n2025q1_3', year: 2025, quarter: 1, headline: '【某院规培医师连续夜班后猝死，年仅26岁】', type: 'tragedy' },
  // 两会在 3 月（Q1）召开，提案类新闻应落在 Q1（原误置 2024Q4）
  { id: 'n2025q1_4', year: 2025, quarter: 1, headline: '【两会代表提案：建议规培生补助提升至8万元/年】', type: 'warning' },
  { id: 'n2025q2_1', year: 2025, quarter: 2, headline: '【执业医师资格考试改革：技能考试通过率降至六成】', type: 'warning' },
  { id: 'n2025q2_2', year: 2025, quarter: 2, headline: '【某高校附属医院论文被质疑数据异常，期刊与单位分别启动调查】', type: 'warning' },
  { id: 'n2025q3_1', year: 2025, quarter: 3, headline: '【107篇论文集中撤稿，涉及多家三甲医院与高校】', type: 'warning' },
  { id: 'n2025q3_2', year: 2025, quarter: 3, headline: '【医学生就业危机：部分三甲编制缩招，博士也内卷】', type: 'warning' },
  { id: 'n2025q4_1', year: 2025, quarter: 4, headline: '【国家发文规范互联网医疗：问诊须实名、可追溯】', type: 'event' },
  { id: 'n2025q4_2', year: 2025, quarter: 4, headline: '【多点执业落地：医师可签约不超过3家机构】', type: 'event' },

  // —— 2026 ——
  { id: 'n2026q1_1', year: 2026, quarter: 1, headline: '【规培补助上调落地：部分地区增至每月4000元】', type: 'event' },
  { id: 'n2026q1_2', year: 2026, quarter: 1, headline: '【某省属医院缩减编制，缩招消息引发热议】', type: 'warning' },
  { id: 'n2026q2_1', year: 2026, quarter: 2, headline: '【又一起值班猝死：同行呼吁落实强制休息制度】', type: 'tragedy' },
  { id: 'n2026q2_2', year: 2026, quarter: 2, headline: '【AI辅助诊断进临床：阅片快了，但责任归谁？】', type: 'irony' },
  { id: 'n2026q3_1', year: 2026, quarter: 3, headline: '【调查显示：近三成医学生考虑毕业后转行】', type: 'warning' },
  { id: 'n2026q4_1', year: 2026, quarter: 4, headline: '【高值耗材集采扩围：部分手术费用明显下降】', type: 'event' },
  { id: 'n2026q4_2', year: 2026, quarter: 4, headline: '【医患纠纷立法征求意见：扰乱医疗秩序将入刑】', type: 'event' },

  // —— 2027 ——
  { id: 'n2027q1_1', year: 2027, quarter: 1, headline: '【临床医学硕博扩招，导师名额一增再增】', type: 'event' },
  { id: 'n2027q1_2', year: 2027, quarter: 1, headline: '【博士后待遇被点名：月薪低于当地低保引争议】', type: 'irony' },
  { id: 'n2027q2_1', year: 2027, quarter: 2, headline: '【基层医疗人才荒：县城医院招人难、留人更难】', type: 'warning' },
  { id: 'n2027q3_1', year: 2027, quarter: 3, headline: '【多家公立医院亏损，部分科室绩效被砍】', type: 'warning' },
  { id: 'n2027q4_1', year: 2027, quarter: 4, headline: '【医生退休年龄或延后，引发中年群体讨论】', type: 'irony' },

  // —— 2028 ——
  { id: 'n2028q1_1', year: 2028, quarter: 1, headline: '【主治晋升排队拉长：同年限，名额却更少】', type: 'warning' },
  { id: 'n2028q2_1', year: 2028, quarter: 2, headline: '【副高门槛提高：SCI与国自然成硬指标】', type: 'warning' },
  { id: 'n2028q3_1', year: 2028, quarter: 3, headline: '【中年医生健康调查：高血压、失眠、结节几乎人手一份】', type: 'tragedy' },
  { id: 'n2028q4_1', year: 2028, quarter: 4, headline: '【医疗反腐深化：又一批院领导接受审查】', type: 'warning' },

  // —— 2029 ——
  { id: 'n2029q1_1', year: 2029, quarter: 1, headline: '【规培年限争议再起：有人建议缩短，有人坚持从严】', type: 'event' },
  { id: 'n2029q2_1', year: 2029, quarter: 2, headline: '【海外行医潮：越来越多规培生备考执业资格出国】', type: 'warning' },
  { id: 'n2029q3_1', year: 2029, quarter: 3, headline: '【青年医生离职率走高，民营与基层成出口】', type: 'warning' },
  { id: 'n2029q4_1', year: 2029, quarter: 4, headline: '【AI写病历普及：省了时间，也省了思考？】', type: 'irony' },

  // —— 2030 ——
  { id: 'n2030q1_1', year: 2030, quarter: 1, headline: '【新医师法施行：执业范围与权责进一步厘清】', type: 'event' },
  { id: 'n2030q2_1', year: 2030, quarter: 2, headline: '【"编制"松动：员额制在更多医院推开】', type: 'event' },
  { id: 'n2030q3_1', year: 2030, quarter: 3, headline: '【医学教育认证收紧：部分院校被限期整改】', type: 'warning' },
  { id: 'n2030q4_1', year: 2030, quarter: 4, headline: '【又到考研季：临床专硕报名人数再破纪录】', type: 'irony' },

  // —— 2031–2035（覆盖游戏后段，让"一生"始终有现实回声）——
  { id: 'n2031q1_1', year: 2031, quarter: 1, headline: '【规培与专硕并轨深化：规培证与学位证进一步打通】', type: 'event' },
  { id: 'n2031q2_1', year: 2031, quarter: 2, headline: '【县域医共体全覆盖：小病不出县渐成现实】', type: 'event' },
  { id: 'n2031q3_1', year: 2031, quarter: 3, headline: '【青年医生心理健康被纳入考核：医院须配驻点心理师】', type: 'warning' },
  { id: 'n2031q4_1', year: 2031, quarter: 4, headline: '【医保支付方式改革：医生也要算"性价比"】', type: 'irony' },
  { id: 'n2032q1_1', year: 2032, quarter: 1, headline: '【人工智能辅诊写入规范：最终责任仍在医生】', type: 'event' },
  { id: 'n2032q3_1', year: 2032, quarter: 3, headline: '【三甲评审趋严：科研指标权重再调整】', type: 'warning' },
  // 中国医师节是 8 月 19 日（Q3），原误置 Q2
  { id: 'n2032q3_2', year: 2032, quarter: 3, headline: '【又一年医师节：致敬，也呼吁被看见的疲惫】', type: 'irony' },
  { id: 'n2032q4_1', year: 2032, quarter: 4, headline: '【多点执业常态化：医生周末"走穴"不再敏感】', type: 'event' },
  { id: 'n2033q1_1', year: 2033, quarter: 1, headline: '【儿科、急诊、病理持续缺人：定向培养扩招】', type: 'warning' },
  { id: 'n2033q2_1', year: 2033, quarter: 2, headline: '【某中年医生带病在岗突发心梗，同行唏嘘】', type: 'tragedy' },
  { id: 'n2033q3_1', year: 2033, quarter: 3, headline: '【医患互信调查：有改善，但仍脆弱】', type: 'warning' },
  { id: 'n2033q4_1', year: 2033, quarter: 4, headline: '【新版薪酬指引：向临床一线、急难险重倾斜】', type: 'event' },
  { id: 'n2034q1_1', year: 2034, quarter: 1, headline: '【医学毕业生基层就业比例连续三年上升】', type: 'event' },
  { id: 'n2034q2_1', year: 2034, quarter: 2, headline: '【"反向考研"升温：有人从临床转公卫】', type: 'irony' },
  { id: 'n2034q3_1', year: 2034, quarter: 3, headline: '【真实世界研究走红：临床数据成新矿】', type: 'event' },
  { id: 'n2034q4_1', year: 2034, quarter: 4, headline: '【又一批医院亏损：运营压力传导到科室】', type: 'warning' },
  { id: 'n2035q1_1', year: 2035, quarter: 1, headline: '【医师法修订征求意见：规培待遇再被聚焦】', type: 'warning' },
  { id: 'n2035q2_1', year: 2035, quarter: 2, headline: '【银发医生返聘成趋势：经验被重新珍惜】', type: 'event' },

  // —— 2036–2046（覆盖硕博/求职/职业阶段；职业期延长后终点约 2046Q3）——
  { id: 'n2036q1_1', year: 2036, quarter: 1, headline: '【DRG/DIP 支付改革全面铺开：科室开始学算账】', type: 'event' },
  { id: 'n2036q3_1', year: 2036, quarter: 3, headline: '【专硕与规培并轨十年评估：有人省时，有人喊累】', type: 'irony' },
  { id: 'n2037q2_1', year: 2037, quarter: 2, headline: '【延迟退休落地首批：老专家门诊排到了明年】', type: 'event' },
  { id: 'n2037q4_1', year: 2037, quarter: 4, headline: '【考研报名连年高位：医学热度不降反升】', type: 'warning' },
  { id: 'n2038q1_1', year: 2038, quarter: 1, headline: '【青年医师心理援助热线上线：夜班后可以打个电话】', type: 'event' },
  { id: 'n2038q3_1', year: 2038, quarter: 3, headline: '【某副主任医师评审现场晕倒，同行唏嘘"材料比病人多"】', type: 'tragedy' },
  { id: 'n2039q2_1', year: 2039, quarter: 2, headline: '【医疗反腐常态化：器械采购全程留痕】', type: 'warning' },
  { id: 'n2039q4_1', year: 2039, quarter: 4, headline: '【县域医共体二期启动：专家下沉排班表引热议】', type: 'event' },
  { id: 'n2040q1_1', year: 2040, quarter: 1, headline: '【AI 病历责任首案宣判：签字医师负最终责任】', type: 'warning' },
  { id: 'n2040q3_1', year: 2040, quarter: 3, headline: '【临床医学招生回暖：状元回流医学院】', type: 'event' },
  { id: 'n2041q2_1', year: 2041, quarter: 2, headline: '【副高评审破"唯论文"试点扩面：临床工作量入指标】', type: 'event' },
  { id: 'n2041q4_1', year: 2041, quarter: 4, headline: '【求职季观察：三甲门槛博士起，基层编制无人问】', type: 'irony' },
  { id: 'n2042q1_1', year: 2042, quarter: 1, headline: '【老龄化加深：大医院一床难求，安宁疗护纳入医保】', type: 'event' },
  { id: 'n2042q3_1', year: 2042, quarter: 3, headline: '【中年医生健康白皮书：过劳指标全线飘红】', type: 'tragedy' },
  { id: 'n2043q2_1', year: 2043, quarter: 2, headline: '【手术机器人准入规范出台：资质分级管理】', type: 'event' },
  { id: 'n2043q4_1', year: 2043, quarter: 4, headline: '【住培待遇再评估：与专硕奖学金打通呼声高】', type: 'warning' },
  { id: 'n2044q1_1', year: 2044, quarter: 1, headline: '【医学教育学制再讨论：5+3+X 要不要减一减】', type: 'irony' },
  { id: 'n2044q2_1', year: 2044, quarter: 2, headline: '【又一年招聘季：大医院排队面试，县医院排队求人】', type: 'event' },
  { id: 'n2044q3_1', year: 2044, quarter: 3, headline: '【医保飞检常态化：今年已追回违规资金数十亿】', type: 'warning' },
  { id: 'n2044q4_1', year: 2044, quarter: 4, headline: '【年终观察：医生年度关键词——过劳、纠纷与坚守】', type: 'tragedy' },
  { id: 'n2045q1_1', year: 2045, quarter: 1, headline: '【高级职称评审强调临床实绩：病案质量与带教纳入量化】', type: 'event' },
  { id: 'n2045q3_1', year: 2045, quarter: 3, headline: '【中年医师重申职称增多：名额与年限仍是两道坎】', type: 'warning' },
  { id: 'n2046q1_1', year: 2046, quarter: 1, headline: '【县域医院高级职称定向评价扩围，论文不再一刀切】', type: 'event' },
  { id: 'n2046q3_1', year: 2046, quarter: 3, headline: '【医师节调查：最想要的奖励仍是少值一个夜班】', type: 'irony' },
  { id: 'n2046q4_1', year: 2046, quarter: 4, headline: '【年终医疗观察：晋升更慢，责任更重，留下的人仍在坚守】', type: 'tragedy' },
];

export const NEWS_TICKER: NewsTickerItem[] = [
  ...CURATED_NEWS_TICKER,
  ...GENERATED_NEWS_TICKER,
];
