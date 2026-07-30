export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const STATS = {
  STAMINA: 'stamina', KNOWLEDGE: 'knowledge', MONEY: 'money',
  SANITY: 'sanity', RELATIONS: 'relations', REPUTATION: 'reputation',
  PAPERS: 'papers', AGE: 'age',
  CLINICAL: 'clinical', RESEARCH: 'research', FAKE_RISK: 'fakeRisk',
} as const;

export type StatKey = typeof STATS[keyof typeof STATS];

export const STAT_LABELS: Record<StatKey, string> = {
  stamina: '体力', knowledge: '知识', money: '存款', sanity: '心理',
  relations: '关系', reputation: '声望', papers: '论文', age: '年龄',
  clinical: '临床', research: '科研', fakeRisk: '风险',
};

export const STAT_ICONS: Record<StatKey, string> = {
  stamina: '💊', knowledge: '🧠', money: '💰', sanity: '😊',
  relations: '❤️', reputation: '🏆', papers: '📄', age: '⏰',
  clinical: '🩺', research: '🔬', fakeRisk: '⚠️',
};

// HUD 顶部条只显示这 8 项；临床/科研/风险走独立的天平条。
export const HUD_STATS: StatKey[] = [
  'stamina', 'knowledge', 'money', 'sanity', 'relations', 'reputation', 'papers', 'age',
];

export interface School {
  id: string; name: string; realHint: string;
  tier: 1 | 2 | 3 | 4; minScore: number; city: string;
  bonus: Partial<Record<StatKey, number>>;
}

// 由真实院校排名生成的“谐音”医学院（realHint 注明原型与全国医学类排名，与实际情况相符）
type RawSchool = [id: string, name: string, realName: string, rank: number, tier: 1 | 2 | 3 | 4, minScore: number, city: string];

const SCHOOL_BONUS: Record<1 | 2 | 3 | 4, Partial<Record<StatKey, number>>> = {
  1: { knowledge: 10, reputation: 15 },
  2: { knowledge: 5, reputation: 8 },
  3: { knowledge: 2, reputation: 3 },
  4: { knowledge: 0, reputation: 1 },
};

function buildSchool([id, name, realName, rank, tier, minScore, city]: RawSchool): School {
  return {
    id, name, tier, minScore, city,
    realHint: `(原型：${realName} · 全国医学类第${rank})`,
    bonus: SCHOOL_BONUS[tier],
  };
}

