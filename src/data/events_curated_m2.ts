// M2 手写叙事核心事件池
// 与 eventGen.ts 的程序化"填充量"互补：这里的事件承载真实叙事重量，
// 全部基于网络调研（规培待遇 / 考研规培 / 医生过劳猝死 / 医疗纠纷伤医 / 招聘编制），
// 并大量使用 nextEventId 分支链 + requireFlag/excludeFlag/requireStat 逻辑门。
// 真实人物机构已做谐音脱敏（协哈/华溪/旺填朝/张昱/余鹰/刘晋/南柠/绍医生/陈哲/肖大兵…）。

import type { GameEvent } from './events';

export const CURATED_M2_EVENTS: GameEvent[] = [
  // ============================================================
  // 本科 undergrad —— 学医起点、考研规培选择
  // ============================================================
  {
    id: 'm2_ug_admission', stage: 'undergrad', title: '录取通知书', once: true, weight: 100,
    body: '你被临床医学专业录取。录取书烫金大字下印着一行小字："健康所系，性命相托。"',
    category: 'personal',
    choices: [
      { text: '拍照发朋友圈', delta: { relations: 8, sanity: 3 }, consequence: '评论区一片"未来x医生"。' },
      { text: '默默收好', delta: { sanity: 2 }, flagSet: 'ug_quiet', consequence: '你对自己说：路还长。' },
    ],
  },
  {
    id: 'm2_ug_five_plus_three', stage: 'undergrad', title: '"5+3"与四证合一', minTurn: 2, maxTurn: 8, once: true, weight: 80,
    body: '学长说：现在流行"5+3"一体化，毕业拿四证（毕业证、学位证、执医证、规培证）。也有人走"5年本科+考研"老路。',
    category: 'study',
    choices: [
      { text: '冲专硕（四证合一）', delta: { knowledge: 4, stamina: -3 }, flagSet: 'ug_zhuanbo', nextEventId: 'm2_ug_zhuanbo_path', consequence: '你锁定了专硕赛道。' },
      { text: '考虑学硕（搞科研）', delta: { knowledge: 6, money: -200 }, flagSet: 'ug_xueshuo', nextEventId: 'm2_ug_xueshuo_path', consequence: '你更想进实验室。' },
      { text: '还不确定', delta: { sanity: -2 }, consequence: '你把招生简章关了。' },
    ],
  },
  {
    id: 'm2_ug_zhuanbo_path', stage: 'undergrad', title: '专硕的卷', requireFlag: 'ug_zhuanbo', once: true, weight: 60,
    body: '专硕竞争白热化。报名人数年年新高，分数线像坐了火箭。室友已经开始背考研词汇。',
    category: 'study',
    choices: [
      { text: '加入考研大军', delta: { knowledge: 5, stamina: -6, sanity: -3 }, flagSet: 'ug_kaoyan', nextEventId: 'm2_ug_kaoyan_exam', consequence: '你占好了图书馆的座位。' },
      { text: '保研拼绩点', delta: { knowledge: 3, relations: 2, stamina: -4 }, consequence: '你把每一门课都当final来刷。' },
    ],
  },
  {
    id: 'm2_ug_xueshuo_path', stage: 'undergrad', title: '学硕的自命题', requireFlag: 'ug_xueshuo', once: true, weight: 60,
    body: '学硕多考院校自命题（如699）。上岸后科研压力大，但规培要另行补。有人在贴吧写："学硕规培证是道坎。"',
    category: 'study',
    choices: [
      { text: '泡实验室攒经历', delta: { knowledge: 6, papers: 1, stamina: -5 }, flagSet: 'ug_research', consequence: '你的名字第一次出现在组会PPT上。' },
      { text: '两手准备也考研', delta: { knowledge: 4, stamina: -8, sanity: -4 }, flagSet: 'ug_kaoyan', nextEventId: 'm2_ug_kaoyan_exam', consequence: '你把自己掰成两半。' },
    ],
  },
  {
    id: 'm2_ug_kaoyan_exam', stage: 'undergrad', title: '考研考场', requireFlag: 'ug_kaoyan', minTurn: 6, maxTurn: 14, once: true, weight: 70,
    body: '考研这天，考场外全是穿得厚厚的医学生。最后一门专业课，你手心出汗。',
    category: 'study',
    choices: [
      { text: '稳住发挥', delta: { knowledge: 4, sanity: -2 }, flagSet: 'ug_kaoyan_done', nextEventId: 'm2_ug_kaoyan_result', consequence: '交卷时你长舒一口气。' },
      { text: '有几题卡壳', delta: { knowledge: 1, sanity: -6 }, flagSet: 'ug_kaoyan_done', nextEventId: 'm2_ug_kaoyan_result', consequence: '你怕是悬了。' },
    ],
  },
  {
    id: 'm2_ug_kaoyan_result', stage: 'undergrad', title: '出分了', requireFlag: 'ug_kaoyan_done', once: true, weight: 60,
    body: '国家线公布。你对着成绩单，分数在复试线边缘反复横跳。',
    category: 'career',
    choices: [
      { text: '压线进复试，拼命准备', delta: { knowledge: 5, stamina: -8, sanity: -3 }, flagSet: 'ug_kaoyan_pass', consequence: '你把自我介绍背到梦话都在说。' },
      { text: '没过线，考虑二战/规培', delta: { sanity: -6, reputation: -2 }, flagSet: 'ug_kaoyan_fail', nextEventId: 'm2_ug_plan_b', consequence: '你在出租屋犹豫了一整夜。' },
    ],
  },
  {
    id: 'm2_ug_plan_b', stage: 'undergrad', title: 'Plan B', requireFlag: 'ug_kaoyan_fail', once: true, weight: 50,
    body: '"规培合格当年按应届同等对待"——你看到这条政策。先规培再考，也许是条路。',
    category: 'career',
    choices: [
      { text: '先去规培攒经验', delta: { knowledge: 3, money: -500, stamina: -4 }, flagSet: 'go_guipei', consequence: '你报了家门口医院的规培。' },
      { text: '脱产再战一年', delta: { money: -6000, sanity: -8 }, flagSet: 'ug_chongzhan', consequence: '你退掉租房，搬回学校附近。' },
    ],
  },
  {
    id: 'm2_ug_clinical_early', stage: 'undergrad', title: '早临床接触', minTurn: 3, weight: 55,
    body: '你第一次跟着带教进病房。一位老人拉着你的手说："大夫，我这条腿……"你一时不知怎么接。',
    category: 'clinical',
    choices: [
      { text: '认真听带教怎么沟通', delta: { knowledge: 3, relations: 3, reputation: 1 }, consequence: '你记下了"先共情，再解释"。' },
      { text: '低头记笔记', delta: { knowledge: 4, sanity: -1 }, consequence: '你记了满满三页。' },
    ],
  },
  {
    id: 'm2_ug_burnout', stage: 'undergrad', title: '期末崩溃边缘', requireStat: { sanity: [0, 25] }, once: true, weight: 40,
    body: '连续两周只睡四小时。你盯着解剖图，忽然觉得那些名字在旋转。',
    category: 'mental',
    choices: [
      { text: '给自己放半天假', delta: { sanity: 10, stamina: -2, knowledge: -2 }, consequence: '你去操场走了一圈，天居然是蓝的。' },
      { text: '再撑一下就考完了', delta: { sanity: -8, stamina: -6 }, nextEventId: 'm2_ug_breakdown', consequence: '你灌了杯咖啡继续。' },
    ],
  },
  {
    id: 'm2_ug_breakdown', stage: 'undergrad', title: '在自习室哭了', requireStat: { sanity: [0, 20] }, once: true, weight: 30,
    body: '你趴在桌上，肩膀一抽一抽的。隔壁桌递来一张纸巾，什么也没说。',
    category: 'mental',
    choices: [
      { text: '"谢谢，我没事"', delta: { sanity: 6, relations: 1 }, consequence: '你吸了吸鼻子，把书合上。' },
      { text: '收拾东西回寝室', delta: { sanity: 4, knowledge: -3 }, consequence: '今晚你难得睡了个好觉。' },
    ],
  },

  // ============================================================
  // 实习 internship —— 临床初体验、医患、过劳苗头
  // ============================================================
  {
    id: 'm2_in_first_shift', stage: 'internship', title: '第一次单独值夜', once: true, weight: 90,
    body: '带教说："今晚我就在值班室，有事喊我。"凌晨一点，护士站电话响了。',
    category: 'clinical',
    choices: [
      { text: '先去床旁看病人', delta: { knowledge: 4, stamina: -6, sanity: -1 }, consequence: '你摸黑走到病房，心跳比病人还快。' },
      { text: '先翻病历再决定', delta: { knowledge: 3, stamina: -4 }, consequence: '你对着病历本迅速过了遍病情。' },
    ],
  },
  {
    id: 'm2_in_overwork_seen', stage: 'internship', title: '骨科师兄晕倒了', minTurn: 2, once: true, weight: 70,
    body: '群里转一条旧闻：某院骨科主治陈哲，35岁，连续手术后离世。师兄看完把手机扣在桌上："别发这个。"',
    category: 'news', newsTickerAfter: '【又一位年轻医生倒下：连续手术后不幸离世】',
    choices: [
      { text: '沉默，继续写病程', delta: { stamina: -3, sanity: -4 }, flagSet: 'overwork_aware', consequence: '你忽然觉得腰有点疼。' },
      { text: '转发并写下"请保重"', delta: { relations: 2, sanity: -2, reputation: 1 }, flagSet: 'overwork_aware', consequence: '有同行在下面接龙"保重"。' },
    ],
  },
  {
    id: 'm2_in_patient_conflict', stage: 'internship', title: '家属拍桌子', minTurn: 1, weight: 60,
    body: '一位家属认为"住院两天没见效"，猛拍床头柜。你刚要解释，带教把你拉到身后。',
    category: 'social',
    choices: [
      { text: '退后半步，让带教处理', delta: { relations: 1, sanity: -3 }, consequence: '带教三句话把火压下去了。' },
      { text: '上前理论', delta: { reputation: 2, relations: -3, sanity: -6 }, flagSet: 'conflict_prone', consequence: '你声音在抖，但没退。' },
    ],
  },
  {
    id: 'm2_in_romance', stage: 'internship', title: '同组的ta', minTurn: 3, weight: 45,
    body: '夜班里你们分到一个组。ta递来半块巧克力："补补血糖。"',
    category: 'social',
    choices: [
      { text: '接过来，聊了几句', delta: { relations: 6, sanity: 4, stamina: -1 }, flagSet: 'in_romance', consequence: '值班也没那么难熬了。' },
      { text: '专心干活', delta: { knowledge: 2, sanity: -1 }, consequence: '你把巧克力放进口袋，没拆。' },
    ],
  },
  {
    id: 'm2_in_romance_later', stage: 'internship', title: '要不要在一起', requireFlag: 'in_romance', minTurn: 5, once: true, weight: 40,
    body: '出科那天，ta问："以后不在一个组了，还联系吗？"',
    category: 'social',
    choices: [
      { text: '"当然"', delta: { relations: 8, sanity: 5 }, flagSet: 'in_couple', consequence: '你们交换了微信置顶。' },
      { text: '"看缘分吧"', delta: { sanity: -1, relations: -2 }, consequence: '你转身进了地铁。' },
    ],
  },

  // ============================================================
  // 规培 guipei —— 待遇 / 同岗同酬 / 退培 / 过劳（核心主题）
  // ============================================================
  {
    id: 'm2_gp_pay', stage: 'guipei', title: '规培第一份补助', once: true, weight: 100,
    body: '账户到账：¥3,200。南柠的一间单间月租¥3,500。新闻里说有代表提案"规培补助涨到8万/年"。',
    category: 'financial', newsTickerAfter: '【两会代表提案：建议规培生补助提升至8万元/年】',
    choices: [
      { text: '向家里张口补差额', delta: { money: 1500, sanity: -8, relations: -2 }, flagSet: 'gp_broke', consequence: '你28岁，还在问父母要钱。' },
      { text: '搬去更远的地方合租', delta: { money: 400, stamina: -10 }, flagSet: 'gp_commute', consequence: '每天通勤80分钟，站着都能睡。' },
      { text: '申请困难补助', delta: { money: 300, stamina: -6, reputation: -1 }, flagSet: 'gp_broke', consequence: '流程麻烦，材料交了三轮，但到账了。' },
    ],
  },
  {
    id: 'm2_gp_tonggang', stage: 'guipei', title: '"同岗同酬"传闻', requireFlag: 'gp_broke', minTurn: 2, once: true, weight: 70,
    body: '群里说：北华人民医院自去年8月起规培生与本院职工同岗同酬。你们医院却迟迟没动静。',
    category: 'news',
    choices: [
      { text: '跟教学部反映', delta: { reputation: 2, relations: -2, sanity: -2 }, flagSet: 'gp_asked', nextEventId: 'm2_gp_tonggang_reply', consequence: '你写了封措辞克制的邮件。' },
      { text: '只在群里吐槽', delta: { sanity: -1, relations: 1 }, flagSet: 'gp_vented', consequence: '大家接龙"+1"，然后没了下文。' },
    ],
  },
  {
    id: 'm2_gp_tonggang_reply', stage: 'guipei', title: '教学部的回复', requireFlag: 'gp_asked', once: true, weight: 50,
    body: '回复很官方："我院正研究相关政策，请以正式通知为准。"落款是一枚红章。',
    category: 'system',
    choices: [
      { text: '"知道了，谢谢"', delta: { sanity: -2, reputation: 1 }, flagSet: 'gp_tonggang_no', consequence: '你把邮件归档。' },
      { text: '继续等，但不再抱期望', delta: { sanity: 1 }, flagSet: 'gp_tonggang_no', consequence: '你学会了"以正式通知为准"的潜台词。' },
    ],
  },
  {
    id: 'm2_gp_quit_tempt', stage: 'guipei', title: '想退培', requireFlag: 'gp_broke', minTurn: 3, weight: 60,
    body: '同期有人退培去做了医药代表，月薪翻了三倍。你看着自己的排班表：连续7天夜班。',
    category: 'mental',
    choices: [
      { text: '认真考虑退培', delta: { sanity: -3 }, flagSet: 'gp_quit_think', nextEventId: 'm2_gp_quit_confirm', consequence: '你打开招聘软件，手指悬在"投递"上。' },
      { text: '"再忍忍，规培证要紧"', delta: { sanity: -2, stamina: -3 }, flagSet: 'gp_stay', consequence: '你想起"规培证是硬门槛"的说法。' },
    ],
  },
  {
    id: 'm2_gp_quit_confirm', stage: 'guipei', title: '退，还是不退', requireFlag: 'gp_quit_think', once: true, weight: 50,
    body: '退培意味着此前时间"归零"，且部分省份要求退赔补助。留下则还要熬两年。',
    category: 'career',
    newsTickerAfter: '【规培生退培现象引关注：多地试点弹性退出机制】',
    choices: [
      { text: '真的退了', delta: { money: 1500, reputation: -5, sanity: 6, knowledge: -4 }, flagSet: 'left_med', nextEventId: 'm2_gp_left', consequence: '你交了退培申请，长出一口气。' },
      { text: '咬牙留下', delta: { sanity: -4, stamina: -4 }, flagSet: 'gp_stay', nextEventId: 'm2_gp_stay', consequence: '你把招聘软件删了。' },
    ],
  },
  {
    id: 'm2_gp_left', stage: 'guipei', title: '脱下白大褂', requireFlag: 'left_med', once: true, weight: 30,
    body: '你最后一次刷工牌进医院，把白大褂叠好放在更衣柜。外面的世界很大，也很陌生。',
    category: 'personal',
    choices: [
      { text: '"也许这样也行"', delta: { sanity: 8, money: 2000 }, consequence: '你在医药公司笔试里写了"懂临床语言"。' },
      { text: '"我后悔了吗"', delta: { sanity: -4 }, consequence: '你没敢细想。' },
    ],
  },
  {
    id: 'm2_gp_stay', stage: 'guipei', title: '留下的日子', requireFlag: 'gp_stay', minTurn: 4, once: true, weight: 50,
    body: '你学着在夜班间隙啃面包、在交班前补觉。带教说："规培就是把自己磨圆。"',
    category: 'clinical',
    choices: [
      { text: '把每个病人当老师', delta: { knowledge: 6, reputation: 2, stamina: -6 }, flagSet: 'gp_grew', consequence: '你的病程记录被当范本念过一次。' },
      { text: '机械地完成指标', delta: { knowledge: 2, stamina: -4, sanity: -3 }, consequence: '你在出科评价里拿了"合格"。' },
    ],
  },
  {
    id: 'm2_gp_collapse_news', stage: 'guipei', title: '规培生自杀事件', minTurn: 3, once: true, weight: 65,
    body: '业内流传：短短时间多地发生规培生轻生。专家刘晋公开呼吁"关注规培生心理健康"。',
    category: 'news', newsTickerAfter: '【专家呼吁：关注规培生心理健康与劳动强度】',
    choices: [
      { text: '默默划走', delta: { sanity: -5, stamina: -2 }, flagSet: 'gp_suicide_seen', consequence: '你关掉页面，盯着天花板。' },
      { text: '转发并附"需要帮助可以说"', delta: { relations: 3, reputation: 2, sanity: -1 }, flagSet: 'gp_suicide_seen', consequence: '有匿名的同行私信说了谢谢。' },
    ],
  },
  {
    id: 'm2_gp_26h', stage: 'guipei', title: '连续26小时', requireFlag: 'gp_stay', minTurn: 5, weight: 55,
    body: '一台急诊手术接一台。你记得有人说过"连续26小时后脑出血"的科主任——那是别人，不会是你。',
    category: 'clinical',
    choices: [
      { text: '硬撑到交班', delta: { stamina: -14, sanity: -6, knowledge: 4 }, nextEventId: 'm2_gp_after_26h', consequence: '你靠墙站了一会儿，眼前发黑。' },
      { text: '申请换休半小时', delta: { stamina: -6, sanity: 1, reputation: -1 }, consequence: '你蹲在更衣室闭了会儿眼。' },
    ],
  },
  {
    id: 'm2_gp_after_26h', stage: 'guipei', title: '交班后', requireFlag: 'gp_stay', once: true, weight: 35,
    body: '你走出医院，天已经亮了。手机弹出一条：体检报告提示血压偏高。',
    category: 'mental',
    choices: [
      { text: '约个号自己看看', delta: { sanity: 2, money: -300, stamina: -2 }, flagSet: 'gp_health_aware', consequence: '你第一次以病人身份挂号。' },
      { text: '"年轻，没事"', delta: { sanity: -4, stamina: 0 }, flagSet: 'gp_ignore_health', consequence: '你把通知划掉了。' },
    ],
  },
  {
    id: 'm2_gp_cert', stage: 'guipei', title: '规培证到手', requireFlag: 'gp_grew', minTurn: 8, once: true, weight: 60,
    body: '结业考核通过。红本本的"住院医师规范化培训合格证书"压在抽屉里。',
    category: 'career', newsTickerAfter: '【本年规培结业考核通过率公布】',
    choices: [
      { text: '拍照给家人', delta: { relations: 8, sanity: 6 }, flagSet: 'has_gp_cert', consequence: '父亲发了个竖大拇指的表情。' },
      { text: '默默收好', delta: { sanity: 3 }, flagSet: 'has_gp_cert', consequence: '你离"独立"近了一步。' },
    ],
  },

  // ============================================================
  // 硕博 master_phd —— 课题 / 发论文 / 延毕 / 导师
  // ============================================================
  {
    id: 'm2_phd_topic', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '开题', once: true, weight: 90,
    body: '导师丢给你一个方向："这个靶点有意思，但没人做出来过。"你翻开文献，像进了迷宫。',
    category: 'study',
    choices: [
      { text: '硬啃，自己找路', delta: { knowledge: 5, papers: 0, stamina: -6, sanity: -2 }, flagSet: 'phd_loner', nextEventId: 'm2_phd_deadend', consequence: '你一个人熬了三个月。' },
      { text: '抱紧师兄大腿', delta: { knowledge: 4, relations: 4, stamina: -3 }, flagSet: 'phd_team', consequence: '师兄带你进了实验室的门道。' },
    ],
  },
  {
    id: 'm2_phd_deadend', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '走进死胡同', requireFlag: 'phd_loner', once: true, weight: 55,
    body: '反复实验都是阴性。你开始怀疑这个靶点根本不成立。同门已经发了第二篇。',
    category: 'study',
    choices: [
      { text: '换思路重来', delta: { knowledge: 3, stamina: -8, sanity: -4 }, nextEventId: 'm2_phd_pivot', consequence: '你把三个月归零，重新开始。' },
      { text: '硬着头皮美化数据', delta: { papers: 1, reputation: -4, sanity: -6, research: 3 }, flagSet: 'phd_fake', effect: { kind: 'fake', severity: 'minor' }, consequence: '你删掉了一行"不好看"的结果。' },
    ],
  },
  {
    id: 'm2_phd_pivot', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '转方向', requireFlag: 'phd_loner', once: true, weight: 40,
    body: '新方向意外顺了。导师在组会说："有时候退一步才是进。"',
    category: 'study',
    choices: [
      { text: '"谢谢老师"', delta: { knowledge: 5, reputation: 3, sanity: 4 }, flagSet: 'phd_ok', consequence: '你第一次在组会笑了。' },
      { text: '低头记笔记', delta: { knowledge: 4, stamina: -2 }, consequence: '你把这句话抄在笔记本扉页。' },
    ],
  },
  {
    id: 'm2_phd_paper', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '投稿被拒', minTurn: 3, weight: 60,
    body: '编辑回信：under review 三个月，结论是"reject, resubmit"。审稿人说样本量太小。',
    category: 'study',
    choices: [
      { text: '补实验再投', delta: { papers: 1, stamina: -10, knowledge: 3 }, flagSet: 'phd_persist', consequence: '你又养了三个月细胞。' },
      { text: '改投低分刊物', delta: { papers: 1, reputation: -2, stamina: -3 }, flagSet: 'phd_settle', consequence: '至少有了"见刊"。' },
    ],
  },
  {
    id: 'm2_phd_advisor', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '导师的"建议"', minTurn: 2, weight: 50,
    body: '导师希望你去他好友的医院"交流"，暗示对你毕业有利。你隐约觉得不对。',
    category: 'social',
    choices: [
      { text: '婉拒，靠自己', delta: { reputation: -2, relations: -3, sanity: 3 }, flagSet: 'phd_independent', consequence: '你顶住了那句"不听老人言"。' },
      { text: '去了，人情债+1', delta: { relations: 4, reputation: 2 }, flagSet: 'phd_network', consequence: '你欠了导师一个不大不小的人情。' },
    ],
  },
  {
    id: 'm2_phd_yanbi', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '延毕预警', requireStat: { papers: [0, 0] }, minTurn: 6, once: true, weight: 45,
    body: '同门都毕业了，你还在等那篇返修。教务提醒：如不在期限内送审，将延毕。',
    category: 'career',
    choices: [
      { text: '熬夜赶返修', delta: { papers: 1, stamina: -12, sanity: -5 }, flagSet: 'phd_graduated', nextEventId: 'm2_phd_graduate', consequence: '你把稿子发出去那刻天亮了。' },
      { text: '接受延毕', delta: { sanity: -3, money: -3000, reputation: -2 }, flagSet: 'phd_delay', consequence: '你给家里编了个"课题需要"的理由。' },
    ],
  },
  {
    id: 'm2_phd_graduate', stage: ['master', 'phd'], excludeFlag: 'track_clinical', title: '答辩通过', requireFlag: 'phd_graduated', once: true, weight: 40,
    body: '"同意授予学位。"你鞠躬时，听见自己的膝盖在响。',
    category: 'personal', newsTickerAfter: '【又一年毕业季：医学生戴上学位帽】',
    choices: [
      { text: '和导师合影', delta: { relations: 5, sanity: 6 }, consequence: '你们难得地笑了。' },
      { text: '"终于自由了"', delta: { sanity: 4, money: -1000 }, consequence: '你请同门吃了顿好的。' },
    ],
  },

  // ============================================================
  // 求职 jobhunt —— 合同制 / 编制 / 规培证硬要求
  // ============================================================
  {
    id: 'm2_jh_contract_news', stage: 'jobhunt', title: '博士也合同制', once: true, weight: 90,
    body: '网传北华医院招聘名单：连博士都是合同制，无编制。评论区炸了："读了这么久就这？"',
    category: 'news', newsTickerAfter: '【某顶级医院招聘：博士亦为合同制，引发热议】',
    choices: [
      { text: '重新审视"编制"执念', delta: { sanity: 2 }, flagSet: 'jh_rethink', nextEventId: 'm2_jh_bianzhi', consequence: '你默默把"必须编制"从清单划掉。' },
      { text: '"那我考公卫/疾控"', delta: { reputation: 1, sanity: 1 }, flagSet: 'jh_cdc', consequence: '你开始看事业单位招考。' },
    ],
  },
  {
    id: 'm2_jh_bianzhi', stage: 'jobhunt', title: '编制收紧', requireFlag: 'jh_rethink', once: true, weight: 60,
    body: '县医院、二甲也缩编。有帖子说"规培合格当年按应届同等对待"是少数窗口期。',
    category: 'career',
    choices: [
      { text: '抓住应届窗口投编内', delta: { reputation: 3, stamina: -6 }, flagSet: 'jh_chase_bianzhi', nextEventId: 'm2_jh_offer', consequence: '你专挑带"编"的岗位投。' },
      { text: '编制随缘，看平台', delta: { stamina: -3, sanity: 1 }, flagSet: 'jh_platform', nextEventId: 'm2_jh_offer', consequence: '你更在意能学到东西。' },
    ],
  },
  {
    id: 'm2_jh_offer', stage: 'jobhunt', title: '两个 offer', once: true, weight: 70,
    body: 'A：市三甲合同制，平台好但累；B：县医院带编，稳定但病例单一。',
    category: 'career',
    choices: [
      { text: '选A平台', delta: { reputation: 5, stamina: -3, sanity: -1 }, flagSet: 'took_hospital_a', nextEventId: 'm2_jh_sign', consequence: '你想：先学本事。' },
      { text: '选B编制', delta: { reputation: 3, money: 1500, sanity: 4 }, flagSet: 'took_hospital_b', nextEventId: 'm2_jh_sign', consequence: '你想：先安居乐业。' },
    ],
  },
  {
    id: 'm2_jh_sign', stage: 'jobhunt', title: '签三方', once: true, weight: 50,
    body: '笔尖落在纸上。你想起八年前的录取通知书，那行"健康所系，性命相托"。',
    category: 'personal',
    choices: [
      { text: '"我准备好了"', delta: { sanity: 5, relations: 2 }, flagSet: 'signed', consequence: '你拍了拍胸前的工牌位。' },
      { text: '"希望不后悔"', delta: { sanity: -2 }, consequence: '你还是签了字。' },
    ],
  },
  {
    id: 'm2_jh_licence', stage: 'jobhunt', title: '执医证与规培证', minTurn: 2, once: true, weight: 60, requireFlag: 'has_gp_cert',
    body: '"两证齐全方可独立值班"——有同行因缺规培证被卡在入职门外。你翻了翻自己的材料。',
    category: 'system',
    choices: [
      { text: '庆幸自己有规培证', delta: { sanity: 3, reputation: 2 }, consequence: '这红本本果然是硬门槛。' },
      { text: '提醒学弟学妹别断档', delta: { relations: 3, reputation: 1 }, consequence: '你在群里发了条长语音。' },
    ],
  },

  // ============================================================
  // 职业 career —— 伤医 / 纠纷 / 网暴 / 猝死 / 中年
  // ============================================================
  {
    id: 'm2_ca_daoyi', stage: 'career', title: '诊室里的冲突', once: false, weight: 70,
    body: '一位患者因等待过久，突然掀翻你的病历夹。保安赶来时，你已经站在墙角。',
    category: 'social',
    choices: [
      { text: '报警并留痕', delta: { reputation: 3, sanity: -4, relations: -1 }, flagSet: 'ca_daoyi', nextEventId: 'm2_ca_daoyi_after', consequence: '你拨通了警务室的电话。' },
      { text: '忍了，继续看病', delta: { sanity: -8, reputation: 1 }, flagSet: 'ca_endure', consequence: '你蹲下，一张张捡起病历。' },
    ],
  },
  {
    id: 'm2_ca_daoyi_after', stage: 'career', title: '之后的处理', requireFlag: 'ca_daoyi', once: true, weight: 50,
    body: '警方笔录、医院安保升级。但有同事说："以后这种病人，少管为妙。"',
    category: 'social',
    choices: [
      { text: '"该看的还是要看"', delta: { reputation: 4, sanity: -2 }, flagSet: 'ca_principled', consequence: '你没把那句话听进去。' },
      { text: '"懂了，保护自己"', delta: { sanity: 1, reputation: -1 }, flagSet: 'ca_guarded', consequence: '你学会了先看一眼对方的神色。' },
    ],
  },
  {
    id: 'm2_ca_wangbao', stage: 'career', title: '被网暴的同行', minTurn: 2, once: true, weight: 65,
    body: '豫东某市六院绍医生，因一例纠纷遭7个月网暴后坠亡。群里一片沉默，有人删了自己科普号的简介。',
    category: 'news', newsTickerAfter: '【又一起：医护遭长期网暴后不幸离世】',
    choices: [
      { text: '关掉自己的科普账号', delta: { reputation: -2, sanity: -5 }, flagSet: 'ca_silenced', consequence: '你怕了，把麦克风放下了。' },
      { text: '继续做科普，但更谨慎', delta: { reputation: 3, sanity: -2, relations: 1 }, flagSet: 'ca_speak', consequence: '你在每条视频下都加了"仅供参考"。' },
    ],
  },
  {
    id: 'm2_ca_malpractice', stage: 'career', title: '医法会数据', minTurn: 1, once: true, weight: 60,
    body: '医法会统计：医疗损害纠纷一年比一年多（去年3934件，今年5094件）。你算了一下，平均到每天……',
    category: 'news', newsTickerAfter: '【医疗损害纠纷数量同比继续上升】',
    choices: [
      { text: '把病历写得更厚', delta: { stamina: -4, reputation: 3 }, flagSet: 'ca_defensive', consequence: '你开始"防御性医疗"。' },
      { text: '"问心无愧就好"', delta: { sanity: -2, reputation: 1 }, flagSet: 'ca_trust', consequence: '你还是按自己学的来。' },
    ],
  },
  {
    id: 'm2_ca_collapse', stage: 'career', title: '同事倒下了', minTurn: 3, once: true, weight: 60,
    body: '中盛肿瘤防治中心一位90后肖大兵，连续夜班后猝然倒地，再没起来。你和他吃过同一家外卖。',
    category: 'news', newsTickerAfter: '【又一位青年医生猝死，业内呼吁减负】',
    choices: [
      { text: '给自己约个全面体检', delta: { sanity: 3, money: -800, stamina: -2 }, flagSet: 'ca_health', consequence: '你第一次认真看了自己的报告。' },
      { text: '"我还年轻"', delta: { sanity: -4 }, flagSet: 'ca_ignore', consequence: '你把体检卡塞进抽屉。' },
    ],
  },
  {
    id: 'm2_ca_midlife', stage: 'career', title: '三十五岁', requireStat: { age: [30, 100] }, minTurn: 5, once: true, weight: 50,
    body: '你35了。同学里有人转行、有人创业、有人还在主治熬。房贷、娃的学区、父母的体检，一起涌来。',
    category: 'personal',
    choices: [
      { text: '"再拼一把副高"', delta: { reputation: 4, stamina: -8, sanity: -3 }, flagSet: 'ca_fuhe_aim', nextEventId: 'm2_ca_fuhe', consequence: '你开始攒SCI和课题。' },
      { text: '"差不多就得了"', delta: { sanity: 4, money: -200 }, flagSet: 'ca_settle', consequence: '你把期望值调低了些。' },
    ],
  },
  {
    id: 'm2_ca_fuhe', stage: 'career', title: '副高答辩', requireFlag: 'ca_fuhe_aim', once: true, weight: 40,
    body: '答辩现场，专家翻着你的材料："临床量够，但科研分量略轻。"',
    category: 'career',
    choices: [
      { text: '诚恳接受，列改进', delta: { reputation: 4, sanity: 2 }, flagSet: 'ca_fuhe_ok', consequence: '你拿到了那个职称。' },
      { text: '据理力争', delta: { reputation: 1, relations: -3, sanity: -4 }, consequence: '场面有点僵，但你说出了想说的。' },
    ],
  },
  {
    id: 'm2_ca_burnout', stage: 'career', title: '职业倦怠', requireStat: { sanity: [0, 25] }, once: true, weight: 45,
    excludeFlag: 'burnout_seen',
    body: '你对着电脑里的排班表，忽然想：如果当年没填医学志愿，现在会在做什么？',
    category: 'mental',
    choices: [
      { text: '请了年假，回了趟家', delta: { sanity: 12, money: -1500, relations: 5 }, flagSet: 'ca_rested', consequence: '母亲做了你最爱吃的菜。' },
      { text: '把想法压下去', delta: { sanity: -8, stamina: -4 }, nextEventId: 'm2_ca_crisis', consequence: '你关掉文档，去交班。' },
    ],
  },
  {
    id: 'm2_ca_crisis', stage: 'career', title: '撑不住的那天', requireStat: { sanity: [0, 20] }, once: true, weight: 30,
    body: '你坐在车里，迟迟没有上楼。引擎没熄火，你只是不想动。',
    category: 'mental',
    choices: [
      { text: '拨通了心理热线', delta: { sanity: 10, relations: 1 }, flagSet: 'ca_got_help', consequence: '电话那头说："你愿意打来，已经很勇敢。"' },
      { text: '发动车，上楼', delta: { sanity: -4 }, consequence: '你把情绪锁进了更衣柜。' },
    ],
  },
];
