'use client'

import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { notify } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  is_active: boolean
  is_default: boolean
  created_at: string
}

function useWarehouses() {
  return useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.get('/inventory/warehouses?includeInactive=true')
      return res.data
    },
  })
}

function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { code: string; name: string; address?: string; isDefault?: boolean }) => {
      const res = await api.post('/inventory/warehouses', data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

function useUpdateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; code?: string; name?: string; address?: string; isDefault?: boolean; isActive?: boolean }) => {
      const res = await api.put(`/inventory/warehouses/${id}`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses()
  const createMut = useCreateWarehouse()
  const updateMut = useUpdateWarehouse()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Warehouse | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '', address: '', isDefault: false })

  useEffect(() => {
    if (editItem) {
      setFormData({
        code: editItem.code,
        name: editItem.name,
        address: editItem.address || '',
        isDefault: editItem.is_default,
      })
    } else {
      setFormData({ code: '', name: '', address: '', isDefault: false })
    }
  }, [editItem, showForm])

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      notify.error('Code and Name are required.')
      return
    }
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, ...formData })
        notify.success('Warehouse updated.')
      } else {
        await createMut.mutateAsync(formData)
        notify.success('Warehouse created.')
      }
      setShowForm(false)
      setEditItem(null)
    } catch (err: any) {
      notify.error(err?.response?.data?.message || err?.message || 'Failed to save warehouse.')
    }
  }

  const toggleActive = async (wh: Warehouse) => {
    try {
      await updateMut.mutateAsync({ id: wh.id, isActive: !wh.is_active })
      notify.success(`Warehouse ${wh.is_active ? 'deactivated' : 'activated'}.`)
    } catch {
      notify.error('Failed to update warehouse.')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Warehouses</h1>
          <p className="text-surface-400 text-sm mt-1">Manage your warehouse locations for inventory tracking.</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true) }} leftIcon={<PlusIcon className="h-4 w-4" />}>
          Add Warehouse
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-800 rounded-xl animate-pulse" />)}
        </div>
      ) : !warehouses?.length ? (
        <Card className="p-12 text-center border-surface-700">
          <BuildingStorefrontIcon className="h-16 w-16 text-surface-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-200">No warehouses yet</h3>
          <p className="text-sm text-surface-400 mt-1 mb-6">Add your first warehouse to start tracking inventory by location.</p>
          <Button onClick={() => { setEditItem(null); setShowForm(true) }} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Create First Warehouse
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <Card key={wh.id} className={`p-5 border-surface-700 transition-all ${!wh.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${wh.is_default ? 'bg-primary-500/20' : 'bg-surface-800'}`}>
                    <BuildingStorefrontIcon className={`w-5 h-5 ${wh.is_default ? 'text-primary-400' : 'text-surface-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-100">{wh.name}</h3>
                    <p className="text-xs text-surface-500">Code: {wh.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {wh.is_default && <Badge variant="default" className="text-xs">Default</Badge>}
                  <Badge variant={wh.is_active ? 'success' : 'default'} className="text-xs">
                    {wh.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              {wh.address && (
                <p className="text-xs text-surface-400 mb-3">{wh.address}</p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-surface-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditItem(wh); setShowForm(true) }}
                  leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(wh)}
                  leftIcon={wh.is_active ? <XMarkIcon className="h-3.5 w-3.5" /> : <CheckCircleIcon className="h-3.5 w-3.5" />}
                >
                  {wh.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        title={editItem ? 'Edit Warehouse' : 'Add Warehouse'}
        description="Configure warehouse location details"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditItem(null) }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
              {editItem ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Warehouse Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g. WH-01"
            required
            hint="Unique identifier for this warehouse"
          />
          <Input
            label="Warehouse Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Main Warehouse"
            required
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. 123 Industrial Blvd, Amman"
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4 rounded border-surface-600 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-surface-200">Set as default warehouse</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
