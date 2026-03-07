export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Analyse
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Quiz-statistik, brugeranalyse og sværhedsdata
      </p>
      <div
        className="rounded-xl p-8 border text-center"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }}>
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Analyse kommer snart
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Quiz-sessioner, svartider, sværhedsfordeling og brugerengagement.
          <br />
          Kræver Supabase-forbindelse og quiz-tracking (fase 5).
        </div>
      </div>
    </div>
  )
}
