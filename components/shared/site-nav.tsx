import Link from 'next/link'

const links = [
  { href: '/products', label: 'Продукты' },
  { href: '/research', label: 'Исследования' },
  { href: '/segments', label: 'Сегменты' },
  { href: '/jtbd', label: 'JTBD' },
  { href: '/hypotheses', label: 'Гипотезы' },
  { href: '/conversations', label: 'Разговоры' },
]

export function SiteNav() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 text-lg font-semibold">
          ECHO
        </Link>
        <nav className="flex min-w-0 gap-4 overflow-x-auto sm:gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
