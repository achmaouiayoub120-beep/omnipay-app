import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-gold-400 text-obsidian-950 font-semibold shadow-gold-glow-subtle hover:bg-gold-500 hover:shadow-gold-glow',
        secondary:
          'bg-obsidian-800 text-platinum-100 border border-obsidian-700 hover:bg-obsidian-750 hover:border-obsidian-600',
        outline:
          'border border-gold-400/50 text-gold-400 bg-transparent hover:bg-gold-400/10 hover:border-gold-400',
        ghost:
          'text-platinum-400 hover:text-platinum-100 hover:bg-obsidian-800',
        danger:
          'bg-crimson-500 text-white hover:bg-crimson-600 focus-visible:ring-crimson-500',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-sm gap-1.5',
        md: 'h-10 px-4 text-sm rounded-md gap-2',
        lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
        icon: 'h-10 w-10 p-0 rounded-md',
        iconSm: 'h-8 w-8 p-0 rounded-sm',
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
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
