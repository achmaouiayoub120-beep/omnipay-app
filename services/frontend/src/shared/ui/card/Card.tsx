import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'interactive' | 'floating';
}

export function Card({ className, variant = 'solid', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all',
        variant === 'solid' &&
          'bg-obsidian-850 border-obsidian-700 shadow-elevation-1',
        variant === 'interactive' &&
          'bg-obsidian-850 border-obsidian-700 shadow-elevation-1 hover:border-obsidian-600 hover:bg-obsidian-800 cursor-pointer',
        variant === 'floating' &&
          'bg-obsidian-900/90 backdrop-blur-md border-obsidian-700 shadow-elevation-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-platinum-100 tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-platinum-400 mt-0.5', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full', className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-3 mt-6 pt-4 border-t border-obsidian-700/60', className)} {...props}>
      {children}
    </div>
  );
}
