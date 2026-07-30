// 新闻滚动条数据（M3）。按年份/季度组织的真实事件改编新闻，谐音化以规避法律风险。
// 与 gameState.NewsItem 结构保持一致（year/quarter/headline/type），额外带 id 供去重。

export type NewsType = 'event' | 'warning' | 'irony' | 'tragedy';

export interface NewsTickerItem {
  id: string;
  year: number;
  quarter: number;
  headline: string;
  type: NewsType;
}

export const NEWS_TICKER: NewsTickerItem[] = [
  // —— 2024 ——
  { id: 'n2024q3_1', year: 2024, quarter: 3, headline: '【教育部：2024年临床医学专业报考人数同比增长23%】', type: 'event' },
  { id: 'n2024q3_2', year: 2024, quarter: 3, headline: '【协哈医学院分数线再创新高，八年制本博连读投档位次前移】', type: 'event' },
  { id: 'n2024q4_1', year: 2024, quarter: 4, headline: '【两会代表提案：建议规培生补助提升至8万元/年】', type: 'warning' },
  { id: 'n2024q4_2', year: 2024, quarter: 4, headline: '【旺填朝案宣判：某三甲医院院长受贿千万，获刑十二年】', type: 'warning' },
  { id: 'n2024q4_3', year: 2024, quarter: 4, headline: '【张昱医生实名举报肿瘤治疗乱象，相关机构介入调查】', type: 'event' },
  { id: 'n2024q4_4', year: 2024, quarter: 4, headline: '【余鹰医生公开辞职：急诊科太累了，我去开诊所】', type: 'irony' },

  // —— 2025 ——
  { id: 'n2025q1_1', year: 2025, quarter: 1, headline: '【2·23伤医事件后续：多地医院上线安检与警医联动】', type: 'tragedy' },
  { id: 'n2025q1_2', year: 2025, quarter: 1, headline: '【刘晋急诊科专访：一晚上接诊百人，我也在吃救心丸】', type: 'irony' },
  { id: 'n2025q1_3', year: 2025, quarter: 1, headline: '【某院规培医师连续夜班后猝死，年仅26岁】', type: 'tragedy' },
  { id: 'n2025q2_1', year: 2025, quarter: 2, headline: '【执业医师资格考试改革：技能考试通过率降至六成】', type: 'warning' },
  { id: 'n2025q2_2', year: 2025, quarter: 2, headline: '【湘雅某科室疑似数据造假，被期刊撤稿调查】', type: 'warning' },
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
  { id: 'n2032q2_1', year: 2032, quarter: 2, headline: '【又一年医师节：致敬，也呼吁被看见的疲惫】', type: 'irony' },
  { id: 'n2032q3_1', year: 2032, quarter: 3, headline: '【三甲评审趋严：科研指标权重再调整】', type: 'warning' },
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
];
