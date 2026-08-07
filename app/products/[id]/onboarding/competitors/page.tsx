import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { CompetitorsStepForm } from '@/components/onboarding/competitors-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingCompetitorsPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const competitors = await prisma.competitor.findMany({
    where: { productId: product.id, userId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <WizardShell
      productId={product.id}
      activeStep="competitors"
      title="С кем вы конкурируете?"
      subtitle="Перечислите основных конкурентов и то, как они себя позиционируют. Можно пропустить и добавить позже."
    >
      <CompetitorsStepForm productId={product.id} initialCompetitors={competitors} />
    </WizardShell>
  )
}
