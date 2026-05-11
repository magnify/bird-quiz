import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'

export async function r2Get(key: string): Promise<Buffer | null> {
  try {
    const client = getR2Client()
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const response = await client.send(command)
    const bytes = await response.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null
    throw err
  }
}

export async function r2Put(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await client.send(command)
}

export async function r2Head(key: string): Promise<boolean> {
  try {
    const client = getR2Client()
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    await client.send(command)
    return true
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotFound') return false
    throw err
  }
}
