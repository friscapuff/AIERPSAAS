'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BanknotesIcon,
  CubeIcon,
  TableCellsIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  LinkIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  BanknotesIcon as BanknotesSolidIcon,
  CubeIcon as CubeSolidIcon,
  TableCellsIcon as TableCellsSolidIcon,
  ArrowPathIcon as ArrowPathSolidIcon,
  DocumentChartBarIcon as DocumentChartBarSolidIcon,
  Cog6ToothIcon as CogSolidIcon,
  LinkIcon as LinkSolidIcon,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

// ─── Navigation definition ────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  iconActive: React.ElementType;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: HomeIcon, iconActive: HomeSolidIcon },
    ],
  },
  {
    label: 'Financial',
    items: [
      { label: 'Finance', href: '/finance', icon: BanknotesIcon, iconActive: BanknotesSolidIcon },
      { label: 'Reports', href: '/reports', icon: DocumentChartBarIcon, iconActive: DocumentChartBarSolidIcon },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Inventory', href: '/inventory', icon: CubeIcon, iconActive: CubeSolidIcon },
      { label: 'Workflow', href: '/workflow', icon: ArrowPathIcon, iconActive: ArrowPathSolidIcon },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Dynamic Builder', href: '/dynamic-builder', icon: TableCellsIcon, iconActive: TableCellsSolidIcon },
      { label: 'Webhooks', href: '/settings#webhooks', icon: LinkIcon, iconActive: LinkSolidIcon },
      { label: 'Audit Log', href: '/settings#audit', icon: ShieldCheckIcon, iconActive: ShieldCheckIcon },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', href: '/settings', icon: Cog6ToothIcon, iconActive: CogSolidIcon },
      { label: 'Intercompany', href: '/settings#intercompany', icon: BuildingOffice2Icon, iconActive: BuildingOffice2Icon },
    ],
  },
];

// ─── Single nav item ──────────────────────────────────────────────────────────
interface NavItemComponentProps {
  item: NavItem;
  collapsed: boolean;
}

function NavItemComponent({ item, collapsed }: NavItemComponentProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = isActive ? item.iconActive : item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-surface-300 hover:bg-white/10 hover:text-white',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          isActive ? 'text-white' : 'text-surface-400 group-hover:text-white',
        )}
      />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="ml-auto bg-warning-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { tenant } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface-900 transition-all duration-300 shadow-sidebar',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">AiERP</p>
            {tenant && (
              <p className="text-surface-400 text-xs truncate">{tenant.name}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-2xs font-semibold text-surface-500 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <p className="text-2xs text-surface-600">
            AiERP v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
          </p>
        </div>
      )}
    </aside>
  );
}
