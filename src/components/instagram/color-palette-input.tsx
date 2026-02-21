'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ColorPaletteInputProps {
  value: string[]
  onChange: (colors: string[]) => void
  maxColors?: number
}

export function ColorPaletteInput({ value, onChange, maxColors = 6 }: ColorPaletteInputProps) {
  function addColor() {
    onChange([...value, '#3B82F6'])
  }

  function removeColor(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function updateColor(i: number, color: string) {
    onChange(value.map((c, idx) => (idx === i ? color : c)))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((color, i) => (
          <div key={i} className="relative group">
            {/* Swatch que abre o color picker nativo */}
            <label
              className="block size-9 rounded-lg border-2 border-input cursor-pointer shadow-sm overflow-hidden hover:scale-105 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="sr-only"
              />
            </label>
            {/* Remove */}
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="absolute -top-1.5 -right-1.5 size-4 bg-background border border-input rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity shadow-sm"
            >
              <X className="size-2.5 text-muted-foreground" />
            </button>
          </div>
        ))}

        {value.length < maxColors && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-9 p-0 rounded-lg border-dashed"
            onClick={addColor}
            title="Adicionar cor"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Hex values */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((color, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted/40 rounded px-1.5 py-0.5">
              <div className="size-2.5 rounded-sm border border-black/10" style={{ backgroundColor: color }} />
              <Label className="text-[10px] font-mono text-muted-foreground cursor-default">{color}</Label>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Clique em &quot;+&quot; para adicionar cores da sua marca. A IA usará essa paleta ao criar posts.
        </p>
      )}
    </div>
  )
}
