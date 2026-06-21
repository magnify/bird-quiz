// Danish country names for the codes we realistically see, plus a flag emoji
// derived from the ISO code. Unknown codes fall back to the raw code.

const NAMES_DA: Record<string, string> = {
  DK: 'Danmark', SE: 'Sverige', NO: 'Norge', DE: 'Tyskland', GB: 'Storbritannien',
  US: 'USA', NL: 'Holland', FR: 'Frankrig', ES: 'Spanien', IT: 'Italien',
  PL: 'Polen', FI: 'Finland', IS: 'Island', BE: 'Belgien', AT: 'Østrig',
  CH: 'Schweiz', IE: 'Irland', PT: 'Portugal', CZ: 'Tjekkiet', CA: 'Canada',
  AU: 'Australien', FO: 'Færøerne', GL: 'Grønland',
}

/** Regional-indicator flag emoji from a 2-letter ISO country code. */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '🏳️'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

export function countryNameDa(code: string): string {
  return NAMES_DA[code.toUpperCase()] ?? code
}
