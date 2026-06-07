'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface InlineTextProps {
  value: string
  placeholder: string
  pending?: boolean
  className?: string
  /** Save the new value. Return false to keep editing (e.g. on failure). */
  onCommit: (next: string) => void | Promise<void>
}

export function InlineText({ value, placeholder, pending, className, onCommit }: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        type="button"
        className={`text-left hover:underline ${value ? '' : 'text-muted-foreground'} ${className ?? ''}`}
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      >
        {pending ? <Loader2 className="size-3 animate-spin inline" /> : (value || `+ ${placeholder}`)}
      </button>
    )
  }

  const commit = async () => {
    setEditing(false)
    if (draft !== value) await onCommit(draft)
  }

  return (
    <input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className={`w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs ${className ?? ''}`}
    />
  )
}
