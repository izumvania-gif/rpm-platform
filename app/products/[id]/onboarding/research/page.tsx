import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { ResearchStepForm } from '@/components/onboarding/research-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingResearchPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [segments, jtbds, research, conversations, insights] = await Promise.all([
    prisma.segment.findMany({ where: { productId: product.id, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { productId: product.id, userId }, orderBy: { title: 'asc' } }),
    prisma.research.findMany({ where: { productId: product.id, userId }, orderBy: { createdAt: 'asc' } }),
    prisma.conversation.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { segment: true, research: true },
    }),
    prisma.insight.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { segment: true, jtbd: true, research: true, conversation: true },
    }),
  ])

  return (
    <WizardShell
      productId={product.id}
      activeStep="research"
      title="Откуда вы это знаете?"
      subtitle="Если уже разговаривали с клиентами или проводили исследование — зафиксируйте здесь. Если нет — пропустите, добавите позже."
    >
      <ResearchStepForm
        productId={product.id}
        segments={segments}
        jtbds={jtbds}
        initialResearch={research}
        initialConversations={conversations}
        initialInsights={insights}
      />
    </WizardShell>
  )
}
