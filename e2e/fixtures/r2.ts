import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID!
const accessKeyId = process.env.R2_ACCESS_KEY_ID!
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
const bucket = process.env.R2_BUCKET_NAME || 'bird-images'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

export async function readR2(key: string): Promise<Buffer | null> {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const bytes = await r.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch (err) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null
    throw err
  }
}

export async function writeR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
}

export interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  source_url?: string
  needsReview?: boolean
  flagged?: boolean
  flag_reason?: string
}

export async function readManifest(): Promise<Record<string, ManifestEntry>> {
  const data = await readR2('manifest.json')
  if (!data) return {}
  return JSON.parse(data.toString())
}

export async function writeManifest(manifest: Record<string, ManifestEntry>): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  await writeR2('manifest.json', buffer, 'application/json')
}

export const TEST_BIRD = 'Testus testus'
export const TEST_BIRD_SLUG = 'testus-testus'
export const BASELINE_MANIFEST_ENTRY: ManifestEntry = {
  file: 'testus-testus.jpg',
  source: 'test',
  attribution: 'Test attribution',
  license: 'own',
  needsReview: true,
}

export async function resetTestBird(): Promise<void> {
  const original = await readR2(`originals/${TEST_BIRD_SLUG}.jpg`)
  if (original) {
    await writeR2(`${TEST_BIRD_SLUG}.jpg`, original, 'image/jpeg')
  }
  const manifest = await readManifest()
  manifest[TEST_BIRD] = { ...BASELINE_MANIFEST_ENTRY }
  await writeManifest(manifest)
}
