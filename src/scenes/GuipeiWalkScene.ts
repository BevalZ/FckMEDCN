import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { EventCard } from '../ui/EventCard';
import { ConsequencePopup } from '../ui/ConsequencePopup';
import { NewsTicker } from '../ui/NewsTicker';
import { InteractPrompt } from '../ui/InteractPrompt';
import { QuestLog, guipeiQuests } from '../ui/QuestLog';
import { bindGameMenu } from '../ui/gameMenu';
import { HelpPanel } from '../ui/HelpPanel';
import { showNewsToast } from '../ui/newsToast';
import { Walker, createWalkerKeys } from '../ui/Walker';
import type { WalkerKeys } from '../ui/Walker';
import { renderTileMap } from '../ui/tilemap';
import { npcTileNear } from '../ui/npcPlacement';
import { addScanlineOverlay, addVignette, getPalette, stageAmbientTint } from '../ui/pixelArt';
import { getState, updateStats, setFlag, hasFlag, addNews } from '../data/gameState';
import type { LifeStage } from '../data/gameState';
import { drawStorylet, hasStorylet, commitChoice, advanceQuarter } from '../data/turnFlow';
import { NpcSprite } from '../ui/NpcSprite';
import {
  npcsForStage, npcSpotAt, getTalk, getAffinity, changeAffinity, TRUST_AT, DISTANT_AT,
} from '../data/npc';
import type { NpcTalk } from '../data/npc';
import type { EventChoice, GameEvent } from '../data/events';
import { ALL_EVENTS } from '../data/events';
import type { StatDelta } from '../data/stats';
import { NEWS_TICKER } from '../data/news';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { applyStageEntry, describeStageEconomy } from '../data/economy';
import { ACTIONS_PER_QUARTER, SLEEP_RECOVER } from '../data/campusMap';
import type { Spot } from '../data/guipeiMap';
import { GUIPEI_SPEC, GUIPEI_SPOTS, GUIPEI_SPAWN, GUIPEI_ORIGIN_Y, guipeiExhaustion } from '../data/guipeiMap';
import { launchMinigame } from '../ui/launchMinigame';
import type { ActiveMinigame } from '../ui/launchMinigame';
import type { MinigameResult } from '../ui/minigameTypes';
import type { MinigameKind } from '../ui/minigameTypes';
import { sound } from '../audio/sound';
import { saveGame, consumePendingFired } from '../data/save';
import { determineEnding } from '../data/endings';

const STAGE = 'guipei';
const MAX_TURNS = 12;
/** 与 NPC 的对话距离 */
const NPC_TALK_DIST = 44;

export class GuipeiWalkScene extends Phaser.Scene {
  private hud!: HUD;
  private eventCard!: EventCard;
  private consequence!: ConsequencePopup;
  private news!: NewsTicker;
  private prompt!: InteractPrompt;
  private walker!: Walker;
  private keys!: WalkerKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private infoLabel!: Phaser.GameObjects.Text;
  private apLabel!: Phaser.GameObjects.Text;
  private questLog!: QuestLog;
  private minigame: ActiveMinigame | null = null;
  private actionsLeft = ACTIONS_PER_QUARTER;
  private storyletUsed = false;
  private availability: Record<string, boolean> = {};
  private firedEvents: Set<string> = new Set();
  private firedNews: Set<string> = new Set();
  private busy = true;
  private leaving = false;
  private tileCenter!: (col: number, row: number) => { x: number; y: number };
  private isSolid!: (col: number, row: number) => boolean;
  // —— NPC（M3）——
  private npcs: NpcSprite[] = [];
  private talkedThisQuarter = new Set<string>();
  private talkingWith: NpcSprite | null = null;
  private talkChoices: NpcTalk['choices'] = [];
  private npcHint!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GuipeiWalkScene' }); }

