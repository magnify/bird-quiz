#!/usr/bin/env tsx

/**
 * Test Image API Proxy in Production
 *
 * Verifies that bird images are being served via the API proxy route
 * and that the proxy is working correctly with Supabase Storage.
 */

const PRODUCTION_URL = 'https://bird-quiz.magnify.dk'
const TEST_BIRDS = [
  'turdus-merula',
  'passer-domesticus',
  'parus-major',
  'cyanistes-caeruleus',
  'erithacus-rubecula',
]

interface TestResult {
  slug: string
  status: number
  source: string | null
  cacheControl: string | null
  contentType: string | null
  error?: string
}

async function testImage(slug: string): Promise<TestResult> {
  const url = `${PRODUCTION_URL}/api/images/${slug}`

  try {
    const response = await fetch(url, { method: 'HEAD' })

    return {
      slug,
      status: response.status,
      source: response.headers.get('x-source'),
      cacheControl: response.headers.get('cache-control'),
      contentType: response.headers.get('content-type'),
    }
  } catch (error) {
    return {
      slug,
      status: 0,
      source: null,
      cacheControl: null,
      contentType: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('Testing Image API Proxy in production...\n')
  console.log(`Base URL: ${PRODUCTION_URL}`)
  console.log(`Testing ${TEST_BIRDS.length} birds\n`)

  const results = await Promise.all(TEST_BIRDS.map(testImage))

  // Print results table
  console.log('┌─────────────────────────┬────────┬────────────────┬─────────────┐')
  console.log('│ Slug                    │ Status │ Source         │ Content-Type│')
  console.log('├─────────────────────────┼────────┼────────────────┼─────────────┤')

  for (const result of results) {
    const slug = result.slug.padEnd(23).slice(0, 23)
    const status = String(result.status).padEnd(6)
    const source = (result.source || '-').padEnd(14).slice(0, 14)
    const contentType = (result.contentType || '-').padEnd(11).slice(0, 11)

    const statusColor = result.status === 200 ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'

    console.log(`│ ${slug} │ ${statusColor}${status}${reset} │ ${source} │ ${contentType} │`)
  }

  console.log('└─────────────────────────┴────────┴────────────────┴─────────────┘\n')

  // Summary
  const successful = results.filter(r => r.status === 200).length
  const fromSupabase = results.filter(r => r.source === 'supabase').length
  const fromStatic = results.filter(r => r.source === 'static-fallback').length

  console.log('SUMMARY:')
  console.log(`  Total:          ${results.length}`)
  console.log(`  Successful:     ${successful}`)
  console.log(`  From Supabase:  ${fromSupabase}`)
  console.log(`  From Static:    ${fromStatic}`)

  // Verify cache headers
  const withCache = results.filter(
    r => r.cacheControl?.includes('max-age=31536000')
  ).length

  console.log(`  With 1yr cache: ${withCache}`)

  if (successful === results.length && fromSupabase === results.length && withCache === results.length) {
    console.log('\n✓ All tests passed!')
  } else {
    console.log('\n⚠ Some tests failed!')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error running tests:', err)
  process.exit(1)
})
