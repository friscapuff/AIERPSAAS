'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  TableCellsIcon,
  CheckCircleIcon,
  CogIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
  DocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { notify } from '@/components/ui/Toast';
import { useAllTablesGrouped, TableDefinition } from '@/hooks/useAllTables';
import {
  useScreens,
  useValidationRules,
  useApprovalRules,
} from '@/hooks/useDynamicPlatform';
import DetailTableEntryGrid from '@/components/platform/DetailTableEntryGrid';

const STEPS = [
  { number: 1, label: 'Header Table', icon: TableCellsIcon },
  { number: 2, label: 'Detail Tables', icon: TableCellsIcon },
  { number: 3, label: 'Data Entry', icon: CircleStackIcon },
  { number: 4, label: 'Configure', icon: CogIcon },
  { number: 5, label: 'Validation', icon: ShieldCheckIcon },
  { number: 6, label: 'Approval', icon: ClipboardDocumentCheckIcon },
  { number: 7, label: 'Publish', icon: MapPinIcon },
  { number: 8, label: 'Review', icon: DocumentCheckIcon },
];

interface ValidationRule {
  id?: string;
  field: string;
  operator: string;
  value: string;
  errorMessage: string;
  enabled: boolean;
  isNew?: boolean;
}

interface ApprovalRule {
  id?: string;
  triggerStatus: string;
  levels: { role: string }[];
  targetStatus: string;
  enabled: boolean;
  isNew?: boolean;
}

