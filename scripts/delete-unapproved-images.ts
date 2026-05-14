import { config } from 'dotenv'
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
})

// The 69 scientific names with needsReview
const slugs = `
acrocephalus-arundinaceus acrocephalus-palustris acrocephalus-schoenobaenus
acrocephalus-scirpaceus alauda-arvensis anarhynchus-alexandrinus anthus-petrosus
anthus-pratensis anthus-trivialis apus-apus aquila-chrysaetos ardea-alba
bombycilla-garrulus caprimulgus-europaeus ciconia-ciconia ciconia-nigra
cinclus-cinclus circus-macrourus coracias-garrulus coturnix-coturnix
curruca-curruca delichon-urbicum egretta-garzetta emberiza-calandra
emberiza-citrinella emberiza-schoeniclus falco-vespertinus ficedula-hypoleuca
ficedula-parva fringilla-montifringilla galerida-cristata grus-grus
hippolais-icterina hirundo-rustica jynx-torquilla lanius-collurio
lanius-excubitor loxia-curvirostra loxia-leucoptera loxia-pytyopsittacus
lullula-arborea luscinia-luscinia merops-apiaster motacilla-alba
motacilla-cinerea motacilla-flava muscicapa-striata nucifraga-caryocatactes
oenanthe-oenanthe oriolus-oriolus panurus-biarmicus pastor-roseus
perdix-perdix phasianus-colchicus phoenicurus-ochruros
phoenicurus-phoenicurus phylloscopus-collybita phylloscopus-sibilatrix
phylloscopus-trochilus platalea-leucorodia plectrophenax-nivalis
prunella-collaris regulus-ignicapilla remiz-pendulinus riparia-riparia
saxicola-rubicola sylvia-atricapilla sylvia-borin xema-sabini
`.trim().split(/\s+/)

async function main() {
  console.log(`Deleting ${slugs.length} unapproved images from R2...`)

  for (const slug of slugs) {
    const keys = [`${slug}.jpg`, `originals/${slug}.jpg`]
    for (const key of keys) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
        console.log(`  Deleted: ${key}`)
      } catch (err) {
        console.error(`  FAILED: ${key}`, err instanceof Error ? err.message : err)
      }
    }
  }

  // Also clean Supabase Storage in case anything remains
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('\nCleaning Supabase Storage...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const paths = slugs.flatMap(s => [`${s}.jpg`, `originals/${s}.jpg`])
    const { error } = await supabase.storage.from('bird-images').remove(paths)
    if (error) {
      console.log(`  Supabase cleanup: ${error.message} (likely already empty)`)
    } else {
      console.log('  Supabase cleaned')
    }
  }

  console.log('\nDone!')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
