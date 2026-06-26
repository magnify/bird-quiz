/**
 * Guest identity management. Persists an anonymous UUID in localStorage.
 */

const GUEST_ID_KEY = 'dansk_fugleviden_guest_id'

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}
