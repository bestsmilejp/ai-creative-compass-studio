'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Wrench,
  Briefcase,
  Tag,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  currentSiteId?: string;
  currentSiteName?: string;
}

export function Sidebar({ currentSiteId, currentSiteName }: SidebarProps) {
  const { user, signOut, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNavItems = [
    {
      href: '/dashboard',
      label: 'ダッシュボード',
      icon: LayoutDashboard,
    },
    ...(isSuperAdmin
      ? [
          {
            href: '/dashboard/admin',
            label: '管理設定',
            icon: Wrench,
          },
        ]
      : []),
  ];

  const siteNavItems = currentSiteId
    ? [
        {
          href: `/dashboard/${currentSiteId}`,
          label: '記事一覧',
          icon: FileText,
          exact: true,
        },
        {
          href: `/dashboard/${currentSiteId}/jobs`,
          label: 'ジョブ状況',
          icon: Briefcase,
        },
        {
          href: `/dashboard/${currentSiteId}/keywords`,
          label: 'キーワード設定',
          icon: Tag,
        },
        {
          href: `/dashboard/${currentSiteId}/schedule`,
          label: 'スケジュール設定',
          icon: Clock,
        },
        {
          href: `/dashboard/${currentSiteId}/settings`,
          label: 'サイト設定',
          icon: Settings,
        },
      ]
    : [];

  const isActive = (href: string, exact?: boolean) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/dashboard/admin') {
      return pathname === '/dashboard/admin';
    }
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40
          ${isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-gray-900 dark:text-white">
                  AI Creative
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronLeft
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {/* Main nav */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}

            {/* Site specific nav */}
            {currentSiteId && siteNavItems.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  {!isCollapsed && (
                    <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {currentSiteName || 'サイト'}
                    </p>
                  )}
                </div>
                {siteNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.href, item.exact)
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {user && (
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                )}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={signOut}
              className={`mt-3 flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span>ログアウト</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
