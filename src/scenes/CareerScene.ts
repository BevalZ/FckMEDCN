import { BaseStageScene } from './BaseStageScene';
import { getState, updateStats } from '../data/gameState';
import { determineEnding } from '../data/endings';
import type { StatDelta } from '../data/stats';

// 亚专科选择：开局选科室，决定职业阶段被动体力/心理消耗（劳累程度不同）。
export const SUB_SPECIALTIES: Array<{ flag: string; label: string; desc: string }> = [
  { flag: 'sub_internal', label: '内科', desc: '平稳规律，动脑多动身少' },
  { flag: 'sub_surgery', label: '外科', desc: '站台久、体力消耗大，最累' },
  { flag: 'sub_obgyn', label: '妇产科', desc: '急诊多、节奏紧，身心都累' },
  { flag: 'sub_pediatrics', label: '儿科', desc: '压力大、沟通累，心理消耗高' },
];

export function currentSubspecialty(): string {
  for (const s of SUB_SPECIALTIES) if (getState().flags.has(s.flag)) return s.flag;
  return 'sub_internal';
}

// 各亚专科每季被动消耗：外科最费体力、儿科最费心理、妇产科居中、内科平稳
function subDrain(): StatDelta {
  const sub = currentSubspecialty();
  switch (sub) {
    case 'sub_surgery': return { stamina: -13, knowledge: 3, sanity: -2 };
    case 'sub_obgyn': return { stamina: -10, knowledge: 2, sanity: -2 };
    case 'sub_pediatrics': return { stamina: -8, knowledge: 2, sanity: -5 };
    default: return { stamina: -8, knowledge: 2, sanity: -2 };
  }
}

export class CareerScene extends BaseStageScene {
  constructor() {
    super({ key: 'CareerScene' });
    this.stageName = 'career';
    this.paletteName = 'career';
    this.nextSceneKey = 'EndingScene';
    this.maxTurns = 12;
  }

  protected getStageLabelText(): string {
    const sub = SUB_SPECIALTIES.find(s => getState().flags.has(s.flag));
    return `🩺 职业阶段 · ${sub?.label ?? '内科'}`;
  }
  protected shouldAdvanceToNextStage(): boolean { return getState().turnsInStage >= this.maxTurns; }

  // 在抽取随机事件前，优先强制"人生节点"：
  // 第 0 季先选亚专科；第 3 季起强制第一起医患诉讼；第 9 季起强制第二起（仲裁）。
  // 用 flag 守护，ESC 跳过也不会漏——直到完成为止。
  protected triggerNextEvent() {
    const turn = getState().turnsInStage;
    const flags = getState().flags;
    const hasSub = SUB_SPECIALTIES.some(s => flags.has(s.flag));
    if (turn === 0 && !hasSub) this.forcedEventId = 'career_specialty_choice';
    else if (turn >= 3 && !flags.has('lawsuit_done_1')) this.forcedEventId = 'career_lawsuit_1';
    else if (turn >= 9 && !flags.has('lawsuit_done_2')) this.forcedEventId = 'career_lawsuit_2';
    super.triggerNextEvent();
  }

  protected doPassiveTurn() {
    updateStats(subDrain());
    super.doPassiveTurn();
  }

  protected transitionToNext() {
    const ending = determineEnding(getState());
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('EndingScene', { endingId: ending.id });
    });
  }
}
