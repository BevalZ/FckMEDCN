import Phaser from 'phaser';
import { HUD } from './HUD';
import { EventCard } from './EventCard';
import { ConsequencePopup } from './ConsequencePopup';
import { NewsTicker } from './NewsTicker';
import { InteractPrompt } from './InteractPrompt';
import { QuestLog } from './QuestLog';
import type { QuestItem } from './QuestLog';
import { Walker, createWalkerKeys } from './Walker';
import type { WalkerKeys } from './Walker';
import { renderTileMap } from './tilemap';
import type { TileMapSpec } from './tilemap';
import { npcTileNear } from './npcPlacement';
import { addScanlineOverlay, addVignette, getPalette, stageAmbientTint } from './pixelArt';
import type { PaletteName } from './pixelArt';
import { getState, updateStats, setFlag, hasFlag, addNews } from '../data/gameState';
import type { LifeStage } from '../data/gameState';
import { drawStorylet, hasStorylet, commitChoice, advanceQuarter } from '../data/turnFlow';
import { bindGameMenu } from './gameMenu';
import { HelpPanel } from './HelpPanel';
import { showNewsToast } from './newsToast';
import { ALL_EVENTS } from '../data/events';
import type { EventChoice, GameEvent } from '../data/events';
import type { StatDelta } from '../data/stats';
import { NEWS_TICKER } from '../data/news';
import { determineEnding } from '../data/endings';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { applyStageEntry, describeStageEconomy } from '../data/economy';
import { isBurnout, triggerBurnout } from '../data/burnout';
import { checkExamCrisis, noteStudied, holdbackSanityPenalty, holdbackExtraTurns } from '../data/knowledge';
import type { Spot } from '../data/campusMap';
import {
  academicAnxiety as baseAcademicAnxiety, exhaustionPenalty as baseExhaustionPenalty,
} from '../data/campusMap';
import { launchMinigame } from './launchMinigame';
import type { ActiveMinigame } from './launchMinigame';
import type { MinigameResult, MinigameKind } from './minigameTypes';
import { NpcSprite } from './NpcSprite';
import {
  npcsForStage, npcSpotAt, getTalk, getAffinity, changeAffinity, TRUST_AT, DISTANT_AT,
} from '../data/npc';
import type { NpcTalk } from '../data/npc';
import { sound } from '../audio/sound';
import { saveGame, consumePendingFired } from '../data/save';
import { showQuarterAdvancePrompt } from './quarterAdvancePrompt';

// 可行走阶段场景的共用基类（从 CampusScene 抽出的行走 / 地点 / 行动点 / 睡觉 / NPC 机器）。
// 本科 / 实习 / 规培三个既有场景仍保持原样（避免回归）；本基类供规培后的
// 硕士 / 博士 / 职业三个新可行走场景复用，子类只需提供地图数据与阶段名。
//
// 与 BaseStageScene 的关系：两者共用 turnFlow.ts 的抽事件 / 提交选择 / 季度结算逻辑，
// 但交互层完全不同——这里由玩家走到地点主动触发，而非每回合自动弹卡。
// 故不继承 BaseStageScene，只复用它的 UI 组件。

/** 与 NPC 的对话距离 */
const NPC_TALK_DIST = 44;

export abstract class WalkStageScene extends Phaser.Scene {
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

  private firedEvents: Set<string> = new Set();
  private firedNews: Set<string> = new Set();

  private actionsLeft = 0;
  private storyletUsed = false;
  /** 本季各地点是否有可领事件。每季度算一次，避免每帧过滤全部事件 */
  private availability: Record<string, boolean> = {};
  // —— NPC ——
  private npcs: NpcSprite[] = [];
  private talkedThisQuarter = new Set<string>();
  /** 正在对话的 NPC；非 null 时 handleChoice 走好感度结算分支 */
  private talkingWith: NpcSprite | null = null;
  private talkChoices: NpcTalk['choices'] = [];
  private npcHint!: Phaser.GameObjects.Text;
  private tileCenter!: (col: number, row: number) => { x: number; y: number };
  private isSolid!: (col: number, row: number) => boolean;
  private busy = true;               // 创建流程结束前一律冻结
  protected leaving = false;
  private currentEvent: GameEvent | null = null;

  private questLog!: QuestLog;
  private minigame: ActiveMinigame | null = null;

