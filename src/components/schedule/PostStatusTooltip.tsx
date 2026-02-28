'use client'

import { POST_STATUS_TOOLTIPS, PostStatus } from '@/types/post'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircleIcon } from 'lucide-react'

interface PostStatusTooltipProps {
  status: PostStatus
}

export function PostStatusTooltip({ status }: PostStatusTooltipProps) {
  const tooltip = POST_STATUS_TOOLTIPS[status]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center justify-center size-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={`Informacoes sobre ${tooltip.title}`}
          >
            <HelpCircleIcon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{tooltip.title}</h4>
            <p className="text-xs text-muted-foreground">{tooltip.description}</p>
            <ul className="text-xs space-y-1.5">
              {tooltip.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
