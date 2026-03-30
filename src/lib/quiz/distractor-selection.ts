/**
 * Distractor (wrong answer) selection logic.
 * Prefers visually similar birds from the same similarity group,
 * then taxonomically related birds (same genus), then random.
 *
 * Ported from legacy app.js lines 273-324, 338-371.
 */

import type { Bird, SimilarityGroup } from '@/lib/supabase/types'

export interface BirdWithGroups extends Bird {
  group_ids: string[]
}

interface GroupMembership {
  group_id: string
  bird_ids: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build a lookup from bird ID to group IDs and from group ID to bird IDs.
 */
export function buildGroupIndex(
  birds: Bird[],
  memberships: { bird_id: string; group_id: string }[]
): {
  birdGroups: Map<string, string[]>
  groupMembers: Map<string, string[]>
} {
  const birdGroups = new Map<string, string[]>()
  const groupMembers = new Map<string, string[]>()

  for (const m of memberships) {
    const bg = birdGroups.get(m.bird_id) || []
    bg.push(m.group_id)
    birdGroups.set(m.bird_id, bg)

    const gm = groupMembers.get(m.group_id) || []
    gm.push(m.bird_id)
    groupMembers.set(m.group_id, gm)
  }

  return { birdGroups, groupMembers }
}

/**
 * Get similar birds (from the same similarity groups) for a given bird.
 */
export function getSimilarBirdIds(
  birdId: string,
  birdGroups: Map<string, string[]>,
  groupMembers: Map<string, string[]>
): Set<string> {
  const groups = birdGroups.get(birdId) || []
  const similar = new Set<string>()

  for (const groupId of groups) {
    const members = groupMembers.get(groupId) || []
    for (const memberId of members) {
      if (memberId !== birdId) {
        similar.add(memberId)
      }
    }
  }

  return similar
}

/**
 * Pick 3 distractors for a given bird.
 * Priority: 1) similar-looking birds (all), 2) same genus (all), 3) random from pool.
 * Steps 1 & 2 search ALL birds so distractors are always plausible,
 * even when the difficulty-filtered pool is small.
 */
export function pickDistractors(
  correctBird: Bird,
  pool: Bird[],
  allBirds: Bird[],
  birdGroups: Map<string, string[]>,
  groupMembers: Map<string, string[]>
): Bird[] {
  const used = new Set<string>([correctBird.id])
  const distractors: Bird[] = []
  const allById = new Map(allBirds.map(b => [b.id, b]))

  // 1) Similar birds (from visual similarity groups — search ALL birds)
  const similarIds = getSimilarBirdIds(correctBird.id, birdGroups, groupMembers)
  const similarBirds = shuffle(
    [...similarIds]
      .map(id => allById.get(id))
      .filter((b): b is Bird => b !== undefined && !used.has(b.id))
  )
  for (const s of similarBirds) {
    if (distractors.length >= 3) break
    used.add(s.id)
    distractors.push(s)
  }

  // 2) Same genus (taxonomically related — search ALL birds)
  if (distractors.length < 3) {
    const genus = correctBird.scientific_name.split(' ')[0]
    const genusBirds = shuffle(
      allBirds.filter(b => b.scientific_name.startsWith(genus + ' ') && !used.has(b.id))
    )
    for (const g of genusBirds) {
      if (distractors.length >= 3) break
      used.add(g.id)
      distractors.push(g)
    }
  }

  // 3) Random from difficulty pool (keeps difficulty-appropriate feel)
  if (distractors.length < 3) {
    const remaining = shuffle(pool.filter(b => !used.has(b.id)))
    for (const r of remaining) {
      if (distractors.length >= 3) break
      used.add(r.id)
      distractors.push(r)
    }
  }

  return distractors
}
