'use client'

import '@/components/quiz/quiz.css'
import { usePathname } from 'next/navigation'
import QuizHeader from '@/components/quiz/QuizHeader'
import MobileBottomNav from '@/components/quiz/MobileBottomNav'

type Page = 'resultater' | 'om'

function pageFor(pathname: string): Page | undefined {
  if (pathname.startsWith('/resultater')) return 'resultater'
  if (pathname.startsWith('/om')) return 'om'
  return undefined
}

/**
 * Shell for the content pages (/om, /resultater): the same quiz-app-root +
 * header + bottom nav as the home screen, on the normal dark background. Only
 * the page content differs, so navigating between screens doesn't reflow the
 * chrome.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const activePage = pageFor(usePathname() ?? '')
  return (
    <div className="quiz-app-root">
      <QuizHeader activePage={activePage} />
      {children}
      <MobileBottomNav activePage={activePage} />
    </div>
  )
}
