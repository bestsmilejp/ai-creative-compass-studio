import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import { validateN8nApiKey } from '@/lib/api-auth';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST - Save article record (for tracking/history)
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
    const { title, keyword, wpPostId, angle } = body;

    // Validate siteId
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID format' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create article record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: article, error } = await (supabaseAdmin as any)
      .from('articles')
      .insert({
        site_id: siteId,
        title: title,
        status: 'draft',
        wp_post_id: wpPostId || null,
        source_data: {
          keyword: keyword || null,
          angle: angle || null,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating article:', error);
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      article: article,
    });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create article' },
      { status: 500 }
    );
  }
}

// GET - Fetch recent articles for a site (to avoid content duplication)
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
    const keyword = searchParams.get('keyword');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent articles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from('articles')
      .select('id, title, created_at, source_data')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: articles, error } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    // Filter by keyword if provided (search in title and source_data)
    let filteredArticles = articles || [];
    if (keyword) {
      filteredArticles = filteredArticles.filter((article: { title: string; source_data: { keyword?: string } }) => {
        const titleMatch = article.title?.toLowerCase().includes(keyword.toLowerCase());
        const sourceKeyword = article.source_data?.keyword?.toLowerCase();
        const keywordMatch = sourceKeyword === keyword.toLowerCase();
        return titleMatch || keywordMatch;
      });
    }

    // Return simplified article info for context
    const articleSummaries = filteredArticles.map((article: { id: string; title: string; created_at: string; source_data: { angle?: string } }) => ({
      id: article.id,
      title: article.title,
      createdAt: article.created_at,
      angle: article.source_data?.angle || null,
    }));

    return NextResponse.json({
      articles: articleSummaries,
      count: articleSummaries.length,
      keyword: keyword || null,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
