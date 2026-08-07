import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { JtbdStepForm } from '@/components/onboarding/jtbd-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingJtbdPage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [segments, jtbds] = await Promise.all([
    prisma.segment.findMany({ where: { productId: product.id, userId }, orderBy: { name: 'asc' } }),
    prisma.jTBD.findMany({
      where: { productId: product.id, userId },
      orderBy: { createdAt: 'asc' },
      include: { segment: true },
    }),
  ])
  const categories = Array.from(new Set(jtbds.map((j) => j.category))).sort()

  return (
    <WizardShell
      productId={product.id}
      activeStep="jtbd"
      title="Какие задачи вы для них решаете?"
      subtitle="Сформулируйте, что клиент пытается сделать — «Когда…, я хочу…, чтобы…». При желании привяжите к сегменту и укажите масштаб задачи."
    >
      <JtbdStepForm
        productId={product.id}
        segments={segments}
        initialJtbds={jtbds}
        categories={categories}
      />
    </WizardShell>
  )
}
