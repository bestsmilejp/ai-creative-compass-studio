'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getDemoSiteById } from '@/lib/sites';
import { supabase } from '@/lib/supabase';
import type { Site, SiteWithPermission } from '@/types';
import type { WPPost, WPPostsResponse } from '@/lib/wordpress';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  FileText,
  PenLine,
  Eye,
  CheckCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';

type WPStatus = 'publish' | 'draft' | 'pending' | 'private' | 'future';

const statusConfig: Record<WPStatus, { label: string; className: string; icon: typeof FileText }> = {
  publish: {
    label: '公開済み',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircle,
  },
  draft: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: PenLine,
  },
  pending: {
    label: 'レビュー待ち',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: Eye,
  },
  private: {
    label: '非公開',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    icon: Eye,
  },
  future: {
    label: '予約投稿',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Eye,
  },
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo posts for testing
const DEMO_POSTS: WPPost[] = [
  {
    id: 1,
    date: '2024-01-10T10:00:00',
    date_gmt: '2024-01-10T01:00:00',
    modified: '2024-01-10T12:00:00',
    modified_gmt: '2024-01-10T03:00:00',
    slug: 'demo-post-1',
    status: 'publish',
    type: 'post',
    link: 'https://example.com/demo-post-1',
    title: { rendered: 'デモ記事1: AIによる記事作成の基礎' },
    content: { rendered: '<p>これはデモ記事です。</p>', protected: false },
    excerpt: { rendered: '<p>デモ記事の抜粋です。</p>', protected: false },
    author: 1,
    featured_media: 0,
    categories: [1],
    tags: [],
  },
  {
    id: 2,
    date: '2024-01-09T14:30:00',
    date_gmt: '2024-01-09T05:30:00',
    modified: '2024-01-09T16:00:00',
    modified_gmt: '2024-01-09T07:00:00',
    slug: 'demo-post-2',
    status: 'draft',
    type: 'post',
    link: 'https://example.com/demo-post-2',
    title: { rendered: 'デモ記事2: SEO最適化テクニック（下書き）' },
    content: { rendered: '<p>これは下書きのデモ記事です。</p>', protected: false },
    excerpt: { rendered: '<p>下書きデモ記事の抜粋です。</p>', protected: false },
    author: 1,
    featured_media: 0,
    categories: [2],
    tags: [],
  },
  {
    id: 3,
    date: '2024-01-08T09:15:00',
    date_gmt: '2024-01-08T00:15:00',
    modified: '2024-01-08T11:00:00',
    modified_gmt: '2024-01-08T02:00:00',
    slug: 'demo-post-3',
    status: 'publish',
    type: 'post',
    link: 'https://example.com/demo-post-3',
    title: { rendered: 'デモ記事3: コンテンツマーケティング戦略' },
    content: { rendered: '<p>コンテンツマーケティングについて解説します。</p>', protected: false },
    excerpt: { rendered: '<p>コンテンツマーケティング戦略の抜粋です。</p>', protected: false },
    author: 1,
    featured_media: 0,
    categories: [1],
    tags: [],
  },
];

