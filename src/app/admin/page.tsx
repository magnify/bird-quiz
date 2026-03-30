import { getBirds, getSimilarityGroups } from '@/lib/data/birds'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Bird,
  Eye,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function AdminDashboard() {
  const { birds } = await getBirds()
  const groups = await getSimilarityGroups()
  const total = birds.length
  const easy = birds.filter(b => b.is_easy).length
  const common = birds.filter(b => b.is_common).length
  const groupCount = groups.length
  const categories = birds.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const categoryCount = Object.keys(categories).length

  const stats = [
    {
      label: 'Alle fugle',
      value: total,
      detail: `${categoryCount} kategorier`,
      icon: Bird,
    },
    {
      label: 'Lette fugle',
      value: easy,
      detail: `${Math.round((easy / total) * 100)}% af alle`,
      icon: Eye,
    },
    {
      label: 'Almindelige',
      value: common,
      detail: `${Math.round((common / total) * 100)}% af alle`,
      icon: TrendingUp,
    },
    {
      label: 'Lighedsgrupper',
      value: groupCount,
      detail: 'Til distraktorer i quiz',
      icon: Layers,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              <stat.icon className="size-4 mr-1.5" />
              {stat.detail}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kategorier</CardTitle>
            <CardDescription>{categoryCount} kategorier i alt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{cat}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sværhedsfordeling</CardTitle>
            <CardDescription>Andel af fugle i hver kategori</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {[
                { label: 'Lette fugle', count: easy },
                { label: 'Almindelige fugle', count: common },
                { label: 'Svære fugle', count: birds.filter(b => !b.is_easy && !b.is_common).length },
              ].map(row => (
                <Progress key={row.label} value={(row.count / total) * 100}>
                  <div className="flex justify-between w-full text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.count}</span>
                  </div>
                </Progress>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
