import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

// Danish is the default and stays unprefixed (existing URLs keep working,
// incl. the shared link); English is served under /en via 'as-needed'.
export const routing = defineRouting({
  locales: ['da', 'en'],
  defaultLocale: 'da',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
