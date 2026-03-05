type NatureDraft = {
  id: number
  name: string
  belong: string
  upName: string
  upValue: string
  downName: string
  downValue: string
}

type NatureFieldKey = 'name' | 'belong' | 'upName' | 'upValue' | 'downName' | 'downValue'

type NatureEditSectionProps = {
  natureDraft: NatureDraft
  isCreateMode: boolean
  manualNatureId: string
  isSubmitting: boolean
  onManualNatureIdChange: (value: string) => void
  onFieldTouch: (field: NatureFieldKey) => void
  onChangeDraft: (next: NatureDraft) => void
}

export function NatureEditSection({
  natureDraft,
  isCreateMode,
  manualNatureId,
  isSubmitting,
  onManualNatureIdChange,
  onFieldTouch,
  onChangeDraft,
}: NatureEditSectionProps) {
  return (
    <div className="dex-edit-grid">
      <label className="auth-field">
        <span>id</span>
        <input
          type="text"
          inputMode="numeric"
          value={isCreateMode ? manualNatureId : String(natureDraft.id)}
          onChange={(event) => {
            if (!isCreateMode) {
              return
            }
            const nextValue = event.target.value.replace(/[^\d]/g, '')
            onManualNatureIdChange(nextValue)
          }}
          placeholder={isCreateMode ? '例如: 1' : undefined}
          disabled={!isCreateMode || isSubmitting}
        />
      </label>
      <label className="auth-field">
        <span>name</span>
        <input
          type="text"
          value={natureDraft.name}
          onChange={(event) => {
            onFieldTouch('name')
            onChangeDraft({ ...natureDraft, name: event.target.value })
          }}
        />
      </label>
      <label className="auth-field">
        <span>belong</span>
        <input
          type="text"
          value={natureDraft.belong}
          onChange={(event) => {
            onFieldTouch('belong')
            onChangeDraft({ ...natureDraft, belong: event.target.value })
          }}
        />
      </label>
      <label className="auth-field">
        <span>up_name</span>
        <input
          type="text"
          value={natureDraft.upName}
          onChange={(event) => {
            onFieldTouch('upName')
            onChangeDraft({ ...natureDraft, upName: event.target.value })
          }}
        />
      </label>
      <label className="auth-field">
        <span>up_value</span>
        <input
          type="text"
          value={natureDraft.upValue}
          onChange={(event) => {
            onFieldTouch('upValue')
            onChangeDraft({ ...natureDraft, upValue: event.target.value })
          }}
        />
      </label>
      <label className="auth-field">
        <span>down_name</span>
        <input
          type="text"
          value={natureDraft.downName}
          onChange={(event) => {
            onFieldTouch('downName')
            onChangeDraft({ ...natureDraft, downName: event.target.value })
          }}
        />
      </label>
      <label className="auth-field">
        <span>down_value</span>
        <input
          type="text"
          value={natureDraft.downValue}
          onChange={(event) => {
            onFieldTouch('downValue')
            onChangeDraft({ ...natureDraft, downValue: event.target.value })
          }}
        />
      </label>
    </div>
  )
}
