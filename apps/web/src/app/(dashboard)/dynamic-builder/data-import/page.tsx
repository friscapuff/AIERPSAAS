'use client';

import { useState } from 'react';
import { useAllTablesGrouped, TableDefinition } from '@/hooks/useAllTables';
import DetailTableEntryGrid from '@/components/platform/DetailTableEntryGrid';

export default function DataImportPage() {
  const { systemTables, dynamicTables, allTables } = useAllTablesGrouped();
  const [selectedTable, setSelectedTable] = useState<TableDefinition | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleSave = async () => {
    if (!selectedTable || rows.length === 0) return;
    setSaving(true);
    try {
      // In production, this would call the API to save rows
      // POST /api/v1/dynamic-builder/tables/{tableName}/rows
      const response = await fetch(`/api/v1/dynamic-builder/tables/${selectedTable.name}/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (response.ok) {
        setSavedCount(rows.length);
        setRows([]);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Data Import & Bulk Entry
        </h1>
        <p className="mt-1 text-gray-500">
          Import data via Excel/CSV, copy from other tables, or add rows manually
        </p>
      </div>

      {/* Table Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Target Table
        </label>
        <select
          value={selectedTable?.id || ''}
          onChange={(e) => {
            const table = allTables.find(t => t.id === e.target.value);
            setSelectedTable(table || null);
            setRows([]);
            setSavedCount(0);
          }}
          className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">— Select a table —</option>
          <optgroup label="System Tables">
            {systemTables.map(t => (
              <option key={t.id} value={t.id}>{t.label} ({t.fields.length} fields)</option>
            ))}
          </optgroup>
          {dynamicTables.length > 0 && (
            <optgroup label="Custom Tables">
              {dynamicTables.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.fields.length} fields)</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Success message */}
      {savedCount > 0 && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            Successfully imported {savedCount} rows into {selectedTable?.label}.
          </p>
        </div>
      )}

      {/* Data Entry Grid */}
      {selectedTable ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <DetailTableEntryGrid
              table={selectedTable}
              allTables={allTables}
              rows={rows}
              onChange={setRows}
            />
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{rows.length}</strong> rows ready to import into <strong>{selectedTable.label}</strong>
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : `Save ${rows.length} Rows`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <p className="mt-4 text-lg text-gray-500">Select a table above to start importing data</p>
          <p className="mt-2 text-sm text-gray-400">
            You can import from Excel/CSV files, copy from other tables, or add rows manually
          </p>
        </div>
      )}

      {/* Quick-access cards for common imports */}
      {!selectedTable && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Common Imports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { table: systemTables.find(t => t.name === 'chart_of_accounts'), desc: 'Import your full chart of accounts from Excel' },
              { table: systemTables.find(t => t.name === 'inventory_items'), desc: 'Bulk-load inventory items with quantities and costs' },
              { table: systemTables.find(t => t.name === 'sales_order_lines'), desc: 'Import sales order line items in bulk' },
            ].filter(item => item.table).map(({ table, desc }) => (
              <button
                key={table!.id}
                onClick={() => { setSelectedTable(table!); setRows([]); setSavedCount(0); }}
                className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
              >
                <p className="font-medium text-gray-900 dark:text-white">{table!.label}</p>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
                <p className="text-xs text-blue-600 mt-2">{table!.fields.length} fields available</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
