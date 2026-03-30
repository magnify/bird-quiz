/**
 * Guest identity management.
 * Persists a UUID and optional nickname in localStorage.
 */

const GUEST_ID_KEY = 'dansk_fugleviden_guest_id'
const GUEST_NAME_KEY = 'dansk_fugleviden_guest_name'

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}

export function getGuestName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GUEST_NAME_KEY)
}

export function setGuestName(name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GUEST_NAME_KEY, name.trim())
}
