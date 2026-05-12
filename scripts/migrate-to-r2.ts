/**
 * Migration script: Copy bird-images from Supabase Storage to Cloudflare R2.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-r2.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'

const required = { SUPABASE_URL, SUPABASE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY }
for (const [name, val] of Object.entries(required)) {
  if (!val) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
})

async function migrateFile(key: string): Promise<void> {
  process.stdout.write(`Downloading ${key} from Supabase... `)
  const { data, error } = await supabase.storage.from('bird-images').download(key)
  if (error || !data) {
    console.error(`FAILED: ${error?.message}`)
    return
  }

  const buffer = Buffer.from(await data.arrayBuffer())

  console.log(`uploading ${buffer.length} bytes to R2...`)
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: key.endsWith('.json') ? 'application/json' : 'image/jpeg',
  }))

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12)
  console.log(`Done: ${key} (sha256:${hash})`)
}

async function main() {
  console.log('Starting migration from Supabase Storage to Cloudflare R2...')
  console.log(`Target R2 bucket: ${R2_BUCKET}`)

  // Paginate to get all files (Supabase default limit is 100)
  const allFiles: { name: string }[] = []
  let offset = 0
  const PAGE_SIZE = 500
  while (true) {
    const { data: page, error } = await supabase.storage.from('bird-images').list(undefined, { limit: PAGE_SIZE, offset })
    if (error) throw new Error(`Failed to list files: ${error.message}`)
    if (!page || page.length === 0) break
    allFiles.push(...page)
    offset += page.length
    if (page.length < PAGE_SIZE) break
  }
  console.log(`Found ${allFiles.length} files in Supabase Storage (root)`)

  const originals: { name: string }[] = []
  offset = 0
  while (true) {
    const { data: page, error } = await supabase.storage.from('bird-images').list('originals', { limit: PAGE_SIZE, offset })
    if (error) throw new Error(`Failed to list originals: ${error.message}`)
    if (!page || page.length === 0) break
    originals.push(...page)
    offset += page.length
    if (page.length < PAGE_SIZE) break
  }
  console.log(`Found ${originals.length} files in originals/`)

  const manifestFile = allFiles.find(f => f.name === 'manifest.json')
  if (manifestFile) {
    await migrateFile('manifest.json')
  }

  // Migrate originals
  if (originals) {
    for (const file of originals) {
      await migrateFile(`originals/${file.name}`)
    }
  }

  // Migrate regular bird images
  for (const file of allFiles) {
    if (file.name === 'manifest.json') continue
    await migrateFile(file.name)
  }

  console.log('\nMigration complete!')
  console.log('\nNext steps:')
  console.log('  1. Verify images load via /api/images/{slug} on the live site')
  console.log('  2. Check admin image tools work (replace, crop, restore)')
  console.log('  3. Optionally clean up Supabase Storage bucket')
}

main().catch((err) => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
