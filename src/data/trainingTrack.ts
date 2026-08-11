import { clearFlag, getState, setFlag } from './gameState';

export type TrainingTrackAxis = 'clinical' | 'research';

export function setTrainingTrack(axis: TrainingTrackAxis) {
  if (axis === 'research') {
    clearFlag('track_clinical');
    setFlag('track_research');
  } else {
    clearFlag('track_research');
    setFlag('track_clinical');
  }
}

export function clearTrainingTrack() {
  clearFlag('track_clinical');
  clearFlag('track_research');
}

export function hasResearchTrainingTrack(): boolean {
  const flags = getState().flags;
  return flags.has('track_research') && !flags.has('track_clinical');
}

export function nextSceneAfterUndergrad(mode: 'walk' | 'card' = 'walk'): string {
  const flags = getState().flags;
  if (!flags.has('long_sys_transferred') && flags.has('track_eight_year')) {
    return mode === 'walk' ? 'PhdWalkScene' : 'PhDScene';
  }
  if (!flags.has('long_sys_transferred') && flags.has('track_five_plus_three')) {
    return mode === 'walk' ? 'MasterWalkScene' : 'MasterScene';
  }
  if ((flags.has('baoyan') || flags.has('kaoyan')) && !flags.has('long_sys_transferred')) {
    return mode === 'walk' ? 'MasterWalkScene' : 'MasterScene';
  }
  return mode === 'walk' ? 'HospitalScene' : 'InternshipScene';
}

export function nextSceneAfterGuipei(mode: 'walk' | 'card' = 'walk'): string {
  if (hasResearchTrainingTrack()) return mode === 'walk' ? 'MasterWalkScene' : 'MasterScene';
  return 'JobHuntScene';
}

export function nextSceneAfterMaster(mode: 'walk' | 'card' = 'walk'): string {
  const flags = getState().flags;
  if (flags.has('long_sys_transferred')) return 'JobHuntScene';
  if (flags.has('will_work')) return 'JobHuntScene';
  if (flags.has('phd_admitted')) return mode === 'walk' ? 'PhdWalkScene' : 'PhDScene';
  return 'JobHuntScene';
}
