#!/usr/bin/env tsx

/**
 * R2 storage backup
 *
 * Mirrors the Cloudflare R2 `bird-images` bucket (all images, the `originals/`
 * subfolder, and `manifest.json`) into `backups/storage/`. Run from repo root.
 *
 * R2 egress is free, so this costs no bandwidth fees. The images live in R2 —
 * NOT Supabase Storage (which is empty post-migration), so this is the only
 * complete copy of the cropped/replaced images + their attribution manifest.
 *
 * Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *               R2_BUCKET_NAME (defaults to `bird-images`)
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { r2List, r2Get } from '../src/lib/r2'

const OUT_DIR = join(process.cwd(), 'backups', 'storage')
const CONC = 8

async function main() {
  console.log('Listing R2 bucket…')
  const keys = await r2List()
  console.log(`Found ${keys.length} objects. Downloading to ${OUT_DIR}`)

  let done = 0
  let failed = 0
  const queue = [...keys]
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (queue.length > 0) {
        const key = queue.shift()!
        try {
          const buf = await r2Get(key)
          if (!buf) {
            console.error(`  MISSING ${key}`)
            failed++
            continue
          }
          const dest = join(OUT_DIR, key)
          await mkdir(dirname(dest), { recursive: true })
          await writeFile(dest, buf)
          done++
          if (done % 25 === 0) console.log(`  ${done}/${keys.length}`)
        } catch (err) {
          failed++
          console.error(`  FAIL ${key}: ${(err as Error).message}`)
        }
      }
    }),
  )

  console.log(`Done. ${done} downloaded, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
