'use client';

import React, { useState } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import {
  useMyPendingTasks,
  useWorkflowInstances,
  useApproveTask,
  useRejectTask,
  type ApprovalTask,
  type WorkflowInstance,
} from '@/hooks/useWorkflow';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Approve / Reject modal ───────────────────────────────────────────────────
interface ActionModalProps {
  task: ApprovalTask | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
}

function ActionModal({ task, action, onClose }: ActionModalProps) {
  const [comment, setComment] = useState('');
  const approveTask = useApproveTask();
  const rejectTask  = useRejectTask();

  if (!task || !action) return null;

  const isRejection = action === 'reject';
  const isPending   = approveTask.isPending || rejectTask.isPending;

  const handleConfirm = async () => {
    if (isRejection && !comment.trim()) {
      notify.error('A rejection reason is required.');
      return;
    }
    try {
      if (isRejection) {
        await rejectTask.mutateAsync({ taskId: task.id, comment });
        notify.success(`Task rejected.`);
      } else {
        await approveTask.mutateAsync({ taskId: task.id, comment: comment || undefined });
        notify.success(`Task approved.`);
      }
      setComment('');
      onClose();
    } catch {
      notify.error(`Failed to ${action} task.`);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isRejection ? 'Reject Task' : 'Approve Task'}
      description={`${task.workflowName} — ${task.entityReference}`}
      size="md"
      persistent={isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant={isRejection ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={isPending}
          >
            {isRejection ? 'Reject' : 'Approve'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Task summary */}
        <div className="bg-surface-50 rounded-lg p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-surface-500">Entity</span>
            <span className="font-medium text-surface-800">{task.entityReference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Step</span>
            <span className="font-medium text-surface-800">{task.stepName}</span>
          </div>
          {task.dueAt && (
            <div className="flex justify-between">
              <span className="text-surface-500">Due</span>
              <span className={cn('font-medium', new Date(task.dueAt) < new Date() ? 'text-danger-600' : 'text-surface-800')}>
                {formatDateTime(task.dueAt)}
              </span>
            </div>
          )}
        </div>

        <Textarea
          label={isRejection ? 'Rejection Reason' : 'Comment (optional)'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isRejection ? 'Explain why you are rejecting this request…' : 'Add a note (optional)…'}
          required={isRejection}
        />
      </div>
    </Modal>
  );
}

// ─── Instance columns ─────────────────────────────────────────────────────────
const instanceColumns: ColumnDef<WorkflowInstance, unknown>[] = [
  {
    accessorKey: 'entityReference',
    header: 'Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-primary-600 font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'templateName',
    header: 'Workflow',
    cell: ({ getValue }) => <span className="text-sm text-surface-700">{String(getValue())}</span>,
  },
  {
    accessorKey: 'entityType',
    header: 'Type',
    cell: ({ getValue }) => (
      <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'currentStep',
    header: 'Step',
    cell: ({ row }) => {
      const inst = row.original;
      return (
        <span className="text-xs text-surface-600">
          {inst.currentStep + 1} / {inst.tasks.length}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} dot />,
  },
  {
    accessorKey: 'startedAt',
    header: 'Started',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-400">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'initiatedBy',
    header: 'Initiated By',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-600">{String(getValue())}</span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'pending' | 'history';

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [actionState, setActionState] = useState<{
    task: ApprovalTask | null;
    action: 'approve' | 'reject' | null;
  }>({ task: null, action: null });

  const { data: myTasks, isLoading: tasksLoading } = useMyPendingTasks();
  const { data: instancesData, isLoading: instancesLoading } = useWorkflowInstances();

  const handleAction = (task: ApprovalTask, action: 'approve' | 'reject') => {
    setActionState({ task, action });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Workflow & Approvals</h1>
          <p className="text-sm text-surface-500 mt-0.5">Manage pending tasks and approval history</p>
        </div>
        {myTasks && myTasks.length > 0 && (
          <span className="px-3 py-1 bg-warning-100 text-warning-700 text-sm font-semibold rounded-full">
            {myTasks.length} task{myTasks.length !== 1 ? 's' : ''} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-surface-200">
        {([
          { id: 'pending', label: 'My Pending Approvals' },
          { id: 'history', label: 'All Instances' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-700',
            )}
          >
            {tab.label}
            {tab.id === 'pending' && (myTasks?.length ?? 0) > 0 && (
              <span className="ml-1.5 bg-warning-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                {myTasks!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending tasks */}
      {activeTab === 'pending' && (
        <div>
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-surface-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !myTasks?.length ? (
            <Card padding="lg" className="text-center">
              <CheckCircleIcon className="h-12 w-12 text-success-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-surface-700">All caught up!</h3>
              <p className="text-xs text-surface-400 mt-1">No pending approval tasks for you.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {myTasks.map((task) => (
                <Card key={task.id} padding="md" className="border-l-4 border-l-warning-400">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 bg-warning-50 rounded-lg flex items-center justify-center shrink-0">
                        <ClockIcon className="h-5 w-5 text-warning-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-surface-900">{task.entityReference}</span>
                          <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded">{task.entityType}</span>
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {task.workflowName} — <span className="font-medium">{task.stepName}</span>
                        </p>
                        {task.entityDescription && (
                          <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{task.entityDescription}</p>
                        )}
                        <p className="text-2xs text-surface-400 mt-1">
                          Assigned {formatDateTime(task.createdAt)}
                          {task.dueAt && ` · Due ${formatDate(task.dueAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircleIcon className="h-4 w-4" />}
                        onClick={() => handleAction(task, 'reject')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                        onClick={() => handleAction(task, 'approve')}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instance history */}
      {activeTab === 'history' && (
        <DataTable
          data={instancesData?.data ?? []}
          columns={instanceColumns}
          loading={instancesLoading}
          emptyMessage="No workflow instances found"
          emptyDescription="Workflows are started automatically when items are submitted for approval."
        />
      )}

      {/* Action modal */}
      <ActionModal
        task={actionState.task}
        action={actionState.action}
        onClose={() => setActionState({ task: null, action: null })}
      />
    </div>
  );
}
