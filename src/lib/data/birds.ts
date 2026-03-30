/**
 * Data access layer: fetches birds + memberships from Supabase,
 * falls back to static data if Supabase is unavailable.
 */

import { createClient } from '@/lib/supabase/server'
import { STATIC_BIRDS, STATIC_MEMBERSHIPS, SIMILARITY_GROUPS_RAW } from './birds-static'
import type { Bird } from '@/lib/supabase/types'

export async function getBirds(): Promise<{
  birds: Bird[]
  memberships: { bird_id: string; group_id: string }[]
}> {
  try {
    const supabase = await createClient()
    const { data: birds, error: birdsErr } = await supabase
      .from('birds')
      .select('*')
      .eq('is_active', true)

    if (birdsErr || !birds?.length) {
      return { birds: STATIC_BIRDS, memberships: STATIC_MEMBERSHIPS }
    }

    const { data: memberships, error: membErr } = await supabase
      .from('bird_similarity_group')
      .select('bird_id, group_id')

    if (membErr || !memberships) {
      return { birds, memberships: STATIC_MEMBERSHIPS }
    }

    return { birds, memberships }
  } catch {
    return { birds: STATIC_BIRDS, memberships: STATIC_MEMBERSHIPS }
  }
}

export async function getSimilarityGroups(): Promise<
  { slug: string; name: string; members: Bird[] }[]
> {
  try {
    const supabase = await createClient()

    const { data: groups, error: groupsErr } = await supabase
      .from('similarity_groups')
      .select('id, slug, name_da')

    if (groupsErr || !groups?.length) {
      return getSimilarityGroupsStatic()
    }

    const { data: memberships, error: membErr } = await supabase
      .from('bird_similarity_group')
      .select('bird_id, group_id')

    const { data: birds, error: birdsErr } = await supabase
      .from('birds')
      .select('*')
      .eq('is_active', true)

    if (membErr || birdsErr || !memberships || !birds) {
      return getSimilarityGroupsStatic()
    }

    const birdById = new Map(birds.map(b => [b.id, b]))
    const groupMemberships = new Map<string, Bird[]>()
    for (const m of memberships) {
      const bird = birdById.get(m.bird_id)
      if (bird) {
        const list = groupMemberships.get(m.group_id) || []
        list.push(bird)
        groupMemberships.set(m.group_id, list)
      }
    }

    return groups
      .map(g => ({
        slug: g.slug,
        name: g.slug.replace(/-/g, ' '),
        members: groupMemberships.get(g.id) || [],
      }))
      .sort((a, b) => b.members.length - a.members.length)
  } catch {
    return getSimilarityGroupsStatic()
  }
}

function getSimilarityGroupsStatic() {
  const birdBySci = new Map(STATIC_BIRDS.map(b => [b.scientific_name, b]))
  return Object.entries(SIMILARITY_GROUPS_RAW)
    .map(([slug, sciNames]) => ({
      slug,
      name: slug.replace(/-/g, ' '),
      members: sciNames
        .map(sci => birdBySci.get(sci))
        .filter((b): b is Bird => !!b),
    }))
    .sort((a, b) => b.members.length - a.members.length)
}
