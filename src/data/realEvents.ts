// 真实事件改编数据卡（M3）。所有真实院校/人物均采用谐音替代，规避法律风险。
// EndingScene 与新闻系统会引用此处内容，作为"时代真实背景"的注脚。

export interface RealEventCard {
  id: string;
  year: number;
  title: string;
  body: string;          // 游戏内叙事化表述
  realContext: string;   // 真实背景说明（谐音/泛化）
  homophoneMapping: Record<string, string>;
  relatedStages: string[];
  triggerCondition?: string;
}

export const REAL_EVENTS_AS_CARDS: RealEventCard[] = [
  {
    id: 're_223',
    year: 2025,
    title: '2·23 伤医事件',
    body: '实习那年，你所在医院的走廊装上了安检门。老师说："别觉得麻烦，那是拿命换来的。"',
    realContext: '现实中曾发生患者持刀伤医的恶性事件，直接推动了全国医院安检与警医联动机制的普及。',
    homophoneMapping: { '伤医事件': '2·23事件' },
    relatedStages: ['internship', 'guipei', 'career'],
    triggerCondition: '进入实习/规培后高概率被新闻提及',
  },
  {
    id: 're_nanning',
    year: 2024,
    title: '南柠手术室事件',
    body: '一台本可避免的术中事故，被一段偷拍视频推上风口。医院通报、停职、赔偿，舆论却久久不退。',
    realContext: '某地手术室疑似医疗过错被网络曝光，引发对医疗质量与患者知情权的广泛讨论。',
    homophoneMapping: { '南宁': '南柠' },
    relatedStages: ['guipei', 'career'],
  },
  {
    id: 're_anticorruption',
    year: 2024,
    title: '医疗反腐风暴',
    body: '查号源、查耗材、查基建。你见习的省立人民医院，院长在晨会上被带走，再没回来。',
    realContext: '2023 年起医疗领域反腐深入，多名医院院长、科室主任因涉嫌受贿被查。',
    homophoneMapping: { '某地院长': '旺填朝' },
    relatedStages: ['career', 'guipei'],
  },
  {
    id: 're_zhangyu',
    year: 2024,
    title: '张昱举报案',
    body: '一位肿瘤科医生在群里实名举报"过度医疗"。同行分裂成两派：他是英雄，还是叛徒？',
    realContext: '现实中有医生公开举报肿瘤治疗中的不合理现象，引发行业对诊疗规范的反思。',
    homophoneMapping: { '张煜': '张昱' },
    relatedStages: ['master', 'career'],
  },
  {
    id: 're_yuying',
    year: 2024,
    title: '余鹰辞职',
    body: '急诊科最拼的女医生递交了辞职信："我爱治病，但我撑不住了。"她后来去开了家小诊所。',
    realContext: '现实中一位急诊科医生公开离职，成为医生职业倦怠与流失现象的标志性个案。',
    homophoneMapping: { '于莺': '余鹰' },
    relatedStages: ['career', 'guipei'],
  },
  {
    id: 're_liujin',
    year: 2025,
    title: '刘晋急诊科专访',
    body: '"一晚上看一百多个，我自己也备着救心丸。"那段访谈视频，你反复看了三遍。',
    realContext: '一位急诊科专家在访谈中直言高强度负荷，让公众第一次"看见"急诊医生的日常。',
    homophoneMapping: { '刘进': '刘晋' },
    relatedStages: ['career', 'internship'],
  },
  {
    id: 're_retraction',
    year: 2025,
    title: '107 篇撤稿事件',
    body: '同一家论文工厂的稿子，被一次性撤下 107 篇。你导师把组会主题改成了"学术诚信"。',
    realContext: '国际期刊集中撤稿涉及多家中国机构，暴露出论文工厂与学术不端的系统性隐患。',
    homophoneMapping: {},
    relatedStages: ['master', 'phd'],
  },
  {
    id: 're_jobcrisis',
    year: 2025,
    title: '医学生就业危机',
    body: '秋招现场，三甲编制只招一个人，简历堆了三百份。你开始认真考虑县城医院。',
    realContext: '近些年医学毕业生规模扩大与编制收紧叠加，部分博士也面临"求职难"。',
    homophoneMapping: {},
    relatedStages: ['jobhunt', 'undergrad'],
  },
];
