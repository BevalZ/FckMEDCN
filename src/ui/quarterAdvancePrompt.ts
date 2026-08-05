import type { ConsequencePopup } from './ConsequencePopup';

/** 行动点耗尽后的统一季度推进确认，确认后由场景执行各自的结算逻辑。 */
export function showQuarterAdvancePrompt(
  popup: ConsequencePopup,
  onConfirm: () => void,
  onCancel: () => void,
) {
  popup.show(
    '本季行动点已经用完。\n无需回到睡觉点，现在可以直接进入下一季度。',
    {},
    onConfirm,
    {
      escape: 'cancel',
      actionLabel: '进入下一季度 [ 点击 / 空格 / 回车 ]',
      onCancel,
    },
  );
}
