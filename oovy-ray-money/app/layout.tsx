import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: "Oovy & Ray's Money",
  description: 'Personal finance forecasting',
  appleWebApp: {
    capable: true,
    title: "Oovy & Ray's Money",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={figtree.className}>{children}</body>
    </html>
  )
}
