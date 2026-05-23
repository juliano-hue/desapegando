import { cn } from '@/lib/utils'
import type { TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-28 w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        className,
      )}
    />
  )
}
