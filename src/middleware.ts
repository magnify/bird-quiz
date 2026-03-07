import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Admin route protection — will be implemented in Phase 3/4
  // For now, just pass through
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // TODO: Check auth + admin role via Supabase session
    // For now, allow access for development
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
