import { getState } from './gameState';

// 性别感知文案：事件正文/后果里的 {占位符} 按开局选择的性别渲染。
// 只替换"指代玩家本人"的词——绝不碰指代 NPC 的"师兄/学姐"等原文。
// 支持占位符：{son} 儿子/女儿、{senior} 学长/学姐、{junior} 学弟/学妹、
// {seniorFellow} 师兄/师姐、{juniorFellow} 师弟/师妹、{he} 他/她。
export function renderGendered(text: string): string {
  if (!text.includes('{')) return text;
  const f = getState().gender === 'female';
  const map: Record<string, string> = {
    '{son}': f ? '女儿' : '儿子',
    '{senior}': f ? '学姐' : '学长',
    '{junior}': f ? '学妹' : '学弟',
    '{seniorFellow}': f ? '师姐' : '师兄',
    '{juniorFellow}': f ? '师妹' : '师弟',
    '{he}': f ? '她' : '他',
  };
  return text.replace(/\{(son|senior|junior|seniorFellow|juniorFellow|he)\}/g, (m) => map[m] ?? m);
}
