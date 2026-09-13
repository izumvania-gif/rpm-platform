'use client'

import { useEffect, type RefObject } from 'react'

// Фокус в модальном окне (фаза 18, plans/2.2-usability-plan.md).
//
// У четырёх диалогов платформы — сокращения, быстрый захват, настройка
// дашборда, подтверждение удаления — было `role="dialog"` и `aria-modal`, но
// из этого ничего не следовало для клавиатуры: фокус оставался на кнопке под
// размытием, Tab уходил за окно, Escape закрывал окно и оставлял фокус на
// `<body>`. `aria-modal` — это обещание, и здесь оно выполняется в одном
// месте, а не четырьмя копиями с разным набором забытых пунктов.
//
// Три правила, все из паттерна «Dialog (Modal)» APG:
//  1. при открытии фокус уходит внутрь — в `initial`, иначе в первый
//     фокусируемый элемент;
//  2. Tab и Shift+Tab ходят по кругу внутри окна;
//  3. при закрытии фокус возвращается туда, где был, если тот элемент ещё в
//     документе (после навигации его уже нет — тогда не трогаем).

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0
  )
}

export function useDialogFocus(
  open: boolean,
  container: RefObject<HTMLElement>,
  initial?: RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!open) return
    const root = container.current
    if (!root) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const target = initial?.current ?? focusable(root)[0] ?? root
    if (target === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
    target.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = focusable(root)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      const outside = !(current instanceof Node) || !root.contains(current)
      if (e.shiftKey ? current === first || outside : current === last || outside) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous && previous.isConnected) previous.focus()
    }
  }, [open, container, initial])
}
