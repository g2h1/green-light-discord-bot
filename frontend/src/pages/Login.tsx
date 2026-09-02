import { useSearchParams } from 'react-router-dom'
import { API_BASE } from '../lib/api'
const ERROR_MESSAGES: Record<string, string> = {
  oauth_state: 'Login session expired. Please try again.',
  oauth_failed: 'Discord login failed. Please try again.',
}

export function Login() {
  const [params] = useSearchParams()
  const error = params.get('error')

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="w-full max-w-sm rounded-xl border border-surface-border bg-surface-1 p-8 text-center shadow-[0_0_40px_-15px_theme(colors.brand.500/0.4)]">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-brand-500/30">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_10px_theme(colors.brand.500)]" />
        </div>
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-text-primary">
          GREEN LIGHT
        </h1>
        <p className="mb-6 text-sm text-text-secondary">Sign in with Discord to manage your server.</p>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'}
          </div>
        )}

        <a
          href={`${API_BASE}/auth/discord`}
          className="block w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-400"
        >
          Continue with Discord
        </a>
      </div>
    </div>
  )
}
