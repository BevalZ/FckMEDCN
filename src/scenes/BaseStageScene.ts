import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { EventCard } from '../ui/EventCard';
import { ConsequencePopup } from '../ui/ConsequencePopup';
import { getState, setFlag, hasFlag, addNews, enterStage } from '../data/gameState';
import { ALL_EVENTS } from '../data/events';
import type { EventChoice, GameEvent } from '../data/events';
import { drawStorylet, commitChoice, advanceQuarter } from '../data/turnFlow';
import { bindGameMenu } from '../ui/gameMenu';
import { HelpPanel } from '../ui/HelpPanel';
import { addTouchShortcuts } from '../ui/TouchShortcuts';
import { showNewsToast } from '../ui/newsToast';
import { scheduleNewsForQuarter } from '../data/newsScheduler';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { applyStageEntry, childQuarterCost, describeStageEconomy, getQuarterEconomy, houseMonthly } from '../data/economy';
import { getPalette, createBgTexture, createStageDecor, addScanlineOverlay, addVignette, stageAmbientTint } from '../ui/pixelArt';
import type { PaletteName } from '../ui/pixelArt';
import { CharacterSprite } from '../ui/CharacterSprite';
import type { StatDelta } from '../data/stats';
import { NewsTicker } from '../ui/NewsTicker';
import { sound } from '../audio/sound';
import { saveGame, consumePendingFired } from '../data/save';
import {
  getTalk, getAffinity, getNpcName, changeAffinity, TRUST_AT, DISTANT_AT, NPCS_BY_ID,
} from '../data/npc';
import { npcHiddenEventFor } from '../data/npcHiddenEvents';
import { launchMinigame } from '../ui/launchMinigame';
import type { ActiveMinigame } from '../ui/launchMinigame';
import type { MinigameResult } from '../ui/minigameTypes';
import type { MinigameKind } from '../ui/minigameTypes';
import type { NpcTalk } from '../data/npc';
import type { LifeStage } from '../data/gameState';

export abstract class BaseStageScene extends Phaser.Scene {
  protected hud!: HUD;
  protected eventCard!: EventCard;
  protected consequence!: ConsequencePopup;
  protected firedEvents: Set<string> = new Set();
  protected stageName!: string;
  protected paletteName!: PaletteName;
  protected stageLabel!: Phaser.GameObjects.Text;
  protected turnLabel!: Phaser.GameObjects.Text;
  protected econLabel!: Phaser.GameObjects.Text;
  protected helpPanel!: HelpPanel;
  protected nextSceneKey!: string;
  protected maxTurns: number = 20;
  protected isEventShowing = false;
  protected news!: NewsTicker;
  protected currentEvent: GameEvent | null = null;
  protected forcedEventId: string | null = null;
  protected character!: CharacterSprite;
  private firedNews: Set<string> = new Set();
  // —— 跨阶段导师（卡片模式）——
  private advisorHint!: Phaser.GameObjects.Text;
  private advisorTalkedThisTurn = false;
  private talkingAdvisor = false;
  private advisorChoices: NpcTalk['choices'] = [];
  private minigame: ActiveMinigame | null = null;

  create() {
    enterStage(this.stageName as LifeStage);
    const pal = getPalette(this.paletteName);

    createBgTexture(this, `bg_${this.paletteName}`, this.paletteName);
    const bg = this.add.image(0, 0, `bg_${this.paletteName}`).setOrigin(0);
    bg.setTint(stageAmbientTint(this.paletteName, getState().quarter));

    createStageDecor(this, `decor_${this.paletteName}`, this.paletteName);
    this.add.image(0, 54, `decor_${this.paletteName}`).setOrigin(0).setDepth(1);
    addScanlineOverlay(this, 5, 0.08);
    addVignette(this, 6, 0.9);
    this.character = new CharacterSprite(this, this.paletteName);

    this.hud = new HUD(this, this.paletteName);
    this.eventCard = new EventCard(this, this.paletteName, (choice, idx) => this.handleChoice(choice, idx));
    this.consequence = new ConsequencePopup(this, this.paletteName);

    this.stageLabel = this.add.text(480, 68, this.getStageLabelText(), {
      fontFamily: '"Courier New", monospace', fontSize: '15px',
      color: `#${pal.accent.toString(16).padStart(6, '0')}`, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(10);

    this.turnLabel = this.add.text(480, 88, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#888888',
    }).setOrigin(0.5, 0).setDepth(10);

    this.econLabel = this.add.text(480, 106, '', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#9aa0b5',
    }).setOrigin(0.5, 0).setDepth(10);
    this.updateEconLabel();

    // 导师提示：仅在 mentor 阶段显示，T 键对话
    this.advisorHint = this.add.text(480, 122, '', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#c5cae9',
    }).setOrigin(0.5, 0).setDepth(10).setVisible(false);
    this.refreshAdvisorHint();
    this.input.keyboard?.on('keydown-T', () => this.tryTalkAdvisor());

