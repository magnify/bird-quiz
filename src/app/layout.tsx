import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";
import { BRAND } from '@/lib/brand'

const fredoka = Fredoka({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: BRAND.name,
  description: BRAND.tagline,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND.name,
  },
  openGraph: {
    type: 'website',
    locale: 'da_DK',
    url: BRAND.url,
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.tagline,
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.name,
    description: BRAND.tagline,
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1a14',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da" className={cn("font-sans", fredoka.variable)}>
      <head />
      <body>{children}</body>
    </html>
  )
}
