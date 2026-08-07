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

// Runs before hydration so the .dark class (and its CSS variables) is already
// correct on first paint — doing this in a React effect instead would flash
// the wrong theme for a frame on every load. `suppressHydrationWarning` on
// <html> is required because this script can set a class attribute the
// server-rendered markup didn't have.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={cn(inter.className, manrope.variable, plexMono.variable)}>
        <SiteNav />
        <KeyboardShortcuts />
        {children}
      </body>
    </html>
  )
}
