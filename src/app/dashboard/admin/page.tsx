'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getAllSites } from '@/lib/sites';
import {
  createSite,
  getAllPlatformUsers,
  upsertPlatformUser,
  deletePlatformUser,
  updatePlatformUserRole,
  type PlatformUser,
  type CreateSiteInput,
} from '@/lib/admin';
import { isSlugAvailable } from '@/lib/site-management';
import type { Site, PlatformRole } from '@/types';
import {
  ArrowLeft,
  Plus,
  Globe,
  Users,
  Trash2,
  Shield,
  User,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'sites' | 'users';

// Check if super admin features are enabled
const isSuperAdminEnabled = process.env.NEXT_PUBLIC_ENABLE_SUPER_ADMIN !== 'false';

export default function AdminPage() {
  const { user, isSuperAdmin, isDemoMode } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('sites');
  const [loading, setLoading] = useState(true);

  // Sites state
  const [sites, setSites] = useState<Site[]>([]);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSlug, setNewSiteSlug] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');
  const [newSiteWpUrl, setNewSiteWpUrl] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [creatingSite, setCreatingSite] = useState(false);

  // Users state
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserFirebaseUid, setNewUserFirebaseUid] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<PlatformRole>('user');
  const [addingUser, setAddingUser] = useState(false);

  // Check access
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!isSuperAdmin && !isDemoMode) {
      router.push('/dashboard');
      return;
    }
  }, [user, isSuperAdmin, isDemoMode, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesData, usersData] = await Promise.all([
        getAllSites(isDemoMode),
        isDemoMode ? Promise.resolve([]) : getAllPlatformUsers(),
      ]);
      setSites(sitesData);
      setPlatformUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (user && (isSuperAdmin || isDemoMode)) {
      fetchData();
    }
  }, [user, isSuperAdmin, isDemoMode, fetchData]);

  // Auto-generate slug from name
  const handleSiteNameChange = (name: string) => {
    setNewSiteName(name);
    // Auto-generate slug from name
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
    setNewSiteSlug(autoSlug);
    setSlugError(null);
  };

  // Validate slug
  const handleSlugChange = async (slug: string) => {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-');
    setNewSiteSlug(cleanSlug);
    setSlugError(null);

    if (cleanSlug.length > 0) {
      try {
        const available = await isSlugAvailable(cleanSlug);
        if (!available) {
          setSlugError('このスラッグは既に使用されています');
        }
      } catch {
        // Ignore validation errors
      }
    }
  };

  // Create site
  const handleCreateSite = async () => {
    if (!newSiteName || !newSiteSlug || slugError) return;

    setCreatingSite(true);
    try {
      const input: CreateSiteInput = {
        name: newSiteName,
        slug: newSiteSlug,
        description: newSiteDescription || null,
        wp_url: newSiteWpUrl || null,
        is_active: true,
      };
      await createSite(input);

      // Reset form and refresh
      setNewSiteName('');
      setNewSiteSlug('');
      setNewSiteDescription('');
      setNewSiteWpUrl('');
      setShowCreateSite(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create site:', err);
      alert('サイトの作成に失敗しました');
    } finally {
      setCreatingSite(false);
    }
  };

  // Add platform user
  const handleAddUser = async () => {
    if (!newUserFirebaseUid || !newUserEmail) return;

    setAddingUser(true);
    try {
      await upsertPlatformUser({
        firebase_uid: newUserFirebaseUid,
        email: newUserEmail,
        display_name: newUserDisplayName || null,
        role: newUserRole,
      });

      // Reset form and refresh
      setNewUserFirebaseUid('');
      setNewUserEmail('');
      setNewUserDisplayName('');
      setNewUserRole('user');
      setShowAddUser(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to add user:', err);
      alert('ユーザーの追加に失敗しました');
    } finally {
      setAddingUser(false);
    }
  };

  // Toggle user role
  const handleToggleUserRole = async (platformUser: PlatformUser) => {
    const newRole: PlatformRole = platformUser.role === 'super_admin' ? 'user' : 'super_admin';
    try {
      await updatePlatformUserRole(platformUser.id, newRole);
      await fetchData();
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert('権限の更新に失敗しました');
    }
  };

  // Delete user
  const handleDeleteUser = async (platformUser: PlatformUser) => {
    if (!confirm(`${platformUser.email} を削除しますか？`)) return;

    try {
      await deletePlatformUser(platformUser.id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('ユーザーの削除に失敗しました');
    }
  };

  // Add current user as super_admin (helper for initial setup)
  const handleAddMyselfAsSuperAdmin = async () => {
    if (!user) return;

    setAddingUser(true);
    try {
      await upsertPlatformUser({
        firebase_uid: user.uid,
        email: user.email || '',
        display_name: user.displayName || null,
        role: 'super_admin',
      });
      await fetchData();
      alert('スーパー管理者として登録しました。ページを再読み込みしてください。');
    } catch (err) {
      console.error('Failed to add self as super admin:', err);
      alert('登録に失敗しました');
    } finally {
      setAddingUser(false);
    }
  };

  // Block access if super admin features are disabled (production)
  if (!isSuperAdminEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          管理機能は無効です
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          この機能は本番環境では利用できません。
        </p>
        <Link
          href="/dashboard"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  if (!user || (!isSuperAdmin && !isDemoMode)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              プラットフォーム管理
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              サイトとユーザーを管理
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            デモモードでは変更は保存されません。実際のデータ操作にはSupabase接続が必要です。
          </p>
        </div>
      )}

      {/* Quick setup helper */}
      {!isDemoMode && platformUsers.length === 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
            プラットフォームユーザーがまだ登録されていません。自分自身をスーパー管理者として登録しますか？
          </p>
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-3">
            Firebase UID: {user?.uid}
          </div>
          <button
            onClick={handleAddMyselfAsSuperAdmin}
            disabled={addingUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {addingUser ? '登録中...' : '自分をスーパー管理者として登録'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('sites')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sites'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            サイト管理 ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            プラットフォームユーザー ({platformUsers.length})
          </button>
        </nav>
      </div>

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div>
          {/* Add site button */}
          <div className="mb-4">
            <button
              onClick={() => setShowCreateSite(!showCreateSite)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              サイトを追加
            </button>
          </div>

          {/* Create site form */}
          {showCreateSite && (
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                新規サイト作成
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    サイト名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSiteName}
                    onChange={(e) => handleSiteNameChange(e.target.value)}
                    placeholder="例: App Best Smile"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    スラッグ (URL用) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSiteSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="例: appbestsmile"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      slugError
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {slugError && (
                    <p className="mt-1 text-sm text-red-500">{slugError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    説明
                  </label>
                  <textarea
                    value={newSiteDescription}
                    onChange={(e) => setNewSiteDescription(e.target.value)}
                    placeholder="サイトの説明（任意）"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WordPress URL
                  </label>
                  <input
                    type="url"
                    value={newSiteWpUrl}
                    onChange={(e) => setNewSiteWpUrl(e.target.value)}
                    placeholder="例: https://appbestsmile.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCreateSite}
                    disabled={!newSiteName || !newSiteSlug || !!slugError || creatingSite}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingSite ? '作成中...' : '作成'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSite(false);
                      setNewSiteName('');
                      setNewSiteSlug('');
                      setNewSiteDescription('');
                      setNewSiteWpUrl('');
                      setSlugError(null);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sites list */}
          {sites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Globe className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                サイトがありません
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                上のボタンからサイトを追加してください
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      サイト
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      WordPress URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {site.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            /{site.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {site.wp_url ? (
                          <a
                            href={site.wp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {site.wp_url}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">未設定</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            site.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {site.is_active ? 'アクティブ' : '非アクティブ'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/${site.id}/settings`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          設定
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {isDemoMode ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                デモモード
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                プラットフォームユーザー管理はSupabase接続時のみ利用可能です
              </p>
            </div>
          ) : (
            <>
              {/* Add user button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  ユーザーを追加
                </button>
              </div>

              {/* Add user form */}
              {showAddUser && (
                <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    プラットフォームユーザー追加
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Firebase UID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newUserFirebaseUid}
                        onChange={(e) => setNewUserFirebaseUid(e.target.value)}
                        placeholder="Firebase Authentication のユーザーUID"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Firebase Console {'>'} Authentication {'>'} Users から確認できます
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        メールアドレス <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        表示名
                      </label>
                      <input
                        type="text"
                        value={newUserDisplayName}
                        onChange={(e) => setNewUserDisplayName(e.target.value)}
                        placeholder="ユーザー名（任意）"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        権限 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as PlatformRole)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="user">一般ユーザー</option>
                        <option value="super_admin">スーパー管理者</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddUser}
                        disabled={!newUserFirebaseUid || !newUserEmail || addingUser}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {addingUser ? '追加中...' : '追加'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddUser(false);
                          setNewUserFirebaseUid('');
                          setNewUserEmail('');
                          setNewUserDisplayName('');
                          setNewUserRole('user');
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users list */}
              {platformUsers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    プラットフォームユーザーがいません
                  </h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    上のボタンからユーザーを追加してください
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          ユーザー
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Firebase UID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          権限
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {platformUsers.map((platformUser) => (
                        <tr key={platformUser.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {platformUser.display_name || '(名前未設定)'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {platformUser.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {platformUser.firebase_uid.substring(0, 20)}...
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                platformUser.role === 'super_admin'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {platformUser.role === 'super_admin' ? (
                                <>
                                  <Shield className="w-3 h-3" />
                                  スーパー管理者
                                </>
                              ) : (
                                <>
                                  <User className="w-3 h-3" />
                                  一般ユーザー
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleUserRole(platformUser)}
                                className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                title={platformUser.role === 'super_admin' ? '一般ユーザーに変更' : 'スーパー管理者に変更'}
                              >
                                {platformUser.role === 'super_admin' ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(platformUser)}
                                className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
