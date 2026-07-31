import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { EventCard } from '../ui/EventCard';
import { ConsequencePopup } from '../ui/ConsequencePopup';
import { getState, setFlag, hasFlag, addNews } from '../data/gameState';
import { ALL_EVENTS } from '../data/events';
import type { EventChoice, GameEvent } from '../data/events';
import { drawStorylet, commitChoice, advanceQuarter } from '../data/turnFlow';
import { bindGameMenu } from '../ui/gameMenu';
import { HelpPanel } from '../ui/HelpPanel';
import { NEWS_TICKER } from '../data/news';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { applyStageEntry, describeStageEconomy, getQuarterEconomy } from '../data/economy';
import { getPalette, createBgTexture, createStageDecor, addScanlineOverlay, addVignette, stageAmbientTint } from '../ui/pixelArt';
import type { PaletteName } from '../ui/pixelArt';
import { CharacterSprite } from '../ui/CharacterSprite';
import type { StatDelta } from '../data/stats';
import { NewsTicker } from '../ui/NewsTicker';
import { sound } from '../audio/sound';
import { saveGame, consumePendingFired } from '../data/save';
import {
  getTalk, getAffinity, changeAffinity, TRUST_AT, DISTANT_AT, NPCS_BY_ID,
} from '../data/npc';
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
  private forcedEventId: string | null = null;
  protected character!: CharacterSprite;
  private firedNews: Set<string> = new Set();
  // —— 跨阶段导师（卡片模式）——
  private advisorHint!: Phaser.GameObjects.Text;
  private advisorTalkedThisTurn = false;
  private talkingAdvisor = false;
  private advisorChoices: NpcTalk['choices'] = [];
  private minigame: ActiveMinigame | null = null;

  create() {
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

    // 重新开档（R 键）：确认后放弃本局、直接开新档
    bindGameMenu(this, this.consequence, () => this.minigame !== null || this.isEventShowing);
    this.add.text(940, 106, 'R 重新开档', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#9aa0b5',
    }).setOrigin(1, 0).setDepth(10);

    // 操作帮助（H 键）
    this.helpPanel = new HelpPanel(this, [
      '选择：数字键 / 字母键 / ↑↓ + 回车',
      '任务清单 Q · 导师对话 T',
      '重新开档 R · 帮助 H · 静音 M',
      'ESC 跳过本事件（不消耗、可再遇）',
      `本阶段：${this.getStageLabelText()}`,
      '提示：心理归零会触发危机结局，注意休息。',
    ], () => this.isEventShowing || this.minigame !== null || this.consequence.busy);

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
    const status = this.advisorTalkedThisTurn ? '（本季已聊）' : '[T] 找周教授谈谈';
    this.advisorHint.setText(`导师·周教授 ${heartStr}  ${status}`).setVisible(true);
  }

  private tryTalkAdvisor() {
    if (!this.hasAdvisor()) return;
    if (this.isEventShowing) return;
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
    const talk = getTalk('advisor');
    if (!talk) return;

    this.advisorTalkedThisTurn = true;
    this.talkingAdvisor = true;
    this.advisorChoices = talk.choices;
    this.refreshAdvisorHint();

    const ev: GameEvent = {
      id: 'npc_talk_advisor',
      stage: this.stageName,
      title: '周教授 · 导师',
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
    const { econ, grieving, integrity } = advanceQuarter(this.stageName);
    this.showQuarterBill(econ);
    if (grieving) {
      const g = this.add.text(480, 150, '思念 · 心理 -2', {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#ff8a80',
      }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 240, onComplete: () => {
        this.tweens.add({ targets: g, alpha: 0, y: 134, duration: 900, delay: 500, onComplete: () => g.destroy() });
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

  private showQuarterBill(e: { income: number; cost: number; net: number }) {
    if (e.income === 0 && e.cost === 0) return;
    const netStr = `${e.net >= 0 ? '+' : ''}¥${e.net}`;
    const text = `季度结算 ▸ 收¥${e.income} 支¥${e.cost} = 净 ${netStr}`;
    const color = e.net >= 0 ? '#69f0ae' : '#ff8a80';
    const t = this.add.text(480, 128, text, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 240, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 112, duration: 900, delay: 500, onComplete: () => t.destroy() });
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
    if (this.talkingAdvisor) {
      const picked = this.advisorChoices[idx];
      if (picked) {
        const before = getAffinity('advisor');
        const after = changeAffinity('advisor', picked.affinity);
        this.refreshAdvisorHint();
        if (after >= TRUST_AT && before < TRUST_AT) {
          const t = this.add.text(480, 140, '周教授开始信任你了', {
            fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ff8a95',
          }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
          this.tweens.add({
            targets: t, alpha: 1, duration: 200,
            onComplete: () => this.tweens.add({
              targets: t, alpha: 0, y: 128, duration: 800, delay: 500, onComplete: () => t.destroy(),
            }),
          });
        } else if (after <= DISTANT_AT && before > DISTANT_AT) {
          const t = this.add.text(480, 140, '周教授和你疏远了', {
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

    commitChoice(choice);
    // 导师对话不推进季度、不占用 storylet——只是一次社交行动
    const isAdvisorTalk = this.currentEvent?.id === 'npc_talk_advisor';
    if (!isAdvisorTalk && choice.nextEventId) this.forcedEventId = choice.nextEventId;
    this.playDeltaSound(choice.delta as StatDelta);
    this.showDeltaFloaters(choice.delta as StatDelta);
    this.autoSave();

    const ev = this.currentEvent;
    if (ev?.newsTickerAfter) {
      const s = getState();
      addNews({ year: s.year, quarter: s.quarter, headline: ev.newsTickerAfter, type: 'irony' });
      this.news.refresh(getState().newsLog.map(n => n.headline));
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
    const { year, quarter } = getState();
    let pool = NEWS_TICKER.filter(n => !this.firedNews.has(n.id) && n.year === year && n.quarter === quarter);
    if (pool.length === 0) pool = NEWS_TICKER.filter(n => !this.firedNews.has(n.id) && n.year === year);
    if (pool.length === 0) {
      const unfired = NEWS_TICKER.filter(n => !this.firedNews.has(n.id));
      if (unfired.length > 0) {
        const maxY = unfired.reduce((m, n) => Math.max(m, n.year), 0);
        if (maxY <= year + 1) pool = unfired.filter(n => n.year === maxY);
      }
    }
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
