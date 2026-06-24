/**
 * Find the bird's own name inside an attribution/copyright string.
 *
 * A clean photo credit ("© John Doe, CC BY-SA") shouldn't contain the bird's
 * name — a match flags a copyright field worth reviewing (often a Wikimedia
 * caption pasted verbatim, sometimes a genuinely mis-filled field).
 *
 * Scientific names are intentionally NOT checked: Wikimedia/iNaturalist credits
 * legitimately include them ("… (Turdus merula) …"), so they'd be pure noise.
 */
export function namesInCopyright(
  attribution: string | undefined | null,
  nameDa: string,
  nameEn?: string | null,
): string[] {
  if (!attribution) return []
  const hay = attribution.toLowerCase()
  const found: string[] = []
  for (const name of [nameDa, nameEn]) {
    const n = name?.trim().toLowerCase()
    if (n && hay.includes(n)) found.push(name!.trim())
  }
  return found
}
