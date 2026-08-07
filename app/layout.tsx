import type { Metadata } from 'next'
import { Inter, Manrope, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { SiteNav } from '@/components/shared/site-nav'
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'RPM Platform - Research & Product Management',
  description: 'Платформа для управления продуктовыми исследованиями и сегментами клиентов',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={cn(inter.className, manrope.variable, plexMono.variable)}>
        <SiteNav />
        <KeyboardShortcuts />
        {children}
      </body>
    </html>
  )
}
