import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import { validateN8nApiKey } from '@/lib/api-auth';
import type { UpdateJobRequest, ArticleJob, ArticleJobStatus } from '@/types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valid status values
const VALID_STATUSES: ArticleJobStatus[] = ['pending', 'processing', 'completed', 'failed'];

/**
 * GET /api/n8n/jobs/[jobId]
 * Get job details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // 1. Validate API key
    const authResult = validateN8nApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 2. Validate jobId
    if (!UUID_REGEX.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Fetch job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: job, error } = await (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job: job as ArticleJob });

  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/n8n/jobs/[jobId]
 * Update job status
 *
 * Body:
 *   {
 *     "status": "processing" | "completed" | "failed",
 *     "resultData": { ... },  // optional, for completed jobs
 *     "errorMessage": "..."   // optional, for failed jobs
 *   }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // 1. Validate API key
    const authResult = validateN8nApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 2. Validate jobId
    if (!UUID_REGEX.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Parse and validate request body
    const body: UpdateJobRequest = await request.json();
    const { status, resultData, errorMessage } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Check current job status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentJob, error: fetchError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !currentJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // 5. Validate status transition
    const currentStatus = currentJob.status as ArticleJobStatus;

    // Cannot update completed or failed jobs
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      return NextResponse.json(
        {
          error: `Cannot update job with status '${currentStatus}'`,
          currentStatus
        },
        { status: 400 }
      );
    }

    // 6. Build update data
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set started_at when moving to processing
    if (status === 'processing' && !currentJob.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    // Set completed_at when job finishes
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Add result data for completed jobs
    if (status === 'completed' && resultData) {
      updateData.result_data = resultData;
    }

    // Add error message for failed jobs
    if (status === 'failed' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    // 7. Update job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedJob, error: updateError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'updated',
      job: updatedJob as ArticleJob,
    });

  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/n8n/jobs/[jobId]
 * Delete a job (only pending or failed jobs can be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // 1. Validate API key
    const authResult = validateN8nApiKey(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 2. Validate jobId
    if (!UUID_REGEX.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Check current job status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentJob, error: fetchError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (fetchError || !currentJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of pending or failed jobs
    if (currentJob.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete a job that is currently processing' },
        { status: 400 }
      );
    }

    // 4. Delete job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .delete()
      .eq('id', jobId);

    if (deleteError) {
      console.error('Error deleting job:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'deleted', jobId });

  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
