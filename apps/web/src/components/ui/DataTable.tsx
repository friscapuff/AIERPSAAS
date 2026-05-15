'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────
export type { ColumnDef };

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  onSelectionChange?: (selected: TData[]) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  className?: string;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-surface-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DataTable<TData extends object>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search…',
  selectable = false,
  onSelectionChange,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  emptyMessage = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  toolbar,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Add selection column if needed
  const tableColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: '_select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="h-4 w-4 rounded border-surface-300 text-primary-600"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-surface-300 text-primary-600"
          />
        ),
        size: 40,
        enableSorting: false,
      },
      ...columns,
    ];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onSelectionChange) {
        const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
        const selectedRows = Object.keys(newSelection)
          .filter((k) => newSelection[k])
          .map((k) => data[parseInt(k)]);
        onSelectionChange(selectedRows);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    enableRowSelection: selectable,
  });

  const totalSelected = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchable && (
            <div className="relative max-w-xs w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-surface-300 text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>
          )}
          {totalSelected > 0 && (
            <span className="text-xs text-surface-500 whitespace-nowrap">
              {totalSelected} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          {/* Column visibility toggle */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
              onClick={() => setShowColumnToggle((v) => !v)}
            >
              Columns
            </Button>
            {showColumnToggle && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-surface-200 shadow-lg p-2 min-w-[160px]">
                {table.getAllLeafColumns().filter((c) => c.id !== '_select').map((col) => (
                  <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="h-3.5 w-3.5 rounded border-surface-300 text-primary-600"
                    />
                    <span className="text-xs text-surface-700 capitalize">
                      {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-surface-100 bg-surface-50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wide whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-surface-900',
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-1">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUpIcon className="h-3 w-3 text-primary-600" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDownIcon className="h-3 w-3 text-primary-600" />
                          ) : (
                            <ChevronUpIcon className="h-3 w-3 text-surface-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={tableColumns.length} />
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={tableColumns.length} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-surface-500">{emptyMessage}</p>
                  <p className="text-xs text-surface-400 mt-1">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'hover:bg-surface-50 transition-colors duration-100',
                    row.getIsSelected() && 'bg-primary-50',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-surface-800">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">Rows per page</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-7 px-2 rounded border border-surface-300 text-xs text-surface-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-surface-500">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({table.getFilteredRowModel().rows.length} rows)
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              leftIcon={<ChevronLeftIcon className="h-4 w-4" />}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              rightIcon={<ChevronRightIcon className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
