import Phaser from 'phaser';
import { resetGame } from '../data/gameState';
import { sound } from '../audio/sound';
import { hasSave, loadSave, applySave } from '../data/save';

// 标题界面。M5 之后改用 HTML 覆盖层（index.html 中的 #title-overlay）渲染文本，
// 这样可以由浏览器做真正的字体抗锯齿/重采样，Phaser 画布文字"细笔画被裁"的问题不会复现。
// Phaser 这边只负责：背景底色、场景淡出/启动、键盘 SPACE 快捷键、静音快捷键、进度。
export class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    resetGame();
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f);
    bg.fillRect(0, 0, 960, 540);

    const overlay = document.getElementById('title-overlay');
    const main = document.getElementById('title-main');
    const sub = document.getElementById('title-sub');
    const startBtn = document.getElementById('title-start') as HTMLButtonElement | null;
    const contBtn = document.getElementById('title-continue') as HTMLButtonElement | null;

    const fadeIn = (el: Element | null, delay: number) => {
      if (!el) return;
      el.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 600, delay, fill: 'forwards', easing: 'ease-out' },
      );
    };

    overlay?.classList.add('show');
    fadeIn(main, 200);
    fadeIn(sub, 800);

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
      leaving = true;
      overlay?.classList.remove('show');
      sound.ensure();
      sound.startBgm();
      applySave(blob);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(blob.sceneKey));
    };

    const canContinue = hasSave();
    if (canContinue) {
      contBtn?.classList.add('show');
      fadeIn(contBtn, 1700);
      startBtn?.addEventListener('click', startGame);
      contBtn?.addEventListener('click', continueGame);
      this.input.keyboard?.once('keydown-SPACE', continueGame);
    } else {
      fadeIn(startBtn, 1500);
      startBtn?.addEventListener('click', startGame);
      this.input.keyboard?.once('keydown-SPACE', startGame);
    }

    this.input.keyboard?.on('keydown-M', () => sound.toggleMute());

    // 离开该场景时清理：去掉 overlay、移除按钮监听
    this.events.once('shutdown', () => {
      overlay?.classList.remove('show');
      // cloneNode(true) 拿到一个干净的副本替换原节点，移除所有事件监听
      [startBtn, contBtn].forEach((b) => b?.replaceWith(b.cloneNode(true)));
    });
  }
}
