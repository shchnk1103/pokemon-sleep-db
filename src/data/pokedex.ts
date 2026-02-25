import type { DexEntry, QuickStat } from '../types/pokemon'

export const dexEntries: DexEntry[] = [
  {
    id: 25,
    name: '皮卡丘',
    specialty: '食材型',
    berry: '橙橙果',
    note: '前期友好，适合作为通用占位示例。',
  },
  {
    id: 39,
    name: '胖丁',
    specialty: '技能型',
    berry: '桃桃果',
    note: '技能触发频率中等，适合睡眠队伍补位。',
  },
  {
    id: 155,
    name: '火球鼠',
    specialty: '树果型',
    berry: '零余果',
    note: '树果收益稳定，适合挂机积累。',
  },
  {
    id: 258,
    name: '水跃鱼',
    specialty: '食材型',
    berry: '文柚果',
    note: '食材组合灵活，后期可转配方队。',
  },
]

export const quickStats: QuickStat[] = [
  { label: '常用营地配队模板', value: '12' },
  { label: '占位图鉴条目', value: `${dexEntries.length}` },
  { label: '示例计算模块', value: '3' },
]
