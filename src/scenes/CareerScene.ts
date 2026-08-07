import { BaseStageScene } from './BaseStageScene';
import { getState, setFlag } from '../data/gameState';

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

function lawsuitEventId(round: 1 | 2): string {
  return `career_lawsuit_${round}_${currentSubspecialty().replace('sub_', '')}`;
}

export class CareerScene extends BaseStageScene {
  constructor() {
    super({ key: 'CareerScene' });
    this.stageName = 'career';
    this.paletteName = 'career';
    this.nextSceneKey = 'PinnacleScene';
    this.maxTurns = 20;
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
    // 非医生线（no_college）不强制选亚专科 / 医患诉讼，走通用事件即可。
    if (!flags.has('no_college')) {
      if (turn === 0 && !hasSub) this.forcedEventId = 'career_specialty_choice';
      else if (turn >= 3 && !flags.has('lawsuit_done_1')) this.forcedEventId = lawsuitEventId(1);
      else if (turn >= 9 && !flags.has('lawsuit_done_2')) this.forcedEventId = lawsuitEventId(2);
      else if (turn >= 5 && !flags.has('legal_complaint_handled')) {
        setFlag('legal_complaint_due');
        this.forcedEventId = 'legal_first_complaint';
      }
      else if (flags.has('legal_dispute_due') && !flags.has('legal_dispute_open') && !flags.has('legal_resolution_chosen')) {
        this.forcedEventId = 'legal_seal_records';
      }
      else if (flags.has('meaning_crisis_due')) this.forcedEventId = 'sp_midlife_collapse';
      else if (flags.has('family_crisis_due')) this.forcedEventId = 'fa_spouse_night_talk';
      else if (flags.has('love_crisis_due') && getState().marital === 'married') this.forcedEventId = 'lv_living_room';
      else if (flags.has('public_harassment_due')) this.forcedEventId = 'pi_hanging_post';
      else if (flags.has('public_exposure_due')) this.forcedEventId = 'pi_filmed_clinic';
      else if (flags.has('side_business_investigation_due')) this.forcedEventId = 'le_side_investigation';
      else if (flags.has('social_obstruction_due')) this.forcedEventId = 'mf_betrayal';
    }
    super.triggerNextEvent();
  }

  protected doPassiveTurn() {
    // 亚专科被动消耗 + 职业期日常回血已统一移到 turnFlow.advanceQuarter（共享结算层），
    // 保证真实游戏与纯模拟行为一致；这里不再重复扣减，避免双扣。
    super.doPassiveTurn();
  }

  protected transitionToNext() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('PinnacleScene');
    });
  }
}
