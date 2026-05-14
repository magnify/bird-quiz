import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'bird-images'

async function listAll(path?: string) {
  const all: { name: string }[] = []
  let offset = 0
  const PAGE_SIZE = 500
  while (true) {
    const { data: page, error } = await supabase.storage.from(BUCKET).list(path, { limit: PAGE_SIZE, offset })
    if (error) throw new Error(`Failed to list: ${error.message}`)
    if (!page || page.length === 0) break
    all.push(...page)
    offset += page.length
    if (page.length < PAGE_SIZE) break
  }
  return all
}

async function main() {
  console.log('Listing all files in Supabase Storage bucket:', BUCKET)

  const rootFiles = await listAll()
  console.log(`Root files: ${rootFiles.length}`)

  const originals = await listAll('originals')
  console.log(`Originals: ${originals.length}`)

  const allPaths = [
    ...rootFiles.map(f => f.name),
    ...originals.map(f => `originals/${f.name}`),
  ]

  console.log(`Total files to delete: ${allPaths.length}`)
  console.log('Files:', allPaths.slice(0, 5).join(', '), allPaths.length > 5 ? '...' : '')

  console.log('\nDeleting...')
  const { error } = await supabase.storage.from(BUCKET).remove(allPaths)
  if (error) {
    console.error('Delete failed:', error.message)
    process.exit(1)
  }

  console.log('Done! Supabase Storage bucket is now empty.')
}

main().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
