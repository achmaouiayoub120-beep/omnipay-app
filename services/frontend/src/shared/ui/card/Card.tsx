import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'interactive' | 'floating' | 'flat';
}

export function Card({ className, variant = 'solid', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        variant === 'solid' &&
          'bg-obsidian-900 border-obsidian-700/80 shadow-elevation-1',
        variant === 'flat' &&
          'bg-obsidian-800/70 border-obsidian-700/70',
        variant === 'interactive' &&
          'bg-obsidian-900 border-obsidian-700/80 hover:border-gold-400/40 hover:bg-obsidian-800 cursor-pointer shadow-elevation-1',
        variant === 'floating' &&
          'bg-obsidian-900/95 backdrop-blur-md border-obsidian-700 shadow-elevation-3',
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
    <h3 className={cn('title-3 text-platinum-50 font-semibold', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('caption-5 text-platinum-400 mt-1', className)} {...props}>
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
