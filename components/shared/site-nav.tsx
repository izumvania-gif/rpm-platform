import Link from 'next/link'

const links = [
  { href: '/products', label: 'Продукты' },
  { href: '/research', label: 'Исследования' },
  { href: '/segments', label: 'Сегменты' },
]

export function SiteNav() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          ECHO
        </Link>
        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
