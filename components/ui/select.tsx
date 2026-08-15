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
  group?: string
}

// Recurses one level into <optgroup> so callers can group options (e.g.
// /marketing-hub's segment filter, grouped by product) the same way they
// would with a native <select> — <optgroup> isn't a plain element React
// flattens into, so the bare `child.type === 'option'` filter this used to
// be would silently drop every option nested inside one.
function parseOptions(children: React.ReactNode): ParsedOption[] {
  const result: ParsedOption[] = []
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue
    if (child.type === 'option') {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>
      result.push({
        value: String(props.value ?? ''),
        label: props.children,
        disabled: props.disabled,
      })
    } else if (child.type === 'optgroup') {
      const groupProps = child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement>
      for (const grandchild of React.Children.toArray(groupProps.children)) {
        if (!React.isValidElement(grandchild) || grandchild.type !== 'option') continue
        const props = grandchild.props as React.OptionHTMLAttributes<HTMLOptionElement>
        result.push({
          value: String(props.value ?? ''),
          label: props.children,
          disabled: props.disabled,
          group: groupProps.label,
        })
      }
    }
  }
  return result
}

type OptionBlock =
  { kind: 'item'; option: ParsedOption } | { kind: 'group'; label: string; options: ParsedOption[] }

// Options arrive already in document order, so a run of consecutive entries
// sharing the same `group` is exactly one <optgroup> — no need to bucket by
// label globally.
function blockOptions(options: ParsedOption[]): OptionBlock[] {
  const blocks: OptionBlock[] = []
  for (const option of options) {
    if (!option.group) {
      blocks.push({ kind: 'item', option })
      continue
    }
    const last = blocks[blocks.length - 1]
    if (last?.kind === 'group' && last.label === option.group) {
      last.options.push(option)
    } else {
      blocks.push({ kind: 'group', label: option.group, options: [option] })
    }
  }
  return blocks
}

function SelectOptionItem({ option }: { option: ParsedOption }) {
  return (
    <SelectPrimitive.Item
      value={option.value === '' ? EMPTY_VALUE_SENTINEL : option.value}
      disabled={option.disabled}
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
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
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

    // The browser's own "Please select an item in the list." follows the
    // browser's locale, not the app's, so a Russian UI could report in
    // English. Cleared as soon as a value is picked — a non-empty custom
    // message keeps a control invalid forever otherwise.
    React.useEffect(() => {
      hiddenSelectRef.current?.setCustomValidity(
        required && currentValue === '' ? 'Выберите значение из списка' : ''
      )
    }, [required, currentValue])

    function handleValueChange(nextRadixValue: string) {
      const next = nextRadixValue === EMPTY_VALUE_SENTINEL ? '' : nextRadixValue
      if (!isControlled) setUncontrolledValue(next)
      // Write the hidden <select>'s DOM value imperatively, ahead of the
      // onChange call below — React's `value={currentValue}` prop hasn't
      // re-rendered yet at this point (state updates from a Radix callback
      // aren't guaranteed to flush before the next synchronous line), so a
      // caller doing `e.currentTarget.form?.requestSubmit()` synchronously
      // inside its own onChange (the auto-submitting filter-form pattern,
      // e.g. ReportsProductFilterForm) would otherwise submit the *previous*
      // value — reproduced via a GET filter form picking between more than
      // two options in a Фаза 6 E2E test.
      if (hiddenSelectRef.current) hiddenSelectRef.current.value = next
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
          // Rendered rather than `hidden`. A `hidden` control that is also
          // `required` blocks form submission, but the browser cannot show
          // its validation bubble on an unfocusable element — it logs "An
          // invalid form control with name='…' is not focusable" and stops.
          // The visible effect was a «Создать» button that did nothing at
          // all, with no message anywhere, on every form whose product had
          // not been chosen. Kept out of the layout and out of the
          // accessibility tree, but focusable enough for the bubble.
          className="pointer-events-none absolute h-px w-px border-0 p-0 opacity-0"
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
                {blockOptions(options).map((block, i) =>
                  block.kind === 'item' ? (
                    <SelectOptionItem key={block.option.value} option={block.option} />
                  ) : (
                    <SelectPrimitive.Group key={`group-${i}`}>
                      <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {block.label}
                      </SelectPrimitive.Label>
                      {block.options.map((o) => (
                        <SelectOptionItem key={o.value} option={o} />
                      ))}
                    </SelectPrimitive.Group>
                  )
                )}
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
