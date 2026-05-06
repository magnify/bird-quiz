#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { STATIC_BIRDS } from '../src/lib/data/birds-static'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const BUCKET = 'bird-images'
const MANIFEST_PATH = 'manifest.json'

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  needsReview?: boolean
}

interface INatPhoto {
  url: string
  attribution: string
  license: string
  width: number
  height: number
  quality: number
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function findBestPhoto(scientificName: string): Promise<INatPhoto | null> {
  try {
    // Search iNaturalist for CC0 photos, research grade, ordered by votes
    const searchName = encodeURIComponent(scientificName)
    const url = `https://api.inaturalist.org/v1/observations?taxon_name=${searchName}&photos=true&quality_grade=research&per_page=30&order_by=votes&photo_license=cc0`

    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ⚠️  iNaturalist API error: ${res.status}`)
      return null
    }

    const data = await res.json()
    if (!data.results || data.results.length === 0) {
      console.warn(`  ⚠️  No CC0 photos found`)
      return null
    }

    // Find the best landscape photo (width > height, prefer ratio > 1.3 for 4:3 crop)
    let bestPhoto: INatPhoto | null = null
    let bestScore = 0

    for (const obs of data.results) {
      if (!obs.photos || obs.photos.length === 0) continue

      for (const photo of obs.photos) {
        const width = photo.original_dimensions?.width || 0
        const height = photo.original_dimensions?.height || 0

        if (width === 0 || height === 0) continue

        const ratio = width / height

        // Skip portrait/square images
        if (ratio < 1.2) continue

        // Score based on: landscape ratio (closer to 4:3 = 1.33), quality, votes
        const ratioScore = ratio >= 1.2 && ratio <= 1.6 ? 10 : 5 // Prefer 1.2-1.6 range
        const qualityScore = obs.quality_grade === 'research' ? 5 : 0
        const votesScore = Math.min(obs.faves_count || 0, 10) // Cap at 10

        const score = ratioScore + qualityScore + votesScore

        if (score > bestScore) {
          bestScore = score
          bestPhoto = {
            url: photo.url.replace('/square', '/original'),
            attribution: `${obs.user.name || obs.user.login} (iNaturalist)`,
            license: 'cc0',
            width,
            height,
            quality: obs.quality_grade === 'research' ? 1 : 0,
          }
        }
      }
    }

    return bestPhoto
  } catch (err) {
    console.warn(`  ⚠️  Error fetching from iNaturalist:`, err)
    return null
  }
}

async function replaceImage(
  scientificName: string,
  photo: INatPhoto,
  storage: ReturnType<ReturnType<typeof createClient>['storage']['from']>
): Promise<boolean> {
  try {
    const slug = scientificName.toLowerCase().replace(/\s+/g, '-')

    // Download image
    const imageRes = await fetch(photo.url)
    if (!imageRes.ok) {
      console.warn(`  ⚠️  Failed to download image: ${imageRes.status}`)
      return false
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

    // Check if backup exists, if not create one
    const { data: backupExists } = await storage.download(`originals/${slug}.jpg`)
    if (!backupExists) {
      const { data: currentData } = await storage.download(`${slug}.jpg`)
      if (currentData) {
        const currentBuffer = Buffer.from(await currentData.arrayBuffer())
        await storage.upload(`originals/${slug}.jpg`, currentBuffer, {
          upsert: true,
          contentType: 'image/jpeg',
        })
      }
    }

    // Upload new image
    const { error: uploadError } = await storage.upload(`${slug}.jpg`, imageBuffer, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=0, must-revalidate',
    })

    if (uploadError) {
      console.warn(`  ⚠️  Upload failed:`, uploadError.message)
      return false
    }

    return true
  } catch (err) {
    console.warn(`  ⚠️  Replace error:`, err)
    return false
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const storage = supabase.storage.from(BUCKET)

  // Download manifest
  console.log('📥 Downloading current manifest...\n')
  const { data: manifestData } = await storage.download(MANIFEST_PATH)
  if (!manifestData) {
    console.error('❌ Failed to download manifest')
    process.exit(1)
  }

  const text = await manifestData.text()
  const manifest: Record<string, ManifestEntry> = JSON.parse(text)

  // Find birds with critical issues
  const criticalBirds = STATIC_BIRDS.filter(bird => {
    const entry = manifest[bird.scientific_name] || {}

    // Missing attribution
    if (!entry.attribution || entry.attribution.trim() === '') return true

    // Unclear source
    if (!entry.source || entry.source === 'cached' || entry.source === 'unknown') return true

    // NC license
    if (entry.license?.toLowerCase().includes('nc')) return true

    return false
  })

  console.log(`🔍 Found ${criticalBirds.length} birds with critical issues\n`)
  console.log(`⏳ This will take ~${Math.ceil(criticalBirds.length * 2 / 60)} minutes (rate limiting)\n`)

  let replaced = 0
  let failed = 0
  let skipped = 0
  const replacedBirds: string[] = [] // Track replaced birds for flagging

  for (let i = 0; i < criticalBirds.length; i++) {
    const bird = criticalBirds[i]
    const progress = `[${i + 1}/${criticalBirds.length}]`

    console.log(`${progress} ${bird.name_da} (${bird.scientific_name})`)

    // Search for best photo
    const photo = await findBestPhoto(bird.scientific_name)

    if (!photo) {
      console.log(`  ⏭️  Skipping (no suitable landscape photos found)\n`)
      skipped++
      await sleep(1000) // Rate limit
      continue
    }

    console.log(`  📐 Found ${photo.width}x${photo.height} (ratio: ${(photo.width / photo.height).toFixed(2)})`)
    console.log(`  👤 ${photo.attribution}`)

    // Replace image
    const success = await replaceImage(bird.scientific_name, photo, storage)

    if (success) {
      // Update manifest
      const slug = bird.scientific_name.toLowerCase().replace(/\s+/g, '-')
      manifest[bird.scientific_name] = {
        file: `${slug}.jpg`,
        source: 'inaturalist',
        attribution: photo.attribution,
        license: photo.license,
        needsReview: true, // Flag for manual approval
      }

      console.log(`  ✅ Replaced\n`)
      replaced++
      replacedBirds.push(bird.scientific_name)
    } else {
      console.log(`  ❌ Failed to replace\n`)
      failed++
    }

    // Rate limiting: 2 seconds between requests
    await sleep(2000)
  }

  // Upload updated manifest
  console.log(`\n📤 Uploading updated manifest...`)
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  await storage.upload(MANIFEST_PATH, manifestBuffer, {
    upsert: true,
    contentType: 'application/json',
  })

  // Save list of replaced birds for flagging
  const fs = await import('fs/promises')
  await fs.writeFile(
    'scripts/replaced-birds.json',
    JSON.stringify(replacedBirds, null, 2)
  )

  console.log('\n' + '═'.repeat(60))
  console.log('✅ Bulk replacement complete!')
  console.log('═'.repeat(60))
  console.log(`   Replaced: ${replaced}`)
  console.log(`   Skipped:  ${skipped} (no suitable photos)`)
  console.log(`   Failed:   ${failed}`)
  console.log('═'.repeat(60))
  console.log(`\n💾 Saved list of ${replaced} replaced birds to scripts/replaced-birds.json`)
  console.log('\nNext: Run flag-replaced-birds.ts to mark them for review')
}

main().catch(console.error)
