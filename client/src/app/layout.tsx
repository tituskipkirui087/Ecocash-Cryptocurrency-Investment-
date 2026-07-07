import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ecocash-investment.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Ecocash Investment Platform',
    template: '%s | Ecocash Investment Platform',
  },
  description: 'Modern Trading Investment Management Platform - Automated Mining Machine',
  icons: {
    icon: '/images/ecocash-favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Ecocash Investment Platform',
    title: 'Ecocash Investment Platform',
    description: 'Modern Trading Investment Management Platform - Automated Mining Machine',
    images: [
      {
        url: '/uploads/Attachment%20logo.jpeg',
        width: 1344,
        height: 768,
        alt: 'Ecocash Investment Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ecocash Investment Platform',
    description: 'Modern Trading Investment Management Platform - Automated Mining Machine',
    images: ['/uploads/Attachment%20logo.jpeg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
