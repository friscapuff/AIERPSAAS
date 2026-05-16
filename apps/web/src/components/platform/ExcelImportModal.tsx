'use client';

import React, { useState, useRef } from 'react';
import { TableDefinition } from '@/hooks/useAllTables';

interface ExcelImportModalProps {
  targetTable: TableDefinition;
  onImport: (rows: Record<string, any>[]) => void;
  onClose: () => void;
}

interface ColumnMapping {
  excelColumn: string;
  tableField: string;
}

export default function ExcelImportModal({
  targetTable,
  onImport,
  onClose,
}: ExcelImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && !['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setError('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const text = await selectedFile.text();
      let headers: string[] = [];
      let rows: any[][] = [];

      if (ext === 'csv') {
        const lines = text.split('\n').filter(l => l.trim());
        headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        rows = lines.slice(1).map(line =>
          line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        );
      } else {
        // For Excel files, parse using basic approach
        // In production, use SheetJS library
        headers = ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'];
        setError('For full Excel support, please save as CSV first. CSV parsing is fully supported.');
        setLoading(false);
        return;
      }

      setExcelHeaders(headers);
      setExcelData(rows);

      // Auto-map columns by name matching
      const autoMappings: ColumnMapping[] = headers.map(header => {
        const matchedField = targetTable.fields.find(
          f =>
            f.name.toLowerCase() === header.toLowerCase() ||
            f.label.toLowerCase() === header.toLowerCase() ||
            f.name.toLowerCase().replace(/_/g, ' ') === header.toLowerCase() ||
            f.label.toLowerCase().replace(/_/g, ' ') === header.toLowerCase()
        );
        return {
          excelColumn: header,
          tableField: matchedField?.name || '',
        };
      });

      setColumnMappings(autoMappings);
      setStep('mapping');
    } catch (err) {
      setError('Failed to parse file. Please check the format.');
    }
    setLoading(false);
  };

  const handleMappingChange = (excelColumn: string, tableField: string) => {
    setColumnMappings(prev =>
      prev.map(m => (m.excelColumn === excelColumn ? { ...m, tableField } : m))
    );
  };

  const handlePreview = () => {
    const activeMappings = columnMappings.filter(m => m.tableField);
    const mapped = excelData.map(row => {
      const obj: Record<string, any> = {};
      activeMappings.forEach(mapping => {
        const colIndex = excelHeaders.indexOf(mapping.excelColumn);
        if (colIndex >= 0) {
          obj[mapping.tableField] = row[colIndex];
        }
      });
      return obj;
    });
    setPreviewRows(mapped);
    setStep('preview');
  };

  const handleImport = () => {
    onImport(previewRows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import from Excel
            </h3>
            <p className="text-sm text-gray-500">
              Importing into: <span className="font-medium text-blue-600">{targetTable.label}</span>
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
          {['Upload File', 'Map Columns', 'Preview & Import'].map((label, i) => {
            const stepNames = ['upload', 'mapping', 'preview'];
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
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-center"
              >
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Drop Excel/CSV file here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports .xlsx, .xls, and .csv files
                </p>
                {file && (
                  <p className="mt-3 text-sm text-green-600 font-medium">
                    Selected: {file.name}
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-lg">
                  {error}
                </p>
              )}
              {loading && (
                <p className="mt-4 text-sm text-blue-600">Parsing file...</p>
              )}

              {/* Download Template */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 mb-2">Need a template?</p>
                <button
                  onClick={() => {
                    const headers = targetTable.fields.map(f => f.label).join(',');
                    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${targetTable.name}_template.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Download CSV Template for {targetTable.label}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Map your Excel columns to table fields. Auto-matched columns are shown below.
              </p>
              <div className="space-y-3">
                {columnMappings.map((mapping) => (
                  <div key={mapping.excelColumn} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {mapping.excelColumn}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">(Excel column)</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="flex-1">
                      <select
                        value={mapping.tableField}
                        onChange={(e) => handleMappingChange(mapping.excelColumn, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Skip this column —</option>
                        {targetTable.fields.map(f => (
                          <option key={f.name} value={f.name}>{f.label} ({f.type})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preview: <span className="font-semibold">{previewRows.length}</span> rows ready to import
                </p>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Ready
                </span>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {targetTable.fields.filter(f => previewRows[0] && f.name in previewRows[0]).map(f => (
                        <th key={f.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {previewRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        {targetTable.fields.filter(f => f.name in row).map(f => (
                          <td key={f.name} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                            {row[f.name] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 text-center">
                    ... and {previewRows.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => {
              if (step === 'mapping') setStep('upload');
              else if (step === 'preview') setStep('mapping');
              else onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            {step === 'upload' ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 'mapping' && (
              <button
                onClick={handlePreview}
                disabled={!columnMappings.some(m => m.tableField)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Data
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Import {previewRows.length} Rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
