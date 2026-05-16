'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-white text-surface-900 px-3 h-9 text-sm',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
        'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
        'dark:bg-surface-800 dark:text-surface-100 dark:border-surface-600',
        error ? 'border-danger-400' : 'border-surface-300 hover:border-surface-400',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
