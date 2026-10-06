import type { I18nDictionary } from '../foundation/types.js';

/**
 * Values interpolated into a translated message template.
 * @deprecated Will be removed with Translator in 1.0.3. Use i18next + react-i18next in the application.
 */
export type TranslationValues = Readonly<Record<string, string | number>>;

/**
 * Resolves localized messages with fallback locale and named interpolation.
 * @deprecated Will be removed in 1.0.3. Use i18next + react-i18next in the application.
 */
export class Translator {
  /** Creates a translator with an immutable dictionary and fallback locale. */
  constructor(private readonly dictionary: I18nDictionary, private readonly fallbackLocale = 'en-US') {}

  /**
   * Returns a localized message, falling back to the key when absent.
   * @deprecated Will be removed with Translator in 1.0.3. Use the application's i18next instance instead.
   */
  translate(key: string, locale: string, values: TranslationValues = {}): string {
    const template = this.dictionary[locale]?.[key] ?? this.dictionary[this.fallbackLocale]?.[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  }
}
