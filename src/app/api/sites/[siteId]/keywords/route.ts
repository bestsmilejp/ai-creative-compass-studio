import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface KeywordInput {
  id?: string;
  keyword: string;
  priority: number;
  is_active: boolean;
  use_count?: number;
  last_used_at?: string | null;
}

// GET - Fetch keywords for a site
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
    const { data: keywords, error } = await (supabaseAdmin as any)
      .from('site_keywords')
      .select('*')
      .eq('site_id', siteId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching keywords:', error);
      return NextResponse.json(
        { error: 'キーワードの取得に失敗しました' },
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
      keywords: keywords || [],
      siteName: site?.name || '',
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'キーワードの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT - Replace all keywords for a site
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
    const { keywords } = body as { keywords: KeywordInput[] };

    if (!Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'キーワードの配列が必要です' },
        { status: 400 }
      );
    }

    // Delete existing keywords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('site_keywords')
      .delete()
      .eq('site_id', siteId);

    if (deleteError) {
      console.error('Error deleting existing keywords:', deleteError);
      return NextResponse.json(
        { error: '既存キーワードの削除に失敗しました' },
        { status: 500 }
      );
    }

    // Insert new keywords (if any)
    if (keywords.length > 0) {
      const keywordsToInsert = keywords.map((kw, index) => ({
        site_id: siteId,
        keyword: kw.keyword,
        priority: kw.priority || keywords.length - index,
        is_active: kw.is_active ?? true,
        use_count: kw.use_count || 0,
        last_used_at: kw.last_used_at || null,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabaseAdmin as any)
        .from('site_keywords')
        .insert(keywordsToInsert);

      if (insertError) {
        console.error('Error inserting keywords:', insertError);
        return NextResponse.json(
          { error: 'キーワードの保存に失敗しました' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'キーワードの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// POST - Add a single keyword
export async function POST(
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
    const { keyword, priority } = body as { keyword: string; priority?: number };

    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { error: 'キーワードを入力してください' },
        { status: 400 }
      );
    }

    // Get max priority if not provided
    let keywordPriority = priority;
    if (keywordPriority === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: maxPriorityData } = await (supabaseAdmin as any)
        .from('site_keywords')
        .select('priority')
        .eq('site_id', siteId)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      keywordPriority = (maxPriorityData?.priority || 0) + 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newKeyword, error } = await (supabaseAdmin as any)
      .from('site_keywords')
      .insert({
        site_id: siteId,
        keyword: keyword.trim(),
        priority: keywordPriority,
        is_active: true,
        use_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding keyword:', error);
      return NextResponse.json(
        { error: 'キーワードの追加に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(newKeyword);
  } catch (error) {
    console.error('Error adding keyword:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'キーワードの追加に失敗しました' },
      { status: 500 }
    );
  }
}
