/**
 * Single source of truth for brand strings and public-facing contact details.
 * Never hardcode these in components or routes — import from here.
 */
export const BRAND = {
  name: 'Fugle Quiz',
  tagline: 'Test din viden om Danmarks fugle',
  domain: 'www.fuglequiz.dk',
  url: 'https://www.fuglequiz.dk',
  contactEmail: 'hallo@magnify.dk',
  mobilePay: '0611SB',
  /** User-Agent for outbound requests to third-party image APIs. */
  userAgent: 'fuglequiz/1.0 (https://www.fuglequiz.dk)',
} as const
