import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import { validateN8nApiKey } from '@/lib/api-auth';
import type { CreateJobRequest, ArticleJob } from '@/types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/n8n/jobs
 * Create a new article generation job
 *
 * Headers:
 *   x-api-key: N8N_API_KEY
 *
 * Body:
 *   {
 *     "siteId": "uuid",
 *     "wpPostId": 123,
 *     "idempotencyKey": "optional-unique-key"
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    const authResult = validateN8nApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 2. Check service role configuration
    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      );
    }

    // 3. Parse and validate request body
    const body: CreateJobRequest = await request.json();
    const { siteId, wpPostId, idempotencyKey } = body;

    if (!siteId || !UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: 'Invalid or missing siteId' },
        { status: 400 }
      );
    }

    if (!wpPostId || typeof wpPostId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid or missing wpPostId' },
        { status: 400 }
      );
    }

    // 4. Check if site exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: site, error: siteError } = await (supabaseAdmin as any)
      .from('sites')
      .select('id, name')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // 5. Check for idempotency (if key provided)
    if (idempotencyKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingJob } = await (supabaseAdmin as any)
        .from('article_jobs')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existingJob) {
        return NextResponse.json({
          status: 'already_exists',
          job: existingJob as ArticleJob,
          message: 'Job with this idempotency key already exists',
        });
      }
    }

    // 6. Check for active job on same site/post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeJob } = await (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .eq('site_id', siteId)
      .eq('wp_post_id', wpPostId)
      .in('status', ['pending', 'processing'])
      .single();

    if (activeJob) {
      return NextResponse.json({
        status: 'already_processing',
        job: activeJob as ArticleJob,
        message: 'A job for this article is already in progress',
      });
    }

    // 7. Create new job
    const jobData = {
      site_id: siteId,
      wp_post_id: wpPostId,
      idempotency_key: idempotencyKey || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newJob, error: insertError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .insert(jobData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating job:', insertError);

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({
          status: 'duplicate',
          message: 'Job already exists (concurrent request)',
        });
      }

      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'created',
      job: newJob as ArticleJob,
    }, { status: 201 });

  } catch (error) {
    console.error('Error in n8n jobs API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/n8n/jobs
 * List jobs with optional filters
 *
 * Query params:
 *   - siteId: filter by site
 *   - status: filter by status (pending, processing, completed, failed)
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key
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

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const siteId = searchParams.get('siteId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 3. Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (siteId && UUID_REGEX.test(siteId)) {
      query = query.eq('site_id', siteId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobs: jobs as ArticleJob[],
      count: jobs?.length || 0,
    });

  } catch (error) {
    console.error('Error in n8n jobs API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