export default function SiteDetailPage() {
  const { user, isDemoMode } = useAuth();
  const params = useParams();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<Site | SiteWithPermission | null>(null);
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<WPStatus | 'any'>('any');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Selection for regeneration
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch site info
  useEffect(() => {
    async function fetchSite() {
      if (!user || !siteId) return;

      try {
        // Check if siteId is a valid UUID
        const isValidUUID = UUID_REGEX.test(siteId);

        if (isDemoMode || !isValidUUID) {
          // In demo mode or with non-UUID siteId, try to get demo site
          const demoSite = getDemoSiteById(siteId);
          if (!demoSite) {
            setError('サイトが見つかりません');
            setLoading(false);
            return;
          }
          setSite(demoSite);
        } else {
          // Only query database with valid UUID
          const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('*')
            .eq('id', siteId)
            .single();

          if (siteError) throw siteError;
          setSite(siteData);
        }
      } catch (err) {
        console.error('Failed to fetch site:', err);
        setError('サイト情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchSite();
  }, [user, siteId, isDemoMode]);

  // Fetch posts from WordPress
  const fetchPosts = useCallback(async () => {
    if (!site) return;

    setPostsLoading(true);
    setPostsError(null);

    try {
      if (isDemoMode) {
        // Use demo data
        let filtered = DEMO_POSTS;
        if (statusFilter !== 'any') {
          filtered = filtered.filter((p) => p.status === statusFilter);
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter((p) =>
            p.title.rendered.toLowerCase().includes(query)
          );
        }
        setPosts(filtered);
        setTotal(filtered.length);
        setTotalPages(1);
      } else {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          status: statusFilter,
          orderby: 'modified',
          order: 'desc',
        });

        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const response = await fetch(`/api/sites/${siteId}/posts?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch posts');
        }

        const data: WPPostsResponse = await response.json();
        setPosts(data.posts);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setPostsError(err instanceof Error ? err.message : '記事の取得に失敗しました');
    } finally {
      setPostsLoading(false);
    }
  }, [site, siteId, page, perPage, statusFilter, searchQuery, isDemoMode]);

  // Fetch posts when dependencies change
  useEffect(() => {
    if (site) {
      fetchPosts();
    }
  }, [site, fetchPosts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // Handle post selection
  const handleSelectPost = (postId: number) => {
    setSelectedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map((p) => p.id));
    }
  };

  // Handle AI regeneration
  const handleRegenerate = async () => {
    if (selectedPosts.length === 0) return;

    setRegenerating(true);
    setRegenerateMessage(null);

    try {
      if (isDemoMode) {
        // Simulate webhook call in demo mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setRegenerateMessage({
          type: 'success',
          text: `デモモード: ${selectedPosts.length}件の記事の再生成リクエストをシミュレートしました`,
        });
        setSelectedPosts([]);
        return;
      }

      const response = await fetch(`/api/sites/${siteId}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postIds: selectedPosts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Webhook呼び出しに失敗しました');
      }

      setRegenerateMessage({
        type: 'success',
        text: data.message || `${selectedPosts.length}件の記事の再生成リクエストを送信しました`,
      });
      setSelectedPosts([]);
    } catch (err) {
      console.error('Failed to trigger regeneration:', err);
      setRegenerateMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '再生成リクエストに失敗しました',
      });
    } finally {
      setRegenerating(false);
    }
  };

  // Stats calculation
  const stats = {
    total,
    publish: posts.filter((p) => p.status === 'publish').length,
    draft: posts.filter((p) => p.status === 'draft').length,
    pending: posts.filter((p) => p.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error || 'サイトが見つかりません'}</p>
        <Link
          href="/dashboard"
          className="mt-2 inline-block text-sm text-red-600 hover:text-red-500"
        >
          ← ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{site.name}</h1>
            {site.description && (
              <p className="mt-1 text-gray-600 dark:text-gray-400">{site.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPosts}
              disabled={postsLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${postsLoading ? 'animate-spin' : ''}`} />
              更新
            </button>
            <Link
              href={`/dashboard/${siteId}/settings`}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              設定
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">総記事数</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">公開済み</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.publish}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">下書き</p>
          </div>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-300 mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">レビュー待ち</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {(['any', 'publish', 'draft', 'pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {status === 'any' ? 'すべて' : statusConfig[status].label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="記事を検索..."
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            検索
          </button>
        </form>
      </div>

      {/* Regeneration message */}
      {regenerateMessage && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
            regenerateMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <span
            className={
              regenerateMessage.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }
          >
            {regenerateMessage.text}
          </span>
          <button
            onClick={() => setRegenerateMessage(null)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected actions */}
      {selectedPosts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-200">
            {selectedPosts.length}件選択中
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {regenerating ? '送信中...' : 'AI再生成'}
          </button>
        </div>
      )}

      {/* Posts Error */}
      {postsError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 dark:text-red-400">{postsError}</p>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">
              WordPress API認証情報を確認してください。サイト設定から設定できます。
            </p>
          </div>
        </div>
      )}

      {/* Posts List */}
      {postsLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <FileText className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            記事がありません
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {postsError
              ? 'WordPress APIへの接続を確認してください。'
              : 'WordPressに記事がないか、フィルターに一致する記事がありません。'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Select all header */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPosts.length === posts.length && posts.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  すべて選択
                </span>
              </label>
            </div>

            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {posts.map((post) => {
                const status = post.status as WPStatus;
                const StatusIcon = statusConfig[status]?.icon || FileText;
                const isSelected = selectedPosts.includes(post.id);

                return (
                  <li key={post.id} className={isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                    <div className="px-6 py-4 flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectPost(post.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h3
                            className="text-base font-medium text-gray-900 dark:text-white truncate"
                            dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                          />
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusConfig[status]?.className || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[status]?.label || status}
                            </span>
                            <a
                              href={post.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            更新: {new Date(post.modified).toLocaleDateString('ja-JP')}
                          </span>
                          <span className="mx-2">•</span>
                          <span>ID: {post.id}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {total}件中 {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)}件を表示
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
