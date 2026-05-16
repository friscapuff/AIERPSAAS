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
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  RocketLaunchIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  ChartBarIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useAllTablesGrouped, TableDefinition } from '@/hooks/useAllTables'

interface ColumnConfig {
  id: string
  tableId: string
  tableName: string
  tableLabel: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  aggregation: string
  alias: string
  visible: boolean
}

interface FilterRule {
  id: string
  column: string
  columnLabel: string
  operator: string
  value: string
  logic: 'AND' | 'OR'
}

interface SortRule {
  id: string
  column: string
  columnLabel: string
  direction: 'ASC' | 'DESC'
}

const STEP_LABELS = ['Select Tables', 'Columns & Aggregations', 'Filters', 'Grouping & Sorting', 'Output Format', 'Schedule', 'Review & Create']
const STEP_ICONS = [TableCellsIcon, DocumentTextIcon, FunnelIcon, ArrowsUpDownIcon, DocumentArrowDownIcon, ClockIcon, RocketLaunchIcon]

const AGGREGATIONS = [
  { value: 'none', label: 'None' }, { value: 'sum', label: 'SUM' }, { value: 'avg', label: 'AVG' },
  { value: 'count', label: 'COUNT' }, { value: 'min', label: 'MIN' }, { value: 'max', label: 'MAX' },
]

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' }, { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' }, { value: 'starts_with', label: 'Starts With' },
  { value: 'greater_than', label: 'Greater Than' }, { value: 'less_than', label: 'Less Than' },
  { value: 'between', label: 'Between' }, { value: 'in', label: 'In List' },
  { value: 'is_null', label: 'Is Null' }, { value: 'is_not_null', label: 'Is Not Null' },
]

const OUTPUT_FORMATS = [
  { value: 'screen', label: 'On-Screen', description: 'View in browser', icon: 'screen' },
  { value: 'pdf', label: 'PDF Export', description: 'Formatted PDF', icon: 'pdf' },
  { value: 'excel', label: 'Excel Export', description: '.xlsx spreadsheet', icon: 'excel' },
  { value: 'csv', label: 'CSV Export', description: 'Comma-separated values', icon: 'csv' },
]

const SCHEDULE_OPTIONS = [
  { value: 'none', label: 'No Schedule (Manual)' }, { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }, { value: 'custom', label: 'Custom Cron' },
]

const PUBLISH_LOCATIONS = [
  { value: 'reports', label: 'Reports' }, { value: 'financial', label: 'Financial Reports' },
  { value: 'operations', label: 'Operations Reports' }, { value: 'custom', label: 'Custom Group' },
]

