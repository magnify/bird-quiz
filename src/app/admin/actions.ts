'use server'

import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const SALT = 'dansk-fugleviden-admin-2026'

function hashToken(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export async function loginAction(password: string): Promise<{ success: boolean }> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || password !== expected) {
    return { success: false }
  }

  const token = hashToken(expected)
  const cookieStore = await cookies()
  cookieStore.set('admin_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return { success: true }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('admin_auth')
}

export async function checkAuth(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false

  const cookieStore = await cookies()
  const token = cookieStore.get('admin_auth')?.value
  if (!token) return false

  return token === hashToken(expected)
}
