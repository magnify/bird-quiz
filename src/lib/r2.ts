import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

let client: S3Client | null = null

function getR2Client(): S3Client {
  if (client) return client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return client
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME || 'bird-images'
}

export async function r2Get(key: string): Promise<Buffer | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: getBucket(), Key: key })
    const response = await getR2Client().send(cmd)
    const bytes = await response.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null
    throw err
  }
}

export async function r2Put(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const cmd = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await getR2Client().send(cmd)
}

export async function r2Head(key: string): Promise<boolean> {
  try {
    const cmd = new HeadObjectCommand({ Bucket: getBucket(), Key: key })
    await getR2Client().send(cmd)
    return true
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotFound') return false
    throw err
  }
}

export async function r2List(prefix?: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: getBucket(),
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })
    const response = await getR2Client().send(cmd)
    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}
