/**
 * Post Status & State Management Types
 * Define estados canônicos, transições e ações permitidas
 */

export type PostStatus = 'draft' | 'planned' | 'published'

export const POST_STATUS_CONFIG: Record<PostStatus, {
  label: string
  description: string
  emoji: string
  color: {
    bg: string
    border: string
    text: string
    ring: string
  }
  icon: string
  progress: number
  allowedActions: PostAction[]
  nextStates: PostStatus[]
}> = {
  draft: {
    label: 'Rascunho',
    description: 'Post em desenvolvimento, aguardando edições',
    emoji: '📝',
    color: {
      bg: 'bg-muted',
      border: 'border-border',
      text: 'text-muted-foreground',
      ring: 'ring-ring/20'
    },
    icon: 'PencilIcon',
    progress: 10,
    allowedActions: ['generateImage', 'generateVideo', 'editCaption', 'editTime', 'confirm', 'delete'],
    nextStates: ['planned']
  },
  planned: {
    label: 'Agendado',
    description: 'Pronto para publicar na data/hora agendada',
    emoji: '📅',
    color: {
      bg: 'bg-info/10',
      border: 'border-info/30',
      text: 'text-info',
      ring: 'ring-info/20'
    },
    icon: 'CalendarIcon',
    progress: 50,
    allowedActions: ['preview', 'publishNow', 'editCaption', 'editTime', 'revertToDraft', 'delete'],
    nextStates: ['published', 'draft']
  },
  published: {
    label: 'Publicado',
    description: 'Post ao vivo no Instagram',
    emoji: '✅',
    color: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      text: 'text-success',
      ring: 'ring-success/20'
    },
    icon: 'CheckCircleIcon',
    progress: 100,
    allowedActions: ['viewMetrics', 'openInstagram', 'editCaption', 'revertPublish'],
    nextStates: ['draft']
  }
}

export type PostAction =
  | 'generateImage'
  | 'generateVideo'
  | 'editCaption'
  | 'editTime'
  | 'confirm'
  | 'delete'
  | 'preview'
  | 'publishNow'
  | 'revertToDraft'
  | 'viewMetrics'
  | 'openInstagram'
  | 'revertPublish'

export const POST_ACTION_CONFIG: Record<PostAction, {
  label: string
  icon: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  requiresConfirm?: boolean
}> = {
  generateImage: { label: 'Gerar Imagem', icon: 'ImageIcon', variant: 'default' },
  generateVideo: { label: 'Gerar Vídeo', icon: 'VideoIcon', variant: 'default' },
  editCaption: { label: 'Editar Caption', icon: 'PencilIcon', variant: 'default' },
  editTime: { label: 'Editar Horário', icon: 'ClockIcon', variant: 'default' },
  confirm: { label: 'Confirmar', icon: 'CheckIcon', variant: 'default' },
  delete: { label: 'Deletar', icon: 'TrashIcon', variant: 'destructive', requiresConfirm: true },
  preview: { label: 'Visualizar', icon: 'EyeIcon', variant: 'default' },
  publishNow: { label: 'Publicar Agora', icon: 'SendIcon', variant: 'default' },
  revertToDraft: { label: 'Voltar para Rascunho', icon: 'ArrowLeftIcon', variant: 'secondary' },
  viewMetrics: { label: 'Ver Métricas', icon: 'BarChartIcon', variant: 'default' },
  openInstagram: { label: 'Abrir no Instagram', icon: 'ExternalLinkIcon', variant: 'default' },
  revertPublish: { label: 'Reverter Publicação', icon: 'RotateCcwIcon', variant: 'destructive', requiresConfirm: true }
}

export const POST_STATUS_TOOLTIPS: Record<PostStatus, {
  title: string
  description: string
  tips: string[]
}> = {
  draft: {
    title: 'Rascunho',
    description: 'Post em desenvolvimento. Configure imagem, caption e horário.',
    tips: [
      'Gere ou faça upload de imagem/vídeo',
      'Adicione ou edite a caption',
      'Defina a data e hora de publicação',
      'Confirme para agendar'
    ]
  },
  planned: {
    title: 'Agendado',
    description: 'Post será publicado automaticamente na data e hora marcada.',
    tips: [
      'Publicação automática conforme agendado',
      'Você pode editar a caption antes de publicar',
      'Publicar agora ou agendar para outra hora',
      'Deletar cancela o agendamento'
    ]
  },
  published: {
    title: 'Publicado',
    description: 'Post está ao vivo no Instagram. Você pode acompanhar engajamento.',
    tips: [
      'Visualize métricas em tempo real',
      'Edite a caption (sincroniza com Instagram)',
      'Reverta a publicação se necessário'
    ]
  }
}
