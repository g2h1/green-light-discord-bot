import type { MessageDraft } from '../types'

export function MessagePreview({ draft }: { draft: MessageDraft }) {
  const embed = draft.useEmbed ? draft.embed : null
  const colorHex = '#' + (embed?.color ?? 0x17c964).toString(16).padStart(6, '0')

  const hasContent = draft.content.trim().length > 0
  const hasEmbed = Boolean(
    embed && (embed.title || embed.description || embed.fields?.length || embed.image || embed.thumbnail),
  )

  return (
    <div className="rounded-lg border border-surface-border bg-surface-2 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Live preview</div>

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
          {draft.mentionEveryone && (
            <span className="mr-1 rounded bg-[#3c4270] px-1 text-[#c9cdfb]">@everyone</span>
          )}
          {draft.mentionHere && <span className="mr-1 rounded bg-[#3c4270] px-1 text-[#c9cdfb]">@here</span>}
          {hasContent && <span className="whitespace-pre-wrap">{draft.content}</span>}
          {!hasContent && !draft.mentionEveryone && !draft.mentionHere && !hasEmbed && (
            <span className="italic text-text-muted">Nothing to preview yet</span>
          )}

          {hasEmbed && embed && (
            <div
              className="mt-2 flex max-w-md gap-3 rounded border-l-4 bg-[#2b2d31] p-3"
              style={{ borderColor: colorHex }}
            >
              <div className="min-w-0 flex-1">
                {embed.author?.name && (
                  <div className="mb-1 text-sm font-medium text-white">{embed.author.name}</div>
                )}
                {embed.title && (
                  <div className="mb-1 font-semibold text-white">
                    {embed.url ? (
                      <a href={embed.url} className="text-[#00a8fc] hover:underline">
                        {embed.title}
                      </a>
                    ) : (
                      embed.title
                    )}
                  </div>
                )}
                {embed.description && (
                  <div className="whitespace-pre-wrap text-[#dbdee1]">{embed.description}</div>
                )}
                {embed.fields && embed.fields.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {embed.fields.map((f, i) => (
                      <div key={i} className={f.inline ? '' : 'col-span-2'}>
                        <div className="text-xs font-semibold text-white">{f.name || '​'}</div>
                        <div className="whitespace-pre-wrap text-xs text-[#dbdee1]">{f.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {embed.image?.url && (
                  <img src={embed.image.url} alt="" className="mt-2 max-h-48 rounded" />
                )}
                {embed.footer?.text && (
                  <div className="mt-2 text-xs text-text-muted">{embed.footer.text}</div>
                )}
              </div>
              {embed.thumbnail?.url && (
                <img src={embed.thumbnail.url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              )}
            </div>
          )}

          {draft.buttons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.buttons.map((b, i) => (
                <span
                  key={i}
                  className="rounded border border-[#4e5058] bg-[#2b2d31] px-3 py-1 text-xs text-white"
                >
                  {b.label || 'Button'} ↗
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
