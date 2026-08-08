'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { gotoShortcuts } from '@/lib/keyboard-shortcuts-data'
import { isTypingTarget } from '@/components/shared/keyboard-shortcuts'

// Фаза 3 (plans/archive/visual-redesign-plan.md §4) — the "g then <letter>"/"n"
// shortcut layer (KeyboardShortcuts) already worked, but nothing in the UI
// hinted it existed. This surfaces it: a small "G" chip next to search opens
// a cheat-sheet overlay, also reachable with "?" from anywhere non-typing —
// same discoverability convention as Linear/Notion/Superhuman.
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Клавиатурные сокращения (?)"
        className="hidden h-9 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:flex"
      >
        <Kbd>G</Kbd>
        сокращения
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-24 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Клавиатурные сокращения"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg motion-safe:animate-card-settle"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Клавиатурные сокращения</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {gotoShortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="flex items-center gap-1">
                    <Kbd>G</Kbd>
                    <Kbd>{s.key.toUpperCase()}</Kbd>
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Новая запись в разделе</span>
                <Kbd>N</Kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
