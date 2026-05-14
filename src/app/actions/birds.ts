'use server'

import { r2Get, r2Put } from '@/lib/r2'
import { checkAuth } from '@/app/admin/actions'

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  source_url?: string
  needsReview?: boolean
  flagged?: boolean
  flag_reason?: string
}

async function readManifest(): Promise<Record<string, ManifestEntry>> {
  const data = await r2Get('manifest.json')
  if (!data) return {}
  return JSON.parse(data.toString())
}

async function writeManifest(manifest: Record<string, ManifestEntry>): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  await r2Put('manifest.json', buffer, 'application/json')
}

export async function flagBirdImage(scientificName: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await checkAuth())) return { ok: false, error: 'Unauthorized' }
  try {
    const manifest = await readManifest()
    manifest[scientificName] = {
      ...manifest[scientificName],
      file: manifest[scientificName]?.file || `${scientificName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      source: manifest[scientificName]?.source || 'unknown',
      flagged: true,
      flag_reason: reason,
    }
    await writeManifest(manifest)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to flag image' }
  }
}

export async function unflagBirdImage(scientificName: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await checkAuth())) return { ok: false, error: 'Unauthorized' }
  try {
    const manifest = await readManifest()
    if (manifest[scientificName]) {
      delete manifest[scientificName].flagged
      delete manifest[scientificName].flag_reason
    }
    await writeManifest(manifest)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to unflag image' }
  }
}

export async function getFlaggedBirdIds(): Promise<Set<string>> {
  try {
    const manifest = await readManifest()
    const flagged = new Set<string>()
    for (const [sciName, entry] of Object.entries(manifest)) {
      if (entry.flagged) flagged.add(sciName)
    }
    return flagged
  } catch {
    return new Set()
  }
}
