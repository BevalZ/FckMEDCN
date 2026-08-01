import Phaser from 'phaser';
import { SCHOOLS, TRACKS } from '../data/constants';
import type { School, Track } from '../data/constants';
import { getState, setState, setFlag, patchState } from '../data/gameState';
import type { DegreeType } from '../data/constants';
import { getPalette, createBgTexture, createStageDecor } from '../ui/pixelArt';
import { CharacterSprite } from '../ui/CharacterSprite';
import { sound } from '../audio/sound';
import { saveGame } from '../data/save';

interface OptionSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
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

    const pal = getPalette('gaokao');
    const header = this.add.graphics();
    header.fillStyle(pal.panel, 0.95);
    header.fillRect(0, 0, 960, 56);
    header.fillStyle(pal.accent, 1);
    header.fillRect(0, 54, 960, 2);

    this.add.text(480, 15, '2024年高考 · 志愿填报', {
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

    // 家庭条件（开局随机，决定上学期间父母补贴/生活费水平）
    const fam = getState().familyWealth;
    const famLabel: Record<string, string> = { rich: '家境殷实（父母补贴充足）', middle: '家境普通', tight: '家境拮据（得多靠自己）' };
    this.container.add(this.add.text(480, 162, `你的家庭：${famLabel[fam] ?? '家境普通'}`, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffd54f',
    }).setOrigin(0.5));

    const specs: OptionSpec[] = [
      {
        x: 240, y: 190, w: 480, h: 64,
        label: '男生', sub: '叙述里会以"学长 / 儿子"等称谓称呼你',
        action: () => {
          patchState({ gender: 'male' });
          this.time.delayedCall(150, () => this.showScorePhase());
        },
      },
      {
        x: 240, y: 274, w: 480, h: 64,
        label: '女生', sub: '叙述里会以"学姐 / 女儿"等称谓称呼你',
        action: () => {
          patchState({ gender: 'female' });
          this.time.delayedCall(150, () => this.showScorePhase());
        },
      },
    ];
    this.renderOptions(specs);
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
      const draw = (focused: boolean) => {
        bg.clear();
        bg.fillStyle(focused ? 0x2a2a52 : 0x111122, focused ? 0.98 : 0.9);
        bg.fillRoundedRect(s.x, s.y, s.w, s.h, 6);
        bg.lineStyle(focused ? 2 : 1, 0x4fc3f7, focused ? 0.95 : 0.3);
        bg.strokeRoundedRect(s.x, s.y, s.w, s.h, 6);
      };
      draw(false);
      this.container.add(bg);

      const labelText = this.add.text(s.x + 16, s.y + 8, s.label, {
        fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#4fc3f7', fontStyle: 'bold',
      });
      this.container.add(labelText);
      if (s.sub) {
        this.container.add(this.add.text(s.x + 16, s.y + 32, s.sub, {
          fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888',
        }));
      }

      const hit = this.add.rectangle(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h, 0, 0)
        .setInteractive({ cursor: 'pointer' });
      hit.on('pointerover', () => this.setFocus(i));
      hit.on('pointerout', () => {
        if (this.focusIndex !== i) { draw(false); labelText.setColor('#4fc3f7'); }
      });
      hit.on('pointerdown', () => this.choose(i));

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
    old?.labelText.setColor('#4fc3f7');
    this.focusIndex = i;
    this.applyFocus();
  }

  private applyFocus() {
    const o = this.options[this.focusIndex];
    if (!o) return;
    o.draw(true);
    o.labelText.setColor('#ffffff');
  }

  private choose(i: number) {
    const o = this.options[i];
    if (!o) return;
    this.removeKeyboard();
    o.action();
  }

  private showScorePhase() {
    this.clearContainer();
    const pal = getPalette('gaokao');

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(160, 70, 640, 420, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 88, '你的高考成绩是多少？', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    const scoreOptions = [
      { label: '685分以上', desc: '清北复交协级别', score: 685, flag: 'score_680plus',
        reaction: `父亲的手抖了一下，把成绩单看了三遍："${this.sonWord()}，你这是要上天。"\n母亲在厨房默默多炒了两个菜。你成了家族近百年来第一个够得着协和的。` },
      { label: '650 ~ 684分', desc: '老牌985医学院', score: 670,
        reaction: '父母在亲戚群里连发了三条消息。\n"985的临床，稳了。"父亲拍着你肩膀，"不过以后同辈也猛，别飘。"' },
      { label: '610 ~ 649分', desc: '211 / 强校医学院', score: 645,
        reaction: '父母松了口气："211，挺好，至少是个正经大学。"\n饭桌上他们开始盘算，毕业能不能进市里的医院。' },
      { label: '560 ~ 609分', desc: '省属重点医科大学', score: 605,
        reaction: '父亲皱了下眉："怎么不是211？"母亲打圆场："医学生嘛，能学上就行。"\n你低头扒饭，没接话。' },
      { label: '540分及以下', desc: '普通医学院 / 医专', score: 540,
        reaction: '屋里安静了很久。父亲最后说："要不……复读一年？"\n你看着自己的分数，心里两个声音打架：再拼一次，还是认了这条路。' },
    ];

    const specs: OptionSpec[] = scoreOptions.map((opt, i) => ({
      x: 200, y: 150 + i * 64, w: 560, h: 52,
      label: opt.label, sub: opt.desc,
      action: () => {
        this.selectedScore = opt.score;
        if (opt.flag) setFlag(opt.flag);
        this.time.delayedCall(200, () => this.showScoreReveal(opt.reaction));
      },
    }));
    this.renderOptions(specs);
  }

  // “放榜夜”：把分数落进家庭情绪里，让高中生玩家先体会一次“成绩=全家心情”
  private showScoreReveal(reaction: string) {
    this.clearContainer();
    const pal = getPalette('gaokao');

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.92);
    panel.fillRoundedRect(120, 70, 720, 400, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 92, `放榜夜 · ${this.selectedScore} 分`, {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.container.add(this.add.text(160, 130, reaction, {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#cccccc',
      wordWrap: { width: 640 }, lineSpacing: 6,
    }));

    const contSpec: OptionSpec = {
      x: 380, y: 400, w: 200, h: 42,
      label: '继续选校 →', sub: undefined,
      action: () => this.showSchoolPhase(),
    };
    this.renderOptions([contSpec]);
  }

  private tierFlavor(tier: number): string {
    switch (tier) {
      case 1: return '第一梯队：顶尖资源、最强同辈，也最卷';
      case 2: return '第二梯队：扎实的省属 / 211，出路不错';
      case 3: return '第三梯队：普通省属，靠自己多拼一点';
      default: return '第四梯队：地市医学院，离家近、更务实';
    }
  }

  private confirmBlurb(school: School, track: Track): string {
    const tierWord = ['', '顶尖', '强势', '普通', '地市'][school.tier] ?? '';
    return `你把志愿表按在桌上。${school.city}的${tierWord}医学院，${track.name}——\n这一交上去，就是接下来 ${track.totalYears} 年的底色。`;
  }

  private showSchoolPhase(page = 0) {
    this.clearContainer();
    this.inSchoolPhase = true;
    this.schoolPage = page;

    const pal = getPalette('gaokao');
    const eligibleSchools = SCHOOLS
      .filter(s => s.minScore <= this.selectedScore)
      .sort((a, b) => b.minScore - a.minScore); // 高分（顶尖）排在前

    const totalPages = Math.max(1, Math.ceil(eligibleSchools.length / this.schoolPageSize));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    this.schoolPage = safePage;
    const pageItems = eligibleSchools.slice(safePage * this.schoolPageSize, safePage * this.schoolPageSize + this.schoolPageSize);

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(80, 70, 800, 460, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 86, `选择学校  /  高考成绩 ${this.selectedScore} 分`, {
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

    const availableTracks = TRACKS.filter(t => school.tier <= t.requiresTier);

    const specs: OptionSpec[] = availableTracks.map((track, i) => ({
      x: 120, y: 120 + i * 100, w: 720, h: 90,
      label: track.name, sub: track.desc,
      action: () => {
        this.selectedTrack = track;
        this.showConfirmPhase();
      },
    }));
    this.renderOptions(specs);
  }

  private showConfirmPhase() {
    this.clearContainer();
    const pal = getPalette('gaokao');
    const school = this.selectedSchool!;
    const track = this.selectedTrack!;

    const panel = this.add.graphics();
    panel.fillStyle(pal.panel, 0.9);
    panel.fillRoundedRect(160, 70, 640, 400, 10);
    this.container.add(panel);

    this.container.add(this.add.text(480, 92, '志愿确认', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.container.add(this.add.text(480, 116, this.confirmBlurb(school, track), {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#aaccff',
      wordWrap: { width: 560 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0));

    const lines: [string, string][] = [
      ['高考分数', `${this.selectedScore}分`],
      ['报考学校', school.name],
      ['学制', track.name],
      ['总学制', `${track.totalYears}年`],
    ];

    lines.forEach(([k, v], i) => {
      const y = 158 + i * 30;
      this.container.add(this.add.text(200, y, k + '：', {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#666677',
      }));
      this.container.add(this.add.text(380, y, v, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff',
      }));
    });

    const confirmSpec: OptionSpec = {
      x: 280, y: 400, w: 200, h: 42,
      label: '确认提交', sub: undefined,
      action: () => this.confirmAndTransition(),
    };
    this.renderOptions([confirmSpec]);
  }

  private confirmAndTransition() {
    const school = this.selectedSchool!;
    const track = this.selectedTrack!;
    const state = getState();

    sound.click();

    const degreeMap: Record<string, DegreeType> = {
      eight_year: 'phd',
      five_plus_three: 'master_pro',
      five_year: 'bachelor',
    };

    const degree = degreeMap[track.id] ?? 'bachelor';
    setState({
      ...state,
      school: school,
      track: track.id,
      degree,
    });
    setFlag('enrolled_' + school.id);
    setFlag('track_' + track.id);
    // 学制 → 临床 / 科研 路线标记（驱动硕博阶段事件内容）
    if (degree === 'phd' || degree === 'master_pro') setFlag('track_clinical');
    else setFlag('track_research');
    // 院校档次标记（驱动阶层叙事）
    setFlag('school_tier_' + school.tier);

    saveGame('CampusScene', [], []);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.start('CampusScene');
    });
  }
}
