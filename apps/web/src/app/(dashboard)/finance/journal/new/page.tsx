'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon, ArrowLeftIcon, CheckIcon, DocumentIcon } from '@heroicons/react/24/outline';
import Decimal from 'decimal.js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { notify } from '@/components/ui/Toast';
import { useAccounts, useCreateJournalEntry, usePostJournalEntry, usePeriods } from '@/hooks/useFinance';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────
const lineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  description: z.string().optional(),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
});

const journalSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    currency: z.string().default('USD'),
    periodId: z.string().optional(),
    lines: z.array(lineSchema).min(2, 'Journal entry must have at least 2 lines'),
  })
  .refine(
    (d) => {
      const totalDebit  = d.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
      const totalCredit = d.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.001;
    },
    { message: 'Debits must equal credits', path: ['lines'] },
  );

type JournalFormData = z.infer<typeof journalSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewJournalEntryPage() {
  const router = useRouter();
  const [saveMode, setSaveMode] = useState<'draft' | 'post'>('draft');

  const { data: accounts } = useAccounts();
  const { data: periods } = usePeriods();
  const createEntry = useCreateJournalEntry();
  const postEntry   = usePostJournalEntry();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      lines: [
        { accountId: '', description: '', debit: 0, credit: 0 },
        { accountId: '', description: '', debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  // Running totals
  const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
  const difference  = new Decimal(totalDebit).minus(totalCredit).toNumber();

  const accountOptions = (accounts ?? []).map((a) => ({
    label: `${a.code} — ${a.name}`,
    value: a.id,
  }));

  const periodOptions = (periods ?? [])
    .filter((p) => p.status === 'OPEN')
    .map((p) => ({ label: p.name, value: p.id }));

  const onSubmit = async (data: JournalFormData) => {
    try {
      const entry = await createEntry.mutateAsync({
        date:        data.date,
        description: data.description,
        currency:    data.currency,
        periodId:    data.periodId,
        lines:       data.lines.map((l) => ({
          accountId:   l.accountId,
          debit:       l.debit ?? 0,
          credit:      l.credit ?? 0,
          description: l.description,
        })),
      });

      if (saveMode === 'post') {
        await postEntry.mutateAsync(entry.id);
        notify.success('Journal entry created and posted.', 'Posted');
      } else {
        notify.success('Journal entry saved as draft.', 'Draft Saved');
      }

      router.push('/finance');
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? 'Something went wrong';
      notify.error(msg, 'Failed to save entry');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => router.push('/finance')}
        >
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-surface-900">New Journal Entry</h1>
          <p className="text-sm text-surface-500 mt-0.5">Create a double-entry bookkeeping record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Header fields */}
        <Card padding="md">
          <Card.Header title="Entry Details" border />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              {...register('date')}
              label="Date"
              type="date"
              error={errors.date?.message}
              required
            />
            <Select
              {...register('currency')}
              label="Currency"
              options={[
                { label: 'USD — US Dollar', value: 'USD' },
                { label: 'EUR — Euro', value: 'EUR' },
                { label: 'GBP — British Pound', value: 'GBP' },
                { label: 'JOD — Jordanian Dinar', value: 'JOD' },
                { label: 'AED — UAE Dirham', value: 'AED' },
              ]}
            />
            <Select
              {...register('periodId')}
              label="Accounting Period"
              placeholder="Select period (optional)"
              options={periodOptions}
            />
          </div>
          <div className="mt-4">
            <Textarea
              {...register('description')}
              label="Description / Memo"
              placeholder="Describe the nature of this transaction…"
              error={errors.description?.message}
              required
            />
          </div>
        </Card>

        {/* Lines */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div>
              <h2 className="text-sm font-semibold text-surface-900">Journal Lines</h2>
              <p className="text-xs text-surface-500 mt-0.5">Each line credits or debits an account</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => append({ accountId: '', description: '', debit: 0, credit: 0 })}
            >
              Add Line
            </Button>
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_40px] gap-3 px-5 py-2.5 bg-surface-50 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wide">
            <span>Account</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span />
          </div>

          <div className="divide-y divide-surface-100">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_40px] gap-3 px-5 py-3 items-start"
              >
                {/* Account picker */}
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1 md:hidden">Account</label>
                  <select
                    {...register(`lines.${idx}.accountId`)}
                    className={cn(
                      'w-full h-9 rounded-lg border bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
                      errors.lines?.[idx]?.accountId ? 'border-danger-400' : 'border-surface-300',
                    )}
                  >
                    <option value="">Select account…</option>
                    {accountOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.lines?.[idx]?.accountId && (
                    <p className="text-xs text-danger-600 mt-0.5">{errors.lines[idx]?.accountId?.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1 md:hidden">Line Description</label>
                  <input
                    {...register(`lines.${idx}.description`)}
                    type="text"
                    placeholder="Line memo (optional)"
                    className="w-full h-9 px-3 rounded-lg border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>

                {/* Debit */}
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1 md:hidden">Debit</label>
                  <input
                    {...register(`lines.${idx}.debit`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-lg border border-surface-300 text-sm bg-white text-right tabular focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>

                {/* Credit */}
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1 md:hidden">Credit</label>
                  <input
                    {...register(`lines.${idx}.credit`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-lg border border-surface-300 text-sm bg-white text-right tabular focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                </div>

                {/* Delete */}
                <div className="flex justify-end md:justify-center items-center">
                  <button
                    type="button"
                    onClick={() => fields.length > 2 && remove(idx)}
                    disabled={fields.length <= 2}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-danger-500 hover:bg-danger-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals footer */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_40px] gap-3 px-5 py-3 bg-surface-50 border-t border-surface-200">
            <div className="md:col-span-2 flex items-center">
              {isBalanced ? (
                <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
                  <CheckIcon className="h-4 w-4" />
                  Balanced
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-danger-600 font-medium">
                  Out of balance by {formatCurrency(Math.abs(difference))}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-500 uppercase tracking-wide mb-0.5">Total Debit</p>
              <p className="text-sm font-bold tabular text-surface-900">{formatCurrency(totalDebit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-500 uppercase tracking-wide mb-0.5">Total Credit</p>
              <p className="text-sm font-bold tabular text-surface-900">{formatCurrency(totalCredit)}</p>
            </div>
            <div />
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/finance')}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="secondary"
              leftIcon={<DocumentIcon className="h-4 w-4" />}
              loading={isSubmitting && saveMode === 'draft'}
              onClick={() => setSaveMode('draft')}
              disabled={!isBalanced || totalDebit === 0}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<CheckIcon className="h-4 w-4" />}
              loading={isSubmitting && saveMode === 'post'}
              onClick={() => setSaveMode('post')}
              disabled={!isBalanced || totalDebit === 0}
            >
              Post Entry
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
