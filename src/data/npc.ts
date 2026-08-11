import { clearFlag, getState, patchState, setFlag, hasFlag } from './gameState';
import type { LifeStage } from './gameState';
import type { PlayerGender } from './gameState';
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
  /** 生理性别用于判定同性/异性关系；same_as_player 用于室友等同住设定 */
  sex: PlayerGender | 'same_as_player';
  /** 与玩家同阶段年龄差。只允许绝对值 <=10 的异性 NPC 触发亲密关系。 */
  ageOffset: number;
  /** 出现在哪些阶段。本科同伴只在 undergrad，导师从 master 起 */
  stages: LifeStage[];
  /** 季度 → 所在地点 id（CampusScene 用）。长度不必等于总季度数，取模循环 */
  schedule?: string[];
  /** 亲密关系持续较久后，NPC 跟随进入后续可行走阶段时使用的阶段日程 */
  followSchedule?: Partial<Record<LifeStage, string[]>>;
  /** 头像/立牌配色 */
  color: number;
  hairColor: number;
}

export const NPC_ROMANCE_AT = 78;
export const NPC_ROMANCE_SUSTAINED_QUARTERS = 8;

export const NPCS: readonly NpcDef[] = [
  {
    id: 'roommate', name: '张宁', role: '室友',
    sex: 'same_as_player', ageOffset: 0,
    stages: ['undergrad'],
    schedule: ['dorm', 'canteen', 'dorm', 'library'],
    color: 0x5c8a5c, hairColor: 0x2a2a2a,
  },
  {
    id: 'senior', name: '陈师兄', role: '学长',
    sex: 'male', ageOffset: 2,
    stages: ['undergrad'],
    schedule: ['library', 'board', 'field', 'canteen'],
    followSchedule: {
      internship: ['canteen', 'office', 'callroom', 'canteen'],
      guipei: ['canteen', 'office', 'callroom', 'canteen'],
      master: ['canteen', 'bench', 'field', 'dorm'],
      phd: ['canteen', 'bench', 'field', 'dorm'],
      career: ['canteen', 'admin', 'rest', 'canteen'],
      pinnacle: ['canteen', 'admin', 'rest', 'canteen'],
    },
    color: 0x4a6a9a, hairColor: 0x1f1f1f,
  },
  {
    id: 'teacher', name: '李老师', role: '带教',
    sex: 'male', ageOffset: 18,
    stages: ['undergrad'],
    schedule: ['teaching', 'teaching', 'library', 'teaching'],
    color: 0xd8d8e0, hairColor: 0x3a3a3a,
  },
  {
    id: 'counselor', name: '王辅导员', role: '辅导员',
    sex: 'female', ageOffset: 12,
    stages: ['undergrad'],
    schedule: ['board', 'field', 'board', 'dorm'],
    color: 0x9a6a8a, hairColor: 0x2a2a2a,
  },
  // —— 实习/规培阶段 ——
  // schedule 里的地点 id 必须在该 NPC 所有 stages 的地图里都存在，否则 placeNpcs 会静默跳过。
  // hospitalMap 与 guipeiMap 的共有 id：er / canteen / office / nurse / callroom。
  {
    id: 'attending', name: '林主治', role: '带教主治',
    sex: 'female', ageOffset: 8,
    stages: ['internship'],                       // 对话文本写的是"实习生"，不跨到规培
    schedule: ['ward', 'or', 'ward', 'office'],
    followSchedule: {
      guipei: ['office', 'canteen', 'nurse', 'callroom'],
      master: ['teaching', 'canteen', 'bench', 'field'],
      phd: ['meeting', 'canteen', 'bench', 'field'],
      career: ['ward', 'canteen', 'admin', 'rest'],
      pinnacle: ['ward', 'canteen', 'admin', 'rest'],
    },
    color: 0xe0e4ea, hairColor: 0x2a2a2a,
  },
  {
    id: 'headnurse', name: '刘护士长', role: '护士长',
    sex: 'female', ageOffset: 12,
    stages: ['internship', 'guipei'],             // 故只用两图共有的地点 id
    schedule: ['nurse', 'canteen', 'nurse', 'er'],
    color: 0xbfa0c4, hairColor: 0x3a3230,
  },
  {
    id: 'fellow', name: '赵师姐', role: '高年资规培',
    sex: 'female', ageOffset: 3,
    stages: ['guipei'],
    schedule: ['callroom', 'lab', 'internal', 'canteen'],
    followSchedule: {
      master: ['lab', 'canteen', 'bench', 'field'],
      phd: ['lab', 'canteen', 'bench', 'field'],
      career: ['ward', 'canteen', 'nurse', 'rest'],
      pinnacle: ['ward', 'canteen', 'nurse', 'rest'],
    },
    color: 0x7a9ab0, hairColor: 0x241f1f,
  },
  {
    id: 'advisor', name: '周教授', role: '导师',
    sex: 'male', ageOffset: 22,
    stages: ['master', 'phd', 'career'],
    schedule: ['lab', 'canteen', 'lab', 'canteen'],
    color: 0xc0c0c8, hairColor: 0x707070,
  },
  { id: 'career_peer', name: '同组医生', role: '同组医生', sex: 'female', ageOffset: 1, stages: ['career', 'pinnacle'], schedule: ['ward', 'canteen', 'er', 'ward'], color: 0xe3e6ea, hairColor: 0x303038 },
  { id: 'resident_chief', name: '住院总', role: '住院总', sex: 'male', ageOffset: 4, stages: ['career', 'pinnacle'], schedule: ['er', 'rest', 'ward', 'admin'], color: 0xdde3e8, hairColor: 0x252530 },
  { id: 'ward_nurse', name: '责任护士', role: '责任护士', sex: 'female', ageOffset: 0, stages: ['career', 'pinnacle'], schedule: ['nurse', 'ward', 'canteen', 'nurse'], color: 0xe7c6e7, hairColor: 0x382c32 },
  { id: 'medical_admin', name: '医务科干事', role: '医务科干事', sex: 'male', ageOffset: 3, stages: ['career', 'pinnacle'], schedule: ['admin', 'canteen', 'admin', 'er'], color: 0x78909c, hairColor: 0x2b2b32 },
  { id: 'lab_doctor', name: '检验科医生', role: '检验科医生', sex: 'male', ageOffset: -1, stages: ['career', 'pinnacle'], schedule: ['lab', 'ward', 'lab', 'canteen'], color: 0xb0bec5, hairColor: 0x303038 },
  { id: 'radiologist', name: '影像科医生', role: '影像科医生', sex: 'male', ageOffset: 5, stages: ['career', 'pinnacle'], schedule: ['lab', 'er', 'ward', 'rest'], color: 0x90a4ae, hairColor: 0x25252d },
  { id: 'junior_doctor', name: '低年资医生', role: '低年资医生', sex: 'female', ageOffset: -4, stages: ['career', 'pinnacle'], schedule: ['surgery', 'ward', 'rest', 'canteen'], color: 0xf1f3f5, hairColor: 0x352d2b },
  { id: 'department_chief', name: '科主任', role: '科主任', sex: 'male', ageOffset: 16, stages: ['career', 'pinnacle'], schedule: ['ward', 'admin', 'surgery', 'canteen'], color: 0xc5cad0, hairColor: 0x55555c },
  { id: 'pharmacist', name: '临床药师', role: '临床药师', sex: 'female', ageOffset: 2, stages: ['career', 'pinnacle'], schedule: ['lab', 'ward', 'nurse', 'canteen'], color: 0xb2dfdb, hairColor: 0x2e3235 },
  { id: 'patient_liaison', name: '患者服务专员', role: '患者服务专员', sex: 'female', ageOffset: -2, stages: ['career', 'pinnacle'], schedule: ['er', 'admin', 'canteen', 'ward'], color: 0xffcc80, hairColor: 0x3c3030 },
  { id: 'community_doctor', name: '社区医生', role: '社区医生', sex: 'female', ageOffset: 7, stages: ['career', 'pinnacle'], schedule: ['er', 'canteen', 'ward', 'admin'], color: 0xa5d6a7, hairColor: 0x30352f },
  { id: 'conference_peer', name: '外院同行', role: '外院同行', sex: 'male', ageOffset: 2, stages: ['career', 'pinnacle'], schedule: ['lab', 'canteen', 'admin', 'rest'], color: 0x9fa8da, hairColor: 0x292938 },
  { id: 'classmate_topper', name: '高绩点同学', role: '高绩点同学', sex: 'female', ageOffset: 0, stages: ['undergrad'], schedule: ['library', 'teaching', 'library', 'board'], color: 0x80cbc4, hairColor: 0x2b2b32 },
  { id: 'classmate_slacker', name: '摸鱼同学', role: '摸鱼同学', sex: 'male', ageOffset: 0, stages: ['undergrad'], schedule: ['canteen', 'dorm', 'field', 'canteen'], color: 0xffcc80, hairColor: 0x3a2d28 },
  { id: 'anatomy_ta', name: '解剖助教', role: '解剖助教', sex: 'male', ageOffset: 3, stages: ['undergrad'], schedule: ['teaching', 'skills', 'teaching', 'library'], color: 0xcfd8dc, hairColor: 0x303030 },
  { id: 'library_partner', name: '自习搭子', role: '自习搭子', sex: 'female', ageOffset: -1, stages: ['undergrad'], schedule: ['library', 'library', 'canteen', 'library'], color: 0xb39ddb, hairColor: 0x302a3a },
  { id: 'student_union_rep', name: '学生会干部', role: '学生会干部', sex: 'male', ageOffset: 1, stages: ['undergrad'], schedule: ['board', 'field', 'canteen', 'board'], color: 0x9fa8da, hairColor: 0x252530 },
  { id: 'scholarship_peer', name: '奖学金同学', role: '奖学金同学', sex: 'female', ageOffset: 0, stages: ['undergrad'], schedule: ['board', 'library', 'teaching', 'canteen'], color: 0xffecb3, hairColor: 0x4a3524 },
  { id: 'dorm_neighbor', name: '隔壁宿舍同学', role: '隔壁宿舍同学', sex: 'same_as_player', ageOffset: 0, stages: ['undergrad'], schedule: ['dorm', 'field', 'dorm', 'canteen'], color: 0xa5d6a7, hairColor: 0x30352f },
  { id: 'sports_captain', name: '院队队长', role: '院队队长', sex: 'male', ageOffset: 1, stages: ['undergrad'], schedule: ['field', 'skills', 'canteen', 'dorm'], color: 0xffab91, hairColor: 0x3b2924 },
  { id: 'intern_peer', name: '同组实习生', role: '同组实习生', sex: 'female', ageOffset: 0, stages: ['internship'], schedule: ['ward', 'canteen', 'office', 'callroom'], color: 0xe8eaf6, hairColor: 0x303038 },
  { id: 'emergency_resident', name: '急诊住院医', role: '急诊住院医', sex: 'male', ageOffset: 4, stages: ['internship'], schedule: ['er', 'office', 'er', 'canteen'], color: 0xff8a80, hairColor: 0x292929 },
  { id: 'scrub_nurse', name: '洗手护士', role: '洗手护士', sex: 'female', ageOffset: 3, stages: ['internship'], schedule: ['or', 'nurse', 'or', 'canteen'], color: 0xf8bbd0, hairColor: 0x3a2c32 },
  { id: 'anesthetist', name: '麻醉医生', role: '麻醉医生', sex: 'male', ageOffset: 7, stages: ['internship'], schedule: ['or', 'office', 'canteen', 'or'], color: 0xb0bec5, hairColor: 0x25252d },
  { id: 'ward_secretary', name: '病区秘书', role: '病区秘书', sex: 'female', ageOffset: 6, stages: ['internship'], schedule: ['office', 'ward', 'canteen', 'office'], color: 0xd7ccc8, hairColor: 0x4a3328 },
  { id: 'patient_family_rep', name: '患者家属代表', role: '患者家属代表', sex: 'male', ageOffset: 9, stages: ['internship'], schedule: ['ward', 'er', 'canteen', 'ward'], color: 0xffccbc, hairColor: 0x3c3030 },
  { id: 'co_resident', name: '同届规培', role: '同届规培', sex: 'male', ageOffset: 0, stages: ['guipei'], schedule: ['internal', 'canteen', 'surgery', 'callroom'], color: 0xdde3e8, hairColor: 0x303038 },
  { id: 'rotation_secretary', name: '轮转秘书', role: '轮转秘书', sex: 'female', ageOffset: 5, stages: ['guipei'], schedule: ['office', 'canteen', 'office', 'nurse'], color: 0xce93d8, hairColor: 0x3a293f },
  { id: 'chief_resident', name: '总住院医', role: '总住院医', sex: 'male', ageOffset: 6, stages: ['guipei'], schedule: ['er', 'surgery', 'internal', 'office'], color: 0xb0bec5, hairColor: 0x252530 },
  { id: 'exam_partner', name: '出科搭子', role: '出科搭子', sex: 'female', ageOffset: -1, stages: ['guipei'], schedule: ['callroom', 'lab', 'canteen', 'office'], color: 0x80deea, hairColor: 0x263238 },
  { id: 'ultrasound_doctor', name: '超声医生', role: '超声医生', sex: 'female', ageOffset: 4, stages: ['guipei'], schedule: ['lab', 'er', 'canteen', 'internal'], color: 0x90caf9, hairColor: 0x263238 },
  { id: 'blood_bank_doctor', name: '输血科医生', role: '输血科医生', sex: 'male', ageOffset: 8, stages: ['guipei'], schedule: ['lab', 'office', 'er', 'canteen'], color: 0xef9a9a, hairColor: 0x302020 },
  { id: 'night_shift_peer', name: '夜班搭子', role: '夜班搭子', sex: 'female', ageOffset: 0, stages: ['guipei'], schedule: ['callroom', 'er', 'canteen', 'callroom'], color: 0x9fa8da, hairColor: 0x222638 },
  { id: 'outpatient_teacher', name: '门诊带教', role: '门诊带教', sex: 'male', ageOffset: 10, stages: ['guipei'], schedule: ['internal', 'office', 'er', 'canteen'], color: 0xc5cae9, hairColor: 0x3a3a42 },
  { id: 'lab_senior', name: '实验室师兄', role: '实验室师兄', sex: 'male', ageOffset: 3, stages: ['master', 'phd'], schedule: ['lab', 'bench', 'canteen', 'lab'], color: 0x9fa8da, hairColor: 0x292938 },
  { id: 'lab_junior', name: '实验室师妹', role: '实验室师妹', sex: 'female', ageOffset: -2, stages: ['master', 'phd'], schedule: ['bench', 'lab', 'canteen', 'field'], color: 0xf8bbd0, hairColor: 0x382c32 },
  { id: 'statistician', name: '统计老师', role: '统计老师', sex: 'female', ageOffset: 9, stages: ['master', 'phd'], schedule: ['bench', 'canteen', 'board', 'bench'], color: 0xb2dfdb, hairColor: 0x263238 },
  { id: 'ethics_secretary', name: '伦理秘书', role: '伦理秘书', sex: 'female', ageOffset: 6, stages: ['master', 'phd'], schedule: ['board', 'bench', 'canteen', 'board'], color: 0xd7ccc8, hairColor: 0x4a3328 },
  { id: 'animal_room_keeper', name: '动物房老师', role: '动物房老师', sex: 'male', ageOffset: 11, stages: ['master', 'phd'], schedule: ['lab', 'field', 'bench', 'canteen'], color: 0xc8e6c9, hairColor: 0x30352f },
  { id: 'platform_engineer', name: '平台工程师', role: '平台工程师', sex: 'male', ageOffset: 5, stages: ['master', 'phd'], schedule: ['lab', 'bench', 'board', 'canteen'], color: 0x90a4ae, hairColor: 0x25252d },
  { id: 'journal_editor_peer', name: '编辑部同学', role: '编辑部同学', sex: 'female', ageOffset: 2, stages: ['master', 'phd'], schedule: ['canteen', 'board', 'bench', 'lab'], color: 0xffecb3, hairColor: 0x4a3524 },
  { id: 'grant_officer', name: '科研处老师', role: '科研处老师', sex: 'male', ageOffset: 13, stages: ['master', 'phd'], schedule: ['board', 'canteen', 'bench', 'board'], color: 0xbcaaa4, hairColor: 0x3e2f2a },
  { id: 'icu_consultant', name: 'ICU会诊医生', role: 'ICU会诊医生', sex: 'female', ageOffset: 6, stages: ['career', 'pinnacle'], schedule: ['er', 'ward', 'canteen', 'rest'], color: 0x80cbc4, hairColor: 0x263238 },
  { id: 'infectious_consultant', name: '感染科医生', role: '感染科医生', sex: 'male', ageOffset: 8, stages: ['career', 'pinnacle'], schedule: ['lab', 'ward', 'admin', 'canteen'], color: 0xa5d6a7, hairColor: 0x30352f },
  { id: 'cardiology_consultant', name: '心内会诊医生', role: '心内会诊医生', sex: 'female', ageOffset: 4, stages: ['career', 'pinnacle'], schedule: ['ward', 'er', 'canteen', 'admin'], color: 0xef9a9a, hairColor: 0x382020 },
  { id: 'neuro_consultant', name: '神内会诊医生', role: '神内会诊医生', sex: 'male', ageOffset: 5, stages: ['career', 'pinnacle'], schedule: ['er', 'lab', 'ward', 'rest'], color: 0xb39ddb, hairColor: 0x302a3a },
  { id: 'oncology_doctor', name: '肿瘤科医生', role: '肿瘤科医生', sex: 'female', ageOffset: 7, stages: ['career', 'pinnacle'], schedule: ['ward', 'admin', 'canteen', 'lab'], color: 0xce93d8, hairColor: 0x3a293f },
  { id: 'pathologist', name: '病理科医生', role: '病理科医生', sex: 'male', ageOffset: 6, stages: ['career', 'pinnacle'], schedule: ['lab', 'canteen', 'ward', 'admin'], color: 0xf48fb1, hairColor: 0x3a2c32 },
  { id: 'medical_insurance_officer', name: '医保办老师', role: '医保办老师', sex: 'female', ageOffset: 10, stages: ['career', 'pinnacle'], schedule: ['admin', 'canteen', 'ward', 'admin'], color: 0xffcc80, hairColor: 0x3c3030 },
  { id: 'information_engineer', name: '信息科工程师', role: '信息科工程师', sex: 'male', ageOffset: -1, stages: ['career', 'pinnacle'], schedule: ['admin', 'lab', 'canteen', 'rest'], color: 0x78909c, hairColor: 0x20242a },
  { id: 'social_worker', name: '医务社工', role: '医务社工', sex: 'female', ageOffset: 3, stages: ['career', 'pinnacle'], schedule: ['admin', 'er', 'canteen', 'ward'], color: 0xffccbc, hairColor: 0x4a3328 },
  { id: 'security_guard', name: '安保队长', role: '安保队长', sex: 'male', ageOffset: 12, stages: ['career', 'pinnacle'], schedule: ['er', 'admin', 'rest', 'er'], color: 0x90a4ae, hairColor: 0x252530 },
  { id: 'hospital_accountant', name: '财务科老师', role: '财务科老师', sex: 'female', ageOffset: 9, stages: ['career', 'pinnacle'], schedule: ['admin', 'ward', 'admin', 'ward'], color: 0xffecb3, hairColor: 0x4a3524 },
  { id: 'device_engineer', name: '设备科工程师', role: '设备科工程师', sex: 'male', ageOffset: 4, stages: ['career', 'pinnacle'], schedule: ['lab', 'surgery', 'admin', 'canteen'], color: 0xb0bec5, hairColor: 0x25252d },
  { id: 'union_representative', name: '工会老师', role: '工会老师', sex: 'female', ageOffset: 8, stages: ['career', 'pinnacle'], schedule: ['admin', 'ward', 'rest', 'ward'], color: 0xc5cae9, hairColor: 0x343447 },
  { id: 'teaching_secretary', name: '教学秘书', role: '教学秘书', sex: 'female', ageOffset: 5, stages: ['career', 'pinnacle'], schedule: ['admin', 'ward', 'lab', 'ward'], color: 0xd1c4e9, hairColor: 0x302a3a },
  { id: 'graduate_student', name: '研究生', role: '研究生', sex: 'male', ageOffset: -8, stages: ['career', 'pinnacle'], schedule: ['lab', 'ward', 'rest', 'rest'], color: 0xe8eaf6, hairColor: 0x303038 },
  { id: 'visiting_scholar', name: '进修医生', role: '进修医生', sex: 'female', ageOffset: 2, stages: ['career', 'pinnacle'], schedule: ['ward', 'surgery', 'admin', 'admin'], color: 0x80deea, hairColor: 0x263238 },
];

