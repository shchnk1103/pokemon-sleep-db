export type PokemonNews = {
  id: string
  title: string
  category: string
  coverImageUrl: string
  publishedAt: string
  content: string
}

export type PokemonNewsLoadResult = {
  data: PokemonNews[]
  source: 'supabase' | 'fallback'
  fromCache?: boolean
  message?: string
  total: number
}
