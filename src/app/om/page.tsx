import '@/components/quiz/quiz.css'
import QuizHeader from '@/components/quiz/QuizHeader'
import MobileBottomNav from '@/components/quiz/MobileBottomNav'

export default function OmPage() {
  return (
    <>
      <QuizHeader activePage="om" />
      <div id="secondary-screen" className="screen active">
        <div className="secondary-page-content">
          <div>
            <h1 style={{ fontSize: 'var(--quiz-text-2xl)', fontWeight: 700, color: 'var(--quiz-foreground)' }}>
              Om Fugle Quiz
            </h1>
          </div>

          <div className="result-card" style={{ padding: 'var(--quiz-padding-md)' }}>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              Fugle Quiz er en gratis dansk fuglequiz, der hjælper dig med at lære de danske fugle at kende.
              Gæt fuglen ud fra billeder og test din viden.
            </p>
          </div>

          <div className="result-card" style={{ padding: 'var(--quiz-padding-md)' }}>
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>Kontakt</p>
            <a
              href="mailto:hallo@magnify.dk"
              style={{ color: 'var(--quiz-accent)', fontSize: 'var(--quiz-text-base)' }}
            >
              hallo@magnify.dk
            </a>
          </div>

          <div className="result-card" style={{ padding: 'var(--quiz-padding-md)' }}>
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>Støt projektet</p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              Fugle Quiz er et frivilligt projekt. Det overskud, der er tilbage efter drift — der er lidt server,
              der skal hostes — går til at støtte dansk natur. Kan du lide projektet? Send en kaffe via MobilePay:{' '}
              <strong style={{ color: 'var(--quiz-foreground)' }}>0611SB</strong>
            </p>
          </div>
        </div>
      </div>
      <MobileBottomNav activePage="om" />
    </>
  )
}
