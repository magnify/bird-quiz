import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Rangliste — ${BRAND.name}`,
  description: 'Se de bedste quiz-resultater',
}

export default function RanglisteLayout({ children }: { children: React.ReactNode }) {
  return children
}
