import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Fredoka } from "next/font/google";
import { cn } from "@/lib/utils";

const fredoka = Fredoka({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Fugle Quiz',
  description: 'Test din viden om Danmarks fugle',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fugle Quiz',
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
