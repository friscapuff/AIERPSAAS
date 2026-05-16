'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BaseFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────
interface FieldWrapperProps extends BaseFieldProps {
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldWrapper({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-surface-700"
        >
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-surface-400">{hint}</p>}
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      required,
      leftAddon,
      rightAddon,
      size = 'md',
      className,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const sizeClass = {
      sm: 'h-8 text-sm px-3',
      md: 'h-9 text-sm px-3',
      lg: 'h-11 text-base px-4',
    }[size];

    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={id}
      >
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full rounded-lg border bg-white text-surface-900 placeholder-surface-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
              'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
              error
                ? 'border-danger-400 focus:ring-danger-400'
                : 'border-surface-300 hover:border-surface-400',
              leftAddon && 'pl-9',
              rightAddon && 'pr-9',
              sizeClass,
              className,
            )}
            {...props}
          />
          {rightAddon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400">
              {rightAddon}
            </div>
          )}
        </div>
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, className, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={id}
      >
        <textarea
          ref={ref}
          id={id}
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-white text-surface-900 placeholder-surface-400 px-3 py-2 text-sm',
            'resize-y min-h-[72px]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            error
              ? 'border-danger-400 focus:ring-danger-400'
              : 'border-surface-300 hover:border-surface-400',
            className,
          )}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    BaseFieldProps {
  options: { label: string; value: string | number }[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, required, options, placeholder, size = 'md', className, id: idProp, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const sizeClass = {
      sm: 'h-8 text-sm px-3',
      md: 'h-9 text-sm px-3',
      lg: 'h-11 text-base px-4',
    }[size];

    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={id}
      >
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-white text-surface-900',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            error
              ? 'border-danger-400 focus:ring-danger-400'
              : 'border-surface-300 hover:border-surface-400',
            sizeClass,
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';

// ─── Checkbox ────────────────────────────────────────────────────────────────
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className={cn('space-y-1', className)}>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border-surface-300 text-primary-600',
              'focus:ring-primary-500 focus:ring-offset-1',
              error && 'border-danger-400',
            )}
            {...props}
          />
          <span className="text-sm text-surface-700">{label}</span>
        </label>
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
