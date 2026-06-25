'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter, type Locale } from '@/i18n/routing'

const LANG_NAMES: Record<Locale, string> = { da: 'Dansk', en: 'English' }

/** One language control for both desktop (header) and mobile (bottom nav):
 *  a globe + the current language, click toggles to the other locale.
 *  Layout adapts via CSS (.lang-switch / .mobile-bottom-nav .lang-switch). */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const other: Locale = locale === 'da' ? 'en' : 'da'

  return (
    <button
      type="button"
      className="lang-switch"
      onClick={() => router.replace(pathname, { locale: other })}
      aria-label="Skift sprog / Change language"
    >
      <svg
        className="lang-switch-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      <span className="lang-switch-label">{LANG_NAMES[locale]}</span>
    </button>
  )
}
