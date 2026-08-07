import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { HypothesesStepForm } from '@/components/onboarding/hypotheses-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingHypothesesPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [segments, jtbds, hypotheses] = await Promise.all([
    prisma.segment.findMany({ where: { productId: product.id, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({ where: { productId: product.id, userId }, orderBy: { title: 'asc' } }),
    prisma.hypothesis.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { segment: true, jtbd: true },
    }),
  ])

  return (
    <WizardShell
      productId={product.id}
      activeStep="hypotheses"
      title="Что вы предполагаете?"
      subtitle="Сформулируйте гипотезы — предположения, которые предстоит проверить. Можно привязать к задаче (JTBD) и сегменту."
    >
      <HypothesesStepForm
        productId={product.id}
        segments={segments}
        jtbds={jtbds}
        initialHypotheses={hypotheses}
      />
    </WizardShell>
  )
}
