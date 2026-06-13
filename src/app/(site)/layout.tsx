'use client'

import '@/components/quiz/quiz.css'
import { usePathname } from 'next/navigation'
import QuizHeader from '@/components/quiz/QuizHeader'
import MobileBottomNav from '@/components/quiz/MobileBottomNav'
import { AmbientHero } from '@/components/quiz/AmbientHero'

type Page = 'resultater' | 'om'

function pageFor(pathname: string): Page | undefined {
  if (pathname.startsWith('/resultater')) return 'resultater'
  if (pathname.startsWith('/om')) return 'om'
  return undefined
}

/**
 * Persistent shell for the content pages (/om, /resultater). Rendered once and
 * kept mounted while navigating between them (client-side via <Link>), so the
 * ambient photo backdrop and chrome don't reload. The home/quiz route keeps its
 * own shell (its header is driven by quiz state).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const activePage = pageFor(usePathname() ?? '')
  return (
    <div className="quiz-app-root quiz-app-root--ambient">
      <AmbientHero />
      <QuizHeader activePage={activePage} />
      {children}
      <MobileBottomNav activePage={activePage} />
    </div>
  )
}
