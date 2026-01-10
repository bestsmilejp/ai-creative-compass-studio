import { supabase } from './supabase';
import type { Site } from '@/types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UpdateSiteInput {
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

// Update site
export async function updateSite(siteId: string, input: UpdateSiteInput): Promise<Site> {
  // Validate UUID format
  if (!UUID_REGEX.test(siteId)) {
    throw new Error('Invalid site ID format');
  }

  const updateData = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sites')
    .update(updateData)
    .eq('id', siteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating site:', error);
    throw error;
  }

  return data as Site;
}

// Delete site
export async function deleteSite(siteId: string): Promise<void> {
  // Validate UUID format
  if (!UUID_REGEX.test(siteId)) {
    throw new Error('Invalid site ID format');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sites').delete().eq('id', siteId);

  if (error) {
    console.error('Error deleting site:', error);
    throw error;
  }
}

// Check if slug is available
export async function isSlugAvailable(slug: string, excludeSiteId?: string): Promise<boolean> {
  // Validate UUID format if excludeSiteId is provided
  if (excludeSiteId && !UUID_REGEX.test(excludeSiteId)) {
    throw new Error('Invalid site ID format');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any).from('sites').select('id').eq('slug', slug);

  if (excludeSiteId) {
    query = query.neq('id', excludeSiteId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking slug:', error);
    throw error;
  }

  return !data || data.length === 0;
}

// Toggle site active status
export async function toggleSiteActive(siteId: string, isActive: boolean): Promise<Site> {
  return updateSite(siteId, { is_active: isActive });
}
