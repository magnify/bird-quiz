import { STATIC_BIRDS, SIMILARITY_GROUPS_RAW } from '@/lib/data/birds-static'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function GroupsPage() {
  const birdBySci = new Map(STATIC_BIRDS.map(b => [b.scientific_name, b]))

  const groups = Object.entries(SIMILARITY_GROUPS_RAW)
    .map(([slug, sciNames]) => ({
      slug,
      name: slug.replace(/-/g, ' '),
      members: sciNames
        .map(sci => birdBySci.get(sci))
        .filter(Boolean) as typeof STATIC_BIRDS,
    }))
    .sort((a, b) => b.members.length - a.members.length)

  return (
    <div className="px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {groups.map(group => (
          <Card key={group.slug}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold capitalize">
                  {group.name}
                </CardTitle>
                <Badge variant="secondary">{group.members.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {group.members.map(bird => (
                  <div key={bird.id} className="text-xs flex justify-between gap-2">
                    <span>{bird.name_da}</span>
                    <span className="italic text-muted-foreground truncate">{bird.scientific_name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
