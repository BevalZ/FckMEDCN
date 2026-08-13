import { BaseStageScene } from './BaseStageScene';
import { getState, setFlag } from '../data/gameState';

// 亚专科选择：开局选科室，决定职业阶段被动体力/心理消耗（劳累程度不同）。
export const SUB_SPECIALTIES: Array<{ flag: string; label: string; desc: string }> = [
  { flag: 'sub_internal', label: '内科', desc: '平稳规律，动脑多动身少' },
  { flag: 'sub_surgery', label: '外科', desc: '站台久、体力消耗大；长期站台会压低体力上限' },
  { flag: 'sub_obgyn', label: '妇产科', desc: '急诊多、节奏紧；长期双压会半速磨损体力上限与危机阈值' },
  { flag: 'sub_pediatrics', label: '儿科', desc: '压力大、沟通累；长期高压会抬升心理危机阈值' },
  { flag: 'sub_emergency', label: '急诊', desc: '分诊抢救、体心双压；长期双轨磨损体力上限与危机阈值' },
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
    const chief = getState().flags.has('chief_resident_year') ? ' · 住院总' : '';
    return `🩺 职业阶段 · ${sub?.label ?? '内科'}${chief}`;
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
      else if (turn >= 5 && flags.has('lawsuit_done_1') && !flags.has('appraisal_resolved')) {
        this.forcedEventId = 'career_lawsuit_appraisal';
      }
      // 住院总一年：第 5 季起任命；任期内半年节点；满 4 季结业（优先于第二起诉讼）
      else if (turn >= 5
        && flags.has('passed_zhuzhi')
        && !flags.has('chief_offer_resolved')) {
        this.forcedEventId = 'career_chief_offer';
      }
      else if (flags.has('chief_resident_year') && !flags.has('chief_mid_done')
        && (getState().counters['chief_quarters'] ?? 0) >= 2) {
        this.forcedEventId = 'career_chief_mid_crush';
      }
      else if (flags.has('chief_resident_year') && !flags.has('chief_graduated')
        && (getState().counters['chief_quarters'] ?? 0) >= 4) {
        this.forcedEventId = 'career_chief_graduate';
      }
      else if (turn >= 9 && !flags.has('lawsuit_done_2')) this.forcedEventId = lawsuitEventId(2);
      else if (turn >= 12 && turn <= 16
        && flags.has('appraisal_adverse') && !flags.has('second_appeal_done')) {
        this.forcedEventId = 'career_second_appeal';
      }
      // 薄轮转：诉讼/二审之后再插——避免挡强制法务节点
      else if (turn >= 6 && flags.has('sub_emergency') && !flags.has('ward_rotation_done')) {
        this.forcedEventId = 'career_ward_rotation';
      }
      else if (turn >= 6 && hasSub && !flags.has('sub_emergency') && !flags.has('er_rotation_done')) {
        this.forcedEventId = 'career_er_rotation';
      }
      else if (turn >= 5 && !flags.has('legal_complaint_handled')) {
        setFlag('legal_complaint_due');
        this.forcedEventId = 'legal_first_complaint';
      }
      else if (flags.has('legal_dispute_due') && !flags.has('legal_dispute_open') && !flags.has('legal_resolution_chosen')) {
        this.forcedEventId = 'legal_seal_records';
      }
      // 诚信薄路径：普通局也可触达负向结局（插在法务节点之后）
      else if (turn >= 7 && flags.has('passed_zhuzhi') && !flags.has('title_paper_pressure_done')) {
        this.forcedEventId = 'career_title_paper_pressure';
      }
      else if (turn >= 11 && !flags.has('dept_scandal_done')) {
        this.forcedEventId = 'career_dept_authorship_scandal';
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
