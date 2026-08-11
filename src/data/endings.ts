import type { GameState } from './gameState';
import type { EvidenceId } from './evidence';

export interface Ending {
  id: string; title: string; subtitle: string; desc: string;
  tone: 'bitter' | 'bittersweet' | 'resigned' | 'hopeful' | 'dark' | 'escape' | 'satirical';
  bgColor: number;
  stats: { finalAge: number; finalMoney: number; totalYears: number; title: string; hospital: string; verdict: string; };
  realDataCard: { label: string; value: string; evidenceId: EvidenceId; }[];
}

export const ENDINGS: Ending[] = [
  {
    id: 'quit_guipei', title: '我不干了', subtitle: '你提前离开了这条路',
    tone: 'escape', bgColor: 0x1a2a1a,
    desc: '规培第二年，你递交了退出申请。这不是逃跑。这是你做过的最艰难的决定之一。',
    stats: { finalAge: 26, finalMoney: 15000, totalYears: 8, title: '（未完成规培）', hospital: '——', verdict: '你的人生还有很多可能' },
    realDataCard: [
      { label: '心理援助热线', value: '全国统一号码：12356', evidenceId: '国家卫健委' },
    ],
  },
  {
    id: 'exhausted_attending', title: '精疲力竭的主治', subtitle: '35岁，主治，编外，房贷',
    tone: 'dark', bgColor: 0x1a1a2a,
    desc: '你35岁了。主治医师，编外。工资到账后，房贷和生活开支很快把数字压了下去。',
    stats: { finalAge: 35, finalMoney: -50000, totalYears: 17, title: '主治医师（编外）', hospital: '省会三甲', verdict: '学历最高，但最沉默的那群人' },
    realDataCard: [
      { label: '中国医生职业倦怠总体检出率', value: '系统综述汇总为 75.48%', evidenceId: '多项职业心理健康研究' },
    ],
  },
  {
    id: 'stable_at_45', title: '45岁的稳定', subtitle: '你有了编制，有了房',
    tone: 'resigned', bgColor: 0x1a2a2a,
    desc: '副主任医师，省会城市三甲医院，编制内。',
    stats: { finalAge: 45, finalMoney: 300000, totalYears: 27, title: '副主任医师', hospital: '省会三甲（编制）', verdict: '大多数人能达到的终点' },
    realDataCard: [],
  },
  {
    id: 'chief_at_45', title: '主任医师的日常', subtitle: '正高在手，后面跟着一串年轻医生',
    tone: 'hopeful', bgColor: 0x14282a,
    desc: '主任医师，省会城市三甲医院，编制内。查房时你走在最前面；年轻医生看你的眼神，像极了当年你看老主任。',
    stats: { finalAge: 45, finalMoney: 500000, totalYears: 27, title: '主任医师', hospital: '省会三甲（编制）', verdict: '金字塔靠上的那一层' },
    realDataCard: [],
  },
  // —— 以下为扩展结局（M4）——
  {
    id: 'top_surgeon', title: '无影灯下的王', subtitle: '外科主任，手术台上的神话',
    tone: 'bittersweet', bgColor: 0x102030,
    desc: '你站上手术台，像站在自己的王国。年轻医生叫你"老师"，患者把命交给你。',
    stats: { finalAge: 42, finalMoney: 800000, totalYears: 24, title: '外科主任医师', hospital: '顶尖三甲', verdict: '手起刀落，也割走了自己的青春' },
    realDataCard: [],
  },
  {
    id: 'community_doctor', title: '社区里的熟人', subtitle: '全科医生，邻里都找你',
    tone: 'resigned', bgColor: 0x1a2a1a,
    desc: '你没去拼三甲。社区卫生服务中心里，谁家高血压、谁家孩子发烧，你门儿清。',
    stats: { finalAge: 38, finalMoney: 120000, totalYears: 20, title: '社区全科医生', hospital: '社区卫生服务中心', verdict: '没有惊天动地，但被需要' },
    realDataCard: [],
  },
  {
    id: 'medical_affairs', title: '脱下白大褂', subtitle: '药企医学联络官 / 医药代表',
    tone: 'escape', bgColor: 0x2a1a2a,
    desc: '你换了一种方式留在医疗圈。西装代替了刷手服，KPI 代替了病历。',
    stats: { finalAge: 36, finalMoney: 350000, totalYears: 18, title: '医学联络官', hospital: '某药企', verdict: '你用另一种语言，继续和疾病打交道' },
    realDataCard: [],
  },
  {
    id: 'overseas_doctor', title: '太平洋彼岸的执照', subtitle: '考过执业考试，海外行医',
    tone: 'escape', bgColor: 0x102a2a,
    desc: '语言关、考试关、资格关，你都过了。另一个国家的病房里，没人知道你曾想退培。',
    stats: { finalAge: 40, finalMoney: 600000, totalYears: 22, title: 'Attending Physician', hospital: '海外医院', verdict: '离乡背井，但也远离了某些东西' },
    realDataCard: [],
  },
  {
    id: 'burnout_early', title: '35岁以前的倦怠', subtitle: '没辞职，但也没了光',
    tone: 'dark', bgColor: 0x1a1a2a,
    desc: '你还在岗。只是清晨穿白大褂时，不再有那点隐秘的骄傲。',
    stats: { finalAge: 34, finalMoney: -20000, totalYears: 16, title: '主治医师（勉强）', hospital: '市级三甲', verdict: '你撑住了，代价是热爱' },
    realDataCard: [
      { label: '中国医生职业倦怠总体检出率', value: '系统综述汇总为 75.48%', evidenceId: '多项职业心理健康研究' },
    ],
  },
  {
    id: 'academic_star', title: '论文署名者', subtitle: '高被引学者，会议常客',
    tone: 'bittersweet', bgColor: 0x1a1020,
    desc: '你的名字出现在很多参考文献里。同行引用你，学生仰望你，体检报告也提醒你。',
    stats: { finalAge: 41, finalMoney: 500000, totalYears: 23, title: '研究员/副主任医师', hospital: '高校附属医院', verdict: '论文堆里，藏着多少个不眠夜' },
    realDataCard: [],
  },
  {
    id: 'grassroots_hero', title: '县城里的主心骨', subtitle: '基层医院的顶梁柱',
    tone: 'bittersweet', bgColor: 0x1a2a1a,
    desc: '你让县城的人不用奔波去省城。一台阑尾炎、一次心肺复苏，你都接得住。',
    stats: { finalAge: 39, finalMoney: 180000, totalYears: 21, title: '基层副主任医师', hospital: '县城医院', verdict: '被需要，是一种踏实' },
    realDataCard: [],
  },
  {
    id: 'left_undergrad', title: '没读完的白大褂', subtitle: '你在成为医生之前，先离开了',
    tone: 'escape', bgColor: 0x1f2a1f,
    desc: '退学申请签字那天，你把教材摞在宿舍楼下的旧书摊。有人挑走了那本《系统解剖学》，扉页上还留着你写的笔记。后来你换了条路走。偶尔看见白大褂，会想起解剖楼的味道，但不再心慌。',
    stats: { finalAge: 21, finalMoney: 8000, totalYears: 3, title: '（肄业）', hospital: '——', verdict: '止损也是一种勇气' },
    realDataCard: [
      { label: '学业警示后可选路径', value: '重修 / 转专业 / 休学 / 退学', evidenceId: '普通高等学校学生管理规定' },
      { label: '心理援助热线', value: '全国统一号码：12356', evidenceId: '国家卫健委' },
    ],
  },
  {
    id: 'era0_unchosen_road', title: '未选择的路', subtitle: '你没有踏进医学院',
    tone: 'bittersweet', bgColor: 0x20251f,
    desc: '那年夏天，你去了另一座城市，读了另一个专业。后来偶尔在新闻里看到医生的消息，心里会轻轻动一下，然后继续往前走。人生没有如果；没有选择学医，也不等于选择错了。',
    stats: { finalAge: 18, finalMoney: 5000, totalYears: 0, title: '另一专业的新生', hospital: '——', verdict: '你选择了更适合当时自己的路' },
    realDataCard: [
      { label: '转专业与重新选择', value: '选择并非一次性定终身', evidenceId: '普通高等学校学生管理规定' },
    ],
  },
  {
    id: 'era0_fell_short', title: '差一点', subtitle: '分数线停在你面前',
    tone: 'bitter', bgColor: 0x25211f,
    desc: '分数出来的那个晚上，你离医学院只差一段看得见、却跨不过去的距离。后来你去了另一所学校。很多年后再想起，那个夏天像一场梦——你差一点就成为医生了。差一点。',
    stats: { finalAge: 18, finalMoney: 5000, totalYears: 0, title: '未被医学院录取', hospital: '——', verdict: '一次考试改变了路线，却没有定义你的一生' },
    realDataCard: [],
  },
  {
    id: 'era0_escape_white_tower', title: '逃离白色巨塔', subtitle: '你把“学医”留在了那个夏天',
    tone: 'escape', bgColor: 0x1b2428,
    desc: '那晚之后，你再也没有主动提起过“学医”。你去了另一座城市，读了另一个专业，过着另一种生活。偶尔在深夜里，你会想起那个曾经想成为医生的自己——但你已经走得很远了。',
    stats: { finalAge: 18, finalMoney: 5000, totalYears: 0, title: '重新选择方向', hospital: '——', verdict: '离开也是一种对自己的保护' },
    realDataCard: [
      { label: '心理援助热线', value: '全国统一号码：12356', evidenceId: '国家卫健委' },
    ],
  },
  {
    id: 'disgraced', title: '通报里的那个名字', subtitle: '学术不端调查结论公布',
    tone: 'dark', bgColor: 0x2a1418,
    desc: '撤稿、撤销学位、五年内禁止申报课题。通报挂在官网上，搜索你的名字，第一条就是它。你还能穿白大褂，但很多扇门在同一天关上了。',
    stats: { finalAge: 40, finalMoney: -80000, totalYears: 22, title: '（职称已撤销）', hospital: '——', verdict: '那几篇论文，最终标价是一整个职业生涯' },
    realDataCard: [
      { label: '学术不端处理方式', value: '撤稿/撤销学位/取消申报资格', evidenceId: '科研诚信案件调查处理规则' },
    ],
  },
  {
    id: 'lucky_fraud', title: '没有人来敲门', subtitle: '你赌赢了，但没睡好',
    tone: 'satirical', bgColor: 0x1e1a2e,
    desc: '那几篇东西还挂在数据库里，没人查、没人问。你评上了职称，带了学生，成了别人口中的"李老师"。\n只是每次有人提起"学术规范"，你都会走一下神；每次学生来要原始数据，你都要找个借口。',
    stats: { finalAge: 42, finalMoney: 400000, totalYears: 24, title: '主任医师', hospital: '省会三甲', verdict: '侥幸不是清白，只是还没轮到你' },
    realDataCard: [
      { label: 'PubMed 撤稿论文平均时滞', value: '2047 篇分析：32.91 个月', evidenceId: '科学撤稿时滞研究' },
    ],
  },
  {
    id: 'master_clinician', title: '一把好刀', subtitle: '论文不多，但病人认你',
    tone: 'bittersweet', bgColor: 0x14202c,
    desc: '你没什么高分文章，评职称时年年吃亏。可科里遇到棘手的病人，第一个想到的还是你。\n有患者从外省专门赶来，说"别人介绍的，说找你就对了"。',
    stats: { finalAge: 41, finalMoney: 260000, totalYears: 23, title: '主任医师（临床型）', hospital: '市级三甲', verdict: '手上的功夫，写不进影响因子' },
    realDataCard: [
      { label: '晋升评价中论文权重', value: '长期偏高，近年开始调整', evidenceId: '职称制度改革文件' },
    ],
  },
  {
    id: 'worker_steady', title: '安稳的日子', subtitle: '没上大学，但也过得去',
    tone: 'bittersweet', bgColor: 0x1f2a2e,
    desc: '你没走上那条最长的路。高中毕业后进了厂、去了工地，或者做了销售。钱不多，但每月按时到账，家里人踏实。\n偶尔刷到当年的同学成了医生，你替他们高兴，也替自己松了口气——至少你睡得早。',
    stats: { finalAge: 38, finalMoney: 60000, totalYears: 20, title: '（打工者）', hospital: '——', verdict: '不是每条路都要读那么久' },
    realDataCard: [
      { label: '我国高等教育毛入学率', value: '2023 年为 60.2%', evidenceId: '教育部历年统计' },
      { label: '技能工种缺口', value: '制造业 / 服务业长期存在', evidenceId: '人社部职业技能提升计划' },
    ],
  },
  {
    id: 'worker_struggle', title: '浮沉打工路', subtitle: '没学历，靠体力与时间换钱',
    tone: 'dark', bgColor: 0x231a16,
    desc: '没有文凭兜底，你来来回回换过几份工。工厂、外卖、零工——哪一单停了，哪一天就没进项。\n你比同龄人更早懂了"手停口停"，也更早学会了在活儿多时先存一笔应急钱。',
    stats: { finalAge: 38, finalMoney: -5000, totalYears: 20, title: '（打工者）', hospital: '——', verdict: '学历不是唯一出路，但确实是缓冲' },
    realDataCard: [],
  },
  {
    id: 'great_healer', title: '大医精诚', subtitle: '归途完整，承诺兑现',
    tone: 'hopeful', bgColor: 0x18231f,
    desc: '你走的时候，家人和学生都在。你留下的不只是一串职称，还有被认真对待过的患者、被托举过的后来者，以及一套能在你离开后继续运转的准则。\n十八岁那句“我想学医”，终于有了完整的句号。',
    stats: { finalAge: 80, finalMoney: 0, totalYears: 62, title: '医生 · 教师 · 传承者', hospital: '一生行医之地', verdict: '称职，也被记住' },
    realDataCard: [
      { label: '未竟之事完成度', value: '80%以上', evidenceId: '本局生涯记录' },
      { label: '留下的遗产', value: '临床、学术、制度、精神与家庭', evidenceId: '本局选择汇总' },
    ],
  },
  {
    id: 'inheritor', title: '传承者', subtitle: '你离开了岗位，没有离开医学',
    tone: 'hopeful', bgColor: 0x17252a,
    desc: '学生继续使用你教过的方法，也会修正你没有解决的问题。你的名字未必总被提起，但你的判断方式仍活在下一代医生的手里。',
    stats: { finalAge: 78, finalMoney: 0, totalYears: 60, title: '传承者', hospital: '后来者的科室', verdict: '接力棒已经交出' },
    realDataCard: [
      { label: '传承值', value: '60以上', evidenceId: '本局生涯记录' },
      { label: '接班与教学', value: '已形成可持续的后来者路径', evidenceId: '时代6-8选择' },
    ],
  },
  {
    id: 'ordinary_road', title: '平凡之路', subtitle: '没有传奇，仍然值得',
    tone: 'bittersweet', bgColor: 0x202522,
    desc: '你没有成为院士，也没有让所有人记住名字。但几十年里，你认真看病、写病历、值夜班，也在能力范围内保护过一些人。\n几位患者和同事来送你。这已经足够构成一生。',
    stats: { finalAge: 79, finalMoney: 0, totalYears: 61, title: '医生', hospital: '曾经工作过的医院', verdict: '平凡，但值得' },
    realDataCard: [
      { label: '完成度', value: '60以上', evidenceId: '本局生涯记录' },
      { label: '职业价值', value: '不只由头衔和论文定义', evidenceId: '全局选择汇总' },
    ],
  },
  {
    id: 'unfinished_life', title: '未尽', subtitle: '总有一些事，来不及',
    tone: 'resigned', bgColor: 0x232021,
    desc: '还有一些话没说，一些人没见，一些页没有写完。人生不会因为遗憾而全部失效，只是最后那一刻，你仍能感到那些空白的形状。',
    stats: { finalAge: 75, finalMoney: 0, totalYears: 57, title: '退休医生', hospital: '——', verdict: '未完成，也是人生的一部分' },
    realDataCard: [
      { label: '未竟之事完成度', value: '不足60', evidenceId: '本局生涯记录' },
      { label: '仍被保留的部分', value: '已完成的关系与选择', evidenceId: '全局选择汇总' },
    ],
  },
  {
    id: 'final_rest', title: '安息', subtitle: '终于可以休息了',
    tone: 'resigned', bgColor: 0x1a2026,
    desc: '你太累了。多年里，你习惯把休息排在患者、科室和家庭之后。最后一次闭上眼睛时，不再有下一张排班表。\n这一次，休息不需要向任何人请假。',
    stats: { finalAge: 74, finalMoney: 0, totalYears: 56, title: '退休医生', hospital: '——', verdict: '劳累终止，尊严仍在' },
    realDataCard: [
      { label: '身体负荷', value: '长期高劳损', evidenceId: '健康模块记录' },
      { label: '最后选择', value: '休息', evidenceId: '时代8最终选择' },
    ],
  },
  {
    id: 'meteor_life', title: '流星', subtitle: '短暂，明亮，被一些人看见',
    tone: 'bittersweet', bgColor: 0x231f2a,
    desc: '你的职业生涯经历过不止一次严重倒下。它比原本计划的更短，却照亮过患者、同事和学生的一段路。那些被照亮的人，会继续向前。',
    stats: { finalAge: 70, finalMoney: 0, totalYears: 52, title: '医生', hospital: '——', verdict: '长度不是唯一的尺度' },
    realDataCard: [
      { label: '重大身体事件', value: '多次', evidenceId: '健康模块记录' },
      { label: '仍留下的回声', value: '患者、同事与学生', evidenceId: '本局选择汇总' },
    ],
  },
];

