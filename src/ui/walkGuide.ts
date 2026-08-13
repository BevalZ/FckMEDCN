import { hasFlag, setFlag } from '../data/gameState';

/** 行走场景首次提示 Q/E（本局一次，存于 flags）。 */
export function maybeShowWalkQEGuide(show: (text: string, color: string) => void) {
  if (hasFlag('guide_qe_walk')) return;
  setFlag('guide_qe_walk');
  show('提示：靠近地点按 E 交互 · 按 Q 查看本季任务', '#4fc3f7');
}
