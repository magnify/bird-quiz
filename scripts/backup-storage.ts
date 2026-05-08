#!/usr/bin/env tsx

/**
 * Storage bucket backup
 *
 * Downloads every object in the `bird-images` Supabase Storage bucket
 * (including the `originals/` subfolder and `manifest.json`) into
 * `backups/storage/`. Run from the repo root.
 *
 * Used by .github/workflows/backup.yml — the resulting directory is
 * tarred and uploaded as a GitHub Release asset.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BUCKET = 'bird-images'
const OUT_DIR = join(process.cwd(), 'backups', 'storage')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function listAll(prefix = ''): Promise<string[]> {
  const out: string[] = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data || data.length === 0) break
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      // Folders have a null id in the Supabase API
      if (item.id === null) {
        out.push(...(await listAll(path)))
      } else {
        out.push(path)
      }
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  return out
}

async function downloadOne(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw new Error(`download ${path}: ${error.message}`)
  const dest = join(OUT_DIR, path)
  await mkdir(dirname(dest), { recursive: true })
  const buf = Buffer.from(await data.arrayBuffer())
  await writeFile(dest, buf)
}

async function main() {
  console.log(`Listing ${BUCKET}…`)
  const paths = await listAll()
  console.log(`Found ${paths.length} objects. Downloading to ${OUT_DIR}`)

  let done = 0
  let failed = 0
  // Modest concurrency to avoid hammering the API
  const CONC = 8
  const queue = [...paths]
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (queue.length > 0) {
        const path = queue.shift()!
        try {
          await downloadOne(path)
          done++
          if (done % 25 === 0) console.log(`  ${done}/${paths.length}`)
        } catch (err) {
          failed++
          console.error(`  FAIL ${path}: ${(err as Error).message}`)
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
