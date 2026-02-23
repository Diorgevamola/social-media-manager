'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload, Trash2, FileText, BookOpen } from 'lucide-react'

interface KnowledgeDocItem {
  id: string
  file_name: string
  file_size: number | null
  created_at: string
}

interface KnowledgeBaseUploaderProps {
  accountId: string
  enabled: boolean
  influence: number
  onSettingsChange: (enabled: boolean, influence: number) => void
}

export function KnowledgeBaseUploader({
  accountId,
  enabled,
  influence,
  onSettingsChange,
}: KnowledgeBaseUploaderProps) {
  const [docs, setDocs] = useState<KnowledgeDocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocs()
  }, [accountId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/instagram/accounts/${accountId}/knowledge-docs`)
      const data = await res.json()
      if (res.ok) setDocs(data.docs ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(files: FileList) {
    setError(null)
    const filesToUpload = Array.from(files).filter(f => f.type === 'application/pdf')

    if (filesToUpload.length === 0) {
      setError('Apenas arquivos PDF são aceitos.')
      return
    }

    if (docs.length + filesToUpload.length > 11) {
      setError(`Limite de 11 documentos. Você tem ${docs.length} e está tentando adicionar ${filesToUpload.length}.`)
      return
    }

    setUploading(true)
    for (const file of filesToUpload) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch(`/api/instagram/accounts/${accountId}/knowledge-docs`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Erro ao fazer upload')
        }
      } catch {
        setError('Erro de rede ao fazer upload')
      }
    }
    setUploading(false)
    await loadDocs()
  }

  async function handleDelete(docId: string) {
    setError(null)
    try {
      await fetch(`/api/instagram/accounts/${accountId}/knowledge-docs/${docId}`, {
        method: 'DELETE',
      })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {
      setError('Erro ao excluir documento')
    }
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="space-y-3">
      {/* Header com toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <Label>Base de Conhecimento</Label>
          <span className="text-xs text-muted-foreground">
            ({docs.length}/11 docs)
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSettingsChange(!enabled, influence)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            enabled ? 'bg-primary' : 'bg-input'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Nível de influência */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Influência no cronograma:
            </span>
            <Select
              value={String(influence)}
              onValueChange={(v) => onSettingsChange(enabled, parseInt(v))}
            >
              <SelectTrigger className="h-7 text-xs w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30%</SelectItem>
                <SelectItem value="40">40%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">
              {influence === 30 && 'Inspiração leve'}
              {influence === 40 && 'Referência moderada'}
              {influence === 50 && 'Influência equilibrada'}
              {influence === 100 && 'Prioridade total'}
            </span>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
              {error}
            </p>
          )}

          {/* Área de upload */}
          {docs.length < 11 && (
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files)
              }}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Processando PDF e extraindo texto...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="size-5 text-muted-foreground" />
                  <p className="text-xs font-medium">Clique ou arraste PDFs aqui</p>
                  <p className="text-[10px] text-muted-foreground">
                    Estratégias, briefings, referências de conteúdo • Até 11 documentos
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </div>
          )}

          {/* Lista de documentos */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Carregando documentos...
            </div>
          ) : docs.length > 0 ? (
            <div className="space-y-1">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
                >
                  <FileText className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs flex-1 truncate">{doc.file_name}</span>
                  {doc.file_size && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatSize(doc.file_size)}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum documento ainda. Faça upload de PDFs para enriquecer a geração de conteúdo.
            </p>
          )}
        </>
      )}
    </div>
  )
}
