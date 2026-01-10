'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getArticleById, updateArticleStatus, addFeedbackToHistory } from '@/lib/articles';
import { triggerRegeneration } from '@/lib/n8n';
import { supabase } from '@/lib/supabase';
import { getDemoSiteById } from '@/lib/sites';

import { SwellPreview } from '@/components/swell/SwellPreview';
import type { Article, Site, SiteWithPermission, FeedbackHistoryItem, SourceDataItem } from '@/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  ExternalLink,
  FileText,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ArticleStatus = 'draft' | 'review' | 'published';

const statusConfig: Record<ArticleStatus, { label: string; className: string }> = {
  draft: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  review: {
    label: 'レビュー待ち',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  published: {
    label: '公開済み',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
};

export default function ArticleDetailPage() {
  const { user, isDemoMode } = useAuth();
  const params = useParams();
  const siteId = params.siteId as string;
  const articleId = params.articleId as string;

  const [site, setSite] = useState<Site | SiteWithPermission | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(true);
  const [newFeedback, setNewFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user || !siteId || !articleId) return;

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

        // Fetch article (handles demo mode internally)
        const articleData = await getArticleById(articleId);
        if (!articleData) {
          setError('記事が見つかりません');
          return;
        }
        setArticle(articleData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, siteId, articleId, isDemoMode]);

  const handleStatusChange = async (newStatus: ArticleStatus) => {
    if (!article) return;

    try {
      setSubmitting(true);
      const updated = await updateArticleStatus(article.id, newStatus);
      setArticle(updated);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('ステータスの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !newFeedback.trim()) return;

    try {
      setSubmitting(true);
      const updated = await addFeedbackToHistory(article.id, newFeedback.trim());
      setArticle(updated);
      setNewFeedback('');
    } catch (err) {
      console.error('Failed to add feedback:', err);
      alert('フィードバックの追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!article || !newFeedback.trim()) {
      alert('再生成するにはフィードバックを入力してください');
      return;
    }

    try {
      setRegenerating(true);
      // First save the feedback
      await addFeedbackToHistory(article.id, newFeedback.trim());

      // Then trigger regeneration
      const result = await triggerRegeneration(article.id, newFeedback.trim());

      if (result.success) {
        alert('再生成をリクエストしました。しばらくお待ちください。');
        setNewFeedback('');
        // Refresh article data
        const updated = await getArticleById(articleId);
        if (updated) setArticle(updated);
      } else {
        alert(`再生成に失敗しました: ${result.error}`);
      }
    } catch (err) {
      console.error('Failed to trigger regeneration:', err);
      alert('再生成のリクエストに失敗しました');
    } finally {
      setRegenerating(false);
    }
  };

  const sourceData = article?.source_data as unknown as SourceDataItem[] | SourceDataItem | null;
  const sourcesArray = Array.isArray(sourceData)
    ? sourceData
    : sourceData
      ? [sourceData]
      : [];

  const feedbackHistory = (article?.feedback_history as unknown as FeedbackHistoryItem[]) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !site || !article) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error || '記事が見つかりません'}</p>
        <Link
          href={`/dashboard/${siteId}`}
          className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-500"
        >
          ← サイトに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{article.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>作成: {new Date(article.created_at).toLocaleDateString('ja-JP')}</span>
              <span>更新: {new Date(article.updated_at).toLocaleDateString('ja-JP')}</span>
              {article.wp_post_id && (
                <span className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  WordPress ID: {article.wp_post_id}
                </span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusConfig[article.status as ArticleStatus].className
            }`}
          >
            {statusConfig[article.status as ArticleStatus].label}
          </span>
        </div>
      </div>

      {/* Status Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-2">
          ステータス変更:
        </span>
        {(['draft', 'review', 'published'] as const).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={submitting || article.status === status}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              article.status === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Article Content with SWELL Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">記事プレビュー</h2>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {article.content_html ? (
              <SwellPreview html={article.content_html} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">本文がありません</p>
            )}
          </div>
        </div>

        {/* Source Data & Feedback */}
        <div className="space-y-6">
          {/* Source Data - For Hallucination Check */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <button
              onClick={() => setShowSources(!showSources)}
              className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  参照資料 ({sourcesArray.length})
                </h2>
              </div>
              {showSources ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {showSources && (
              <div className="p-6 max-h-[300px] overflow-y-auto">
                {sourcesArray.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">参照資料がありません</p>
                ) : (
                  <div className="space-y-4">
                    {sourcesArray.map((source, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-blue-500"
                      >
                        {source.title && (
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {source.title}
                          </h3>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 break-all"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            {source.url}
                          </a>
                        )}
                        {source.content && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                            {source.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback & Regeneration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                フィードバック・再生成
              </h2>
            </div>
            <div className="p-6">
              {/* Feedback Form with Regenerate Button */}
              <form onSubmit={handleAddFeedback} className="mb-6">
                <textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="修正指示やフィードバックを入力...&#10;例: 「導入部分をもっと具体的に」「3番目の見出しの説明を詳しく」"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !newFeedback.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? '保存中...' : 'フィードバック保存'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating || !newFeedback.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    {regenerating ? 'リクエスト中...' : 'AIで再生成'}
                  </button>
                </div>
              </form>

              {/* Feedback History */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  履歴 ({feedbackHistory.length})
                </h3>
                {feedbackHistory.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                    フィードバック履歴はありません
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {feedbackHistory.slice().reverse().map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                      >
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {item.text}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
