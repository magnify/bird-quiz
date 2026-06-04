import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Mine resultater — ${BRAND.name}`,
  description: 'Se din quiz-historik',
}

export default function ResultaterLayout({ children }: { children: React.ReactNode }) {
  return children
}
