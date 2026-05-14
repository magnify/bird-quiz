import QuizApp from '@/components/quiz/QuizApp'
import { getBirds } from '@/lib/data/birds'
import { r2Get } from '@/lib/r2'

interface ManifestEntry {
  needsReview?: boolean
}

async function loadNeedsReviewSet(): Promise<Set<string>> {
  try {
    const data = await r2Get('manifest.json')
    if (!data) return new Set()
    const manifest = JSON.parse(data.toString()) as Record<string, ManifestEntry>
    const out = new Set<string>()
    for (const [name, entry] of Object.entries(manifest)) {
      if (entry.needsReview) out.add(name)
    }
    return out
  } catch {
    return new Set()
  }
}

export default async function Home() {
  const [{ birds, memberships }, needsReview] = await Promise.all([
    getBirds(),
    loadNeedsReviewSet(),
  ])

  const filteredBirds = needsReview.size > 0
    ? birds.filter(b => !needsReview.has(b.scientific_name))
    : birds

  return <QuizApp birds={filteredBirds} memberships={memberships} />
}