  create() {
    this.leaving = false;
    this.busy = true;

    const { tileCenter, solids, image, isSolid } = renderTileMap(
      this, 'guipei_map', GUIPEI_SPEC, STAGE, GUIPEI_ORIGIN_Y,
    );
    this.tileCenter = tileCenter;
    this.isSolid = isSolid;
    image.setTint(stageAmbientTint(STAGE, getState().quarter));
    addScanlineOverlay(this, 5, 0.06);
    addVignette(this, 6, 0.85);

    this.hud = new HUD(this, STAGE);
    this.eventCard = new EventCard(this, STAGE, (choice, idx) => this.handleChoice(choice, idx));
    this.consequence = new ConsequencePopup(this, STAGE);
    this.news = new NewsTicker(this, STAGE);
    this.buildInfoBar();
    this.questLog = new QuestLog(this);

    const spawn = tileCenter(GUIPEI_SPAWN[0], GUIPEI_SPAWN[1]);
    this.physics.world.setBounds(0, GUIPEI_ORIGIN_Y, GUIPEI_SPEC.cols * 32, GUIPEI_SPEC.rows * 32);
    this.walker = new Walker(this, STAGE, spawn.x, spawn.y);
    this.physics.add.collider(this.walker.sprite, solids);

    this.prompt = new InteractPrompt(this, STAGE, GUIPEI_SPOTS, tileCenter);
    this.keys = createWalkerKeys(this);
    this.interactKey = this.input.keyboard!.addKey('E');

    // NPC 交互提示（跟随最近的 NPC 显示）
    this.npcHint = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace', fontSize: '11px',
      color: '#ffe08a', backgroundColor: '#0a0a0fcc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(21).setVisible(false);

    const pending = consumePendingFired();
    if (pending) {
      this.firedEvents = new Set(pending.firedEvents);
      this.firedNews = new Set(pending.firedNews);
    }

    sound.ensure();
    sound.setBgmMood(STAGE);
    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    // 重新开档（R 键）
    bindGameMenu(this, this.consequence, () => this.minigame !== null || this.eventCard.busy);

    // 操作帮助（H 键）
    new HelpPanel(this, [
      '移动 WASD/方向键 · 交互 E',
      '任务清单 Q · 导师对话 T',
      '重新开档 R · 帮助 H · 静音 M',
      'ESC 取消当前交互',
      '提示：规培是心理压力最大的阶段，注意休息。',
      '执业医师考试 通过后才能独立执业。',
    ], () => this.minigame !== null || this.eventCard.busy || this.consequence.busy);

    this.presentStageBriefing();
  }

  private buildInfoBar() {
    const pal = getPalette(STAGE);
    const bar = this.add.graphics().setDepth(99);
    bar.fillStyle(pal.panel, 0.82);
    bar.fillRect(0, 56, 960, 22);
    bar.fillStyle(pal.accent, 0.45);
    bar.fillRect(0, 77, 960, 1);

    this.infoLabel = this.add.text(10, 60, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#cfe8ff',
    }).setDepth(100);
    this.apLabel = this.add.text(950, 60, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(1, 0).setDepth(100);
  }

  private refreshInfoBar() {
    const s = getState();
    const days = s.turnsInStage;
    this.infoLabel.setText(
      `第${s.year}年 Q${s.quarter} | ${s.stats.age}岁 | 规培第 ${days}/${MAX_TURNS} 季  ·  移动 WASD/方向键 · 交互 E · 任务 Q · R 重新开档`,
    );
    const left = Math.max(0, this.actionsLeft);
    const dots = '●'.repeat(left) + '○'.repeat(Math.max(0, ACTIONS_PER_QUARTER - left));
    this.apLabel.setText(`行动点 ${dots}`);
    this.questLog?.setItems(guipeiQuests(s.flags, this.actionsLeft, this.storyletUsed));
  }

  private presentStageBriefing() {
    if (applyStageEntry(STAGE)) this.hud.update(getState().stats, STAGE);
    const briefFlag = 'brief_' + STAGE;
    const desc = describeStageEconomy(STAGE);
    if (desc && !hasFlag(briefFlag)) {
      setFlag(briefFlag);
      this.walker.freeze();
      this.consequence.show(desc, {}, () => this.beginQuarter());
    } else {
      this.beginQuarter();
    }
  }

  private beginQuarter() {
    this.actionsLeft = ACTIONS_PER_QUARTER;
    this.storyletUsed = false;
    this.talkedThisQuarter.clear();
    this.placeNpcs();
    this.refreshAvailability();
    this.refreshInfoBar();
    this.setBusy(false);
  }

