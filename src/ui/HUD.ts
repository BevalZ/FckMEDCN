import Phaser from 'phaser';
import type { Stats } from '../data/stats';
import { STAT_LABELS, STAT_ICONS, HUD_STATS } from '../data/constants';
import { getPalette } from './pixelArt';
import { sound } from '../audio/sound';

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
    this.container.add([this.balanceLabel, this.balanceBar, this.riskLabel]);
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

  update(stats: Stats, _stage: string) {
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
  }

  getContainer() { return this.container; }
  destroy() { this.container.destroy(); }
}
