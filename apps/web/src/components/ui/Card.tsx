'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ hover = false, padding = 'md', className, children, ...props }: CardProps) {
  const paddingClass = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-surface-200 shadow-card',
        hover && 'hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
        paddingClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  border?: boolean;
}

Card.Header = function CardHeader({ title, subtitle, action, border = true, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', border && 'pb-4 mb-4 border-b border-surface-100', className)} {...props}>
      {(title || subtitle) ? (
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-surface-900 truncate">{title}</h3>}
          {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
      ) : children}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, change, changeType = 'neutral', icon, iconBg = 'bg-primary-50', loading = false }: KpiCardProps) {
  const changeColour = { positive: 'text-success-600', negative: 'text-danger-600', neutral: 'text-surface-500' }[changeType];
  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2"><div className="h-3 w-24 bg-surface-200 rounded" /><div className="h-7 w-32 bg-surface-200 rounded" /><div className="h-3 w-20 bg-surface-200 rounded" /></div>
          <div className="h-10 w-10 bg-surface-200 rounded-lg" />
        </div>
      </Card>
    );
  }
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-surface-900 tabular-nums">{value}</p>
          {change && <p className={cn('mt-1 text-xs font-medium', changeColour)}>{change}</p>}
        </div>
        {icon && <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>{icon}</div>}
      </div>
    </Card>
  );
}
