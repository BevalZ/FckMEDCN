import { changeAttr, getState, patchState, setFlag, hasFlag } from './gameState';
import { addFakeRisk, selfReport } from './integrity';
import { payHouseDownPayment } from './economy';
import type { ChoiceEffect } from './events';

// 选项副作用的集中实现。
// 事件数据里只写"声明式"的 effect 描述（纯数据、可序列化、可静态检查），
// 真正改写全局状态的逻辑只存在于这里一处，便于测试与排查。

const PARTNERS = ['林晚', '苏念', '陈屿', '周遥', '许知', '沈星', '白露', '江屿', '温言', '顾川', '何夕', '宋词'];
const pickPartner = () => PARTNERS[Math.floor(Math.random() * PARTNERS.length)];

const LOST_FLAG: Record<'father' | 'mother' | 'grandparent', string> = {
  father: 'lost_father', mother: 'lost_mother', grandparent: 'lost_grandparent',
};

export function applyChoiceEffect(effect: ChoiceEffect) {
  switch (effect.kind) {
    case 'startDating':
      patchState({ marital: 'dating', spouse: pickPartner() });
      return;
    case 'breakup':
      patchState({ marital: 'single', spouse: null });
      return;
    case 'marry':
      patchState({ marital: 'married' });
      return;
    case 'childborn':
      patchState({ hasChild: true });
      setFlag('has_child');
      return;
    case 'loseKin': {
      patchState({ familyAlive: Math.max(0, getState().familyAlive - 1) });
      setFlag(LOST_FLAG[effect.who]);
      setFlag('grieving');
      // kin_all_gone 以"三位至亲的离世事件全部发生过"为准（flag 判定），
      // 而非 familyAlive 归零——初始 familyAlive=4 而离世事件只有 3 个，数值永远减不到 0。
      if (hasFlag('lost_father') && hasFlag('lost_mother') && hasFlag('lost_grandparent')) {
        setFlag('kin_all_gone');
      }
      return;
    }
    // —— 学术诚信：造假不当场结算，而是累加风险，由 integrity.ts 每季判定 ——
    case 'fake':
      addFakeRisk(effect.severity);
      return;
    case 'selfReport':
      selfReport();
      return;
    case 'buyHouse':
      payHouseDownPayment();
      return;
    case 'changeAttr':
      changeAttr(effect.attr, effect.amount, effect.reason);
      return;
  }
}
