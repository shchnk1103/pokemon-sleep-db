import { ImageDropzoneField } from '../ImageDropzoneField'
import type { SubSkillEffectType, AssetDexCatalog } from '../../types/catalog'

type AssetDraft = {
  id: number
  chineseName: string
  name: string
  attribute: string
  eneryMin: string
  eneryMax: string
  energy: string
  price: string
  description: string
  value: string
  effectType: SubSkillEffectType
  imageUrl: string
}

type AssetEditSectionProps = {
  kind: Exclude<AssetDexCatalog, 'mainskills' | 'natures'>
  assetDraft: AssetDraft
  assetImageFile: File | null
  isSubmitting: boolean
  onChangeDraft: (next: AssetDraft) => void
  onPickImage: (file: File) => void
  onClearImage: () => void
}

export function AssetEditSection({
  kind,
  assetDraft,
  assetImageFile,
  isSubmitting,
  onChangeDraft,
  onPickImage,
  onClearImage,
}: AssetEditSectionProps) {
  return (
    <div className="dex-edit-grid">
      <label className="auth-field">
        <span>id</span>
        <input type="text" value={String(assetDraft.id)} disabled />
      </label>

      {(kind === 'berries' || kind === 'ingredients') && (
        <label className="auth-field">
          <span>chinese_name</span>
          <input type="text" value={assetDraft.chineseName} onChange={(event) => onChangeDraft({ ...assetDraft, chineseName: event.target.value })} />
        </label>
      )}

      {kind === 'subskills' && (
        <label className="auth-field">
          <span>name</span>
          <input type="text" value={assetDraft.name} onChange={(event) => onChangeDraft({ ...assetDraft, name: event.target.value })} />
        </label>
      )}

      {kind === 'berries' && (
        <>
          <label className="auth-field">
            <span>attribute</span>
            <input type="text" value={assetDraft.attribute} onChange={(event) => onChangeDraft({ ...assetDraft, attribute: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>enery_min</span>
            <input type="text" inputMode="numeric" value={assetDraft.eneryMin} onChange={(event) => onChangeDraft({ ...assetDraft, eneryMin: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>enery_max</span>
            <input type="text" inputMode="numeric" value={assetDraft.eneryMax} onChange={(event) => onChangeDraft({ ...assetDraft, eneryMax: event.target.value })} />
          </label>
        </>
      )}

      {kind === 'ingredients' && (
        <>
          <label className="auth-field">
            <span>energy</span>
            <input type="text" inputMode="numeric" value={assetDraft.energy} onChange={(event) => onChangeDraft({ ...assetDraft, energy: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>price</span>
            <input type="text" inputMode="numeric" value={assetDraft.price} onChange={(event) => onChangeDraft({ ...assetDraft, price: event.target.value })} />
          </label>
        </>
      )}

      {kind === 'subskills' && (
        <>
          <label className="auth-field dex-edit-full">
            <span>description</span>
            <textarea
              className="mainskill-create-textarea"
              rows={4}
              value={assetDraft.description}
              onChange={(event) => onChangeDraft({ ...assetDraft, description: event.target.value })}
            />
          </label>
          <label className="auth-field">
            <span>value</span>
            <input type="text" value={assetDraft.value} onChange={(event) => onChangeDraft({ ...assetDraft, value: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>effect_type</span>
            <select value={assetDraft.effectType} onChange={(event) => onChangeDraft({ ...assetDraft, effectType: event.target.value as SubSkillEffectType })}>
              <option value="gold">gold</option>
              <option value="white">white</option>
              <option value="blue">blue</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
        </>
      )}

      <div className="dex-edit-full">
        <ImageDropzoneField
          label="图片"
          imageUrl={assetDraft.imageUrl}
          file={assetImageFile}
          disabled={isSubmitting}
          onPickFile={onPickImage}
          onClear={onClearImage}
        />
      </div>
    </div>
  )
}
