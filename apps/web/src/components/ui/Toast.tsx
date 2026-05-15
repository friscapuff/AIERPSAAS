'use client';

import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 64 }}
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '10px',
          background: '#fff',
          color: '#1e293b',
          fontSize: '14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          maxWidth: '420px',
        },
      }}
    />
  );
}

interface CustomToastProps {
  t: { visible: boolean; id: string };
  message: string;
  title: string;
  icon: React.ReactNode;
  borderColor: string;
}

function CustomToast({ t, message, title, icon, borderColor }: CustomToastProps) {
  return (
    <div className={`flex items-start gap-3 bg-white rounded-xl shadow-lg border border-surface-200 border-l-4 ${borderColor} px-4 py-3 max-w-[420px] w-full transition-all duration-300 ${t.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900">{title}</p>
        <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button onClick={() => toast.dismiss(t.id)} className="shrink-0 mt-0.5 text-surface-400 hover:text-surface-600 transition-colors">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export const notify = {
  success: (message: string, title?: string) => toast.custom((t) => <CustomToast t={t} message={message} title={title ?? 'Success'} icon={<CheckCircleIcon className="h-5 w-5 text-success-500" />} borderColor="border-l-success-500" />),
  error: (message: string, title?: string) => toast.custom((t) => <CustomToast t={t} message={message} title={title ?? 'Error'} icon={<ExclamationCircleIcon className="h-5 w-5 text-danger-500" />} borderColor="border-l-danger-500" />),
  info: (message: string, title?: string) => toast.custom((t) => <CustomToast t={t} message={message} title={title ?? 'Info'} icon={<InformationCircleIcon className="h-5 w-5 text-info-500" />} borderColor="border-l-info-500" />),
  warning: (message: string, title?: string) => toast.custom((t) => <CustomToast t={t} message={message} title={title ?? 'Warning'} icon={<ExclamationCircleIcon className="h-5 w-5 text-warning-500" />} borderColor="border-l-warning-500" />),
  dismiss: toast.dismiss,
  loading: (message: string) => toast.loading(message),
};
