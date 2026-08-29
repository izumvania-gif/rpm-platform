import { redirect } from 'next/navigation'
import { PM_DEFAULT_TAB, pmTabHref } from '@/lib/pm-nav'

export const dynamic = 'force-dynamic'

// `/pm` больше не страница, а вход в «Доставку» (фаза 9 редизайна 2.1).
//
// Редирект, а не дубль роадмапа: иначе один и тот же экран жил бы по двум
// адресам, и «какая вкладка активна» на `/pm` было бы не ответить — полоса
// вкладок подсвечивает вкладку по пути.
//
// Продукт из query переносится: он не в cookie активного продукта (см.
// lib/pm-nav.ts), и потерять его здесь значило бы молча сменить продукт при
// переходе по ссылке вида `/pm?productId=…`, которых в приложении много.
export default function PmIndexPage({ searchParams }: { searchParams: { productId?: string } }) {
  redirect(pmTabHref(PM_DEFAULT_TAB, searchParams.productId))
}