  // —— NPC（M3）：按季度轮换所在地点，站在门口旁 ——
  private placeNpcs() {
    for (const s of this.npcs) s.destroy();
    this.npcs = [];
    const turn = getState().turnsInStage;
    const usedAt: Record<string, number> = {};
    for (const def of npcsForStage(STAGE as LifeStage)) {
      const spotId = npcSpotAt(def, turn);
      if (!spotId) continue;
      const spot = GUIPEI_SPOTS.find(s => s.id === spotId);
      if (!spot) continue;
      const n = usedAt[spotId] ?? 0;
      usedAt[spotId] = n + 1;
      const tile = npcTileNear(
        { cols: GUIPEI_SPEC.cols, rows: GUIPEI_SPEC.rows, isSolid: this.isSolid },
        spot.door[0], spot.door[1], n,
      );
      if (!tile) continue;
      const c = this.tileCenter(tile.col, tile.row);
      const sprite = new NpcSprite(this, def, c.x, c.y);
      sprite.setBang(this, true);
      this.npcs.push(sprite);
    }
  }

  private nearestNpc(spotDist: number): NpcSprite | null {
    let best: NpcSprite | null = null;
    let bestD = NPC_TALK_DIST;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.walker.x, this.walker.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best && bestD < spotDist ? best : null;
  }

