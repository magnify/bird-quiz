'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DayPoint {
  date: string // YYYY-MM-DD
  count: number
}

const MONTHS_DA = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatTick(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(d)}. ${MONTHS_DA[Number(m) - 1]}`
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{formatTick(p.date)}</div>
      <div className="text-muted-foreground tabular-nums">
        {p.count} {p.count === 1 ? 'session' : 'sessioner'}
      </div>
    </div>
  )
}

/** Area chart for sessions-per-day. Client component (recharts needs the DOM). */
export function SessionsAreaChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-sky-500)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-sky-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
        />
        <YAxis
          allowDecimals={false}
          width={32}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-sky-500)', strokeWidth: 1, strokeOpacity: 0.4 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-sky-500)"
          strokeWidth={2}
          fill="url(#sessionsFill)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
