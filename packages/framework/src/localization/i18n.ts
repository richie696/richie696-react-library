import type { I18nDictionary } from '../foundation/types.js';

export type TranslationValues = Readonly<Record<string, string | number>>;

export class Translator {
  constructor(private readonly dictionary: I18nDictionary, private readonly fallbackLocale = 'en-US') {}

  translate(key: string, locale: string, values: TranslationValues = {}): string {
    const template = this.dictionary[locale]?.[key] ?? this.dictionary[this.fallbackLocale]?.[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  }
}
