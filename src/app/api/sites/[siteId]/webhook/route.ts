import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SiteData {
  id: string;
  name: string;
  slug: string;
  wp_url: string | null;
  n8n_webhook_url: string | null;
  system_prompt: string | null;
}

export interface WebhookPayload {
  action: 'regenerate';
  site_id: string;
  site_name: string;
  site_slug: string;
  wp_url: string;
  system_prompt: string | null;
  posts: {
    wp_post_id: number;
    title: string;
    slug: string;
    status: string;
    link: string;
  }[];
  triggered_at: string;
}

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

    const body = await request.json();
    const { postIds } = body as { postIds: number[] };

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: '記事IDを指定してください' },
        { status: 400 }
      );
    }

    // Fetch site from database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, slug, wp_url, n8n_webhook_url, system_prompt')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'サイトが見つかりません' },
        { status: 404 }
      );
    }

    const siteData = site as SiteData;

    if (!siteData.n8n_webhook_url) {
      return NextResponse.json(
        { error: 'n8n Webhook URLが設定されていません。サイト設定で設定してください。' },
        { status: 400 }
      );
    }

    if (!siteData.wp_url) {
      return NextResponse.json(
        { error: 'WordPress URLが設定されていません。' },
        { status: 400 }
      );
    }

    // Fetch post details from WordPress
    // For now, we'll send basic post info. The n8n workflow can fetch more details if needed.
    const posts = postIds.map((id) => ({
      wp_post_id: id,
      title: '', // Will be populated by n8n if needed
      slug: '',
      status: '',
      link: `${siteData.wp_url}?p=${id}`,
    }));

    // Prepare webhook payload
    const payload: WebhookPayload = {
      action: 'regenerate',
      site_id: siteData.id,
      site_name: siteData.name,
      site_slug: siteData.slug,
      wp_url: siteData.wp_url,
      system_prompt: siteData.system_prompt,
      posts,
      triggered_at: new Date().toISOString(),
    };

    // Send webhook to n8n
    const webhookResponse = await fetch(siteData.n8n_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('n8n webhook error:', errorText);
      return NextResponse.json(
        { error: `n8n webhook呼び出しに失敗しました: ${webhookResponse.status}` },
        { status: 502 }
      );
    }

    // Try to get response from n8n (might be empty for async workflows)
    let webhookResult = null;
    try {
      const responseText = await webhookResponse.text();
      if (responseText) {
        webhookResult = JSON.parse(responseText);
      }
    } catch {
      // Response might not be JSON, that's okay
    }

    return NextResponse.json({
      success: true,
      message: `${postIds.length}件の記事の再生成リクエストを送信しました`,
      postIds,
      webhookResult,
    });
  } catch (error) {
    console.error('Error triggering webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhookトリガーに失敗しました' },
      { status: 500 }
    );
  }
}
