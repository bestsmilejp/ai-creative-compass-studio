'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getSitesForUser, getAllSites } from '@/lib/sites';
import type { SiteWithPermission, Site } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Globe, Users, Settings, Cog, Wrench } from 'lucide-react';

export default function DashboardPage() {
  const { user, isSuperAdmin, isDemoMode, demoRole, setDemoRole } = useAuth();
  const [sites, setSites] = useState<SiteWithPermission[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    if (!user) return;

    try {
      const userSites = await getSitesForUser(user.uid, isSuperAdmin, isDemoMode);
      setSites(userSites);

      // If super admin, also fetch all sites with full details
      if (isSuperAdmin) {
        const all = await getAllSites(isDemoMode);
        setAllSites(all);
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
      setError('サイト一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, isDemoMode]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with role indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ダッシュボード
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {isSuperAdmin ? '全サイト管理' : '管理サイト一覧'}
            </p>
          </div>

          {/* Role badge and admin link */}
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Wrench className="w-4 h-4" />
                管理設定
              </Link>
            )}
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <Shield className="w-4 h-4" />
                スーパー管理者
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Users className="w-4 h-4" />
                サイト管理者
              </span>
            )}
          </div>
        </div>

        {/* Demo mode role switcher */}
        {isDemoMode && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              デモ: 権限を切り替えてテスト
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDemoRole('super_admin')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  demoRole === 'super_admin'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-1" />
                スーパー管理者
              </button>
              <button
                onClick={() => setDemoRole('site_admin')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  demoRole === 'site_admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                サイト管理者
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Super Admin: Platform Stats */}
      {isSuperAdmin && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">総サイト数</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {allSites.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">アクティブ</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {allSites.filter((s) => s.is_active).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">非アクティブ</p>
            </div>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
              {allSites.filter((s) => !s.is_active).length}
            </p>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Globe className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            サイトがありません
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isSuperAdmin
              ? '管理設定からサイトを追加してください。'
              : '管理者に連絡してサイトへのアクセス権限を付与してもらってください。'}
          </p>
          {isSuperAdmin && (
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Wrench className="w-4 h-4" />
              管理設定を開く
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            // Find full site data for is_active status
            const fullSite = allSites.find((s) => s.id === site.id);
            const isActive = fullSite?.is_active ?? true;

            return (
              <div
                key={site.id}
                className={`relative bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow ${
                  !isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Settings button for admins */}
                {site.role === 'admin' && (
                  <Link
                    href={`/dashboard/${site.id}/settings`}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Cog className="w-5 h-5" />
                  </Link>
                )}

                <Link href={`/dashboard/${site.id}`} className="block p-6">
                  <div className="flex items-start justify-between pr-8">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {site.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        /{site.slug}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {/* Active/Inactive badge for super admin */}
                      {isSuperAdmin && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {isActive ? 'アクティブ' : '非アクティブ'}
                        </span>
                      )}
                      {/* Role badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          site.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                      >
                        {site.role === 'admin' ? '管理者' : 'マネージャー'}
                      </span>
                    </div>
                  </div>
                  {site.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {site.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>詳細を見る →</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