  private talkTo(npc: NpcSprite) {
    if (this.talkedThisQuarter.has(npc.def.id)) {
      this.floatMessage(`${npc.def.name}：这季度已经聊过了`, '#b0bec5');
      return;
    }
    const talk = getTalk(npc.def.id);
    if (!talk) return;
    this.talkedThisQuarter.add(npc.def.id);
    npc.setBang(this, false);
    this.talkingWith = npc;
    this.talkChoices = talk.choices;
    const ev: GameEvent = {
      id: `npc_talk_${npc.def.id}`,
      stage: STAGE,
      title: `${npc.def.name} · ${npc.def.role}`,
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
    this.openEvent(ev);
  }

  private refreshAvailability() {
    if (this.storyletUsed) { this.availability = {}; this.prompt.clearAllBangs(); return; }
    const avail: Record<string, boolean> = {};
    for (const spot of GUIPEI_SPOTS) {
      avail[spot.id] = spot.categories.length > 0 && hasStorylet(STAGE, this.firedEvents, spot.categories);
    }
    this.availability = avail;
    this.prompt.setAvailability(avail);
  }

  private setBusy(v: boolean) { this.busy = v; if (v) this.walker.freeze(); else this.walker.unfreeze(); }

  private hintFor(spot: Spot): string {
    if (spot.sleep && this.actionsLeft <= 0) return '[E] 睡觉 · 结束本季';
    if (this.canDrawAt(spot)) return `[E] ${spot.label}：看看发生了什么`;
    return `[E] ${spot.daily.label}`;
  }

  private canDrawAt(spot: Spot): boolean {
    return !this.storyletUsed && this.actionsLeft > 0 && this.availability[spot.id] === true;
  }

  update() {
    if (this.leaving) return;
    if (this.minigame) { this.minigame.update(this.time.now, this.game.loop.delta); return; }
    this.walker.update(this.keys, this.game.loop.delta);

    const spot = this.prompt.update(this.walker.x, this.walker.y, (s: Spot) => this.hintFor(s));
    const spotDist = spot
      ? Phaser.Math.Distance.Between(
          this.walker.x, this.walker.y,
          this.tileCenter(spot.door[0], spot.door[1]).x,
          this.tileCenter(spot.door[0], spot.door[1]).y,
        )
      : Number.POSITIVE_INFINITY;
    // 行动点耗尽后，NPC 对话（也要花行动点）让位给地点交互（尤其"去值班室睡觉"）
    const npc = this.actionsLeft > 0 ? this.nearestNpc(spotDist) : null;
    this.npcHint.setVisible(false);

    if (npc) {
      const done = this.talkedThisQuarter.has(npc.def.id);
      this.npcHint
        .setText(done ? `${npc.def.name}（本季已聊）` : `[E] 和 ${npc.def.name} 说话`)
        .setPosition(npc.x, npc.y + 26)
        .setVisible(true);
    }

    if (!this.busy && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (npc && this.actionsLeft > 0) { this.talkTo(npc); return; }
      if (spot) this.interact(spot);
    }
  }

  private interact(spot: Spot) {
    if (this.actionsLeft <= 0) {
      if (spot.sleep) { this.sleep(); return; }
      this.floatMessage('行动点用完了，去值班室睡一觉吧', '#ffcc80');
      return;
    }
    if (this.canDrawAt(spot)) {
      const ev = drawStorylet(STAGE, this.firedEvents, spot.categories);
      if (ev) { this.openEvent(ev); return; }
    }
    if (spot.sleep) { this.sleep(); return; }
    this.doDaily(spot);
  }

  private currentEvent: GameEvent | null = null;
  // chained=true 表示本卡由上一张卡的选项链式续接而来：上游选项已提交（效果已生效），
  // 此时允许 ESC 会留下"白拿上游效果、行动点与 storylet 额度被退还"的漏洞（B3），
  // 故链式卡不提供 ESC，必须选完。
  private openEvent(ev: GameEvent, chained = false) {
    if (ev.once) this.firedEvents.add(ev.id);
    this.currentEvent = ev;
    this.setBusy(true);
    this.prompt.clearAllBangs();
    if (ev.minigame) {
      this.minigame = launchMinigame(this, ev.minigame as MinigameKind, ev.title);
      void this.minigame.play().then(r => this.resolveMinigame(r));
      return;
    }
    // 传入取消回调：允许 ESC 不做选择直接退出对话（不消耗行动点，可重来）。
    // 链式续接卡除外（见上）。
    this.eventCard.show(ev, chained ? undefined : () => this.cancelEvent(ev));
  }

  // ESC 取消对话：干净回滚，使这次交互像从未发生。
  private cancelEvent(ev: GameEvent) {
    if (ev.once) this.firedEvents.delete(ev.id);
    // NPC 对话：退还"本季可聊"资格并重新点亮感叹号
    if (this.talkingWith) {
      const npc = this.talkingWith;
      this.talkedThisQuarter.delete(npc.def.id);
      npc.setBang(this, true);
      this.talkingWith = null;
      this.talkChoices = [];
    }
    this.currentEvent = null;
    this.refreshAvailability();
    this.refreshInfoBar();
    this.setBusy(false);
  }

  private resolveMinigame(r: MinigameResult) {
    this.minigame = null;
    const choice: EventChoice = { text: r.grade, delta: r.delta, flagSet: r.flagSet, consequence: r.consequence };
    this.handleChoice(choice, 0);
  }

  private handleChoice(choice: EventChoice, idx: number) {
    this.eventCard.hide();
    sound.click();

    // NPC 对话：先结算好感度，再走通用的选项结算
    const isTalk = this.talkingWith !== null;
    if (this.talkingWith) {
      const npc = this.talkingWith;
      const picked = this.talkChoices[idx];
      if (picked) {
        const before = getAffinity(npc.def.id);
        const after = changeAffinity(npc.def.id, picked.affinity);
        npc.refresh();
        if (after >= TRUST_AT && before < TRUST_AT) {
          this.floatMessage(`${npc.def.name} 开始信任你了`, '#ff8a95', 120);
        } else if (after <= DISTANT_AT && before > DISTANT_AT) {
          this.floatMessage(`${npc.def.name} 和你疏远了`, '#78909c', 120);
        }
      }
      this.talkingWith = null;
      this.talkChoices = [];
    }

    commitChoice(choice);
    this.playDeltaSound(choice.delta as StatDelta);
    this.showDeltaFloaters(choice.delta as StatDelta);
    this.hud.update(getState().stats, STAGE);
    this.autoSave();

    const ev = this.currentEvent;
    if (ev?.newsTickerAfter) {
      const s = getState();
      addNews({ year: s.year, quarter: s.quarter, headline: ev.newsTickerAfter, type: 'irony' });
      this.news.refresh(getState().newsLog.map(n => n.headline));
      sound.news();
      showNewsToast(this, ev.newsTickerAfter);
    }

    // 链式事件：先解析续接目标（在后果弹窗关闭后立即接上）
    const next = choice.nextEventId ? this.resolveChained(choice.nextEventId) : null;

    this.consequence.show(choice.consequence ?? '你做出了选择。', choice.delta as StatDelta, () => {
      if (this.checkCrisis()) return;
      // 链式事件：同季度立即续接，不额外消耗行动点（与 CampusScene 语义一致，B7）
      if (next) { this.openEvent(next, true); return; }
      // NPC 对话只花行动点，不占用"每季一次 storylet"的额度
      if (!isTalk) this.storyletUsed = true;
      this.actionsLeft = Math.max(0, this.actionsLeft - 1);
      this.prompt.clearAllBangs();
      this.refreshInfoBar();
      this.autoSave();
      this.setBusy(false);
    });
  }

  private resolveChained(id: string): GameEvent | null {
    const forced = ALL_EVENTS.find(e => e.id === id);
    if (!forced) return null;
    const state = getState();
    const stages = Array.isArray(forced.stage) ? forced.stage : [forced.stage];
    const ok = stages.includes(STAGE)
      && !(forced.once && this.firedEvents.has(forced.id))
      && !(forced.requireFlag && !state.flags.has(forced.requireFlag))
      && !(forced.excludeFlag && state.flags.has(forced.excludeFlag));
    return ok ? forced : null;
  }

  private doDaily(spot: Spot) {
    updateStats(spot.daily.delta);
    sound.click();
    this.playDeltaSound(spot.daily.delta);
    this.showDeltaFloaters(spot.daily.delta);
    this.hud.update(getState().stats, STAGE);
    this.actionsLeft = Math.max(0, this.actionsLeft - 1);
    this.refreshInfoBar();
    this.floatMessage(spot.daily.consequence, '#cfe8ff');
    this.autoSave();
    this.checkCrisis();
  }

  private sleep() {
    this.setBusy(true);
    updateStats(SLEEP_RECOVER);
    const exhaust = guipeiExhaustion(getState().stats.stamina);
    if (exhaust !== 0) { updateStats({ sanity: exhaust }); }

    const { econ, grieving, integrity } = advanceQuarter(STAGE);
    this.showQuarterBill(econ);
    if (grieving) this.floatMessage('思念 · 心理 -2', '#ff8a80', 150);

    const mapImg = this.children.list.find(
      (c: any) => c?.texture?.key === 'guipei_map',
    ) as Phaser.GameObjects.Image | undefined;
    mapImg?.setTint(stageAmbientTint(STAGE, getState().quarter));

    this.hud.update(getState().stats, STAGE);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    if (integrity.level !== 'none') {
      sound.bad();
      this.consequence.show(`【学术诚信】${integrity.message}`, {}, () => {
        this.hud.update(getState().stats, STAGE);
        this.afterSleep();
      });
      return;
    }
    this.cameras.main.flash(220, 0, 0, 0);
    this.time.delayedCall(360, () => this.afterSleep());
  }

  private afterSleep() {
    if (this.checkCrisis()) return;
    // 退培：走结局
    if (hasFlag('left_med')) { this.goToEnding(); return; }
    if (getState().turnsInStage >= MAX_TURNS) { this.transitionToNext(); return; }
    this.beginQuarter();
  }

  private goToEnding() {
    this.leaving = true;
    const ending = determineEnding(getState());
    sound.transition();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('EndingScene', { endingId: ending.id });
    });
  }

  private transitionToNext() {
    this.leaving = true;
    sound.transition();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MasterScene'));
  }

  private checkCrisis(): boolean {
    if (getState().stats.sanity > 0) return false;
    this.leaving = true;
    this.scene.start('MentalCrisisScene', { fromStage: STAGE });
    return true;
  }

  private pumpNewsForQuarter() {
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

  private autoSave() { saveGame('GuipeiWalkScene', Array.from(this.firedEvents), Array.from(this.firedNews)); }

  private playDeltaSound(delta: StatDelta) {
    if (!delta) return;
    let net = 0;
    for (const v of Object.values(delta)) net += v;
    if (net > 0) sound.good(); else if (net < 0) sound.bad();
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
        targets: t, y: 14, alpha: 1, duration: 260, delay: shown * 90, ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: t, y: -4, alpha: 0, duration: 520, delay: 300, onComplete: () => t.destroy() });
        },
      });
      shown++;
    });
  }

  private floatMessage(text: string, color: string, depth = 120) {
    const t = this.add.text(480, 150, text, {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(depth).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 200,
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: 136, duration: 700, delay: 400, onComplete: () => t.destroy() });
      },
    });
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
}
