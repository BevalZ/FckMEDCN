// 人物模板库（NPC / 患者）：组合式确定性生成 ≥100,000 个模板，分门别类。
// 用途：随机事件抽取一位"有血有肉"的人物，按身份/性格/经济定制交互选项。
// 确定性：createCharacter(i) 对同一 i 永远返回同一模板（保证可复现/测试稳定）。
// 随机性：drawRandomCharacter() 随机抽 i（可带身份类别权重），进入游戏的"谁会出现"是随机的。

export interface CharacterTemplate {
  id: number;
  name: string;
  gender: 'male' | 'female';
  age: number;
  identity: string;      // 身份类别（分门别类）
  identityDesc: string;  // 一句画像
  personality: string;   // 性格
  speech: string;        // 说话/沟通方式（用于事件正文与交互）
  economic: string;      // 经济与医保
  /** 交互倾向：用于生成选项的标签，如 安抚 / 解释 / 大声 / 谨慎 / 拒绝 / 感激 */
  traits: string[];
}

// —— 确定性取数（与 eventGen 一致）——
function pick<T>(arr: readonly T[], i: number, salt: number): T {
  return arr[((i + salt) % arr.length + arr.length) % arr.length];
}
function hash(i: number, salt: number): number {
  return (Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0;
}

// ============ 名字池 ============
const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘斜厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公'.split('');
const GIVEN_MALE = '伟刚勇毅俊峰强军平保东文辉力明永健世广志义兴良海山仁波宁贵福生龙元全国胜学祥才发武新利清飞彬富顺信子杰涛昌成康星光天达安岩中茂进林有坚和彪博诚先敬震振壮会思群豪心邦承乐绍功松善厚庆磊民友裕河哲江超浩亮政谦亨奇固之轮翰朗伯宏言若鸣朋斌梁栋维启克伦翔旭鹏泽晨辰士以建家致树炎德行时泰盛雄琛钧冠策腾楠榕风航弘'.split('');
const GIVEN_FEMALE = '秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊兰凤洁梅琳素云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳嘉琼勤珍贞莉桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希欣飘育滢馥筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔枝思丽'.split('');

// ============ 身份池（分门别类：患者画像 + 社会角色）============
const IDENTITIES: Array<{ name: string; desc: string; ageLo: number; ageHi: number }> = [
  { name: '退休教师', desc: '一辈子站讲台，说话慢条斯理，把医生当学生考', ageLo: 60, ageHi: 80 },
  { name: '老农民', desc: '皮肤黢黑，满手老茧，看病能省则省', ageLo: 50, ageHi: 75 },
  { name: '外卖骑手', desc: '风里来雨里去，急着接单，嫌看病耽误赚钱', ageLo: 20, ageHi: 40 },
  { name: '农民工', desc: '建筑工地摔伤/尘肺，攒着钱不舍得花，能拖就拖', ageLo: 25, ageHi: 55 },
  { name: '独居老人', desc: '没人陪，耳朵不好，看病像办大事', ageLo: 65, ageHi: 90 },
  { name: '年轻白领', desc: '久坐腰痛/失眠，下班才来，门诊将关门', ageLo: 22, ageHi: 38 },
  { name: '公务员', desc: '医保全，说话客气，讲究"按规矩来"', ageLo: 30, ageHi: 55 },
  { name: '产后妈妈', desc: '刚出月子，孩子小名挂嘴边，问东问西', ageLo: 22, ageHi: 40 },
  { name: '高中生', desc: '被家长带来，低头玩手机，问一句答一句', ageLo: 15, ageHi: 19 },
  { name: '带孙奶奶', desc: '一手牵孙辈，一手提菜，把"乖"挂嘴边', ageLo: 55, ageHi: 75 },
  { name: '个体户', desc: '自己开店，上午不开门亏一天，催着快看', ageLo: 30, ageHi: 55 },
  { name: '程序员', desc: '熬夜打游戏，黑眼圈，腱鞘炎/颈椎病常客', ageLo: 22, ageHi: 38 },
  { name: '健身教练', desc: '浑身肌肉，觉得自己身体好，查出来有问题不信', ageLo: 22, ageHi: 40 },
  { name: '出租车司机', desc: '久坐憋尿，肾结石/前列腺常客，说话急', ageLo: 30, ageHi: 55 },
  { name: '快递员', desc: '同城跑单，膝盖/腰磨损，怕请假扣钱', ageLo: 20, ageHi: 45 },
  { name: '保洁阿姨', desc: '弯腰擦地一整天，腰肌劳损，普通话带乡音', ageLo: 40, ageHi: 60 },
  { name: '军人/警察', desc: '作风硬朗，能忍则忍，倒下才来', ageLo: 20, ageHi: 45 },
  { name: '企业家', desc: '行程满，要"最快方案"，最贵的检查也要', ageLo: 35, ageHi: 60 },
  { name: '网红主播', desc: '对着镜头营业，怕破相/怕人设塌', ageLo: 18, ageHi: 35 },
  { name: '教师', desc: '嗓子常年哑，声带小结，板书职业病', ageLo: 25, ageHi: 55 },
  { name: '护士（同行）', desc: '同行相见，一句"我懂"，反而好沟通', ageLo: 22, ageHi: 45 },
  { name: '会计', desc: '伏案报表，颈椎病，说话一板一眼', ageLo: 28, ageHi: 55 },
  { name: '律师', desc: '职业病：录音，字斟句酌，比医生还较真', ageLo: 28, ageHi: 55 },
  { name: '记者', desc: '职业病：追问细节，职业病：赶稿熬夜', ageLo: 25, ageHi: 45 },
  { name: '厨师', desc: '油烟熏肺、烫伤多，嗓门大', ageLo: 25, ageHi: 55 },
  { name: '理发师', desc: '站一天，静脉曲张，健谈话痨', ageLo: 22, ageHi: 45 },
  { name: '海归', desc: '中英夹杂，信国外的治疗，怀疑国内方案', ageLo: 25, ageHi: 45 },
  { name: '侨胞', desc: '多年未归，家属陪同一堆，处处谨慎', ageLo: 40, ageHi: 75 },
  { name: '外籍教师', desc: '带翻译/比划，沟通靠耐心', ageLo: 25, ageHi: 55 },
  { name: '聋哑人', desc: '打手语/写字条，需要纸笔沟通', ageLo: 18, ageHi: 60 },
  { name: '视障人士', desc: '导盲杖/家人搀扶，需要口头引导', ageLo: 30, ageHi: 70 },
  { name: '残障人士', desc: '轮椅/拐杖，行动不便，怕麻烦别人', ageLo: 25, ageHi: 60 },
  { name: '流浪拾荒者', desc: '衣服脏乱，警惕，说话含糊，无人陪', ageLo: 30, ageHi: 65 },
  { name: '村医同行', desc: '乡里乡村医生，来市里进修/看病，一脸不服', ageLo: 35, ageHi: 60 },
  { name: '老病号', desc: '慢性病十年，久病成医，常质疑医生', ageLo: 55, ageHi: 80 },
  { name: '二胎妈妈', desc: '带俩娃，一脸疲惫，怕孩子生病连累全家的节奏', ageLo: 28, ageHi: 42 },
  { name: '厌学少年', desc: '被父母带来查"注意力不集中"，全程不说话', ageLo: 12, ageHi: 18 },
  { name: '更年期女士', desc: '潮热失眠烦躁，脾气一点就着', ageLo: 45, ageHi: 60 },
  { name: '久坐程序员', desc: '腰突/痔疮/秃头焦虑，自嘲多，真怕检查', ageLo: 24, ageHi: 38 },
  { name: '痛风青年', desc: '火锅啤酒的债，脚趾痛得骂娘，下次还吃', ageLo: 25, ageHi: 45 },
  { name: '糖尿病大爷', desc: '管不住嘴，血糖常年高，还爱喝两盅', ageLo: 55, ageHi: 75 },
  { name: '哮喘儿童', desc: '被妈妈抱着，喘得厉害，眼神惊恐', ageLo: 3, ageHi: 12 },
  { name: '独居大爷', desc: '老伴走了，一个人，怕住院没人管', ageLo: 65, ageHi: 85 },
  { name: '留守老人', desc: '儿女在外，自己扛着，能拖就拖，怕花钱', ageLo: 60, ageHi: 80 },
  { name: '夜班工人', desc: '三班倒，生物钟乱，内分泌/胃病常客', ageLo: 25, ageHi: 50 },
  { name: '大货车司机', desc: '长途久坐，前列腺/腰病，着急赶路', ageLo: 30, ageHi: 55 },
  { name: '导游', desc: '旺季连轴转，咽喉炎/胃病，说话带口音还爱笑', ageLo: 25, ageHi: 45 },
  { name: '主播/网红小助理', desc: '熬夜跟播，脸色差，怕被辞退不敢请假', ageLo: 20, ageHi: 32 },
  { name: '瑜伽/舞蹈老师', desc: '运动损伤多，讲得头头是道，有点自以为是', ageLo: 25, ageHi: 45 },
  { name: '退伍军人', desc: '腰腿旧伤，硬汉，能扛就扛，感谢说得多', ageLo: 35, ageHi: 60 },
];

// ============ 性格/沟通方式池（决定交互选项）============
const PERSONALITIES: Array<{ name: string; speech: string; traits: string[] }> = [
  { name: '焦躁易怒', speech: '一进门就拍桌子："怎么还要等？！"', traits: ['安抚情绪', '摆事实讲流程', '先稳住再处理'] },
  { name: '多疑戒备', speech: '眼睛盯着你，问"你们是不是就想让我多做检查？"', traits: ['多解释原理', '给选择', '留证据（病历讲清楚）'] },
  { name: '沉默寡言', speech: '问三句答一句，眉头皱着', traits: ['耐心引导', '降低语速', '书面沟通'] },
  { name: '极度配合', speech: '你说什么他都点头："大夫你说了算。"', traits: ['尊重知情', '说明风险', '别让盲目信任害了他'] },
  { name: '迷信偏方', speech: '"我喝了大半年偏方，不管用才来找你们。"', traits: ['纠正误区', '讲科学依据', '留退路'] },
  { name: '口若悬河', speech: '从孙子讲到邻居，绕半天没说到正题', traits: ['引导聚焦', '打断要礼貌', '抓主诉'] },
  { name: '悲观绝望', speech: '"我这病还有救吗？"眼里没光', traits: ['给希望要实', '不打包票', '心理支持'] },
  { name: '乐观健忘', speech: '哈哈一笑，医嘱转头就忘', traits: ['重点重复', '写下来', '让家属听一遍'] },
  { name: '耳背老人', speech: '你说三遍他才听清，家属在旁一脸无奈', traits: ['大声慢说', '书面写要点', '家属转述'] },
  { name: '打官腔', speech: '上来就问"你们院长是谁"', traits: ['不卑不亢', '按流程', '不激化'] },
  { name: '暗示红包', speech: '掏出一个信封往你白大褂口袋里塞', traits: ['明确拒绝', '讲底线', '态度要软话要硬'] },
  { name: '感激溢于言表', speech: '反复说"谢谢大夫"，要给你送锦旗', traits: ['受之坦然', '叮嘱别破费', '关系拉近'] },
  { name: '警惕录音', speech: '掏出手机对着你录', traits: ['坦然面对', '语速放慢', '说得更谨慎'] },
  { name: '醉酒胡言', speech: '一身酒气，话说不利索，还可能动手动脚', traits: ['保持距离', '叫保安/家属', '酒精中毒处理'] },
  { name: '怕花钱', speech: '第一句问"这个检查多少钱？"', traits: ['给经济方案', '讲必要性', '不诱导消费'] },
  { name: '拖字诀', speech: '"我再观察观察，先给我开点药。"', traits: ['讲风险', '约定随访', '必要时坚持检查'] },
  { name: '焦虑反复确认', speech: '同一个问题问五遍，走了又回来', traits: ['耐心重复', '写书面', '给固定联系方式'] },
  { name: '奉承套近乎', speech: '喊你"兄弟/姐姐"，想套近乎插队', traits: ['客气但守规矩', '一视同仁', '不落口实'] },
  { name: '安静听讲型', speech: '全程认真听，点头，问的都是关键问题', traits: ['讲透方案', '给数据', '尊重他的判断'] },
  { name: '家属强势型', speech: '患者本人没开口，家属先抢话："治不好我就告你们！"', traits: ['面对家属', '稳住情绪', '讲清责任边界'] },
  { name: '方言难懂', speech: '一口浓重方言，你说的话他半懂不懂', traits: ['放慢', '让家属翻译', '书面确认'] },
  { name: '慢性病抵触', speech: '"我血压一直高，也没事，不用老吃药。"', traits: ['讲并发症', '用案例', '定期复查约定'] },
  { name: '中年危机型', speech: '事业家庭两头压，查出一身指标高，当场叹气', traits: ['安抚', '给可执行方案', '关注心理'] },
  { name: '心大随缘型', speech: '"小毛病，死不了，随便开点药。"', traits: ['坚持必要检查', '讲后果', '让他当回事'] },
];

// ============ 经济与医保池 ============
const ECONOMIC: Array<{ name: string; traits: string[] }> = [
  { name: '城镇职工医保', traits: ['医保覆盖', '可开贵方案'] },
  { name: '城乡居民医保', traits: ['报销比例低', '考虑价格'] },
  { name: '自费', traits: ['全自费', '最省方案优先'] },
  { name: '商保加持', traits: ['有商业保险', '可接受更多检查'] },
  { name: '经济困难', traits: ['四处借钱的难', '先保命再谈钱'] },
  { name: '公费医疗', traits: ['公费报销', '方案宽松'] },
  { name: '工伤认定', traits: ['工伤待认定', '流程多'] },
  { name: '异地医保', traits: ['异地报销麻烦', '先自费后报销'] },
  { name: '无医保流动人口', traits: ['没医保', '怕住院'] },
  { name: '干部保健', traits: ['待遇好', '要求高'] },
];

export const IDENTITY_COUNT = IDENTITIES.length;
export const PERSONALITY_COUNT = PERSONALITIES.length;
export const ECONOMIC_COUNT = ECONOMIC.length;
export const NAME_SPACE = SURNAMES.length * (GIVEN_MALE.length + GIVEN_FEMALE.length);
export const TOTAL_SPACE = NAME_SPACE * IDENTITY_COUNT * PERSONALITY_COUNT * ECONOMIC_COUNT;

/** 确定性生成第 i 个人物模板（i ∈ [0, TOTAL_SPACE)），TOTAL_SPACE 远超 10 万 */
export function createCharacter(i: number): CharacterTemplate {
  const g = hash(i, 101) % 2 === 0 ? 'male' : 'female';
  const surname = pick(SURNAMES, i, 1);
  const givenPool = g === 'male' ? GIVEN_MALE : GIVEN_FEMALE;
  const given = pick(givenPool, i, 7);
  const identity = IDENTITIES[hash(i, 11) % IDENTITIES.length];
  const personality = PERSONALITIES[hash(i, 23) % PERSONALITIES.length];
  const economic = ECONOMIC[hash(i, 37) % ECONOMIC.length];
  const age = identity.ageLo + (hash(i, 51) % (identity.ageHi - identity.ageLo + 1));
  return {
    id: i,
    name: `${surname}${given}`,
    gender: g,
    age,
    identity: identity.name,
    identityDesc: identity.desc,
    personality: personality.name,
    speech: personality.speech,
    economic: economic.name,
    traits: [...personality.traits, ...economic.traits],
  };
}

/** 随机抽取一个人物（可传身份类别过滤），"谁会出现"是随机的 */
export function drawRandomCharacter(identityName?: string): CharacterTemplate {
  if (identityName) {
    const idx = IDENTITIES.findIndex(x => x.name === identityName);
    if (idx >= 0) {
      const i = Math.floor(Math.random() * (TOTAL_SPACE / IDENTITIES.length)) * IDENTITIES.length + idx;
      return createCharacter(i);
    }
  }
  return createCharacter(Math.floor(Math.random() * TOTAL_SPACE));
}

/** 全部身份类别（供图鉴/选择界面分类展示） */
export function allIdentities(): string[] {
  return IDENTITIES.map(x => x.name);
}
