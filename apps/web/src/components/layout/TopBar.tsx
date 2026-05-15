'use client';

import React, { Fragment, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { cn, initials } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

// ─── Breadcrumb builder ───────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  dashboard:       'Dashboard',
  finance:         'Finance',
  inventory:       'Inventory',
  'dynamic-builder': 'Dynamic Builder',
  workflow:        'Workflow',
  reports:         'Reports',
  settings:        'Settings',
  journal:         'Journal Entries',
  new:             'New',
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link href="/dashboard" className="text-surface-400 hover:text-surface-700 transition-colors">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast = idx === segments.length - 1;

        return (
          <React.Fragment key={href}>
            <span className="text-surface-300">/</span>
            {isLast ? (
              <span className="font-medium text-surface-800">{label}</span>
            ) : (
              <Link href={href} className="text-surface-400 hover:text-surface-700 transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
interface TopBarProps {
  onMenuToggle: () => void;
  collapsed: boolean;
}

export function TopBar({ onMenuToggle, collapsed }: TopBarProps) {
  const { user, tenant, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [notifCount] = useState(3); // demo

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-4 gap-4 shrink-0 shadow-sm">
      {/* Left: menu toggle + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: search, notifications, user menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        {showSearch ? (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search anything…"
              onBlur={() => setShowSearch(false)}
              className="w-64 h-8 pl-9 pr-3 rounded-lg border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
            title="Search"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors">
          <BellIcon className="h-5 w-5" />
          {notifCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-danger-500 text-white text-2xs font-bold rounded-full flex items-center justify-center">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        {/* Tenant indicator */}
        {tenant && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-surface-50 rounded-lg border border-surface-200">
            <BuildingOffice2Icon className="h-3.5 w-3.5 text-surface-400" />
            <span className="text-xs text-surface-600 font-medium truncate max-w-[100px]">
              {tenant.name}
            </span>
          </div>
        )}

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <div className="h-7 w-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user ? initials(user.fullName) : '?'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-surface-800 leading-tight">
                {user?.fullName ?? 'Loading…'}
              </p>
              <p className="text-2xs text-surface-400 leading-tight capitalize">
                {user?.role?.toLowerCase() ?? ''}
              </p>
            </div>
            <ChevronDownIcon className="h-3.5 w-3.5 text-surface-400 hidden md:block" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-surface-200 shadow-lg py-1 z-50 focus:outline-none">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-surface-100">
                <p className="text-sm font-semibold text-surface-900">{user?.fullName}</p>
                <p className="text-xs text-surface-500 truncate">{user?.email}</p>
              </div>

              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/settings"
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700',
                      active && 'bg-surface-50',
                    )}
                  >
                    <Cog6ToothIcon className="h-4 w-4 text-surface-400" />
                    Settings
                  </Link>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/settings#profile"
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700',
                      active && 'bg-surface-50',
                    )}
                  >
                    <UserCircleIcon className="h-4 w-4 text-surface-400" />
                    Profile
                  </Link>
                )}
              </Menu.Item>

              <div className="border-t border-surface-100 mt-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger-600',
                        active && 'bg-danger-50',
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
