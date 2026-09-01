import { useRef, useState } from 'react'
import { api, ApiError } from '../../../lib/api'
import { Button, TextInput } from '../../messages/components/FormControls'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 8 * 1024 * 1024

export function ImageUploadField({
  label,
  value,
  onChange,
  uploadUrl,
}: {
  label: string
  value?: string
  onChange: (url: string | undefined) => void
  uploadUrl: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')

  async function handleFile(file: File) {
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Use PNG, JPG, WEBP, or GIF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large (max ${MAX_BYTES / 1024 / 1024}MB).`)
      return
    }

    setUploading(true)
    try {
      const { url } = await api.uploadFile<{ url: string }>(uploadUrl, file)
      onChange(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={`flex items-center gap-3 rounded-md border border-dashed p-2 transition-colors ${
          dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-surface-border'
        }`}
      >
        {value ? (
          <img src={value} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-surface-2 text-xs text-text-muted">
            None
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <Button type="button" variant="ghost" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
            </Button>
            {value && (
              <Button type="button" variant="danger" onClick={() => onChange(undefined)}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] text-text-muted">Drag & drop an image here, or use Upload. PNG/JPG/WEBP/GIF, max 8MB.</p>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2">
        <TextInput
          placeholder="Or paste a public HTTPS image URL…"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={!urlDraft.trim()}
          onClick={() => {
            try {
              const parsed = new URL(urlDraft.trim())
              if (parsed.protocol !== 'https:') throw new Error('not https')
              onChange(urlDraft.trim())
              setUrlDraft('')
              setError(null)
            } catch {
              setError('Enter a valid https:// URL.')
            }
          }}
        >
          Use URL
        </Button>
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
