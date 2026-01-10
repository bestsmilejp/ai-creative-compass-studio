'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getSiteById } from '@/lib/sites';
import type { Site } from '@/types';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Trash2,
  Globe,
  FileText,
  Settings,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Webhook,
} from 'lucide-react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SiteSettingsPage() {
  const { user, isDemoMode, isSuperAdmin } = useAuth();
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [slugError, setSlugError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchSite() {
      if (!user || !siteId) return;

      try {
        // Check if siteId is a valid UUID
        const isValidUUID = UUID_REGEX.test(siteId);

        let siteData: Site | null = null;

        if (isDemoMode || !isValidUUID) {
          // Use lib function for demo mode or non-UUID siteId
          siteData = await getSiteById(siteId, isDemoMode);
        } else {
          // Use API route for real sites
          const response = await fetch(`/api/sites/${siteId}/settings`);
          if (response.ok) {
            siteData = await response.json();
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch site');
          }
        }

        if (!siteData) {
          setError('サイトが見つかりません');
          setLoading(false);
          return;
        }
        setSite(siteData);

        // Initialize form
        setName(siteData.name);
        setSlug(siteData.slug);
        setDescription(siteData.description || '');
        setSystemPrompt(siteData.system_prompt || '');
        setWpUrl(siteData.wp_url || '');
        setWpUsername(siteData.wp_username || '');
        setWpAppPassword(siteData.wp_app_password || '');
        setN8nWebhookUrl(siteData.n8n_webhook_url || '');
        setIsActive(siteData.is_active);
      } catch (err) {
        console.error('Failed to fetch site:', err);
        setError('サイト情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchSite();
  }, [user, siteId, isDemoMode]);

  const handleSlugChange = async (value: string) => {
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-');
    setSlug(cleanSlug);
    setSlugError(null);
  };

  const validateSlug = async () => {
    if (!slug) {
      setSlugError('スラッグは必須です');
      return false;
    }
    // Slug validation will be done server-side during save
    return true;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('サイト名を入力してください');
      return;
    }

    const slugValid = await validateSlug();
    if (!slugValid) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    setSlugError(null);

    try {
      if (isDemoMode) {
        // Simulate save in demo mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSuccess('デモモード: 設定を保存しました（実際には保存されません）');
        setSaving(false);
        return;
      }

      const input = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt.trim() || null,
        wp_url: wpUrl.trim() || null,
        wp_username: wpUsername.trim() || null,
        wp_app_password: wpAppPassword.trim() || null,
        n8n_webhook_url: n8nWebhookUrl.trim() || null,
        is_active: isActive,
      };

      const response = await fetch(`/api/sites/${siteId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a slug error
        if (data.error && data.error.includes('スラッグ')) {
          setSlugError(data.error);
        } else {
          setError(data.error || '設定の保存に失敗しました');
        }
        return;
      }

      setSite(data);
      setSuccess('設定を保存しました');
    } catch (err) {
      console.error('Failed to update site:', err);
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Simulate delete in demo mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push('/dashboard');
        return;
      }

      const response = await fetch(`/api/sites/${siteId}/settings`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete site');
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to delete site:', err);
      setError('サイトの削除に失敗しました');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !site) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-500"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/${siteId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          サイトに戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          サイト設定
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">{site?.name}</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            基本情報
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                サイト名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                スラッグ (URL) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm mr-1">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  onBlur={validateSlug}
                  className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    slugError
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {slugError && <p className="mt-1 text-sm text-red-500">{slugError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                説明
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Active Toggle - Only for super admin */}
            {isSuperAdmin && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    サイトステータス
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    非アクティブにすると記事生成が停止します
                  </p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`p-1 rounded-lg transition-colors ${
                    isActive
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {isActive ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AI設定
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              システムプロンプト
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              AIが記事を生成する際の指示やトーンを設定します
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              placeholder="例: 健康に関する専門的で信頼性の高い記事を執筆してください。"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* WordPress Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            WordPress連携
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WordPress URL
              </label>
              <input
                type="url"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ユーザー名
              </label>
              <input
                type="text"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                アプリケーションパスワード
              </label>
              <input
                type="password"
                value={wpAppPassword}
                onChange={(e) => setWpAppPassword(e.target.value)}
                placeholder="既存のパスワードを変更する場合のみ入力"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* n8n Webhook Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            n8n連携
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com/webhook/xxxxx"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                n8nのWebhookトリガーノードのURLを入力してください。記事のAI再生成時にこのURLにPOSTリクエストが送信されます。
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>

        {/* Danger Zone */}
        {isSuperAdmin && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              危険な操作
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              サイトを削除すると、関連するすべての記事やデータが完全に削除されます。この操作は取り消せません。
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                サイトを削除
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm text-red-600 dark:text-red-400">
                  本当に削除しますか？
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
