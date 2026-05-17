'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { notify } from '@/components/ui/Toast'
import {
  TableCellsIcon,
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  FolderIcon,
  EyeIcon,
  BoltIcon,
  RocketLaunchIcon,
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  BanknotesIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CalculatorIcon,
  UserGroupIcon,
  HomeIcon,
  ChartBarIcon,
  Squares2X2Icon,
  TagIcon,
  WrenchScrewdriverIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useAllTablesGrouped, TableDefinition, useSystemScreens } from '@/hooks/useAllTables'
import { useCreateScreen, useValidationRules, useApprovalRules } from '@/hooks/useDynamicPlatform'
import { post } from '@/lib/api'
import DetailTableEntryGrid from '@/components/platform/DetailTableEntryGrid'

interface Tab {
  id: string
  name: string
  fields: Record<string, boolean>
}

interface ValidationRule {
  id: string
  field: string
  operator: string
  value: string
  errorMessage: string
  enabled: boolean
}

interface ApprovalLevel {
  level: number
  role: string
}

interface ApprovalRule {
  id: string
  triggerStatus: string
  levels: ApprovalLevel[]
  targetStatus: string
}

interface ImpactRule {
  id: string
  triggerStatus: string
  impactType: string
  targetTable: string
  config: Record<string, any>
  description: string
}

const STEP_LABELS = [
  'Select Tables',
  'Detail Tables',
  'Data Entry',
  'Configure Screen',
  'Validations',
  'Approvals',
  'Impact Rules',
  'Publish',
  'Review & Create',
]

const STEP_ICONS = [
  TableCellsIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CogIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  FolderIcon,
  BoltIcon,
  RocketLaunchIcon,
]

const SCREEN_TYPES = [
  { value: 'FORM_LIST', label: 'Form & List' },
  { value: 'FORM', label: 'Form Only' },
  { value: 'LIST', label: 'List Only' },
]

const ICON_OPTIONS = [
  { value: 'TableCellsIcon', label: 'Table' },
  { value: 'DocumentTextIcon', label: 'Document' },
  { value: 'CubeIcon', label: 'Cube' },
  { value: 'BanknotesIcon', label: 'Banknotes' },
  { value: 'UsersIcon', label: 'Users' },
  { value: 'BuildingStorefrontIcon', label: 'Store' },
  { value: 'TruckIcon', label: 'Truck' },
  { value: 'ArchiveBoxIcon', label: 'Archive' },
  { value: 'CalculatorIcon', label: 'Calculator' },
  { value: 'UserGroupIcon', label: 'User Group' },
  { value: 'HomeIcon', label: 'Home' },
  { value: 'ChartBarIcon', label: 'Chart' },
  { value: 'Squares2X2Icon', label: 'Grid' },
  { value: 'TagIcon', label: 'Tag' },
  { value: 'WrenchScrewdriverIcon', label: 'Tools' },
  { value: 'StarIcon', label: 'Star' },
  { value: 'ShieldCheckIcon', label: 'Shield' },
  { value: 'FolderIcon', label: 'Folder' },
]

const OPERATORS = [
  { value: 'required', label: 'Required' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'regex', label: 'Regex Pattern' },
]

const IMPACT_TYPES = [
  // Financial
  { value: 'GL_POSTING', label: 'GL Posting (Accounting)', category: 'Financial' },
  { value: 'BUDGET_IMPACT', label: 'Budget Impact', category: 'Financial' },
  { value: 'COST_UPDATE', label: 'Cost Update (FIFO/WA)', category: 'Financial' },
  { value: 'COMMISSION_CALC', label: 'Commission Calculation', category: 'Financial' },
  { value: 'INTERCOMPANY', label: 'Intercompany Transfer', category: 'Financial' },
  // Supply Chain
  { value: 'INVENTORY_MOVEMENT', label: 'Inventory Movement', category: 'Supply Chain' },
  { value: 'STOCK_PLANNING', label: 'Stock Planning / Reorder', category: 'Supply Chain' },
  // CRM
  { value: 'CRM_LOG', label: 'CRM Activity Log', category: 'CRM' },
  // Data
  { value: 'RECORD_CREATE', label: 'Create Record', category: 'Data' },
  { value: 'FIELD_UPDATE', label: 'Field Update', category: 'Data' },
  // Workflow
  { value: 'NOTIFICATION', label: 'Notification (Email/Push)', category: 'Workflow' },
  { value: 'WEBHOOK', label: 'Webhook', category: 'Workflow' },
  { value: 'APPROVAL_TRIGGER', label: 'Trigger Approval', category: 'Workflow' },
  // Analytics
  { value: 'ANALYTICS_EVENT', label: 'Analytics Event', category: 'Analytics' },
]