export const ENDINGS_BY_ID: Record<string, Ending> = Object.fromEntries(ENDINGS.map(e => [e.id, e]));

// 图鉴中未解锁结局的提示文案（轻微剧透，指引多周目尝试方向）
export const ENDING_HINTS: Record<string, string> = {
  quit_guipei: '规培期间撑不下去时，认真考虑"离开"这个选项。',
  exhausted_attending: '走完职业路，但声望平平、或生活没顾上。',
  stable_at_45: '评上主治/副高，并把声望维持住。',
  chief_at_45: '评上副高之后，在职业后期再冲刺正高。',
  top_surgeon: '论文 8 篇以上，声望拔尖。',
  community_doctor: '求职或规培时，选择去基层/回家乡。',
  medical_affairs: '实习或规培时，抓住转行医药产业的机会。',
  overseas_doctor: '选择出国行医，且学识足够过硬。',
  burnout_early: '心理长期低迷，却一直没有好好休整。',
  academic_star: '论文 6 篇以上，科研能力突出。',
  grassroots_hero: '去基层，并把身边的人处成自己人。',
  left_undergrad: '本科期间，真的递交退学申请。',
  era0_unchosen_road: '在志愿填报前，主动选择另一条专业道路。',
  era0_fell_short: '分数未达到医学院门槛，也没有选择复读或定向培养。',
  era0_escape_white_tower: '放榜落差后，拒绝继续讨论复读、定向或学医。',
  disgraced: '学术造假，被重度曝光。',
  lucky_fraud: '造过假、没被抓，还评上了职称。',
  master_clinician: '临床能力出众、论文很少、病人认你。',
  worker_steady: '高考后选择放弃升学、直接工作。',
  worker_struggle: '没学历兜底，手停口停、几经浮沉。',
  great_healer: '完成大部分未竟之事，同时守住传承、家庭和职业底线。',
  inheritor: '在时代6-8把接力棒真正交给后来者。',
  ordinary_road: '走到归途，完成度达到60，接受一生的普通与价值。',
  unfinished_life: '走到归途，但仍有较多未竟之事。',
  final_rest: '长期高劳损，并在最后选择休息。',
  meteor_life: '一生经历多次重大身体事件，仍留下清晰回声。',
};

