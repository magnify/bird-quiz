import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { r2Get } from '@/lib/r2'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ImageAuditGrid from '@/components/admin/ImageAuditGrid'
import { getFlaggedBirdIds } from '@/app/actions/birds'

type AuditStatus = 'critical' | 'warning' | 'ok'

interface ManifestEntry {
  source: string
  license?: string
  attribution?: string
  needsReview?: boolean
}

interface ImageAudit {
  bird: typeof STATIC_BIRDS[0]
  status: AuditStatus
  license?: string
  attribution?: string
  source: string
  issues: string[]
  isPortrait: boolean
  needsReview: boolean
}

async function analyzeImages(): Promise<ImageAudit[]> {
  // Read manifest from R2
  let manifest: Record<string, ManifestEntry> = {}
  try {
    const data = await r2Get('manifest.json')
    if (data) {
      manifest = JSON.parse(data.toString())
    }
  } catch (err) {
    console.error('Failed to load manifest:', err)
  }

  // Analyze each bird
  return STATIC_BIRDS.map(bird => {
    const entry = manifest[bird.scientific_name] || {}
    const issues: string[] = []

    // Check for missing attribution
    if (!entry.attribution || entry.attribution.trim() === '') {
      issues.push('Mangler kredit')
    }

    // Check source
    if (!entry.source || entry.source === 'cached' || entry.source === 'unknown') {
      issues.push('Uklar kilde')
    }

    // Check license (skip checks for project-owned images)
    const isOwn = entry.license?.toLowerCase() === 'own' || entry.license?.toLowerCase() === 'project' || entry.license?.toLowerCase() === 'copyright'

    if (!isOwn) {
      if (entry.license?.toLowerCase().includes('nc')) {
        issues.push('NC-licens (non-commercial)')
      }

      if (entry.attribution?.match(/©|\(c\)/i) && !entry.license?.toLowerCase().startsWith('cc-')) {
        issues.push('Copyright uden CC-licens')
      }

      if (entry.attribution && (!entry.license || entry.license.trim() === '')) {
        issues.push('Licens mangler')
      }
    }

    // Check if needs manual review
    if (entry.needsReview === true) {
      issues.push('Skal gennemgås (auto-erstattet)')
    }

    // Determine status
    const criticalIssues = issues.filter(i =>
      i.includes('Mangler kredit') ||
      i.includes('Uklar kilde') ||
      i.includes('NC-licens')
    )

    const status: AuditStatus = issues.length === 0 ? 'ok' : criticalIssues.length > 0 ? 'critical' : 'warning'

    // Check if portrait (hardcoded list - in production, could fetch from image metadata)
    const PORTRAIT_IMAGES = new Set([
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

    return {
      bird,
      status,
      license: entry.license,
      attribution: entry.attribution,
      source: entry.source || 'unknown',
      issues,
      isPortrait: PORTRAIT_IMAGES.has(bird.scientific_name),
      needsReview: entry.needsReview || false,
    }
  })
}

export default async function ImagesPage() {
  const [audits, flaggedIds] = await Promise.all([
    analyzeImages(),
    getFlaggedBirdIds(),
  ])

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Main Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Billedaudit</CardTitle>
          <CardDescription>
            Licens, kvalitet og compliance for alle {audits.length} fuglebilleder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageAuditGrid audits={audits} initialFlaggedBirdIds={Array.from(flaggedIds)} />
        </CardContent>
      </Card>
    </div>
  )
}
