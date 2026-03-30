'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { migrateGuestData } from '@/app/actions/auth'
import { getGuestId } from '@/lib/identity/guest'

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    let err: string | null
    if (isSignUp) {
      err = await signUp(email, password, displayName)
    } else {
      err = await signIn(email, password)
    }

    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    // Migrate guest data on sign-in/sign-up
    const guestId = getGuestId()
    if (guestId) {
      // We get the user from supabase auth state, but for migration we need userId
      // The auth state change will trigger, and migration can happen then
      // For now, we trigger it from the auth callback
    }

    setLoading(false)
    onClose()
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>&times;</button>
        <h2 className="auth-modal-title">{isSignUp ? 'Opret konto' : 'Log ind'}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <input
              type="text"
              className="auth-input"
              placeholder="Navn"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Adgangskode"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="start-btn" disabled={loading}>
            <span>{loading ? 'Vent...' : isSignUp ? 'Opret konto' : 'Log ind'}</span>
          </button>
        </form>

        <button
          className="auth-toggle"
          onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
        >
          {isSignUp ? 'Har du allerede en konto? Log ind' : 'Ny bruger? Opret konto'}
        </button>
      </div>
    </div>
  )
}
