import QuizApp from '@/components/quiz/QuizApp'
import { getBirds } from '@/lib/data/birds'

export default async function Home() {
  const { birds, memberships } = await getBirds()

  return <QuizApp birds={birds} memberships={memberships} />
}
