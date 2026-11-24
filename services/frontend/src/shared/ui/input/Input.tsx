import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, helperText, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-platinum-400 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-platinum-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full h-11 px-3.5 py-2 text-sm text-platinum-100 bg-obsidian-900 border rounded-md',
              'placeholder:text-platinum-500 focus:outline-none transition-colors',
              'border-obsidian-700 hover:border-obsidian-600 focus:border-gold-400 focus:ring-1 focus:ring-gold-400',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-crimson-500 focus:border-crimson-500 focus:ring-crimson-500 text-crimson-500',
              props.disabled && 'opacity-50 cursor-not-allowed bg-obsidian-950',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-platinum-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-crimson-500 font-medium" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-platinum-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
