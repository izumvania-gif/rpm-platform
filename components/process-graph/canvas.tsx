'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesDelete,
  type OnEdgesDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Person, ProcessEdge, ProcessStep } from '@prisma/client'
import { ProcessStepNode } from './process-step-node'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/shared/delete-button'
import {
  createProcessEdge,
  createProcessStepQuick,
  deleteProcessEdge,
  deleteProcessStep,
  saveProcessStepPositions,
  updateProcessStep,
} from '@/lib/actions/process'

const nodeTypes = { processStep: ProcessStepNode }

// Simple deterministic grid so new steps don't stack exactly on top of each
// other — unlike the JTBD graph, there's no tree structure here to derive a
// fallback layout from, and a process flow is small enough that manual
// dragging afterward is enough (no auto-arrange button in this phase).
function nextStepPosition(existingCount: number): { x: number; y: number } {
  const col = existingCount % 4
  const row = Math.floor(existingCount / 4)
  return { x: 80 + col * 220, y: 80 + row * 140 }
}

// The form body only — no @xyflow/react `Panel` wrapper. `Panel` requires
// ReactFlow's internal positioning context (a `.react-flow` container with
// `position: relative`) to compute its placement; without that context the
// browser falls back to positioning it against the viewport, which pins it
// above the site nav. Used directly (no Panel) in the empty-state branch
// below, which renders outside `<ReactFlow>`; wrapped in `<AddStepPanel>`
// for the normal in-canvas case.
function AddStepForm({
  processId,
  people,
  stepCount,
}: {
  processId: string
  people: Person[]
  stepCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [assignedPersonId, setAssignedPersonId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const { x, y } = nextStepPosition(stepCount)
      const result = await createProcessStepQuick(processId, title, x, y, assignedPersonId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTitle('')
      setAssignedPersonId('')
      setError(null)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        + Добавить шаг
      </Button>
    )
  }

  return (
    <div className="w-72 space-y-2 rounded-md border bg-background p-3 shadow-md">
      <Input
        autoFocus
        placeholder="Например: PM планирует кампанию"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Select
        aria-label="Ответственный"
        value={assignedPersonId}
        onChange={(e) => setAssignedPersonId(e.target.value)}
      >
        <option value="">Без ответственного</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={submit}>
          Создать
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Отмена
        </Button>
      </div>
    </div>
  )
}

function AddStepPanel(props: { processId: string; people: Person[]; stepCount: number }) {
  return (
    <Panel position="top-left" className="!m-2">
      <AddStepForm {...props} />
    </Panel>
  )
}

function StepInspector({
  step,
  people,
  onClose,
}: {
  step: ProcessStep
  people: Person[]
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(step.title)
  const [assignedPersonId, setAssignedPersonId] = useState(step.assignedPersonId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await updateProcessStep(step.id, {
        title,
        assignedPersonId: assignedPersonId || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      router.refresh()
      onClose()
    })
  }

  // Same reasoning as DeleteButton (plans/2.0-hardening-plan.md, B4): a step
  // silently takes every edge touching it, so the dialog counts them first.
  // The dialog is shared, the delete itself is not a form submit — this panel
  // has to stay on the canvas and refresh, not redirect.
  function remove() {
    startTransition(async () => {
      await deleteProcessStep(step.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <Panel position="top-right" className="!m-2">
      <div className="w-72 space-y-2 rounded-md border bg-background p-3 shadow-md">
        <Input
          aria-label="Название шага"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          aria-label="Ответственный"
          value={assignedPersonId}
          onChange={(e) => setAssignedPersonId(e.target.value)}
        >
          <option value="">Без ответственного</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={save}>
            Сохранить
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            className="ml-auto"
            aria-haspopup="dialog"
            onClick={() => setConfirming(true)}
          >
            Удалить
          </Button>
        </div>
        {confirming && (
          <ConfirmDeleteDialog
            confirmMessage="Удалить шаг процесса?"
            name={step.title}
            impact={{ model: 'processStep', id: step.id }}
            onConfirm={() => {
              setConfirming(false)
              remove()
            }}
            onClose={() => setConfirming(false)}
          />
        )}
      </div>
    </Panel>
  )
}

function GraphInner({
  processId,
  steps,
  processEdges,
  people,
}: {
  processId: string
  steps: (ProcessStep & { assignedPerson: Person | null })[]
  processEdges: ProcessEdge[]
  people: Person[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)

  const initial = useMemo(() => {
    const nodes: Node[] = steps.map((s) => ({
      id: s.id,
      type: 'processStep',
      position: { x: s.x, y: s.y },
      data: {
        title: s.title,
        assignedPersonName: s.assignedPerson?.name ?? null,
        assignedPersonAvatarUrl: s.assignedPerson?.avatarUrl ?? null,
      },
    }))
    const edges: Edge[] = processEdges.map((e) => ({
      id: e.id,
      source: e.fromStepId,
      target: e.toStepId,
      label: e.label ?? undefined,
      style: { stroke: 'hsl(var(--primary))' },
      data: { edgeId: e.id },
    }))
    return { nodes, edges }
  }, [steps, processEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  // useNodesState/useEdgesState only seed their internal state from the
  // first render's `initial` value — without this, a later router.refresh()
  // (after creating/editing/deleting a step or edge) updates the `steps`/
  // `processEdges` props but the canvas keeps showing stale state. Same fix
  // JTBD's canvas.tsx applies for the same reason.
  useEffect(() => {
    setNodes(initial.nodes)
    setEdges(initial.edges)
  }, [initial, setNodes, setEdges])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const label = window.prompt('Подпись связи (необязательно)') ?? undefined
      startTransition(async () => {
        const result = await createProcessEdge(connection.source!, connection.target!, label)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        router.refresh()
      })
    },
    [router]
  )

  const onNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    startTransition(async () => {
      await saveProcessStepPositions([{ stepId: node.id, x: node.position.x, y: node.position.y }])
    })
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedStepId(node.id)
  }, [])

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      startTransition(async () => {
        for (const node of deleted) {
          await deleteProcessStep(node.id)
        }
        router.refresh()
      })
    },
    [router]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      startTransition(async () => {
        for (const edge of deleted) {
          const data = edge.data as { edgeId?: string } | undefined
          if (data?.edgeId) await deleteProcessEdge(data.edgeId)
        }
        router.refresh()
      })
    },
    [router]
  )

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="h-[50vh] rounded-md border">
        {nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">В этом процессе пока нет шагов.</p>
            <AddStepForm processId={processId} people={people} stepCount={steps.length} />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background />
            <Controls />
            <AddStepPanel processId={processId} people={people} stepCount={steps.length} />
            {selectedStep && (
              <StepInspector
                step={selectedStep}
                people={people}
                onClose={() => setSelectedStepId(null)}
              />
            )}
          </ReactFlow>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Потяните от края шага к другому шагу, чтобы задать связь. Клик по шагу открывает
        редактирование. Выделите шаг или связь и нажмите Delete, чтобы удалить.
      </p>
    </div>
  )
}

export function ProcessGraph(props: {
  processId: string
  steps: (ProcessStep & { assignedPerson: Person | null })[]
  processEdges: ProcessEdge[]
  people: Person[]
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  )
}
