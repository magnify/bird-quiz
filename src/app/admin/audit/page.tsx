export default function AuditPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Logbog
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Audit log — alle ændringer til fugle, billeder og grupper
      </p>
      <div
        className="rounded-xl p-8 border text-center"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Logbog kommer snart
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Alle admin-handlinger logges med tidsstempel, bruger og ændringer.
          <br />
          Kræver Supabase-forbindelse og admin-autentificering (fase 6).
        </div>
      </div>
    </div>
  )
}
