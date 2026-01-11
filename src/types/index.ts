export * from './database';
import type { SiteRole, PlatformRole } from './database';

// Extended types with joined data
export interface SiteWithPermission {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: SiteRole;
}

// Current user context with platform role
export interface CurrentUser {
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  platformRole: PlatformRole;
  isSuperAdmin: boolean;
}

// Article job status
export type ArticleJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Article job for n8n integration
export interface ArticleJob {
  id: string;
  site_id: string;
  wp_post_id: number;
  idempotency_key: string | null;
  status: ArticleJobStatus;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Create job request from n8n
export interface CreateJobRequest {
  siteId: string;
  wpPostId?: number;  // Optional - can be set later via PATCH after WordPress posting
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

// Update job request from n8n
export interface UpdateJobRequest {
  status: ArticleJobStatus;
  resultData?: Record<string, unknown>;
  errorMessage?: string;
  wpPostId?: number;
}
