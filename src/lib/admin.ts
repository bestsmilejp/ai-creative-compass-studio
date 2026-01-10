import { supabase } from './supabase';
import type { Site, PlatformRole } from '@/types';

// Platform user type
export interface PlatformUser {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  role: PlatformRole;
  created_at: string;
  updated_at: string;
}

// Create site input
export interface CreateSiteInput {
  name: string;
  slug: string;
  description?: string | null;
  wp_url?: string | null;
  is_active?: boolean;
}

// Create site
export async function createSite(input: CreateSiteInput): Promise<Site> {
  const insertData = {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    wp_url: input.wp_url || null,
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sites')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return data as Site;
}

// Get all platform users
export async function getAllPlatformUsers(): Promise<PlatformUser[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('platform_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching platform users:', error);
    throw error;
  }

  return (data || []) as PlatformUser[];
}

// Create or update platform user
export interface UpsertPlatformUserInput {
  firebase_uid: string;
  email: string;
  display_name?: string | null;
  role: PlatformRole;
}

export async function upsertPlatformUser(input: UpsertPlatformUserInput): Promise<PlatformUser> {
  const upsertData = {
    firebase_uid: input.firebase_uid,
    email: input.email,
    display_name: input.display_name || null,
    role: input.role,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('platform_users')
    .upsert(upsertData, { onConflict: 'firebase_uid' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting platform user:', error);
    throw error;
  }

  return data as PlatformUser;
}

// Delete platform user
export async function deletePlatformUser(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('platform_users').delete().eq('id', id);

  if (error) {
    console.error('Error deleting platform user:', error);
    throw error;
  }
}

// Update platform user role
export async function updatePlatformUserRole(id: string, role: PlatformRole): Promise<PlatformUser> {
  const updateData = {
    role,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('platform_users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating platform user role:', error);
    throw error;
  }

  return data as PlatformUser;
}
