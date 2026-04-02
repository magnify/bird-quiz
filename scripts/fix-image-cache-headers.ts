/**
 * Fix cache headers for all images in Supabase Storage
 *
 * Run: npx tsx scripts/fix-image-cache-headers.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixCacheHeaders() {
  console.log('Fetching all images from bird-images bucket...')

  // List all files in the bucket
  const { data: files, error: listError } = await supabase.storage
    .from('bird-images')
    .list()

  if (listError) {
    console.error('Error listing files:', listError)
    process.exit(1)
  }

  console.log(`Found ${files.length} files`)

  let updated = 0
  let failed = 0

  for (const file of files) {
    if (!file.name.endsWith('.jpg') && !file.name.endsWith('.json')) continue

    try {
      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bird-images')
        .download(file.name)

      if (downloadError) {
        console.error(`Failed to download ${file.name}:`, downloadError)
        failed++
        continue
      }

      // Re-upload with proper cache headers
      const { error: uploadError } = await supabase.storage
        .from('bird-images')
        .upload(file.name, fileData, {
          cacheControl: '31536000', // 1 year in seconds
          upsert: true, // Overwrite existing file
          contentType: file.name.endsWith('.json') ? 'application/json' : 'image/jpeg',
        })

      if (uploadError) {
        console.error(`Failed to upload ${file.name}:`, uploadError)
        failed++
        continue
      }

      updated++
      if (updated % 10 === 0) {
        console.log(`Progress: ${updated}/${files.length}`)
      }
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err)
      failed++
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total: ${files.length}`)
}

fixCacheHeaders().catch(console.error)
