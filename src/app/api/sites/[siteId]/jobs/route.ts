import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET - Fetch jobs for a site
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { error: 'ジョブの取得に失敗しました' },
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
      jobs: jobs || [],
      siteName: site?.name || '',
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ジョブの取得に失敗しました' },
      { status: 500 }
    );
  }
}
