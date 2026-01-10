import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import { validateN8nApiKey } from '@/lib/api-auth';

// GET - Fetch sites with due schedules
export async function GET(request: NextRequest) {
  // Validate API key
  const authResult = validateN8nApiKey(request);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  if (!isServiceRoleConfigured) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const now = new Date().toISOString();

    // Fetch schedules that are due
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedules, error } = await (supabaseAdmin as any)
      .from('site_schedules')
      .select(`
        id,
        site_id,
        is_enabled,
        frequency_type,
        time_of_day,
        days_of_week,
        custom_interval_hours,
        articles_per_run,
        last_run_at,
        next_run_at,
        sites (
          id,
          name,
          slug,
          wp_url,
          wp_username,
          wp_app_password,
          system_prompt,
          is_active
        )
      `)
      .eq('is_enabled', true)
      .lte('next_run_at', now)
      .not('sites', 'is', null);

    if (error) {
      console.error('Error fetching due schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    // Filter out inactive sites
    const activeSchedules = (schedules || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.sites?.is_active
    );

    return NextResponse.json({
      schedules: activeSchedules,
      count: activeSchedules.length,
      checkedAt: now,
    });
  } catch (error) {
    console.error('Error fetching due schedules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST - Mark schedule as run and update next_run_at
export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = validateN8nApiKey(request);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  if (!isServiceRoleConfigured) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      );
    }

    // Get current schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: fetchError } = await (supabaseAdmin as any)
      .from('site_schedules')
      .select('*')
      .eq('site_id', siteId)
      .single();

    if (fetchError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Calculate next run time
    const now = new Date();
    let nextRunAt: Date;

    switch (schedule.frequency_type) {
      case 'daily': {
        const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
        nextRunAt = new Date(now);
        nextRunAt.setDate(nextRunAt.getDate() + 1);
        nextRunAt.setHours(hours, minutes, 0, 0);
        break;
      }
      case 'weekly': {
        const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
        const today = now.getDay();
        const daysOfWeek = schedule.days_of_week || [];

        // Find next day in schedule
        let daysToAdd = 7;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (today + i) % 7;
          if (daysOfWeek.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }

        nextRunAt = new Date(now);
        nextRunAt.setDate(nextRunAt.getDate() + daysToAdd);
        nextRunAt.setHours(hours, minutes, 0, 0);
        break;
      }
      case 'custom': {
        const intervalHours = schedule.custom_interval_hours || 24;
        nextRunAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
        break;
      }
      default:
        nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Update schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('site_schedules')
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRunAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('site_id', siteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule: updated,
      nextRunAt: nextRunAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
