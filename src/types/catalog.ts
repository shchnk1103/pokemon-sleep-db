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
