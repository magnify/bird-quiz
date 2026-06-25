import { getTranslations } from 'next-intl/server'
import { BRAND } from '@/lib/brand'
import { VERSION_LABEL } from '@/lib/version'

export default async function OmPage() {
  const t = await getTranslations('about')
  return (
    <div id="secondary-screen" className="screen active">
      <div className="secondary-page-content">
        <div>
          <h1 className="page-title">{t('title', { name: BRAND.name })}</h1>
        </div>

          <div className="result-card result-card--padded">
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              {t('intro', { name: BRAND.name })}
            </p>
          </div>

          <div className="result-card result-card--padded">
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>{t('supportHeading')}</p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6 }}>
              {t.rich('supportBody1', {
                name: BRAND.name,
                mobilePay: BRAND.mobilePay,
                strong: chunks => <strong style={{ color: 'var(--quiz-foreground)' }}>{chunks}</strong>,
              })}
            </p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6, marginTop: 'var(--quiz-gap-md)' }}>
              {t('supportBody2')}
            </p>
            <p style={{ color: 'var(--quiz-text-secondary)', fontSize: 'var(--quiz-text-base)', lineHeight: 1.6, marginTop: 'var(--quiz-gap-md)' }}>
              {t('supportBody3')}
            </p>
          </div>

          <div className="result-card result-card--padded">
            <p className="setting-label" style={{ marginBottom: 'var(--quiz-gap-sm)' }}>{t('contactHeading')}</p>
            <a
              href={`mailto:${BRAND.contactEmail}`}
              style={{ color: 'var(--quiz-accent)', fontSize: 'var(--quiz-text-base)' }}
            >
              {BRAND.contactEmail}
            </a>
        </div>

        <p className="build-stamp">{VERSION_LABEL}</p>
      </div>
    </div>
  )
}
