import Phaser from 'phaser';
import { SCHOOLS, TRACKS, trackBlockReason } from '../data/constants';
import type { School, Track } from '../data/constants';
import { getState, setState, setFlag, patchState, updateStats } from '../data/gameState';
import type { DegreeType } from '../data/constants';
import type { AttrAlloc } from '../data/gameState';
import { wealthFromFamily } from '../data/gameState';
import { getPalette, createBgTexture, createStageDecor } from '../ui/pixelArt';
import { CharacterSprite } from '../ui/CharacterSprite';
import { sound } from '../audio/sound';
import { saveGame } from '../data/save';
import { clearTrainingTrack, setTrainingTrack } from '../data/trainingTrack';
import { addMotivation, dominantMotivation, motivationBar } from '../data/motivation';
import type { InitialAnswer, MotivationKind } from '../data/motivation';
import { academicBaseScore, approximateRank, estimateFromChoice, familyScoreModifier, familyStatusFromAttrs } from '../data/era0';
import type { Era0FamilyStatus, EstimateChoice, ExamEveChoice, ExamSiteChoice } from '../data/era0';
import { normalizeFamily } from '../data/family';
import { normalizeSpirit } from '../data/spirit';

interface OptionSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  disabled?: boolean;
  action: () => void;
}

interface OptionInst extends OptionSpec {
  draw: (focused: boolean) => void;
  labelText: Phaser.GameObjects.Text;
}

export class GaokaoScene extends Phaser.Scene {
  private selectedScore = 0;
  private selectedSchool: School | null = null;
  private selectedTrack: Track | null = null;
  private container!: Phaser.GameObjects.Container;

  // 键盘导航状态
  private options: OptionInst[] = [];
  private focusIndex = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  // 学校列表分页
  private schoolPage = 0;
  private readonly schoolPageSize = 6;
  private inSchoolPhase = false;

  // 点数分配状态（家境/成绩/运气/外貌）
  private attrValues: AttrAlloc = { family: 2, academic: 5, luck: 1, looks: 2 };
  private attrFocus = 0;
  private readonly ATTR_BUDGET = 10;
  // 助学贷款开关（非富裕家庭可选：在读 +1500/季、工作后还 -1500/季）
  private loanOn = false;
  private loanToggleText!: Phaser.GameObjects.Text;
  private loanBarText!: Phaser.GameObjects.Text;
  // 开局阶段标记（ESC 返回用）
  private inGenderPhase = false;
  private inAttrPhase = false;

  constructor() { super({ key: 'GaokaoScene' }); }

