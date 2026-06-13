import { BRAND } from '@/lib/brand'

export default function OmPage() {
  return (
    <div id="secondary-screen" className="screen active">
      <div className="secondary-page-content">
        <div>
          <h1 className="page-title">Om {BRAND.name}</h1>
        </div>

          <div className="result-card result-card--padded">
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              {BRAND.name} er en gratis dansk fuglequiz, der hjælper dig med at lære de danske fugle at kende.
              Gæt fuglen ud fra billeder og test din viden.
            </p>
          </div>

          <div className="result-card result-card--padded">
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>Kontakt</p>
            <a
              href={`mailto:${BRAND.contactEmail}`}
              style={{ color: 'var(--quiz-accent)', fontSize: 'var(--quiz-text-base)' }}
            >
              {BRAND.contactEmail}
            </a>
          </div>

          <div className="result-card result-card--padded">
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>Støt projektet</p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              {BRAND.name} er et frivilligt projekt. Det er lavet af mig, Brian Jensen, der er hobby-fugleentusiast
              og gerne vil lære mere om danske fugle og øve mig i at genkende de forskellige arter. Kan du lide
              projektet? Så kan du støtte det via MobilePay:{' '}
              <strong style={{ color: 'var(--quiz-foreground)' }}>{BRAND.mobilePay}</strong>
            </p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6, marginTop: 'var(--quiz-gap-md)' }}>
              Det overskud, der er tilbage efter driftsomkostninger (lidt server der skal hostes), går til at
              støtte dansk natur.
            </p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6, marginTop: 'var(--quiz-gap-md)' }}>
              Jeg har flere idéer på tegnebrættet og forbedrer quizzen løbende, men har du forslag eller vil hjælpe
              med at teste, billeder eller andet, så skriv.
            </p>
        </div>
      </div>
    </div>
  )
}
