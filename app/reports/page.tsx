import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ReportsPage() {
  return (
    <main className="container py-12">
      <h1 className="text-2xl font-bold mb-2">Отчёты</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Сводные и аналитические представления поверх уже собранных данных — без ручного ввода.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/reports/segments-jtbd">
          <Card className="h-full hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Матрица: Сегменты × JTBD</CardTitle>
              <CardDescription>
                Какие задачи есть у каждого сегмента и насколько это подтверждено исследованиями.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/reports/gaps">
          <Card className="h-full hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle>Дашборд пробелов</CardTitle>
              <CardDescription>
                Неподтверждённые JTBD, сегменты без задач, зависшие гипотезы, продукты без
                исследований.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  )
}
