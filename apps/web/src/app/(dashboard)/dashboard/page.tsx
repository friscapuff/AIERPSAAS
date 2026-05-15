'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { KpiCard, Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDashboardKpis, useRevenueChart, useJournalEntries } from '@/hooks/useFinance';
import { useLowStockItems } from '@/hooks/useInventory';
import { useMyPendingTasks } from '@/hooks/useWorkflow';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

// ─── Custom tooltip for chart ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-surface-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-surface-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-surface-600">
          <span className="font-medium">{p.name}:</span>{' '}
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const { data: revenueData, isLoading: chartLoading } = useRevenueChart();
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries({ limit: 10 });
  const { data: lowStock, isLoading: stockLoading } = useLowStockItems();
  const { data: pendingTasks, isLoading: tasksLoading } = useMyPendingTasks();

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(kpis?.totalRevenue ?? 0),
      change: kpis ? `${kpis.revenueChange >= 0 ? '+' : ''}${formatNumber(kpis.revenueChange, 1)}% vs last month` : undefined,
      changeType: (kpis?.revenueChange ?? 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: <ArrowTrendingUpIcon className="h-5 w-5 text-success-600" />,
      iconBg: 'bg-success-50',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(kpis?.totalExpenses ?? 0),
      change: kpis ? `${kpis.expensesChange >= 0 ? '+' : ''}${formatNumber(kpis.expensesChange, 1)}% vs last month` : undefined,
      changeType: (kpis?.expensesChange ?? 0) <= 0 ? 'positive' as const : 'negative' as const,
      icon: <ArrowTrendingDownIcon className="h-5 w-5 text-warning-600" />,
      iconBg: 'bg-warning-50',
    },
    {
      title: 'Net Income',
      value: formatCurrency(kpis?.netIncome ?? 0),
      change: kpis ? `${kpis.netIncomeChange >= 0 ? '+' : ''}${formatNumber(kpis.netIncomeChange, 1)}% vs last month` : undefined,
      changeType: (kpis?.netIncome ?? 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: <BanknotesIcon className="h-5 w-5 text-primary-600" />,
      iconBg: 'bg-primary-50',
    },
    {
      title: 'Cash Balance',
      value: formatCurrency(kpis?.cashBalance ?? 0),
      change: kpis ? `${kpis.cashChange >= 0 ? '+' : ''}${formatNumber(kpis.cashChange, 1)}% vs last month` : undefined,
      changeType: (kpis?.cashChange ?? 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: <CurrencyDollarIcon className="h-5 w-5 text-info-600" />,
      iconBg: 'bg-info-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Financial overview for {formatDate(new Date().toISOString(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/journal/new">
            <Button size="sm" variant="primary">New Journal Entry</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} loading={kpisLoading} />
        ))}
      </div>

      {/* Revenue Chart + Pending Approvals */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart — 2/3 width */}
        <Card className="xl:col-span-2" padding="md">
          <Card.Header
            title="Revenue vs Expenses"
            subtitle="Last 12 months"
            action={
              <Link href="/reports">
                <Button variant="ghost" size="xs">View Reports</Button>
              </Link>
            }
          />
          {chartLoading ? (
            <div className="h-64 bg-surface-100 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={revenueData ?? []}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" name="Expenses" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pending Approvals */}
        <Card padding="md">
          <Card.Header
            title="Pending Approvals"
            subtitle={`${pendingTasks?.length ?? 0} awaiting your action`}
            action={
              <Link href="/workflow">
                <Button variant="ghost" size="xs">View all</Button>
              </Link>
            }
          />
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-surface-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !pendingTasks?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircleIcon className="h-10 w-10 text-success-400 mb-2" />
              <p className="text-sm font-medium text-surface-600">All caught up!</p>
              <p className="text-xs text-surface-400 mt-0.5">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-surface-100 hover:bg-surface-50 transition-colors"
                >
                  <ClockIcon className="h-4 w-4 text-warning-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-800 truncate">{task.entityReference}</p>
                    <p className="text-2xs text-surface-500 truncate">{task.workflowName} — {task.stepName}</p>
                  </div>
                  <Link href="/workflow">
                    <span className="text-2xs text-primary-600 font-medium whitespace-nowrap hover:text-primary-700">
                      Review
                    </span>
                  </Link>
                </div>
              ))}
              {(pendingTasks?.length ?? 0) > 5 && (
                <Link href="/workflow" className="block text-center text-xs text-primary-600 hover:text-primary-700 font-medium pt-1">
                  +{pendingTasks!.length - 5} more tasks
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Journal Entries */}
        <Card className="xl:col-span-2" padding="md">
          <Card.Header
            title="Recent Journal Entries"
            subtitle="Last 10 posted entries"
            action={
              <Link href="/finance">
                <Button variant="ghost" size="xs">View all</Button>
              </Link>
            }
          />
          {entriesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !entriesData?.data?.length ? (
            <p className="text-sm text-surface-400 text-center py-8">No journal entries yet</p>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-surface-100 bg-surface-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-surface-500 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-surface-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {entriesData.data.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-primary-600 font-medium">{entry.reference}</td>
                      <td className="px-5 py-3 text-xs text-surface-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="px-5 py-3 text-xs text-surface-600 hidden md:table-cell max-w-[200px] truncate">{entry.description}</td>
                      <td className="px-5 py-3 text-xs text-surface-900 font-semibold text-right tabular">
                        {formatCurrency(entry.totalDebit)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={entry.status} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card padding="md">
          <Card.Header
            title="Low Stock Alerts"
            subtitle={`${lowStock?.length ?? 0} items below reorder point`}
            action={
              <Link href="/inventory">
                <Button variant="ghost" size="xs">Inventory</Button>
              </Link>
            }
          />
          {stockLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !lowStock?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircleIcon className="h-10 w-10 text-success-400 mb-2" />
              <p className="text-sm font-medium text-surface-600">Stock levels OK</p>
              <p className="text-xs text-surface-400 mt-0.5">No items below reorder point</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 6).map((item) => (
                <div
                  key={`${item.itemId}-${item.warehouseId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-danger-50 border border-danger-100"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 text-danger-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-800 truncate">{item.itemName}</p>
                    <p className="text-2xs text-danger-600">
                      Stock: {item.currentStock} / Min: {item.reorderPoint}
                    </p>
                  </div>
                  <span className="text-2xs text-danger-700 font-bold whitespace-nowrap">
                    -{item.shortage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
