import { getState, patchState, setFlag, hasFlag } from './gameState';
import type { LifeStage } from './gameState';
import type { StatDelta } from './stats';

// NPC 与好感度系统（M3）。
//
// 两类 NPC：
//  - **本科同伴**（室友、带教、学长、辅导员）：只在可行走的 CampusScene 出现，
//    按季度轮换所在地点，走过去按 E 触发专属对话。
//  - **跨阶段导师**（周教授）：从硕士一路跟到职业阶段，在卡片场景下也参与事件门控。
//
// 好感度存进 flags 会很难看（要 aff_zhangning_3 这种），故单独放一个 Record 存进 GameState。
// 数值 0..100，>=70 为"信任"，<=25 为"疏远"，各自解锁不同的专属事件。

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  /** 出现在哪些阶段。本科同伴只在 undergrad，导师从 master 起 */
  stages: LifeStage[];
  /** 季度 → 所在地点 id（CampusScene 用）。长度不必等于总季度数，取模循环 */
  schedule?: string[];
  /** 头像/立牌配色 */
  color: number;
  hairColor: number;
}

export const NPCS: readonly NpcDef[] = [
  {
    id: 'roommate', name: '张宁', role: '室友',
    stages: ['undergrad'],
    schedule: ['dorm', 'canteen', 'dorm', 'library'],
    color: 0x5c8a5c, hairColor: 0x2a2a2a,
  },
  {
    id: 'senior', name: '陈师兄', role: '学长',
    stages: ['undergrad'],
    schedule: ['library', 'board', 'field', 'canteen'],
    color: 0x4a6a9a, hairColor: 0x1f1f1f,
  },
  {
    id: 'teacher', name: '李老师', role: '带教',
    stages: ['undergrad'],
    schedule: ['teaching', 'teaching', 'library', 'teaching'],
    color: 0xd8d8e0, hairColor: 0x3a3a3a,
  },
  {
    id: 'counselor', name: '王辅导员', role: '辅导员',
    stages: ['undergrad'],
    schedule: ['board', 'field', 'board', 'dorm'],
    color: 0x9a6a8a, hairColor: 0x2a2a2a,
  },
  // —— 实习/规培阶段 ——
  // schedule 里的地点 id 必须在该 NPC 所有 stages 的地图里都存在，否则 placeNpcs 会静默跳过。
  // hospitalMap 与 guipeiMap 的共有 id：er / canteen / office / nurse / callroom。
  {
    id: 'attending', name: '林主治', role: '带教主治',
    stages: ['internship'],                       // 对话文本写的是"实习生"，不跨到规培
    schedule: ['ward', 'or', 'ward', 'office'],
    color: 0xe0e4ea, hairColor: 0x2a2a2a,
  },
  {
    id: 'headnurse', name: '刘护士长', role: '护士长',
    stages: ['internship', 'guipei'],             // 故只用两图共有的地点 id
    schedule: ['nurse', 'canteen', 'nurse', 'er'],
    color: 0xbfa0c4, hairColor: 0x3a3230,
  },
  {
    id: 'fellow', name: '赵师姐', role: '高年资规培',
    stages: ['guipei'],
    schedule: ['callroom', 'lab', 'internal', 'canteen'],
    color: 0x7a9ab0, hairColor: 0x241f1f,
  },
  {
    id: 'advisor', name: '周教授', role: '导师',
    stages: ['master', 'phd', 'career'],
    color: 0xc0c0c8, hairColor: 0x707070,
  },
];

export const NPCS_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map(n => [n.id, n]));

const DEFAULT_AFFINITY = 40;
export const TRUST_AT = 70;
export const DISTANT_AT = 25;

export function getAffinity(id: string): number {
  return getState().affinity?.[id] ?? DEFAULT_AFFINITY;
}

export function changeAffinity(id: string, delta: number): number {
  const cur = getAffinity(id);
  const next = Math.max(0, Math.min(100, cur + delta));
  patchState({ affinity: { ...(getState().affinity ?? {}), [id]: next } });
  // 好感度跨过阈值时打 flag，供事件池门控（事件系统只认 flag）
  if (next >= TRUST_AT) setFlag(`trust_${id}`);
  if (next <= DISTANT_AT) setFlag(`distant_${id}`);
  return next;
}

