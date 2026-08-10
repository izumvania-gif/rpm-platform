import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { WizardShell } from '@/components/onboarding/wizard-shell'
import { PeopleStepForm } from '@/components/onboarding/people-step-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingPeoplePage({ params }: { params: { id: string } }) {
  const userId = getCurrentUserId()
  const product = await prisma.product.findFirst({ where: { id: params.id, userId } })
  if (!product) notFound()

  const [people, members] = await Promise.all([
    prisma.person.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.productTeamMember.findMany({
      where: { productId: product.id },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <WizardShell
      productId={product.id}
      activeStep="people"
      title="С кем вы работаете над этим продуктом?"
      subtitle="Добавьте команду — выберите уже существующих людей или заведите новых. Появятся в разделе «Команда» на /pm. Можно пропустить и добавить позже."
    >
      <PeopleStepForm productId={product.id} people={people} initialMembers={members} />
    </WizardShell>
  )
}
