import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { FeaturesStepForm } from '@/components/onboarding/features-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingFeaturesPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [jtbds, features, rtbs] = await Promise.all([
    prisma.jTBD.findMany({ where: { productId: product.id, userId }, orderBy: { title: 'asc' } }),
    prisma.feature.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { jtbds: true },
    }),
    prisma.rTB.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { features: true },
    }),
  ])

  return (
    <WizardShell
      productId={product.id}
      activeStep="features"
      title="Что вы предлагаете и почему это должны купить?"
      subtitle="Опишите ключевые фичи и, если хотите, привяжите к ним RTB (Reasons To Believe) — маркетинговые аргументы."
    >
      <FeaturesStepForm
        productId={product.id}
        jtbds={jtbds}
        initialFeatures={features}
        initialRTBs={rtbs}
      />
    </WizardShell>
  )
}
