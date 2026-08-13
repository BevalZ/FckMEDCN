import Phaser from 'phaser';

// 简易任务清单（M5 + M12）：地点/NPC 指向 + 完成时可回传提示文案。
// 不引入新存档字段——只读当前 flags 与场景传入的 hints。

export type QuestItem = {
  id: string;
  label: string;
  done: boolean;
  /** 刚完成时飘字/新闻用 */
  rewardHint?: string;
};

export class QuestLog {
  private root: Phaser.GameObjects.Container;
  private lines: Phaser.GameObjects.Text[] = [];
  private title!: Phaser.GameObjects.Text;
  private visible = true;
  private lastDone = new Set<string>();

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

  /** 更新条目；返回本帧新完成的任务提示（供场景飘字）。 */
  setItems(items: QuestItem[]): string[] {
    const freshlyDone: string[] = [];
    const show = items.slice(0, 4);
    for (let i = 0; i < this.lines.length; i++) {
      const it = show[i];
      if (!it) { this.lines[i].setText(''); continue; }
      if (it.done && !this.lastDone.has(it.id)) {
        this.lastDone.add(it.id);
        freshlyDone.push(it.rewardHint ?? `任务完成：${it.label}`);
      }
      if (!it.done) this.lastDone.delete(it.id);
      const mark = it.done ? '✓' : '·';
      this.lines[i]
        .setText(`${mark} ${it.label}`)
        .setColor(it.done ? '#69f0ae' : '#cfd8e8');
    }
    return freshlyDone;
  }

  destroy() { this.root.destroy(true); }
}

/** 根据 flags 生成本科阶段默认可视目标 */
export function undergradQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0, rewardHint: '本季行动点已用完，可回宿舍睡觉推进' },
    { id: 'story', label: storyletUsed ? '本季事件已领' : '去教学楼/技能中心领事件', done: storyletUsed, rewardHint: '本季地点事件已领取' },
    {
      id: 'skills',
      label: '去技能中心练缝合',
      done: flags.has('suture_done') || flags.has('suture_perfect') || flags.has('suture_failed'),
      rewardHint: '缝合练习完成 · 技能目标达成',
    },
    {
      id: 'social',
      label: '去宿舍找室友/学长聊聊',
      done: flags.has('trust_roommate') || flags.has('trust_senior') || flags.has('got_senior_notes')
        || flags.has('roommate_repaired') || flags.has('senior_repaired'),
      rewardHint: '社交目标完成 · 关系有回响',
    },
  ];
}

/** 根据 flags 生成实习阶段默认可视目标 */
export function internshipQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
    { id: 'story', label: storyletUsed ? '本季已领' : '去病房/办公室领事件', done: storyletUsed },
    {
      id: 'cpr',
      label: '在技能点练习 CPR',
      done: flags.has('cpr_done') || flags.has('cpr_saved'),
      rewardHint: 'CPR 练习完成',
    },
    {
      id: 'attending',
      label: '找林主治或刘护士长推进关系',
      done: flags.has('trust_attending') || flags.has('attending_repaired') || flags.has('attending_arc_complete')
        || flags.has('trust_headnurse') || flags.has('headnurse_repaired') || flags.has('headnurse_arc_complete'),
      rewardHint: '与带教/护士站关系推进 · 任务完成',
    },
  ];
}

/** 规培阶段默认可视目标 */
export function guipeiQuests(flags: Set<string>, actionsLeft: number, storyletUsed: boolean): QuestItem[] {
  return [
    { id: 'ap', label: `行动点剩余 ${actionsLeft}`, done: actionsLeft === 0 },
    { id: 'story', label: storyletUsed ? '本季已领' : '去科室领一件事', done: storyletUsed },
    {
      id: 'license',
      label: '考取执业医师',
      done: flags.has('licensed') || flags.has('licensure_risk'),
      rewardHint: '执业相关节点已推进',
    },
    {
      id: 'fellow',
      label: '与赵师姐修复或巩固关系',
      done: flags.has('trust_fellow') || flags.has('fellow_repaired') || flags.has('fellow_arc_complete'),
      rewardHint: '规培搭档关系推进',
    },
  ];
}
