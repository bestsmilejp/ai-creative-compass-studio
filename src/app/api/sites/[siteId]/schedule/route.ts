import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FrequencyType = 'daily' | 'weekly' | 'custom';

interface ScheduleInput {
  is_enabled: boolean;
  frequency_type: FrequencyType;
  time_of_day: string;
  days_of_week: number[];
  custom_interval_hours: number | null;
  articles_per_run: number;
}

// Calculate next run time based on schedule settings
function calculateNextRunAt(schedule: ScheduleInput): string | null {
  if (!schedule.is_enabled) {
    return null;
  }

  const now = new Date();
  const [hours, minutes] = schedule.time_of_day.split(':').map(Number);

  switch (schedule.frequency_type) {
    case 'daily': {
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      return nextRun.toISOString();
    }
    case 'weekly': {
      if (schedule.days_of_week.length === 0) {
        return null;
      }
      const today = now.getDay();
      const sortedDays = [...schedule.days_of_week].sort((a, b) => a - b);

      // Find next day
      let nextDay = sortedDays.find(d => d > today);
      let daysToAdd: number;

      if (nextDay !== undefined) {
        daysToAdd = nextDay - today;
      } else {
        // Wrap to next week
        nextDay = sortedDays[0];
        daysToAdd = 7 - today + nextDay;
      }

      // Check if today is in schedule and time hasn't passed
      if (schedule.days_of_week.includes(today)) {
        const todayRun = new Date(now);
        todayRun.setHours(hours, minutes, 0, 0);
        if (todayRun > now) {
          return todayRun.toISOString();
        }
      }

      const nextRun = new Date(now);
      nextRun.setDate(now.getDate() + daysToAdd);
      nextRun.setHours(hours, minutes, 0, 0);
      return nextRun.toISOString();
    }
    case 'custom': {
      const intervalHours = schedule.custom_interval_hours || 24;
      const nextRun = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
      return nextRun.toISOString();
    }
    default:
      return null;
  }
}

// GET - Fetch schedule for a site
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    // Validate siteId is a valid UUID
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: '無効なサイトID形式です' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEYが設定されていません' },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error } = await (supabaseAdmin as any)
      .from('site_schedules')
      .select('*')
      .eq('site_id', siteId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching schedule:', error);
      return NextResponse.json(
        { error: 'スケジュールの取得に失敗しました' },
        { status: 500 }
      );
    }

    // If no schedule exists, create a default one
    if (!schedule) {
      const defaultSchedule = {
        site_id: siteId,
        is_enabled: false,
        frequency_type: 'daily',
        time_of_day: '09:00',
        days_of_week: [1, 2, 3, 4, 5],
        custom_interval_hours: null,
        articles_per_run: 1,
        last_run_at: null,
        next_run_at: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newSchedule, error: insertError } = await (supabaseAdmin as any)
        .from('site_schedules')
        .insert(defaultSchedule)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default schedule:', insertError);
        return NextResponse.json(
          { error: 'デフォルトスケジュールの作成に失敗しました' },
          { status: 500 }
        );
      }

      // Get site name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: site } = await (supabaseAdmin as any)
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single();

      return NextResponse.json({
        schedule: newSchedule,
        siteName: site?.name || '',
      });
    }

    // Get site name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: site } = await (supabaseAdmin as any)
      .from('sites')
      .select('name')
      .eq('id', siteId)
      .single();

    return NextResponse.json({
      schedule,
      siteName: site?.name || '',
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スケジュールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT - Update schedule for a site
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    // Validate siteId is a valid UUID
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: '無効なサイトID形式です' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEYが設定されていません' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { schedule } = body as { schedule: ScheduleInput };

    if (!schedule) {
      return NextResponse.json(
        { error: 'スケジュールデータが必要です' },
        { status: 400 }
      );
    }

    // Validate schedule
    if (schedule.frequency_type === 'weekly' && schedule.days_of_week.length === 0) {
      return NextResponse.json(
        { error: '週次スケジュールには少なくとも1つの曜日を選択してください' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt(schedule);

    const updateData = {
      is_enabled: schedule.is_enabled,
      frequency_type: schedule.frequency_type,
      time_of_day: schedule.time_of_day,
      days_of_week: schedule.days_of_week,
      custom_interval_hours: schedule.custom_interval_hours,
      articles_per_run: Math.max(1, Math.min(10, schedule.articles_per_run)),
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedSchedule, error } = await (supabaseAdmin as any)
      .from('site_schedules')
      .update(updateData)
      .eq('site_id', siteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json(
        { error: 'スケジュールの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スケジュールの更新に失敗しました' },
      { status: 500 }
    );
  }
}
