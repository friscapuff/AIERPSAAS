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

const STEPS = [
  { number: 1, label: 'Header Table', icon: TableCellsIcon },
  { number: 2, label: 'Detail Tables', icon: TableCellsIcon },
  { number: 3, label: 'Configure', icon: CogIcon },
  { number: 4, label: 'Validation', icon: ShieldCheckIcon },
  { number: 5, label: 'Approval', icon: ClipboardDocumentCheckIcon },
  { number: 6, label: 'Publish', icon: MapPinIcon },
  { number: 7, label: 'Review', icon: DocumentCheckIcon },
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
  const [headerTable, setHeaderTable] = useState<TableDefinition | null>(null);
  const [detailTables, setDetailTables] = useState<TableDefinition[]>([]);

  // Step 3 state
  const [screenName, setScreenName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [screenType, setScreenType] = useState('form_and_list');
  const [icon, setIcon] = useState('');
  const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({});

  // Step 4 state
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [showNewValidation, setShowNewValidation] = useState(false);
  const [newValidation, setNewValidation] = useState<ValidationRule>({
    field: '',
    operator: 'required',
    value: '',
    errorMessage: '',
    enabled: true,
    isNew: true,
  });

  // Step 5 state
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [showNewApproval, setShowNewApproval] = useState(false);
  const [newApproval, setNewApproval] = useState<ApprovalRule>({
    triggerStatus: '',
    levels: [{ role: '' }],
    targetStatus: '',
    enabled: true,
    isNew: true,
  });

  // Step 6 state
  const [publishLocation, setPublishLocation] = useState('operations');
  const [customGroup, setCustomGroup] = useState('');
  const [addToSidebar, setAddToSidebar] = useState(true);

  const [isCreating, setIsCreating] = useState(false);

  // Compute all fields from selected tables
  const allSelectedFields = useMemo(() => {
    const tables = [headerTable, ...detailTables].filter(Boolean) as TableDefinition[];
    return tables.flatMap((t) =>
      t.fields.map((f) => ({
        ...f,
        tableName: t.name,
        tableLabel: t.label,
        key: `${t.name}.${f.name}`,
      }))
    );
  }, [headerTable, detailTables]);

  // Initialize included fields when tables change
  useMemo(() => {
    const fields: Record<string, boolean> = {};
    allSelectedFields.forEach((f) => {
      fields[f.key] = includedFields[f.key] ?? true;
    });
    setIncludedFields(fields);
  }, [allSelectedFields]);

  // Auto-generate screen name from header table
  const handleHeaderSelect = (table: TableDefinition) => {
    setHeaderTable(table);
    if (!screenName) {
      setScreenName(`${table.name}_screen`);
      setDisplayName(table.label);
    }
  };

  const handleDetailToggle = (table: TableDefinition) => {
    setDetailTables((prev) =>
      prev.some((t) => t.id === table.id)
        ? prev.filter((t) => t.id !== table.id)
        : [...prev, table]
    );
  };

  const handleFieldToggle = (key: string) => {
    setIncludedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addValidationRule = () => {
    if (!newValidation.field || !newValidation.errorMessage) {
      notify.error('Field and error message are required');
      return;
    }
    setValidationRules((prev) => [...prev, { ...newValidation }]);
    setNewValidation({ field: '', operator: 'required', value: '', errorMessage: '', enabled: true, isNew: true });
    setShowNewValidation(false);
  };

  const removeValidationRule = (index: number) => {
    setValidationRules((prev) => prev.filter((_, i) => i !== index));
  };

  const addApprovalRule = () => {
    if (!newApproval.triggerStatus || !newApproval.levels[0]?.role) {
      notify.error('Trigger status and at least one approval level are required');
      return;
    }
    setApprovalRules((prev) => [...prev, { ...newApproval }]);
    setNewApproval({ triggerStatus: '', levels: [{ role: '' }], targetStatus: '', enabled: true, isNew: true });
    setShowNewApproval(false);
  };

  const removeApprovalRule = (index: number) => {
    setApprovalRules((prev) => prev.filter((_, i) => i !== index));
  };

  const addApprovalLevel = () => {
    setNewApproval((prev) => ({
      ...prev,
      levels: [...prev.levels, { role: '' }],
    }));
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createScreen({
        name: screenName,
        displayName,
        description,
        screenType,
        icon,
        headerTable: headerTable!.name,
        detailTables: detailTables.map((t) => t.name),
        fields: Object.entries(includedFields)
          .filter(([, included]) => included)
          .map(([key]) => key),
        validationRules: validationRules.filter((r) => r.enabled),
        approvalRules: approvalRules.filter((r) => r.enabled),
        publishLocation: publishLocation === 'custom' ? customGroup : publishLocation,
        addToSidebar,
      });
      notify.success('Screen created successfully!');
      router.push('/dynamic-builder/screens');
    } catch (error: any) {
      notify.error(error?.message || 'Failed to create screen');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!headerTable;
      case 2:
        return true; // optional step
      case 3:
        return !!screenName && !!displayName;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return publishLocation !== 'custom' || !!customGroup;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 7) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Available tables for detail selection (exclude header)
  const availableForDetail = allTables.filter((t) => t.id !== headerTable?.id);

  // Group fields by table for Step 3
  const fieldsByTable = useMemo(() => {
    const grouped: Record<string, typeof allSelectedFields> = {};
    allSelectedFields.forEach((f) => {
      if (!grouped[f.tableLabel]) grouped[f.tableLabel] = [];
      grouped[f.tableLabel].push(f);
    });
    return grouped;
  }, [allSelectedFields]);

  const renderTableCard = (
    table: TableDefinition,
    isSelected: boolean,
    onClick: () => void,
    multiSelect?: boolean
  ) => (
    <Card
      key={table.id}
      className={`cursor-pointer p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-950'
          : 'border border-surface-200 dark:border-surface-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {multiSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="h-4 w-4 rounded border-surface-300 text-primary-600"
          />
        )}
        <TableCellsIcon className="h-8 w-8 text-primary-500" />
        <div className="flex-1">
          <p className="font-medium text-surface-900 dark:text-surface-100">{table.label}</p>
          <p className="text-sm text-surface-500">{table.name}</p>
        </div>
        <Badge variant="secondary">{table.fields.length} fields</Badge>
      </div>
    </Card>
  );

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                currentStep > step.number
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : currentStep === step.number
                  ? 'border-primary-500 bg-white text-primary-500 dark:bg-surface-800'
                  : 'border-surface-300 bg-white text-surface-400 dark:border-surface-600 dark:bg-surface-800'
              }`}
            >
              {currentStep > step.number ? (
                <CheckCircleIcon className="h-6 w-6" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-1 text-xs ${
                currentStep >= step.number ? 'text-primary-600 font-medium' : 'text-surface-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`mx-2 h-0.5 w-12 ${
                currentStep > step.number ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Select Header Table
        </h2>
        <p className="mt-1 text-surface-500">
          Choose the main table for your screen (e.g., sales_order_header)
        </p>
      </div>

      {systemTables.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            System Tables
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {systemTables.map((table) =>
              renderTableCard(table, headerTable?.id === table.id, () => handleHeaderSelect(table))
            )}
          </div>
        </div>
      )}

      {dynamicTables.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Custom Tables
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dynamicTables.map((table) =>
              renderTableCard(table, headerTable?.id === table.id, () => handleHeaderSelect(table))
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-surface-400">
        Don&apos;t see your table?{' '}
        <a href="/dynamic-builder" className="text-primary-500 hover:underline">
          Create one in Dynamic Builder
        </a>
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Select Detail &amp; Items Tables
        </h2>
        <p className="mt-1 text-surface-500">
          Choose related tables for line items, details, or child records
        </p>
      </div>

      {availableForDetail.filter((t) => t.isSystem).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            System Tables
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {availableForDetail
              .filter((t) => t.isSystem)
              .map((table) =>
                renderTableCard(
                  table,
                  detailTables.some((d) => d.id === table.id),
                  () => handleDetailToggle(table),
                  true
                )
              )}
          </div>
        </div>
      )}

      {availableForDetail.filter((t) => !t.isSystem).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
            Custom Tables
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {availableForDetail
              .filter((t) => !t.isSystem)
              .map((table) =>
                renderTableCard(
                  table,
                  detailTables.some((d) => d.id === table.id),
                  () => handleDetailToggle(table),
                  true
                )
              )}
          </div>
        </div>
      )}

      <p className="text-sm text-surface-400">
        This step is optional. You can skip it if your screen only needs a single table.
      </p>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Configure Your Screen
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Screen Name
          </label>
          <Input
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            placeholder="e.g. sales_orders_screen"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Display Name
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sales Orders"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose of this screen..."
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Screen Type
          </label>
          <Select value={screenType} onChange={(e) => setScreenType(e.target.value)}>
            <option value="form_and_list">Form &amp; List</option>
            <option value="form_only">Form Only</option>
            <option value="list_only">List Only</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Icon (optional)
          </label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="e.g. ShoppingCartIcon"
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-surface-500">
          Fields to Include
        </h3>
        {Object.entries(fieldsByTable).map(([tableLabel, fields]) => (
          <div key={tableLabel} className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
              {tableLabel}
            </h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 rounded border border-surface-200 p-2 dark:border-surface-700"
                >
                  <input
                    type="checkbox"
                    checked={includedFields[field.key] ?? true}
                    onChange={() => handleFieldToggle(field.key)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-600"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">
                    {field.label}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {field.type}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Validation Rules
        </h2>
        <p className="mt-1 text-surface-500">
          Add data quality rules for this screen
        </p>
      </div>

      {/* Existing rules */}
      {existingValidations && existingValidations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-500">Existing Rules</h3>
          {existingValidations.map((rule: any) => (
            <Card key={rule.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {rule.field} — {rule.operator}
                </p>
                <p className="text-xs text-surface-500">{rule.errorMessage}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-surface-300 text-primary-600"
              />
            </Card>
          ))}
        </div>
      )}

      {/* Custom rules added in wizard */}
      {validationRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-500">New Rules</h3>
          {validationRules.map((rule, index) => (
            <Card key={index} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {rule.field} — {rule.operator} {rule.value && `(${rule.value})`}
                </p>
                <p className="text-xs text-surface-500">{rule.errorMessage}</p>
              </div>
              <button onClick={() => removeValidationRule(index)} className="text-red-500 hover:text-red-700">
                <TrashIcon className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* New rule form */}
      {showNewValidation ? (
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">Field</label>
              <Select
                value={newValidation.field}
                onChange={(e) => setNewValidation({ ...newValidation, field: e.target.value })}
              >
                <option value="">Select field...</option>
                {allSelectedFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.tableLabel} &gt; {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">Operator</label>
              <Select
                value={newValidation.operator}
                onChange={(e) => setNewValidation({ ...newValidation, operator: e.target.value })}
              >
                <option value="required">Required</option>
                <option value="min">Min Value</option>
                <option value="max">Max Value</option>
                <option value="regex">Regex Pattern</option>
                <option value="unique">Unique</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">Value</label>
              <Input
                value={newValidation.value}
                onChange={(e) => setNewValidation({ ...newValidation, value: e.target.value })}
                placeholder="Comparison value (if applicable)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">Error Message</label>
              <Input
                value={newValidation.errorMessage}
                onChange={(e) => setNewValidation({ ...newValidation, errorMessage: e.target.value })}
                placeholder="Message shown on validation failure"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addValidationRule} size="sm">
              Add Rule
            </Button>
            <Button onClick={() => setShowNewValidation(false)} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowNewValidation(true)} variant="outline">
          <PlusIcon className="mr-2 h-4 w-4" />
          Create New Validation Rule
        </Button>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Approval &amp; Workflow
        </h2>
        <p className="mt-1 text-surface-500">
          Set up approval workflows for documents on this screen
        </p>
      </div>

      {/* Existing approval rules */}
      {existingApprovals && existingApprovals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-500">Existing Approval Rules</h3>
          {existingApprovals.map((rule: any) => (
            <Card key={rule.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  When status = &quot;{rule.triggerStatus}&quot;
                </p>
                <p className="text-xs text-surface-500">
                  {rule.levels?.length || 0} approval level(s)
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-surface-300 text-primary-600"
              />
            </Card>
          ))}
        </div>
      )}

      {/* Custom approval rules */}
      {approvalRules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-surface-500">New Approval Rules</h3>
          {approvalRules.map((rule, index) => (
            <Card key={index} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Trigger: &quot;{rule.triggerStatus}&quot; → Target: &quot;{rule.targetStatus}&quot;
                </p>
                <p className="text-xs text-surface-500">
                  {rule.levels.length} level(s): {rule.levels.map((l) => l.role).join(', ')}
                </p>
              </div>
              <button onClick={() => removeApprovalRule(index)} className="text-red-500 hover:text-red-700">
                <TrashIcon className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* New approval rule form */}
      {showNewApproval ? (
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">
                Trigger Status
              </label>
              <Select
                value={newApproval.triggerStatus}
                onChange={(e) => setNewApproval({ ...newApproval, triggerStatus: e.target.value })}
              >
                <option value="">Select status...</option>
                <option value="submitted">Submitted</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="in_review">In Review</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-600">
                Target Status (after approval)
              </label>
              <Select
                value={newApproval.targetStatus}
                onChange={(e) => setNewApproval({ ...newApproval, targetStatus: e.target.value })}
              >
                <option value="">Select target...</option>
                <option value="approved">Approved</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
                <option value="posted">Posted</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-surface-600">
              Approval Levels
            </label>
            {newApproval.levels.map((level, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <span className="text-xs text-surface-500">Level {i + 1}:</span>
                <Select
                  value={level.role}
                  onChange={(e) => {
                    const levels = [...newApproval.levels];
                    levels[i] = { role: e.target.value };
                    setNewApproval({ ...newApproval, levels });
                  }}
                  className="flex-1"
                >
                  <option value="">Select role...</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="finance">Finance</option>
                  <option value="ceo">CEO</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
            ))}
            <Button onClick={addApprovalLevel} variant="ghost" size="sm">
              <PlusIcon className="mr-1 h-3 w-3" /> Add Level
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={addApprovalRule} size="sm">
              Add Approval Rule
            </Button>
            <Button onClick={() => setShowNewApproval(false)} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setShowNewApproval(true)} variant="outline">
          <PlusIcon className="mr-2 h-4 w-4" />
          Create New Approval Rule
        </Button>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Where to Publish
        </h2>
        <p className="mt-1 text-surface-500">
          Choose where this screen appears in the navigation
        </p>
      </div>

      <div className="space-y-3">
        {[
          { value: 'operations', label: 'Under "Operations" section' },
          { value: 'platform', label: 'Under "Platform" section' },
          { value: 'financial', label: 'Under "Financial" section' },
          { value: 'custom', label: 'Custom sidebar group' },
        ].map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
              publishLocation === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                : 'border-surface-200 dark:border-surface-700'
            }`}
          >
            <input
              type="radio"
              name="publishLocation"
              value={option.value}
              checked={publishLocation === option.value}
              onChange={(e) => setPublishLocation(e.target.value)}
              className="h-4 w-4 text-primary-600"
            />
            <span className="text-surface-900 dark:text-surface-100">{option.label}</span>
          </label>
        ))}

        {publishLocation === 'custom' && (
          <div className="ml-8">
            <Input
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value)}
              placeholder="Enter custom group name..."
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={addToSidebar}
          onChange={(e) => setAddToSidebar(e.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-primary-600"
        />
        <span className="text-surface-700 dark:text-surface-300">Add to sidebar immediately</span>
      </label>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Review &amp; Create
        </h2>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Header Table</p>
            <p className="text-surface-900 dark:text-surface-100">
              {headerTable?.label || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Detail Tables</p>
            <p className="text-surface-900 dark:text-surface-100">
              {detailTables.length > 0
                ? detailTables.map((t) => t.label).join(', ')
                : 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Screen Name</p>
            <p className="text-surface-900 dark:text-surface-100">{screenName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Display Name</p>
            <p className="text-surface-900 dark:text-surface-100">{displayName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Screen Type</p>
            <p className="text-surface-900 dark:text-surface-100">
              {screenType === 'form_and_list'
                ? 'Form & List'
                : screenType === 'form_only'
                ? 'Form Only'
                : 'List Only'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Fields Included</p>
            <p className="text-surface-900 dark:text-surface-100">
              {Object.values(includedFields).filter(Boolean).length} of {allSelectedFields.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Validation Rules</p>
            <p className="text-surface-900 dark:text-surface-100">
              {validationRules.filter((r) => r.enabled).length} rule(s)
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Approval Rules</p>
            <p className="text-surface-900 dark:text-surface-100">
              {approvalRules.filter((r) => r.enabled).length} rule(s)
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Publish Location</p>
            <p className="text-surface-900 dark:text-surface-100">
              {publishLocation === 'custom' ? customGroup : publishLocation}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-surface-500">Add to Sidebar</p>
            <p className="text-surface-900 dark:text-surface-100">
              {addToSidebar ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
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
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Screen Creation Wizard
        </h1>
        <p className="text-surface-500">
          Create a new screen with tables, validations, and workflows
        </p>
      </div>

      {renderStepIndicator()}

      <Card className="p-6">{renderCurrentStep()}</Card>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={currentStep === 1}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep < 7 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={isCreating || !canProceed()}>
            {isCreating ? 'Creating...' : 'Create Screen'}
          </Button>
        )}
      </div>
    </div>
  );
}