    this.buildStage();
    this.hud.update(getState().stats, this.paletteName);
    this.character.setSanity(getState().stats.sanity);
    this.updateTurnLabel();
    this.news = new NewsTicker(this, this.paletteName);

    // 读档恢复：重建本阶段已触发事件集合，避免 once 事件重复触发
    const pending = consumePendingFired();
    if (pending) {
      this.firedEvents = new Set(pending.firedEvents);
      this.firedNews = new Set(pending.firedNews);
    }

    this.pumpNewsForQuarter();

    sound.ensure();
    sound.setBgmMood(this.paletteName);
    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    const coreBusy = () => this.minigame !== null || this.isEventShowing || this.consequence.busy;
    const menu = bindGameMenu(
      this,
      this.consequence,
      () => coreBusy() || this.helpPanel?.busy,
      () => {
        this.hud.update(getState().stats, this.paletteName);
        this.updateEconLabel();
      },
    );
    this.add.text(940, 106, 'R 游戏菜单', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#9aa0b5',
    }).setOrigin(1, 0).setDepth(10);

    // 操作帮助（H 键）
    this.helpPanel = new HelpPanel(this, [
      '选择：数字键 / 字母键 / ↑↓ + 回车',
      '导师对话 T（可用阶段）',
      '游戏菜单 R · 帮助 H · 静音 M',
      'ESC 跳过本事件（不消耗、可再遇）',
      `本阶段：${this.getStageLabelText()}`,
      '提示：心理归零会触发危机结局，注意休息。',
    ], () => coreBusy() || menu.busy);
    const touchActions = [
      { label: '帮助', onPress: () => this.helpPanel.toggle() },
      { label: '菜单', onPress: () => menu.open() },
    ];
    if (this.hasAdvisor()) touchActions.unshift({
      label: '导师', onPress: () => { if (!menu.busy && !this.helpPanel.busy) this.tryTalkAdvisor(); },
    });
    addTouchShortcuts(this, touchActions, { startY: 158 });

    this.autoSave();
    this.presentStageBriefing();
  }

  /** 当前阶段是否有跨阶段导师可对话 */
  private hasAdvisor(): boolean {
    const def = NPCS_BY_ID['advisor'];
    return !!def && def.stages.includes(this.stageName as LifeStage);
  }

  private refreshAdvisorHint() {
    if (!this.hasAdvisor()) { this.advisorHint.setVisible(false); return; }
    const aff = getAffinity('advisor');
    const hearts = Math.max(0, Math.min(5, Math.round(aff / 20)));
    const heartStr = '♥'.repeat(hearts) + '♡'.repeat(5 - hearts);
    const advisorName = getNpcName('advisor');
    const status = this.advisorTalkedThisTurn ? '（本季已聊）' : `[T] 找${advisorName}谈谈`;
    this.advisorHint.setText(`导师·${advisorName} ${heartStr}  ${status}`).setVisible(true);
  }

  private tryTalkAdvisor() {
    if (!this.hasAdvisor()) return;
    if (this.isEventShowing || this.minigame || this.consequence.busy || this.helpPanel?.busy) return;
    if (this.advisorTalkedThisTurn) {
      const t = this.add.text(480, 140, '这季度已经和导师谈过了', {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#b0bec5',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({
        targets: t, alpha: 1, duration: 200,
        onComplete: () => this.tweens.add({
          targets: t, alpha: 0, y: 128, duration: 700, delay: 400, onComplete: () => t.destroy(),
        }),
      });
      return;
    }
    this.advisorTalkedThisTurn = true;
    this.talkingAdvisor = true;
    this.refreshAdvisorHint();

    const hidden = npcHiddenEventFor({
      npcId: 'advisor',
      stage: this.stageName as LifeStage,
      spotId: null,
      firedEvents: this.firedEvents,
    });
    if (hidden) {
      if (hidden.once) this.firedEvents.add(hidden.id);
      this.advisorChoices = [];
      this.currentEvent = hidden;
      this.isEventShowing = true;
      sound.click();
      this.eventCard.show(hidden);
      return;
    }

    const talk = getTalk('advisor');
    if (!talk) {
      this.talkingAdvisor = false;
      this.advisorTalkedThisTurn = false;
      this.refreshAdvisorHint();
      return;
    }

    this.advisorChoices = talk.choices;

    const ev: GameEvent = {
      id: 'npc_talk_advisor',
      stage: this.stageName,
      title: `${getNpcName('advisor')} · 导师`,
      body: talk.text,
      category: 'social',
      weight: 0,
      choices: talk.choices.map(c => ({
        text: `${c.label}　[好感 ${c.affinity > 0 ? '+' : ''}${c.affinity}]`,
        delta: (c.delta ?? {}) as StatDelta,
        consequence: c.reply,
        flagSet: c.flagSet,
      })),
    };
    this.currentEvent = ev;
    this.isEventShowing = true;
    sound.click();
    this.eventCard.show(ev);
  }

  // 阶段经济简报：首次进入某阶段时展示收支说明，并结算一次性入学/入职收支。
  private presentStageBriefing() {
    const entry = applyStageEntry(this.stageName);
    if (entry) {
      this.hud.update(getState().stats, this.paletteName);
      this.updateEconLabel();
    }
    const briefFlag = 'brief_' + this.stageName;
    const desc = describeStageEconomy(this.stageName);
    if (desc && !hasFlag(briefFlag)) {
      setFlag(briefFlag);
      this.consequence.show(desc, {}, () => {
        this.time.delayedCall(150, () => this.triggerNextEvent());
      });
    } else {
      this.time.delayedCall(400, () => this.triggerNextEvent());
    }
  }

  private updateEconLabel() {
    const e = getQuarterEconomy(this.stageName);
    const netStr = `${e.net >= 0 ? '+' : ''}¥${e.net}`;
    const premStr = e.cityPremiumPct > 0 ? `（城市溢价+${Math.round(e.cityPremiumPct * 100)}%）` : '';
    this.econLabel.setText(`本季收支 ▸ 收入¥${e.income} − 支出¥${e.cost} = 净 ${netStr} ${premStr}`);
    this.econLabel.setColor(e.net >= 0 ? '#9fe6b0' : '#f0a0a0');
  }

  // 推进一个季度并结算固定收支（无论是否有事件触发，保证收支稳定）。
  private progressTurn() {
    const { econ, grieving, integrity, mentalDecline, affinity, datingOpportunity, pandemic, patientSafety } = advanceQuarter(this.stageName);
    this.showQuarterBill(econ);
    if (grieving) {
      const g = this.add.text(480, 150, '思念 · 心理 -2', {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#ff8a80',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: g, alpha: 0, y: 134, duration: 900, delay: 500, onComplete: () => g.destroy() });
      } });
    }
    if (mentalDecline) {
      const t = this.add.text(480, 166, `财务焦虑 · 心理 ${mentalDecline.sanityDelta}`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#ff8a80',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 150, duration: 900, delay: 500, onComplete: () => t.destroy() });
      } });
    }
    if (datingOpportunity) {
      const t = this.add.text(480, 182, '生活机会：有人想介绍你们认识', {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#f8bbd0',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 166, duration: 900, delay: 600, onComplete: () => t.destroy() });
      } });
    }
    if (pandemic.started || pandemic.ended || pandemic.active) {
      const t = this.add.text(480, 198, `疫情：${pandemic.message}`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: pandemic.ended ? '#9fe6b0' : '#ffb74d',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 182, duration: 900, delay: 600, onComplete: () => t.destroy() });
      } });
    }
    if (patientSafety.level !== 'none') {
      const color = patientSafety.level === 'major' ? '#ff5252' : patientSafety.level === 'adverse' ? '#ff8a80' : '#ffd180';
      const t = this.add.text(480, 214, `患者安全：${patientSafety.message}`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color,
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 240, onComplete: () => this.tweens.add({ targets: t, alpha: 0, y: 198, duration: 1000, delay: 700, onComplete: () => t.destroy() }) });
    }
    if (affinity.messages.length > 0) {
      const deltaText = Object.entries(affinity.delta)
        .filter(([, v]) => typeof v === 'number' && v !== 0)
        .map(([k, v]) => `${(STAT_LABELS as Record<string, string>)[k] ?? k}${(v as number) > 0 ? '+' : ''}${v}`)
        .join(' ');
      const t = this.add.text(480, 182, `关系网络：${affinity.messages.join('、')}${deltaText ? ` · ${deltaText}` : ''}`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#c5cae9',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 166, duration: 900, delay: 500, onComplete: () => t.destroy() });
      } });
    }
    if (integrity.level !== 'none') {
      sound.bad();
      this.consequence.show(`【学术诚信】${integrity.message}`, {}, () => {
        this.hud.update(getState().stats, this.paletteName);
      });
    }
    // 新季度：导师对话额度重置
    this.advisorTalkedThisTurn = false;
    this.refreshAdvisorHint();
  }

  private showQuarterBill(e: { income: number; cost: number; net: number; financeNote?: string }) {
    if (e.income === 0 && e.cost === 0) return;
    const s = getState();
    // 结构化小账单（深挖第五部分 R38 / REVIEW-PLAYABILITY R15 落地）：
    // 收入 / 支出（含房贷、育儿的拆分行）/ 净额 / 资产。
    const rows: string[] = [];
    rows.push(`季度结算 ▸ 收入 ¥${e.income.toLocaleString()}`);
    if (s.flags.has('bought_house')) {
      rows.push(`  其中 房贷 ¥-${houseMonthly().toLocaleString()}`);
    }
    if (s.hasChild) rows.push(`  其中 育儿 ¥-${childQuarterCost().toLocaleString()}`);
    rows.push(`  支出 ¥${e.cost.toLocaleString()} = 净 ${e.net >= 0 ? '+' : ''}¥${e.net.toLocaleString()}`);
    if ((s.assets ?? 0) > 0) rows.push(`  资产 ¥${(s.assets ?? 0).toLocaleString()}${e.financeNote ?? ''}`);
    const text = rows.join('\n');
    const color = e.net >= 0 ? '#69f0ae' : '#ff8a80';
    const t = this.add.text(480, 122, text, {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color, fontStyle: 'bold',
      align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 240, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 104, duration: 900, delay: 500, onComplete: () => t.destroy() });
      },
    });
  }

  protected buildStage() {}
  protected getStageLabelText(): string { return this.stageName; }

  protected updateTurnLabel() {
    const state = getState();
    const maritalLabel: Record<string, string> = { single: '单身', dating: '恋爱中', married: '已婚' };
    let life = `感情:${maritalLabel[state.marital]}`;
    if (state.marital !== 'single' && state.spouse) life += `(${state.spouse})`;
    life += ` | 家人:${state.familyAlive}`;
    if (state.hasChild) life += ' | 有娃';
    this.turnLabel.setText(`第${state.year}年 Q${state.quarter} | ${state.stats.age}岁 | 阶段第${state.turnsInStage}回合 | ${life}`);
  }

  protected triggerNextEvent() {
    if (this.isEventShowing) return;
    const state = getState();

    if (this.shouldAdvanceToNextStage()) {
      this.time.delayedCall(500, () => this.transitionToNext());
      return;
    }

    if (state.stats.sanity <= 0) {
      this.scene.start('MentalCrisisScene', { fromStage: this.stageName });
      return;
    }

    if (this.forcedEventId) {
      const forced = ALL_EVENTS.find(e => e.id === this.forcedEventId);
      this.forcedEventId = null;
      if (forced) {
        const stages = Array.isArray(forced.stage) ? forced.stage : [forced.stage];
        const valid = stages.includes(this.stageName)
          && !(forced.once && this.firedEvents.has(forced.id))
          && !(forced.excludeFlag && state.flags.has(forced.excludeFlag));
        if (valid) {
          if (forced.once) this.firedEvents.add(forced.id);
          this.presentEvent(forced);
          return;
        }
      }
    }

    // 走 turnFlow 的统一抽取逻辑（含手写事件优先），与 CampusScene 保持一致。
    const ev = drawStorylet(this.stageName, this.firedEvents);
    if (!ev) {
      this.doPassiveTurn();
      return;
    }

    if (ev.once) this.firedEvents.add(ev.id);
    this.presentEvent(ev);
  }

  /** 打开事件：若带 minigame 则先跑小游戏，否则直接弹卡 */
  private presentEvent(ev: GameEvent) {
    this.currentEvent = ev;
    this.isEventShowing = true;
    if (ev.minigame) {
      this.minigame = launchMinigame(this, ev.minigame as MinigameKind, ev.title);
      void this.minigame.play().then(r => this.resolveMinigame(r));
      return;
    }
    // 卡片阶段也允许 ESC 跳过：不消费 once、不结算选择，按"无事件"推进本回合。
    this.eventCard.show(ev, () => this.skipCurrentEvent(ev));
  }

  /** ESC 跳过当前事件：视作本回合没有事件，直接推进（once 事件回滚，之后还能再遇到） */
  private skipCurrentEvent(ev: GameEvent) {
    if (ev.once) this.firedEvents.delete(ev.id);
    this.eventCard.hide();
    this.isEventShowing = false;
    this.currentEvent = null;
    this.doPassiveTurn();
  }

  private resolveMinigame(r: MinigameResult) {
    this.minigame = null;
    // 执医考试：及格以上自动拿到 licensed
    let flagSet = r.flagSet;
    if (this.currentEvent?.id === 'licensure_exam' && r.grade !== 'miss') {
      flagSet = 'licensed';
    }
    const choice: EventChoice = {
      text: r.grade,
      delta: r.delta,
      flagSet,
      consequence: r.consequence,
    };
    this.handleChoice(choice, 0);
  }

  update(_time: number, delta: number) {
    if (this.minigame) this.minigame.update(_time, delta);
  }

  protected handleChoice(choice: EventChoice, idx: number) {
    this.eventCard.hide();
    this.isEventShowing = false;

    sound.click();

    // 导师对话：先结算好感度
    const wasAdvisorTalk = this.talkingAdvisor;
    if (this.talkingAdvisor) {
      const picked = this.advisorChoices[idx];
      if (picked) {
        const before = getAffinity('advisor');
        const after = changeAffinity('advisor', picked.affinity);
        this.refreshAdvisorHint();
        if (after >= TRUST_AT && before < TRUST_AT) {
          const t = this.add.text(480, 140, `${getNpcName('advisor')}开始信任你了`, {
            fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ff8a95',
          }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
          this.tweens.add({
            targets: t, alpha: 1, duration: 200,
            onComplete: () => this.tweens.add({
              targets: t, alpha: 0, y: 128, duration: 800, delay: 500, onComplete: () => t.destroy(),
            }),
          });
        } else if (after <= DISTANT_AT && before > DISTANT_AT) {
          const t = this.add.text(480, 140, `${getNpcName('advisor')}和你疏远了`, {
            fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#78909c',
          }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
          this.tweens.add({
            targets: t, alpha: 1, duration: 200,
            onComplete: () => this.tweens.add({
              targets: t, alpha: 0, y: 128, duration: 800, delay: 500, onComplete: () => t.destroy(),
            }),
          });
        }
      }
      this.talkingAdvisor = false;
      this.advisorChoices = [];
    }

    const outcome = commitChoice(choice, this.currentEvent ?? undefined);
    // 导师对话不推进季度、不占用 storylet——只是一次社交行动
    const isAdvisorTalk = wasAdvisorTalk || this.currentEvent?.id === 'npc_talk_advisor';
    if (!isAdvisorTalk && choice.nextEventId) this.forcedEventId = choice.nextEventId;
    this.playDeltaSound(choice.delta as StatDelta);
    this.showDeltaFloaters(choice.delta as StatDelta);
    if (outcome.clinicalSatisfaction) {
      const s = outcome.clinicalSatisfaction;
      const t = this.add.text(480, 140, `临床满足 · 心理 +${s.sanityGain}`, {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#69f0ae',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 220, onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 124, duration: 900, delay: 500, onComplete: () => t.destroy() });
      } });
    }
    this.autoSave();

    const ev = this.currentEvent;
    if (ev?.newsTickerAfter) {
      const s = getState();
      addNews({ year: s.year, quarter: s.quarter, headline: ev.newsTickerAfter, type: 'irony' });
      this.news.refresh(getState().newsLog.map(n => n.headline));
      sound.news();
      showNewsToast(this, ev.newsTickerAfter);
    }

    const consequenceText = choice.consequence ?? '你做出了选择。';
    this.consequence.show(consequenceText, choice.delta as StatDelta, () => {
      if (isAdvisorTalk) {
        this.hud.update(getState().stats, this.paletteName);
        this.character.setSanity(getState().stats.sanity);
        this.autoSave();
        this.time.delayedCall(200, () => {
          if (!this.isEventShowing) this.triggerNextEvent();
        });
        return;
      }
      this.progressTurn();
      this.pumpNewsForQuarter();
      this.hud.update(getState().stats, this.paletteName);
      this.character.setSanity(getState().stats.sanity);
      this.updateTurnLabel();
      this.autoSave();
      this.time.delayedCall(200, () => this.triggerNextEvent());
    });
  }

  protected pumpNewsForQuarter() {
    const { stage, year, quarter } = getState();
    const pool = scheduleNewsForQuarter({ stage, year, quarter, firedIds: this.firedNews });
    let added = false;
    for (const n of pool) { addNews(n); this.firedNews.add(n.id); added = true; }
    if (added) { this.news.refresh(getState().newsLog.map(n => n.headline)); sound.news(); }
  }

  private playDeltaSound(delta: StatDelta) {
    if (!delta) return;
    let net = 0;
    for (const v of Object.values(delta)) net += v;
    if (net > 0) sound.good();
    else if (net < 0) sound.bad();
  }

  private showDeltaFloaters(delta: StatDelta) {
    if (!delta) return;
    const order = [...HUD_STATS, 'clinical', 'research', 'fakeRisk'];
    let shown = 0;
    order.forEach((key, i) => {
      const v = (delta as Record<string, number>)[key];
      if (typeof v !== 'number' || v === 0) return;
      const x = i < HUD_STATS.length ? 10 + i * 117 : 10 + (i - HUD_STATS.length) * 150;
      const label = (STAT_LABELS as Record<string, string>)[key] ?? key;
      const icon = (STAT_ICONS as Record<string, string>)[key] ?? '';
      const good = key === 'fakeRisk' ? v < 0 : v > 0;
      const color = good ? '#69f0ae' : '#ff5252';
      const t = this.add.text(x, 46, `${icon}${label} ${v > 0 ? '+' : ''}${v}`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color, fontStyle: 'bold',
      }).setDepth(120).setAlpha(0);
      this.tweens.add({
        targets: t, y: 14, alpha: 1,
        duration: 260, delay: shown * 90, ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: t, y: -4, alpha: 0, duration: 520, delay: 300, onComplete: () => t.destroy() });
        },
      });
      shown++;
    });
  }

  protected doPassiveTurn() {
    this.progressTurn();
    this.hud.update(getState().stats, this.paletteName);
    this.character.setSanity(getState().stats.sanity);
    this.updateTurnLabel();
    this.autoSave();
    this.time.delayedCall(300, () => this.triggerNextEvent());
  }

  protected autoSave() {
    saveGame(this.sys.settings.key, Array.from(this.firedEvents), Array.from(this.firedNews));
  }

  protected abstract shouldAdvanceToNextStage(): boolean;

  protected transitionToNext() {
    sound.transition();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.nextSceneKey));
  }
}
