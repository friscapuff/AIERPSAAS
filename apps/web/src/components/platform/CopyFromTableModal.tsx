'use client';

import React, { useState, useMemo } from 'react';
import { TableDefinition } from '@/hooks/useAllTables';

interface CopyFromTableModalProps {
  targetTable: TableDefinition;
  allTables: TableDefinition[];
  onCopy: (rows: Record<string, any>[]) => void;
  onClose: () => void;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export default function CopyFromTableModal({
  targetTable,
  allTables,
  onCopy,
  onClose,
}: CopyFromTableModalProps) {
  const [step, setStep] = useState<'selectTable' | 'mapFields' | 'selectRows'>('selectTable');
  const [sourceTableId, setSourceTableId] = useState('');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [sourceData, setSourceData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  const sourceTable = useMemo(
    () => allTables.find(t => t.id === sourceTableId),
    [allTables, sourceTableId]
  );

  const handleTableSelect = (tableId: string) => {
    setSourceTableId(tableId);
    const table = allTables.find(t => t.id === tableId);
    if (!table) return;

    // Auto-map by matching field names or labels
    const autoMappings: FieldMapping[] = targetTable.fields.map(targetField => {
      const match = table.fields.find(
        sf =>
          sf.name.toLowerCase() === targetField.name.toLowerCase() ||
          sf.label.toLowerCase() === targetField.label.toLowerCase() ||
          sf.name.toLowerCase().replace(/_/g, '') === targetField.name.toLowerCase().replace(/_/g, '')
      );
      return {
        sourceField: match?.name || '',
        targetField: targetField.name,
      };
    });
    setFieldMappings(autoMappings);

    // Load mock data for demo (in production this would be an API call)
    setLoading(true);
    setTimeout(() => {
      const mockRows = Array.from({ length: 5 }, (_, i) => {
        const row: Record<string, any> = {};
        table.fields.forEach(f => {
          if (f.type === 'NUMBER') row[f.name] = i + 1;
          else if (f.type === 'DECIMAL') row[f.name] = (Math.random() * 1000).toFixed(2);
          else if (f.type === 'DATE') row[f.name] = new Date().toISOString().split('T')[0];
          else if (f.type === 'BOOLEAN') row[f.name] = i % 2 === 0;
          else row[f.name] = `${f.label} ${i + 1}`;
        });
        return row;
      });
      setSourceData(mockRows);
      setLoading(false);
    }, 500);

    setStep('mapFields');
  };

  const handleMappingChange = (targetField: string, sourceField: string) => {
    setFieldMappings(prev =>
      prev.map(m => (m.targetField === targetField ? { ...m, sourceField } : m))
    );
  };

  const handleRowToggle = (index: number) => {
    setSelectedRows(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === sourceData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(sourceData.map((_, i) => i));
    }
  };

  const handleCopy = () => {
    const activeMappings = fieldMappings.filter(m => m.sourceField);
    const mappedRows = selectedRows.map(idx => {
      const sourceRow = sourceData[idx];
      const targetRow: Record<string, any> = {};
      activeMappings.forEach(mapping => {
        targetRow[mapping.targetField] = sourceRow[mapping.sourceField];
      });
      return targetRow;
    });
    onCopy(mappedRows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Copy from Table
            </h3>
            <p className="text-sm text-gray-500">
              Copy rows into: <span className="font-medium text-blue-600">{targetTable.label}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {['Select Source', 'Map Fields', 'Select Rows'].map((label, i) => {
            const stepNames = ['selectTable', 'mapFields', 'selectRows'];
            const isActive = stepNames[i] === step;
            const isDone = stepNames.indexOf(step) > i;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${isActive ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 2 && <span className="text-gray-300 mx-2">→</span>}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Source Table */}
          {step === 'selectTable' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select the table you want to copy data from:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {allTables
                  .filter(t => t.id !== targetTable.id)
                  .map(table => (
                    <button
                      key={table.id}
                      onClick={() => handleTableSelect(table.id)}
                      className={`p-4 border-2 rounded-xl text-left transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
                        sourceTableId === table.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          table.isSystem
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        }`}>
                          {table.isSystem ? 'System' : 'Custom'}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{table.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{table.fields.length} fields</p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Step 2: Map Fields */}
          {step === 'mapFields' && sourceTable && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Map fields from <span className="font-medium">{sourceTable.label}</span> to <span className="font-medium">{targetTable.label}</span>:
              </p>
              <div className="space-y-3">
                {fieldMappings.map(mapping => (
                  <div key={mapping.targetField} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={mapping.sourceField}
                        onChange={(e) => handleMappingChange(mapping.targetField, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Skip —</option>
                        {sourceTable.fields.map(f => (
                          <option key={f.name} value={f.name}>{f.label} ({f.type})</option>
                        ))}
                      </select>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {targetTable.fields.find(f => f.name === mapping.targetField)?.label || mapping.targetField}
                      <span className="text-xs text-gray-400 ml-2">
                        ({targetTable.fields.find(f => f.name === mapping.targetField)?.type})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Rows */}
          {step === 'selectRows' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select rows to copy ({selectedRows.length} of {sourceData.length} selected)
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedRows.length === sourceData.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading data...</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === sourceData.length}
                            onChange={handleSelectAll}
                            className="rounded"
                          />
                        </th>
                        {sourceTable?.fields.slice(0, 5).map(f => (
                          <th key={f.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {sourceData.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`cursor-pointer ${
                            selectedRows.includes(idx)
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => handleRowToggle(idx)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(idx)}
                              onChange={() => handleRowToggle(idx)}
                              className="rounded"
                            />
                          </td>
                          {sourceTable?.fields.slice(0, 5).map(f => (
                            <td key={f.name} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                              {row[f.name] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => {
              if (step === 'mapFields') setStep('selectTable');
              else if (step === 'selectRows') setStep('mapFields');
              else onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            {step === 'selectTable' ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 'mapFields' && (
              <button
                onClick={() => setStep('selectRows')}
                disabled={!fieldMappings.some(m => m.sourceField)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Rows
              </button>
            )}
            {step === 'selectRows' && (
              <button
                onClick={handleCopy}
                disabled={selectedRows.length === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy {selectedRows.length} Rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
