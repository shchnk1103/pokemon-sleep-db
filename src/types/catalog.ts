export type AssetDexCatalog = 'berries' | 'ingredients' | 'mainskills' | 'subskills'

export type SubSkillEffectType = 'gold' | 'white' | 'blue' | 'unknown'

export type AssetDexCard = {
  id: number
  chineseName: string | null
  name: string | null
  attribute: string | null
  eneryMin: number | null
  eneryMax: number | null
  energy: number | null
  price: number | null
  description: string | null
  value: string | null
  effectType: SubSkillEffectType
  imageUrl: string
}

export type AssetDexLoadResult = {
  data: AssetDexCard[]
  source: 'supabase' | 'fallback'
  message?: string
  total: number
}

export type MainSkillLevel = {
  level: number
  value: number | string
  extraEffects: unknown | null
}

export type MainSkillLevelsLoadResult = {
  data: MainSkillLevel[]
  source: 'supabase' | 'fallback'
  message?: string
  total: number
}

export type NatureDexCard = {
  id: number
  name: string
  belong: string
  upName: string
  upValue: string
  downName: string
  downValue: string
}

export type NatureDexLoadResult = {
  data: NatureDexCard[]
  source: 'supabase' | 'fallback'
  message?: string
  total: number
}
