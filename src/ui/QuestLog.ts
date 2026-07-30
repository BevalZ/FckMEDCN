import Phaser from 'phaser';

// 简易任务清单（M5）：把本季目标 / 链式 nextEventId / 关键 flag 缺口可视化。
// 不引入新存档字段——只读当前 flags 与场景传入的 hints。

export type QuestItem = {
  id: string;
  label: string;
  done: boolean;
};

export class QuestLog {
  private root: Phaser.GameObjects.Container;
  private lines: Phaser.GameObjects.Text[] = [];
  private title!: Phaser.GameObjects.Text;
  private visible = true;

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container(760, 86).setDepth(110);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0a121c, 0.82);
    bg.fillRoundedRect(0, 0, 190, 120, 6);
    bg.lineStyle(1, 0x4fc3f7, 0.5);
    bg.strokeRoundedRect(0, 0, 190, 120, 6);
    this.root.add(bg);

    this.title = scene.add.text(10, 8, '本季目标  [Q]', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#4fc3f7', fontStyle: 'bold',
    });
    this.root.add(this.title);

    for (let i = 0; i < 4; i++) {
      const t = scene.add.text(12, 28 + i * 20, '', {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#cfd8e8',
        wordWrap: { width: 170 },
      });
      this.lines.push(t);
      this.root.add(t);
    }

    scene.input.keyboard?.on('keydown-Q', () => this.toggle());
  }

  toggle() {
    this.visible = !this.visible;
    this.root.setVisible(this.visible);
  }

  setItems(items: QuestItem[]) {
    const show = items.slice(0, 4);
    for (let i = 0; i < this.lines.length; i++) {
      const it = show[i];
      if (!it) { this.lines[i].setText(''); continue; }
      const mark = it.done ? '✓' : '·';
      this.lines[i]
        .setText(`${mark} ${it.label}`)
        .setColor(it.done ? '#69f0ae' : '#cfd8e8');
    }
  }

  destroy() { this.root.destroy(true); }
}

/** 根据 flags 生成本科阶段默认可视目标 */
export function undergradQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
    { id: 'story', label: storyletUsed ? '本季事件已领' : '去地点领一件事', done: storyletUsed },
    { id: 'skills', label: '技能中心练缝合', done: flags.has('suture_done') || flags.has('suture_perfect') || flags.has('suture_failed') },
    { id: 'social', label: '和一位同学聊聊', done: flags.has('trust_roommate') || flags.has('trust_senior') || flags.has('got_senior_notes') },
  ];
}

/** 根据 flags 生成实习阶段默认可视目标 */
export function internshipQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
    { id: 'story', label: storyletUsed ? '本季已领' : '去科室领一件事', done: storyletUsed },
    { id: 'cpr', label: '练习 CPR 技能', done: flags.has('cpr_done') || flags.has('cpr_saved') },
    { id: 'night', label: '值一次夜班', done: flags.has('night_shift_done') || flags.has('night_shift_ace') },
  ];
}

/** 规培阶段默认可视目标 */
export function guipeiQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
    { id: 'story', label: storyletUsed ? '本季已领' : '去科室领一件事', done: storyletUsed },
    { id: 'license', label: '考取执业医师', done: flags.has('licensed') || flags.has('licensure_risk') },
    { id: 'survive', label: '熬过规培期', done: flags.has('gp_grew') || flags.has('left_med') },
  ];
}
