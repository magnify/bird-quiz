import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

// Locale routing for the public site. Danish stays unprefixed (as-needed);
// English is served under /en. Admin, API, the OG image and static files are
// excluded so they're untouched. (Admin auth is enforced in app/admin/layout.tsx,
// not here, so dropping the old no-op admin passthrough loses nothing.)
export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|admin|opengraph-image|.*\\..*).*)'],
}
