import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabase';
import type { ArticleJobStatus } from '@/types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valid status values
const VALID_STATUSES: ArticleJobStatus[] = ['pending', 'processing', 'completed', 'failed'];

// PATCH - Update job status from admin dashboard
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; jobId: string }> }
) {
  try {
    const { siteId, jobId } = await params;

    // Validate siteId
    if (!UUID_REGEX.test(siteId)) {
      return NextResponse.json(
        { error: '無効なサイトID形式です' },
        { status: 400 }
      );
    }

    // Validate jobId
    if (!UUID_REGEX.test(jobId)) {
      return NextResponse.json(
        { error: '無効なジョブID形式です' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, errorMessage } = body;

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `無効なステータスです。有効な値: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if job exists and belongs to the site
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentJob, error: fetchError } = await (supabaseAdmin as any)
      .from('article_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('site_id', siteId)
      .single();

    if (fetchError || !currentJob) {
      return NextResponse.json(
        { error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at when job finishes
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Add error message for failed jobs
    if (status === 'failed' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Clear error message when marking as completed
    if (status === 'completed') {
      updateData.error_message = null;
    }

    // Update job
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
        { error: 'ジョブの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ジョブの更新に失敗しました' },
      { status: 500 }
    );
  }
}
