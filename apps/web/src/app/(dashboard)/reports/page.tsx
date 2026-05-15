'use client';

import React, { useState } from 'react';
import {
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/FormField';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { useGenerateReport, type ReportParams } from '@/hooks/useFinance';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Report type definitions ──────────────────────────────────────────────────
const REPORT_TYPES = [
  { label: 'Trial Balance', value: 'TRIAL_BALANCE', description: 'List all accounts with their debit/credit balances' },
  { label: 'Income Statement', value: 'INCOME_STATEMENT', description: 'Revenue and expense summary for a period' },
  { label: 'Balance Sheet', value: 'BALANCE_SHEET', description: 'Assets, liabilities, and equity at a point in time' },
  { label: 'Cash Flow Statement', value: 'CASH_FLOW', description: 'Cash movements by operating, investing, and financing activities' },
  { label: 'General Ledger Detail', value: 'GL_DETAIL', description: 'All transactions for each account in detail' },
] as const;

type ReportType = typeof REPORT_TYPES[number]['value'];

// ─── Report result display ────────────────────────────────────────────────────
interface ReportRow {
  accountCode?: string;
  accountName: string;
  debit?: number;
  credit?: number;
  balance?: number;
  section?: string;
}

const reportColumns: ColumnDef<ReportRow, unknown>[] = [
  {
    accessorKey: 'section',
    header: 'Section',
    cell: ({ getValue }) => {
      const v = String(getValue() ?? '');
      return v ? (
        <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">{v}</span>
      ) : null;
    },
  },
  {
    accessorKey: 'accountCode',
    header: 'Account Code',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-surface-500">{String(getValue() ?? '')}</span>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Account Name',
    cell: ({ row, getValue }) => {
      const hasCode = !!row.original.accountCode;
      return (
        <span className={cn('text-sm', hasCode ? 'text-surface-800' : 'font-semibold text-surface-900')}>
          {String(getValue())}
        </span>
      );
    },
  },
  {
    accessorKey: 'debit',
    header: 'Debit',
    cell: ({ getValue }) => {
      const v = getValue();
      return v !== undefined && v !== null ? (
        <span className="text-sm tabular text-right block">{formatCurrency(Number(v))}</span>
      ) : null;
    },
  },
  {
    accessorKey: 'credit',
    header: 'Credit',
    cell: ({ getValue }) => {
      const v = getValue();
      return v !== undefined && v !== null ? (
        <span className="text-sm tabular text-right block">{formatCurrency(Number(v))}</span>
      ) : null;
    },
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ getValue, row }) => {
      const v = getValue();
      if (v === undefined || v === null) return null;
      const num = Number(v);
      const hasCode = !!row.original.accountCode;
      return (
        <span className={cn(
          'text-sm tabular text-right block font-semibold',
          !hasCode && 'text-surface-900',
          num < 0 ? 'text-danger-600' : num > 0 ? 'text-surface-900' : 'text-surface-400',
        )}>
          {formatCurrency(num)}
        </span>
      );
    },
  },
];

// ─── Saved report card ────────────────────────────────────────────────────────
function SavedReportCard({
  title,
  type,
  date,
  onLoad,
}: {
  title: string;
  type: string;
  date: string;
  onLoad: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 hover:bg-surface-50 cursor-pointer transition-colors"
      onClick={onLoad}
    >
      <DocumentChartBarIcon className="h-8 w-8 text-primary-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-800 truncate">{title}</p>
        <p className="text-xs text-surface-400 mt-0.5">{type} · {date}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('TRIAL_BALANCE');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1, 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(0); // last day of last month
    return d.toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);

  const generateReport = useGenerateReport();

  const selectedType = REPORT_TYPES.find((r) => r.value === reportType);

  const handleGenerate = async () => {
    try {
      const result = await generateReport.mutateAsync({
        type: reportType,
        startDate,
        endDate,
      });
      setReportData(result.data as ReportRow[]);
      notify.success(`${selectedType?.label} generated successfully.`);
    } catch {
      notify.error('Failed to generate report. Check the date range and try again.');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    notify.info(`Exporting as ${format.toUpperCase()}… (feature coming soon)`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-surface-900">Reports</h1>
        <p className="text-sm text-surface-500 mt-0.5">Generate financial reports and export data</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Report configurator (left panel) */}
        <div className="xl:col-span-1 space-y-4">
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-900 mb-4">Configure Report</h2>

            {/* Report type selector */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-medium text-surface-700">Report Type</label>
              <div className="space-y-1.5">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    onClick={() => { setReportType(rt.value); setReportData(null); }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors',
                      reportType === rt.value
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50',
                    )}
                  >
                    <p className="font-medium">{rt.label}</p>
                    <p className="text-surface-400 mt-0.5 leading-snug">{rt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-3">
              <Input
                label="From Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="To Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button
              fullWidth
              className="mt-4"
              leftIcon={<PlayIcon className="h-4 w-4" />}
              loading={generateReport.isPending}
              onClick={handleGenerate}
            >
              Generate Report
            </Button>

            {reportData && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  onClick={() => handleExport('excel')}
                >
                  Excel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  onClick={() => handleExport('pdf')}
                >
                  PDF
                </Button>
              </div>
            )}
          </Card>

          {/* Saved reports */}
          <Card padding="md">
            <h2 className="text-sm font-semibold text-surface-900 mb-3">Recent Reports</h2>
            <div className="space-y-2">
              <SavedReportCard
                title="Trial Balance — April 2026"
                type="Trial Balance"
                date={formatDate(new Date().toISOString())}
                onLoad={() => notify.info('Loading saved report…')}
              />
              <SavedReportCard
                title="Income Statement Q1 2026"
                type="Income Statement"
                date={formatDate(new Date().toISOString())}
                onLoad={() => notify.info('Loading saved report…')}
              />
              <SavedReportCard
                title="Balance Sheet — Mar 2026"
                type="Balance Sheet"
                date={formatDate(new Date().toISOString())}
                onLoad={() => notify.info('Loading saved report…')}
              />
            </div>
          </Card>
        </div>

        {/* Report results (right panel) */}
        <div className="xl:col-span-3">
          {!reportData ? (
            <Card padding="lg" className="flex flex-col items-center justify-center h-64">
              <DocumentChartBarIcon className="h-12 w-12 text-surface-300 mb-3" />
              <h3 className="text-sm font-semibold text-surface-600">No report generated yet</h3>
              <p className="text-xs text-surface-400 mt-1">
                Select a report type and date range, then click Generate
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Report header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-surface-900">{selectedType?.label}</h2>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {formatDate(startDate)} — {formatDate(endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                    onClick={() => handleExport('excel')}
                  >
                    Export Excel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                    onClick={() => handleExport('pdf')}
                  >
                    Export PDF
                  </Button>
                </div>
              </div>

              <DataTable
                data={reportData}
                columns={reportColumns}
                searchable={false}
                pageSize={50}
                emptyMessage="No data in this report"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
