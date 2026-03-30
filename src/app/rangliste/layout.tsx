import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rangliste — Fugle Quiz',
  description: 'Se de bedste quiz-resultater',
}

export default function RanglisteLayout({ children }: { children: React.ReactNode }) {
  return children
}
