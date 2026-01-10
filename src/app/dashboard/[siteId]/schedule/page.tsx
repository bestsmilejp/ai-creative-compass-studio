'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getDemoSiteById } from '@/lib/sites';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  Play,
  Pause,
} from 'lucide-react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FrequencyType = 'daily' | 'weekly' | 'custom';
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Schedule {
  id: string;
  site_id: string;
  is_enabled: boolean;
  frequency_type: FrequencyType;
  time_of_day: string; // HH:MM format
  days_of_week: DayOfWeek[];
  custom_interval_hours: number | null;
  articles_per_run: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

// Demo schedule
const DEMO_SCHEDULE: Schedule = {
  id: 'demo-schedule-1',
  site_id: 'demo-site-1',
  is_enabled: true,
  frequency_type: 'daily',
  time_of_day: '09:00',
  days_of_week: [1, 2, 3, 4, 5],
  custom_interval_hours: null,
  articles_per_run: 1,
  last_run_at: '2024-01-10T09:00:00Z',
  next_run_at: '2024-01-11T09:00:00Z',
};

const DAYS_OF_WEEK = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
];

export default function SchedulePage() {
  const { user, isDemoMode } = useAuth();
  const params = useParams();
  const siteId = params.siteId as string;

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!user || !siteId) return;

    try {
      const isValidUUID = UUID_REGEX.test(siteId);

      if (isDemoMode || !isValidUUID) {
        const demoSite = getDemoSiteById(siteId);
        setSiteName(demoSite?.name || 'デモサイト');
        setSchedule(DEMO_SCHEDULE);
      } else {
        const response = await fetch(`/api/sites/${siteId}/schedule`);
        if (response.ok) {
          const data = await response.json();
          setSchedule(data.schedule);
          setSiteName(data.siteName || '');
        } else {
          throw new Error('スケジュールの取得に失敗しました');
        }
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [user, siteId, isDemoMode]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleToggleEnabled = () => {
    if (!schedule) return;
    setSchedule({ ...schedule, is_enabled: !schedule.is_enabled });
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: FrequencyType) => {
    if (!schedule) return;
    setSchedule({ ...schedule, frequency_type: frequency });
    setHasChanges(true);
  };

  const handleTimeChange = (time: string) => {
    if (!schedule) return;
    setSchedule({ ...schedule, time_of_day: time });
    setHasChanges(true);
  };

  const handleDayToggle = (day: DayOfWeek) => {
    if (!schedule) return;
    const newDays = schedule.days_of_week.includes(day)
      ? schedule.days_of_week.filter(d => d !== day)
      : [...schedule.days_of_week, day].sort();
    setSchedule({ ...schedule, days_of_week: newDays as DayOfWeek[] });
    setHasChanges(true);
  };

  const handleIntervalChange = (hours: number) => {
    if (!schedule) return;
    setSchedule({ ...schedule, custom_interval_hours: hours });
    setHasChanges(true);
  };

  const handleArticlesPerRunChange = (count: number) => {
    if (!schedule) return;
    setSchedule({ ...schedule, articles_per_run: Math.max(1, Math.min(10, count)) });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!schedule) return;

    if (isDemoMode) {
      setSuccess('デモモード: 保存をシミュレートしました');
      setHasChanges(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/sites/${siteId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setSuccess('スケジュールを保存しました');
      setHasChanges(false);
      fetchSchedule();
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">スケジュールが見つかりません</p>
        </div>
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
            <h1 className="text-2xl font-bold">スケジュール設定</h1>
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

      {/* Enable/Disable */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {schedule.is_enabled ? (
              <Play className="h-5 w-5 text-green-500" />
            ) : (
              <Pause className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <h2 className="font-medium">自動記事生成</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {schedule.is_enabled ? '有効' : '無効'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={schedule.is_enabled}
              onChange={handleToggleEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Run Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">前回実行</span>
          </div>
          <p className="font-medium">{formatDate(schedule.last_run_at)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">次回実行</span>
          </div>
          <p className="font-medium">{schedule.is_enabled ? formatDate(schedule.next_run_at) : '-'}</p>
        </div>
      </div>

      {/* Frequency Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="font-medium">実行頻度</h2>

        {/* Frequency Type */}
        <div className="flex gap-2">
          {(['daily', 'weekly', 'custom'] as FrequencyType[]).map((freq) => (
            <button
              key={freq}
              onClick={() => handleFrequencyChange(freq)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                schedule.frequency_type === freq
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {freq === 'daily' && '毎日'}
              {freq === 'weekly' && '毎週'}
              {freq === 'custom' && 'カスタム'}
            </button>
          ))}
        </div>

        {/* Time of Day */}
        {(schedule.frequency_type === 'daily' || schedule.frequency_type === 'weekly') && (
          <div>
            <label className="block text-sm font-medium mb-2">実行時刻</label>
            <input
              type="time"
              value={schedule.time_of_day}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Days of Week */}
        {schedule.frequency_type === 'weekly' && (
          <div>
            <label className="block text-sm font-medium mb-2">実行曜日</label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleDayToggle(day.value as DayOfWeek)}
                  className={`w-10 h-10 rounded-lg border transition-colors ${
                    schedule.days_of_week.includes(day.value as DayOfWeek)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Interval */}
        {schedule.frequency_type === 'custom' && (
          <div>
            <label className="block text-sm font-medium mb-2">実行間隔（時間）</label>
            <input
              type="number"
              min="1"
              max="168"
              value={schedule.custom_interval_hours || 24}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 24)}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              1〜168時間（1週間）の範囲で設定できます
            </p>
          </div>
        )}
      </div>

      {/* Articles per Run */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium mb-2">1回あたりの生成記事数</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="10"
            value={schedule.articles_per_run}
            onChange={(e) => handleArticlesPerRunChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-center font-medium">{schedule.articles_per_run}記事</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          1回のスケジュール実行で生成する記事の数です。キーワードリストから優先度順に選択されます。
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href={`/dashboard/${siteId}/keywords`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          キーワード設定
        </Link>
        <Link
          href={`/dashboard/${siteId}/jobs`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          ジョブ状況
        </Link>
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
