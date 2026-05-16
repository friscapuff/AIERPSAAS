'use client';

import React, { useState } from 'react';
import ExcelImportModal from './ExcelImportModal';
import CopyFromTableModal from './CopyFromTableModal';
import { TableDefinition } from '@/hooks/useAllTables';

interface BulkEntryToolbarProps {
  targetTable: TableDefinition;
  allTables: TableDefinition[];
  onImportData: (rows: Record<string, any>[]) => void;
  onCopyData: (rows: Record<string, any>[]) => void;
}

export default function BulkEntryToolbar({
  targetTable,
  allTables,
  onImportData,
  onCopyData,
}: BulkEntryToolbarProps) {
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">
          Bulk Entry:
        </span>
        <button
          onClick={() => setShowExcelModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import from Excel
        </button>
        <button
          onClick={() => setShowCopyModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy from Table
        </button>
        <button
          onClick={() => onImportData([{}])}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Row
        </button>
      </div>

      {showExcelModal && (
        <ExcelImportModal
          targetTable={targetTable}
          onImport={(rows) => {
            onImportData(rows);
            setShowExcelModal(false);
          }}
          onClose={() => setShowExcelModal(false)}
        />
      )}

      {showCopyModal && (
        <CopyFromTableModal
          targetTable={targetTable}
          allTables={allTables}
          onCopy={(rows) => {
            onCopyData(rows);
            setShowCopyModal(false);
          }}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </>
  );
}
