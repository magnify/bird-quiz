'use client'

import { Loader2 } from 'lucide-react'

interface Option { value: string; label: string }

interface InlineSelectProps {
  value: string
  options: Option[]
  placeholder: string
  pending?: boolean
  className?: string
  onChange: (next: string) => void | Promise<void>
}

export function InlineSelect({ value, options, placeholder, pending, className, onChange }: InlineSelectProps) {
  if (pending) return <Loader2 className="size-3 animate-spin inline" />
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value) }}
      className={`rounded border border-input bg-background px-1.5 py-0.5 text-xs ${value ? '' : 'text-muted-foreground'} ${className ?? ''}`}
    >
      <option value="">{`+ ${placeholder}`}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