const RAW_SCHOOLS: RawSchool[] = [
  // —— 第一梯队（顶尖，录取分 630+）——
  ['xiehe', '北京协哈医学院', '北京协和医学院', 1, 1, 685, '北京'],
  ['beida', '北鲸大学医学部', '北京大学医学部', 2, 1, 682, '北京'],
  ['qinghua', '清花大学医学院', '清华大学医学院', 3, 1, 680, '北京'],
  ['fudan', '复蛋大学上嗨医学院', '复旦大学上海医学院', 4, 1, 676, '上海'],
  ['shangjiao', '上跤交通大学医学院', '上海交通大学医学院', 5, 1, 674, '上海'],
  ['zheda', '折江大学医学院', '浙江大学医学院', 6, 1, 668, '杭州'],
  ['huaxi', '四穿大学华溪医学中心', '四川大学华西医学中心', 7, 1, 656, '成都'],
  ['zhongshan', '肿山大学肿山医学院', '中山大学中山医学院', 8, 1, 648, '广州'],
  ['huake', '华肿科技大学同挤医学院', '华中科技大学同济医学院', 9, 1, 646, '武汉'],
  ['xiangya', '中男大学湘鸭医学院', '中南大学湘雅医学院', 10, 1, 642, '长沙'],
  ['nanda', '南鲸大学医学院', '南京大学医学院', 11, 1, 644, '南京'],
  ['tongji', '同挤大学医学院', '同济大学医学院', 12, 1, 645, '上海'],
  ['shouyi', '兽都医科大学', '首都医科大学', 13, 1, 632, '北京'],
  ['wuda', '武汗大学医学部', '武汉大学医学部', 14, 1, 630, '武汉'],
  ['tianyi', '天巾医科大学', '天津医科大学', 15, 1, 624, '天津'],
  ['nankai', '南凯大学医学院', '南开大学医学院', 16, 1, 628, '天津'],
  ['xijiao', '洗安交通大学医学部', '西安交通大学医学部', 17, 1, 618, '西安'],
  ['qilu', '删东大学齐卤医学院', '山东大学齐鲁医学院', 18, 1, 620, '济南'],
  ['jilin', '鸡林大学白球恩医学部', '吉林大学白求恩医学部', 19, 1, 610, '长春'],
  ['chongyi', '虫庆医科大学', '重庆医科大学', 20, 1, 612, '重庆'],
  ['zhongguo', '中锅医科大学', '中国医科大学', 21, 1, 616, '沈阳'],
  ['nanjingyi', '喃京医科大学', '南京医科大学', 22, 1, 622, '南京'],

  // —— 第二梯队（强势省属 / 211，录取分 574~610）——
  ['nanfang', '南坊医科大学', '南方医科大学', 23, 2, 600, '广州'],
  ['suzhou', '苏粥大学医学部', '苏州大学医学部', 24, 2, 608, '苏州'],
  ['wenzhou', '瘟州医科大学', '温州医科大学', 25, 2, 596, '温州'],
  ['haerbin', '哈儿滨医科大学', '哈尔滨医科大学', 26, 2, 594, '哈尔滨'],
  ['anhuig', '安灰医科大学', '安徽医科大学', 27, 2, 598, '合肥'],
  ['guangzhou', '广粥医科大学', '广州医科大学', 28, 2, 602, '广州'],
  ['zhengzhou', '郑洲大学医学院', '郑州大学医学院', 29, 2, 594, '郑州'],
  ['hebei', '荷北医科大学', '河北医科大学', 30, 2, 592, '石家庄'],
  ['dalian', '大莲医科大学', '大连医科大学', 31, 2, 596, '大连'],
  ['fujian', '斧建医科大学', '福建医科大学', 32, 2, 590, '福州'],
  ['guangxi', '广锡医科大学', '广西医科大学', 33, 2, 588, '南宁'],
  ['kunming', '昆鸣医科大学', '昆明医科大学', 34, 2, 586, '昆明'],
  ['qingdao', '蜻岛大学医学院', '青岛大学医学院', 35, 2, 592, '青岛'],
  ['xiamen', '下门大学医学院', '厦门大学医学院', 36, 2, 610, '厦门'],
  ['shenzhen', '神圳大学医学部', '深圳大学医学部', 37, 2, 606, '深圳'],
  ['jinan', '季南大学医学院', '暨南大学医学院', 38, 2, 598, '广州'],
  ['nanchang', '难昌大学难仓医学院', '南昌大学江西医学院', 39, 2, 590, '南昌'],
  ['xuzhou', '续州医科大学', '徐州医科大学', 40, 2, 588, '徐州'],
  ['nantong', '南桶大学医学院', '南通大学医学院', 41, 2, 584, '南通'],
  ['yangzhou', '羊州大学医学院', '扬州大学医学院', 42, 2, 582, '扬州'],
  ['ningbo', '凝波大学医学院', '宁波大学医学院', 43, 2, 590, '宁波'],
  ['shantou', '山头大学医学院', '汕头大学医学院', 44, 2, 592, '汕头'],
  ['shandongyi', '删东第一医科大学', '山东第一医科大学', 45, 2, 586, '济南'],
  ['nanhua', '难华大学医学院', '南华大学医学院', 46, 2, 584, '衡阳'],
  ['hunan', '蝴南师范大学医学院', '湖南师范大学医学院', 47, 2, 588, '长沙'],
  ['guizhou', '桂粥医科大学', '贵州医科大学', 48, 2, 580, '贵阳'],
  ['xinjiang', '辛疆医科大学', '新疆医科大学', 49, 2, 578, '乌鲁木齐'],
  ['ningxia', '凝夏医科大学', '宁夏医科大学', 50, 2, 576, '银川'],
  ['neimenggu', '内猛古医科大学', '内蒙古医科大学', 51, 2, 574, '呼和浩特'],
  ['lanzhou', '蓝州大学医学院', '兰州大学医学院', 52, 2, 602, '兰州'],

  // —— 第三梯队（普通省属医科大学，录取分 540~574）——
  ['xinxiang', '心乡医学院', '新乡医学院', 53, 3, 568, '新乡'],
  ['weifang', '蚊防医学院', '潍坊医学院', 54, 3, 566, '潍坊'],
  ['binzhou', '宾州医学院', '滨州医学院', 55, 3, 564, '滨州'],
  ['jining', '鸡宁医学院', '济宁医学院', 56, 3, 562, '济宁'],
  ['hubei', '胡北医药学院', '湖北医药学院', 57, 3, 566, '十堰'],
  ['guangdong', '光东医科大学', '广东医科大学', 58, 3, 572, '湛江'],
  ['guilin', '鬼林医学院', '桂林医学院', 59, 3, 560, '桂林'],
  ['youjiang', '油江民族医学院', '右江民族医学院', 60, 3, 552, '百色'],
  ['zunyi', '尊义医科大学', '遵义医科大学', 61, 3, 574, '遵义'],
  ['xinan', '西男医科大学', '西南医科大学', 62, 3, 576, '泸州'],
  ['chuanbei', '船北医学院', '川北医学院', 63, 3, 568, '南充'],
  ['chengdu', '诚都医学院', '成都医学院', 64, 3, 570, '成都'],
  ['dali', '达理大学医学院', '大理大学医学院', 65, 3, 556, '大理'],
  ['gansu', '甘粟医科大学', '甘肃医科大学', 66, 3, 562, '兰州'],
  ['bengbu', '棒补医科大学', '蚌埠医科大学', 67, 3, 572, '蚌埠'],
  ['wannan', '碗南医学院', '皖南医学院', 68, 3, 566, '芜湖'],
  ['anhuigong', '安茴理工大学医学院', '安徽理工大学医学院', 69, 3, 558, '淮南'],
  ['gannan', '感南医科大学', '赣南医科大学', 70, 3, 560, '赣州'],
  ['jiujiang', '久江学院医学院', '九江学院医学院', 71, 3, 548, '九江'],
  ['beihua', '被华大学医学院', '北华大学医学院', 72, 3, 556, '吉林'],
  ['yanbian', '眼边大学医学院', '延边大学医学院', 73, 3, 568, '延吉'],
  ['mudanjiang', '母丹江医科大学', '牡丹江医科大学', 74, 3, 554, '牡丹江'],
  ['jiamusi', '家木斯大学医学院', '佳木斯大学医学院', 75, 3, 552, '佳木斯'],
  ['qiqihar', '七七哈尔医学院', '齐齐哈尔医学院', 76, 3, 550, '齐齐哈尔'],
  ['shenyang', '审阳医学院', '沈阳医学院', 77, 3, 566, '沈阳'],
  ['jinzhou', '瑾州医科大学', '锦州医科大学', 78, 3, 564, '锦州'],
  ['chengde', '称德医学院', '承德医学院', 79, 3, 560, '承德'],
  ['hebeiuni', '贺北大学医学部', '河北大学医学部', 80, 3, 562, '保定'],
  ['huabei', '画北理工大学医学院', '华北理工大学医学院', 81, 3, 564, '唐山'],
  ['changzhi', '长痣医学院', '长治医学院', 82, 3, 556, '长治'],
  ['shanxi', '闪西大同大学医学院', '山西大同大学医学院', 83, 3, 548, '大同'],
  ['baotou', '内猛古科技大学饱头医学院', '内蒙古科技大学包头医学院', 84, 3, 552, '包头'],
  ['chifeng', '吃峰学院医学院', '赤峰学院医学院', 85, 3, 546, '赤峰'],
  ['hexi', '赫西学院医学院', '河西学院医学院', 86, 3, 540, '张掖'],

  // —— 第四梯队（地市医专 / 普通本科医学院，录取分 500~538）——
  ['putian', '葡田学院医学院', '莆田学院医学院', 87, 4, 538, '莆田'],
  ['hangzhou', '航州师范大学医学院', '杭州师范大学医学院', 88, 4, 536, '杭州'],
  ['shaoxing', '邵兴文理学院医学院', '绍兴文理学院医学院', 89, 4, 534, '绍兴'],
  ['taizhou', '泰州学院医学院', '台州学院医学院', 90, 4, 532, '台州'],
  ['jiaxing', '佳兴学院医学院', '嘉兴学院医学院', 91, 4, 530, '嘉兴'],
  ['lishui', '栗水学院医学院', '丽水学院医学院', 92, 4, 528, '丽水'],
  ['hainan', '孩南医学院', '海南医学院', 93, 4, 526, '海口'],
  ['qinghai', '清海大学医学院', '青海大学医学院', 94, 4, 524, '西宁'],
  ['yanan', '烟安大学医学院', '延安大学医学院', 95, 4, 522, '延安'],
  ['hulun', '呼轮贝尔医学院', '呼伦贝尔医学院', 96, 4, 518, '呼伦贝尔'],
  ['shaoyang', '少阳学院医学院', '邵阳学院医学院', 97, 4, 512, '邵阳'],
  ['huaihua', '坏化学院医学院', '怀化学院医学院', 98, 4, 506, '怀化'],
  ['xiangnan', '想南学院医学院', '湘南学院医学院', 99, 4, 514, '郴州'],
  ['yichun', '异春学院医学院', '宜春学院医学院', 100, 4, 504, '宜春'],
  ['jinggang', '精刚山大学医学院', '井冈山大学医学院', 101, 4, 498, '吉安'],
  ['panzhihua', '盼枝花学院医学院', '攀枝花学院医学院', 102, 4, 492, '攀枝花'],
  ['xizang', '西葬大学医学院', '西藏大学医学院', 103, 4, 500, '拉萨'],
];

