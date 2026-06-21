'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface HourPoint {
  hour: number // 0–23
  count: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: HourPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <div className="font-medium">kl. {String(p.hour).padStart(2, '0')}–{String((p.hour + 1) % 24).padStart(2, '0')}</div>
      <div className="text-muted-foreground tabular-nums">
        {p.count} {p.count === 1 ? 'session' : 'sessioner'}
      </div>
    </div>
  )
}

/** Sessions by hour of day (Europe/Copenhagen). Client component (recharts). */
export function HourlyChart({ data }: { data: HourPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="hour"
          tickFormatter={h => String(h).padStart(2, '0')}
          ticks={[0, 6, 12, 18]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
        />
        <YAxis
          allowDecimals={false}
          width={32}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.5 }} />
        <Bar dataKey="count" fill="var(--color-violet-500)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
