'use client'

import { useState, useTransition } from 'react'
import type { Feature, JTBD, RTB } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createFeatureQuick } from '@/lib/actions/features'
import { createRTBQuick } from '@/lib/actions/rtbs'
import { WizardEntryList } from './wizard-entry-list'

type FeatureWithJtbds = Feature & { jtbds: JTBD[] }
type RTBWithFeatures = RTB & { features: Feature[] }

export function FeaturesStepForm({
  productId,
  jtbds,
  initialFeatures,
  initialRTBs,
}: {
  productId: string
  jtbds: JTBD[]
  initialFeatures: FeatureWithJtbds[]
  initialRTBs: RTBWithFeatures[]
}) {
  const [features, setFeatures] = useState(initialFeatures)
  const [rtbs, setRtbs] = useState(initialRTBs)

  const [featureName, setFeatureName] = useState('')
  const [featureJtbdIds, setFeatureJtbdIds] = useState<string[]>([])
  const [featureError, setFeatureError] = useState<string | null>(null)
  const [isFeaturePending, startFeatureTransition] = useTransition()

  const [rtbStatement, setRtbStatement] = useState('')
  const [rtbFeatureIds, setRtbFeatureIds] = useState<string[]>([])
  const [rtbError, setRtbError] = useState<string | null>(null)
  const [isRtbPending, startRtbTransition] = useTransition()

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function submitFeature() {
    if (!featureName.trim()) return
    startFeatureTransition(async () => {
      const result = await createFeatureQuick(productId, featureName, featureJtbdIds)
      if (!result.ok) {
        setFeatureError(result.error)
        return
      }
      const linkedJtbds = jtbds.filter((j) => featureJtbdIds.includes(j.id))
      setFeatures((prev) => [...prev, { ...result.feature, jtbds: linkedJtbds }])
      setFeatureName('')
      setFeatureError(null)
    })
  }

  function submitRtb() {
    if (!rtbStatement.trim()) return
    startRtbTransition(async () => {
      const result = await createRTBQuick(productId, rtbStatement, rtbFeatureIds)
      if (!result.ok) {
        setRtbError(result.error)
        return
      }
      const linkedFeatures = features.filter((f) => rtbFeatureIds.includes(f.id))
      setRtbs((prev) => [...prev, { ...result.rtb, features: linkedFeatures }])
      setRtbStatement('')
      setRtbError(null)
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Фичи</h2>
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="Название фичи"
          />
          {jtbds.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Какие JTBD закрывает</p>
              <div className="flex flex-wrap gap-2">
                {jtbds.map((j) => (
                  <label
                    key={j.id}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={featureJtbdIds.includes(j.id)}
                      onChange={() => toggle(featureJtbdIds, setFeatureJtbdIds, j.id)}
                    />
                    {j.title}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button
            type="button"
            disabled={isFeaturePending || !featureName.trim()}
            onClick={submitFeature}
          >
            Добавить
          </Button>
        </div>
        {featureError && <p className="text-sm text-destructive">{featureError}</p>}
        <WizardEntryList
          items={features.map((f) => ({
            id: f.id,
            label: f.name,
            meta: f.jtbds.map((j) => j.title).join(' · ') || undefined,
          }))}
          emptyLabel="Фич пока нет."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">RTB (Reasons To Believe)</h2>
        <div className="space-y-2 rounded-md border p-3">
          <Textarea
            value={rtbStatement}
            onChange={(e) => setRtbStatement(e.target.value)}
            placeholder="Почему клиент должен вам поверить"
          />
          {features.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">На каких фичах основано</p>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={rtbFeatureIds.includes(f.id)}
                      onChange={() => toggle(rtbFeatureIds, setRtbFeatureIds, f.id)}
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button type="button" disabled={isRtbPending || !rtbStatement.trim()} onClick={submitRtb}>
            Добавить
          </Button>
        </div>
        {rtbError && <p className="text-sm text-destructive">{rtbError}</p>}
        <WizardEntryList
          items={rtbs.map((r) => ({
            id: r.id,
            label: r.statement,
            meta: r.features.map((f) => f.name).join(' · ') || undefined,
          }))}
          emptyLabel="RTB пока нет."
        />
      </section>
    </div>
  )
}
