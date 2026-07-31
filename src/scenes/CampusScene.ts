import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { EventCard } from '../ui/EventCard';
import { ConsequencePopup } from '../ui/ConsequencePopup';
import { NewsTicker } from '../ui/NewsTicker';
import { InteractPrompt } from '../ui/InteractPrompt';
import { QuestLog, undergradQuests } from '../ui/QuestLog';
import { Walker, createWalkerKeys } from '../ui/Walker';
import type { WalkerKeys } from '../ui/Walker';
import { renderTileMap } from '../ui/tilemap';
import { npcTileNear } from '../ui/npcPlacement';
import { addScanlineOverlay, addVignette, getPalette, stageAmbientTint } from '../ui/pixelArt';
import { getState, updateStats, setFlag, hasFlag, addNews } from '../data/gameState';
import { drawStorylet, hasStorylet, commitChoice, advanceQuarter } from '../data/turnFlow';
import { bindRestartKey } from '../ui/gameMenu';
import { ALL_EVENTS, getAvailableEvents } from '../data/events';
import type { EventChoice, GameEvent } from '../data/events';
import type { StatDelta } from '../data/stats';
import { NEWS_TICKER } from '../data/news';
import { determineEnding } from '../data/endings';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { applyStageEntry, describeStageEconomy } from '../data/economy';
import {
  CAMPUS_SPEC, CAMPUS_SPOTS, CAMPUS_SPAWN, CAMPUS_ORIGIN_Y, ACTIONS_PER_QUARTER,
  SLEEP_RECOVER, academicAnxiety, exhaustionPenalty,
} from '../data/campusMap';
import type { Spot } from '../data/campusMap';
import { launchMinigame } from '../ui/launchMinigame';
import type { ActiveMinigame } from '../ui/launchMinigame';
import type { MinigameResult } from '../ui/minigameTypes';
import type { MinigameKind } from '../ui/minigameTypes';
import { NpcSprite } from '../ui/NpcSprite';
import {
  npcsForStage, npcSpotAt, getTalk, getAffinity, changeAffinity, TRUST_AT, DISTANT_AT,
} from '../data/npc';
import type { NpcTalk } from '../data/npc';
import { sound } from '../audio/sound';
import { saveGame, consumePendingFired } from '../data/save';

// 本科阶段的可行走校园场景（星露谷式垂直切片）。
//
// 与 BaseStageScene 的关系：两者共用 turnFlow.ts 的抽事件 / 提交选择 / 季度结算逻辑，
// 但交互层完全不同——这里由玩家走到地点主动触发，而非每回合自动弹卡。
// 故不继承 BaseStageScene（其布局与自动节奏不适用），只复用它的 UI 组件。
//
// 一个季度 = 3 个行动点，其中最多 1 个用于领 storylet（玩家自己决定去哪个地点领），
// 其余用于日常活动。回宿舍睡觉结束本季 → 经济结算 → 进入下一季度。

const STAGE = 'undergrad';
const MAX_TURNS = 20;
/** 留级：多读一年 = 4 个季度 */
const HOLDBACK_TURNS = 4;
/** 与 NPC 的对话距离 */
const NPC_TALK_DIST = 44;

export class CampusScene extends Phaser.Scene {
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

  private actionsLeft = ACTIONS_PER_QUARTER;
  private storyletUsed = false;
  /** 本季各地点是否有可领事件。每季度算一次，避免每帧过滤 5000+ 事件 */
  private availability: Record<string, boolean> = {};
  // —— NPC（M3）——
  private npcs: NpcSprite[] = [];
  private talkedThisQuarter = new Set<string>();
  /** 正在对话的 NPC；非 null 时 handleChoice 走好感度结算分支 */
  private talkingWith: NpcSprite | null = null;
  private talkChoices: NpcTalk['choices'] = [];
  private npcHint!: Phaser.GameObjects.Text;
  private tileCenter!: (col: number, row: number) => { x: number; y: number };
  private isSolid!: (col: number, row: number) => boolean;
  private busy = true;               // 创建流程结束前一律冻结
  private leaving = false;
  private currentEvent: GameEvent | null = null;

  constructor() { super({ key: 'CampusScene' }); }

