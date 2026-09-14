import type { I18nDictionary } from '../foundation/types.js';

/** Values interpolated into a translated message template. */
export type TranslationValues = Readonly<Record<string, string | number>>;

/** Resolves localized messages with fallback locale and named interpolation. */
export class Translator {
  /** Creates a translator with an immutable dictionary and fallback locale. */
  constructor(private readonly dictionary: I18nDictionary, private readonly fallbackLocale = 'en-US') {}

  /** Returns a localized message, falling back to the key when absent. */
  translate(key: string, locale: string, values: TranslationValues = {}): string {
    const template = this.dictionary[locale]?.[key] ?? this.dictionary[this.fallbackLocale]?.[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  }
}
