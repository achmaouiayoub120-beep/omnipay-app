import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { CircleNotch } from '@phosphor-icons/react';

export const buttonVariants = cva(
  'inline-flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-gold-400 text-obsidian-950 hover:bg-gold-300 border border-gold-300/30',
        secondary:
          'bg-obsidian-800 text-platinum-50 border border-obsidian-700 hover:bg-obsidian-780 hover:border-obsidian-600',
        outline:
          'border border-gold-400/40 text-gold-400 bg-transparent hover:bg-gold-400/10 hover:border-gold-400',
        ghost:
          'text-platinum-400 hover:text-platinum-50 hover:bg-obsidian-800/80',
        danger:
          'bg-crimson-500 text-white hover:bg-crimson-600 border border-crimson-500/40 focus-visible:ring-crimson-500',
      },
      size: {
        sm: 'h-8 px-3 py-2 text-sm font-semibold rounded-md gap-1.5',
        md: 'h-10 px-3 py-2 text-base font-semibold rounded-lg gap-2',
        lg: 'h-12 px-4 py-2 text-lg font-semibold rounded-lg gap-2',
        icon: 'h-10 w-10 p-0 rounded-lg',
        iconSm: 'h-8 w-8 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <CircleNotch className="h-4 w-4 animate-spin text-current shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
