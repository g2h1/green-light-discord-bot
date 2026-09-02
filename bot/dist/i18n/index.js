import en from './en.json' with { type: 'json' };
import ar from './ar.json' with { type: 'json' };
export const DEFAULT_LOCALE = 'en';
const dictionaries = { en, ar };
export function isLocale(value) {
    return value === 'en' || value === 'ar';
}
/** Looks up `key` in `locale`'s dictionary (falling back to English), substituting `{var}` placeholders. */
export function t(locale, key, vars = {}) {
    const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
    const template = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}
