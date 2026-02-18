// /lib/language-utils.ts
// Shared language code → display name mapping

export const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  tr: 'Turkish',
  ar: 'Arabic',
}

/**
 * Convert a language code like 'en' or 'de' to its full display name.
 * Returns the code itself if not found in the map.
 */
export function getLanguageName(code: string | null | undefined): string | null {
  if (!code) return null
  return LANGUAGE_MAP[code.toLowerCase()] ?? code
}

/**
 * All language options for filter dropdowns.
 */
export const LANGUAGE_OPTIONS = [
  { value: '', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'other', label: 'Other' },
]
