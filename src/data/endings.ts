import type { GameState } from './gameState';

export interface Ending {
  id: string; title: string; subtitle: string; desc: string;
  tone: 'bitter' | 'bittersweet' | 'resigned' | 'hopeful' | 'dark' | 'escape' | 'satirical';
  bgColor: number;
  stats: { finalAge: number; finalMoney: number; totalYears: number; title: string; hospital: string; verdict: string; };
  realDataCard: { label: string; value: string; source: string; }[];
}

export const ENDINGS: Ending[] = [
  {
    id: 'quit_guipei', title: '我不干了', subtitle: '你提前离开了这条路',
    tone: 'escape', bgColor: 0x1a2a1a,
    desc: '规培第二年，你递交了退出申请。这不是逃跑。这是你做过的最艰难的决定之一。',
    stats: { finalAge: 26, finalMoney: 15000, totalYears: 8, title: '（未完成规培）', hospital: '——', verdict: '你的人生还有很多可能' },
    realDataCard: [
      { label: '心理援助热线', value: '全国：400-161-9995', source: '国家卫健委' },
      { label: '退培后再就业', value: '可转公卫/器械/考公', source: '行业经验' },
    ],
  },
  {
    id: 'exhausted_attending', title: '精疲力竭的主治', subtitle: '35岁，主治，编外，房贷',
    tone: 'dark', bgColor: 0x1a1a2a,
    desc: '你35岁了。主治医师，编外，税后月薪9,200元。房贷月供7,800元。',
    stats: { finalAge: 35, finalMoney: -50000, totalYears: 17, title: '主治医师（编外）', hospital: '省会三甲', verdict: '学历最高，但最沉默的那群人' },
    realDataCard: [
      { label: '主治医师平均税后月薪（编外）', value: '¥7,000-12,000', source: '丁香园薪酬调查2024' },
      { label: '医生职业倦怠检出率', value: '约 50%-70%', source: '多项职业心理健康研究' },
    ],
  },
  {
    id: 'stable_at_45', title: '45岁的稳定', subtitle: '你有了编制，有了房',
    tone: 'resigned', bgColor: 0x1a2a2a,
    desc: '副主任医师，省会城市三甲医院，编制内。',
    stats: { finalAge: 45, finalMoney: 300000, totalYears: 27, title: '副主任医师', hospital: '省会三甲（编制）', verdict: '大多数人能达到的终点' },
    realDataCard: [
      { label: '副主任医师平均晋升年龄', value: '39.7岁', source: '中国医师协会2023年报' },
      { label: '三甲副主任医师年薪', value: '¥25万-50万', source: '丁香园薪酬调查2024' },
    ],
  },
  {
    id: 'chief_at_45', title: '主任医师的日常', subtitle: '正高在手，后面跟着一串年轻医生',
    tone: 'hopeful', bgColor: 0x14282a,
    desc: '主任医师，省会城市三甲医院，编制内。查房时你走在最前面；年轻医生看你的眼神，像极了当年你看老主任。',
    stats: { finalAge: 45, finalMoney: 500000, totalYears: 27, title: '主任医师', hospital: '省会三甲（编制）', verdict: '金字塔靠上的那一层' },
    realDataCard: [
      { label: '主任医师平均晋升年龄', value: '约45岁以上', source: '中国医师协会2023年报' },
      { label: '三甲主任医师年薪', value: '¥40万-80万（含绩效）', source: '丁香园薪酬调查2024' },
    ],
  },
  // —— 以下为扩展结局（M4）——
  {
    id: 'top_surgeon', title: '无影灯下的王', subtitle: '外科主任，手术台上的神话',
    tone: 'bittersweet', bgColor: 0x102030,
    desc: '你站上手术台，像站在自己的王国。年轻医生叫你"老师"，患者把命交给你。',
    stats: { finalAge: 42, finalMoney: 800000, totalYears: 24, title: '外科主任医师', hospital: '顶尖三甲', verdict: '手起刀落，也割走了自己的青春' },
    realDataCard: [
      { label: '三甲主任医师平均年薪', value: '¥40万-80万（含绩效）', source: '丁香园薪酬调查2024' },
      { label: '头部外科医生年均手术量', value: '200-400台', source: '行业公开数据' },
    ],
  },
  {
    id: 'community_doctor', title: '社区里的熟人', subtitle: '全科医生，邻里都找你',
    tone: 'resigned', bgColor: 0x1a2a1a,
    desc: '你没去拼三甲。社区卫生服务中心里，谁家高血压、谁家孩子发烧，你门儿清。',
    stats: { finalAge: 38, finalMoney: 120000, totalYears: 20, title: '社区全科医生', hospital: '社区卫生服务中心', verdict: '没有惊天动地，但被需要' },
    realDataCard: [
      { label: '基层全科医生平均月薪', value: '¥6,000-10,000', source: '卫健委基层薪酬监测' },
      { label: '家庭医生签约覆盖率', value: '>40%', source: '国家卫健委2023' },
    ],
  },
  {
    id: 'medical_affairs', title: '脱下白大褂', subtitle: '药企医学联络官 / 医药代表',
    tone: 'escape', bgColor: 0x2a1a2a,
    desc: '你换了一种方式留在医疗圈。西装代替了刷手服，KPI 代替了病历。',
    stats: { finalAge: 36, finalMoney: 350000, totalYears: 18, title: '医学联络官', hospital: '某药企', verdict: '你用另一种语言，继续和疾病打交道' },
    realDataCard: [
      { label: '医学联络官平均年薪', value: '¥15万-30万', source: '行业薪酬报告' },
      { label: '考虑转行医疗行业的医生', value: '约 1/5', source: '行业调研' },
    ],
  },
  {
    id: 'overseas_doctor', title: '太平洋彼岸的执照', subtitle: '考过执业考试，海外行医',
    tone: 'escape', bgColor: 0x102a2a,
    desc: '语言关、考试关、资格关，你都过了。另一个国家的病房里，没人知道你曾想退培。',
    stats: { finalAge: 40, finalMoney: 600000, totalYears: 22, title: 'Attending Physician', hospital: '海外医院', verdict: '离乡背井，但也远离了某些东西' },
    realDataCard: [
      { label: '海外执业医生平均年薪', value: '$150k-$300k', source: 'Medscape 医师薪酬报告' },
      { label: '海外行医主要门槛', value: '执业考试+学历认证', source: '公开报考指南' },
    ],
  },
  {
    id: 'burnout_early', title: '35岁以前的倦怠', subtitle: '没辞职，但也没了光',
    tone: 'dark', bgColor: 0x1a1a2a,
    desc: '你还在岗。只是清晨穿白大褂时，不再有那点隐秘的骄傲。',
    stats: { finalAge: 34, finalMoney: -20000, totalYears: 16, title: '主治医师（勉强）', hospital: '市级三甲', verdict: '你撑住了，代价是热爱' },
    realDataCard: [
      { label: '医生职业倦怠检出率', value: '约 50%-70%', source: '多项职业心理健康研究' },
      { label: '青年医生离职意向', value: '显著上升', source: '近年行业调研' },
    ],
  },
  {
    id: 'academic_star', title: '论文署名者', subtitle: '高被引学者，会议常客',
    tone: 'bittersweet', bgColor: 0x1a1020,
    desc: '你的名字出现在很多参考文献里。同行引用你，学生仰望你，体检报告也提醒你。',
    stats: { finalAge: 41, finalMoney: 500000, totalYears: 23, title: '研究员/副主任医师', hospital: '高校附属医院', verdict: '论文堆里，藏着多少个不眠夜' },
    realDataCard: [
      { label: '临床医生头部年均发文量', value: '5-15篇', source: '学术平台统计' },
      { label: '国自然面上项目中标率', value: '约 15%-20%', source: '国家自然科学基金委' },
    ],
  },
  {
    id: 'grassroots_hero', title: '县城里的主心骨', subtitle: '基层医院的顶梁柱',
    tone: 'bittersweet', bgColor: 0x1a2a1a,
    desc: '你让县城的人不用奔波去省城。一台阑尾炎、一次心肺复苏，你都接得住。',
    stats: { finalAge: 39, finalMoney: 180000, totalYears: 21, title: '基层副主任医师', hospital: '县城医院', verdict: '被需要，是一种踏实' },
    realDataCard: [
      { label: '县域医院骨干医生月薪', value: '¥8,000-12,000', source: '县域医改报告' },
      { label: '部分地区基层人才年流失率', value: '>10%', source: '行业调研' },
    ],
  },
  {
    id: 'left_undergrad', title: '没读完的白大褂', subtitle: '你在成为医生之前，先离开了',
    tone: 'escape', bgColor: 0x1f2a1f,
    desc: '退学申请签字那天，你把教材摞在宿舍楼下的旧书摊。有人挑走了那本《系统解剖学》，扉页上还留着你写的笔记。后来你换了条路走。偶尔看见白大褂，会想起解剖楼的味道，但不再心慌。',
    stats: { finalAge: 21, finalMoney: 8000, totalYears: 3, title: '（肄业）', hospital: '——', verdict: '止损也是一种勇气' },
    realDataCard: [
      { label: '医学类本科退学/转专业', value: '比例低，但真实存在', source: '各校学生手册与年度报告' },
      { label: '学业警示后可选路径', value: '重修 / 转专业 / 休学 / 退学', source: '普通高等学校学生管理规定' },
      { label: '心理援助热线', value: '全国：400-161-9995', source: '国家卫健委' },
    ],
  },
  {
    id: 'disgraced', title: '通报里的那个名字', subtitle: '学术不端调查结论公布',
    tone: 'dark', bgColor: 0x2a1418,
    desc: '撤稿、撤销学位、五年内禁止申报课题。通报挂在官网上，搜索你的名字，第一条就是它。你还能穿白大褂，但很多扇门在同一天关上了。',
    stats: { finalAge: 40, finalMoney: -80000, totalYears: 22, title: '（职称已撤销）', hospital: '——', verdict: '那几篇论文，最终标价是一整个职业生涯' },
    realDataCard: [
      { label: '近年集中撤稿规模', value: '单次可达上百篇', source: '国际期刊撤稿公告' },
      { label: '学术不端处理方式', value: '撤稿/撤销学位/取消申报资格', source: '科研诚信案件调查处理规则' },
      { label: '论文工厂报价区间', value: '数万元/篇', source: '公开报道' },
    ],
  },
  {
    id: 'lucky_fraud', title: '没有人来敲门', subtitle: '你赌赢了，但没睡好',
    tone: 'satirical', bgColor: 0x1e1a2e,
    desc: '那几篇东西还挂在数据库里，没人查、没人问。你评上了职称，带了学生，成了别人口中的"李老师"。\n只是每次有人提起"学术规范"，你都会走一下神；每次学生来要原始数据，你都要找个借口。',
    stats: { finalAge: 42, finalMoney: 400000, totalYears: 24, title: '主任医师', hospital: '省会三甲', verdict: '侥幸不是清白，只是还没轮到你' },
    realDataCard: [
      { label: '被撤稿论文的平均潜伏期', value: '数年，个别超过十年', source: 'Retraction Watch 数据库' },
      { label: '主动撤稿占比', value: '远低于被动撤稿', source: '学术出版研究' },
    ],
  },
  {
    id: 'master_clinician', title: '一把好刀', subtitle: '论文不多，但病人认你',
    tone: 'bittersweet', bgColor: 0x14202c,
    desc: '你没什么高分文章，评职称时年年吃亏。可科里遇到棘手的病人，第一个想到的还是你。\n有患者从外省专门赶来，说"别人介绍的，说找你就对了"。',
    stats: { finalAge: 41, finalMoney: 260000, totalYears: 23, title: '主任医师（临床型）', hospital: '市级三甲', verdict: '手上的功夫，写不进影响因子' },
    realDataCard: [
      { label: '晋升评价中论文权重', value: '长期偏高，近年开始调整', source: '职称制度改革文件' },
      { label: '临床能力评价试点', value: '多地探索"以临床为主"通道', source: '卫健委相关政策' },
    ],
  },
];

