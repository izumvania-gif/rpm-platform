import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
}

export function slugify(input: string): string {
  return transliterate(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000 // 3 месяца

export function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > STALE_AFTER_MS
}

// Russian noun pluralization after a count — 1/21/31.. -> singular,
// 2-4/22-24.. -> "few" form, everything else (0, 5-20, 25-30..) -> "many"
// form. `forms` is [singular, few, many], e.g. ['продукт', 'продукта', 'продуктов'].
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${forms[2]}`
  if (mod10 === 1) return `${count} ${forms[0]}`
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${forms[1]}`
  return `${count} ${forms[2]}`
}