  // —— 子类提供的地图数据 / 阶段信息（抽象）——
  protected abstract get stageName(): LifeStage;
  protected abstract get mapKey(): string;
  protected abstract get spec(): TileMapSpec;
  protected abstract get spots(): readonly Spot[];
  protected abstract get spawn(): readonly [number, number];
  protected abstract get originY(): number;
  protected abstract get actionsPerQuarter(): number;
  protected abstract get sleepRecover(): StatDelta;
  protected abstract get maxTurns(): number;
  /** 阶段结束（读满学制）后路由到下一场景 */
  protected abstract transitionToNext(): void;

  // —— 可覆写的钩子（提供默认值，子类按需重写）——
  /** 学业 / 进度焦虑：每季度结束时按落后程度扣心理。默认沿用本科曲线。 */
  protected academicAnxiety(turnsInStage: number, knowledge: number): number {
    return baseAcademicAnxiety(turnsInStage, knowledge);
  }
  /** 体力透支惩罚。默认沿用本科逻辑。 */
  protected exhaustionPenalty(stamina: number): number {
    return baseExhaustionPenalty(stamina);
  }
  /** 任务清单内容。默认只显示行动点 / 事件进度。 */
  protected getQuests(_flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
    return [
      { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
      { id: 'story', label: storyletUsed ? '本季事件已领' : '去地点领一件事', done: storyletUsed },
    ];
  }
  /** 不等读满学制就提前离开（如退学 / 退培）。默认按 left_<stage> flag 判断。 */
  protected shouldLeaveEarly(): boolean {
    return hasFlag('left_' + this.stageName);
  }
  /** 某地点的特殊事件（如本科技能中心的缝合小游戏）。默认无。 */
  protected trySpecialEvent(_spot: Spot): GameEvent | null { return null; }
  /** 某地点的特殊交互提示。默认无。 */
  protected specialHint(_spot: Spot): string | null { return null; }
  /** 操作帮助文案（H 键）。默认通用。 */
  protected getHelpLines(): string[] {
    return [
      '移动 WASD/方向键 · 交互 E',
      '任务清单 Q · 帮助 H · 静音 M',
      'ESC 取消当前交互',
      '提示：行动点用完后可直接确认进入下一季度。',
      '有 ! 的地点 / 人物表示这季有新鲜事。',
    ];
  }

  create() {
    this.leaving = false;
    this.busy = true;

    const { tileCenter, solids, image, isSolid } = renderTileMap(
      this, this.mapKey, this.spec, this.stageName as PaletteName, this.originY,
    );
    // 季度氛围 tint：随春夏秋冬轻微变色
    image.setTint(stageAmbientTint(this.stageName, getState().quarter));
    addScanlineOverlay(this, 5, 0.06);
    addVignette(this, 6, 0.85);

    this.hud = new HUD(this, this.stageName);
    this.eventCard = new EventCard(this, this.stageName, (choice, idx) => this.handleChoice(choice, idx));
    this.consequence = new ConsequencePopup(this, this.stageName);
    this.news = new NewsTicker(this, this.stageName as PaletteName);
    this.buildInfoBar();

    // 玩家：出生在 spawn 处，只能在地图范围内活动
    const spawn = tileCenter(this.spawn[0], this.spawn[1]);
    this.physics.world.setBounds(
      0, this.originY,
      this.spec.cols * this.spec.tile, this.spec.rows * this.spec.tile,
    );
    this.walker = new Walker(this, this.stageName, spawn.x, spawn.y);
    this.physics.add.collider(this.walker.sprite, solids);

    this.prompt = new InteractPrompt(this, this.stageName, this.spots, tileCenter);
    this.questLog = new QuestLog(this);
    this.tileCenter = tileCenter;
    this.isSolid = isSolid;

    // NPC 交互提示（跟随最近的 NPC 显示）
    this.npcHint = this.add.text(0, 0, '', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px',
      color: '#fff8e1', backgroundColor: '#000000aa', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0).setDepth(902).setVisible(false);

    this.keys = createWalkerKeys(this);
    // 交互键只用 E：EventCard / ConsequencePopup 用空格与回车提交，复用会误触。
    this.interactKey = this.input.keyboard!.addKey('E');

    // 读档恢复：重建已触发集合，避免 once 事件重复触发
    const pending = consumePendingFired();
    if (pending) {
      this.firedEvents = new Set(pending.firedEvents);
      this.firedNews = new Set(pending.firedNews);
    }

    sound.ensure();
    sound.setBgmMood(this.stageName);
    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    // 重新开档（R 键）
    bindGameMenu(this, this.consequence, () => this.minigame !== null || this.eventCard.busy || this.consequence.busy);

    // 操作帮助（H 键）
    new HelpPanel(this, this.getHelpLines(),
      () => this.minigame !== null || this.eventCard.busy || this.consequence.busy);

    this.hud.update(getState().stats, this.stageName);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    this.presentStageBriefing();
  }

  // —— 顶部信息条（HUD 下方 56..78）——
  private buildInfoBar() {
    const pal = getPalette(this.stageName);
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
    this.infoLabel.setText(
      `第${s.year}年 Q${s.quarter} | ${s.stats.age}岁 | ${this.stageName} 第 ${s.turnsInStage}/${this.totalTurns()} 季  ·  移动 WASD/方向键 · 交互 E · 任务 Q · R 重新开档`,
    );
    const left = Math.max(0, Math.min(this.actionsPerQuarter, this.actionsLeft));
    const dots = '●'.repeat(left) + '○'.repeat(this.actionsPerQuarter - left);
    const storylet = this.storyletUsed ? '（本季事件已领）' : '';
    this.apLabel.setText(`行动点 ${dots} ${storylet}`);
    this.questLog?.setItems(this.getQuests(s.flags, this.actionsLeft, this.storyletUsed));
  }

  // 首次进入本阶段：一次性入学收支 + 经济简报
  private presentStageBriefing() {
    if (applyStageEntry(this.stageName)) this.hud.update(getState().stats, this.stageName);

    const briefFlag = 'brief_' + this.stageName;
    const desc = describeStageEconomy(this.stageName);
    if (desc && !hasFlag(briefFlag)) {
      setFlag(briefFlag);
      this.walker.freeze();
      this.consequence.show(desc, {}, () => this.beginQuarter());
    } else {
      this.beginQuarter();
    }
  }

  // —— 季度开始：重置行动点，刷新哪些地点有可领事件 ——
  private beginQuarter() {
    this.actionsLeft = this.actionsPerQuarter;
    this.storyletUsed = false;
    this.talkedThisQuarter.clear();
    this.placeNpcs();
    this.refreshAvailability();
    this.refreshInfoBar();
    this.setBusy(false);
  }

  // —— NPC：按季度轮换所在地点，站在该地点门口旁边 ——
  private placeNpcs() {
    for (const s of this.npcs) s.destroy();
    this.npcs = [];

    const turn = getState().turnsInStage;
    // 同一地点可能站多个 NPC，用序号取不同可行走候选格避免重叠。
    const usedAt: Record<string, number> = {};
    for (const def of npcsForStage(this.stageName)) {
      const spotId = npcSpotAt(def, turn);
      if (!spotId) continue;
      const spot = this.spots.find(s => s.id === spotId);
      if (!spot) continue;
      const n = usedAt[spotId] ?? 0;
      usedAt[spotId] = n + 1;
      const tile = npcTileNear(
        { cols: this.spec.cols, rows: this.spec.rows, isSolid: this.isSolid },
        spot.door[0], spot.door[1], n,
      );
      if (!tile) continue;
      const c = this.tileCenter(tile.col, tile.row);
      const sprite = new NpcSprite(this, def, c.x, c.y);
      sprite.setBang(this, true); // 每季首次对话前都亮 !
      this.npcs.push(sprite);
    }
  }

  /**
   * 距离最近的可交互 NPC。
   * 注意 NPC 站在地点门口附近，若无条件优先于地点，玩家将永远无法进入该地点
   * （站在门口时 NPC 总在交互半径内）。故这里只返回"比地点更近"的 NPC。
   */
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
    // 记下正在对话的 NPC，供 handleChoice 结算好感度
    this.talkingWith = npc;

    // 复用事件卡呈现对话：把 NpcTalk 包装成一个临时 GameEvent。
    this.talkChoices = talk.choices;
    const ev: GameEvent = {
      id: `npc_talk_${npc.def.id}`,
      stage: this.stageName,
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
    if (this.storyletUsed) {
      this.availability = {};
      this.prompt.clearAllBangs();
      return;
    }
    const avail: Record<string, boolean> = {};
    for (const spot of this.spots) {
      avail[spot.id] = spot.categories.length > 0
        && hasStorylet(this.stageName, this.firedEvents, spot.categories);
    }
    this.availability = avail;
    this.prompt.setAvailability(avail);
  }

  private setBusy(v: boolean) {
    this.busy = v;
    if (v) this.walker.freeze(); else this.walker.unfreeze();
  }

  update() {
    if (this.leaving) return;
    if (this.minigame) {
      this.minigame.update(this.time.now, this.game.loop.delta);
      return;
    }
    this.walker.update(this.keys, this.game.loop.delta);

    // NPC 与地点按"谁更近"决定优先级，避免 NPC 挡住它所在的地点
    const spot = this.prompt.update(this.walker.x, this.walker.y, (s: Spot) => this.hintFor(s));
    const spotDist = spot
      ? Phaser.Math.Distance.Between(
          this.walker.x, this.walker.y,
          this.tileCenter(spot.door[0], spot.door[1]).x,
          this.tileCenter(spot.door[0], spot.door[1]).y,
        )
      : Number.POSITIVE_INFINITY;
    // 行动点耗尽后，NPC 对话（也要花行动点）一律让位给地点交互，
    // 否则站在宿舍门口的 NPC 会挡住"回宿舍睡觉"，导致本季无法结束（卡死）。
    const canTalk = this.actionsLeft > 0;

    const npc = canTalk ? this.nearestNpc(spotDist) : null;
    this.npcHint.setVisible(false);

    if (npc) {
      const done = this.talkedThisQuarter.has(npc.def.id);
      this.npcHint
        .setText(done ? `${npc.def.name}（本季已聊）` : `[E] 和 ${npc.def.name} 说话`)
        .setPosition(npc.x, npc.y + 26)
        .setVisible(true);
    }

    if (!this.busy && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      // 行动点耗尽时，NPC 对话（本身要花行动点）不可用，
      // 否则站在宿舍门口的室友会挡住"回宿舍睡觉"，导致本季无法结束（卡死）。
      if (npc && this.actionsLeft > 0) { this.talkTo(npc); return; }
      if (spot) this.interact(spot);
    }
  }

  private hintFor(spot: Spot): string {
    if (spot.sleep && this.actionsLeft <= 0) return '[E] 睡觉 · 结束本季';
    const special = this.specialHint(spot);
    if (special) return special;
    if (this.canDrawAt(spot)) return `[E] ${spot.label}：看看发生了什么`;
    return `[E] ${spot.daily.label}`;
  }

  private canDrawAt(spot: Spot): boolean {
    return !this.storyletUsed
      && this.actionsLeft > 0
      && this.availability[spot.id] === true;
  }

  private interact(spot: Spot) {
    // 行动点耗尽：任意地点都可以重新打开季度推进确认；宿舍仍保留睡觉入口。
    if (this.actionsLeft <= 0) {
      if (spot.sleep) { this.sleep(); return; }
      this.offerQuarterAdvance();
      return;
    }

    // 秘密地点 / 特殊交互优先：trySpecialEvent 先于此处的切片抽事件，
    // 让 categories:[] 的秘密地点（论文黑市等）也能被触发，而非永远走不到。
    const special = this.trySpecialEvent(spot);
    if (special) { this.openEvent(special); return; }

    // 有可领事件的地点优先出事件；否则走日常活动
    if (this.canDrawAt(spot)) {
      const ev = drawStorylet(this.stageName, this.firedEvents, spot.categories);
      if (ev) { this.openEvent(ev); return; }
    }

    if (spot.sleep) { this.sleep(); return; }
    this.doDaily(spot);
  }

  // —— 领取一个 storylet ——
  // chained=true 表示本卡由上一张卡的选项链式续接而来：上游选项已提交（效果已生效），
  // 此时再允许 ESC 取消会留下"白拿上游效果、行动点与 storylet 额度还被退还"的漏洞，
  // 且链上 once 标记与已提交的上游选项会不一致。故链式卡不提供 ESC，必须选完。
  private openEvent(ev: GameEvent, chained = false) {
    if (ev.once) this.firedEvents.add(ev.id);
    this.currentEvent = ev;
    this.setBusy(true);
    this.prompt.clearAllBangs();

    if (ev.minigame) {
      this.minigame = launchMinigame(this, ev.minigame as MinigameKind, ev.title);
      void this.minigame.play().then(r => this.resolveMinigame(ev, r));
      return;
    }
    // 传入取消回调：允许 ESC 不做选择直接退出对话（不消耗行动点，可重来）。
    // 链式续接卡除外（见上）。
    this.eventCard.show(ev, chained ? undefined : () => this.cancelEvent(ev));
  }

  // ESC 取消对话：干净回滚，使这次交互像从未发生，玩家可重新选择。
  private cancelEvent(ev: GameEvent) {
    // 1) once 事件在 openEvent 里已被记入 firedEvents，须撤销，否则它再也不出现
    if (ev.once) this.firedEvents.delete(ev.id);

    // 2) NPC 对话：退还"本季可聊"资格并重新点亮感叹号
    if (this.talkingWith) {
      const npc = this.talkingWith;
      this.talkedThisQuarter.delete(npc.def.id);
      npc.setBang(this, true);
      this.talkingWith = null;
      this.talkChoices = [];
    }

    this.currentEvent = null;
    // 3) 不消耗行动点、不置 storyletUsed；恢复地点感叹号并解冻角色
    this.refreshAvailability();
    this.refreshInfoBar();
    this.setBusy(false);
  }

  private resolveMinigame(ev: GameEvent, r: MinigameResult) {
    this.minigame = null;
    let flagSet = r.flagSet;
    if (ev.id === 'licensure_exam' && r.grade !== 'miss') flagSet = 'licensed';
    const choice: EventChoice = {
      text: r.grade,
      delta: r.delta,
      flagSet,
      consequence: r.consequence,
    };
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

    commitChoice(choice, this.currentEvent ?? undefined);
    this.playDeltaSound(choice.delta as StatDelta);
    this.showDeltaFloaters(choice.delta as StatDelta);

    const ev = this.currentEvent;
    if (ev?.newsTickerAfter) {
      const s = getState();
      addNews({ year: s.year, quarter: s.quarter, headline: ev.newsTickerAfter, type: 'irony' });
      this.news.refresh(getState().newsLog.map(n => n.headline));
      sound.news();
      showNewsToast(this, ev.newsTickerAfter);
    }

    this.hud.update(getState().stats, this.stageName);
    this.autoSave();

    // 链式事件：同季度立即续接，不额外消耗行动点（与卡片模式的 forcedEventId 语义一致）
    const next = choice.nextEventId ? this.resolveChained(choice.nextEventId) : null;

    this.consequence.show(choice.consequence ?? '你做出了选择。', choice.delta as StatDelta, () => {
      if (this.checkCrisis()) return;
      // 体力到底 → 倦怠：跳过一季并大幅回血，由 runBurnout 接管后续流程
      if (this.maybeBurnout()) return;
      if (next) { this.openEvent(next, true); return; }

      // NPC 对话只花行动点，不占用"每季一次 storylet"的额度
      if (!isTalk) this.storyletUsed = true;
      this.actionsLeft = Math.max(0, this.actionsLeft - 1);
      this.prompt.clearAllBangs();
      this.refreshInfoBar();
      this.autoSave();
      if (this.actionsLeft <= 0) this.offerQuarterAdvance();
      else this.setBusy(false);
    });
  }

  private resolveChained(id: string): GameEvent | null {
    const forced = ALL_EVENTS.find(e => e.id === id);
    if (!forced) return null;
    const state = getState();
    const stages = Array.isArray(forced.stage) ? forced.stage : [forced.stage];
    const ok = stages.includes(this.stageName)
      && !(forced.once && this.firedEvents.has(forced.id))
      && !(forced.requireFlag && !state.flags.has(forced.requireFlag))
      && !(forced.excludeFlag && state.flags.has(forced.excludeFlag));
    return ok ? forced : null;
  }

  // —— 日常活动 ——
  private doDaily(spot: Spot) {
    updateStats(spot.daily.delta);
    if ((spot.daily.delta.knowledge ?? 0) > 0) noteStudied(); // 用进废退：本季学过则季度结算不掉
    sound.click();
    this.playDeltaSound(spot.daily.delta);
    this.showDeltaFloaters(spot.daily.delta);
    this.hud.update(getState().stats, this.stageName);
    this.actionsLeft = Math.max(0, this.actionsLeft - 1);
    this.refreshInfoBar();
    this.floatMessage(spot.daily.consequence, '#cfe8ff');
    this.autoSave();
    if (this.checkCrisis()) return;
    // 体力到底 → 倦怠：日常活动也可能把体力耗到 0
    if (this.maybeBurnout()) return;
    if (this.actionsLeft <= 0) this.offerQuarterAdvance();
  }

  private offerQuarterAdvance() {
    if (this.actionsLeft > 0 || this.leaving || this.consequence.busy) return;
    this.setBusy(true);
    showQuarterAdvancePrompt(
      this.consequence,
      () => this.sleep(),
      () => {
        this.refreshInfoBar();
        this.setBusy(false);
      },
    );
  }

  // —— 睡觉：结束本季度 ——
  private sleep() {
    // 睡觉前若已倦怠（极端情况），直接走倦怠流程，不重复回血
    if (isBurnout()) { this.runBurnout(); return; }
    this.setBusy(true);
    updateStats(this.sleepRecover);

    // 学业焦虑 + 体力透支：两者都折算成心理消耗，接入既有的崩溃机制
    const s0 = getState();
    const anxiety = this.academicAnxiety(s0.turnsInStage, s0.stats.knowledge);
    const exhaust = this.exhaustionPenalty(s0.stats.stamina);
    if (anxiety !== 0) updateStats({ sanity: anxiety });
    if (exhaust !== 0) updateStats({ sanity: exhaust });
    if (anxiety <= -4) this.floatMessage(`跟不上进度 · 心理 ${anxiety}`, '#ffab91', 130);
    if (exhaust !== 0) this.floatMessage(`身体透支 · 心理 ${exhaust}`, '#ff8a80', 148);
    // 留级：跟着下一届重读，每季额外的心理负担（本科/硕博统一）
    const hbPen = holdbackSanityPenalty(this.stageName);
    if (hbPen !== 0) { updateStats({ sanity: hbPen }); this.floatMessage('重修的压力 · 心理 -3', '#ff8a80', 150); }

    const { econ, grieving, integrity } = advanceQuarter(this.stageName);
    this.showQuarterBill(econ);
    if (grieving) this.floatMessage('思念 · 心理 -2', '#ff8a80', 150);

    // 跨季度刷新氛围 tint（春夏秋冬）
    const mapImg = this.children.list.find(
      (c: any) => c?.texture?.key === this.mapKey,
    ) as Phaser.GameObjects.Image | undefined;
    mapImg?.setTint(stageAmbientTint(this.stageName, getState().quarter));

    this.hud.update(getState().stats, this.stageName);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    // 学术不端东窗事发：用后果弹窗郑重呈现
    if (integrity.level !== 'none') {
      sound.bad();
      this.consequence.show(`【学术诚信】${integrity.message}`, {}, () => {
        this.hud.update(getState().stats, this.stageName);
        this.afterSleep();
      });
      return;
    }

    this.cameras.main.flash(220, 0, 0, 0);
    this.time.delayedCall(360, () => this.afterSleep());
  }

  /** 睡觉结算完成后的流程分支：崩溃 / 提前离开 / 转阶段 / 进入下一季 */
  private afterSleep() {
    if (this.checkCrisis()) return;
    // 知识太低 → 考试不及格 / 留级（强制置留级 flag，并展示后果）
    if (this.maybeExamCrisis()) return;
    // 提前离开：不等读满学制，本季结束即离开
    if (this.shouldLeaveEarly()) { this.goToEnding(); return; }
    if (getState().turnsInStage >= this.totalTurns()) { this.transitionToNext(); return; }
    this.beginQuarter();
  }

  // —— 倦怠：体力归零，跳过一季并回血 ——
  /** 若处于倦怠条件则触发并接管后续流程，返回 true；否则返回 false */
  private maybeBurnout(): boolean {
    if (!isBurnout()) return false;
    this.runBurnout();
    return true;
  }

  private runBurnout() {
    this.setBusy(true);
    const { econ, grieving, integrity } = triggerBurnout();
    this.floatMessage('倦怠 · 你瘫倒了，错过了一整个季度', '#ff8a80', 170);
    this.showQuarterBill(econ);
    if (grieving) this.floatMessage('思念 · 心理 -2', '#ff8a80', 150);

    const mapImg = this.children.list.find(
      (c: any) => c?.texture?.key === this.mapKey,
    ) as Phaser.GameObjects.Image | undefined;
    mapImg?.setTint(stageAmbientTint(this.stageName, getState().quarter));

    this.hud.update(getState().stats, this.stageName);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    if (integrity.level !== 'none') {
      sound.bad();
      this.consequence.show(`【学术诚信】${integrity.message}`, {}, () => {
        this.hud.update(getState().stats, this.stageName);
        this.afterSleep();
      });
      return;
    }
    this.cameras.main.flash(220, 0, 0, 0);
    this.time.delayedCall(360, () => this.afterSleep());
  }

  // —— 知识太低 → 考试危机 / 留级 ——
  /** 若知识过低触发考试危机，强制置留级 flag 并展示后果，返回 true 接管流程 */
  private maybeExamCrisis(): boolean {
    const stage = this.stageName;
    if (checkExamCrisis(stage) === null) return false;
    // 已留级则不再重复触发
    if (hasFlag('ug_holdback') || hasFlag('ms_holdback') || hasFlag('phd_holdback')) return false;
    const holdbackFlag = stage === 'undergrad' ? 'ug_holdback'
      : stage === 'master' ? 'ms_holdback' : 'phd_holdback';
    setFlag(holdbackFlag);
    const label = stage === 'undergrad' ? '本科' : stage === 'master' ? '硕士' : '博士';
    sound.bad();
    this.consequence.show(
      `【学业警示】${label}阶段知识过低，两门核心课不及格。你被要求留级，重修一年。`,
      { knowledge: -2 },
      () => { this.afterSleep(); },
    );
    return true;
  }

  /** 本阶段总季度数。留级会多读一年（4 个季度）。 */
  private totalTurns(): number {
    return this.maxTurns + holdbackExtraTurns(this.stageName);
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

  private checkCrisis(): boolean {
    if (getState().stats.sanity > 0) return false;
    this.leaving = true;
    this.scene.start('MentalCrisisScene', { fromStage: this.stageName });
    return true;
  }

  // —— 新闻 / 存档（与 BaseStageScene 同逻辑）——
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

  private autoSave() {
    saveGame(this.sys.settings.key, Array.from(this.firedEvents), Array.from(this.firedNews));
  }

  // —— 反馈表现 ——
  private playDeltaSound(delta: StatDelta) {
    if (!delta) return;
    let net = 0;
    for (const v of Object.values(delta)) net += v;
    if (net > 0) sound.good();
    else if (net < 0) sound.bad();
  }

  private showDeltaFloaters(delta: StatDelta) {
    if (!delta) return;
    // 前 8 项对齐 HUD 各列；临床/科研/风险不在顶栏分列，统一飘在第二行位置。
    const order = [...HUD_STATS, 'clinical', 'research', 'fakeRisk'];
    let shown = 0;
    order.forEach((key, i) => {
      const v = (delta as Record<string, number>)[key];
      if (typeof v !== 'number' || v === 0) return;
      const x = i < HUD_STATS.length ? 10 + i * 117 : 10 + (i - HUD_STATS.length) * 150;
      const label = (STAT_LABELS as Record<string, string>)[key] ?? key;
      const icon = (STAT_ICONS as Record<string, string>)[key] ?? '';
      // 风险升高是坏事，配色需反转
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

  private showQuarterBill(e: { income: number; cost: number; net: number; financeNote?: string }) {
    if (e.income === 0 && e.cost === 0) return;
    const netStr = `${e.net >= 0 ? '+' : ''}¥${e.net}`;
    this.floatMessage(
      `季度结算 ▸ 收¥${e.income} 支¥${e.cost} = 净 ${netStr}${e.financeNote ?? ""}`,
      e.net >= 0 ? '#69f0ae' : '#ff8a80', 110, 13,
    );
  }

  private floatMessage(text: string, color: string, y = 92, fontSize = 12) {
    const t = this.add.text(480, y, text, {
      fontFamily: '"Courier New", monospace', fontSize: `${fontSize}px`, color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 200, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: t, alpha: 0, y: y - 16, duration: 900, delay: 700, onComplete: () => t.destroy() });
      },
    });
  }
}
