/**
 * Download bird images locally for reliable serving.
 *
 * Usage:
 *   npx tsx scripts/download-images.ts
 *
 * Downloads all bird images to public/images/birds/{slug}.jpg
 * Uses: cached > iNaturalist (primary, CC-licensed photos)
 * Downloads via curl
 * Outputs: public/images/birds/manifest.json with results + attribution
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ---------- Bird data ----------

interface BirdEntry {
  da: string
  en: string
  sci: string
  cat: string
  common: boolean
}

function loadBirds(): BirdEntry[] {
  const filePath = path.resolve(__dirname, '../src/lib/data/birds-static.ts')
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/const LEGACY_BIRDS:\s*LegacyBird\[\]\s*=\s*(\[[\s\S]*?\n\])/m)
  if (!match) throw new Error('Could not find LEGACY_BIRDS in birds-static.ts')
  // eslint-disable-next-line no-eval
  return eval(match[1])
}

// ---------- Image overrides (curated URLs) ----------

const IMAGE_OVERRIDES: Record<string, string> = {
  'Coccothraustes coccothraustes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Coccothraustes_coccothraustes_-_01.jpg/800px-Coccothraustes_coccothraustes_-_01.jpg',
  'Sturnus vulgaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sturnus_vulgaris_-California-8.jpg/800px-Sturnus_vulgaris_-California-8.jpg',
  'Spinus spinus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Erlenzeisig_Spinus_spinus_male.jpg/800px-Erlenzeisig_Spinus_spinus_male.jpg',
  'Branta leucopsis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Barnacle_goose_%28Branta_leucopsis%29.jpg/800px-Barnacle_goose_%28Branta_leucopsis%29.jpg',
  'Mergellus albellus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Male_of_Mergellus_albellus_%28male_s2%29.jpg/800px-Male_of_Mergellus_albellus_%28male_s2%29.jpg',
  'Botaurus stellaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bittern_-_Botaurus_stellaris.jpg/800px-Bittern_-_Botaurus_stellaris.jpg',
  'Ardea cinerea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Ardea_cinerea_Luc_Viatour.jpg/800px-Ardea_cinerea_Luc_Viatour.jpg',
  'Buteo buteo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg/800px-Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg',
  'Accipiter nisus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg/800px-Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg',
  'Buteo lagopus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Buteo_lagopus_29283.JPG/800px-Buteo_lagopus_29283.JPG',
  'Circus aeruginosus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg/800px-Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg',
  'Milvus milvus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Rotmilan_IMG_7373.jpg/800px-Rotmilan_IMG_7373.jpg',
  'Milvus migrans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Milvus_migrans_qtl1.jpg/800px-Milvus_migrans_qtl1.jpg',
  'Pernis apivorus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg/800px-Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg',
  'Aquila chrysaetos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Aquila_chrysaetos_qtl1.jpg/800px-Aquila_chrysaetos_qtl1.jpg',
  'Strix aluco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Tawny_wiki_edit1.jpg/800px-Tawny_wiki_edit1.jpg',
  'Asio otus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Long-eared_owl_%28Asio_otus%29.jpg/800px-Long-eared_owl_%28Asio_otus%29.jpg',
  'Asio flammeus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Asio-flammeus-001.jpg/800px-Asio-flammeus-001.jpg',
  'Fratercula arctica': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/800px-Puffin_%28Fratercula_arctica%29.jpg',
  'Gulosus aristotelis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Phalacrocorax_aristotelis_desmarestii.jpg/800px-Phalacrocorax_aristotelis_desmarestii.jpg',
  'Scolopax rusticola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg/800px-Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg',
  'Dendrocopos major': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg/800px-2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg',
  'Picus viridis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/European_green_woodpecker_%28Picus_viridis%29_male.JPG/800px-European_green_woodpecker_%28Picus_viridis%29_male.JPG',
  'Dryocopus martius': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Black_woodpecker_%28Dryocopus_martius%29.jpg/800px-Black_woodpecker_%28Dryocopus_martius%29.jpg',
  'Certhia familiaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg/800px-%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg',
  'Certhia brachydactyla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg/800px-Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg',
  'Turdus pilaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Fieldfare_aka_Turdus_pilaris.jpg/800px-Fieldfare_aka_Turdus_pilaris.jpg',
  'Apus apus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg/800px-Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg',
  'Anthus trivialis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tree_pipit_%28Anthus_trivialis%29.jpg/800px-Tree_pipit_%28Anthus_trivialis%29.jpg',
  'Ficedula hypoleuca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg/800px-European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg',
  'Acrocephalus scirpaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg/800px-Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg',
  'Acrocephalus arundinaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg/800px-Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg',
  'Luscinia luscinia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg/800px-Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg',
  'Phoenicurus phoenicurus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg/800px-Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg',
  'Ciconia ciconia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/White_Stork.jpg/800px-White_Stork.jpg',
  'Jynx torquilla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Wryneck_by_Pepe_Reigada.jpg/800px-Wryneck_by_Pepe_Reigada.jpg',
  'Perdix perdix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg/800px-Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg',
  'Coturnix coturnix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg/800px-Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg',
  'Pastor roseus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Rosy_starling_%28Pastor_roseus%29.jpg/800px-Rosy_starling_%28Pastor_roseus%29.jpg',
}

// ---------- Helpers ----------

const USER_AGENT = 'DanskFugleviden/1.0 (https://github.com/example; contact@example.com)'

function slugify(sci: string): string {
  return sci.toLowerCase().replace(/\s+/g, '-')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function curlDownload(url: string, destPath: string, retries = 3): boolean {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check for rate limiting first
      const statusCheck = execSync(
        `curl -sS -o /dev/null -w "%{http_code}" -A "${USER_AGENT}" --max-time 10 "${url}"`,
        { stdio: 'pipe' }
      ).toString().trim()

      if (statusCheck === '429') {
        console.log(`    Rate limited, waiting 60s... (attempt ${attempt + 1}/${retries})`)
        execSync('sleep 60')
        continue
      }

      execSync(
        `curl -sS -f -L -o "${destPath}" -A "${USER_AGENT}" --max-time 30 "${url}"`,
        { stdio: 'pipe' }
      )
      const stat = fs.statSync(destPath)
      if (stat.size < 1000) {
        fs.unlinkSync(destPath)
        return false
      }
      return true
    } catch {
      try { fs.unlinkSync(destPath) } catch {}
      if (attempt < retries - 1) {
        execSync('sleep 5')
      }
    }
  }
  return false
}

// ---------- URL resolution ----------

interface ImageResult {
  url: string
  source: 'override' | 'inaturalist' | 'wikipedia'
  attribution?: string
  license?: string
}

// iNaturalist taxonomy differs for some species
const INAT_NAME_MAP: Record<string, string> = {
  'Accipiter gentilis': 'Astur gentilis',
  'Charadrius dubius': 'Thinornis dubius',
}

async function fetchFromINaturalist(query: string, matchName: string): Promise<ImageResult | null> {
  try {
    const resp = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=10&rank=species`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (resp.ok) {
      const data = await resp.json()
      const taxon = data.results?.find((t: any) => t.name === matchName)
      if (taxon?.default_photo?.medium_url) {
        const photoUrl = taxon.default_photo.medium_url.replace('/medium.', '/large.')
        return {
          url: photoUrl,
          source: 'inaturalist',
          attribution: taxon.default_photo.attribution || '',
          license: taxon.default_photo.license_code || 'cc-by',
        }
      }
    }
  } catch {
    // fall through
  }
  return null
}

async function fetchImageUrl(scientificName: string, englishName: string): Promise<ImageResult | null> {
  // Try scientific name first
  const inatName = INAT_NAME_MAP[scientificName] || scientificName
  const result = await fetchFromINaturalist(inatName, inatName)
  if (result) return result

  // Fallback: search by English common name
  if (englishName) {
    const fallback = await fetchFromINaturalist(englishName, inatName)
    if (fallback) return fallback
  }

  return null
}

// ---------- Main ----------

async function main() {
  const birds = loadBirds()
  const outDir = path.resolve(__dirname, '../public/images/birds')
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`Downloading images for ${birds.length} birds...`)
  console.log(`Output: ${outDir}`)
  console.log(`Sources: iNaturalist (primary), Wikipedia (fallback)`)
  console.log(`Sequential with 1s delay between requests\n`)

  const manifest: Record<string, { file: string; source: string; attribution?: string; license?: string } | null> = {}
  let success = 0
  let failed = 0
  const failedBirds: string[] = []

  for (let i = 0; i < birds.length; i++) {
    const bird = birds[i]
    const slug = slugify(bird.sci)
    const destPath = path.join(outDir, `${slug}.jpg`)

    // Skip if already downloaded
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      manifest[bird.sci] = { file: `${slug}.jpg`, source: 'cached' }
      success++
      process.stdout.write(`\r  [${i + 1}/${birds.length}] ${bird.sci} — cached            `)
      continue
    }

    // Rate limit: wait between API calls
    await sleep(1000)

    const result = await fetchImageUrl(bird.sci, bird.en)
    if (!result) {
      manifest[bird.sci] = null
      failed++
      failedBirds.push(bird.sci)
      process.stdout.write(`\r  [${i + 1}/${birds.length}] ${bird.sci} — no URL found     `)
      continue
    }

    // Small delay before download
    await sleep(500)

    const ok = curlDownload(result.url, destPath)
    if (ok) {
      manifest[bird.sci] = {
        file: `${slug}.jpg`,
        source: result.source,
        attribution: result.attribution,
        license: result.license,
      }
      success++
      process.stdout.write(`\r  [${i + 1}/${birds.length}] ${bird.sci} — ${result.source}     `)
    } else {
      manifest[bird.sci] = null
      failed++
      failedBirds.push(bird.sci)
      process.stdout.write(`\r  [${i + 1}/${birds.length}] ${bird.sci} — download failed     `)
    }
  }

  // Write manifest
  const manifestPath = path.join(outDir, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`\nDone!`)
  console.log(`  Success: ${success}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Manifest: ${manifestPath}`)

  if (failedBirds.length > 0) {
    console.log(`\nFailed birds:`)
    failedBirds.forEach(sci => console.log(`  - ${sci}`))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
