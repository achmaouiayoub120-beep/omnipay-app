import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md font-medium tracking-wide select-none border transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
  {
    variants: {
      variant: {
        neutral:
          'bg-obsidian-800 text-platinum-400 border-obsidian-700',
        gold:
          'bg-gold-400/10 text-gold-400 border-gold-400/30',
        success:
          'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
        danger:
          'bg-crimson-500/10 text-crimson-500 border-crimson-500/30',
        warning:
          'bg-amber-500/10 text-amber-500 border-amber-500/30',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-xs px-2.5 py-1 font-semibold',
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
            'h-1.5 w-1.5 rounded-full shrink-0',
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
