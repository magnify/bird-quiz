'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter, routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

/** DA/EN toggle that preserves the current path. Rendered in the public header
 *  (Stage 2). Uses next-intl navigation so the locale prefix is handled. */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="inline-flex items-center gap-1 text-sm" role="group" aria-label="Sprog / Language">
      {routing.locales.map((l, i) => (
        <span key={l} className="inline-flex items-center">
          {i > 0 && <span className="px-1 opacity-40">/</span>}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: l })}
            aria-current={l === locale ? 'true' : undefined}
            className={cn(
              'uppercase transition-opacity',
              l === locale ? 'font-semibold opacity-100' : 'opacity-60 hover:opacity-100',
            )}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  )
}