export const NPCS_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map(n => [n.id, n]));

const LEGACY_NAMES: Record<string, string> = {
  张宁: 'roommate', 陈师兄: 'senior', 李老师: 'teacher', 王辅导员: 'counselor',
  林主治: 'attending', 刘护士长: 'headnurse', 赵师姐: 'fellow', 周教授: 'advisor',
};

export function getNpcName(id: string): string {
  return getState().npcNames?.[id] ?? NPCS_BY_ID[id]?.name ?? id;
}

/** 地图头顶名牌使用短姓名；完整姓名与职位仍保留在对话卡中。 */
export function getNpcDisplayName(id: string): string {
  return Array.from(getNpcName(id)).slice(0, 3).join('');
}

export function getNpcSex(id: string): PlayerGender | null {
  const def = NPCS_BY_ID[id];
  if (!def) return null;
  return def.sex === 'same_as_player' ? getState().gender : def.sex;
}

export function npcAgeGap(id: string): number | null {
  return NPCS_BY_ID[id]?.ageOffset ?? null;
}

export function isOppositeSexNpc(id: string): boolean {
  const sex = getNpcSex(id);
  return !!sex && sex !== getState().gender;
}

export function canStartNpcRomance(id: string): boolean {
  const def = NPCS_BY_ID[id];
  if (!def) return false;
  const gap = Math.abs(def.ageOffset);
  const st = getState();
  return st.marital === 'single'
    && isOppositeSexNpc(id)
    && gap <= 10
    && getAffinity(id) >= NPC_ROMANCE_AT
    && !st.flags.has(`npc_romance_${id}`);
}

