import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

// Danish is the default and stays unprefixed (existing URLs keep working,
// incl. the shared link); English is served under /en via 'as-needed'.
export const routing = defineRouting({
  locales: ['da', 'en'],
  defaultLocale: 'da',
  localePrefix: 'as-needed',
  // Danish is always the default; English is opt-in via the switcher. Without
  // this, next-intl redirects '/' to '/en' based on the browser's language.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