export function isTrusted(id: string): boolean { return hasFlag(`trust_${id}`); }

/** 某季度该 NPC 在哪个地点（CampusScene 用）。无 schedule 则不出现在地图上。 */
export function npcSpotAt(npc: NpcDef, turn: number): string | null {
  if (!npc.schedule || npc.schedule.length === 0) return null;
  return npc.schedule[turn % npc.schedule.length];
}

/** 当前阶段应出现在地图上的 NPC */
export function npcsForStage(stage: LifeStage): NpcDef[] {
  return NPCS.filter(n => n.stages.includes(stage) && n.schedule);
}

// —— 对话池 ——
// 每个 NPC 按好感度档位给不同的话。选项影响好感度与属性。
export interface NpcTalk {
  text: string;
  choices: Array<{
    label: string;
    affinity: number;
    delta?: StatDelta;
    reply: string;
    flagSet?: string;
  }>;
}

const TALKS: Record<string, (aff: number, turn: number) => NpcTalk> = {
  roommate: (aff) => aff >= TRUST_AT ? {
    text: '张宁把泡面推过来一半："吃不吃？我妈寄的辣酱。"你们已经熟到不用客气了。',
    choices: [
      { label: '一起吃，聊到半夜', affinity: 5, delta: { sanity: 8, relations: 3, stamina: -3 }, reply: '你们聊了各自的家乡、想去的科室、还有谁又挂了科。' },
      { label: '谢了，我还得看书', affinity: -2, delta: { knowledge: 3, stamina: -4 }, reply: '他说"行，给你留着"。' },
    ],
  } : aff <= DISTANT_AT ? {
    text: '张宁戴着耳机打游戏，你进门时他没抬头。宿舍里安静得能听见键盘声。',
    choices: [
      { label: '主动开口打破僵局', affinity: 10, delta: { sanity: 5, relations: 3 }, reply: '他摘下耳机："……哦，你回来了。"气氛缓和了一点点。' },
      { label: '各干各的', affinity: -3, delta: { sanity: -4 }, reply: '你爬上床，戴上自己的耳机。' },
    ],
  } : {
    text: '张宁问你："这周的解剖实验报告，你写完了吗？借我参考参考。"',
    choices: [
      { label: '借他，还讲了一遍', affinity: 8, delta: { relations: 3, knowledge: 2, stamina: -3 }, reply: '讲的过程中你自己也理顺了。' },
      { label: '让他自己写', affinity: -5, delta: { knowledge: 2 }, reply: '他说"行吧"，转身出去了。' },
    ],
  },

  senior: (aff) => aff >= TRUST_AT ? {
    text: '陈师兄递给你一个 U 盘："历年真题、实验报告模板、还有我整理的考研资料，都在里面。"',
    choices: [
      { label: '收下，认真道谢', affinity: 5, delta: { knowledge: 6, relations: 4, research: 2 }, flagSet: 'got_senior_notes', reply: '他说："我当年要是有这个，能少走一年弯路。"' },
      { label: '想自己摸索', affinity: -3, delta: { knowledge: 2, sanity: 2 }, reply: '他笑："行，你比我有骨气。"' },
    ],
  } : {
    text: '陈师兄在图书馆占了两个位置："坐这儿吧，我给你讲讲大三要准备什么。"',
    choices: [
      { label: '认真听，记笔记', affinity: 10, delta: { knowledge: 4, relations: 3, stamina: -4 }, reply: '他讲了见习、技能考、还有什么时候该联系导师。' },
      { label: '随便应付两句', affinity: -5, delta: { sanity: 2 }, reply: '他看出来了，没再多说。' },
    ],
  },

  teacher: (aff) => aff >= TRUST_AT ? {
    text: '李老师叫住你："下学期我有个小课题，缺个本科生打下手。你愿意来吗？"',
    choices: [
      { label: '愿意', affinity: 5, delta: { research: 8, knowledge: 5, stamina: -10, reputation: 3 }, flagSet: 'ug_joined_lab', reply: '你成了实验室里唯一的本科生。洗瓶子、跑胶、也跟着读文献。' },
      { label: '课程太紧，先不了', affinity: -3, delta: { sanity: 4, knowledge: 2 }, reply: '他说"有兴趣随时来找我"。' },
    ],
  } : {
    text: '李老师在技能中心巡视，停在你旁边："这个结打得不对，我教你。"',
    choices: [
      { label: '虚心请教', affinity: 10, delta: { clinical: 5, knowledge: 3, stamina: -4 }, reply: '他手把手带你练了十遍。第十一遍你自己打对了。' },
      { label: '说"我知道了"敷衍过去', affinity: -6, delta: { clinical: 1 }, reply: '他看了你一眼，走了。' },
    ],
  },

  counselor: (aff) => aff <= DISTANT_AT ? {
    text: '王辅导员在公告栏前记着什么。你走过时他抬头："你最近的课，缺得有点多。"',
    choices: [
      { label: '说明真实情况', affinity: 12, delta: { sanity: 8, relations: 2 }, reply: '他听完，说"有困难要说，别一个人扛"。' },
      { label: '随口找个理由', affinity: -6, delta: { sanity: -4 }, reply: '他在本子上记了一笔。' },
    ],
  } : {
    text: '王辅导员："有个助学岗位，一个月八百，活不重。你要是需要，我给你留着。"',
    choices: [
      { label: '需要，谢谢老师', affinity: 6, delta: { money: 800, relations: 3, stamina: -6 }, reply: '他说"应该的"，在名单上写下了你的名字。' },
      { label: '留给更需要的同学', affinity: 10, delta: { reputation: 3, sanity: 5 }, reply: '他愣了一下，说"好孩子"。' },
    ],
  },

  // —— 实习/规培阶段 NPC ——
  attending: (aff) => aff >= TRUST_AT ? {
    text: '林主治查完房，把你留下："下午有台阑尾，你上一助，别紧张。"能让实习生上台，是信任。',
    choices: [
      { label: '认真准备，全程专注', affinity: 5, delta: { clinical: 6, reputation: 3, stamina: -8 }, reply: '术毕她说："手不抖，是块料。"' },
      { label: '怕出错，想先看看', affinity: -2, delta: { clinical: 2, sanity: 2 }, reply: '她说"下次总要有第一次"。' },
    ],
  } : aff <= DISTANT_AT ? {
    text: '林主治当着全组的面翻你写的病历："这份记录，你自己读得通吗？"你脸涨得通红。',
    choices: [
      { label: '当场认错，重写一份', affinity: 10, delta: { clinical: 3, sanity: -4, stamina: -4 }, reply: '她第二天没再说什么，只在你新写的病历上打了个勾。' },
      { label: '心里不服，嘴上应着', affinity: -4, delta: { sanity: -5, reputation: -2 }, reply: '她记住了你的表情。' },
    ],
  } : {
    text: '林主治指着监护仪问你："这个波形说明什么？"周围几个实习生都看着你。',
    choices: [
      { label: '答上来，还补了处理', affinity: 8, delta: { clinical: 4, knowledge: 3, reputation: 2 }, reply: '她"嗯"了一声——这是她少有的认可。' },
      { label: '答不上，老实说不会', affinity: 3, delta: { knowledge: 2, sanity: -2 }, reply: '她讲了三分钟，你记进了小本子。' },
    ],
  },

  headnurse: (aff) => aff >= TRUST_AT ? {
    text: '刘护士长塞给你一盒还热的包子："又没吃饭吧？病人的静脉我让小姑娘先留着，你先垫两口。"',
    choices: [
      { label: '道谢，吃了', affinity: 5, delta: { stamina: 8, sanity: 5, relations: 3 }, reply: '护士站成了你在医院最踏实的角落。' },
      { label: '让给更忙的同事', affinity: 6, delta: { relations: 4, reputation: 2, stamina: -2 }, reply: '她笑："这孩子，行。"' },
    ],
  } : {
    text: '刘护士长拦下你："医嘱开得太急，剂量再核一遍——护士执行错了，第一个背锅的是我们。"',
    choices: [
      { label: '虚心核对，谢她提醒', affinity: 10, delta: { clinical: 3, relations: 3 }, reply: '她点头："肯听话的医生，我们护士都护着。"' },
      { label: '嫌她多管闲事', affinity: -8, delta: { relations: -5, sanity: -2 }, reply: '她冷笑一声，转身走了。往后你的活儿没人搭把手。' },
    ],
  },

  fellow: (aff) => aff >= TRUST_AT ? {
    text: '赵师姐把她的规培笔记拷给你："出科考、执医、还有哪个主任脾气怪，全在里头。少走弯路。"',
    choices: [
      { label: '收下，改天请她吃饭', affinity: 5, delta: { clinical: 4, knowledge: 4, relations: 3 }, reply: '她摆手："咱们同门，客气啥。"' },
      { label: '想自己趟一遍', affinity: -2, delta: { knowledge: 2, sanity: 2 }, reply: '她笑："有骨气，但别硬扛。"' },
    ],
  } : {
    text: '赵师姐在值班室啃泡面："连着五个夜班了吧？我第一年也这么过来的。"',
    choices: [
      { label: '倒倒苦水，互相打气', affinity: 8, delta: { sanity: 6, relations: 3 }, reply: '两个人吐槽完，好像又能再撑一周。' },
      { label: '硬撑说自己没事', affinity: -3, delta: { sanity: -3, stamina: -2 }, reply: '她看了你一眼："逞强的样子，跟我当年一样。"' },
    ],
  },

  // 跨阶段导师：硕博到职业持续存在。对话随好感度与阶段深度变化。
  advisor: (aff, turn) => {
    if (aff >= TRUST_AT) {
      if (turn >= 8) {
        return {
          text: '周教授把你叫进办公室，关上门："有个合作项目，名额我可以给你。但你得保证数据是干净的。"',
          choices: [
            { label: '接了，自己做真的', affinity: 6, delta: { research: 8, reputation: 4, stamina: -12, knowledge: 3 }, flagSet: 'advisor_project', reply: '他说："我信你。别让我失望。"' },
            { label: '推掉，怕自己做不好', affinity: -2, delta: { sanity: 4, research: 2 }, reply: '他点点头："量力而行也是本事。"' },
          ],
        };
      }
      return {
        text: '周教授在组会后单独留下你："你最近的方向，我觉得可以往临床问题靠一靠。我帮你引荐两个科室。"',
        choices: [
          { label: '认真记下来，去对接', affinity: 5, delta: { research: 5, clinical: 4, relations: 4, stamina: -6 }, reply: '他拍了拍你肩："做有用的东西。"' },
          { label: '继续自己原来的题', affinity: -3, delta: { research: 3, sanity: 2 }, reply: '他说"也行，你自己拿主意。"' },
        ],
      };
    }
    if (aff <= DISTANT_AT) {
      return {
        text: '组会上，周教授看了一眼你的进度表，没点名批评，只说："有些同学，该自己紧张起来了。"全场安静了三秒。',
        choices: [
          { label: '会后主动找他说明', affinity: 12, delta: { stamina: -8, research: 3, sanity: -4 }, reply: '他听完，说"早这样我就不用在会上点了。"' },
          { label: '低头不说话', affinity: -5, delta: { sanity: -8, reputation: -2 }, reply: '散会后你是最后一个离开的。' },
        ],
      };
    }
    return {
      text: '周教授办公室门半开着。他头也不抬："进度呢？下周组会我要听你讲。"',
      choices: [
        { label: '把最近的结果摊开讲', affinity: 8, delta: { research: 4, knowledge: 2, stamina: -6 }, reply: '他偶尔抬眼，问了两个尖锐的问题。你答上了其中一个。' },
        { label: '含糊带过，说还在摸索', affinity: -6, delta: { sanity: -3 }, reply: '他"嗯"了一声，继续看自己的屏幕。' },
        { label: '请教一个卡住的方法学问题', affinity: 10, delta: { research: 6, knowledge: 4, stamina: -4 }, reply: '他在白板上画了十分钟。你第一次觉得他其实愿意教。' },
      ],
    };
  },
};

export function getTalk(npcId: string): NpcTalk | null {
  const fn = TALKS[npcId];
  if (!fn) return null;
  return fn(getAffinity(npcId), getState().turnsInStage);
}

/**
 * 有对话池的 NPC id。供回归测试双向对齐用：
 * 写了对话却没有 NpcDef（NPC 永不出现在地图上、对话成为死内容），
 * 或有 NpcDef 却没写对话（玩家走过去按 E 毫无反应），两种都应当报错。
 */
export const TALK_IDS: readonly string[] = Object.keys(TALKS);