  create() {
    createBgTexture(this, 'bg_gaokao', 'gaokao');
    this.add.image(0, 0, 'bg_gaokao').setOrigin(0);

    createStageDecor(this, 'decor_gaokao', 'gaokao');
    this.add.image(0, 54, 'decor_gaokao').setOrigin(0).setDepth(1);
    const character = new CharacterSprite(this, 'gaokao');
    character.setSanity(getState().stats.sanity);

    sound.ensure();
    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    // 开局阶段 ESC 返回：属性 → 性别 → 标题（避免选错只能重开）
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.inAttrPhase) { this.showGenderPhase(); return; }
      if (this.inGenderPhase) {
        this.scene.start('TitleScene'); // 尚未开始，回到标题
      }
    });

    const pal = getPalette('gaokao');
    const header = this.add.graphics();
    header.fillStyle(pal.panel, 0.95);
    header.fillRect(0, 0, 960, 56);
    header.fillStyle(pal.accent, 1);
    header.fillRect(0, 54, 960, 2);

    this.add.text(480, 15, '时代0 · 抉择之夏', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container = this.add.container(0, 0);
    this.showGenderPhase();
  }

  /** 性别称谓：按开局选择返回"儿子/女儿"，供叙述文案使用 */
  private sonWord(): string { return getState().gender === 'female' ? '女儿' : '儿子'; }

  // —— 开局性别选择（叙述中"学长/儿子"等称谓按此决定）——
  private showGenderPhase() {
    this.clearContainer();
    this.inGenderPhase = true;
    this.inAttrPhase = false;
    const pal = getPalette('gaokao');

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(160, 70, 640, 420, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 96, '选择你的性别', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
    this.container.add(this.add.text(480, 132, '只影响叙述里的称谓（学长/学姐、儿子/女儿等），此后可重新开档修改', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#888899',
    }).setOrigin(0.5));

    this.container.add(this.add.text(480, 460, '↑↓ 选择 · 空格 确认 · ESC 返回标题', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#888899',
    }).setOrigin(0.5));

    const specs: OptionSpec[] = [
      {
        x: 240, y: 190, w: 480, h: 64,
        label: '男生', sub: '叙述里会以"学长 / 儿子"等称谓称呼你',
        action: () => {
          patchState({ gender: 'male' });
          this.time.delayedCall(150, () => this.showAttrPhase());
        },
      },
      {
        x: 240, y: 274, w: 480, h: 64,
        label: '女生', sub: '叙述里会以"学姐 / 女儿"等称谓称呼你',
        action: () => {
          patchState({ gender: 'female' });
          this.time.delayedCall(150, () => this.showAttrPhase());
        },
      },
    ];
    this.renderOptions(specs);
  }

  // —— 点数分配：家境 / 成绩 / 运气 / 外貌（总预算 10 点）——
  private attrRows: Array<{ key: keyof AttrAlloc; label: string; desc: string; valueText: Phaser.GameObjects.Text; barText: Phaser.GameObjects.Text }> = [];
  private attrRemainText!: Phaser.GameObjects.Text;

  private showAttrPhase() {
    this.clearContainer();
    this.inGenderPhase = false;
    this.inAttrPhase = true;
    const pal = getPalette('gaokao');

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(160, 70, 640, 420, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 90, '分配你的初始属性', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
    this.attrRemainText = this.add.text(480, 122, '', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffd54f',
    }).setOrigin(0.5);
    this.container.add(this.attrRemainText);

    const defs: Array<{ key: keyof AttrAlloc; label: string; desc: string }> = [
      { key: 'family', label: '家境', desc: '父母补贴 / 生活费水平（影响上学期间收入）' },
      { key: 'academic', label: '成绩', desc: '高考分数线档 + 起始学识（知识）' },
      { key: 'luck', label: '运气', desc: '起始心态（心理）' },
      { key: 'looks', label: '外貌', desc: '起始人际与声望' },
    ];
    this.attrRows = defs.map((d, i) => {
      const y = 162 + i * 56;
      const labelText = this.add.text(200, y, `${d.label} ${i === 0 ? '(←/→ 调整)' : ''}`, {
        fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
      });
      this.container.add(labelText);
      const descText = this.add.text(200, y + 24, d.desc, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888899',
      });
      this.container.add(descText);
      const valueText = this.add.text(560, y + 4, '', {
        fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffc107',
      }).setOrigin(0.5);
      this.container.add(valueText);
      const barText = this.add.text(620, y + 4, '', {
        fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#4fc3f7',
      }).setOrigin(0, 0.5);
      this.container.add(barText);
      return { key: d.key, label: d.label, desc: d.desc, valueText, barText };
    });

    // 助学贷款行（第 5 行，家境 0-3 才生效；家境 4-5 殷实则无需）
    const ly = 162 + 4 * 56;
    const loanLabel = this.add.text(200, ly, '助学贷款', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    });
    this.container.add(loanLabel);
    const loanDesc = this.add.text(200, ly + 24, '完整在读阶段每季 +1500，工作后每季还 1500（家境拮据/普通可用）', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888899',
    });
    this.container.add(loanDesc);
    this.loanToggleText = this.add.text(560, ly + 4, '', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffc107',
    }).setOrigin(0.5);
    this.container.add(this.loanToggleText);
    this.loanBarText = this.add.text(620, ly + 4, '', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#4fc3f7',
    }).setOrigin(0, 0.5);
    this.container.add(this.loanBarText);

    this.attrFocus = 0;
    this.loanOn = getState().flags.has('student_loan');
    this.refreshAttrUI();

    const foot = this.add.text(480, 466, '↑↓ 选择 · ←/→ 调整 · 空格 确认 · ESC 返回', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#888899',
    }).setOrigin(0.5);
    this.container.add(foot);

    this.keyHandler = (e: KeyboardEvent) => {
      const keys = this.attrRows.map(r => r.key);
      const ROWS = 5;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.attrFocus = (this.attrFocus + ROWS - 1) % ROWS;
        this.refreshAttrUI();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.attrFocus = (this.attrFocus + 1) % ROWS;
        this.refreshAttrUI();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (this.attrFocus === 4) {
          this.loanOn = !this.loanOn; // 助学贷款开关
          this.refreshAttrUI();
        } else {
          this.adjustAttr(keys[this.attrFocus], e.key === 'ArrowRight' ? 1 : -1);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.commitAttrs();
      }
    };
    this.input.keyboard?.on('keydown', this.keyHandler);
  }

  private adjustAttr(key: keyof AttrAlloc, dir: number) {
    const cur = this.attrValues[key];
    const total = this.attrValues.family + this.attrValues.academic + this.attrValues.luck + this.attrValues.looks;
    if (dir > 0) {
      if (cur >= 5 || total >= this.ATTR_BUDGET) return;
      this.attrValues[key] = cur + 1;
    } else {
      if (cur <= 0) return;
      this.attrValues[key] = cur - 1;
    }
    this.refreshAttrUI();
  }

  private refreshAttrUI() {
    const total = this.attrValues.family + this.attrValues.academic + this.attrValues.luck + this.attrValues.looks;
    this.attrRemainText.setText(`剩余点数：${this.ATTR_BUDGET - total} / ${this.ATTR_BUDGET}`);
    this.attrRows.forEach((r, i) => {
      const v = this.attrValues[r.key];
      r.valueText.setText(`${v}`);
      r.valueText.setColor(i === this.attrFocus ? '#ffc107' : '#ffffff');
      r.barText.setText('●'.repeat(v) + '○'.repeat(5 - v));
    });
    // 助学贷款行
    this.loanToggleText.setText(this.loanOn ? '开' : '关');
    this.loanToggleText.setColor(this.attrFocus === 4 ? '#ffc107' : this.loanOn ? '#69f0ae' : '#ffffff');
    this.loanBarText.setText(this.loanOn ? '[贷]' : '[ ]');
  }

  private commitAttrs() {
    // 写入属性、推导家庭条件、应用起始加成（成绩→知识、外貌→人际/声望、运气→心理）
    const a = { ...this.attrValues };
    const s = getState();
    const wealth = wealthFromFamily(a.family);
    const familyStatus = familyStatusFromAttrs(a);
    const flags = new Set(s.flags);
    // 助学贷款：仅非殷实家庭可选（家境 0-3），写入 student_loan
    if (this.loanOn && wealth !== 'rich') flags.add('student_loan');
    else flags.delete('student_loan');
    patchState({
      attrs: a,
      familyWealth: wealth,
      era0: { ...s.era0, familyStatus },
      family: normalizeFamily({ ...s.family, familyOrigin: { rich: 75, middle: 55, tight: 40 }[wealth] }, wealth, s.spouse, s.hasChild),
      flags,
      stats: {
        ...s.stats,
        knowledge: s.stats.knowledge + a.academic * 5,
        relations: s.stats.relations + a.looks * 4,
        reputation: s.stats.reputation + a.looks * 1,
        sanity: s.stats.sanity + a.luck * 2,
      },
    });
    this.time.delayedCall(200, () => this.showExamEvePhase());
  }

  private patchEra0(partial: Partial<ReturnType<typeof getState>['era0']>) {
    const state = getState();
    patchState({ era0: { ...state.era0, ...partial } });
  }

  private addMotive(kind: MotivationKind, amount: number) {
    const state = getState();
    patchState({ motivation: addMotivation(state.motivation, { [kind]: amount }) });
  }

  private showStoryPhase(
    title: string,
    body: string,
    specs: Array<{ label: string; sub?: string; action: () => void }>,
    note?: string,
  ) {
    this.clearContainer();
    const pal = getPalette('gaokao');
    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.93);
    panel.fillRoundedRect(90, 70, 780, 450, 10);
    this.container.add(panel);
    this.container.add(this.add.text(480, 88, title, {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
    this.container.add(this.add.text(130, 122, body, {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#cccccc',
      wordWrap: { width: 700 }, lineSpacing: 6,
    }));
    if (note) {
      this.container.add(this.add.text(130, 238, note, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#8fa8c8',
        wordWrap: { width: 700 }, lineSpacing: 3,
      }));
    }
    const count = specs.length;
    const startY = count >= 4 ? 282 : count === 3 ? 314 : 350;
    const height = count >= 4 ? 48 : 54;
    const gap = count >= 4 ? 54 : 62;
    this.renderOptions(specs.map((spec, i) => ({
      x: 130, y: startY + i * gap, w: 700, h: height,
      label: spec.label, sub: spec.sub, action: spec.action,
    })));
  }

  // 事件0-1《最后一页》
  private showExamEvePhase() {
    this.showStoryPhase(
      '0-1 · 最后一页',
      '高考前夜。错题本翻到最后一页，窗外是蝉鸣和老风扇的转动声。手机亮着，班群里不断有人发“明天加油”。',
      [
        { label: '再看一遍错题本', sub: '能多看一点是一点', action: () => this.finishExamEve('review', 2, -5) },
        { label: '关灯睡觉', sub: '养足精神比临阵磨枪重要', action: () => this.finishExamEve('sleep', -2, 5) },
        { label: '给爸妈发消息：“谢谢你们”', action: () => { this.addMotive('family', 2); this.finishExamEve('text_parents', 0, 0); } },
        { label: '写进日记：“不管考成什么样，我想学医”', action: () => { this.addMotive('idealism', 3); setFlag('wrote_med_diary'); this.finishExamEve('write_diary', 0, 0); } },
      ],
      '这里没有正确答案。你只是第一次告诉游戏：面对重要时刻，你通常会怎样做。',
    );
  }

  private finishExamEve(choice: ExamEveChoice, scoreModifier: number, stamina: number) {
    this.patchEra0({ examEveChoice: choice, examScoreModifier: getState().era0.examScoreModifier + scoreModifier });
    if (stamina !== 0) updateStats({ stamina });
    this.time.delayedCall(160, () => this.showExamSitePhase());
  }

  // 事件0-2《考场外》
  private showExamSitePhase() {
    this.showStoryPhase(
      '0-2 · 考场外',
      '考场外挤满了考生和家长。有人还在背公式，有人在哭，有人在笑。警戒线另一边，送考的人群像一片缓慢起伏的潮水。',
      [
        { label: '一个考生晕倒了，上前扶一把', action: () => { this.addMotive('idealism', 2); setFlag('helped_fainted_student'); this.finishExamSite('help_student'); } },
        { label: '妈妈在人群外挥手，朝她笑一笑', action: () => { this.addMotive('family', 2); setFlag('waved_to_mom'); this.finishExamSite('wave_mom'); } },
        { label: '看见横幅：“知识改变命运”', action: () => { this.addMotive('pragmatism', 2); setFlag('noticed_slogan'); this.finishExamSite('notice_slogan'); } },
        { label: '什么也不想，深呼吸走进考场', action: () => { updateStats({ sanity: 3 }); setFlag('calm_entrance'); this.finishExamSite('calm'); } },
      ],
    );
  }

  private finishExamSite(choice: ExamSiteChoice) {
    this.patchEra0({ examSiteChoice: choice });
    this.time.delayedCall(160, () => this.showEstimatePhase());
  }

  // 事件0-3《估分》
  private showEstimatePhase() {
    const state = getState();
    const base = academicBaseScore(state.attrs.academic)
      + familyScoreModifier(state.era0.familyStatus)
      + state.era0.examScoreModifier;
    this.showStoryPhase(
      '0-3 · 估分',
      `高考结束第二天。你对着答案逐题核对，手心有点潮。按目前的记忆，分数大概落在 ${Math.max(0, base - 15)}—${Math.min(750, base + 15)} 之间。`,
      [
        { label: '往高了估', sub: '给自己一点信心，也承担落差', action: () => this.finishEstimate('high', base) },
        { label: '往低了估', sub: '先做好最坏的心理准备', action: () => this.finishEstimate('low', base) },
        { label: '老老实实估', sub: '是多少就是多少', action: () => this.finishEstimate('accurate', base) },
      ],
    );
  }

  private finishEstimate(choice: EstimateChoice, base: number) {
    this.patchEra0({ estimateChoice: choice, estimatedScore: estimateFromChoice(base, choice) });
    this.time.delayedCall(160, () => this.showDinnerPhase());
  }

  // 事件0-4《饭桌上的对话》
  private showDinnerPhase() {
    const status = getState().era0.familyStatus;
    if (status === 'wealthy') {
      this.showStoryPhase(
        '0-4 · 饭桌上的对话',
        '爸爸放下茶杯：“想好报什么了吗？学医的话，你大伯在省人民医院，多少能告诉你里面是什么样。不过金融、计算机，甚至出国，我们也支持。”',
        [
          { label: '“我想学医，我是认真的。”', action: () => { this.addMotive('idealism', 3); this.finishDinner('wealthy_serious'); } },
          { label: '“听你们的吧。”', action: () => { this.addMotive('family', 2); this.finishDinner('wealthy_follow'); } },
          { label: '“我还没想好，再看看。”', action: () => this.finishDinner('wealthy_unsure') },
        ],
        '现实注脚：医学生的专业选择常同时受到就业、收入、家庭建议和个人兴趣影响。',
      );
      return;
    }
    if (status === 'middle') {
      this.showStoryPhase(
        '0-4 · 饭桌上的对话',
        '妈妈给你夹了一块排骨：“邻居张阿姨的儿子去年考上临床，家里可骄傲了。你也学医吧，以后稳定，我们老了也放心。”',
        [
          { label: '“好，那就学医。”', action: () => { this.addMotive('family', 3); this.finishDinner('middle_agree'); } },
          { label: '“其实……我有点怕血。”', action: () => { setFlag('afraid_of_blood'); this.finishDinner('middle_blood'); } },
          { label: '“学医太久了，我想早点挣钱。”', action: () => { this.addMotive('pragmatism', 3); this.finishDinner('middle_money'); } },
        ],
      );
      return;
    }
    const poor = status === 'poor';
    this.showStoryPhase(
      '0-4 · 饭桌上的对话',
      poor
        ? '爸爸沉默了很久：“咱家的情况你知道。学医时间长，家里未必撑得轻松。但你真想去，爸就想办法。听说还有免费的定向医学生。”'
        : '爸爸抽着烟：“咱家得精打细算。学医时间长、花钱多，但你要是真想去，爸砸锅卖铁也供你。”',
      [
        { label: '“我不怕苦，我想学医。”', action: () => { updateStats({ sanity: -5 }); this.addMotive('idealism', 3); this.finishDinner('ordinary_persist'); } },
        { label: '“要不我先不读大学，早点工作。”', action: () => this.exitEra0('worker_steady', 'no_college') },
        { label: '“有没有免费的定向医学生？”', action: () => { this.addMotive('pragmatism', 3); setFlag('rural_oriented_candidate'); this.patchEra0({ ruralOriented: true }); this.finishDinner('ordinary_oriented'); } },
      ],
      poor ? '困难家境解锁：免费医学定向培养。学费与住宿有政策支持，但毕业后需履约服务基层。' : undefined,
    );
  }

  private finishDinner(choice: string) {
    this.patchEra0({ dinnerChoice: choice });
    this.time.delayedCall(180, () => this.resolveScoreAndReveal());
  }

  private clearContainer() {
    this.removeKeyboard();
    this.container.removeAll(true);
    this.options = [];
    this.inSchoolPhase = false;
  }

  // —— 通用可键盘导航的选项列表 ——
  private renderOptions(specs: OptionSpec[]) {
    this.options = [];
    this.focusIndex = 0;
    specs.forEach((s, i) => {
      const bg = this.add.graphics();
      const disabled = s.disabled === true;
      const draw = (focused: boolean) => {
        bg.clear();
        bg.fillStyle(disabled ? 0x101014 : focused ? 0x2a2a52 : 0x111122, disabled ? 0.75 : focused ? 0.98 : 0.9);
        bg.fillRoundedRect(s.x, s.y, s.w, s.h, 6);
        bg.lineStyle(focused && !disabled ? 2 : 1, disabled ? 0x555566 : 0x4fc3f7, disabled ? 0.35 : focused ? 0.95 : 0.3);
        bg.strokeRoundedRect(s.x, s.y, s.w, s.h, 6);
      };
      draw(false);
      this.container.add(bg);

      const labelText = this.add.text(s.x + 16, s.y + 8, s.label, {
        fontFamily: '"Courier New", monospace', fontSize: '16px', color: disabled ? '#777788' : '#4fc3f7', fontStyle: 'bold',
      });
      this.container.add(labelText);
      if (s.sub) {
        this.container.add(this.add.text(s.x + 16, s.y + 32, s.sub, {
          fontFamily: '"Courier New", monospace', fontSize: '11px', color: disabled ? '#666677' : '#888888',
        }));
      }

      const hit = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, 0, 0);
      if (!disabled) {
        hit.setInteractive({ cursor: 'pointer' });
        hit.on('pointerover', () => this.setFocus(i));
        hit.on('pointerout', () => {
          if (this.focusIndex !== i) { draw(false); labelText.setColor('#4fc3f7'); }
        });
        hit.on('pointerdown', () => this.choose(i));
      }

      this.options.push({ ...s, draw, labelText });
    });

    this.applyFocus();
    this.registerKeyboard();
  }

  private registerKeyboard() {
    this.removeKeyboard();
    this.keyHandler = (e: KeyboardEvent) => {
      const n = this.options.length;
      if (n === 0) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
        case 'Tab':
          e.preventDefault();
          this.setFocus((this.focusIndex + 1) % n);
          return;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          this.setFocus((this.focusIndex - 1 + n) % n);
          return;
      case 'Enter':
      case ' ':
          e.preventDefault();
          this.choose(this.focusIndex);
          return;
        case 'PageDown':
        case ']':
          if (this.inSchoolPhase) { e.preventDefault(); this.showSchoolPhase(this.schoolPage + 1); }
          return;
        case 'PageUp':
        case '[':
          if (this.inSchoolPhase) { e.preventDefault(); this.showSchoolPhase(this.schoolPage - 1); }
          return;
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && num <= n) {
        e.preventDefault();
        this.choose(num - 1);
      }
    };
    this.input.keyboard?.on('keydown', this.keyHandler);
  }

  private removeKeyboard() {
    if (this.keyHandler) {
      this.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  private setFocus(i: number) {
    if (i === this.focusIndex) return;
    const old = this.options[this.focusIndex];
    old?.draw(false);
    old?.labelText.setColor(old.disabled ? '#777788' : '#4fc3f7');
    this.focusIndex = i;
    this.applyFocus();
  }

  private applyFocus() {
    const o = this.options[this.focusIndex];
    if (!o) return;
    o.draw(true);
    o.labelText.setColor(o.disabled ? '#888899' : '#ffffff');
  }

  private choose(i: number) {
    const o = this.options[i];
    if (!o) return;
    if (o.disabled) return;
    this.removeKeyboard();
    o.action();
  }

  // 事件0-5《放榜夜》：成绩、家境、考前选择与运气共同决定最终分数。
  private resolveScoreAndReveal() {
    const state = getState();
    const luck = state.attrs.luck;
    const luckSwing = Math.round((Math.random() * 20 - 10) * (0.7 + luck * 0.08));
    const score = Math.max(300, Math.min(750,
      academicBaseScore(state.attrs.academic)
      + familyScoreModifier(state.era0.familyStatus)
      + state.era0.examScoreModifier
      + luckSwing,
    ));
    const rank = approximateRank(score);
    this.selectedScore = score;
    patchState({ score });
    this.patchEra0({ rank });
    if (score >= 680) setFlag('score_680plus');
    const reaction = score >= 650
      ? `父亲的手抖了一下，把成绩单看了三遍：“${this.sonWord()}，这个分数，真能去很远的地方了。”\n母亲在厨房里站了很久，出来时眼睛有点红。`
      : score >= 550
        ? '父母同时松了口气。这个分数不算命运开挂，但足够让志愿表上出现几所真正的医学院。饭桌上很快开始讨论城市、学费和学制。'
        : score >= 492
          ? '屋里安静了几秒。临床医学还有机会，但每一个志愿都必须填得很小心。父亲说：“先别急，咱们一所一所看。”'
          : '网页上的数字没有变。屋里安静了很久。父亲最后说：“要不……复读一年？”你知道，以这个分数直接进入本科医学院已经很难。';
    this.time.delayedCall(200, () => this.showScoreReveal(reaction));
  }

  // “放榜夜”：把分数落进家庭情绪里，让高中生玩家先体会一次“成绩=全家心情”
  private showScoreReveal(reaction: string) {
    const state = getState();
    const gap = this.selectedScore - state.era0.estimatedScore;
    const schoolPossible = this.canEnterMedicine();
    const options: Array<{ label: string; sub?: string; action: () => void }> = [
      {
        label: '冲出去告诉爸妈', sub: schoolPossible ? '让这个数字先成为全家的消息' : '然后一起商量复读或定向培养',
        action: () => { this.addMotive('family', 2); setFlag('gaokao_told_parents'); this.patchEra0({ scoreReaction: 'tell_parents' }); schoolPossible ? this.showSchoolPhase() : this.showTeacherAdvicePhase(); },
      },
      {
        label: '一个人在房间里消化', sub: gap >= 0 ? '比估分高，惊喜需要一点时间落地' : '比估分低，先让落差过去',
        action: () => { updateStats({ sanity: gap >= 0 ? 5 : -5 }); setFlag(gap >= 0 ? 'estimate_surprise' : 'estimate_disappointment'); this.patchEra0({ scoreReaction: 'alone' }); schoolPossible ? this.showSchoolPhase() : this.showTeacherAdvicePhase(); },
      },
      {
        label: '给班主任打电话', sub: '听听一个看过很多届学生的人怎么说',
        action: () => { setFlag('called_head_teacher'); this.patchEra0({ scoreReaction: 'teacher' }); this.showTeacherAdvicePhase(); },
      },
    ];
    if (!schoolPossible || (gap < -10 && this.selectedScore < 550)) {
      options.push({
        label: '躲进被子里哭，拒绝再谈“学医”', sub: '结束这条尚未真正开始的路',
        action: () => { updateStats({ sanity: -10 }); setFlag('cried_after_gaokao'); this.exitEra0('era0_escape_white_tower', 'escaped_white_tower'); },
      });
    }
    this.showStoryPhase(
      `0-5 · 放榜夜  ${this.selectedScore}分 · 约全省第${state.era0.rank.toLocaleString()}名`,
      reaction,
      options,
      '现实注脚：临床医学录取分数普遍高于许多普通专业；顶尖八年制通常要求全省最前列。位次为叙事近似值，并非具体省份的一分一段表。',
    );
  }

  private canEnterMedicine(): boolean {
    return SCHOOLS.some(s => s.minScore <= this.selectedScore);
  }

  // 事件0-6《班主任的电话》
  private showTeacherAdvicePhase() {
    if (this.selectedScore >= 650) {
      this.showStoryPhase(
        '0-6 · 班主任的电话',
        '李老师的声音带着熬夜后的沙哑：“你这个分数，顶尖医学院可以冲。但八年制听起来省事，淘汰和科研压力都是真的。你得想清楚。”',
        [
          { label: '“我想冲八年制。”', action: () => { this.addMotive('idealism', 2); setFlag('teacher_pref_eight_year'); this.patchEra0({ teacherAdvice: 'eight_year' }); this.showSchoolPhase(); } },
          { label: '“稳妥一点，优先5+3。”', action: () => { this.addMotive('pragmatism', 2); setFlag('teacher_pref_five_plus_three'); this.patchEra0({ teacherAdvice: 'five_plus_three' }); this.showSchoolPhase(); } },
          { label: '“我先看学校和培养方案。”', action: () => { this.patchEra0({ teacherAdvice: 'compare_tracks' }); this.showSchoolPhase(); } },
        ],
      );
      return;
    }
    if (this.selectedScore >= 550) {
      this.showStoryPhase(
        '0-6 · 班主任的电话',
        '“省内医科大学有机会。临床医学要看具体位次，别只看去年最低分。要不要接受调剂，也得现在想好。”',
        [
          { label: '“我只想读临床，不服从调剂。”', action: () => { this.addMotive('idealism', 2); setFlag('insisted_clinical'); this.patchEra0({ teacherAdvice: 'clinical_only' }); this.showSchoolPhase(); } },
          { label: '“可以接受更稳妥的培养路线。”', action: () => { this.addMotive('pragmatism', 2); setFlag('accepted_adjustment'); this.patchEra0({ teacherAdvice: 'adjustment' }); this.showSchoolPhase(); } },
          { label: '“我还是没想好要不要学医。”', action: () => { this.patchEra0({ teacherAdvice: 'hesitating' }); this.showSchoolPhase(); } },
        ],
      );
      return;
    }
    const options: Array<{ label: string; sub?: string; action: () => void }> = [];
    if (!getState().era0.repeated) {
      options.push({ label: '“我复读一年，明年再战。”', action: () => this.repeatGaokao() });
    }
    options.push(
      { label: '“我报免费定向医学生。”', action: () => { this.addMotive('pragmatism', 3); setFlag('rural_oriented_candidate'); this.patchEra0({ ruralOriented: true, teacherAdvice: 'rural_oriented' }); this.ensureOrientedScoreAndContinue(); } },
      { label: '“那我换个专业吧。”', action: () => this.exitEra0(this.selectedScore < 450 ? 'era0_fell_short' : 'era0_unchosen_road', this.selectedScore < 450 ? 'fell_short' : 'unchosen_road') },
    );
    this.showStoryPhase(
      '0-6 · 班主任的电话',
      '李老师沉默了两秒：“临床医学确实难。但路不只一条——复读、定向培养，或者换一个专业，都不是人生失败。”',
      options,
    );
  }

  private repeatGaokao() {
    const nextScore = Math.min(710, this.selectedScore + 55 + Math.round(Math.random() * 20));
    this.selectedScore = nextScore;
    const state = getState();
    patchState({ score: nextScore, stats: { ...state.stats, age: state.stats.age + 1 } });
    this.patchEra0({ repeated: true, rank: approximateRank(nextScore), teacherAdvice: 'repeat' });
    setFlag('repeated_gaokao');
    this.showScoreReveal('一年后，你再次输入准考证号。这一次，数字终于越过了医学院校的门槛。你比同届人晚了一年，也比一年前的自己更清楚为什么回来。');
  }

  private ensureOrientedScoreAndContinue() {
    if (!this.canEnterMedicine()) {
      this.selectedScore = 500;
      patchState({ score: 500 });
      this.patchEra0({ rank: approximateRank(500) });
    }
    this.showSchoolPhase();
  }

  private exitEra0(endingId: string, reason: Exclude<ReturnType<typeof getState>['era0']['exitReason'], null>) {
    this.removeKeyboard();
    this.patchEra0({ exitReason: reason });
    if (reason === 'unchosen_road') setFlag('era0_unchosen_road');
    else if (reason === 'fell_short') setFlag('era0_fell_short');
    else if (reason === 'no_college') setFlag('no_college');
    else setFlag('era0_escape_white_tower');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(600, () => this.scene.start('EndingScene', { endingId }));
  }

  private tierFlavor(tier: number): string {
    switch (tier) {
      case 1: return '第一梯队：顶尖资源、最强同辈，也最卷';
      case 2: return '第二梯队：扎实的省属 / 211，出路不错';
      case 3: return '第三梯队：普通省属，靠自己多拼一点';
      default: return '第四梯队：地市医学院，离家近、更务实';
    }
  }

  private familyStatusLabel(status: Era0FamilyStatus): string {
    if (status === 'wealthy') return '优渥 · 选择很多';
    if (status === 'middle') return '小康 · 稳定期待';
    if (status === 'ordinary') return '普通 · 需要精打细算';
    return '困难 · 每一步都要算成本';
  }

  private showSchoolPhase(page = 0) {
    this.clearContainer();
    this.inSchoolPhase = true;
    this.schoolPage = page;

    const pal = getPalette('gaokao');
    const eligibleSchools = SCHOOLS
      .filter(s => s.minScore <= this.selectedScore)
      .filter(s => !getState().era0.ruralOriented || s.tier >= 3)
      .sort((a, b) => b.minScore - a.minScore); // 高分（顶尖）排在前

    const totalPages = Math.max(1, Math.ceil(eligibleSchools.length / this.schoolPageSize));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    this.schoolPage = safePage;
    const pageItems = eligibleSchools.slice(safePage * this.schoolPageSize, safePage * this.schoolPageSize + this.schoolPageSize);

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(80, 70, 800, 460, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 86, `${getState().era0.ruralOriented ? '定向培养志愿' : '选择学校'}  /  高考成绩 ${this.selectedScore} 分`, {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    const topTier = eligibleSchools.length ? eligibleSchools[0].tier : 4;
    this.container.add(this.add.text(480, 108, `共 ${eligibleSchools.length} 所符合  ·  第 ${safePage + 1} / ${totalPages} 页  (PgUp/PgDn翻页)`, {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888899',
    }).setOrigin(0.5));

    this.container.add(this.add.text(480, 126, '可冲最高档：' + this.tierFlavor(topTier), {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#aaccff',
    }).setOrigin(0.5));

    if (pageItems.length === 0) {
      this.container.add(this.add.text(480, 300, '没有符合该分数的医学院，请返回重选成绩。', {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ff8888',
      }).setOrigin(0.5));
    }

    const specs: OptionSpec[] = pageItems.map((school, i) => ({
      x: 100, y: 144 + i * 60, w: 760, h: 52,
      label: school.name, sub: `${school.city}  |  ${school.realHint}`,
      action: () => {
        this.selectedSchool = school;
        this.time.delayedCall(200, () => this.showTrackPhase());
      },
    }));
    this.renderOptions(specs);

    // 上一页 / 下一页 按钮（不参与键盘焦点导航）
    const mkPageBtn = (label: string, x: number, target: number) => {
      const g = this.add.graphics();
      g.fillStyle(0x111122, 0.95);
      g.fillRoundedRect(x, 498, 150, 26, 6);
      g.lineStyle(1, 0x4fc3f7, 0.6);
      g.strokeRoundedRect(x, 498, 150, 26, 6);
      this.container.add(g);
      const t = this.add.text(x + 75, 511, label, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#4fc3f7',
      }).setOrigin(0.5);
      this.container.add(t);
      const hit = this.add.rectangle(x + 75, 511, 150, 26, 0, 0).setInteractive({ cursor: 'pointer' });
      hit.on('pointerdown', () => this.showSchoolPhase(target));
      this.container.add(hit);
    };
    if (safePage > 0) mkPageBtn('◀ 上一页', 220, safePage - 1);
    if (safePage < totalPages - 1) mkPageBtn('下一页 ▶', 590, safePage + 1);
  }

  private showTrackPhase() {
    this.clearContainer();
    const pal = getPalette('gaokao');
    const school = this.selectedSchool!;

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(100, 70, 760, 440, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 88, `选择学制  /  ${school.name}`, {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    const specs: OptionSpec[] = TRACKS.map((track, i) => {
      const blockReason = trackBlockReason(track, school, this.selectedScore, getState().era0.ruralOriented);
      return ({
      x: 120, y: 120 + i * 100, w: 720, h: 90,
      label: blockReason ? `${track.name}（不可选）` : track.name,
      sub: blockReason ? `${track.desc}  |  ${blockReason}` : track.desc,
      disabled: blockReason !== null,
      action: () => {
        this.selectedTrack = track;
        if (track.id === 'eight_year') this.addMotive('idealism', 2);
        if (track.id === 'five_plus_three') this.addMotive('pragmatism', 2);
        this.showAdmissionLetterPhase();
      },
    });
    });
    this.renderOptions(specs);
  }

  // 事件0-8《录取通知书》
  private showAdmissionLetterPhase() {
    const school = this.selectedSchool!;
    const track = this.selectedTrack!;
    const route = getState().era0.ruralOriented ? '免费医学定向培养 · ' : '';
    this.showStoryPhase(
      '0-8 · 录取通知书',
      `EMS快递到了。你拆开硬纸信封，红色封面上印着“录取通知书”。\n\n${school.name} · ${route}${track.name}\n\n那个在志愿表上闪烁过很多次的名字，现在真正属于你了。`,
      [
        { label: '拍照发朋友圈', sub: '让所有人知道这个夏天的结果', action: () => { updateStats({ relations: 1 }); setFlag('shared_admission'); this.showConfirmPhase(); } },
        { label: '先拿给爸妈看', sub: '这张纸也属于一起熬过来的家人', action: () => { updateStats({ relations: 2 }); this.addMotive('family', 1); setFlag('showed_admission_to_parents'); this.showConfirmPhase(); } },
        { label: '一个人拿着看了很久', sub: '尘埃落定，反而第一次感到重量', action: () => { updateStats({ sanity: 5 }); setFlag('stared_at_admission'); this.showConfirmPhase(); } },
      ],
    );
  }

  private showConfirmPhase() {
    this.clearContainer();
    const pal = getPalette('gaokao');
    const school = this.selectedSchool!;
    const track = this.selectedTrack!;

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(120, 66, 720, 450, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 84, '0-9 · 初心之问', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.container.add(this.add.text(480, 110, '入学前夜。行李已经收好，新生群还有99+条未读消息。\n你回想这个夏天，也回想自己为什么走到这里。', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#aaccff',
      wordWrap: { width: 620 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0));

    const lines: [string, string][] = [
      ['高考结果', `${this.selectedScore}分 · 约第${getState().era0.rank.toLocaleString()}名`],
      ['报考学校', school.name],
      ['培养模式', `${getState().era0.ruralOriented ? '免费定向 · ' : ''}${track.name}`],
      ['家庭起点', this.familyStatusLabel(getState().era0.familyStatus)],
    ];

    lines.forEach(([k, v], i) => {
      const y = 166 + i * 27;
      this.container.add(this.add.text(160, y, k + '：', {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#666677',
      }));
      this.container.add(this.add.text(300, y, v, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff',
      }));
    });

    const m = getState().motivation;
    const motivationLines = [
      `理想主义  ${motivationBar(m.idealism)} ${m.idealism}/10`,
      `家庭期望  ${motivationBar(m.family)} ${m.family}/10`,
      `现实考量  ${motivationBar(m.pragmatism)} ${m.pragmatism}/10`,
    ].join('\n');
    this.container.add(this.add.text(480, 280, '《抉择之夏 · 初心报告》\n' + motivationLines, {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#cfd8ff',
      align: 'left', lineSpacing: 4,
    }).setOrigin(0.5, 0));

    const answerSpecs: Array<{ label: string; sub: string; motive: MotivationKind; answer: InitialAnswer }> = [
      { label: '我会记得。', sub: '我想成为能改变别人命运的人。', motive: 'idealism', answer: 'remember' },
      { label: '谁知道呢。', sub: '这份选择，也承载着家人的期待。', motive: 'family', answer: 'uncertain' },
      { label: '其实我有点害怕。', sub: '但这是一条值得投入的现实道路。', motive: 'pragmatism', answer: 'afraid' },
    ];
    this.renderOptions(answerSpecs.map((spec, i) => ({
      x: 120 + i * 245, y: 422, w: 225, h: 54,
      label: spec.label, sub: spec.sub,
      action: () => this.confirmAndTransition(spec.motive, spec.answer),
    })));
  }

  private confirmAndTransition(answerMotive: MotivationKind = 'idealism', answer: InitialAnswer = 'remember') {
    const school = this.selectedSchool!;
    const track = this.selectedTrack!;
    const state = getState();
    const score = this.selectedScore || state.score;
    const blockReason = trackBlockReason(track, school, score, state.era0.ruralOriented);
    if (blockReason) {
      this.selectedTrack = null;
      this.showTrackPhase();
      return;
    }

    sound.click();

    const degreeMap: Record<string, DegreeType> = {
      eight_year: 'phd',
      five_plus_three: 'master_pro',
      five_year: 'bachelor',
    };

    const degree = degreeMap[track.id] ?? 'bachelor';
    const motivation = addMotivation(state.motivation, { [answerMotive]: 3 });
    const initialMotivation = dominantMotivation(motivation, answerMotive);
    const purposeType = initialMotivation === 'idealism' ? 'idealistic' : initialMotivation === 'family' ? 'family' : 'pragmatic';
    const purposeStory = initialMotivation === 'idealism' ? '希望通过医学改变他人的命运'
      : initialMotivation === 'family' ? '承载家人的期待走入医学' : '把医学视为值得投入的现实道路';
    const spirit = normalizeSpirit(undefined, purposeType);
    setState({
      ...state,
      school: school,
      track: track.id,
      degree,
      motivation,
      initialMotivation,
      initialAnswer: answer,
      spirit: { ...spirit, purpose: { ...spirit.purpose, type: purposeType, originStory: purposeStory } },
    });
    setFlag(answer === 'remember' ? 'remember_初心' : answer === 'uncertain' ? 'uncertain_初心' : 'afraid_初心');
    setFlag('initial_motivation_' + initialMotivation);
    setFlag('enrolled_' + school.id);
    setFlag('track_' + track.id);
    // 长学制入学即按临床一体化培养；普通五年制不预设规培后的科研/临床选择。
    if (degree === 'phd' || degree === 'master_pro') setTrainingTrack('clinical');
    else clearTrainingTrack();
    // 长学制（8 年一贯制：本博连读 / 5+3）统一置 long_system，
    // 用于本科结束路由直读硕士/博士，以及"连续低分转普通班"警告。
    if (track.id === 'eight_year' || track.id === 'five_plus_three') setFlag('long_system');
    // 院校档次标记（驱动阶层叙事）
    setFlag('school_tier_' + school.tier);

    saveGame('CampusScene', [], []);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.start('CampusScene');
    });
  }
}