export const SCHOOLS: School[] = RAW_SCHOOLS.map(buildSchool);

export type TrackType = 'five_year' | 'five_plus_three' | 'eight_year';

export interface Track {
  id: TrackType; name: string; desc: string; totalYears: number;
  requiresTier: number; pros: string[]; cons: string[];
}

export const TRACKS: Track[] = [
  { id: 'eight_year', name: '八年制本博连读', desc: '顶尖院校才有，毕业即博士', totalYears: 8, requiresTier: 1, pros: ['毕业即博士学位'], cons: ['第5年有分流筛选', '压力极大'] },
  { id: 'five_plus_three', name: '5+3一体化', desc: '本科直升专硕', totalYears: 8, requiresTier: 3, pros: ['跳过考研', '四证合一'], cons: ['地域锁定8年'] },
  { id: 'five_year', name: '五年制普通本科', desc: '最常见', totalYears: 5, requiresTier: 4, pros: ['灵活'], cons: ['需额外3~8年'] },
];

export interface Hospital {
  id: string; name: string; tier: 'sanjiajia' | 'sanjiayi' | 'erjia' | 'community';
  tierLabel: string; city: string; minDegree: 'bachelor' | 'master' | 'phd';
  minReputation: number; minPapers: number; salary: number; hasEditor: boolean; desc: string;
}

export const HOSPITALS: Hospital[] = [
  { id: 'xieha_hospital', name: '北京协哈医学院附属医院', tier: 'sanjiajia', tierLabel: '三甲', city: '北京', minDegree: 'phd', minReputation: 80, minPapers: 5, salary: 20000, hasEditor: false, desc: '国内顶级' },
  { id: 'county_erjia', name: '县城中心医院', tier: 'erjia', tierLabel: '二甲', city: '县城', minDegree: 'master', minReputation: 20, minPapers: 0, salary: 5500, hasEditor: true, desc: '编制概率最高' },
];

export type DegreeType = 'bachelor' | 'master_pro' | 'master_academic' | 'phd';
