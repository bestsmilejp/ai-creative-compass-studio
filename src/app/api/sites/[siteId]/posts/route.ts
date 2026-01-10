import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchWPPosts } from '@/lib/wordpress';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SiteCredentials {
  wp_url: string | null;
  wp_username: string | null;
  wp_app_password: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Validate siteId is a valid UUID
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID format' },
        { status: 400 }
      );
    }

    // Fetch site from database to get WordPress credentials
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('wp_url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const siteData = site as SiteCredentials;

    if (!siteData.wp_url) {
      return NextResponse.json(
        { error: 'WordPress URL not configured for this site' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const status = searchParams.get('status') || 'any';
    const search = searchParams.get('search') || undefined;
    const orderby = (searchParams.get('orderby') as 'date' | 'modified' | 'title') || 'modified';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    // Fetch posts from WordPress
    const result = await fetchWPPosts(
      {
        wpUrl: siteData.wp_url,
        username: siteData.wp_username || undefined,
        appPassword: siteData.wp_app_password || undefined,
      },
      {
        page,
        perPage,
        status,
        search,
        orderby,
        order,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
