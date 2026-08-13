// 叙事情境灵感卡（M3）。所有院校/人物均为虚构化处理。
// 这些卡片仅提供游戏内时代氛围，不作为现实事实、新闻报道或证据来源展示。

export interface RealEventCard {
  id: string;
  year: number;
  title: string;
  body: string;          // 游戏内叙事化表述
  inspiredContext: string; // 创作背景说明（虚构化/泛化）
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
    inspiredContext: '以医院安全感下降、安检升级与警医联动成为日常为创作背景。',
    homophoneMapping: { '伤医事件': '2·23事件' },
    relatedStages: ['internship', 'guipei', 'career'],
    triggerCondition: '进入实习/规培后高概率被新闻提及',
  },
  {
    id: 're_nanning',
    year: 2024,
    title: '南柠手术室事件',
    body: '一台本可避免的术中事故，被一段偷拍视频推上风口。医院通报、停职、赔偿，舆论却久久不退。',
    inspiredContext: '以医疗质量争议、患者知情权与网络舆论放大效应为创作背景。',
    homophoneMapping: { '南宁': '南柠' },
    relatedStages: ['guipei', 'career'],
  },
  {
    id: 're_anticorruption',
    year: 2024,
    title: '医疗反腐风暴',
    body: '查号源、查耗材、查基建。你见习的省立人民医院，院长在晨会上被带走，再没回来。',
    inspiredContext: '以医疗机构廉洁风险、耗材采购与管理问责压力为创作背景。',
    homophoneMapping: { '某地院长': '旺填朝' },
    relatedStages: ['career', 'guipei'],
  },
  {
    id: 're_zhangyu',
    year: 2024,
    title: '张昱举报案',
    body: '一位肿瘤科医生在群里实名举报"过度医疗"。同行分裂成两派：他是英雄，还是叛徒？',
    inspiredContext: '以诊疗规范争议、过度医疗担忧与同行伦理冲突为创作背景。',
    homophoneMapping: { '张煜': '张昱' },
    relatedStages: ['master', 'career'],
  },
  {
    id: 're_yuying',
    year: 2024,
    title: '余鹰辞职',
    body: '急诊科最拼的女医生递交了辞职信："我爱治病，但我撑不住了。"她后来去开了家小诊所。',
    inspiredContext: '以急诊高压、职业倦怠与医生流失话题为创作背景。',
    homophoneMapping: { '于莺': '余鹰' },
    relatedStages: ['career', 'guipei'],
  },
  {
    id: 're_liujin',
    year: 2025,
    title: '刘晋急诊科专访',
    body: '"一晚上看一百多个，我自己也备着救心丸。"那段访谈视频，你反复看了三遍。',
    inspiredContext: '以急诊科高强度值班、公众理解不足与医护自我消耗为创作背景。',
    homophoneMapping: { '刘进': '刘晋' },
    relatedStages: ['career', 'internship'],
  },
  {
    id: 're_retraction',
    year: 2025,
    title: '107 篇撤稿事件',
    body: '同一家论文工厂的稿子，被一次性撤下 107 篇。你导师把组会主题改成了"学术诚信"。',
    inspiredContext: '以论文工厂、批量撤稿与科研诚信危机为创作背景。',
    homophoneMapping: {},
    relatedStages: ['master', 'phd'],
  },
  {
    id: 're_jobcrisis',
    year: 2025,
    title: '医学生就业危机',
    body: '秋招现场，三甲编制只招一个人，简历堆了三百份。你开始认真考虑县城医院。',
    inspiredContext: '以医学毕业生扩招、岗位竞争与编制收紧带来的就业焦虑为创作背景。',
    homophoneMapping: {},
    relatedStages: ['jobhunt', 'undergrad'],
  },
];
