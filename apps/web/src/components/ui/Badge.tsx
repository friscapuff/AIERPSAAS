'use client';

import React from 'react';
import { cn, STATUS_COLOURS, type StatusVariant } from '@/lib/utils';

type Size = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant | 'default';
  size?: Size;
  dot?: boolean;
}

const defaultColour = 'bg-surface-100 text-surface-600';

export function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const colourClass =
    variant === 'default' ? defaultColour : STATUS_COLOURS[variant] ?? defaultColour;

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        colourClass,
        sizeClass,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            colourClass.includes('success') ? 'bg-success-500' :
            colourClass.includes('warning') ? 'bg-warning-500' :
            colourClass.includes('danger')  ? 'bg-danger-500'  :
            colourClass.includes('info')    ? 'bg-info-500'    :
            'bg-surface-400',
          )}
        />
      )}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  size?: Size;
  dot?: boolean;
}

export function StatusBadge({ status, size = 'sm', dot = false }: StatusBadgeProps) {
  const normalised = status.toLowerCase() as StatusVariant;
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge variant={normalised in STATUS_COLOURS ? normalised : 'default'} size={size} dot={dot}>
      {label}
    </Badge>
  );
}
