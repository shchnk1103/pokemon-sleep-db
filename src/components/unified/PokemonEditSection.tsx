import { ImageDropzoneField } from '../ImageDropzoneField'

type PokemonDraft = {
  id: number
  name: string
  type: string
  talent: string
  normalImageUrl: string
  shinyImageUrl: string
  mainSkillId: string
}

type PokemonEditSectionProps = {
  pokemonDraft: PokemonDraft
  pokemonNormalImageFile: File | null
  pokemonShinyImageFile: File | null
  isSubmitting: boolean
  onChangeDraft: (next: PokemonDraft) => void
  onPickNormalImage: (file: File) => void
  onPickShinyImage: (file: File) => void
  onClearNormalImage: () => void
  onClearShinyImage: () => void
}

export function PokemonEditSection({
  pokemonDraft,
  pokemonNormalImageFile,
  pokemonShinyImageFile,
  isSubmitting,
  onChangeDraft,
  onPickNormalImage,
  onPickShinyImage,
  onClearNormalImage,
  onClearShinyImage,
}: PokemonEditSectionProps) {
  return (
    <div className="dex-edit-grid">
      <label className="auth-field">
        <span>id</span>
        <input type="text" value={String(pokemonDraft.id)} disabled />
      </label>
      <label className="auth-field">
        <span>name</span>
        <input type="text" value={pokemonDraft.name} onChange={(event) => onChangeDraft({ ...pokemonDraft, name: event.target.value })} />
      </label>
      <label className="auth-field">
        <span>type</span>
        <input type="text" value={pokemonDraft.type} onChange={(event) => onChangeDraft({ ...pokemonDraft, type: event.target.value })} />
      </label>
      <label className="auth-field">
        <span>talent</span>
        <input type="text" value={pokemonDraft.talent} onChange={(event) => onChangeDraft({ ...pokemonDraft, talent: event.target.value })} />
      </label>
      <div className="dex-edit-full dex-edit-image-pair">
        <ImageDropzoneField
          label="普通图片"
          imageUrl={pokemonDraft.normalImageUrl}
          file={pokemonNormalImageFile}
          disabled={isSubmitting}
          onPickFile={onPickNormalImage}
          onClear={onClearNormalImage}
        />
        <ImageDropzoneField
          label="闪光图片"
          imageUrl={pokemonDraft.shinyImageUrl}
          file={pokemonShinyImageFile}
          disabled={isSubmitting}
          onPickFile={onPickShinyImage}
          onClear={onClearShinyImage}
        />
      </div>
      <label className="auth-field">
        <span>main_skill_id（可留空）</span>
        <input
          type="text"
          inputMode="numeric"
          value={pokemonDraft.mainSkillId}
          onChange={(event) => onChangeDraft({ ...pokemonDraft, mainSkillId: event.target.value.replace(/[^\d]/g, '') })}
        />
      </label>
    </div>
  )
}
