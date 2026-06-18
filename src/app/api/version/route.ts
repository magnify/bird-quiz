import { NextResponse } from 'next/server'
import { APP_VERSION, BUILD_ID, BUILT_AT } from '@/lib/version'

export const dynamic = 'force-dynamic'

// Never cached — this is the source of truth for "is the new build live?".
export function GET() {
  return NextResponse.json(
    { version: APP_VERSION, buildId: BUILD_ID, builtAt: BUILT_AT },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Netlify-CDN-Cache-Control': 'no-store',
      },
    },
  )
}
