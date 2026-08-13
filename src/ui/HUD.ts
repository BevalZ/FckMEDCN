import Phaser from 'phaser';
import type { Stats } from '../data/stats';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { getPalette } from './pixelArt';
import { sound } from '../audio/sound';
import { getState } from '../data/gameState';
import { currentRegionTier, MENTOR_HUD_LABEL, REGION_LABEL } from '../data/economy';
import { specialtyLoadHudHint } from '../data/specialtyLoad';

export class HUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private statTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private stage: string;
  private muteIcon: Phaser.GameObjects.Graphics[] = [];
  // 临床/科研天平条 + 造假风险
  private balanceBar!: Phaser.GameObjects.Graphics;
  private balanceLabel!: Phaser.GameObjects.Text;
  private riskLabel!: Phaser.GameObjects.Text;
  private attrsLabel!: Phaser.GameObjects.Text;
  private prevAssets = 0;
  private assetsInitialized = false;
  private assetFlashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, stage: string) {
    this.scene = scene;
    this.stage = stage;
    this.build();
  }

  private build() {
    const pal = getPalette(this.stage);
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);

    const bg = this.scene.add.graphics();
    bg.fillStyle(pal.panel, 0.95);
    bg.fillRect(0, 0, 960, 54);
    bg.fillStyle(pal.accent, 1);
    bg.fillRect(0, 52, 960, 2);
    this.container.add(bg);

    const stats = HUD_STATS;
    stats.forEach((stat, i) => {
      const x = 10 + i * 117;
      const icon = STAT_ICONS[stat as keyof typeof STAT_ICONS];
      const label = STAT_LABELS[stat as keyof typeof STAT_LABELS];

      const labelText = this.scene.add.text(x, 4, `${icon}${label}`, {
        fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#aaaaaa',
      });

      const valText = this.scene.add.text(x, 18, '---', {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      });
      this.statTexts.set(stat, valText);

      this.container.add([labelText, valText]);
    });

    this.buildBalanceBar();
    this.buildMuteIcon();
  }

  // 临床 ⇄ 科研 天平条（HUD 第二行 y≈34..48，第一行 y=4..31 已被 8 项属性占满）。
  // 二者共享时间，故用"天平"而非两条独立进度条来传达此消彼长的取舍关系。
  private buildBalanceBar() {
    this.balanceLabel = this.scene.add.text(10, 36, '', {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#cfd8e8',
    });
    this.balanceBar = this.scene.add.graphics();
    this.riskLabel = this.scene.add.text(290, 36, '', {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#aaaaaa',
    });
    // 属性/家庭/理财策略（HUD 第二行右侧）
    this.attrsLabel = this.scene.add.text(420, 36, '', {
      fontFamily: '"Courier New", monospace', fontSize: '8px', color: '#9aa0b5',
    });
    this.container.add([this.balanceLabel, this.balanceBar, this.riskLabel, this.attrsLabel]);
  }

  private drawBalance(clinical: number, research: number, fakeRisk: number) {
    const X = 152, Y = 38, W = 120, H = 8;
    const total = clinical + research;
    const ratio = total <= 0 ? 0.5 : clinical / total;

    this.balanceLabel.setText(`🩺${Math.round(clinical)} ⇄ ${Math.round(research)}🔬`);

    const g = this.balanceBar;
    g.clear();
    g.fillStyle(0x2a3550, 1);
    g.fillRect(X, Y, W, H);
    // 左段=临床（青），右段=科研（紫）
    const split = Math.round(W * ratio);
    g.fillStyle(0x4fc3f7, 1);
    g.fillRect(X, Y, split, H);
    g.fillStyle(0xb39ddb, 1);
    g.fillRect(X + split, Y, W - split, H);
    // 中线：完全均衡的位置
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(X + W / 2 - 1, Y - 2, 2, H + 4);

    // 造假风险：只在 >0 时显示，避免给没造假的玩家无谓压力
    if (fakeRisk > 0) {
      const dots = Math.min(5, Math.max(1, Math.ceil(fakeRisk / 20)));
      const color = fakeRisk >= 60 ? '#ff5252' : fakeRisk >= 30 ? '#ff9800' : '#ffd600';
      this.riskLabel.setText(`⚠️学术风险 ${'●'.repeat(dots)}${'○'.repeat(5 - dots)}`);
      this.riskLabel.setColor(color);
    } else {
      this.riskLabel.setText('');
    }
  }

  private buildMuteIcon() {
    const x = 930, y = 27;
    const g = this.scene.add.graphics();
    // 喇叭
    g.fillStyle(0xcccccc, 1);
    g.fillRect(x, y - 3, 5, 6);
    g.fillTriangle(x + 5, y - 7, x + 5, y + 7, x + 12, y + 1);
    g.fillTriangle(x + 5, y - 7, x + 5, y + 7, x + 12, y - 1);
    // 声波
    g.lineStyle(2, 0xcccccc, 1);
    g.beginPath(); g.arc(x + 12, y, 7, -0.6, 0.6); g.strokePath();
    this.container.add(g);
    this.muteIcon.push(g);

    if (sound.isMuted) this.drawMuteSlash(x, y);

    const hit = this.scene.add.rectangle(x + 6, y, 28, 28, 0, 0)
      .setInteractive({ cursor: 'pointer' });
    hit.on('pointerdown', () => {
      sound.toggleMute();
      this.refreshMuteIcon();
    });
    this.container.add(hit);
  }

  private drawMuteSlash(x: number, y: number) {
    const s = this.scene.add.graphics();
    s.lineStyle(2, 0xff5252, 1);
    s.beginPath(); s.moveTo(x - 2, y - 8); s.lineTo(x + 16, y + 8); s.strokePath();
    this.container.add(s);
    this.muteIcon.push(s);
  }

  private refreshMuteIcon() {
    this.muteIcon.forEach((o) => o.destroy());
    this.muteIcon = [];
    this.buildMuteIcon();
  }

  private compactLifeSystems() {
    const s = getState();
    if (!(s.research && s.mentorFaction && s.colleagues && s.family && s.love && s.spirit && s.publicImage && s.leisure)) return '';
    const love = s.love.status === 'single' ? '单' : s.love.status === 'married' ? s.love.maritalSatisfaction : s.love.intimacy;
    const side = s.leisure.sideBusiness.active ? ` 副${Math.round(s.leisure.sideBusiness.quarterlyIncome / 1000)}k` : '';
    return [
      `研${s.research.researchAbility}/${s.research.paperProgress}`,
      `派${s.mentorFaction.factionLoyalty}`,
      `同${s.colleagues.integration}`,
      `家${s.family.familyFunction}`,
      `婚${love}`,
      `心${s.spirit.meaning}`,
      `舆${s.publicImage.publicRisk}`,
      `余${s.leisure.workLifeBalance}${side}`,
    ].join(' ');
  }

  update(stats: Stats, stage: string) {
    const statMap = stats as unknown as Record<string, number>;
    for (const [key, text] of this.statTexts) {
      const val = statMap[key] ?? 0;
      if (key === 'money') {
        text.setText(`¥${val.toLocaleString()}`);
        text.setColor(val >= 0 ? '#ffc107' : '#ff5252');
      } else if (key === 'papers') {
        text.setText(`${val}篇`);
      } else if (key === 'age') {
        text.setText(`${val}岁`);
      } else {
        text.setText(`${Math.round(val)}`);
        text.setColor(val < 20 ? '#ff5252' : val < 40 ? '#ff9800' : '#ffffff');
      }
    }
    this.drawBalance(statMap.clinical ?? 0, statMap.research ?? 0, statMap.fakeRisk ?? 0);

    // 属性 / 家庭 / 理财策略
    const s = getState();
    const a = s.attrs ?? { family: 2, academic: 5, luck: 1, looks: 2 };
    const wealthWord = { rich: '殷实', middle: '普通', tight: '拮据' }[s.familyWealth] ?? '';
    const finWord = { thrifty: '节流', stable: '稳健', invest: '投资' }[s.financeStrategy] ?? '稳健';
    const loanMark = s.flags.has('student_loan') ? '贷' : '';
    const assetStr = (s.assets ?? 0) > 0 ? ` · 资产¥${(s.assets ?? 0).toLocaleString()}` : '';
    const pensionStr = (s.pension ?? 0) > 0 ? ` · 养老¥${(s.pension ?? 0).toLocaleString()}` : '';
    // 职业：科室 + 医院/地区档位（经济系数已算，必须可见）
    let careerContext = '';
    if (stage === 'career' || stage === 'pinnacle') {
      const bits: string[] = [];
      const subMap: Record<string, string> = {
        sub_internal: '内科', sub_surgery: '外科', sub_obgyn: '妇产科',
        sub_pediatrics: '儿科', sub_emergency: '急诊',
      };
      for (const [f, l] of Object.entries(subMap)) {
        if (s.flags.has(f)) { bits.push(`科:${l}`); break; }
      }
      bits.push(`档:${REGION_LABEL[currentRegionTier()]}`);
      if (s.flags.has('jh_bianzhi_in') || s.flags.has('emp_bianzhi_craft') || s.flags.has('emp_bianzhi_quiet')) {
        bits.push('编制');
      } else if (s.flags.has('contract') || s.flags.has('jh_bianzhi_out') || s.flags.has('emp_contract_negotiated') || s.flags.has('emp_contract_rushed')) {
        bits.push('合同');
      }
      const loadHint = specialtyLoadHudHint();
      if (loadHint) bits.push(loadHint);
      if (s.flags.has('chief_resident_year')) bits.push('住院总');
      careerContext = bits.length ? ` ｜ ${bits.join(' ')}` : '';
    }
    // 硕博：导师绩效风格（影响补助，简报有长文，HUD 用短标签）
    const mentorHud = (stage === 'master' || stage === 'phd')
      ? ` ｜ 导师:${MENTOR_HUD_LABEL[s.mentorStyle] ?? s.mentorStyle}`
      : '';
    const e3 = (stage === 'guipei' || stage === 'master' || stage === 'phd') ? s.era3 : null;
    const era3Label = e3?.initialized
      ? ` ｜ 临床压${e3.clinicalPressure} 科研压${e3.researchPressure} 睡眠${e3.estimatedSleep}h`
      : '';
    const h = s.health;
    const p = s.policy;
    const systems = h && p
      ? `健${h.energy}/${h.constitution}/${h.strain} 财${s.finance?.financialAnxiety ? '危' : '稳'} DRG${p.drgPressure}`
      : '';
    const lateStage = ['career', 'pinnacle', 'retirement', 'eternity'].includes(stage);
    const lifeSystems = this.compactLifeSystems();
    const earlyLine = `家境${a.family}/${wealthWord} 成绩${a.academic} 运气${a.luck} 外貌${a.looks}${loanMark ? ` 助学${loanMark}` : ''}${assetStr}${pensionStr} 理财:${finWord}${mentorHud}${era3Label}`;
    this.attrsLabel.setText(lateStage
      ? `${careerContext}${systems}${assetStr}${pensionStr} 理财:${finWord} ｜ ${lifeSystems}`
      : `${earlyLine} ｜ ${lifeSystems}`,
    );

    const assetsNow = s.assets ?? 0;
    if (!this.assetsInitialized) {
      this.prevAssets = assetsNow;
      this.assetsInitialized = true;
    } else if (assetsNow !== this.prevAssets) {
      this.flashAttrs(assetsNow > this.prevAssets ? '#69f0ae' : '#ff8a80');
      this.prevAssets = assetsNow;
    }
  }

  private flashAttrs(color: string) {
    this.assetFlashTween?.stop();
    this.attrsLabel.setColor(color);
    this.assetFlashTween = this.scene.tweens.add({
      targets: this.attrsLabel,
      alpha: { from: 1, to: 0.55 },
      yoyo: true,
      duration: 160,
      repeat: 1,
      onComplete: () => {
        this.attrsLabel.setColor('#9aa0b5');
        this.attrsLabel.setAlpha(1);
      },
    });
  }

  getContainer() { return this.container; }
  destroy() { this.container.destroy(); }
}
