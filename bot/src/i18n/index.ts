import en from './en.json' with { type: 'json' }
import ar from './ar.json' with { type: 'json' }

export type Locale = 'en' | 'ar'
export const DEFAULT_LOCALE: Locale = 'en'

type Dict = Record<string, string>
const dictionaries: Record<Locale, Dict> = { en, ar }

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'ar'
}

/** Looks up `key` in `locale`'s dictionary (falling back to English), substituting `{var}` placeholders. */
export function t(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
  const template = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`))
}