export function activeNpcRomanceId(): string | null {
  const st = getState();
  return NPCS.find(n => st.flags.has(`npc_romance_${n.id}`))?.id ?? null;
}

function romanceFollowSchedule(npc: NpcDef, stage: LifeStage): string[] | undefined {
  const st = getState();
  if (!st.flags.has(`npc_romance_sustained_${npc.id}`)) return undefined;
  if (st.marital !== 'dating' && st.marital !== 'married') return undefined;
  if (st.spouse !== getNpcName(npc.id)) return undefined;
  return npc.followSchedule?.[stage];
}

export function renderNpcText(text: string): string {
  let rendered = text.replace(/\[\[npc:([a-z_]+)\]\]/g, (_match, id: string) => getNpcName(id));
  for (const [legacy, id] of Object.entries(LEGACY_NAMES)) rendered = rendered.replaceAll(legacy, getNpcName(id));
  return rendered;
}

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
  if (next >= TRUST_AT) {
    setFlag(`trust_${id}`);
    clearFlag(`distant_${id}`);
  } else {
    clearFlag(`trust_${id}`);
  }
  if (next <= DISTANT_AT) {
    setFlag(`distant_${id}`);
    clearFlag(`trust_${id}`);
  } else {
    clearFlag(`distant_${id}`);
  }
  return next;
}

