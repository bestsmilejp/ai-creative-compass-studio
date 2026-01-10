import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SiteUpdateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  system_prompt?: string | null;
  wp_url?: string | null;
  wp_username?: string | null;
  wp_app_password?: string | null;
  n8n_webhook_url?: string | null;
  is_active?: boolean;
}

// GET - Fetch site details
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
        { error: 'サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEYが設定されていません。.env.localファイルにキーを追加してください。' },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: site, error } = await (supabaseAdmin as any)
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (error || !site) {
      console.error('Error fetching site from database:', error);
      return NextResponse.json(
        { error: 'サイトが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サイト情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PATCH - Update site
export async function PATCH(
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
    const input = body as SiteUpdateInput;

    // Validate required fields
    if (input.name !== undefined && !input.name.trim()) {
      return NextResponse.json(
        { error: 'サイト名を入力してください' },
        { status: 400 }
      );
    }

    if (input.slug !== undefined && !input.slug.trim()) {
      return NextResponse.json(
        { error: 'スラッグを入力してください' },
        { status: 400 }
      );
    }

    // Check if slug is available (if changed)
    if (input.slug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingSite } = await (supabaseAdmin as any)
        .from('sites')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', siteId)
        .single();

      if (existingSite) {
        return NextResponse.json(
          { error: 'このスラッグは既に使用されています' },
          { status: 400 }
        );
      }
    }

    const updateData = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: site, error } = await (supabaseAdmin as any)
      .from('sites')
      .update(updateData)
      .eq('id', siteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating site:', error);
      return NextResponse.json(
        { error: 'サイトの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(site);
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サイトの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE - Delete site
export async function DELETE(
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
    const { error } = await (supabaseAdmin as any)
      .from('sites')
      .delete()
      .eq('id', siteId);

    if (error) {
      console.error('Error deleting site:', error);
      return NextResponse.json(
        { error: 'サイトの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サイトの削除に失敗しました' },
      { status: 500 }
    );
  }
}
