'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { notify } from '@/components/ui/Toast'
import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string
  name: string
  slug: string
  subdomain: string
  status: string
  subscription_plan: string
  is_active: boolean
  created_at: string
}

interface Company {
  id: string
  tenant_id: string
  code: string
  name: string
  legal_name?: string
  tax_id?: string
  registration_number?: string
  currency: string
  address?: string
  phone?: string
  email?: string
  website?: string
  is_active: boolean
}

interface Branch {
  id: string
  tenant_id: string
  company_id: string
  code: string
  name: string
  type: string
  address?: string
  city?: string
  country?: string
  phone?: string
  manager?: string
  is_active: boolean
}

interface Warehouse {
  id: string
  tenant_id: string
  code: string
  name: string
  location?: string
  is_active: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OrganizationManagement() {
  // Data state
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // Selection state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  // Modal/form state
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  // Form data
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', subdomain: '', status: 'trial', subscription_plan: 'FREE' })
  const [companyForm, setCompanyForm] = useState({ code: '', name: '', legal_name: '', tax_id: '', registration_number: '', currency: 'JOD', address: '', phone: '', email: '', website: '' })
  const [branchForm, setBranchForm] = useState({ code: '', name: '', type: 'branch', address: '', city: '', country: 'Jordan', phone: '', manager: '' })

  // ─── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => { fetchTenants() }, [])
  useEffect(() => {
    if (selectedTenant) fetchCompanies(selectedTenant.id)
    else setCompanies([])
  }, [selectedTenant])
  useEffect(() => {
    if (selectedCompany) fetchBranches(selectedCompany.id)
    else setBranches([])
  }, [selectedCompany])
  useEffect(() => { fetchWarehouses() }, [])

  const fetchTenants = async () => {
    try {
      const res = await api.get('/organization/tenants')
      setTenants(res.data || [])
    } catch { setTenants([]) }
  }

  const fetchCompanies = async (tenantId: string) => {
    try {
      const res = await api.get(`/organization/companies?tenant_id=${tenantId}`)
      setCompanies(res.data || [])
    } catch { setCompanies([]) }
  }

  const fetchBranches = async (companyId: string) => {
    try {
      const res = await api.get(`/organization/branches?company_id=${companyId}`)
      setBranches(res.data || [])
    } catch { setBranches([]) }
  }

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/organization/warehouses')
      setWarehouses(res.data || [])
    } catch { setWarehouses([]) }
  }

  // ─── Tenant CRUD ──────────────────────────────────────────────────────────
  const handleCreateTenant = async () => {
    try {
      await api.post('/organization/tenants', tenantForm)
      notify.success('Tenant created successfully')
      setShowTenantForm(false)
      setTenantForm({ name: '', slug: '', subdomain: '', status: 'trial', subscription_plan: 'FREE' })
      fetchTenants()
    } catch (err: any) {
      notify.error(err?.message || 'Failed to create tenant')
    }
  }

  const handleUpdateTenant = async () => {
    if (!editingTenant) return
    try {
      await api.put(`/organization/tenants/${editingTenant.id}`, tenantForm)
      notify.success('Tenant updated')
      setEditingTenant(null)
      setShowTenantForm(false)
      fetchTenants()
    } catch (err: any) {
      notify.error(err?.message || 'Failed to update tenant')
    }
  }

  const startEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setTenantForm({ name: tenant.name, slug: tenant.slug, subdomain: tenant.subdomain || '', status: tenant.status, subscription_plan: tenant.subscription_plan })
    setShowTenantForm(true)
  }

  // ─── Company CRUD ─────────────────────────────────────────────────────────
  const handleCreateCompany = async () => {
    if (!selectedTenant) return
    try {
      await api.post('/organization/companies', { ...companyForm, tenant_id: selectedTenant.id })
      notify.success('Company created successfully')
      setShowCompanyForm(false)
      setCompanyForm({ code: '', name: '', legal_name: '', tax_id: '', registration_number: '', currency: 'JOD', address: '', phone: '', email: '', website: '' })
      fetchCompanies(selectedTenant.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to create company')
    }
  }

  const handleUpdateCompany = async () => {
    if (!editingCompany || !selectedTenant) return
    try {
      await api.put(`/organization/companies/${editingCompany.id}`, companyForm)
      notify.success('Company updated')
      setEditingCompany(null)
      setShowCompanyForm(false)
      fetchCompanies(selectedTenant.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to update company')
    }
  }

  const startEditCompany = (company: Company) => {
    setEditingCompany(company)
    setCompanyForm({ code: company.code, name: company.name, legal_name: company.legal_name || '', tax_id: company.tax_id || '', registration_number: company.registration_number || '', currency: company.currency || 'JOD', address: company.address || '', phone: company.phone || '', email: company.email || '', website: company.website || '' })
    setShowCompanyForm(true)
  }

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return
    try {
      await api.delete(`/organization/companies/${id}`)
      notify.success('Company deleted')
      if (selectedTenant) fetchCompanies(selectedTenant.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to delete company')
    }
  }

  // ─── Branch CRUD ──────────────────────────────────────────────────────────
  const handleCreateBranch = async () => {
    if (!selectedCompany) return
    try {
      await api.post('/organization/branches', { ...branchForm, company_id: selectedCompany.id })
      notify.success('Branch created successfully')
      setShowBranchForm(false)
      setBranchForm({ code: '', name: '', type: 'branch', address: '', city: '', country: 'Jordan', phone: '', manager: '' })
      fetchBranches(selectedCompany.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to create branch')
    }
  }

  const handleUpdateBranch = async () => {
    if (!editingBranch || !selectedCompany) return
    try {
      await api.put(`/organization/branches/${editingBranch.id}`, branchForm)
      notify.success('Branch updated')
      setEditingBranch(null)
      setShowBranchForm(false)
      fetchBranches(selectedCompany.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to update branch')
    }
  }

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setBranchForm({ code: branch.code, name: branch.name, type: branch.type || 'branch', address: branch.address || '', city: branch.city || '', country: branch.country || 'Jordan', phone: branch.phone || '', manager: branch.manager || '' })
    setShowBranchForm(true)
  }

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    try {
      await api.delete(`/organization/branches/${id}`)
      notify.success('Branch deleted')
      if (selectedCompany) fetchBranches(selectedCompany.id)
    } catch (err: any) {
      notify.error(err?.message || 'Failed to delete branch')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-50">Organization Setup</h1>
            <p className="text-surface-400 mt-1">
              Manage tenants, companies, branches, and warehouses
            </p>
          </div>
        </div>

        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => { setSelectedTenant(null); setSelectedCompany(null) }}
            className={`px-3 py-1.5 rounded-lg transition-all ${!selectedTenant ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-surface-400 hover:text-surface-200'}`}
          >
            All Tenants
          </button>
          {selectedTenant && (
            <>
              <ChevronRightIcon className="w-4 h-4 text-surface-600" />
              <button
                onClick={() => setSelectedCompany(null)}
                className={`px-3 py-1.5 rounded-lg transition-all ${!selectedCompany ? 'bg-primary-500/20 text-primary-400 font-medium' : 'text-surface-400 hover:text-surface-200'}`}
              >
                {selectedTenant.name}
              </button>
            </>
          )}
          {selectedCompany && (
            <>
              <ChevronRightIcon className="w-4 h-4 text-surface-600" />
              <span className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 font-medium">
                {selectedCompany.name}
              </span>
            </>
          )}
        </div>

        {/* ─── TENANTS VIEW ──────────────────────────────────────────── */}
        {!selectedTenant && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                <BuildingOffice2Icon className="w-5 h-5 text-primary-400" />
                Tenants ({tenants.length})
              </h2>
              <Button onClick={() => { setEditingTenant(null); setTenantForm({ name: '', slug: '', subdomain: '', status: 'trial', subscription_plan: 'FREE' }); setShowTenantForm(true) }} size="sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                New Tenant
              </Button>
            </div>

            {/* Tenant Form */}
            {showTenantForm && (
              <Card className="p-4 border-primary-500/30 bg-primary-500/5">
                <h3 className="text-sm font-medium text-surface-200 mb-3">{editingTenant ? 'Edit Tenant' : 'Create New Tenant'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} placeholder="Tenant Name" />
                  <Input value={tenantForm.slug} onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value })} placeholder="Slug (unique)" />
                  <Input value={tenantForm.subdomain} onChange={(e) => setTenantForm({ ...tenantForm, subdomain: e.target.value })} placeholder="Subdomain" />
                  <Select value={tenantForm.status} onChange={(e) => setTenantForm({ ...tenantForm, status: e.target.value })}>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                  <Select value={tenantForm.subscription_plan} onChange={(e) => setTenantForm({ ...tenantForm, subscription_plan: e.target.value })}>
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </Select>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={editingTenant ? handleUpdateTenant : handleCreateTenant}>
                    {editingTenant ? 'Update' : 'Create'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setShowTenantForm(false); setEditingTenant(null) }}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Tenant List */}
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="p-4 border-surface-700 hover:border-primary-500/50 transition-all cursor-pointer" onClick={() => setSelectedTenant(tenant)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <BuildingOffice2Icon className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-100">{tenant.name}</p>
                        <p className="text-xs text-surface-500">{tenant.slug} · {tenant.subdomain || 'no subdomain'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {tenant.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{tenant.subscription_plan}</Badge>
                      {tenant.is_active ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-400" />
                      )}
                      <button onClick={(e) => { e.stopPropagation(); startEditTenant(tenant) }} className="p-1 text-surface-500 hover:text-primary-400">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                    </div>
                  </div>
                </Card>
              ))}
              {tenants.length === 0 && (
                <Card className="p-8 text-center border-surface-700">
                  <BuildingOffice2Icon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400">No tenants found. Create your first tenant above.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ─── COMPANIES VIEW ────────────────────────────────────────── */}
        {selectedTenant && !selectedCompany && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-primary-400" />
                Companies in {selectedTenant.name} ({companies.length})
              </h2>
              <Button onClick={() => { setEditingCompany(null); setCompanyForm({ code: '', name: '', legal_name: '', tax_id: '', registration_number: '', currency: 'JOD', address: '', phone: '', email: '', website: '' }); setShowCompanyForm(true) }} size="sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                New Company
              </Button>
            </div>

            {/* Company Form */}
            {showCompanyForm && (
              <Card className="p-4 border-primary-500/30 bg-primary-500/5">
                <h3 className="text-sm font-medium text-surface-200 mb-3">{editingCompany ? 'Edit Company' : 'Create New Company'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={companyForm.code} onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })} placeholder="Code (e.g. BSTC)" />
                  <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Company Name" />
                  <Input value={companyForm.legal_name} onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })} placeholder="Legal Name" />
                  <Input value={companyForm.tax_id} onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} placeholder="Tax ID" />
                  <Input value={companyForm.registration_number} onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })} placeholder="Registration #" />
                  <Select value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}>
                    <option value="JOD">JOD - Jordanian Dinar</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </Select>
                  <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} placeholder="Address" />
                  <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="Phone" />
                  <Input value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="Email" />
                  <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="Website" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={editingCompany ? handleUpdateCompany : handleCreateCompany}>
                    {editingCompany ? 'Update' : 'Create'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setShowCompanyForm(false); setEditingCompany(null) }}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Company List */}
            <div className="space-y-2">
              {companies.map((company) => (
                <Card key={company.id} className="p-4 border-surface-700 hover:border-primary-500/50 transition-all cursor-pointer" onClick={() => setSelectedCompany(company)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <BuildingStorefrontIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-100">{company.name}</p>
                        <p className="text-xs text-surface-500">{company.code} · {company.currency} · {company.tax_id || 'No Tax ID'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {company.is_active ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); startEditCompany(company) }} className="p-1 text-surface-500 hover:text-primary-400">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id) }} className="p-1 text-surface-500 hover:text-red-400">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <ChevronRightIcon className="w-4 h-4 text-surface-500" />
                    </div>
                  </div>
                </Card>
              ))}
              {companies.length === 0 && (
                <Card className="p-8 text-center border-surface-700">
                  <BuildingStorefrontIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400">No companies yet. Create a company for this tenant.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ─── BRANCHES VIEW ─────────────────────────────────────────── */}
        {selectedCompany && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-primary-400" />
                Branches in {selectedCompany.name} ({branches.length})
              </h2>
              <Button onClick={() => { setEditingBranch(null); setBranchForm({ code: '', name: '', type: 'branch', address: '', city: '', country: 'Jordan', phone: '', manager: '' }); setShowBranchForm(true) }} size="sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                New Branch
              </Button>
            </div>

            {/* Branch Form */}
            {showBranchForm && (
              <Card className="p-4 border-primary-500/30 bg-primary-500/5">
                <h3 className="text-sm font-medium text-surface-200 mb-3">{editingBranch ? 'Edit Branch' : 'Create New Branch'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} placeholder="Branch Code (e.g. HQ)" />
                  <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Branch Name" />
                  <Select value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}>
                    <option value="headquarters">Headquarters</option>
                    <option value="branch">Branch</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="sales_office">Sales Office</option>
                    <option value="factory">Factory</option>
                  </Select>
                  <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Address" />
                  <Input value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} placeholder="City" />
                  <Input value={branchForm.country} onChange={(e) => setBranchForm({ ...branchForm, country: e.target.value })} placeholder="Country" />
                  <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="Phone" />
                  <Input value={branchForm.manager} onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })} placeholder="Manager Name" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={editingBranch ? handleUpdateBranch : handleCreateBranch}>
                    {editingBranch ? 'Update' : 'Create'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setShowBranchForm(false); setEditingBranch(null) }}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Branch List */}
            <div className="space-y-2">
              {branches.map((branch) => (
                <Card key={branch.id} className="p-4 border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <MapPinIcon className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-100">{branch.name}</p>
                        <p className="text-xs text-surface-500">{branch.code} · {branch.type} · {branch.city || 'No city'}, {branch.country || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={branch.type === 'headquarters' ? 'default' : 'secondary'} className="text-xs">
                        {branch.type}
                      </Badge>
                      {branch.manager && (
                        <span className="text-xs text-surface-400">Mgr: {branch.manager}</span>
                      )}
                      <button onClick={() => startEditBranch(branch)} className="p-1 text-surface-500 hover:text-primary-400">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteBranch(branch.id)} className="p-1 text-surface-500 hover:text-red-400">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {branches.length === 0 && (
                <Card className="p-8 text-center border-surface-700">
                  <MapPinIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400">No branches yet. Create branches for this company.</p>
                </Card>
              )}
            </div>

            {/* Warehouses associated with this tenant */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-3">
                <BuildingStorefrontIcon className="w-5 h-5 text-yellow-400" />
                Warehouses ({warehouses.length})
              </h2>
              <p className="text-xs text-surface-500 mb-3">
                Warehouses are shared across all branches. Manage them from the Warehouses page.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {warehouses.map((wh) => (
                  <Card key={wh.id} className="p-3 border-surface-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded flex items-center justify-center">
                        <BuildingStorefrontIcon className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm text-surface-200">{wh.name}</p>
                        <p className="text-xs text-surface-500">{wh.code} · {wh.location || 'No location'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