export function determineEnding(state: GameState): Ending {
  const { stats, flags } = state;
  const age = stats.age;
  const money = stats.money;
  const married = state.marital === 'married';
  const clinical = stats.clinical ?? 0;
  const research = stats.research ?? 0;

  let ending: Ending;
  const late = state.lateLife;
  const reachedFinalEra = state.stage === 'eternity' || (state.stage === 'ending' && late?.finalChoice != null);
  if (reachedFinalEra && late) {
    const health = state.health;
    const stableInnerLife = (state.spirit?.meaning ?? 50) >= 60
      && (state.family?.familyFunction ?? 50) >= 45
      && (state.publicImage?.publicRisk ?? 0) < 70
      && (state.research?.misconductRisk ?? 0) < 70;
    if ((health?.collapseCount ?? 0) >= 2 || (health?.majorIncidents?.length ?? 0) >= 4) ending = ENDINGS_BY_ID['meteor_life'];
    else if (late.finalChoice === 'rest' || (health?.strain ?? 0) >= 85) ending = ENDINGS_BY_ID['final_rest'];
    else if (late.completion >= 80 && late.legacy >= 65 && stats.reputation >= 45 && state.familyAlive > 0 && stableInnerLife) ending = ENDINGS_BY_ID['great_healer'];
    else if (late.finalChoice === 'passed_the_baton' || late.legacy >= 60 || flags.has('era6_legacy_success') || (state.colleagues?.studentLoyalty ?? 0) >= 75) ending = ENDINGS_BY_ID['inheritor'];
    else if ((state.publicImage?.publicRisk ?? 0) >= 90 || (state.research?.misconductRisk ?? 0) >= 90) ending = ENDINGS_BY_ID['unfinished_life'];
    else if (late.completion >= 60 || ((state.spirit?.meaning ?? 0) >= 55 && (state.leisure?.lifeSatisfaction ?? 0) >= 50)) ending = ENDINGS_BY_ID['ordinary_road'];
    else ending = ENDINGS_BY_ID['unfinished_life'];
  }
  // 0. 真正退出了医疗行业
  else if (flags.has('era0_unchosen_road')) ending = ENDINGS_BY_ID['era0_unchosen_road'];
  else if (flags.has('era0_fell_short')) ending = ENDINGS_BY_ID['era0_fell_short'];
  else if (flags.has('era0_escape_white_tower')) ending = ENDINGS_BY_ID['era0_escape_white_tower'];
  else if (flags.has('left_undergrad')) ending = ENDINGS_BY_ID['left_undergrad']; // 本科期间退学
  else if (flags.has('left_med')) ending = ENDINGS_BY_ID['quit_guipei'];
  else if (flags.has('considering_quit_guipei') && stats.sanity < 25 && state.stage !== 'career') ending = ENDINGS_BY_ID['quit_guipei'];

  // 0.1 未上大学、直接工作的非医生线：按经济与心境收尾，不走任何医学结局。
  else if (flags.has('no_college')) {
    if (money + (state.assets ?? 0) < -10000 || stats.sanity < 30) ending = ENDINGS_BY_ID['worker_struggle'];
    else ending = ENDINGS_BY_ID['worker_steady'];
  }

  // 0.5 学术不端：被查与侥幸
  // 身败名裂优先于一切"成功"结局——论文再多，通报盖住了。
  else if (flags.has('exposed_ruin') || (state.research?.misconductRisk ?? 0) >= 90) ending = ENDINGS_BY_ID['disgraced'];
  // 侥幸：造过假、没被重度处理、靠造假红利评上了职称。
  // 比"稳定晋升"更讽刺，也更真实——很多被撤稿的人其实已经评过了。
  else if (flags.has('has_faked')
      && !flags.has('exposed_retraction')
      && !flags.has('exposed_ruin')
      && (flags.has('passed_fugao') || flags.has('dt_relocated_on_fake') || stats.papers >= 5)) {
    ending = ENDINGS_BY_ID['lucky_fraud'];
  }

  // 1. 出国行医
  else if (flags.has('abroad') && stats.knowledge > 60) ending = ENDINGS_BY_ID['overseas_doctor'];

  // 2. 转行医疗产业
  else if (flags.has('industry_intern') || flags.has('took_private')) ending = ENDINGS_BY_ID['medical_affairs'];

  // 3. 学术/外科顶流
  // 注意：top_surgeon 与 academic_star 的判定顺序是有意的——
  // 高论文+高声望优先外科主任（临床资源更多），否则走学术明星。
  // 用户此前明确暂不调整此顺序。
  else if (stats.papers >= 8 && stats.reputation >= 70) ending = ENDINGS_BY_ID['top_surgeon'];
  // 科研型学者：用 research 轴替代原先的 knowledge 门槛，
  // 让"真做科研"的人能走到这条结局，而不是只靠 knowledge 泛读。
  else if (stats.papers >= 6 && (research >= 55 || stats.knowledge >= 70)) {
    ending = ENDINGS_BY_ID['academic_star'];
  }

  // 3.5 临床型专家：临床力高、论文不多——晋升吃亏但病人认你。
  // 必须在基层路线之前判定，否则"临床强但没去基层"的人会掉进默认结局。
  else if (clinical >= 60 && stats.papers <= 3 && stats.reputation >= 40) {
    ending = ENDINGS_BY_ID['master_clinician'];
  }

  // 4. 基层路线（真实选择：县城/社区单位 offer_grass / 家乡基地 base_home / 基层叙事 chose_grassroots）。
  // 注：city_home 原由旧 city_choice 置位，写实重构后"回老家"统一由签约县城/社区单位(offer_grass)或
  // 规培选家乡基地(base_home)承载，新管线独占 region flag，故此处不再单列 city_home。
  else if (flags.has('offer_grass') || flags.has('base_home') || flags.has('chose_grassroots')) {
    ending = stats.relations >= 60 ? ENDINGS_BY_ID['grassroots_hero'] : ENDINGS_BY_ID['community_doctor'];
  }

  // 5. 丧亲重创：家人尽失且心理创伤未愈
  else if (flags.has('kin_all_gone') && stats.sanity < 35) ending = ENDINGS_BY_ID['burnout_early'];

  // 6. 早期职业倦怠（未崩但濒临）
  else if (age < 35 && (stats.sanity < 30 || (state.spirit?.meaning ?? 50) < 20)) ending = ENDINGS_BY_ID['burnout_early'];

  // 7. 深陷负债（真实经济后果：现金+资产 长期为负才算真破产）
  else if (money + (state.assets ?? 0) < -30000) ending = ENDINGS_BY_ID['exhausted_attending'];

  // 8. 稳定晋升路（成家者门槛略低，体现家庭支撑这一真实变量）
  // 正高已评上：直接进主任医师结局—— exhausted_attending 的"主治编外"叙事与正高矛盾。
  // 位置在 lucky_fraud(0.5) 之后：造假者即便评上正高，仍先被"侥幸"截住。
  else if (flags.has('passed_zhenggao')) ending = ENDINGS_BY_ID['chief_at_45'];
  else if (flags.has('passed_fugao') || flags.has('passed_zhuzhi')) {
    const repThreshold = married ? 35 : 50;
    ending = stats.reputation > repThreshold ? ENDINGS_BY_ID['stable_at_45'] : ENDINGS_BY_ID['exhausted_attending'];
  }

  // 默认：精疲力竭的主治
  else ending = ENDINGS_BY_ID['exhausted_attending'];

  // 动态化叙事年龄：结局 title/subtitle/desc 里的固定年龄（"45岁的稳定"等）按玩家真实年龄改写，
  // 与 EndingScene 左侧真实年龄（state.stats.age，38 岁收尾）保持一致，消除"左 38 右 45"矛盾。
  if (!ending) ending = ENDINGS_BY_ID['exhausted_attending'];
  const withRealAge = (t: string) => t.replace(/\d+岁/g, `${age}岁`);
  return {
    ...ending,
    title: withRealAge(ending.title),
    subtitle: withRealAge(ending.subtitle),
    desc: withRealAge(ending.desc),
    stats: { ...ending.stats, finalAge: age, totalYears: age - 18 },
  };
}
