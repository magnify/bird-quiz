import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mine resultater — Fugle Quiz',
  description: 'Se din quiz-historik',
}

export default function ResultaterLayout({ children }: { children: React.ReactNode }) {
  return children
}