const IMPACT_CATEGORIES = ['Financial', 'Supply Chain', 'CRM', 'Data', 'Workflow', 'Analytics']

const PUBLISH_LOCATIONS = [
  { value: 'operations', label: 'Operations' },
  { value: 'platform', label: 'Platform' },
  { value: 'financial', label: 'Financial' },
  { value: 'custom', label: 'Custom Group' },
]

export default function ScreenCreationWizard() {
  const router = useRouter()
  const { systemTables, dynamicTables, allTables } = useAllTablesGrouped()
  const { mutateAsync: createScreen } = useCreateScreen()
  const { rules: existingValidations } = useValidationRules()
  const { rules: existingApprovals } = useApprovalRules()

  // Step state
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1 - Header Tables (MULTI-SELECT)
  const [headerTables, setHeaderTables] = useState<string[]>([])
  const [tableSearch, setTableSearch] = useState('')

  // Step 2 - Detail Tables
  const [detailTables, setDetailTables] = useState<string[]>([])

  // Step 3 - Data Entry
  const [initialData, setInitialData] = useState<Record<string, any[]>>({})

  // Step 4 - Configure Screen
  const [screenName, setScreenName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [screenType, setScreenType] = useState('FORM_LIST')
  const [screenIcon, setScreenIcon] = useState('TableCellsIcon')
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'main', name: 'Main', fields: {} },
  ])
  const [activeTabId, setActiveTabId] = useState('main')
  const [newTabName, setNewTabName] = useState('')

  // Step 5 - Validations
  const [validations, setValidations] = useState<ValidationRule[]>([])
  const [newValidation, setNewValidation] = useState({
    field: '',
    operator: 'required',
    value: '',
    errorMessage: '',
  })

  // Step 6 - Approvals
  const [approvals, setApprovals] = useState<ApprovalRule[]>([])
  const [newApproval, setNewApproval] = useState({
    triggerStatus: '',
    levels: [{ level: 1, role: '' }] as ApprovalLevel[],
    targetStatus: '',
  })

  // Step 7 - Impact Rules
  const [impactRules, setImpactRules] = useState<ImpactRule[]>([])
  const [newImpact, setNewImpact] = useState({
    triggerStatus: 'POSTED',
    impactType: 'GL_POSTING',
    targetTable: '',
    description: '',
    config: {} as Record<string, any>,
  })

  // Step 8 - Publish
  const [publishLocation, setPublishLocation] = useState('operations')
  const [customGroup, setCustomGroup] = useState('')
  const [addToSidebar, setAddToSidebar] = useState(true)

  // Derived data
  const selectedTables = useMemo(() => {
    const tableIds = [...headerTables, ...detailTables].filter(Boolean)
    return allTables?.filter((t: TableDefinition) => tableIds.includes(t.id)) || []
  }, [headerTables, detailTables, allTables])

  const allFields = useMemo(() => {
    const fields: { tableId: string; tableName: string; tableLabel: string; fieldName: string; fieldLabel: string; fieldType: string }[] = []
    selectedTables.forEach((table: TableDefinition) => {
      (table.fields || []).forEach((field) => {
        fields.push({
          tableId: table.id,
          tableName: table.name,
          tableLabel: table.label,
          fieldName: field.name,
          fieldLabel: field.label,
          fieldType: field.type,
        })
      })
    })
    return fields
  }, [selectedTables])

  const filteredTables = useMemo(() => {
    const filter = (tables: TableDefinition[]) =>
      tables.filter((t) =>
        (t.label || t.name).toLowerCase().includes(tableSearch.toLowerCase())
      )
    return {
      system: filter(systemTables || []),
      custom: filter(dynamicTables || []),
    }
  }, [systemTables, dynamicTables, tableSearch])

  const availableDetailTables = useMemo(() => {
    if (!allTables) return []
    return allTables.filter((t: TableDefinition) => !headerTables.includes(t.id))
  }, [allTables, headerTables])

  // Navigation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return headerTables.length > 0
      case 1:
        return true
      case 2:
        return true
      case 3:
        return !!screenName && !!displayName
      case 4:
        return true
      case 5:
        return true
      case 6:
        return true
      case 7:
        return publishLocation !== 'custom' || !!customGroup.trim()
      case 8:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 8 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Header table toggle (multi-select)
  const toggleHeaderTable = (tableId: string) => {
    setHeaderTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    )
    // Remove from detail tables if added as header
    setDetailTables((prev) => prev.filter((id) => id !== tableId))
  }

  // Tab management
  const addTab = () => {
    if (!newTabName.trim()) return
    const id = newTabName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    setTabs([...tabs, { id, name: newTabName.trim(), fields: {} }])
    setNewTabName('')
    setActiveTabId(id)
  }

  const removeTab = (tabId: string) => {
    if (tabId === 'main') return
    setTabs(tabs.filter((t) => t.id !== tabId))
    if (activeTabId === tabId) {
      setActiveTabId('main')
    }
  }

  const toggleTabField = (tabId: string, fieldKey: string) => {
    setTabs(
      tabs.map((tab) => {
        if (tab.id !== tabId) return tab
        const fields = { ...tab.fields }
        fields[fieldKey] = !fields[fieldKey]
        return { ...tab, fields }
      })
    )
  }

  // Validation management
  const addValidation = () => {
    if (!newValidation.field || !newValidation.errorMessage) return
    const rule: ValidationRule = {
      id: 'val-' + Date.now(),
      ...newValidation,
      enabled: true,
    }
    setValidations([...validations, rule])
    setNewValidation({ field: '', operator: 'required', value: '', errorMessage: '' })
  }

  const removeValidation = (id: string) => {
    setValidations(validations.filter((v) => v.id !== id))
  }

  const toggleValidation = (id: string) => {
    setValidations(
      validations.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v))
    )
  }

  // Approval management
  const addApprovalLevel = () => {
    setNewApproval({
      ...newApproval,
      levels: [...newApproval.levels, { level: newApproval.levels.length + 1, role: '' }],
    })
  }

  const updateApprovalLevel = (index: number, role: string) => {
    const levels = [...newApproval.levels]
    levels[index] = { ...levels[index], role }
    setNewApproval({ ...newApproval, levels })
  }

  const removeApprovalLevel = (index: number) => {
    if (newApproval.levels.length <= 1) return
    const levels = newApproval.levels.filter((_, i) => i !== index)
    setNewApproval({ ...newApproval, levels: levels.map((l, i) => ({ ...l, level: i + 1 })) })
  }

  const addApproval = () => {
    if (!newApproval.triggerStatus || !newApproval.targetStatus) return
    if (newApproval.levels.some((l) => !l.role)) return
    const rule: ApprovalRule = {
      id: 'apr-' + Date.now(),
      ...newApproval,
    }
    setApprovals([...approvals, rule])
    setNewApproval({ triggerStatus: '', levels: [{ level: 1, role: '' }], targetStatus: '' })
  }

  const removeApproval = (id: string) => {
    setApprovals(approvals.filter((a) => a.id !== id))
  }

  // Detail table toggle
  const toggleDetailTable = (tableId: string) => {
    setDetailTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    )
  }

  // Create screen
  const handleCreate = async () => {
    try {
      const primaryTable = allTables?.find((t: TableDefinition) => t.id === headerTables[0])
      const tableName = primaryTable?.name || screenName

      // Collect fields from all selected tables for auto-registration
      const selectedTableIds = [...headerTables, ...detailTables].filter(Boolean)
      const tableFields: Record<string, any[]> = {}
      selectedTableIds.forEach((tid) => {
        const t = allTables?.find((tb: TableDefinition) => tb.id === tid)
        if (t) {
          tableFields[t.name] = t.fields.map((f, idx) => ({
            name: f.name,
            label: f.label,
            type: f.type || 'TEXT',
            required: false,
            order: idx,
          }))
        }
      })

      await createScreen({
        tableName,
        headerTables,
        detailTables,
        screenName,
        displayName,
        description,
        screenType,
        screenIcon,
        tabs,
        validations,
        approvals,
        impactRules,
        publishLocation: publishLocation === 'custom' ? customGroup : publishLocation,
        addToSidebar,
        initialData,
        tableFields,
      })

      // Create real impact rules via the Impact Rules API (multi-impact batch)
      if (impactRules.length > 0) {
        // Group rules by triggerStatus for batch creation
        const groupedByStatus: Record<string, typeof impactRules> = {}
        impactRules.forEach((rule) => {
          if (!groupedByStatus[rule.triggerStatus]) groupedByStatus[rule.triggerStatus] = []
          groupedByStatus[rule.triggerStatus].push(rule)
        })

        for (const [status, statusRules] of Object.entries(groupedByStatus)) {
          try {
            if (statusRules.length > 1) {
              // Batch create as a group
              await post('/dynamic-builder/impact-rules/batch', {
                tableName,
                triggerStatus: status,
                groupName: `${displayName} - ${status}`,
                executionMode: 'TRANSACTIONAL',
                rollbackOnFailure: true,
                rules: statusRules.map((rule, idx) => ({
                  ruleName: rule.description || `${rule.impactType} on ${rule.triggerStatus}`,
                  description: rule.description,
                  impactType: rule.impactType,
                  config: { ...rule.config, targetTable: rule.targetTable },
                  priority: idx,
                })),
              })
            } else {
              // Single rule - create directly
              const rule = statusRules[0]
              await post('/dynamic-builder/impact-rules', {
                tableName,
                ruleName: rule.description || `${rule.impactType} on ${rule.triggerStatus}`,
                description: rule.description,
                triggerStatus: rule.triggerStatus,
                impactType: rule.impactType,
                config: { ...rule.config, targetTable: rule.targetTable },
                isActive: true,
                priority: 1,
              })
            }
          } catch (e) {
            console.error('Failed to create impact rule(s):', e)
          }
        }
      }

      notify.success('Screen created successfully!')
      router.push('/dynamic-builder')
    } catch (error: any) {
      notify.error(error?.message || 'Failed to create screen')
    }
  }

  // Data entry callback
  const handleDataChange = (tableId: string, rows: any[]) => {
    setInitialData((prev) => ({ ...prev, [tableId]: rows }))
  }

  // Get data rows count
  const getDataRowsCount = () => {
    return Object.values(initialData).reduce((sum, rows) => sum + (rows?.length || 0), 0)
  }

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEP_LABELS.map((label, index) => {
        const Icon = STEP_ICONS[index]
        const isComplete = index < currentStep
        const isCurrent = index === currentStep
        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isComplete
                    ? 'bg-primary-500 text-white'
                    : isCurrent
                    ? 'bg-primary-500/20 border-2 border-primary-500 text-primary-500'
                    : 'bg-surface-800 text-surface-400 border border-surface-700'
                }`}
              >
                {isComplete ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-xs mt-1 text-center max-w-[80px] ${
                  isCurrent ? 'text-primary-400 font-medium' : 'text-surface-500'
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mt-[-16px] ${
                  index < currentStep ? 'bg-primary-500' : 'bg-surface-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  // Step 1: Select Tables (MULTI-SELECT)
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Select Tables</h2>
        <p className="text-surface-400 text-sm">
          Choose one or more tables for your screen. Select multiple tables to build a combined view.
        </p>
      </div>

      {/* Selected tables badges */}
      {headerTables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {headerTables.map((tableId) => {
            const table = allTables?.find((t: TableDefinition) => t.id === tableId)
            return (
              <Badge key={tableId} variant="default" className="px-3 py-1.5">
                {table?.label || table?.name || tableId}
                <button
                  onClick={() => toggleHeaderTable(tableId)}
                  className="ml-2 text-surface-300 hover:text-white"
                >
                  ×
                </button>
              </Badge>
            )
          })}
          <span className="text-xs text-surface-500 self-center ml-2">
            {headerTables.length} table(s) selected
          </span>
        </div>
      )}

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <Input
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          placeholder="Search tables..."
          className="pl-10"
        />
      </div>

      {filteredTables.system.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
            <Badge variant="default">System</Badge>
            Tables ({filteredTables.system.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTables.system.map((table: TableDefinition) => {
              const isSelected = headerTables.includes(table.id)
              return (
                <Card
                  key={table.id}
                  className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-700'
                  }`}
                  onClick={() => toggleHeaderTable(table.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleHeaderTable(table.id)}
                      className="w-4 h-4 rounded border-surface-600 text-primary-500 focus:ring-primary-500"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary-500/20' : 'bg-surface-800'
                      }`}
                    >
                      <TableCellsIcon
                        className={`w-5 h-5 ${
                          isSelected ? 'text-primary-400' : 'text-surface-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{table.label}</p>
                      <p className="text-xs text-surface-500">{table.name} · {table.fields?.length || 0} fields</p>
                    </div>
                    {isSelected && (
                      <CheckCircleIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {filteredTables.custom.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
            <Badge variant="secondary">Custom</Badge>
            Dynamic Tables ({filteredTables.custom.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTables.custom.map((table: TableDefinition) => {
              const isSelected = headerTables.includes(table.id)
              return (
                <Card
                  key={table.id}
                  className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-surface-700'
                  }`}
                  onClick={() => toggleHeaderTable(table.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleHeaderTable(table.id)}
                      className="w-4 h-4 rounded border-surface-600 text-primary-500 focus:ring-primary-500"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary-500/20' : 'bg-surface-800'
                      }`}
                    >
                      <CubeIcon
                        className={`w-5 h-5 ${
                          isSelected ? 'text-primary-400' : 'text-surface-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{table.label}</p>
                      <p className="text-xs text-surface-500">{table.name} · {table.fields?.length || 0} fields</p>
                    </div>
                    {isSelected && (
                      <CheckCircleIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Step 2: Detail Tables
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Select Detail Tables</h2>
        <p className="text-surface-400 text-sm">
          Choose additional line item or detail tables. These are tables not selected as primary in Step 1.
        </p>
      </div>

      {detailTables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detailTables.map((tableId) => {
            const table = allTables?.find((t: TableDefinition) => t.id === tableId)
            return (
              <Badge key={tableId} variant="default" className="px-3 py-1">
                {table?.label || table?.name || tableId}
                <button
                  onClick={() => toggleDetailTable(tableId)}
                  className="ml-2 text-surface-300 hover:text-white"
                >
                  ×
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        {availableDetailTables.map((table: TableDefinition) => (
          <Card
            key={table.id}
            className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${
              detailTables.includes(table.id)
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-surface-700'
            }`}
            onClick={() => toggleDetailTable(table.id)}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={detailTables.includes(table.id)}
                onChange={() => toggleDetailTable(table.id)}
                className="w-4 h-4 rounded border-surface-600 text-primary-500 focus:ring-primary-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-100">{table.label}</p>
                <p className="text-xs text-surface-500">{table.name} · {table.fields?.length || 0} fields</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {table.isSystem ? 'System' : 'Custom'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  // Step 3: Data Entry
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Initial Data Entry</h2>
        <p className="text-surface-400 text-sm">
          Optionally add initial data for each table. You can import from Excel, copy from another
          table, or add rows manually.
        </p>
      </div>

      {selectedTables.length === 0 ? (
        <Card className="p-8 text-center border-surface-700">
          <DocumentTextIcon className="w-12 h-12 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-400">No tables selected yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {selectedTables.map((table: TableDefinition) => (
            <div key={table.id}>
              <h3 className="text-sm font-medium text-surface-200 mb-2 flex items-center gap-2">
                <TableCellsIcon className="w-4 h-4 text-primary-400" />
                {table.label}
                <Badge variant="secondary" className="text-[10px]">
                  {headerTables.includes(table.id) ? 'Primary' : 'Detail'}
                </Badge>
                {initialData[table.id]?.length ? (
                  <Badge variant="default" className="text-xs">
                    {initialData[table.id].length} rows
                  </Badge>
                ) : null}
              </h3>
              <DetailTableEntryGrid
                table={table}
                allTables={allTables || []}
                rows={initialData[table.id] || []}
                onChange={(rows: any[]) => handleDataChange(table.id, rows)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Step 4: Configure Screen
  const renderStep4 = () => {
    const activeTab = tabs.find((t) => t.id === activeTabId)

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Configure Screen</h2>
          <p className="text-surface-400 text-sm">
            Set up the screen properties and organize fields into tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Screen Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="e.g. sales-orders"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sales Orders"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this screen is for..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Screen Type</label>
            <Select value={screenType} onChange={(e) => setScreenType(e.target.value)}>
              {SCREEN_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Icon</label>
            <Select value={screenIcon} onChange={(e) => setScreenIcon(e.target.value)}>
              {ICON_OPTIONS.map((icon) => (
                <option key={icon.value} value={icon.value}>
                  {icon.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="border-t border-surface-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-surface-100">Screen Tabs</h3>
            <div className="flex items-center gap-2">
              <Input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="New tab name..."
                className="w-40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTab()
                }}
              />
              <Button onClick={addTab} variant="secondary" size="sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Tab
              </Button>
            </div>
          </div>

          {/* Tab Headers */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  activeTabId === tab.id
                    ? 'bg-primary-500/20 border border-primary-500 text-primary-300'
                    : 'bg-surface-800 border border-surface-700 text-surface-300 hover:border-surface-600'
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="text-sm font-medium">{tab.name}</span>
                {tab.id !== 'main' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTab(tab.id)
                    }}
                    className="text-surface-500 hover:text-red-400 ml-1"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Tab Field Configuration */}
          {activeTab && (
            <Card className="p-4 border-surface-700">
              <h4 className="text-sm font-medium text-surface-200 mb-3">
                Fields for tab: <span className="text-primary-400">{activeTab.name}</span>
              </h4>
              {selectedTables.length === 0 ? (
                <p className="text-sm text-surface-500">No tables selected.</p>
              ) : (
                <div className="space-y-4">
                  {selectedTables.map((table: TableDefinition) => (
                    <div key={table.id}>
                      <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-2">
                        {table.label}
                        <span className="ml-2 text-surface-600 normal-case">
                          ({headerTables.includes(table.id) ? 'Primary' : 'Detail'})
                        </span>
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {(table.fields || []).map((field) => {
                          const fieldKey = `${table.id}.${field.name}`
                          const isChecked = activeTab.fields[fieldKey] !== false
                          return (
                            <label
                              key={fieldKey}
                              className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer hover:text-surface-100"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTabField(activeTab.id, fieldKey)}
                                className="w-3.5 h-3.5 rounded border-surface-600 text-primary-500 focus:ring-primary-500"
                              />
                              {field.label}
                              <span className="text-xs text-surface-500 ml-1">({field.type})</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Step 5: Validations
  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Validation Rules</h2>
        <p className="text-surface-400 text-sm">
          Define validation rules for your screen fields.
        </p>
      </div>

      {validations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-surface-300 mb-2">Custom Rules</h3>
          <div className="space-y-2">
            {validations.map((rule) => (
              <Card key={rule.id} className="p-3 border-surface-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleValidation(rule.id)}
                      className="w-4 h-4 rounded border-surface-600 text-primary-500"
                    />
                    <span className="text-sm text-surface-200">{rule.field}</span>
                    <Badge variant="secondary" className="text-xs">{rule.operator}</Badge>
                    {rule.value && <span className="text-xs text-surface-400">{rule.value}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">{rule.errorMessage}</span>
                    <button onClick={() => removeValidation(rule.id)} className="text-surface-500 hover:text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="p-4 border-surface-700">
        <h3 className="text-sm font-medium text-surface-200 mb-3">Add Validation Rule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Field</label>
            <Select value={newValidation.field} onChange={(e) => setNewValidation({ ...newValidation, field: e.target.value })}>
              <option value="">Select field...</option>
              {allFields.map((f) => (
                <option key={`${f.tableId}.${f.fieldName}`} value={`${f.tableName}.${f.fieldName}`}>
                  {f.tableLabel} &gt; {f.fieldLabel}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Operator</label>
            <Select value={newValidation.operator} onChange={(e) => setNewValidation({ ...newValidation, operator: e.target.value })}>
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Value</label>
            <Input value={newValidation.value} onChange={(e) => setNewValidation({ ...newValidation, value: e.target.value })} placeholder="Comparison value" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Error Message</label>
            <Input value={newValidation.errorMessage} onChange={(e) => setNewValidation({ ...newValidation, errorMessage: e.target.value })} placeholder="Error message" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={addValidation} variant="secondary" size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Rule
          </Button>
        </div>
      </Card>
    </div>
  )

  // Step 6: Approvals
  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Approval Rules</h2>
        <p className="text-surface-400 text-sm">
          Configure approval workflows with multiple levels and role-based routing.
        </p>
      </div>

      {approvals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-surface-300 mb-2">Approval Rules</h3>
          <div className="space-y-2">
            {approvals.map((rule) => (
              <Card key={rule.id} className="p-3 border-surface-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{rule.triggerStatus}</Badge>
                    <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                    {rule.levels.map((level, i) => (
                      <span key={i} className="text-sm text-surface-300">
                        L{level.level}: {level.role}{i < rule.levels.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                    <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                    <Badge variant="secondary">{rule.targetStatus}</Badge>
                  </div>
                  <button onClick={() => removeApproval(rule.id)} className="text-surface-500 hover:text-red-400">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="p-4 border-surface-700">
        <h3 className="text-sm font-medium text-surface-200 mb-3">Add Approval Rule</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Trigger Status</label>
              <Input value={newApproval.triggerStatus} onChange={(e) => setNewApproval({ ...newApproval, triggerStatus: e.target.value })} placeholder="e.g. Submitted" />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Target Status</label>
              <Input value={newApproval.targetStatus} onChange={(e) => setNewApproval({ ...newApproval, targetStatus: e.target.value })} placeholder="e.g. Approved" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-surface-400">Approval Levels</label>
              <Button onClick={addApprovalLevel} variant="ghost" size="sm">
                <PlusIcon className="w-3 h-3 mr-1" />
                Add Level
              </Button>
            </div>
            <div className="space-y-2">
              {newApproval.levels.map((level, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-surface-500 w-12">L{level.level}</span>
                  <Input value={level.role} onChange={(e) => updateApprovalLevel(index, e.target.value)} placeholder="Role (e.g. Manager, Director)" className="flex-1" />
                  {newApproval.levels.length > 1 && (
                    <button onClick={() => removeApprovalLevel(index)} className="text-surface-500 hover:text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={addApproval} variant="secondary" size="sm">
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Approval Rule
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )


  // Impact rules management
  const addImpactRule = () => {
    if (!newImpact.triggerStatus || !newImpact.impactType) return
    const rule: ImpactRule = {
      id: 'imp-' + Date.now(),
      ...newImpact,
    }
    setImpactRules([...impactRules, rule])
    setNewImpact({ triggerStatus: 'POSTED', impactType: 'GL_POSTING', targetTable: '', description: '', config: {} })
  }

  const removeImpactRule = (id: string) => {
    setImpactRules(impactRules.filter((r) => r.id !== id))
  }

  // Step 7: Impact Rules
  const renderStep7_Impact = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Impact / Posting Rules</h2>
        <p className="text-surface-400 text-sm">
          Define what happens when a document reaches a specific status — create GL entries, update inventory, trigger webhooks, etc.
        </p>
      </div>

      {impactRules.length > 0 && (
        <div className="space-y-2">
          {impactRules.map((rule) => (
            <Card key={rule.id} className="p-3 border-surface-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default">{rule.triggerStatus}</Badge>
                  <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                  <Badge variant="secondary">{IMPACT_TYPES.find((t) => t.value === rule.impactType)?.label || rule.impactType}</Badge>
                  {rule.targetTable && (
                    <>
                      <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                      <span className="text-xs text-surface-300">{rule.targetTable}</span>
                    </>
                  )}
                </div>
                <button onClick={() => removeImpactRule(rule.id)} className="text-surface-500 hover:text-red-400">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              {rule.description && (
                <p className="text-xs text-surface-500 mt-1 ml-1">{rule.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 border-surface-700">
        <h3 className="text-sm font-medium text-surface-200 mb-3">Add Impact Rule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Trigger Status</label>
            <Select value={newImpact.triggerStatus} onChange={(e) => setNewImpact({ ...newImpact, triggerStatus: e.target.value })}>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="POSTED">POSTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Impact Type</label>
            <select value={newImpact.impactType} onChange={(e) => setNewImpact({ ...newImpact, impactType: e.target.value })} className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
              {IMPACT_CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {IMPACT_TYPES.filter((t) => t.category === cat).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Target Table</label>
            <Select value={newImpact.targetTable} onChange={(e) => setNewImpact({ ...newImpact, targetTable: e.target.value })}>
              <option value="">— Select Target —</option>
              {allTables?.map((t: any) => (
                <option key={t.id} value={t.name}>{t.label || t.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Description</label>
            <Input
              value={newImpact.description}
              onChange={(e) => setNewImpact({ ...newImpact, description: e.target.value })}
              placeholder="e.g. Post to GL on approval"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={addImpactRule} variant="secondary" size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Impact Rule
          </Button>
        </div>
      </Card>

      <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700">
        <p className="text-xs text-surface-400">
          <strong className="text-surface-300">Tip:</strong> Add multiple impact rules with the same trigger status to create a Multi-Impact Group.
          When the screen is created, rules sharing a trigger status will be grouped and execute together in a single transaction.
          For example, when a Sales Invoice is <em>Posted</em>, you can automatically create GL entries, reduce inventory, log CRM activity, and update budgets — all atomically.
        </p>
      </div>
    </div>
  )

  // Step 8: Publish
  const renderStep8_Publish = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Publish Location</h2>
        <p className="text-surface-400 text-sm">Choose where this screen will appear in the navigation.</p>
      </div>

      <div className="space-y-3">
        {PUBLISH_LOCATIONS.map((loc) => (
          <Card
            key={loc.value}
            className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${
              publishLocation === loc.value ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'
            }`}
            onClick={() => setPublishLocation(loc.value)}
          >
            <div className="flex items-center gap-3">
              <input type="radio" name="publishLocation" checked={publishLocation === loc.value} onChange={() => setPublishLocation(loc.value)} className="w-4 h-4 text-primary-500 border-surface-600 focus:ring-primary-500" />
              <span className="text-sm font-medium text-surface-200">{loc.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {publishLocation === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Custom Group Name <span className="text-red-400">*</span></label>
          <Input value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} placeholder="e.g. HR Management" />
        </div>
      )}

      <div className="border-t border-surface-700 pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={addToSidebar} onChange={(e) => setAddToSidebar(e.target.checked)} className="w-4 h-4 rounded border-surface-600 text-primary-500 focus:ring-primary-500" />
          <span className="text-sm text-surface-200">Add to sidebar immediately</span>
        </label>
      </div>
    </div>
  )

  // Step 8: Review & Create
  const renderStep9_Review = () => {
    const headerTableNames = headerTables.map((id) => {
      const t = allTables?.find((t: TableDefinition) => t.id === id)
      return t?.label || t?.name || id
    })
    const detailTableNames = detailTables.map((id) => {
      const t = allTables?.find((t: TableDefinition) => t.id === id)
      return t?.label || t?.name || id
    })

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Review & Create</h2>
          <p className="text-surface-400 text-sm">Review your screen configuration before creating.</p>
        </div>

        <Card className="p-6 border-surface-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Screen Name</p>
              <p className="text-sm text-surface-100 font-medium">{screenName}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Display Name</p>
              <p className="text-sm text-surface-100 font-medium">{displayName}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Screen Type</p>
              <p className="text-sm text-surface-100">{SCREEN_TYPES.find((t) => t.value === screenType)?.label}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Icon</p>
              <p className="text-sm text-surface-100">{ICON_OPTIONS.find((i) => i.value === screenIcon)?.label}</p>
            </div>
          </div>

          {description && (
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Description</p>
              <p className="text-sm text-surface-300">{description}</p>
            </div>
          )}

          <div className="border-t border-surface-700 pt-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Primary Tables ({headerTableNames.length})</p>
            <div className="flex flex-wrap gap-2">
              {headerTableNames.map((name, i) => (
                <Badge key={i} variant="default">{name}</Badge>
              ))}
            </div>
          </div>

          {detailTableNames.length > 0 && (
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Detail Tables ({detailTableNames.length})</p>
              <div className="flex flex-wrap gap-2">
                {detailTableNames.map((name, i) => (
                  <Badge key={i} variant="secondary">{name}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-surface-700 pt-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Tabs</p>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Badge key={tab.id} variant="default">{tab.name}</Badge>
              ))}
            </div>
          </div>

          {getDataRowsCount() > 0 && (
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Initial Data Rows</p>
              <p className="text-sm text-surface-200">{getDataRowsCount()} rows</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-surface-700 pt-4">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Validations</p>
              <p className="text-sm text-surface-200">{validations.length} rule(s)</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Approvals</p>
              <p className="text-sm text-surface-200">{approvals.length} rule(s)</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Impact Rules</p>
              <p className="text-sm text-surface-200">{impactRules.length} rule(s)</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wide">Location</p>
              <p className="text-sm text-surface-200">
                {publishLocation === 'custom' ? customGroup : PUBLISH_LOCATIONS.find((l) => l.value === publishLocation)?.label}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep1()
      case 1: return renderStep2()
      case 2: return renderStep3()
      case 3: return renderStep4()
      case 4: return renderStep5()
      case 5: return renderStep6()
      case 6: return renderStep7_Impact()
      case 7: return renderStep8_Publish()
      case 8: return renderStep9_Review()
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-50">Screen Creation Wizard</h1>
          <p className="text-surface-400 mt-1">
            Create a new dynamic screen in {STEP_LABELS.length} steps
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <Card className="p-6 border-surface-700 mb-6">{renderCurrentStep()}</Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="secondary" disabled={currentStep === 0}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-500">
              Step {currentStep + 1} of {STEP_LABELS.length}
            </span>
          </div>

          {currentStep < 8 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate}>
              <RocketLaunchIcon className="w-4 h-4 mr-2" />
              Create Screen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
