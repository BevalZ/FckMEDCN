import { changeAttr, getState, patchState, setFlag, hasFlag, incCounter } from './gameState';
import { addFakeRisk, selfReport } from './integrity';
import { payHouseDownPayment } from './economy';
import { getUnit } from './jobhunt_units';
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
    // —— 求职写实：概率结算 / 投简历 / 多offer / 签三方 / 违约 ——
    case 'rollOutcome': {
      const s = getState();
      const rep = s.stats.reputation;
      const papers = s.stats.papers;
      const knowledge = s.stats.knowledge;
      const clinical = s.stats.clinical;
      const luck = s.attrs?.luck ?? 0;
      let p = effect.base
        + (effect.repPer10 ?? 0) * (rep / 10)
        + (effect.paperBonus ?? 0) * papers
        + (effect.knowledgeBonus ?? 0) * knowledge
        + (effect.clinicalBonus ?? 0) * clinical
        + (effect.luckBonus ?? 0) * luck;
      // 本校附属加成 / 导师推荐（人情黑箱）/ 海归 / 博士后 加成：仅当对应 flag 已置时计入
      if (effect.affiliateFlag && hasFlag(effect.affiliateFlag) && effect.affiliateBonus) {
        p += effect.affiliateBonus;
      }
      if (effect.referralFlag && hasFlag(effect.referralFlag ?? 'got_recommend') && effect.referralBonus) {
        p += effect.referralBonus;
      }
      if (effect.overseasFlag && hasFlag(effect.overseasFlag) && effect.overseasBonus) {
        p += effect.overseasBonus;
      }
      if (effect.postdocFlag && hasFlag(effect.postdocFlag) && effect.postdocBonus) {
        p += effect.postdocBonus;
      }
      p = Math.max(0.05, Math.min(0.98, p));
      if (Math.random() < p) setFlag(effect.successFlag);
      else setFlag(effect.failFlag);
      return;
    }
    case 'applyUnit': {
      setFlag(`jh_applied_${effect.unitId}`);
      setFlag('jh_has_applied');
      const u = getUnit(effect.unitId);
      // 本校附属医院：玩家母校 id 与单位 affiliatedSchoolId 匹配 → 置附属标记（面试/笔试加成读取）
      if (u?.affiliatedSchoolId && getState().school?.id === u.affiliatedSchoolId) {
        setFlag(`jh_affil_${effect.unitId}`);
      }
      return;
    }
    case 'receiveOffer': {
      setFlag(`offer_${effect.unitId}`);
      setFlag('jh_has_offer');
      const s = getState();
      if (!s.jobOffers.includes(effect.unitId)) {
        patchState({ jobOffers: [...s.jobOffers, effect.unitId] });
      }
      return;
    }
    case 'signUnit': {
      const u = getUnit(effect.unitId);
      if (u) setFlag(u.regionFlag);
      setFlag('signed');
      patchState({ signedUnitId: effect.unitId });
      return;
    }
    case 'breachUnit': {
      const s = getState();
      // 清掉旧单位（此前 signedUnitId）的 region flag，再落新单位
      const oldU = s.signedUnitId ? getUnit(s.signedUnitId) : undefined;
      if (oldU) s.flags.delete(oldU.regionFlag);
      const u = getUnit(effect.unitId);
      if (u) setFlag(u.regionFlag);
      patchState({ signedUnitId: effect.unitId });
      incCounter('breachCount');
      setFlag('jh_breached');
      return;
    }
    case 'setFlag': {
      setFlag(effect.flag);
      return;
    }
  }
}
