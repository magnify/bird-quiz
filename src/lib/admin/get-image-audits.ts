import 'server-only'
import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { r2Get, r2List } from '@/lib/r2'
import { toSlug } from '@/lib/images'
import type { AuditSeverity, FlagReason, ImageAudit, ManifestEntry } from './image-status'
import { FLAG_REASONS } from './image-status'

// Birds with portrait or square images that crop poorly.
const PORTRAIT_IMAGES = new Set<string>([
  'Falco columbarius',
  'Dryocopus martius',
  'Certhia familiaris',
  'Picus viridis',
  'Aegithalos caudatus',
  'Falco peregrinus',
  'Dendrocopos major',
  'Loxia pytyopsittacus',
  'Cyanistes caeruleus',
  'Acrocephalus palustris',
  'Falco tinnunculus',
  'Lophophanes cristatus',
  'Milvus milvus',
  'Nucifraga caryocatactes',
  'Remiz pendulinus',
  'Strix aluco',
])

const KNOWN_REASONS = new Set<string>(FLAG_REASONS.map(r => r.value))

async function readManifest(): Promise<Record<string, ManifestEntry>> {
  try {
    const data = await r2Get('manifest.json')
    if (!data) return {}
    return JSON.parse(data.toString())
  } catch {
    return {}
  }
}

async function readFilePresence(): Promise<Set<string>> {
  try {
    const keys = await r2List()
    const slugs = new Set<string>()
    for (const key of keys) {
      if (key.endsWith('.jpg') && !key.startsWith('originals/')) {
        slugs.add(key.slice(0, -'.jpg'.length))
      }
    }
    return slugs
  } catch {
    return new Set()
  }
}

function coerceFlagReason(raw: string | undefined): FlagReason | undefined {
  if (!raw) return undefined
  return KNOWN_REASONS.has(raw) ? (raw as FlagReason) : 'other'
}

function computeIssues(entry: ManifestEntry | undefined, needsReview: boolean): string[] {
  const issues: string[] = []
  if (!entry?.attribution || entry.attribution.trim() === '') {
    issues.push('Mangler kredit')
  }
  if (!entry?.source || entry.source === 'cached' || entry.source === 'unknown') {
    issues.push('Uklar kilde')
  }
  const isOwn =
    entry?.license?.toLowerCase() === 'own' ||
    entry?.license?.toLowerCase() === 'project' ||
    entry?.license?.toLowerCase() === 'copyright'
  if (!isOwn) {
    if (entry?.license?.toLowerCase().includes('nc')) {
      issues.push('NC-licens (non-commercial)')
    }
    if (entry?.attribution?.match(/©|\(c\)/i) && !entry.license?.toLowerCase().startsWith('cc-')) {
      issues.push('Copyright uden CC-licens')
    }
    if (entry?.attribution && (!entry.license || entry.license.trim() === '')) {
      issues.push('Licens mangler')
    }
  }
  if (needsReview) {
    issues.push('Skal gennemgås (auto-erstattet)')
  }
  return issues
}

function computeSeverity(issues: string[]): AuditSeverity {
  if (issues.length === 0) return 'ok'
  const critical = issues.filter(i =>
    i.includes('Mangler kredit') ||
    i.includes('Uklar kilde') ||
    i.includes('NC-licens'),
  )
  return critical.length > 0 ? 'critical' : 'warning'
}

export async function getImageAudits(): Promise<ImageAudit[]> {
  const [manifest, presentSlugs] = await Promise.all([readManifest(), readFilePresence()])

  return STATIC_BIRDS.map(bird => {
    const entry = manifest[bird.scientific_name]
    const slug = toSlug(bird.scientific_name)
    const hasFile = presentSlugs.has(slug)
    const needsReview = entry?.needsReview === true
    const issues = computeIssues(entry, needsReview)

    return {
      scientificName: bird.scientific_name,
      hasFile,
      source: entry?.source || 'unknown',
      attribution: entry?.attribution,
      license: entry?.license,
      flagged: entry?.flagged === true,
      flagReason: coerceFlagReason(entry?.flag_reason),
      needsReview,
      issues,
      severity: computeSeverity(issues),
      isPortrait: PORTRAIT_IMAGES.has(bird.scientific_name),
    }
  })
}
