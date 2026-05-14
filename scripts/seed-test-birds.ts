/**
 * Seed two dedicated test birds for Playwright admin tests.
 *
 * Idempotent: safe to re-run. Inserts/updates Supabase rows, writes manifest
 * entries with needsReview: true, uploads a minimal placeholder JPEG to R2
 * as both the current image and the originals/ backup.
 *
 * Usage:
 *   pnpm tsx scripts/seed-test-birds.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { v5 as uuidv5 } from 'uuid'

config({ path: '.env.local' })

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'

for (const [name, val] of Object.entries({
  SUPABASE_URL, SUPABASE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
})) {
  if (!val) {
    console.error(`Missing env var: ${name}`)
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// 8x6 black baseline JPEG. Minimal valid, decodes everywhere.
const PLACEHOLDER_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AAH//2Q=='

const PLACEHOLDER = Buffer.from(PLACEHOLDER_JPEG_B64, 'base64')

interface TestBird {
  scientific_name: string
  name_da: string
  name_en: string
  category: string
}

const TEST_BIRDS: TestBird[] = [
  { scientific_name: 'Testus testus', name_da: 'Testfugl', name_en: 'Test Bird', category: 'standfugl' },
  { scientific_name: 'Testus alternus', name_da: 'Testfugl 2', name_en: 'Alt Test Bird', category: 'standfugl' },
]

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

async function r2Get(key: string): Promise<Buffer | null> {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    const bytes = await r.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch (err) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null
    throw err
  }
}

async function r2Put(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }))
}

function slugFor(sci: string): string {
  return sci.toLowerCase().replace(/\s+/g, '-')
}

async function upsertSupabaseBird(bird: TestBird): Promise<void> {
  const id = uuidv5(bird.scientific_name, NAMESPACE)
  const { error } = await supabase.from('birds').upsert(
    {
      id,
      name_da: bird.name_da,
      name_en: bird.name_en,
      scientific_name: bird.scientific_name,
      category: bird.category,
      is_common: false,
      is_easy: false,
      is_active: true,
    },
    { onConflict: 'scientific_name' },
  )
  if (error) throw new Error(`Supabase upsert failed for ${bird.scientific_name}: ${error.message}`)
}

async function seedImages(bird: TestBird): Promise<void> {
  const slug = slugFor(bird.scientific_name)
  await r2Put(`${slug}.jpg`, PLACEHOLDER, 'image/jpeg')
  await r2Put(`originals/${slug}.jpg`, PLACEHOLDER, 'image/jpeg')
}

async function updateManifest(): Promise<void> {
  const data = await r2Get('manifest.json')
  const manifest: Record<string, ManifestEntry> = data ? JSON.parse(data.toString()) : {}

  for (const bird of TEST_BIRDS) {
    const slug = slugFor(bird.scientific_name)
    manifest[bird.scientific_name] = {
      file: `${slug}.jpg`,
      source: 'test',
      attribution: 'Test attribution',
      license: 'own',
      needsReview: true,
    }
  }

  const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  await r2Put('manifest.json', buffer, 'application/json')
}

async function main(): Promise<void> {
  for (const bird of TEST_BIRDS) {
    await upsertSupabaseBird(bird)
    await seedImages(bird)
    console.log(`seeded ${bird.scientific_name}`)
  }
  await updateManifest()
  console.log(`seeded ${TEST_BIRDS.length} test birds`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
