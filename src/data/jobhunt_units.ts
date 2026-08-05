// 真实风格招聘单位（求职写实管线）。
// 与 constants.ts 里运行时未使用的 HOSPITALS 死常量脱钩，这里定义带"学历门槛 / 地区 / 母校附属 /
// 三方违约金"的 richer 招聘单元，供 events_jobhunt_real.ts 的投简历/笔试/面试/签三方/违约使用。
//
// 命名沿用项目谐音脱敏风格（协哈/华溪/旺填…）。regionFlag 必须落在 economy.ts currentRegionTier
// 已消费的 flag 集合内（offer_sanjia / took_hospital_a / took_hospital_b / took_private /
// offer_grass / took_public / city_tier1 / city_home / base_home），否则地区经济缩放会漏算。

export type UnitTier = 'sanjiajia' | 'sanjiayi' | 'erjia' | 'community';
export type UnitDegree = 'bachelor' | 'master_pro' | 'master_academic' | 'phd';

export interface RecruitUnit {
  id: string;
  name: string;
  tier: UnitTier;
  tierLabel: string;       // 三甲/三乙/二甲/社区
  city: string;
  /** 与玩家母校 id 匹配时视为"本校附属医院"，面试/笔试享加成（见 effects.ts applyUnit） */
  affiliatedSchoolId?: string;
  /** 学历门槛（信息性，门槛由事件里的 requireStat/requireFlag 实际落地） */
  minDegree: UnitDegree;
  minReputation: number;
  minPapers: number;
  minClinical: number;
  /** 映射到已有地区经济 flag，决定职业收入/房价档 */
  regionFlag: string;
  /** 三方违约金（¥，写实额度，后续优化轮校准） */
  breachPenalty: number;
  salaryNote: string;
}

export const RECRUIT_UNITS: RecruitUnit[] = [
  {
    id: 'xiehe_h', name: '协华医院', tier: 'sanjiajia', tierLabel: '三甲', city: '北京',
    affiliatedSchoolId: 'xiehe', minDegree: 'phd',
    minReputation: 40, minPapers: 3, minClinical: 30,
    regionFlag: 'offer_sanjia', breachPenalty: 30000,
    salaryNote: '顶尖三甲，科研临床双高，留院极难（非升即走）',
  },
  {
    id: 'shiyi_h', name: '市第一人民医院', tier: 'sanjiayi', tierLabel: '三甲', city: '省会',
    minDegree: 'master_pro',
    minReputation: 30, minPapers: 1, minClinical: 40,
    regionFlag: 'took_hospital_a', breachPenalty: 20000,
    salaryNote: '省级三甲，临床主力，合同制为主',
  },
  {
    id: 'huaxi_h', name: '华溪人民医院', tier: 'sanjiayi', tierLabel: '三乙', city: '成都',
    affiliatedSchoolId: 'huaxi', minDegree: 'master_pro',
    minReputation: 25, minPapers: 1, minClinical: 30,
    regionFlag: 'took_public', breachPenalty: 15000,
    salaryNote: '川渝强院，本院规培生笔试可加 10 分，本校生有隐形优势',
  },
  {
    id: 'xianyi_h', name: '县人民医院', tier: 'erjia', tierLabel: '二甲', city: '县城',
    minDegree: 'bachelor',
    minReputation: 10, minPapers: 0, minClinical: 20,
    regionFlag: 'offer_grass', breachPenalty: 8000,
    salaryNote: '二甲编制，安稳但病例单一；事业编难考（录取率约 4.8%）。"县管乡用"下新招医师 5 年内须下乡镇服务',
  },
  {
    id: 'wangtian_h', name: '旺填社区中心', tier: 'community', tierLabel: '社区', city: '街道',
    minDegree: 'bachelor',
    minReputation: 5, minPapers: 0, minClinical: 10,
    regionFlag: 'offer_grass', breachPenalty: 5000,
    salaryNote: '社区守门人，压力小、成长慢；"编制备案制"下无传统铁饭碗，但进编容易',
  },
  {
    id: 'sili_h', name: '瑞慈私立医疗', tier: 'sanjiayi', tierLabel: '私立', city: '一线',
    minDegree: 'master_pro',
    minReputation: 20, minPapers: 0, minClinical: 25,
    regionFlag: 'took_private', breachPenalty: 20000,
    salaryNote: '私立高薪合同，提成写进合同却常因"流水不足 7000 开除医生"变空；无编制、离职纠纷高发，安家费可倒追',
  },
];

const UNIT_BY_ID = new Map(RECRUIT_UNITS.map((u) => [u.id, u]));

export function getUnit(id: string): RecruitUnit | undefined {
  return UNIT_BY_ID.get(id);
}
