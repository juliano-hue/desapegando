import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
        variant === 'primary' &&
          'bg-emerald-400/90 text-slate-950 hover:bg-emerald-300 shadow-[0_10px_30px_-16px_rgba(52,211,153,0.9)]',
        variant === 'ghost' && 'bg-transparent text-slate-100 hover:bg-white/10',
        variant === 'subtle' && 'bg-white/8 text-slate-100 hover:bg-white/12',
        variant === 'danger' && 'bg-rose-500/90 text-white hover:bg-rose-400',
        className,
      )}
    />
  )
}

