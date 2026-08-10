export const LOCALES = ['he', 'en', 'fr', 'yi'] as const;
export type Locale = typeof LOCALES[number];

export function normalizeLocale(raw: string | undefined | null): Locale {
  return (LOCALES as readonly string[]).includes(raw as string) ? (raw as Locale) : 'he';
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