export default function ReportCreationWizard() {
  const router = useRouter()
  const { systemTables, dynamicTables, allTables } = useAllTablesGrouped()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])
  const [tableSearch, setTableSearch] = useState('')
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [filters, setFilters] = useState<FilterRule[]>([])
  const [newFilter, setNewFilter] = useState({ column: '', operator: 'equals', value: '', logic: 'AND' as const })
  const [groupByColumns, setGroupByColumns] = useState<string[]>([])
  const [sortRules, setSortRules] = useState<SortRule[]>([])
  const [newSort, setNewSort] = useState({ column: '', direction: 'ASC' as const })
  const [outputFormat, setOutputFormat] = useState('screen')
  const [reportName, setReportName] = useState('')
  const [reportDisplayName, setReportDisplayName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [pageOrientation, setPageOrientation] = useState('portrait')
  const [includeCharts, setIncludeCharts] = useState(false)
  const [chartType, setChartType] = useState('bar')
  const [schedule, setSchedule] = useState('none')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('1')
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('1')
  const [customCron, setCustomCron] = useState('')
  const [emailRecipients, setEmailRecipients] = useState('')
  const [publishLocation, setPublishLocation] = useState('reports')
  const [customGroup, setCustomGroup] = useState('')
  const [addToSidebar, setAddToSidebar] = useState(true)

  const selectedTables = useMemo(() => allTables?.filter((t: TableDefinition) => selectedTableIds.includes(t.id)) || [], [selectedTableIds, allTables])
  const allAvailableFields = useMemo(() => {
    const fields: any[] = []
    selectedTables.forEach((table: TableDefinition) => {
      (table.fields || []).forEach((field) => fields.push({ tableId: table.id, tableName: table.name, tableLabel: table.label, fieldName: field.name, fieldLabel: field.label, fieldType: field.type }))
    })
    return fields
  }, [selectedTables])
  const filteredTables = useMemo(() => {
    const filter = (tables: TableDefinition[]) => tables.filter((t) => (t.label || t.name).toLowerCase().includes(tableSearch.toLowerCase()))
    return { system: filter(systemTables || []), custom: filter(dynamicTables || []) }
  }, [systemTables, dynamicTables, tableSearch])

  const syncColumnsToTables = () => {
    const existing = new Set(columns.map((c) => c.id))
    const newCols = [...columns]
    allAvailableFields.forEach((f) => {
      const key = `${f.tableId}.${f.fieldName}`
      if (!existing.has(key)) newCols.push({ id: key, ...f, aggregation: 'none', alias: '', visible: true })
    })
    setColumns(newCols.filter((c) => selectedTableIds.includes(c.tableId)))
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return selectedTableIds.length > 0
      case 1: return columns.some((c) => c.visible)
      case 2: return true
      case 3: return true
      case 4: return !!reportName && !!reportDisplayName
      case 5: return schedule !== 'custom' || !!customCron.trim()
      case 6: return true
      default: return false
    }
  }

  const handleNext = () => { if (currentStep === 0) syncColumnsToTables(); if (currentStep < 6 && canProceed()) setCurrentStep(currentStep + 1) }
  const handleBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }
  const toggleTable = (id: string) => setSelectedTableIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleColumnVisibility = (id: string) => setColumns(columns.map((c) => c.id === id ? { ...c, visible: !c.visible } : c))
  const updateColumnAggregation = (id: string, agg: string) => setColumns(columns.map((c) => c.id === id ? { ...c, aggregation: agg } : c))
  const updateColumnAlias = (id: string, alias: string) => setColumns(columns.map((c) => c.id === id ? { ...c, alias } : c))

  const addFilter = () => {
    if (!newFilter.column) return
    const field = allAvailableFields.find((f) => `${f.tableName}.${f.fieldName}` === newFilter.column)
    setFilters([...filters, { id: 'flt-' + Date.now(), column: newFilter.column, columnLabel: field ? `${field.tableLabel} > ${field.fieldLabel}` : newFilter.column, operator: newFilter.operator, value: newFilter.value, logic: newFilter.logic }])
    setNewFilter({ column: '', operator: 'equals', value: '', logic: 'AND' })
  }
  const removeFilter = (id: string) => setFilters(filters.filter((f) => f.id !== id))

  const addSort = () => {
    if (!newSort.column) return
    const field = allAvailableFields.find((f) => `${f.tableName}.${f.fieldName}` === newSort.column)
    setSortRules([...sortRules, { id: 'srt-' + Date.now(), column: newSort.column, columnLabel: field ? `${field.tableLabel} > ${field.fieldLabel}` : newSort.column, direction: newSort.direction }])
    setNewSort({ column: '', direction: 'ASC' })
  }
  const removeSort = (id: string) => setSortRules(sortRules.filter((s) => s.id !== id))
  const toggleGroupBy = (key: string) => setGroupByColumns((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key])

  const handleCreate = async () => {
    try {
      const payload = { reportName, displayName: reportDisplayName, description: reportDescription, tables: selectedTableIds, columns: columns.filter((c) => c.visible), filters, groupBy: groupByColumns, sortRules, outputFormat, pageOrientation, includeCharts, chartType: includeCharts ? chartType : null, schedule: schedule !== 'none' ? { frequency: schedule, time: scheduleTime, dayOfWeek: schedule === 'weekly' ? scheduleDayOfWeek : undefined, dayOfMonth: ['monthly','quarterly'].includes(schedule) ? scheduleDayOfMonth : undefined, cron: schedule === 'custom' ? customCron : undefined, emailRecipients: emailRecipients.split(',').map((e) => e.trim()).filter(Boolean) } : null, publishLocation: publishLocation === 'custom' ? customGroup : publishLocation, addToSidebar }
      const res = await fetch('/api/v1/dynamic-builder/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to create report')
      notify.success('Report created successfully!')
      router.push('/dynamic-builder')
    } catch (error: any) { notify.error(error?.message || 'Failed to create report') }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEP_LABELS.map((label, index) => {
        const Icon = STEP_ICONS[index]
        const isComplete = index < currentStep
        const isCurrent = index === currentStep
        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-primary-500 text-white' : isCurrent ? 'bg-primary-500/20 border-2 border-primary-500 text-primary-500' : 'bg-surface-800 text-surface-400 border border-surface-700'}`}>
                {isComplete ? <CheckIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-1 text-center max-w-[80px] ${isCurrent ? 'text-primary-400 font-medium' : 'text-surface-500'}`}>{label}</span>
            </div>
            {index < STEP_LABELS.length - 1 && <div className={`w-8 h-0.5 mx-1 mt-[-16px] ${index < currentStep ? 'bg-primary-500' : 'bg-surface-700'}`} />}
          </div>
        )
      })}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-surface-100 mb-2">Select Data Sources</h2><p className="text-surface-400 text-sm">Choose tables for your report.</p></div>
      {selectedTableIds.length > 0 && (<div className="flex flex-wrap gap-2">{selectedTableIds.map((id) => { const t = allTables?.find((t: TableDefinition) => t.id === id); return (<Badge key={id} variant="default" className="px-3 py-1.5">{t?.label || id}<button onClick={() => toggleTable(id)} className="ml-2 text-surface-300 hover:text-white">×</button></Badge>) })}</div>)}
      <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" /><Input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search tables..." className="pl-10" /></div>
      {filteredTables.system.length > 0 && (<div><h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2"><Badge variant="default">System</Badge> Tables</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{filteredTables.system.map((table: TableDefinition) => { const isSelected = selectedTableIds.includes(table.id); return (<Card key={table.id} className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'}`} onClick={() => toggleTable(table.id)}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={() => toggleTable(table.id)} className="w-4 h-4 rounded border-surface-600 text-primary-500" /><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-500/20' : 'bg-surface-800'}`}><TableCellsIcon className={`w-5 h-5 ${isSelected ? 'text-primary-400' : 'text-surface-400'}`} /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-100 truncate">{table.label}</p><p className="text-xs text-surface-500">{table.name} · {table.fields?.length || 0} fields</p></div>{isSelected && <CheckCircleIcon className="w-5 h-5 text-primary-500" />}</div></Card>) })}</div></div>)}
      {filteredTables.custom.length > 0 && (<div><h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2"><Badge variant="secondary">Custom</Badge> Tables</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{filteredTables.custom.map((table: TableDefinition) => { const isSelected = selectedTableIds.includes(table.id); return (<Card key={table.id} className={`p-4 cursor-pointer transition-all hover:border-primary-500/50 ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'}`} onClick={() => toggleTable(table.id)}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={() => toggleTable(table.id)} className="w-4 h-4 rounded border-surface-600 text-primary-500" /><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-500/20' : 'bg-surface-800'}`}><CubeIcon className={`w-5 h-5 ${isSelected ? 'text-primary-400' : 'text-surface-400'}`} /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-100 truncate">{table.label}</p><p className="text-xs text-surface-500">{table.name} · {table.fields?.length || 0} fields</p></div>{isSelected && <CheckCircleIcon className="w-5 h-5 text-primary-500" />}</div></Card>) })}</div></div>)}
    </div>
  )

  const renderStep2 = () => (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Columns & Aggregations</h2><p className="text-surface-400 text-sm">Select columns and set aggregations (SUM, AVG, COUNT, etc.).</p></div>{selectedTables.map((table: TableDefinition) => (<div key={table.id}><h3 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2"><TableCellsIcon className="w-4 h-4 text-primary-400" /> {table.label}</h3><div className="space-y-2">{columns.filter((c) => c.tableId === table.id).map((col) => (<Card key={col.id} className={`p-3 border-surface-700 ${col.visible ? '' : 'opacity-50'}`}><div className="flex items-center gap-4"><input type="checkbox" checked={col.visible} onChange={() => toggleColumnVisibility(col.id)} className="w-4 h-4 rounded border-surface-600 text-primary-500" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-200">{col.fieldLabel}</p><p className="text-xs text-surface-500">{col.fieldName} · {col.fieldType}</p></div><div className="w-28"><Select value={col.aggregation} onChange={(e) => updateColumnAggregation(col.id, e.target.value)} disabled={!col.visible}>{AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</Select></div><div className="w-36"><Input value={col.alias} onChange={(e) => updateColumnAlias(col.id, e.target.value)} placeholder="Alias..." disabled={!col.visible} className="text-sm" /></div></div></Card>))}</div></div>))}<div className="text-sm text-surface-400"><CalculatorIcon className="w-4 h-4 inline mr-1" />{columns.filter((c) => c.visible).length} column(s) · {columns.filter((c) => c.aggregation !== 'none').length} aggregated</div></div>)

  const renderStep3 = () => (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Filters</h2><p className="text-surface-400 text-sm">Define conditions to filter report data.</p></div>{filters.length > 0 && (<div className="space-y-2">{filters.map((f, i) => (<Card key={f.id} className="p-3 border-surface-700"><div className="flex items-center gap-3">{i > 0 && <Badge variant="secondary" className="text-xs">{f.logic}</Badge>}<span className="text-sm text-surface-200">{f.columnLabel}</span><Badge variant="default" className="text-xs">{f.operator}</Badge>{f.value && <span className="text-sm text-surface-300">"{f.value}"</span>}<div className="flex-1" /><button onClick={() => removeFilter(f.id)} className="text-surface-500 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button></div></Card>))}</div>)}<Card className="p-4 border-surface-700"><h3 className="text-sm font-medium text-surface-200 mb-3">Add Filter</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"><div><label className="block text-xs text-surface-400 mb-1">Column</label><Select value={newFilter.column} onChange={(e) => setNewFilter({ ...newFilter, column: e.target.value })}><option value="">Select...</option>{allAvailableFields.map((f) => (<option key={`${f.tableId}.${f.fieldName}`} value={`${f.tableName}.${f.fieldName}`}>{f.tableLabel} &gt; {f.fieldLabel}</option>))}</Select></div><div><label className="block text-xs text-surface-400 mb-1">Operator</label><Select value={newFilter.operator} onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value })}>{FILTER_OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</Select></div><div><label className="block text-xs text-surface-400 mb-1">Value</label><Input value={newFilter.value} onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })} placeholder="Filter value..." /></div><div><label className="block text-xs text-surface-400 mb-1">Logic</label><Select value={newFilter.logic} onChange={(e) => setNewFilter({ ...newFilter, logic: e.target.value as 'AND' | 'OR' })}><option value="AND">AND</option><option value="OR">OR</option></Select></div></div><div className="mt-3 flex justify-end"><Button onClick={addFilter} variant="secondary" size="sm"><PlusIcon className="w-4 h-4 mr-1" /> Add Filter</Button></div></Card></div>)

  const renderStep4 = () => { const visibleCols = columns.filter((c) => c.visible); return (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Grouping & Sorting</h2><p className="text-surface-400 text-sm">Group and sort your report data.</p></div><div><h3 className="text-sm font-medium text-surface-200 mb-3">Group By</h3><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">{visibleCols.map((col) => { const key = `${col.tableName}.${col.fieldName}`; return (<label key={col.id} className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer"><input type="checkbox" checked={groupByColumns.includes(key)} onChange={() => toggleGroupBy(key)} className="w-3.5 h-3.5 rounded border-surface-600 text-primary-500" />{col.alias || col.fieldLabel}</label>) })}</div></div><div><h3 className="text-sm font-medium text-surface-200 mb-3">Sort Order</h3>{sortRules.length > 0 && (<div className="space-y-2 mb-4">{sortRules.map((s, i) => (<Card key={s.id} className="p-3 border-surface-700"><div className="flex items-center gap-3"><span className="text-xs text-surface-500 w-6">{i+1}.</span><span className="text-sm text-surface-200">{s.columnLabel}</span><Badge variant={s.direction === 'ASC' ? 'default' : 'secondary'} className="text-xs">{s.direction === 'ASC' ? '↑ Asc' : '↓ Desc'}</Badge><div className="flex-1" /><button onClick={() => removeSort(s.id)} className="text-surface-500 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button></div></Card>))}</div>)}<div className="flex items-end gap-3"><div className="flex-1"><label className="block text-xs text-surface-400 mb-1">Column</label><Select value={newSort.column} onChange={(e) => setNewSort({ ...newSort, column: e.target.value })}><option value="">Select...</option>{allAvailableFields.map((f) => (<option key={`${f.tableId}.${f.fieldName}`} value={`${f.tableName}.${f.fieldName}`}>{f.tableLabel} &gt; {f.fieldLabel}</option>))}</Select></div><div className="w-36"><label className="block text-xs text-surface-400 mb-1">Direction</label><Select value={newSort.direction} onChange={(e) => setNewSort({ ...newSort, direction: e.target.value as 'ASC' | 'DESC' })}><option value="ASC">Ascending</option><option value="DESC">Descending</option></Select></div><Button onClick={addSort} variant="secondary" size="sm"><PlusIcon className="w-4 h-4 mr-1" /> Add</Button></div></div></div>) }

  const renderStep5 = () => (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Output Format & Details</h2><p className="text-surface-400 text-sm">Configure how the report is generated.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-surface-300 mb-1">Report Name <span className="text-red-400">*</span></label><Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="e.g. monthly-sales" /></div><div><label className="block text-sm font-medium text-surface-300 mb-1">Display Name <span className="text-red-400">*</span></label><Input value={reportDisplayName} onChange={(e) => setReportDisplayName(e.target.value)} placeholder="e.g. Monthly Sales" /></div></div><div><label className="block text-sm font-medium text-surface-300 mb-1">Description</label><Textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Describe this report..." rows={2} /></div><div><h3 className="text-sm font-medium text-surface-200 mb-3">Format</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{OUTPUT_FORMATS.map((fmt) => (<Card key={fmt.value} className={`p-4 cursor-pointer text-center ${outputFormat === fmt.value ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'}`} onClick={() => setOutputFormat(fmt.value)}><p className="text-sm font-medium text-surface-200">{fmt.label}</p><p className="text-xs text-surface-500 mt-1">{fmt.description}</p></Card>))}</div></div>{outputFormat === 'pdf' && (<div><label className="block text-sm font-medium text-surface-300 mb-1">Orientation</label><Select value={pageOrientation} onChange={(e) => setPageOrientation(e.target.value)}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></Select></div>)}<div className="border-t border-surface-700 pt-4"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} className="w-4 h-4 rounded border-surface-600 text-primary-500" /><span className="text-sm text-surface-200">Include chart visualization</span></label>{includeCharts && (<div className="mt-3 w-48"><Select value={chartType} onChange={(e) => setChartType(e.target.value)}><option value="bar">Bar Chart</option><option value="line">Line Chart</option><option value="pie">Pie Chart</option><option value="area">Area Chart</option></Select></div>)}</div></div>)

  const renderStep6 = () => (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Schedule & Publish</h2><p className="text-surface-400 text-sm">Set up automated execution.</p></div><div><label className="block text-sm font-medium text-surface-300 mb-1">Schedule</label><Select value={schedule} onChange={(e) => setSchedule(e.target.value)}>{SCHEDULE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>{schedule !== 'none' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-surface-300 mb-1">Time</label><Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></div>{schedule === 'weekly' && (<div><label className="block text-sm font-medium text-surface-300 mb-1">Day</label><Select value={scheduleDayOfWeek} onChange={(e) => setScheduleDayOfWeek(e.target.value)}><option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option></Select></div>)}{schedule === 'custom' && (<div><label className="block text-sm font-medium text-surface-300 mb-1">Cron <span className="text-red-400">*</span></label><Input value={customCron} onChange={(e) => setCustomCron(e.target.value)} placeholder="0 8 * * 1-5" /></div>)}<div className="md:col-span-2"><label className="block text-sm font-medium text-surface-300 mb-1">Email Recipients</label><Input value={emailRecipients} onChange={(e) => setEmailRecipients(e.target.value)} placeholder="user@example.com" /></div></div>)}<div className="border-t border-surface-700 pt-4"><h3 className="text-sm font-medium text-surface-200 mb-3">Publish Location</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{PUBLISH_LOCATIONS.map((loc) => (<Card key={loc.value} className={`p-3 cursor-pointer text-center ${publishLocation === loc.value ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700'}`} onClick={() => setPublishLocation(loc.value)}><p className="text-sm text-surface-200">{loc.label}</p></Card>))}</div>{publishLocation === 'custom' && <Input className="mt-3" value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} placeholder="Group name..." />}</div><label className="flex items-center gap-3"><input type="checkbox" checked={addToSidebar} onChange={(e) => setAddToSidebar(e.target.checked)} className="w-4 h-4 rounded border-surface-600 text-primary-500" /><span className="text-sm text-surface-200">Add to sidebar</span></label></div>)

  const renderStep7 = () => { const tableNames = selectedTableIds.map((id) => { const t = allTables?.find((t: TableDefinition) => t.id === id); return t?.label || id }); const visibleCols = columns.filter((c) => c.visible); return (<div className="space-y-6"><div><h2 className="text-xl font-semibold text-surface-100 mb-2">Review & Create</h2><p className="text-surface-400 text-sm">Review your report configuration.</p></div><Card className="p-6 border-surface-700 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-xs text-surface-500 uppercase">Report Name</p><p className="text-sm text-surface-100 font-medium">{reportName}</p></div><div><p className="text-xs text-surface-500 uppercase">Display Name</p><p className="text-sm text-surface-100 font-medium">{reportDisplayName}</p></div><div><p className="text-xs text-surface-500 uppercase">Format</p><p className="text-sm text-surface-100">{OUTPUT_FORMATS.find((f) => f.value === outputFormat)?.label}</p></div><div><p className="text-xs text-surface-500 uppercase">Schedule</p><p className="text-sm text-surface-100">{SCHEDULE_OPTIONS.find((s) => s.value === schedule)?.label}</p></div></div><div className="border-t border-surface-700 pt-4"><p className="text-xs text-surface-500 uppercase mb-2">Tables ({tableNames.length})</p><div className="flex flex-wrap gap-2">{tableNames.map((n, i) => <Badge key={i} variant="default">{n}</Badge>)}</div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-surface-700 pt-4"><div><p className="text-xs text-surface-500 uppercase">Columns</p><p className="text-sm text-surface-200">{visibleCols.length}</p></div><div><p className="text-xs text-surface-500 uppercase">Filters</p><p className="text-sm text-surface-200">{filters.length}</p></div><div><p className="text-xs text-surface-500 uppercase">Group By</p><p className="text-sm text-surface-200">{groupByColumns.length}</p></div><div><p className="text-xs text-surface-500 uppercase">Sort</p><p className="text-sm text-surface-200">{sortRules.length}</p></div></div></Card></div>) }

  const renderCurrentStep = () => { switch (currentStep) { case 0: return renderStep1(); case 1: return renderStep2(); case 2: return renderStep3(); case 3: return renderStep4(); case 4: return renderStep5(); case 5: return renderStep6(); case 6: return renderStep7(); default: return null } }

  return (
    <div className="min-h-screen bg-surface-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-surface-50">Report Creation Wizard</h1><p className="text-surface-400 mt-1">Create a new report in {STEP_LABELS.length} steps</p></div>
        {renderStepIndicator()}
        <Card className="p-6 border-surface-700 mb-6">{renderCurrentStep()}</Card>
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="secondary" disabled={currentStep === 0}><ArrowLeftIcon className="w-4 h-4 mr-2" /> Back</Button>
          <span className="text-sm text-surface-500">Step {currentStep + 1} of {STEP_LABELS.length}</span>
          {currentStep < 6 ? (<Button onClick={handleNext} disabled={!canProceed()}>Next <ArrowRightIcon className="w-4 h-4 ml-2" /></Button>) : (<Button onClick={handleCreate}><RocketLaunchIcon className="w-4 h-4 mr-2" /> Create Report</Button>)}
        </div>
      </div>
    </div>
  )
}
