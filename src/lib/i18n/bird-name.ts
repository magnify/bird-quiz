import type { Locale } from '@/i18n/routing'

/** Pick a bird's display name for the active locale, falling back to Danish. */
export function localizedBirdName(
  bird: { name_da: string; name_en?: string | null },
  locale: Locale,
): string {
  if (locale === 'en') return bird.name_en?.trim() || bird.name_da
  return bird.name_da
}
