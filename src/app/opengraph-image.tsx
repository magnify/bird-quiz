import { ImageResponse } from 'next/og'
import { BRAND } from '@/lib/brand'

// Social share preview (Facebook, LinkedIn, X, …). Generated at build time.
// Note: ImageResponse only supports inline styles (no CSS vars / Tailwind), so
// the brand colours are mirrored here from quiz.css.
export const alt = `${BRAND.name} — ${BRAND.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 32%, #1c3326 0%, #0f1a14 68%)',
          color: '#e8f0eb',
          fontFamily: 'sans-serif',
          padding: 96,
        }}
      >
        <div style={{ display: 'flex', fontSize: 132, fontWeight: 800, letterSpacing: -3 }}>
          {BRAND.name}
        </div>
        <div style={{ display: 'flex', marginTop: 16, width: 140, height: 8, background: '#4ade80', borderRadius: 4 }} />
        <div style={{ display: 'flex', marginTop: 40, fontSize: 46, color: '#9ab3a4' }}>
          {BRAND.tagline}
        </div>
        <div style={{ display: 'flex', position: 'absolute', bottom: 56, fontSize: 30, color: '#6b8b7b' }}>
          {BRAND.domain}
        </div>
      </div>
    ),
    { ...size },
  )
}
