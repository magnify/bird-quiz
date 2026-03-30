/**
 * Upload all bird images to Supabase Storage.
 *
 * Creates a public bucket `bird-images` and uploads:
 * - All 221 images from public/images/birds/*.jpg
 * - Any backups from public/images/birds/originals/*.jpg
 * - manifest.json
 *
 * Run once: npx tsx scripts/upload-images-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import 'dotenv/config'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = 'bird-images'
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'birds')

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Create public bucket (idempotent — ignores if exists)
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'application/json'],
  })

  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Failed to create bucket:', bucketError.message)
    process.exit(1)
  }
  console.log(`Bucket "${BUCKET}" ready.`)

  // Upload main images
  const files = (await readdir(IMAGES_DIR)).filter(f => f.endsWith('.jpg'))
  console.log(`Found ${files.length} images to upload...`)

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file)
    const buffer = await readFile(filePath)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file, buffer, {
        upsert: true,
        contentType: 'image/jpeg',
      })

    if (error) {
      console.error(`  ERROR ${file}: ${error.message}`)
      errors++
    } else {
      uploaded++
      if (uploaded % 25 === 0) {
        console.log(`  ${uploaded}/${files.length} uploaded...`)
      }
    }
  }

  console.log(`Main images: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`)

  // Upload originals (backups)
  const originalsDir = path.join(IMAGES_DIR, 'originals')
  try {
    const originals = (await readdir(originalsDir)).filter(f => f.endsWith('.jpg'))
    console.log(`Found ${originals.length} backup originals...`)

    let origUploaded = 0
    for (const file of originals) {
      const filePath = path.join(originalsDir, file)
      const buffer = await readFile(filePath)

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`originals/${file}`, buffer, {
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (error) {
        console.error(`  ERROR originals/${file}: ${error.message}`)
      } else {
        origUploaded++
      }
    }
    console.log(`Originals: ${origUploaded} uploaded`)
  } catch {
    console.log('No originals directory found — skipping backups.')
  }

  // Upload manifest.json
  const manifestPath = path.join(IMAGES_DIR, 'manifest.json')
  try {
    const manifest = await readFile(manifestPath)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload('manifest.json', manifest, {
        upsert: true,
        contentType: 'application/json',
      })

    if (error) {
      console.error(`Failed to upload manifest.json: ${error.message}`)
    } else {
      console.log('manifest.json uploaded.')
    }
  } catch {
    console.log('No manifest.json found — skipping.')
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
