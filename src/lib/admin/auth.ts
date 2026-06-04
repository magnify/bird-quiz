import 'server-only'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

// Kept identical to the original literal so existing admin_auth cookies stay
// valid; overridable via env without a redeploy of every route.
const SALT = process.env.ADMIN_SALT || 'dansk-fugleviden-admin-2026'

/** SHA-256 of the admin password + salt — the value stored in the admin_auth cookie. */
export function adminCookieHash(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

/** Verify the admin_auth cookie on an API route's request. */
export function verifyAdminRequest(request: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { ok: false, reason: 'no ADMIN_PASSWORD env var' }
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return { ok: false, reason: 'no admin_auth cookie' }
  if (token !== adminCookieHash(expected)) return { ok: false, reason: 'cookie mismatch' }
  return { ok: true }
}
