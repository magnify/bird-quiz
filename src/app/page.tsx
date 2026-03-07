import QuizApp from '@/components/quiz/QuizApp'
import { STATIC_BIRDS, STATIC_MEMBERSHIPS } from '@/lib/data/birds-static'
import type { BirdImage } from '@/lib/supabase/types'

// For now, we use static data. Once Supabase is configured,
// this will fetch from the database instead.
async function getBirds() {
  // TODO: Replace with Supabase query when configured:
  // const supabase = await createClient()
  // const { data: birds } = await supabase.from('birds').select('*').eq('is_active', true)
  // const { data: memberships } = await supabase.from('bird_similarity_group').select('*')
  // const { data: images } = await supabase.from('bird_images').select('*').eq('is_primary', true)
  return {
    birds: STATIC_BIRDS,
    memberships: STATIC_MEMBERSHIPS,
    images: [] as BirdImage[],
  }
}

export default async function Home() {
  const { birds, memberships, images } = await getBirds()

  return <QuizApp birds={birds} memberships={memberships} birdImages={images} />
}
