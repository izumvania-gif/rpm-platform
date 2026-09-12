'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Блок с горизонтальным скроллом, который сам сообщает, что справа есть ещё
// (фаза 17, plans/2.2-usability-plan.md).
//
// Обход маршрутов на 768px показал матрицу «Сегменты × JTBD» с обрезанными
// колонками и без единого признака, что их можно докрутить: ни полосы, ни
// градиента. Это тот же дефект, что был у второго ряда шапки в фазе 13 —
// скролл, который себя не объявляет, для человека не существует. Краулер его
// пропустил по построению: блоки с собственным скроллом он исключает, потому
// что «скроллится внутри» и есть задуманное поведение. Задуманное — да,
// видимое — нет.
//
// Обёртка одна на все три места (матрица, матрицы связей, Гант), чтобы сигнал
// выглядел одинаково. Градиент у края показывается ровно пока за ним есть
// содержимое, и гаснет, когда доскроллили; так он говорит правду, а не
// украшает. Область получает фокус: без этого её нельзя прокрутить с
// клавиатуры вовсе.
export function ScrollHint({
  children,
  label,
  className,
}: {
  children: ReactNode
  /** Имя области для скринридера, например «Матрица сегментов и задач». */
  label: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const left = el.scrollLeft > 1
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Содержимое может дорисоваться позже самого контейнера (таблица, диаграмма).
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  return (
    <div className={cn('relative rounded-md border', className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-md bg-gradient-to-r from-background to-transparent transition-opacity',
          edges.left ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-md bg-gradient-to-l from-background to-transparent transition-opacity',
          edges.right ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
