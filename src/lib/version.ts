/**
 * Build/version info, injected at build time by next.config.ts.
 * Surfaced in the UI and at /api/version so a deploy is verifiable.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
export const BUILT_AT = process.env.NEXT_PUBLIC_BUILD_TIME ?? ''

/** Short label for the UI, e.g. "v0.7.0 · a1b2c3d". */
export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_ID}`
