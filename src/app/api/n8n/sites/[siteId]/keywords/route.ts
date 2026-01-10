import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import { validateN8nApiKey } from '@/lib/api-auth';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET - Fetch active keywords for a site (for n8n)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  // Validate API key
  const authResult = validateN8nApiKey(request);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  try {
    const { siteId } = await params;

    // Validate siteId
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID format' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const activeOnly = searchParams.get('active') !== 'false';

    // Fetch keywords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from('site_keywords')
      .select('*')
      .eq('site_id', siteId)
      .order('priority', { ascending: false })
      .limit(limit);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: keywords, error } = await query;

    if (error) {
      console.error('Error fetching keywords:', error);
      return NextResponse.json(
        { error: 'Failed to fetch keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keywords: keywords || [],
      count: (keywords || []).length,
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

// POST - Mark keyword as used (increment use_count)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  // Validate API key
  const authResult = validateN8nApiKey(request);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  try {
    const { siteId } = await params;
    const body = await request.json();
    const { keywordId } = body;

    // Validate siteId
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID format' },
        { status: 400 }
      );
    }

    if (!keywordId) {
      return NextResponse.json(
        { error: 'keywordId is required' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get current keyword
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: keyword, error: fetchError } = await (supabaseAdmin as any)
      .from('site_keywords')
      .select('use_count')
      .eq('id', keywordId)
      .eq('site_id', siteId)
      .single();

    if (fetchError || !keyword) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      );
    }

    // Update use_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('site_keywords')
      .update({
        use_count: (keyword.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', keywordId)
      .eq('site_id', siteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating keyword:', updateError);
      return NextResponse.json(
        { error: 'Failed to update keyword' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keyword: updated,
    });
  } catch (error) {
    console.error('Error updating keyword:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update keyword' },
      { status: 500 }
    );
  }
}
