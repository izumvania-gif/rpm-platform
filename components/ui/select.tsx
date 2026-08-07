'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

// Radix's Select.Item forbids an empty-string value (reserved internally to
// mean "no selection") — but half the call sites in this codebase rely on
// `<option value="">Не указан</option>` for optional relation fields. Map
// '' to this sentinel on the way into Radix and back on the way out, so
// every existing call site keeps working unmodified.
const EMPTY_VALUE_SENTINEL = '__rpm_select_empty__'

interface ParsedOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  return React.Children.toArray(children)
    .filter(
      (child): child is React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>> =>
        React.isValidElement(child) && child.type === 'option'
    )
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children,
      disabled: child.props.disabled,
    }))
}

// Drop-in replacement for a native <select>: same props (value/defaultValue/
// onChange/name/children-as-<option>), styled with Radix underneath. A
// visually-hidden real <select> (not the forwarded ref, not tab-reachable)
// mirrors the value so FormData-based <form action={serverAction}> submission
// keeps working exactly as before — Server Actions read formData.get(name)
// and never see the difference. The forwarded ref instead targets the
// visible Radix trigger button, since callers (e.g. InlineEditableField) use
// it to move keyboard focus into an interactive element, not to submit a form.
const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      name,
      id,
      disabled,
      required,
      'aria-label': ariaLabel,
      onKeyDown,
    },
    ref
  ) => {
    const options = React.useMemo(() => parseOptions(children), [children])
    const isControlled = value !== undefined
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      String(defaultValue ?? value ?? options[0]?.value ?? '')
    )
    const currentValue = isControlled ? String(value) : uncontrolledValue
    const radixValue = currentValue === '' ? EMPTY_VALUE_SENTINEL : currentValue

    const hiddenSelectRef = React.useRef<HTMLSelectElement>(null)

    function handleValueChange(nextRadixValue: string) {
      const next = nextRadixValue === EMPTY_VALUE_SENTINEL ? '' : nextRadixValue
      if (!isControlled) setUncontrolledValue(next)
      onChange?.({
        target: { value: next },
        currentTarget: hiddenSelectRef.current,
      } as unknown as React.ChangeEvent<HTMLSelectElement>)
    }

    return (
      <>
        <select
          ref={hiddenSelectRef}
          name={name}
          value={currentValue}
          disabled={disabled}
          required={required}
          aria-hidden="true"
          tabIndex={-1}
          hidden
          className="hidden"
          onChange={() => {}}
        >
          {/* Only `value` matters here — FormData never reads an <option>'s text.
              Leaving it out avoids duplicating the visible label into a second,
              hidden copy on the page (collides with text-based queries, e.g.
              Playwright's getByText, which doesn't filter by visibility). */}
          {options.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </select>
        <SelectPrimitive.Root
          value={radixValue}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-label={ariaLabel}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
              'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              '[&>span]:line-clamp-1',
              className
            )}
          >
            <SelectPrimitive.Value />
            <SelectPrimitive.Icon asChild>
              <ChevronDown size={16} className="shrink-0 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
              )}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((o) => (
                  <SelectPrimitive.Item
                    key={o.value}
                    value={o.value === '' ? EMPTY_VALUE_SENTINEL : o.value}
                    disabled={o.disabled}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
                      'focus:bg-accent focus:text-accent-foreground',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check size={14} />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </>
    )
  }
)
Select.displayName = 'Select'

export { Select }
