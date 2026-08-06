import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SiteNav } from '@/components/shared/site-nav'
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'ECHO Platform - Research & Product Management',
  description: 'Платформа для управления продуктовыми исследованиями и сегментами клиентов',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <SiteNav />
        <KeyboardShortcuts />
        {children}
      </body>
    </html>
  )
}
