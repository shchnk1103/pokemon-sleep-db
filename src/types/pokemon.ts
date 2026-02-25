export type DexEntry = {
  id: number
  name: string
  specialty: string
  berry: string
  note: string
}

export type QuickStat = {
  label: string
  value: string
}

export type PokemonAssetItem = {
  id: number
  name: string
  iconUrl: string
}

export type PokemonIngredientItem = PokemonAssetItem & {
  quantity: number
}

export type PokemonIngredientLevel = {
  level: number
  items: PokemonIngredientItem[]
}

export type PokemonDexCard = {
  id: string
  dexNo: number
  name: string
  type: string
  talent: string
  normalImageUrl: string
  shinyImageUrl: string
  mainSkill: PokemonAssetItem | null
  berries: PokemonIngredientItem[]
  ingredientsByLevel: PokemonIngredientLevel[]
}
