import { getBirds } from '@/lib/data/birds'
import QuizHeader from '@/components/quiz/QuizHeader'
import MobileBottomNav from '@/components/quiz/MobileBottomNav'

export default async function DonerePage() {
  // Get birds for consistency (even though not used yet)
  await getBirds()

  return (
    <div className="quiz-app-root">
      <div id="secondary-screen" className="screen active">
        <QuizHeader activePage="quiz" />

        <div className="secondary-content">
          <div className="secondary-container">
            <h1 className="secondary-title">Giv en kaffe ☕</h1>

            <div className="secondary-card">
              <p>Indhold kommer snart...</p>
            </div>
          </div>
        </div>

        <MobileBottomNav activePage="kaffe" />
      </div>
    </div>
  )
}
