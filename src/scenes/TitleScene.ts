import Phaser from 'phaser';
import { resetGame, getState, patchState } from '../data/gameState';
import { sound } from '../audio/sound';
import { hasSave, loadSave, applySave, saveGame } from '../data/save';
import { applyLegacyPerks } from '../data/legacy';

// 标题界面。M5 之后改用 HTML 覆盖层（index.html 中的 #title-overlay）渲染文本，
// 这样可以由浏览器做真正的字体抗锯齿/重采样，Phaser 画布文字"细笔画被裁"的问题不会复现。
// Phaser 这边只负责：背景底色、场景淡出/启动、键盘 SPACE 快捷键、静音快捷键、进度。
// 存档 sceneKey 失效（旧版本场景被删/改名）时的降级目标：按存档的 stage 落到现行场景。
// 防止读档后 scene.start 找不到场景而黑屏（B4）。
const SCENE_BY_STAGE: Record<string, string> = {
  undergrad: 'CampusScene',
  internship: 'HospitalScene',
  guipei: 'GuipeiWalkScene',
  master: 'MasterScene',
  phd: 'PhDScene',
  jobhunt: 'JobHuntScene',
  career: 'CareerScene',
  pinnacle: 'PinnacleScene',
  retirement: 'RetirementScene',
  eternity: 'EternityScene',
};

