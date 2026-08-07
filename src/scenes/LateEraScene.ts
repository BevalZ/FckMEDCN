import { BaseStageScene } from './BaseStageScene';
import { enterStage, getState } from '../data/gameState';
import { determineEnding } from '../data/endings';

abstract class LateEraSceneBase extends BaseStageScene {
  protected abstract readonly lateStage: 'pinnacle' | 'retirement' | 'eternity';

  create() {
    enterStage(this.lateStage);
    super.create();
  }

  protected shouldAdvanceToNextStage(): boolean {
    return getState().turnsInStage >= this.maxTurns;
  }

  protected triggerNextEvent() {
    const turn = getState().turnsInStage;
    const flags = getState().flags;
    const forcedByStage: Record<string, Record<number, string>> = {
      pinnacle: { 0: 'era6_role_choice', 2: 'health_hand_tremor', 4: 'era6_last_round', 6: 'era6_succession' },
      retirement: { 0: 'era7_retirement_day', 1: 'health_retirement_recovery', 3: 'era7_memoir', 5: 'era7_old_friends' },
      eternity: { 0: 'era8_fireplace', 1: 'era8_last_record', 3: 'era8_last_hospital_visit', 4: 'era8_last_person', 5: 'era8_will', 7: 'era8_final_clarity', 8: 'era8_memorial', 9: 'era8_tombstone' },
    };
    const id = forcedByStage[this.lateStage]?.[turn];
    const legalId = this.lateStage === 'pinnacle' && turn === 3 && flags.has('legal_admin_due')
      ? 'legal_admin_penalty'
      : this.lateStage === 'retirement' && turn === 2 && flags.has('legal_retrospective_due')
        ? 'legal_retirement_summons' : null;
    const crisisId = this.lateStage === 'pinnacle'
      ? flags.has('side_business_investigation_due') ? 'le_side_investigation'
        : flags.has('public_harassment_due') ? 'pi_health_authority_investigation'
          : flags.has('love_crisis_due') ? 'lv_divorce_agreement'
            : flags.has('social_obstruction_due') ? 'co_student_betrayal'
              : flags.has('research_data_adjusted') ? 'rs_retraction_notice'
                : flags.has('spirit_flashback_due') ? 'sp_flashback_highlight' : null
      : this.lateStage === 'retirement'
        ? flags.has('side_business_investigation_due') ? 'le_side_investigation'
          : flags.has('love_crisis_due') ? 'lv_divorce_agreement'
            : flags.has('research_data_adjusted') ? 'rs_retraction_notice' : null
        : null;
    if (legalId) this.forcedEventId = legalId;
    else if (id) {
      this.forcedEventId = id;
      // BaseStageScene 的 once 集合负责防重；这个 flag 只用于跨读档时保留节点消费记录。
      // 事件选项提交后才置位，若玩家按 ESC，节点仍可再次出现。
    } else if (crisisId) this.forcedEventId = crisisId;
    super.triggerNextEvent();
  }

  protected getStageLabelText(): string {
    const labels: Record<string, string> = { pinnacle: '时代6 · 巅峰与交接', retirement: '时代7 · 退休与回望', eternity: '时代8 · 归途与永恒' };
    const l = getState().lateLife;
    return `${labels[this.lateStage]} · 完成度 ${l.completion} · 传承 ${l.legacy}`;
  }

  protected transitionToNext() {
    const next: Record<string, string> = { pinnacle: 'RetirementScene', retirement: 'EternityScene', eternity: 'EndingScene' };
    const nextKey = next[this.lateStage];
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (nextKey === 'EndingScene') {
        const ending = determineEnding(getState());
        this.scene.start(nextKey, { endingId: ending.id });
      } else {
        this.scene.start(nextKey);
      }
    });
  }
}

export class PinnacleScene extends LateEraSceneBase {
  protected readonly lateStage = 'pinnacle' as const;
  constructor() { super({ key: 'PinnacleScene' }); this.stageName = 'pinnacle'; this.paletteName = 'career'; this.maxTurns = 8; }
}

export class RetirementScene extends LateEraSceneBase {
  protected readonly lateStage = 'retirement' as const;
  constructor() { super({ key: 'RetirementScene' }); this.stageName = 'retirement'; this.paletteName = 'career'; this.maxTurns = 8; }
}

export class EternityScene extends LateEraSceneBase {
  protected readonly lateStage = 'eternity' as const;
  constructor() { super({ key: 'EternityScene' }); this.stageName = 'eternity'; this.paletteName = 'career'; this.maxTurns = 12; }
}