export default function ScreenWizardPage() {
  const router = useRouter();
  const { systemTables, dynamicTables, allTables } = useAllTablesGrouped();
  const { createScreen } = useScreens();
  const { rules: existingValidations } = useValidationRules();
  const { rules: existingApprovals } = useApprovalRules();

  const [currentStep, setCurrentStep] = useState(1);
  const [headerTable, setHeaderTable] = useState&lt;TableDefinition | null&gt;(null);
  const [detailTables, setDetailTables] = useState&lt;TableDefinition[]&gt;([]);

  // Step 3: Data Entry rows per table
  const [tableData, setTableData] = useState&lt;Record&lt;string, Record&lt;string, any&gt;[]&gt;&gt;({});

  // Step 4 state
  const [screenName, setScreenName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [screenType, setScreenType] = useState('form_and_list');
  const [icon, setIcon] = useState('');
  const [includedFields, setIncludedFields] = useState&lt;Record&lt;string, boolean&gt;&gt;({});

  // Step 5 state
  const [validationRules, setValidationRules] = useState&lt;ValidationRule[]&gt;([]);
  const [showNewValidation, setShowNewValidation] = useState(false);
  const [newValidation, setNewValidation] = useState&lt;ValidationRule&gt;({
    field: '',
    operator: 'required',
    value: '',
    errorMessage: '',
    enabled: true,
    isNew: true,
  });

  // Step 6 state
  const [approvalRules, setApprovalRules] = useState&lt;ApprovalRule[]&gt;([]);
  const [showNewApproval, setShowNewApproval] = useState(false);
  const [newApproval, setNewApproval] = useState&lt;ApprovalRule&gt;({
    triggerStatus: '',
    levels: [{ role: '' }],
    targetStatus: '',
    enabled: true,
    isNew: true,
  });

  // Step 7 state
  const [publishLocation, setPublishLocation] = useState('operations');
  const [customGroup, setCustomGroup] = useState('');
  const [addToSidebar, setAddToSidebar] = useState(true);

  const [isCreating, setIsCreating] = useState(false);

  // Compute all fields from selected tables
  const allSelectedFields = useMemo(() =&gt; {
    const tables = [headerTable, ...detailTables].filter(Boolean) as TableDefinition[];
    return tables.flatMap((t) =&gt;
      t.fields.map((f) =&gt; ({
        ...f,
        tableName: t.name,
        tableLabel: t.label,
        key: `${t.name}.${f.name}`,
      }))
    );
  }, [headerTable, detailTables]);

  // Initialize included fields when tables change
  useMemo(() =&gt; {
    const fields: Record&lt;string, boolean&gt; = {};
    allSelectedFields.forEach((f) =&gt; {
      fields[f.key] = includedFields[f.key] ?? true;
    });
    setIncludedFields(fields);
  }, [allSelectedFields]);

  // All tables that have data entry (header + details)
  const dataEntryTables = useMemo(() =&gt; {
    const tables: TableDefinition[] = [];
    if (headerTable) tables.push(headerTable);
    tables.push(...detailTables);
    return tables;
  }, [headerTable, detailTables]);

  // Auto-generate screen name from header table
  const handleHeaderSelect = (table: TableDefinition) =&gt; {
    setHeaderTable(table);
    if (!screenName) {
      setScreenName(`${table.name}_screen`);
      setDisplayName(table.label);
    }
  };

  const handleDetailToggle = (table: TableDefinition) =&gt; {
    setDetailTables((prev) =&gt;
      prev.some((t) =&gt; t.id === table.id)
        ? prev.filter((t) =&gt; t.id !== table.id)
        : [...prev, table]
    );
  };

  const handleFieldToggle = (key: string) =&gt; {
    setIncludedFields((prev) =&gt; ({ ...prev, [key]: !prev[key] }));
  };

  const handleTableDataChange = (tableId: string, rows: Record&lt;string, any&gt;[]) =&gt; {
    setTableData((prev) =&gt; ({ ...prev, [tableId]: rows }));
  };

  const addValidationRule = () =&gt; {
    if (!newValidation.field || !newValidation.errorMessage) {
      notify.error('Field and error message are required');
      return;
    }
    setValidationRules((prev) =&gt; [...prev, { ...newValidation }]);
    setNewValidation({ field: '', operator: 'required', value: '', errorMessage: '', enabled: true, isNew: true });
    setShowNewValidation(false);
  };

  const removeValidationRule = (index: number) =&gt; {
    setValidationRules((prev) =&gt; prev.filter((_, i) =&gt; i !== index));
  };

  const addApprovalRule = () =&gt; {
    if (!newApproval.triggerStatus || !newApproval.levels[0]?.role) {
      notify.error('Trigger status and at least one approval level are required');
      return;
    }
    setApprovalRules((prev) =&gt; [...prev, { ...newApproval }]);
    setNewApproval({ triggerStatus: '', levels: [{ role: '' }], targetStatus: '', enabled: true, isNew: true });
    setShowNewApproval(false);
  };

  const removeApprovalRule = (index: number) =&gt; {
    setApprovalRules((prev) =&gt; prev.filter((_, i) =&gt; i !== index));
  };

  const addApprovalLevel = () =&gt; {
    setNewApproval((prev) =&gt; ({
      ...prev,
      levels: [...prev.levels, { role: '' }],
    }));
  };

  const handleCreate = async () =&gt; {
    setIsCreating(true);
    try {
      await createScreen({
        name: screenName,
        displayName,
        description,
        screenType,
        icon,
        headerTable: headerTable!.name,
        detailTables: detailTables.map((t) =&gt; t.name),
        fields: Object.entries(includedFields)
          .filter(([, included]) =&gt; included)
          .map(([key]) =&gt; key),
        validationRules: validationRules.filter((r) =&gt; r.enabled),
        approvalRules: approvalRules.filter((r) =&gt; r.enabled),
        publishLocation: publishLocation === 'custom' ? customGroup : publishLocation,
        addToSidebar,
        initialData: tableData,
      });
      notify.success('Screen created successfully!');
      router.push('/dynamic-builder/screens');
    } catch (error: any) {
      notify.error(error?.message || 'Failed to create screen');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () =&gt; {
    switch (currentStep) {
      case 1:
        return !!headerTable;
      case 2:
        return true; // optional
      case 3:
        return true; // optional data entry
      case 4:
        return !!screenName &amp;&amp; !!displayName;
      case 5:
        return true;
      case 6:
        return true;
      case 7:
        return publishLocation !== 'custom' || !!customGroup;
      case 8:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () =&gt; {
    if (currentStep &lt; 8) setCurrentStep(currentStep + 1);
  };

  const handleBack = () =&gt; {
    if (currentStep &gt; 1) setCurrentStep(currentStep - 1);
  };

  // Available tables for detail selection (exclude header)
  const availableForDetail = allTables.filter((t) =&gt; t.id !== headerTable?.id);

  // Group fields by table for Step 4
  const fieldsByTable = useMemo(() =&gt; {
    const grouped: Record&lt;string, typeof allSelectedFields&gt; = {};
    allSelectedFields.forEach((f) =&gt; {
      if (!grouped[f.tableLabel]) grouped[f.tableLabel] = [];
      grouped[f.tableLabel].push(f);
    });
    return grouped;
  }, [allSelectedFields]);

  const renderTableCard = (
    table: TableDefinition,
    isSelected: boolean,
    onClick: () =&gt; void,
    multiSelect?: boolean
  ) =&gt; (
    &lt;Card
      key={table.id}
      className={`cursor-pointer p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-950'
          : 'border border-surface-200 dark:border-surface-700'
      }`}
      onClick={onClick}
    &gt;
      &lt;div className="flex items-center gap-3"&gt;
        {multiSelect &amp;&amp; (
          &lt;input
            type="checkbox"
            checked={isSelected}
            onChange={() =&gt; {}}
            className="h-4 w-4 rounded border-surface-300 text-primary-600"
          /&gt;
        )}
        &lt;TableCellsIcon className="h-8 w-8 text-primary-500" /&gt;
        &lt;div className="flex-1"&gt;
          &lt;p className="font-medium text-surface-900 dark:text-surface-100"&gt;{table.label}&lt;/p&gt;
          &lt;p className="text-sm text-surface-500"&gt;{table.name}&lt;/p&gt;
        &lt;/div&gt;
        &lt;Badge variant="secondary"&gt;{table.fields.length} fields&lt;/Badge&gt;
      &lt;/div&gt;
    &lt;/Card&gt;
  );

  const renderStepIndicator = () =&gt; (
    &lt;div className="mb-8 flex items-center justify-center"&gt;
      {STEPS.map((step, index) =&gt; (
        &lt;div key={step.number} className="flex items-center"&gt;
          &lt;div className="flex flex-col items-center"&gt;
            &lt;div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                currentStep &gt; step.number
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : currentStep === step.number
                  ? 'border-primary-500 bg-white text-primary-500 dark:bg-surface-800'
                  : 'border-surface-300 bg-white text-surface-400 dark:border-surface-600 dark:bg-surface-800'
              }`}
            &gt;
              {currentStep &gt; step.number ? (
                &lt;CheckCircleIcon className="h-6 w-6" /&gt;
              ) : (
                step.number
              )}
            &lt;/div&gt;
            &lt;span
              className={`mt-1 text-xs ${
                currentStep &gt;= step.number ? 'text-primary-600 font-medium' : 'text-surface-400'
              }`}
            &gt;
              {step.label}
            &lt;/span&gt;
          &lt;/div&gt;
          {index &lt; STEPS.length - 1 &amp;&amp; (
            &lt;div
              className={`mx-2 h-0.5 w-10 ${
                currentStep &gt; step.number ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'
              }`}
            /&gt;
          )}
        &lt;/div&gt;
      ))}
    &lt;/div&gt;
  );

  const renderStep1 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Select Header Table
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Choose the main table for your screen (e.g., sales_orders, purchase_orders)
        &lt;/p&gt;
      &lt;/div&gt;

      {systemTables.length &gt; 0 &amp;&amp; (
        &lt;div&gt;
          &lt;h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500"&gt;
            System Tables
          &lt;/h3&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"&gt;
            {systemTables.map((table) =&gt;
              renderTableCard(table, headerTable?.id === table.id, () =&gt; handleHeaderSelect(table))
            )}
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      {dynamicTables.length &gt; 0 &amp;&amp; (
        &lt;div&gt;
          &lt;h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500"&gt;
            Custom Tables
          &lt;/h3&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"&gt;
            {dynamicTables.map((table) =&gt;
              renderTableCard(table, headerTable?.id === table.id, () =&gt; handleHeaderSelect(table))
            )}
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      &lt;p className="text-sm text-surface-400"&gt;
        Don&amp;apos;t see your table?{' '}
        &lt;a href="/dynamic-builder" className="text-primary-500 hover:underline"&gt;
          Create one in Dynamic Builder
        &lt;/a&gt;
      &lt;/p&gt;
    &lt;/div&gt;
  );

  const renderStep2 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Select Detail &amp;amp; Items Tables
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Choose related tables for line items, details, or child records
        &lt;/p&gt;
      &lt;/div&gt;

      {availableForDetail.filter((t) =&gt; t.isSystem).length &gt; 0 &amp;&amp; (
        &lt;div&gt;
          &lt;h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500"&gt;
            System Tables
          &lt;/h3&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"&gt;
            {availableForDetail
              .filter((t) =&gt; t.isSystem)
              .map((table) =&gt;
                renderTableCard(
                  table,
                  detailTables.some((d) =&gt; d.id === table.id),
                  () =&gt; handleDetailToggle(table),
                  true
                )
              )}
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      {availableForDetail.filter((t) =&gt; !t.isSystem).length &gt; 0 &amp;&amp; (
        &lt;div&gt;
          &lt;h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500"&gt;
            Custom Tables
          &lt;/h3&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"&gt;
            {availableForDetail
              .filter((t) =&gt; !t.isSystem)
              .map((table) =&gt;
                renderTableCard(
                  table,
                  detailTables.some((d) =&gt; d.id === table.id),
                  () =&gt; handleDetailToggle(table),
                  true
                )
              )}
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      &lt;p className="text-sm text-surface-400"&gt;
        This step is optional. You can skip it if your screen only needs a single table.
      &lt;/p&gt;
    &lt;/div&gt;
  );

  const renderStep3 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Bulk Data Entry
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Add initial data to your tables via Excel import, copy from another table, or manual entry.
          You can also do this later after the screen is created.
        &lt;/p&gt;
      &lt;/div&gt;

      {dataEntryTables.length === 0 ? (
        &lt;Card className="p-8 text-center"&gt;
          &lt;CircleStackIcon className="mx-auto h-12 w-12 text-surface-300" /&gt;
          &lt;p className="mt-3 text-surface-500"&gt;No tables selected yet. Go back and select tables first.&lt;/p&gt;
        &lt;/Card&gt;
      ) : (
        &lt;div className="space-y-8"&gt;
          {dataEntryTables.map((table) =&gt; (
            &lt;div key={table.id} className="rounded-xl border border-surface-200 dark:border-surface-700 p-4"&gt;
              &lt;DetailTableEntryGrid
                table={table}
                allTables={allTables}
                rows={tableData[table.id] || []}
                onChange={(rows) =&gt; handleTableDataChange(table.id, rows)}
              /&gt;
            &lt;/div&gt;
          ))}
        &lt;/div&gt;
      )}

      &lt;div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4"&gt;
        &lt;p className="text-sm text-blue-700 dark:text-blue-300"&gt;
          &lt;strong&gt;Tip:&lt;/strong&gt; You can import data from Excel/CSV files, copy rows from other tables in the system,
          or add rows manually. Double-click any cell to edit it. Download a CSV template to prepare your data offline.
        &lt;/p&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );

  const renderStep4 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Configure Your Screen
        &lt;/h2&gt;
      &lt;/div&gt;

      &lt;div className="grid grid-cols-1 gap-4 md:grid-cols-2"&gt;
        &lt;div&gt;
          &lt;label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
            Screen Name
          &lt;/label&gt;
          &lt;Input
            value={screenName}
            onChange={(e) =&gt; setScreenName(e.target.value)}
            placeholder="e.g. sales_orders_screen"
          /&gt;
        &lt;/div&gt;
        &lt;div&gt;
          &lt;label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
            Display Name
          &lt;/label&gt;
          &lt;Input
            value={displayName}
            onChange={(e) =&gt; setDisplayName(e.target.value)}
            placeholder="e.g. Sales Orders"
          /&gt;
        &lt;/div&gt;
        &lt;div className="md:col-span-2"&gt;
          &lt;label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
            Description
          &lt;/label&gt;
          &lt;Textarea
            value={description}
            onChange={(e) =&gt; setDescription(e.target.value)}
            placeholder="Describe the purpose of this screen..."
            rows={3}
          /&gt;
        &lt;/div&gt;
        &lt;div&gt;
          &lt;label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
            Screen Type
          &lt;/label&gt;
          &lt;Select value={screenType} onChange={(e) =&gt; setScreenType(e.target.value)}&gt;
            &lt;option value="form_and_list"&gt;Form &amp;amp; List&lt;/option&gt;
            &lt;option value="form_only"&gt;Form Only&lt;/option&gt;
            &lt;option value="list_only"&gt;List Only&lt;/option&gt;
          &lt;/Select&gt;
        &lt;/div&gt;
        &lt;div&gt;
          &lt;label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
            Icon (optional)
          &lt;/label&gt;
          &lt;Select value={icon} onChange={(e) =&gt; setIcon(e.target.value)}&gt;
            &lt;option value=""&gt;Select icon...&lt;/option&gt;
            &lt;option value="ShoppingCartIcon"&gt;Shopping Cart&lt;/option&gt;
            &lt;option value="CurrencyDollarIcon"&gt;Currency Dollar&lt;/option&gt;
            &lt;option value="TruckIcon"&gt;Truck&lt;/option&gt;
            &lt;option value="ClipboardDocumentListIcon"&gt;Clipboard&lt;/option&gt;
            &lt;option value="CubeIcon"&gt;Cube (Inventory)&lt;/option&gt;
            &lt;option value="CalculatorIcon"&gt;Calculator (Finance)&lt;/option&gt;
            &lt;option value="UserGroupIcon"&gt;User Group&lt;/option&gt;
            &lt;option value="DocumentTextIcon"&gt;Document&lt;/option&gt;
            &lt;option value="ChartBarIcon"&gt;Chart Bar&lt;/option&gt;
            &lt;option value="BuildingOfficeIcon"&gt;Building&lt;/option&gt;
          &lt;/Select&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="mt-6"&gt;
        &lt;h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500"&gt;
          Fields to Include
        &lt;/h3&gt;
        {Object.entries(fieldsByTable).map(([tableLabel, fields]) =&gt; (
          &lt;div key={tableLabel} className="mb-4"&gt;
            &lt;h4 className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300"&gt;
              {tableLabel}
            &lt;/h4&gt;
            &lt;div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"&gt;
              {fields.map((field) =&gt; (
                &lt;label
                  key={field.key}
                  className="flex items-center gap-2 rounded border border-surface-200 p-2 dark:border-surface-700"
                &gt;
                  &lt;input
                    type="checkbox"
                    checked={includedFields[field.key] ?? true}
                    onChange={() =&gt; handleFieldToggle(field.key)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-600"
                  /&gt;
                  &lt;span className="text-sm text-surface-700 dark:text-surface-300"&gt;
                    {field.label}
                  &lt;/span&gt;
                  &lt;Badge variant="secondary" className="ml-auto text-xs"&gt;
                    {field.type}
                  &lt;/Badge&gt;
                &lt;/label&gt;
              ))}
            &lt;/div&gt;
          &lt;/div&gt;
        ))}
      &lt;/div&gt;
    &lt;/div&gt;
  );

  const renderStep5 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Validation Rules
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Add data quality rules for this screen
        &lt;/p&gt;
      &lt;/div&gt;

      {existingValidations &amp;&amp; existingValidations.length &gt; 0 &amp;&amp; (
        &lt;div className="space-y-2"&gt;
          &lt;h3 className="text-sm font-semibold text-surface-500"&gt;Existing Rules&lt;/h3&gt;
          {existingValidations.map((rule: any) =&gt; (
            &lt;Card key={rule.id} className="flex items-center justify-between p-3"&gt;
              &lt;div&gt;
                &lt;p className="text-sm font-medium text-surface-900 dark:text-surface-100"&gt;
                  {rule.field} — {rule.operator}
                &lt;/p&gt;
                &lt;p className="text-xs text-surface-500"&gt;{rule.errorMessage}&lt;/p&gt;
              &lt;/div&gt;
              &lt;input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-surface-300 text-primary-600"
              /&gt;
            &lt;/Card&gt;
          ))}
        &lt;/div&gt;
      )}

      {validationRules.length &gt; 0 &amp;&amp; (
        &lt;div className="space-y-2"&gt;
          &lt;h3 className="text-sm font-semibold text-surface-500"&gt;New Rules&lt;/h3&gt;
          {validationRules.map((rule, index) =&gt; (
            &lt;Card key={index} className="flex items-center justify-between p-3"&gt;
              &lt;div&gt;
                &lt;p className="text-sm font-medium text-surface-900 dark:text-surface-100"&gt;
                  {rule.field} — {rule.operator} {rule.value &amp;&amp; `(${rule.value})`}
                &lt;/p&gt;
                &lt;p className="text-xs text-surface-500"&gt;{rule.errorMessage}&lt;/p&gt;
              &lt;/div&gt;
              &lt;button onClick={() =&gt; removeValidationRule(index)} className="text-red-500 hover:text-red-700"&gt;
                &lt;TrashIcon className="h-4 w-4" /&gt;
              &lt;/button&gt;
            &lt;/Card&gt;
          ))}
        &lt;/div&gt;
      )}

      {showNewValidation ? (
        &lt;Card className="space-y-3 p-4"&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2"&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;Field&lt;/label&gt;
              &lt;Select
                value={newValidation.field}
                onChange={(e) =&gt; setNewValidation({ ...newValidation, field: e.target.value })}
              &gt;
                &lt;option value=""&gt;Select field...&lt;/option&gt;
                {allSelectedFields.map((f) =&gt; (
                  &lt;option key={f.key} value={f.key}&gt;
                    {f.tableLabel} &amp;gt; {f.label}
                  &lt;/option&gt;
                ))}
              &lt;/Select&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;Operator&lt;/label&gt;
              &lt;Select
                value={newValidation.operator}
                onChange={(e) =&gt; setNewValidation({ ...newValidation, operator: e.target.value })}
              &gt;
                &lt;option value="required"&gt;Required&lt;/option&gt;
                &lt;option value="min"&gt;Min Value&lt;/option&gt;
                &lt;option value="max"&gt;Max Value&lt;/option&gt;
                &lt;option value="regex"&gt;Regex Pattern&lt;/option&gt;
                &lt;option value="unique"&gt;Unique&lt;/option&gt;
              &lt;/Select&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;Value&lt;/label&gt;
              &lt;Input
                value={newValidation.value}
                onChange={(e) =&gt; setNewValidation({ ...newValidation, value: e.target.value })}
                placeholder="Comparison value (if applicable)"
              /&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;Error Message&lt;/label&gt;
              &lt;Input
                value={newValidation.errorMessage}
                onChange={(e) =&gt; setNewValidation({ ...newValidation, errorMessage: e.target.value })}
                placeholder="Message shown on validation failure"
              /&gt;
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div className="flex gap-2"&gt;
            &lt;Button onClick={addValidationRule} size="sm"&gt;
              Add Rule
            &lt;/Button&gt;
            &lt;Button onClick={() =&gt; setShowNewValidation(false)} variant="ghost" size="sm"&gt;
              Cancel
            &lt;/Button&gt;
          &lt;/div&gt;
        &lt;/Card&gt;
      ) : (
        &lt;Button onClick={() =&gt; setShowNewValidation(true)} variant="outline"&gt;
          &lt;PlusIcon className="mr-2 h-4 w-4" /&gt;
          Create New Validation Rule
        &lt;/Button&gt;
      )}
    &lt;/div&gt;
  );

  const renderStep6 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Approval &amp;amp; Workflow
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Set up approval workflows for documents on this screen
        &lt;/p&gt;
      &lt;/div&gt;

      {existingApprovals &amp;&amp; existingApprovals.length &gt; 0 &amp;&amp; (
        &lt;div className="space-y-2"&gt;
          &lt;h3 className="text-sm font-semibold text-surface-500"&gt;Existing Approval Rules&lt;/h3&gt;
          {existingApprovals.map((rule: any) =&gt; (
            &lt;Card key={rule.id} className="flex items-center justify-between p-3"&gt;
              &lt;div&gt;
                &lt;p className="text-sm font-medium text-surface-900 dark:text-surface-100"&gt;
                  When status = &amp;quot;{rule.triggerStatus}&amp;quot;
                &lt;/p&gt;
                &lt;p className="text-xs text-surface-500"&gt;
                  {rule.levels?.length || 0} approval level(s)
                &lt;/p&gt;
              &lt;/div&gt;
              &lt;input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-surface-300 text-primary-600"
              /&gt;
            &lt;/Card&gt;
          ))}
        &lt;/div&gt;
      )}

      {approvalRules.length &gt; 0 &amp;&amp; (
        &lt;div className="space-y-2"&gt;
          &lt;h3 className="text-sm font-semibold text-surface-500"&gt;New Approval Rules&lt;/h3&gt;
          {approvalRules.map((rule, index) =&gt; (
            &lt;Card key={index} className="flex items-center justify-between p-3"&gt;
              &lt;div&gt;
                &lt;p className="text-sm font-medium text-surface-900 dark:text-surface-100"&gt;
                  Trigger: &amp;quot;{rule.triggerStatus}&amp;quot; → Target: &amp;quot;{rule.targetStatus}&amp;quot;
                &lt;/p&gt;
                &lt;p className="text-xs text-surface-500"&gt;
                  {rule.levels.length} level(s): {rule.levels.map((l) =&gt; l.role).join(', ')}
                &lt;/p&gt;
              &lt;/div&gt;
              &lt;button onClick={() =&gt; removeApprovalRule(index)} className="text-red-500 hover:text-red-700"&gt;
                &lt;TrashIcon className="h-4 w-4" /&gt;
              &lt;/button&gt;
            &lt;/Card&gt;
          ))}
        &lt;/div&gt;
      )}

      {showNewApproval ? (
        &lt;Card className="space-y-3 p-4"&gt;
          &lt;div className="grid grid-cols-1 gap-3 md:grid-cols-2"&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;
                Trigger Status
              &lt;/label&gt;
              &lt;Select
                value={newApproval.triggerStatus}
                onChange={(e) =&gt; setNewApproval({ ...newApproval, triggerStatus: e.target.value })}
              &gt;
                &lt;option value=""&gt;Select status...&lt;/option&gt;
                &lt;option value="submitted"&gt;Submitted&lt;/option&gt;
                &lt;option value="pending_approval"&gt;Pending Approval&lt;/option&gt;
                &lt;option value="in_review"&gt;In Review&lt;/option&gt;
                &lt;option value="draft"&gt;Draft&lt;/option&gt;
              &lt;/Select&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;
                Target Status (after approval)
              &lt;/label&gt;
              &lt;Select
                value={newApproval.targetStatus}
                onChange={(e) =&gt; setNewApproval({ ...newApproval, targetStatus: e.target.value })}
              &gt;
                &lt;option value=""&gt;Select target...&lt;/option&gt;
                &lt;option value="approved"&gt;Approved&lt;/option&gt;
                &lt;option value="confirmed"&gt;Confirmed&lt;/option&gt;
                &lt;option value="active"&gt;Active&lt;/option&gt;
                &lt;option value="posted"&gt;Posted&lt;/option&gt;
              &lt;/Select&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          &lt;div&gt;
            &lt;label className="mb-1 block text-xs font-medium text-surface-600"&gt;
              Approval Levels
            &lt;/label&gt;
            {newApproval.levels.map((level, i) =&gt; (
              &lt;div key={i} className="mb-2 flex items-center gap-2"&gt;
                &lt;span className="text-xs text-surface-500"&gt;Level {i + 1}:&lt;/span&gt;
                &lt;Select
                  value={level.role}
                  onChange={(e) =&gt; {
                    const levels = [...newApproval.levels];
                    levels[i] = { role: e.target.value };
                    setNewApproval({ ...newApproval, levels });
                  }}
                  className="flex-1"
                &gt;
                  &lt;option value=""&gt;Select role...&lt;/option&gt;
                  &lt;option value="manager"&gt;Manager&lt;/option&gt;
                  &lt;option value="director"&gt;Director&lt;/option&gt;
                  &lt;option value="finance"&gt;Finance&lt;/option&gt;
                  &lt;option value="ceo"&gt;CEO&lt;/option&gt;
                  &lt;option value="admin"&gt;Admin&lt;/option&gt;
                &lt;/Select&gt;
              &lt;/div&gt;
            ))}
            &lt;Button onClick={addApprovalLevel} variant="ghost" size="sm"&gt;
              &lt;PlusIcon className="mr-1 h-3 w-3" /&gt; Add Level
            &lt;/Button&gt;
          &lt;/div&gt;

          &lt;div className="flex gap-2"&gt;
            &lt;Button onClick={addApprovalRule} size="sm"&gt;
              Add Approval Rule
            &lt;/Button&gt;
            &lt;Button onClick={() =&gt; setShowNewApproval(false)} variant="ghost" size="sm"&gt;
              Cancel
            &lt;/Button&gt;
          &lt;/div&gt;
        &lt;/Card&gt;
      ) : (
        &lt;Button onClick={() =&gt; setShowNewApproval(true)} variant="outline"&gt;
          &lt;PlusIcon className="mr-2 h-4 w-4" /&gt;
          Create New Approval Rule
        &lt;/Button&gt;
      )}
    &lt;/div&gt;
  );

  const renderStep7 = () =&gt; (
    &lt;div className="space-y-6"&gt;
      &lt;div&gt;
        &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
          Where to Publish
        &lt;/h2&gt;
        &lt;p className="mt-1 text-surface-500"&gt;
          Choose where this screen appears in the navigation
        &lt;/p&gt;
      &lt;/div&gt;

      &lt;div className="space-y-3"&gt;
        {[
          { value: 'operations', label: 'Under "Operations" section' },
          { value: 'platform', label: 'Under "Platform" section' },
          { value: 'financial', label: 'Under "Financial" section' },
          { value: 'custom', label: 'Custom sidebar group' },
        ].map((option) =&gt; (
          &lt;label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
              publishLocation === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'border-surface-200 dark:border-surface-700'
            }`}
          &gt;
            &lt;input
              type="radio"
              name="publishLocation"
              value={option.value}
              checked={publishLocation === option.value}
              onChange={(e) =&gt; setPublishLocation(e.target.value)}
              className="h-4 w-4 text-primary-600"
            /&gt;
            &lt;span className="text-surface-900 dark:text-surface-100"&gt;{option.label}&lt;/span&gt;
          &lt;/label&gt;
        ))}

        {publishLocation === 'custom' &amp;&amp; (
          &lt;div className="ml-8"&gt;
            &lt;Input
              value={customGroup}
              onChange={(e) =&gt; setCustomGroup(e.target.value)}
              placeholder="Enter custom group name..."
            /&gt;
          &lt;/div&gt;
        )}
      &lt;/div&gt;

      &lt;label className="flex items-center gap-3"&gt;
        &lt;input
          type="checkbox"
          checked={addToSidebar}
          onChange={(e) =&gt; setAddToSidebar(e.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-primary-600"
        /&gt;
        &lt;span className="text-surface-700 dark:text-surface-300"&gt;Add to sidebar immediately&lt;/span&gt;
      &lt;/label&gt;
    &lt;/div&gt;
  );

  const renderStep8 = () =&gt; {
    const totalDataRows = Object.values(tableData).reduce((sum, rows) =&gt; sum + rows.length, 0);
    return (
      &lt;div className="space-y-6"&gt;
        &lt;div&gt;
          &lt;h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100"&gt;
            Review &amp;amp; Create
          &lt;/h2&gt;
        &lt;/div&gt;

        &lt;Card className="space-y-4 p-6"&gt;
          &lt;div className="grid grid-cols-1 gap-4 md:grid-cols-2"&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Header Table&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {headerTable?.label || '—'}
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Detail Tables&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {detailTables.length &gt; 0
                  ? detailTables.map((t) =&gt; t.label).join(', ')
                  : 'None'}
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Screen Name&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;{screenName}&lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Display Name&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;{displayName}&lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Screen Type&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {screenType === 'form_and_list'
                  ? 'Form &amp; List'
                  : screenType === 'form_only'
                  ? 'Form Only'
                  : 'List Only'}
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Fields Included&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {Object.values(includedFields).filter(Boolean).length} of {allSelectedFields.length}
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Initial Data Rows&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {totalDataRows} row(s) across {Object.keys(tableData).filter(k =&gt; tableData[k].length &gt; 0).length} table(s)
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Validation Rules&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {validationRules.filter((r) =&gt; r.enabled).length} rule(s)
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Approval Rules&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {approvalRules.filter((r) =&gt; r.enabled).length} rule(s)
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Publish Location&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {publishLocation === 'custom' ? customGroup : publishLocation}
              &lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-xs font-semibold uppercase text-surface-500"&gt;Add to Sidebar&lt;/p&gt;
              &lt;p className="text-surface-900 dark:text-surface-100"&gt;
                {addToSidebar ? 'Yes' : 'No'}
              &lt;/p&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/Card&gt;
      &lt;/div&gt;
    );
  };

  const renderCurrentStep = () =&gt; {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      case 8:
        return renderStep8();
      default:
        return null;
    }
  };

  return (
    &lt;div className="mx-auto max-w-5xl px-4 py-8"&gt;
      &lt;div className="mb-6"&gt;
        &lt;h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100"&gt;
          Screen Creation Wizard
        &lt;/h1&gt;
        &lt;p className="text-surface-500"&gt;
          Create a new screen with tables, data import, validations, and workflows
        &lt;/p&gt;
      &lt;/div&gt;

      {renderStepIndicator()}

      &lt;Card className="p-6"&gt;{renderCurrentStep()}&lt;/Card&gt;

      {/* Navigation buttons */}
      &lt;div className="mt-6 flex items-center justify-between"&gt;
        &lt;Button
          onClick={handleBack}
          variant="outline"
          disabled={currentStep === 1}
        &gt;
          &lt;ArrowLeftIcon className="mr-2 h-4 w-4" /&gt;
          Back
        &lt;/Button&gt;

        {currentStep &lt; 8 ? (
          &lt;Button onClick={handleNext} disabled={!canProceed()}&gt;
            Next
            &lt;ArrowRightIcon className="ml-2 h-4 w-4" /&gt;
          &lt;/Button&gt;
        ) : (
          &lt;Button onClick={handleCreate} disabled={isCreating || !canProceed()}&gt;
            {isCreating ? 'Creating...' : 'Create Screen'}
          &lt;/Button&gt;
        )}
      &lt;/div&gt;
    &lt;/div&gt;
  );
}
