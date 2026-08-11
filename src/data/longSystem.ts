import { clearFlag, getState, patchState, setCounter, setFlag } from './gameState';
import type { DegreeType } from './constants';
import { setTrainingTrack } from './trainingTrack';

const LONG_SYSTEM_TRACK_FLAGS = ['track_eight_year', 'track_five_plus_three'];

export function isLongSystemTransferred(): boolean {
  return getState().flags.has('long_sys_transferred');
}

export function transferLongSystem() {
  const state = getState();
  const stage = state.stage;
  const degree: DegreeType = stage === 'phd' ? 'master_pro' : 'bachelor';

  setFlag('long_sys_transferred');
  setFlag(`long_sys_transferred_from_${stage}`);
  clearFlag('long_system');
  clearFlag('long_sys_warn_ready');
  clearFlag('long_sys_warned');
  clearFlag('baoyan');
  for (const flag of LONG_SYSTEM_TRACK_FLAGS) clearFlag(flag);

  setFlag('track_five_year');
  setTrainingTrack('clinical');
  setCounter('long_sys_transfer_turns', state.turnsInStage);
  setCounter('long_sys_transfer_knowledge', state.stats.knowledge);
  setCounter('long_sys_transfer_clinical', state.stats.clinical);

  patchState({
    track: 'five_year',
    degree,
    stats: {
      ...state.stats,
      knowledge: Math.max(state.stats.knowledge, Math.round(state.stats.knowledge * 0.75)),
      clinical: Math.max(state.stats.clinical, Math.round(state.stats.clinical * 0.75)),
    },
  });
}
