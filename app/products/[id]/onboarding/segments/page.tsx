import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { SegmentsStepForm } from '@/components/onboarding/segments-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingSegmentsPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const segments = await prisma.segment.findMany({
    where: { productId: product.id, userId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <WizardShell
      productId={product.id}
      activeStep="segments"
      title="Кто ваши клиенты?"
      subtitle="Опишите один или несколько сегментов — какие компании или люди пользуются продуктом. Можно пропустить и добавить позже со страницы продукта."
    >
      <SegmentsStepForm productId={product.id} initialSegments={segments} />
    </WizardShell>
  )
}
