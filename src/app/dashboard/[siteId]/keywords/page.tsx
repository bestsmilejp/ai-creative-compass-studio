'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getDemoSiteById } from '@/lib/sites';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  AlertCircle,
  Loader2,
  Tag,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Keyword {
  id: string;
  keyword: string;
  priority: number;
  is_active: boolean;
  use_count: number;
  last_used_at: string | null;
}

// Demo keywords
const DEMO_KEYWORDS: Keyword[] = [
  { id: '1', keyword: '健康的な朝食レシピ', priority: 10, is_active: true, use_count: 5, last_used_at: '2024-01-10T09:00:00Z' },
  { id: '2', keyword: '睡眠の質を上げる方法', priority: 9, is_active: true, use_count: 3, last_used_at: '2024-01-09T10:00:00Z' },
  { id: '3', keyword: 'ストレス解消法', priority: 8, is_active: true, use_count: 2, last_used_at: null },
  { id: '4', keyword: '運動習慣の作り方', priority: 7, is_active: false, use_count: 0, last_used_at: null },
  { id: '5', keyword: 'メンタルヘルスケア', priority: 6, is_active: true, use_count: 1, last_used_at: '2024-01-08T14:00:00Z' },
];

export default function KeywordsPage() {
  const { user, isDemoMode } = useAuth();
  const params = useParams();
  const siteId = params.siteId as string;

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [newKeyword, setNewKeyword] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchKeywords = useCallback(async () => {
    if (!user || !siteId) return;

    try {
      const isValidUUID = UUID_REGEX.test(siteId);

      if (isDemoMode || !isValidUUID) {
        const demoSite = getDemoSiteById(siteId);
        setSiteName(demoSite?.name || 'デモサイト');
        setKeywords(DEMO_KEYWORDS);
      } else {
        const response = await fetch(`/api/sites/${siteId}/keywords`);
        if (response.ok) {
          const data = await response.json();
          setKeywords(data.keywords || []);
          setSiteName(data.siteName || '');
        } else {
          throw new Error('キーワードの取得に失敗しました');
        }
      }
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [user, siteId, isDemoMode]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;

    const maxPriority = keywords.length > 0 ? Math.max(...keywords.map(k => k.priority)) : 0;
    const newKw: Keyword = {
      id: `new-${Date.now()}`,
      keyword: newKeyword.trim(),
      priority: maxPriority + 1,
      is_active: true,
      use_count: 0,
      last_used_at: null,
    };

    setKeywords([newKw, ...keywords]);
    setNewKeyword('');
    setHasChanges(true);
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id));
    setHasChanges(true);
  };

  const handleToggleActive = (id: string) => {
    setKeywords(keywords.map(k =>
      k.id === id ? { ...k, is_active: !k.is_active } : k
    ));
    setHasChanges(true);
  };

  const handleMovePriority = (id: string, direction: 'up' | 'down') => {
    const index = keywords.findIndex(k => k.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= keywords.length) return;

    const newKeywords = [...keywords];
    const [moved] = newKeywords.splice(index, 1);
    newKeywords.splice(newIndex, 0, moved);

    // Update priorities
    const updated = newKeywords.map((k, i) => ({
      ...k,
      priority: newKeywords.length - i,
    }));

    setKeywords(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isDemoMode) {
      setSuccess('デモモード: 保存をシミュレートしました');
      setHasChanges(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/keywords`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setSuccess('キーワードを保存しました');
      setHasChanges(false);
      fetchKeywords();
    } catch (err) {
      console.error('Failed to save keywords:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未使用';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/${siteId}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">キーワード設定</h1>
            {siteName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{siteName}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
      </div>

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">デモモード</span>
          </div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            変更は実際には保存されません
          </p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Add keyword form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium mb-2">新しいキーワードを追加</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            placeholder="例: 健康的な朝食レシピ"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!newKeyword.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          記事生成時に使用するキーワードを設定します。優先度の高いものから順に使用されます。
        </p>
      </div>

      {/* Keywords list */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            登録済みキーワード ({keywords.length})
          </h2>
        </div>

        {keywords.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>キーワードが登録されていません</p>
            <p className="text-sm mt-1">上のフォームから追加してください</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {keywords.map((keyword, index) => (
              <div
                key={keyword.id}
                className={`flex items-center gap-4 px-4 py-3 ${
                  !keyword.is_active ? 'opacity-50 bg-gray-50 dark:bg-gray-800/50' : ''
                }`}
              >
                <div className="text-gray-400 cursor-grab">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMovePriority(keyword.id, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMovePriority(keyword.id, 'down')}
                    disabled={index === keywords.length - 1}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{keyword.keyword}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    使用回数: {keyword.use_count} | 最終使用: {formatDate(keyword.last_used_at)}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keyword.is_active}
                    onChange={() => handleToggleActive(keyword.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>

                <button
                  onClick={() => handleRemoveKeyword(keyword.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          未保存の変更があります
        </div>
      )}
    </div>
  );
}