export function isTrusted(id: string): boolean { return hasFlag(`trust_${id}`); }

export interface AffinityQuarterOutcome {
  delta: StatDelta;
  messages: string[];
}

function addDelta(target: StatDelta, delta: StatDelta) {
  const out = target as Record<string, number | undefined>;
  const input = delta as Record<string, number | undefined>;
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (typeof value !== 'number' || value === 0) continue;
    out[key] = (out[key] ?? 0) + value;
  }
}

function inStage(stage: LifeStage, stages: LifeStage[]): boolean {
  return stages.includes(stage);
}

/**
 * 每季兑现 NPC 好感度：信任不是只开剧情，而是持续提供小额资源；
 * 疏远也会变成实际摩擦。数值刻意克制，避免好感度滚成主属性外挂。
 */
export function tickAffinityQuarter(stage: LifeStage): AffinityQuarterOutcome {
  const delta: StatDelta = {};
  const messages: string[] = [];
  const flags = getState().flags;
  const trusted = (id: string) => flags.has(`trust_${id}`) || getAffinity(id) >= TRUST_AT;
  const distant = (id: string) => !trusted(id) && (flags.has(`distant_${id}`) || getAffinity(id) <= DISTANT_AT);

  if (trusted('roommate')) {
    if (inStage(stage, ['undergrad'])) {
      addDelta(delta, { sanity: 2, relations: 1 });
      messages.push('室友支持');
    } else if (inStage(stage, ['guipei', 'jobhunt', 'career'])) {
      addDelta(delta, { sanity: 1, relations: 1 });
      messages.push('老同学支持');
    }
  } else if (distant('roommate') && inStage(stage, ['undergrad'])) {
    addDelta(delta, { sanity: -2, relations: -1 });
    messages.push('宿舍摩擦');
  }

  if (trusted('senior')) {
    if (inStage(stage, ['undergrad', 'internship', 'guipei'])) {
      addDelta(delta, { knowledge: 1, relations: 1 });
      messages.push('师兄经验');
    } else if (inStage(stage, ['jobhunt', 'career'])) {
      addDelta(delta, { reputation: 1, relations: 1 });
      messages.push('同行人脉');
    }
  } else if (distant('senior') && inStage(stage, ['undergrad'])) {
    addDelta(delta, { relations: -1 });
    messages.push('师兄疏远');
  }

  if (trusted('teacher') && inStage(stage, ['undergrad', 'internship'])) {
    addDelta(delta, { knowledge: 1, clinical: 1 });
    messages.push('带教照看');
  } else if (distant('teacher') && inStage(stage, ['undergrad'])) {
    addDelta(delta, { clinical: -1, reputation: -1 });
    messages.push('带教冷淡');
  }

  if (trusted('counselor') && inStage(stage, ['undergrad'])) {
    const lowMoneyRelief = getState().stats.money < 3000 ? 500 : 0;
    addDelta(delta, { sanity: 1, relations: 1, money: lowMoneyRelief });
    messages.push(lowMoneyRelief > 0 ? '辅导员助困' : '辅导员支持');
  } else if (distant('counselor') && inStage(stage, ['undergrad'])) {
    addDelta(delta, { sanity: -1, relations: -1 });
    messages.push('辅导员失联');
  }

  if (trusted('attending') && inStage(stage, ['internship', 'guipei', 'career'])) {
    addDelta(delta, { clinical: 1, reputation: 1 });
    messages.push('上级托举');
  } else if (distant('attending') && inStage(stage, ['internship'])) {
    addDelta(delta, { sanity: -2, reputation: -1 });
    messages.push('上级压力');
  }

  if (trusted('headnurse') && inStage(stage, ['internship', 'guipei', 'career'])) {
    addDelta(delta, { stamina: 2, relations: 1 });
    messages.push('护士站支援');
  } else if (distant('headnurse') && inStage(stage, ['internship', 'guipei'])) {
    addDelta(delta, { stamina: -2, relations: -1 });
    messages.push('护士站不顺');
  }

  if (trusted('fellow') && inStage(stage, ['guipei', 'career'])) {
    addDelta(delta, { sanity: 2, clinical: 1 });
    messages.push('师姐搭把手');
  } else if (distant('fellow') && inStage(stage, ['guipei'])) {
    addDelta(delta, { sanity: -2 });
    messages.push('同门疏离');
  }

  if (trusted('advisor') && inStage(stage, ['master', 'phd', 'career'])) {
    addDelta(delta, { research: 1, reputation: 1 });
    messages.push('导师资源');
  } else if (distant('advisor') && inStage(stage, ['master', 'phd', 'career'])) {
    addDelta(delta, { sanity: -2, research: -1 });
    messages.push('导师施压');
  }

  const workNetwork = ['career_peer', 'resident_chief', 'ward_nurse', 'medical_admin', 'lab_doctor', 'radiologist', 'junior_doctor', 'department_chief', 'pharmacist', 'patient_liaison', 'community_doctor', 'conference_peer'];
  if (inStage(stage, ['career', 'pinnacle'])) {
    const trustedWork = workNetwork.filter(trusted).length;
    const distantWork = workNetwork.filter(distant).length;
    if (trustedWork > 0) {
      addDelta(delta, { sanity: Math.min(4, trustedWork), relations: Math.min(3, Math.ceil(trustedWork / 2)), stamina: Math.min(3, Math.floor(trustedWork / 3)) });
      messages.push(`职业关系支援×${trustedWork}`);
    }
    if (distantWork > 0) {
      addDelta(delta, { sanity: -Math.min(4, distantWork), relations: -Math.min(3, Math.ceil(distantWork / 2)) });
      messages.push(`职业关系摩擦×${distantWork}`);
    }
  }

  return { delta, messages };
}

