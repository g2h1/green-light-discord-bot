import { BUTTON_COLOR_HEX, type PanelFormState } from './types'

function DefaultBanner() {
  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-[#06110a] via-[#0a1f13] to-[#0d2b18]">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(#17c964_1px,transparent_1px),linear-gradient(90deg,#17c964_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#17c964] shadow-[0_0_12px_#17c964]" />
        <div className="text-left">
          <div className="text-2xl font-black tracking-[0.2em] text-white">TICKET</div>
          <div className="text-[10px] font-semibold tracking-[0.3em] text-[#17c964]">GREEN LIGHT SUPPORT</div>
        </div>
      </div>
    </div>
  )
}

export function PanelPreview({ form }: { form: PanelFormState }) {
  const colorHex = '#' + form.color.toString(16).padStart(6, '0')
  const buttonHex = BUTTON_COLOR_HEX[form.config.buttonColor]

  return (
    <div className="rounded-lg border border-surface-border bg-surface-2 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Panel Preview</div>

      <div className="rounded-md bg-[#313338] p-3 font-sans text-sm text-[#dbdee1]">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-black">
            GL
          </div>
          <div>
            <span className="font-medium text-white">GREEN LIGHT</span>
            <span className="ml-1.5 rounded bg-brand-600 px-1 py-px text-[10px] font-medium text-white">BOT</span>
          </div>
        </div>

        <div className="pl-11">
          <div className="max-w-md rounded border-l-4 bg-[#2b2d31] p-3" style={{ borderColor: colorHex }}>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                {form.title && <div className="mb-1 font-semibold text-white">{form.title}</div>}
                {form.description && (
                  <div className="whitespace-pre-wrap text-[#dbdee1]">{form.description}</div>
                )}
              </div>
              {form.config.thumbnailUrl && (
                <img src={form.config.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              )}
            </div>

            <div className="mt-2">
              {form.config.imageUrl ? (
                <img src={form.config.imageUrl} alt="" className="max-h-40 w-full rounded object-cover" />
              ) : (
                <DefaultBanner />
              )}
            </div>
          </div>

          <div className="mt-2">
            <span
              className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium text-white"
              style={{ backgroundColor: buttonHex, borderColor: buttonHex }}
            >
              {form.config.buttonEmoji && <span>{form.config.buttonEmoji}</span>}
              {form.config.buttonText || 'Button'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
