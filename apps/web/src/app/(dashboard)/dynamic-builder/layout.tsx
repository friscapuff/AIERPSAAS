'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TableCellsIcon,
  ComputerDesktopIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { label: 'Tables', href: '/dynamic-builder', icon: TableCellsIcon },
  { label: 'Screens', href: '/dynamic-builder/screens', icon: ComputerDesktopIcon },
  { label: 'Approvals', href: '/dynamic-builder/approvals', icon: ShieldCheckIcon },
  { label: 'Validations', href: '/dynamic-builder/validations', icon: CheckBadgeIcon },
  { label: 'Impact Rules', href: '/dynamic-builder/impact-rules', icon: BoltIcon },
];

export default function DynamicBuilderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show tabs on the render page
  if (pathname.startsWith('/dynamic-builder/render')) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-surface-900">Dynamic Builder</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Build custom modules &mdash; tables, screens, rules &amp; automations &mdash; without code
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/dynamic-builder'
                ? pathname === '/dynamic-builder'
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {children}
    </div>
  );
}
