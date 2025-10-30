'use client'

import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'

interface NoteNodeProps {
  data: {
    text?: string
    onChange?: (v: string) => void
    onDelete?: () => void
  }
  selected: boolean
}

export function NoteNode({ data, selected }: NoteNodeProps) {
  return (
    <div
      className="relative rounded-md p-2 shadow"
      style={{
        background: '#FEF3C7',
        border: selected ? '2px solid #D97706' : '1px solid #F59E0B',
        width: 220,
        color: '#5B3E00',
        cursor: 'grab',
      }}
    >
      <button
        type="button"
        aria-label="Eliminar nota"
        onClick={(e) => {
          e.stopPropagation()
          data.onDelete?.()
        }}
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-gray-300 shadow flex items-center justify-center text-gray-600 hover:bg-gray-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <Textarea
        value={data.text ?? ''}
        onChange={(e) => data.onChange?.(e.target.value)}
        placeholder="Escribe tu nota…"
        className="w-full bg-transparent outline-none resize-none border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        rows={3}
      />
    </div>
  )
}


