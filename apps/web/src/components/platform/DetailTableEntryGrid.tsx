'use client';

import React, { useState } from 'react';
import { TableDefinition } from '@/hooks/useAllTables';
import BulkEntryToolbar from './BulkEntryToolbar';

interface DetailTableEntryGridProps {
  table: TableDefinition;
  allTables: TableDefinition[];
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
}

export default function DetailTableEntryGrid({
  table,
  allTables,
  rows,
  onChange,
}: DetailTableEntryGridProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);

  const handleCellChange = (rowIndex: number, fieldName: string, value: any) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [fieldName]: value };
    onChange(updated);
  };

  const handleDeleteRow = (rowIndex: number) => {
    onChange(rows.filter((_, i) => i !== rowIndex));
  };

  const handleImportData = (newRows: Record<string, any>[]) => {
    if (newRows.length === 1 && Object.keys(newRows[0]).length === 0) {
      // Add empty row
      const emptyRow: Record<string, any> = {};
      table.fields.forEach(f => { emptyRow[f.name] = ''; });
      onChange([...rows, emptyRow]);
    } else {
      onChange([...rows, ...newRows]);
    }
  };

  const handleCopyData = (newRows: Record<string, any>[]) => {
    onChange([...rows, ...newRows]);
  };

  const visibleFields = table.fields.filter(f => f.name !== 'id');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {table.label}
          <span className="ml-2 text-xs text-gray-400 font-normal">({rows.length} rows)</span>
        </h4>
      </div>

      <BulkEntryToolbar
        targetTable={table}
        allTables={allTables}
        onImportData={handleImportData}
        onCopyData={handleCopyData}
      />

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10">#</th>
                {visibleFields.map(f => (
                  <th key={f.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {f.label}
                    <span className="text-gray-300 ml-1 lowercase">({f.type})</span>
                  </th>
                ))}
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-2 py-1.5 text-gray-400 text-xs">{rowIdx + 1}</td>
                  {visibleFields.map(field => (
                    <td
                      key={field.name}
                      className="px-1 py-1"
                      onDoubleClick={() => setEditingCell({ row: rowIdx, field: field.name })}
                    >
                      {editingCell?.row === rowIdx && editingCell?.field === field.name ? (
                        <input
                          autoFocus
                          type={field.type === 'NUMBER' || field.type === 'DECIMAL' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                          value={row[field.name] ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, field.name, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          step={field.type === 'DECIMAL' ? '0.01' : undefined}
                        />
                      ) : (
                        <div className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 min-h-[28px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          {row[field.name] || <span className="text-gray-300">—</span>}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Delete row"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-500">No rows yet. Use the toolbar above to add data.</p>
        </div>
      )}
    </div>
  );
}
