'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface NegativeWordsInputProps {
  value: string[]
  onChange: (words: string[]) => void
  maxWords?: number
}

export function NegativeWordsInput({ value, onChange, maxWords = 30 }: NegativeWordsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addWord(raw: string) {
    const words = raw.split(/[,;\s]+/).map(w => w.trim().toLowerCase()).filter(Boolean)
    if (words.length === 0) return
    const next = [...value]
    for (const w of words) {
      if (!next.includes(w) && next.length < maxWords) {
        next.push(w)
      }
    }
    onChange(next)
    setInputValue('')
  }

  function removeWord(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      addWord(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      {/* Tag list + input */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] rounded-md border border-input bg-background px-2 py-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((word, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full border border-destructive/20 font-medium"
          >
            {word}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeWord(i) }}
              className="hover:text-destructive/70 transition-colors"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {value.length < maxWords && (
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue.trim()) addWord(inputValue) }}
            placeholder={value.length === 0 ? 'sexo, política, violência... (Enter para adicionar)' : ''}
            className="border-0 shadow-none p-0 h-auto text-xs flex-1 min-w-[120px] focus-visible:ring-0 bg-transparent"
          />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Pressione <kbd className="text-[10px] px-1 py-0.5 bg-muted rounded border">Enter</kbd> ou <kbd className="text-[10px] px-1 py-0.5 bg-muted rounded border">,</kbd> para adicionar. A IA nunca usará essas palavras nos conteúdos.
      </p>
    </div>
  )
}
