import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none',
  {
    variants: {
      variant: {
        neutral:
          'bg-obsidian-800 text-platinum-400 border border-obsidian-700',
        gold:
          'bg-gold-400/15 text-gold-400 border border-gold-400/40',
        success:
          'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40',
        danger:
          'bg-crimson-500/15 text-crimson-500 border border-crimson-500/40',
        warning:
          'bg-amber-500/15 text-amber-500 border border-amber-500/40',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-500',
            variant === 'danger' && 'bg-crimson-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'gold' && 'bg-gold-400',
            (!variant || variant === 'neutral') && 'bg-platinum-400'
          )}
        />
      )}
      {children}
    </span>
  );
}
