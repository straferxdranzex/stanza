import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Stanza — 2D Art & Classical Music Lessons Online',
  description: 'Connect with world-class teachers for Piano, Violin, Cello, Animation & 2D Art. Book lessons, pay securely, and learn via Zoom.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Stanza',
    description: '2D Art & Classical Music Lessons Online.',
    type: 'website',
    images: [{ url: '/logo.png', width: 1254, height: 1254, alt: 'Stanza' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#050508] text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