  create() {
    this.leaving = false;
    this.busy = true;

    const { tileCenter, solids, image, isSolid } = renderTileMap(
      this, 'campus_map', CAMPUS_SPEC, STAGE, CAMPUS_ORIGIN_Y,
    );
    // 季度氛围 tint：同一张校园图随春夏秋冬轻微变色
    image.setTint(stageAmbientTint(STAGE, getState().quarter));
    addScanlineOverlay(this, 5, 0.06);
    addVignette(this, 6, 0.85);

    this.hud = new HUD(this, STAGE);
    this.eventCard = new EventCard(this, STAGE, (choice, idx) => this.handleChoice(choice, idx));
    this.consequence = new ConsequencePopup(this, STAGE);
    this.news = new NewsTicker(this, STAGE);
    this.buildInfoBar();

    // 玩家：出生在宿舍门口，只能在地图范围内活动
    const spawn = tileCenter(CAMPUS_SPAWN[0], CAMPUS_SPAWN[1]);
    this.physics.world.setBounds(
      0, CAMPUS_ORIGIN_Y,
      CAMPUS_SPEC.cols * CAMPUS_SPEC.tile, CAMPUS_SPEC.rows * CAMPUS_SPEC.tile,
    );
    this.walker = new Walker(this, STAGE, spawn.x, spawn.y);
    this.physics.add.collider(this.walker.sprite, solids);

    this.prompt = new InteractPrompt(this, STAGE, CAMPUS_SPOTS, tileCenter);
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
    sound.setBgmMood(STAGE);
    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    // 重新开档（R 键）
    bindRestartKey(this, this.consequence, () => this.minigame !== null || this.eventCard.busy);

    this.hud.update(getState().stats, STAGE);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    this.presentStageBriefing();
  }

