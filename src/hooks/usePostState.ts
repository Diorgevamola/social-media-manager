'use client'

import { useState, useCallback } from 'react'
import { PostStatus, PostAction, POST_STATUS_CONFIG } from '@/types/post'

interface UsePostStateProps {
  initialStatus: PostStatus
  postId: string
  onStatusChange?: (newStatus: PostStatus) => Promise<void>
}

export function usePostState({
  initialStatus,
  postId,
  onStatusChange
}: UsePostStateProps) {
  const [status, setStatus] = useState<PostStatus>(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateTransition = useCallback((from: PostStatus, to: PostStatus): boolean => {
    const config = POST_STATUS_CONFIG[from]
    return config.nextStates.includes(to)
  }, [])

  const canPerformAction = useCallback((action: PostAction): boolean => {
    const config = POST_STATUS_CONFIG[status]
    return config.allowedActions.includes(action)
  }, [status])

  const transitionTo = useCallback(
    async (newStatus: PostStatus, action?: PostAction) => {
      // Validar transição
      if (!validateTransition(status, newStatus)) {
        const error = `Transição inválida: ${status} → ${newStatus}`
        setError(error)
        throw new Error(error)
      }

      // Validar ação (se fornecida)
      if (action && !canPerformAction(action)) {
        const error = `Ação ${action} não permitida no estado ${status}`
        setError(error)
        throw new Error(error)
      }

      setIsLoading(true)
      setError(null)

      try {
        // Chamar callback se fornecido
        if (onStatusChange) {
          await onStatusChange(newStatus)
        }

        setStatus(newStatus)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao alterar status'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [status, validateTransition, canPerformAction, onStatusChange]
  )

  // Transições rápidas com ações específicas
  const confirm = useCallback(
    () => transitionTo('planned', 'confirm'),
    [transitionTo]
  )

  const publishNow = useCallback(
    () => transitionTo('published', 'publishNow'),
    [transitionTo]
  )

  const revert = useCallback(
    () => transitionTo('draft', 'revertToDraft'),
    [transitionTo]
  )

  return {
    status,
    isLoading,
    error,
    canPerformAction,
    validateTransition,
    transitionTo,
    // Quick transitions
    confirm,
    publishNow,
    revert
  }
}
