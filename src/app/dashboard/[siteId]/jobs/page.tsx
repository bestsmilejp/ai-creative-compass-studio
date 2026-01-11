'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getDemoSiteById } from '@/lib/sites';
import type { ArticleJob, ArticleJobStatus } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  MoreVertical,
  StopCircle,
} from 'lucide-react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Status configuration
const statusConfig: Record<ArticleJobStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: {
    label: '待機中',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  processing: {
    label: '処理中',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  completed: {
    label: '完了',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  failed: {
    label: '失敗',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
};

// Demo jobs
const DEMO_JOBS: ArticleJob[] = [
  {
    id: 'demo-job-1',
    site_id: 'demo-site-1',
    wp_post_id: 101,
    idempotency_key: null,
    status: 'completed',
    result_data: null,
    error_message: null,
    started_at: '2024-01-10T09:00:00Z',
    completed_at: '2024-01-10T09:05:00Z',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:05:00Z',
  },
  {
    id: 'demo-job-2',
    site_id: 'demo-site-1',
    wp_post_id: 102,
    idempotency_key: null,
    status: 'processing',
    result_data: null,
    error_message: null,
    started_at: '2024-01-10T10:00:00Z',
    completed_at: null,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 'demo-job-3',
    site_id: 'demo-site-1',
    wp_post_id: 103,
    idempotency_key: null,
    status: 'pending',
    result_data: null,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: '2024-01-10T10:30:00Z',
    updated_at: '2024-01-10T10:30:00Z',
  },
  {
    id: 'demo-job-4',
    site_id: 'demo-site-1',
    wp_post_id: 100,
    idempotency_key: null,
    status: 'failed',
    result_data: null,
    error_message: 'AI生成エラー: タイムアウト',
    started_at: '2024-01-09T15:00:00Z',
    completed_at: '2024-01-09T15:10:00Z',
    created_at: '2024-01-09T15:00:00Z',
    updated_at: '2024-01-09T15:10:00Z',
  },
];

export default function JobsDashboardPage() {
  const { user, isDemoMode } = useAuth();
  const params = useParams();
  const siteId = params.siteId as string;

  const [jobs, setJobs] = useState<ArticleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [filter, setFilter] = useState<ArticleJobStatus | 'all'>('all');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [openMenuJobId, setOpenMenuJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async (showRefreshing = false) => {
    if (!user || !siteId) return;

    if (showRefreshing) setRefreshing(true);

    try {
      const isValidUUID = UUID_REGEX.test(siteId);

      if (isDemoMode || !isValidUUID) {
        const demoSite = getDemoSiteById(siteId);
        setSiteName(demoSite?.name || 'デモサイト');
        setJobs(DEMO_JOBS);
      } else {
        // Fetch from API
        const response = await fetch(`/api/sites/${siteId}/jobs`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data.jobs || []);
          setSiteName(data.siteName || '');
        } else {
          throw new Error('ジョブの取得に失敗しました');
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, siteId, isDemoMode]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Update job status
  const updateJobStatus = async (jobId: string, newStatus: ArticleJobStatus, errorMessage?: string) => {
    if (isDemoMode) {
      // Demo mode: update local state
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? {
              ...job,
              status: newStatus,
              completed_at: newStatus === 'completed' || newStatus === 'failed' ? new Date().toISOString() : job.completed_at,
              error_message: newStatus === 'failed' ? (errorMessage || '管理者により終了') : null,
            }
          : job
      ));
      setOpenMenuJobId(null);
      return;
    }

    setUpdatingJobId(jobId);
    try {
      const response = await fetch(`/api/sites/${siteId}/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          errorMessage: newStatus === 'failed' ? (errorMessage || '管理者により終了') : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ステータスの更新に失敗しました');
      }

      // Refresh jobs list
      await fetchJobs();
    } catch (err) {
      console.error('Failed to update job status:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUpdatingJobId(null);
      setOpenMenuJobId(null);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuJobId && !(e.target as Element).closest('.relative')) {
        setOpenMenuJobId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuJobId]);

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter(job => job.status === filter);

  const stats = {
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start: string | null, end: string | null) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMs = endTime - startTime;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}秒`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}分`;
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
            <h1 className="text-2xl font-bold">ジョブ状況</h1>
            {siteName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{siteName}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchJobs(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          更新
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
            サンプルデータを表示しています
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(stats) as [ArticleJobStatus, number][]).map(([status, count]) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`p-4 rounded-lg border transition-all ${
                filter === status
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
                  <Icon className={`h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
                  {config.label}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter indicator */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">フィルター:</span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusConfig[filter].className}`}>
            {statusConfig[filter].label}
          </span>
          <button
            onClick={() => setFilter('all')}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            クリア
          </button>
        </div>
      )}

      {/* Jobs list */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  WP記事ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  作成日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  処理時間
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  エラー
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ジョブがありません</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const config = statusConfig[job.status];
                  const Icon = config.icon;
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
                          <Icon className={`h-3.5 w-3.5 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        #{job.wp_post_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(job.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {getDuration(job.started_at, job.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {job.error_message ? (
                          <span className="text-red-600 dark:text-red-400 truncate max-w-[200px] block">
                            {job.error_message}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(job.status === 'processing' || job.status === 'pending') && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuJobId(openMenuJobId === job.id ? null : job.id)}
                              disabled={updatingJobId === job.id}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                            >
                              {updatingJobId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </button>
                            {openMenuJobId === job.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                                <button
                                  onClick={() => updateJobStatus(job.id, 'completed')}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  完了にする
                                </button>
                                <button
                                  onClick={() => updateJobStatus(job.id, 'failed', '管理者により終了')}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <StopCircle className="h-4 w-4 text-red-600" />
                                  失敗にする
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-4">
        <Link
          href={`/dashboard/${siteId}/keywords`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          キーワード設定
        </Link>
        <Link
          href={`/dashboard/${siteId}/schedule`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          スケジュール設定
        </Link>
      </div>
    </div>
  );
}