  // —— 顶部信息条（HUD 下方 56..78）——
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
    const holdback = hasFlag('ug_holdback') ? ' · 重修中' : '';
    this.infoLabel.setText(
      `第${s.year}年 Q${s.quarter} | ${s.stats.age}岁 | 本科第 ${s.turnsInStage}/${this.totalTurns()} 季${holdback}  ·  移动 WASD/方向键 · 交互 E · 任务 Q · R 重新开档`,
    );
    const left = Math.max(0, Math.min(ACTIONS_PER_QUARTER, this.actionsLeft));
    const dots = '●'.repeat(left) + '○'.repeat(ACTIONS_PER_QUARTER - left);
    const storylet = this.storyletUsed ? '（本季事件已领）' : '';
    this.apLabel.setText(`行动点 ${dots} ${storylet}`);
    this.questLog?.setItems(undergradQuests(s.flags, this.actionsLeft, this.storyletUsed));
  }

  // 首次进入本阶段：一次性入学收支 + 经济简报
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

  // —— 季度开始：重置行动点，刷新哪些地点有可领事件 ——
  private beginQuarter() {
    this.actionsLeft = ACTIONS_PER_QUARTER;
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
    for (const def of npcsForStage('undergrad')) {
      const spotId = npcSpotAt(def, turn);
      if (!spotId) continue;
      const spot = CAMPUS_SPOTS.find(s => s.id === spotId);
      if (!spot) continue;
      const n = usedAt[spotId] ?? 0;
      usedAt[spotId] = n + 1;
      const tile = npcTileNear(
        { cols: CAMPUS_SPEC.cols, rows: CAMPUS_SPEC.rows, isSolid: this.isSolid },
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
    // 好感度增量编码进 choice.flagSet 之外的独立表（talkChoices），
    // 因为 EventChoice 没有 affinity 字段，也不该为一次性对话去改公共类型。
    this.talkChoices = talk.choices;
    const ev: GameEvent = {
      id: `npc_talk_${npc.def.id}`,
      stage: 'undergrad',
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
    for (const spot of CAMPUS_SPOTS) {
      avail[spot.id] = spot.categories.length > 0
        && hasStorylet(STAGE, this.firedEvents, spot.categories);
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
    // 技能中心：缝合事件未做时，明确提示"练缝合"（任务清单同名），不让玩家以为没这个选项
    if (spot.id === 'skills' && this.canDrawAt(spot) && this.suturePending()) {
      return `[E] ${spot.label}：练缝合`;
    }
    if (this.canDrawAt(spot)) return `[E] ${spot.label}：看看发生了什么`;
    return `[E] ${spot.daily.label}`;
  }

  /** 技能中心的缝合小游戏事件尚未触发（once + minTurn 门槛未满足时不算待做） */
  private suturePending(): boolean {
    const st = getState();
    const pool = getAvailableEvents(
      STAGE, st.flags, st.stats as unknown as Record<string, number>,
      this.firedEvents, st.turnsInStage, st.marital,
    );
    return pool.some(e => e.id === 'clinical_skills_lab');
  }

  private canDrawAt(spot: Spot): boolean {
    return !this.storyletUsed
      && this.actionsLeft > 0
      && this.availability[spot.id] === true;
  }

  private interact(spot: Spot) {
    // 行动点耗尽：只剩"回宿舍睡觉"这一条路
    if (this.actionsLeft <= 0) {
      if (spot.sleep) { this.sleep(); return; }
      this.floatMessage('行动点用完了，回宿舍睡一觉吧', '#ffcc80');
      return;
    }

    // 有可领事件的地点优先出事件；否则走日常活动
    if (this.canDrawAt(spot)) {
      // 技能中心：优先触发"临床技能操作"（缝合小游戏），让"技能中心练缝合"任务落到实处
      let ev: GameEvent | null = null;
      if (spot.id === 'skills' && this.suturePending()) {
        ev = ALL_EVENTS.find(e => e.id === 'clinical_skills_lab') ?? null;
      }
      if (!ev) ev = drawStorylet(STAGE, this.firedEvents, spot.categories);
      if (ev) { this.openEvent(ev); return; }
    }

    if (spot.sleep) { this.sleep(); return; }
    this.doDaily(spot);
  }

  private questLog!: QuestLog;
  private minigame: ActiveMinigame | null = null;

  // —— 领取一个 storylet ——
  // chained=true 表示本卡由上一张卡的选项链式续接而来：上游选项已提交（效果已生效），
  // 此时再允许 ESC 取消会留下"白拿上游效果、行动点与 storylet 额度还被退还"的漏洞（B3），
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

    commitChoice(choice);
    this.playDeltaSound(choice.delta as StatDelta);
    this.showDeltaFloaters(choice.delta as StatDelta);

    const ev = this.currentEvent;
    if (ev?.newsTickerAfter) {
      const s = getState();
      addNews({ year: s.year, quarter: s.quarter, headline: ev.newsTickerAfter, type: 'irony' });
      this.news.refresh(getState().newsLog.map(n => n.headline));
    }

    this.hud.update(getState().stats, STAGE);
    this.autoSave();

    // 链式事件：同季度立即续接，不额外消耗行动点（与卡片模式的 forcedEventId 语义一致）
    const next = choice.nextEventId ? this.resolveChained(choice.nextEventId) : null;

    this.consequence.show(choice.consequence ?? '你做出了选择。', choice.delta as StatDelta, () => {
      if (this.checkCrisis()) return;
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

  // —— 日常活动 ——
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

  // —— 睡觉：结束本季度 ——
  private sleep() {
    this.setBusy(true);
    updateStats(SLEEP_RECOVER);

    // 学业焦虑 + 体力透支：两者都折算成心理消耗，接入既有的崩溃机制
    const s0 = getState();
    const anxiety = academicAnxiety(s0.turnsInStage, s0.stats.knowledge);
    const exhaust = exhaustionPenalty(s0.stats.stamina);
    if (anxiety !== 0) updateStats({ sanity: anxiety });
    if (exhaust !== 0) updateStats({ sanity: exhaust });
    if (anxiety <= -4) this.floatMessage(`跟不上进度 · 心理 ${anxiety}`, '#ffab91', 130);
    if (exhaust !== 0) this.floatMessage(`身体透支 · 心理 ${exhaust}`, '#ff8a80', 148);
    // 留级：跟着下一届重读，每季额外的心理负担
    if (hasFlag('ug_holdback') && !hasFlag('ug_holdback_recovered')) {
      updateStats({ sanity: -3 });
    }

    const { econ, grieving, integrity } = advanceQuarter(STAGE);
    this.showQuarterBill(econ);
    if (grieving) this.floatMessage('思念 · 心理 -2', '#ff8a80', 150);

    // 跨季度刷新校园氛围 tint（春夏秋冬）
    const mapImg = this.children.list.find(
      (c: any) => c?.texture?.key === 'campus_map',
    ) as Phaser.GameObjects.Image | undefined;
    mapImg?.setTint(stageAmbientTint(STAGE, getState().quarter));

    this.hud.update(getState().stats, STAGE);
    this.refreshInfoBar();
    this.pumpNewsForQuarter();
    this.autoSave();

    // 学术不端东窗事发：用后果弹窗郑重呈现
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

  /** 睡觉结算完成后的流程分支：崩溃 / 退学 / 转阶段 / 进入下一季 */
  private afterSleep() {
    if (this.checkCrisis()) return;
    // 退学：不等读满学制，本季结束即离开
    if (hasFlag('left_undergrad')) { this.goToEnding(); return; }
    if (getState().turnsInStage >= this.totalTurns()) { this.transitionToNext(); return; }
    this.beginQuarter();
  }

  /** 本阶段总季度数。留级会多读一年（4 个季度）。 */
  private totalTurns(): number {
    return hasFlag('ug_holdback') ? MAX_TURNS + HOLDBACK_TURNS : MAX_TURNS;
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
    this.scene.start('MentalCrisisScene', { fromStage: STAGE });
    return true;
  }

  private transitionToNext() {
    this.leaving = true;
    sound.transition();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('HospitalScene'));
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

  private showQuarterBill(e: { income: number; cost: number; net: number }) {
    if (e.income === 0 && e.cost === 0) return;
    const netStr = `${e.net >= 0 ? '+' : ''}¥${e.net}`;
    this.floatMessage(
      `季度结算 ▸ 收¥${e.income} 支¥${e.cost} = 净 ${netStr}`,
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
