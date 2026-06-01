'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

// Admin runs in light mode, so we pin the theme rather than pulling in next-themes.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      richColors
      closeButton
      {...props}
    />
  )
}
