import type { Metadata } from 'next'
import { Manrope, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { SiteNav } from '@/components/shared/site-nav'
import { KeyboardShortcuts } from '@/components/shared/keyboard-shortcuts'
import { QuickCapture } from '@/components/shared/quick-capture'
import { getNavStage } from '@/lib/nav-stage'
import { getCurrentUserId } from '@/lib/current-user'

// Фирменный шрифт Рутокен — Gilroy, и он стоит первым в стеке
// (`tailwind.config.ts`, `fontFamily.sans`/`display`). Файла шрифта мы не
// отдаём: Gilroy лицензионный, а desktop-лицензия — та, по которой нарисован
// брендбук, — покрывает установку на машины и макеты, но не раздачу `.woff2`
// с сайта. Поэтому у сотрудника, у которого Gilroy стоит локально, браузер
// возьмёт его; всем остальным достаётся Manrope, ближайший геометрический
// гротеск. Появится веб-лицензия — добавить `@font-face` поверх стека, ничего
// больше менять не придётся. См. plans/2.1-redesign-plan.md, раздел про шрифт.
//
// Без `weight` next/font берёт вариативное начертание: один файл на все веса
// вместо пяти. Это существенно теперь, когда Manrope стал ещё и текстовым —
// раньше он грузился только в 600/700/800, потому что был заголовочным.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Progressive disclosure of the nav (plans/2.0-product-leap-plan.md, C1).
  // Derived per render rather than cached: it is a handful of parallel indexed
  // existence checks, and the answer must be current the moment a user creates
  // their first record outside the base chain — a stale "basic" would hide a
  // section they just filled.
  const autoStage = await getNavStage(getCurrentUserId())

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={cn('font-sans', manrope.variable, plexMono.variable)}>
        {/* Skip-link (plans/2.0-hardening-plan.md, B3). Measured on /pm: 12
            consecutive stops through the navigation before the focus reaches
            any content, on every page. `sr-only focus:not-sr-only` keeps it
            invisible until it is focused — it must stay in the DOM and in the
            tab order, so display:none is not an option. */}
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Перейти к содержимому
        </a>
        <SiteNav autoStage={autoStage} />
        <KeyboardShortcuts />
        <QuickCapture />
        {/* One wrapper here rather than an id on all 73 page-level <main>
            elements: the target only has to exist once, and this cannot drift
            out of sync when a new page is added. tabIndex={-1} is required —
            without it several browsers scroll to the anchor but leave focus
            behind in the nav, so the next Tab continues from the header. */}
        <div id="main" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  )
}