/** 某季度该 NPC 在哪个地点（CampusScene 用）。无 schedule 则不出现在地图上。 */
export function npcSpotAt(npc: NpcDef, turn: number): string | null {
  if (!npc.schedule || npc.schedule.length === 0) return null;
  return npc.schedule[turn % npc.schedule.length];
}

/** 当前阶段应出现在地图上的 NPC */
export function npcsForStage(stage: LifeStage): NpcDef[] {
  return NPCS
    .filter(n => (n.stages.includes(stage) && n.schedule) || romanceFollowSchedule(n, stage))
    .map(n => ({ ...n, name: getNpcName(n.id), schedule: n.stages.includes(stage) ? n.schedule : romanceFollowSchedule(n, stage) }));
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

const WORK_NPC_ROLES: Record<string, string> = {
  career_peer: '同组医生', resident_chief: '住院总', ward_nurse: '责任护士',
  medical_admin: '医务科干事', lab_doctor: '检验科医生', radiologist: '影像科医生',
  junior_doctor: '低年资医生', department_chief: '科主任', pharmacist: '临床药师',
  patient_liaison: '患者服务专员', community_doctor: '社区医生', conference_peer: '外院同行',
};

for (const [npcId, role] of Object.entries(WORK_NPC_ROLES)) {
  TALKS[npcId] = (aff) => ({
    text: `[[npc:${npcId}]]（${role}）在工作间隙和你打了个照面。`,
    choices: aff >= TRUST_AT ? [
      { label: '交换近况，约好下次一起复盘', affinity: 5, delta: { sanity: 4, relations: 2 }, reply: `[[npc:${npcId}]]说，忙完这一轮就找你。` },
      { label: '请对方帮忙看一眼难题', affinity: 3, delta: { knowledge: 2, stamina: -2 }, reply: `[[npc:${npcId}]]认真听完，给了你一个可执行的建议。` },
    ] : [
      { label: '主动打招呼并说明需要', affinity: 8, delta: { relations: 2, sanity: 2 }, reply: `[[npc:${npcId}]]点头，愿意找时间和你对接。` },
      { label: '点头示意后继续工作', affinity: -1, delta: { stamina: 1 }, reply: '你把注意力重新放回手头的工作。' },
    ],
  });
}

for (const def of NPCS) {
  if (TALKS[def.id]) continue;
  TALKS[def.id] = (aff) => ({
    text: `[[npc:${def.id}]]（${def.role}）在你经过时停下手里的事，和你聊了几句最近的安排。`,
    choices: aff >= TRUST_AT ? [
      { label: '请对方说说真实经验', affinity: 5, delta: { knowledge: 2, relations: 3, sanity: 2 }, reply: `[[npc:${def.id}]]没有说漂亮话，而是把容易踩坑的地方讲得很具体。` },
      { label: '约好之后互相提醒', affinity: 4, delta: { relations: 4, stamina: -2 }, reply: `[[npc:${def.id}]]答应下次有窗口期或风险点会提前告诉你。` },
    ] : aff <= DISTANT_AT ? [
      { label: '主动缓和关系', affinity: 9, delta: { relations: 2, sanity: -1 }, reply: `[[npc:${def.id}]]语气还是冷，但至少愿意把话听完。` },
      { label: '保持距离', affinity: -3, delta: { sanity: 1, relations: -2 }, reply: '你们点头擦肩，关系继续停在尴尬的位置。' },
    ] : [
      { label: '认真听对方说完', affinity: 7, delta: { relations: 3, knowledge: 1 }, reply: `[[npc:${def.id}]]说，愿意听人把话说完的人不多。` },
      { label: '寒暄两句就走', affinity: -1, delta: { stamina: 1 }, reply: '你把注意力重新放回手头的事。' },
    ],
  });
}

export function getTalk(npcId: string): NpcTalk | null {
  const fn = TALKS[npcId];
  if (!fn) return null;
  const talk = fn(getAffinity(npcId), getState().turnsInStage);
  return {
    ...talk,
    text: renderNpcText(talk.text),
    choices: talk.choices.map(choice => ({ ...choice, reply: renderNpcText(choice.reply) })),
  };
}

/**
 * 有对话池的 NPC id。供回归测试双向对齐用：
 * 写了对话却没有 NpcDef（NPC 永不出现在地图上、对话成为死内容），
 * 或有 NpcDef 却没写对话（玩家走过去按 E 毫无反应），两种都应当报错。
 */
export const TALK_IDS: readonly string[] = Object.keys(TALKS);
