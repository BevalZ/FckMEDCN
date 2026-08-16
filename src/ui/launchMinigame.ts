import type Phaser from 'phaser';
import type { MinigameKind, MinigameResult } from './minigameTypes';
import { TimingBarMinigame } from './TimingBarMinigame';
import { CprRhythmMinigame } from './CprRhythmMinigame';
import { ExamQuizMinigame } from './ExamQuizMinigame';
import { NightShiftMinigame } from './NightShiftMinigame';
import { ExperimentalProcedureMinigame } from './ExperimentalProcedureMinigame';

/** 统一小游戏句柄：场景只需 update + play */
export interface ActiveMinigame {
  update(time: number, delta: number): void;
  play(): Promise<MinigameResult>;
  destroy(): void;
}

export function launchMinigame(
  scene: Phaser.Scene,
  kind: MinigameKind,
  title?: string,
): ActiveMinigame {
  switch (kind) {
    case 'suture':
      return new TimingBarMinigame(scene, { title: title ? `${title} · 落针` : undefined });
    case 'cpr':
      return new CprRhythmMinigame(scene, { title: title ? `${title} · 按压` : undefined });
    case 'exam':
      return new ExamQuizMinigame(scene, { title: title ? `${title} · 限时答题` : undefined });
    case 'nightshift':
      return new NightShiftMinigame(scene, { title: title ? `${title} · 呼叫铃` : undefined });
    case 'experiment':
      return new ExperimentalProcedureMinigame(scene, { title: title ? `${title} · 实验操作` : undefined });
  }
}