export const ENDINGS_BY_ID: Record<string, Ending> = Object.fromEntries(ENDINGS.map(e => [e.id, e]));

export function determineEnding(state: GameState): Ending {
  const { stats, flags } = state;
  const age = stats.age;
  const money = stats.money;
  const married = state.marital === 'married';
  const clinical = stats.clinical ?? 0;
  const research = stats.research ?? 0;

  // 0. 真正退出了医疗行业
  if (flags.has('left_undergrad')) return ENDINGS_BY_ID['left_undergrad']; // 本科期间退学
  if (flags.has('left_med')) return ENDINGS_BY_ID['quit_guipei'];
  if (flags.has('considering_quit_guipei') && stats.sanity < 25 && state.stage !== 'career') return ENDINGS_BY_ID['quit_guipei'];

  // 0.5 学术不端：被查与侥幸
  // 身败名裂优先于一切"成功"结局——论文再多，通报盖住了。
  if (flags.has('exposed_ruin')) return ENDINGS_BY_ID['disgraced'];
  // 侥幸：造过假、没被重度处理、靠造假红利评上了职称。
  // 比"稳定晋升"更讽刺，也更真实——很多被撤稿的人其实已经评过了。
  if (flags.has('has_faked')
      && !flags.has('exposed_retraction')
      && !flags.has('exposed_ruin')
      && (flags.has('passed_fugao') || flags.has('dt_relocated_on_fake') || stats.papers >= 5)) {
    return ENDINGS_BY_ID['lucky_fraud'];
  }

  // 1. 出国行医
  if (flags.has('abroad') && stats.knowledge > 60) return ENDINGS_BY_ID['overseas_doctor'];

  // 2. 转行医疗产业
  if (flags.has('industry_intern') || flags.has('took_private')) return ENDINGS_BY_ID['medical_affairs'];

  // 3. 学术/外科顶流
  // 注意：top_surgeon 与 academic_star 的判定顺序是有意的——
  // 高论文+高声望优先外科主任（临床资源更多），否则走学术明星。
  // 用户此前明确暂不调整此顺序。
  if (stats.papers >= 8 && stats.reputation >= 70) return ENDINGS_BY_ID['top_surgeon'];
  // 科研型学者：用 research 轴替代原先的 knowledge 门槛，
  // 让"真做科研"的人能走到这条结局，而不是只靠 knowledge 泛读。
  if (stats.papers >= 6 && (research >= 55 || stats.knowledge >= 70)) {
    return ENDINGS_BY_ID['academic_star'];
  }

  // 3.5 临床型专家：临床力高、论文不多——晋升吃亏但病人认你。
  // 必须在基层路线之前判定，否则"临床强但没去基层"的人会掉进默认结局。
  if (clinical >= 60 && stats.papers <= 3 && stats.reputation >= 40) {
    return ENDINGS_BY_ID['master_clinician'];
  }

  // 4. 基层路线（真实选择：家乡基地 / 县城 / 基层编制）
  if (flags.has('offer_grass') || flags.has('base_home') || flags.has('city_home') || flags.has('chose_grassroots')) {
    return stats.relations >= 60 ? ENDINGS_BY_ID['grassroots_hero'] : ENDINGS_BY_ID['community_doctor'];
  }

  // 5. 丧亲重创：家人尽失且心理创伤未愈
  if (flags.has('kin_all_gone') && stats.sanity < 35) return ENDINGS_BY_ID['burnout_early'];

  // 6. 早期职业倦怠（未崩但濒临）
  if (age < 35 && stats.sanity < 30) return ENDINGS_BY_ID['burnout_early'];

  // 7. 深陷负债（真实经济后果：收支长期为负）
  if (money < -30000) return ENDINGS_BY_ID['exhausted_attending'];

  // 8. 稳定晋升路（成家者门槛略低，体现家庭支撑这一真实变量）
  // 正高已评上：直接进主任医师结局—— exhausted_attending 的"主治编外"叙事与正高矛盾。
  // 位置在 lucky_fraud(0.5) 之后：造假者即便评上正高，仍先被"侥幸"截住。
  if (flags.has('passed_zhenggao')) return ENDINGS_BY_ID['chief_at_45'];
  if (flags.has('passed_fugao') || flags.has('passed_zhuzhi')) {
    const repThreshold = married ? 35 : 50;
    return stats.reputation > repThreshold ? ENDINGS_BY_ID['stable_at_45'] : ENDINGS_BY_ID['exhausted_attending'];
  }

  // 默认：精疲力竭的主治
  return ENDINGS_BY_ID['exhausted_attending'];
}
