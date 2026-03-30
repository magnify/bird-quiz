import QuizApp from '@/components/quiz/QuizApp'
import { getBirds } from '@/lib/data/birds'

export default async function Home() {
  const { birds, memberships } = await getBirds()

  return (
    <div className="quiz-app-root">
      <QuizApp birds={birds} memberships={memberships} />
    </div>
  )
}
