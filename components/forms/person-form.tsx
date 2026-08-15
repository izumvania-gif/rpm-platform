'use client'

import { SubmitButton } from '@/components/shared/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface PersonFormValues {
  name?: string
  role?: string | null
  team?: string | null
  email?: string | null
  avatarUrl?: string | null
  skills?: string[]
}

export function PersonForm({
  action,
  defaultValues,
  error,
  submitLabel,
  redirectTo,
}: {
  action: (formData: FormData) => void
  defaultValues?: PersonFormValues
  error?: string
  submitLabel: string
  /** Where to land after saving; the action falls back to its own page. */
  redirectTo?: string
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Роль / должность</Label>
          <Input id="role" name="role" defaultValue={defaultValues?.role ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team">Команда</Label>
          <Input id="team" name="team" defaultValue={defaultValues?.team ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Ссылка на аватар</Label>
          <Input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            defaultValue={defaultValues?.avatarUrl ?? ''}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="skills">Навыки/компетенции (через запятую)</Label>
          <Input id="skills" name="skills" defaultValue={defaultValues?.skills?.join(', ')} />
        </div>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
