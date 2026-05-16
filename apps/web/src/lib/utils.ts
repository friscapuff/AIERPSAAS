import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import Decimal from 'decimal.js';

// ─── Class name helper ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency / money formatting ──────────────────────────────────────────────
export function formatCurrency(
  value: number | string | Decimal,
  currency = 'USD',
  locale = 'en-US',
): string {
  const num = new Decimal(value ?? 0).toNumber();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(
  value: number | string,
  decimals = 2,
): string {
  return new Decimal(value ?? 0).toFixed(decimals);
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(
  date: string | Date | null | undefined,
  fmt = 'MMM dd, yyyy',
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, fmt) : '—';
  } catch {
    return '—';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}…`;
}

export function initials(name?: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Pagination helper ────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Error extraction ─────────────────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
  }
  return 'An unexpected error occurred';
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Colour for status ────────────────────────────────────────────────────────
export type StatusVariant = 'draft' | 'pending' | 'posted' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'inactive' | 'open' | 'closed' | 'locked';

export const STATUS_COLOURS: Record<StatusVariant, string> = {
  draft:     'bg-surface-100 text-surface-600',
  pending:   'bg-warning-100 text-warning-700',
  posted:    'bg-success-100 text-success-700',
  approved:  'bg-success-100 text-success-700',
  rejected:  'bg-danger-100 text-danger-700',
  cancelled: 'bg-danger-100 text-danger-600',
  active:    'bg-success-100 text-success-700',
  inactive:  'bg-surface-100 text-surface-500',
  open:      'bg-info-100 text-info-700',
  closed:    'bg-surface-100 text-surface-600',
  locked:    'bg-surface-200 text-surface-700',
};