export class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    resetGame();
    // 多周目传承：把已购买的永久加成叠加到新开局属性上。
    // 所有新开局（开始游戏/重开/心理崩溃重开）都会经过本场景的 create。
    patchState({ stats: applyLegacyPerks(getState().stats) });
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f);
    bg.fillRect(0, 0, 960, 540);

    const overlay = document.getElementById('title-overlay');
    const main = document.getElementById('title-main');
    const sub = document.getElementById('title-sub');
    const disclaimer = document.getElementById('title-disclaimer');
    const startBtn = document.getElementById('title-start') as HTMLButtonElement | null;
    const contBtn = document.getElementById('title-continue') as HTMLButtonElement | null;
    const galleryBtn = document.getElementById('title-gallery') as HTMLButtonElement | null;
    const genderHint = document.getElementById('title-gender-hint');
    const genderEditBtn = document.getElementById('title-gender-edit') as HTMLButtonElement | null;
    const genderPanel = document.getElementById('gender-edit-panel');
    const pickMale = document.getElementById('gender-pick-male') as HTMLButtonElement | null;
    const pickFemale = document.getElementById('gender-pick-female') as HTMLButtonElement | null;
    const genderCancel = document.getElementById('gender-edit-cancel') as HTMLButtonElement | null;
    if (overlay) delete overlay.dataset.ready;
    // HTML 覆盖层跨 Phaser 场景长期存在；每次进入标题页都从存档事实重建可见状态，
    // 不能继承上一次标题场景留下的 show class，否则删档后会出现无效的“继续游戏”。
    contBtn?.classList.remove('show');
    genderEditBtn?.classList.remove('show');
    genderPanel?.classList.remove('show');

    const fadeIn = (el: Element | null, delay: number) => {
      if (!el) return;
      el.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 600, delay, fill: 'forwards', easing: 'ease-out' },
      );
    };

    overlay?.classList.add('show');
    if (disclaimer && import.meta.env.VITE_RELEASE_TRACK === 'preview') {
      disclaimer.textContent =
        '预览版：叙事模拟，医学内容尚未完成临床医师/药师终审；游戏内快讯、机构与数值为匿名综合改写或趋势推演，不构成现实事实、医学建议或诊疗依据。';
    }
    fadeIn(main, 200);
    fadeIn(sub, 800);
    fadeIn(disclaimer, 1000);

    let leaving = false;
    const startGame = () => {
      if (leaving) return;
      leaving = true;
      overlay?.classList.remove('show');
      sound.ensure();
      sound.startBgm();
      sound.click();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GaokaoScene'));
    };
    const continueGame = () => {
      if (leaving) return;
      const blob = loadSave();
      if (!blob) { startGame(); return; }
      // sceneKey 失效时按 stage 降级到现行场景；stage 也不认识就重开一局（B4）
      const key = this.scene.get(blob.sceneKey)
        ? blob.sceneKey
        : SCENE_BY_STAGE[blob.state?.stage as string];
      if (!key) { startGame(); return; }
      leaving = true;
      overlay?.classList.remove('show');
      sound.ensure();
      sound.startBgm();
      applySave(blob);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
    };

    const openGallery = () => {
      if (leaving) return;
      leaving = true;
      overlay?.classList.remove('show');
      sound.ensure();
      sound.click();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CollectionScene'));
    };
    const toggleMute = () => sound.toggleMute();

    const canContinue = hasSave();
    if (canContinue) {
      contBtn?.classList.add('show');
      fadeIn(contBtn, 1700);
      startBtn?.addEventListener('click', startGame);
      contBtn?.addEventListener('click', continueGame);
      this.input.keyboard?.once('keydown-SPACE', continueGame);

      // 存档界面：修改性别入口（改完写回存档，继续游戏生效）
      genderEditBtn?.classList.add('show');
      fadeIn(genderEditBtn, 1900);
      genderEditBtn?.addEventListener('click', () => {
        genderEditBtn.classList.remove('show');
        genderPanel?.classList.add('show');
      });
      const flash = (msg: string) => {
        const t = this.add.text(480, 500, msg, {
          fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffc107', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(300).setAlpha(0);
        this.tweens.add({
          targets: t, alpha: 1, duration: 300,
          onComplete: () => this.tweens.add({
            targets: t, alpha: 0, duration: 700, delay: 900, onComplete: () => t.destroy(),
          }),
        });
      };
      const applyGender = (g: 'male' | 'female') => {
        const blob = loadSave();
        if (!blob) return;
        applySave(blob);
        patchState({ gender: g });
        // 写回存档（保留 firedEvents/firedNews，防止 once 事件丢失）
        saveGame(blob.sceneKey, blob.firedEvents ?? [], blob.firedNews ?? []);
        genderPanel?.classList.remove('show');
        genderEditBtn?.classList.add('show');
        flash(g === 'male' ? '性别已改为：男生' : '性别已改为：女生');
      };
      pickMale?.addEventListener('click', () => applyGender('male'));
      pickFemale?.addEventListener('click', () => applyGender('female'));
      genderCancel?.addEventListener('click', () => {
        genderPanel?.classList.remove('show');
        genderEditBtn?.classList.add('show');
      });
    } else {
      fadeIn(startBtn, 1500);
      startBtn?.addEventListener('click', startGame);
      this.input.keyboard?.once('keydown-SPACE', startGame);
    }

    // 人生图鉴：按钮或 G 键进入（跨周目收集，与单局存档无关）
    galleryBtn?.addEventListener('click', openGallery);
    fadeIn(galleryBtn, 1900);
    this.input.keyboard?.once('keydown-G', openGallery);

    // 性别选择入口提示（新开局时可选性别）
    fadeIn(genderHint, 2100);

    this.input.keyboard?.on('keydown-M', toggleMute);

    // 自动化与辅助技术可据此确认 DOM 按钮监听已绑定，避免场景刚激活时的初始化竞态。
    if (overlay) overlay.dataset.ready = 'true';

    // 离开该场景时清理：去掉 overlay、移除按钮监听
    this.events.once('shutdown', () => {
      overlay?.classList.remove('show');
      if (overlay) delete overlay.dataset.ready;
      // cloneNode(true) 拿到一个干净的副本替换原节点，移除所有事件监听
      [startBtn, contBtn, galleryBtn, genderEditBtn, genderPanel]
        .forEach((b) => b?.replaceWith(b.cloneNode(true)));
      // KeyboardPlugin 由整个游戏共享，不随单个场景自动销毁；显式移除本次 create 的闭包。
      this.input.keyboard?.off('keydown-SPACE', startGame);
      this.input.keyboard?.off('keydown-SPACE', continueGame);
      this.input.keyboard?.off('keydown-G', openGallery);
      this.input.keyboard?.off('keydown-M', toggleMute);
    });
  }
}
