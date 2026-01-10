import { supabase } from './supabase';
import type { SiteWithPermission, Site, SiteRole } from '@/types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo sites for testing - all sites on the platform
const ALL_DEMO_SITES: Site[] = [
  {
    id: 'demo-site-1',
    name: '健康メディア',
    slug: 'health-media',
    description: '健康・ウェルネスに関する情報を発信するメディアサイト',
    system_prompt: '健康に関する専門的で信頼性の高い記事を執筆してください。',
    wp_url: null,
    wp_username: null,
    wp_app_password: null,
    n8n_webhook_url: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-site-2',
    name: 'ウイスキーマガジン',
    slug: 'whisky-magazine',
    description: 'ウイスキーの魅力を伝える専門メディア',
    system_prompt: 'ウイスキーの魅力を伝える専門的な記事を執筆してください。',
    wp_url: null,
    wp_username: null,
    wp_app_password: null,
    n8n_webhook_url: null,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'demo-site-3',
    name: '神社巡りガイド',
    slug: 'shrine-guide',
    description: '日本全国の神社を紹介する観光メディア',
    system_prompt: '日本の神社文化を紹介する親しみやすい記事を執筆してください。',
    wp_url: null,
    wp_username: null,
    wp_app_password: null,
    n8n_webhook_url: null,
    is_active: true,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: 'demo-site-4',
    name: 'テックブログ',
    slug: 'tech-blog',
    description: '最新テクノロジーを分かりやすく解説',
    system_prompt: '技術的なトピックを分かりやすく解説する記事を執筆してください。',
    wp_url: null,
    wp_username: null,
    wp_app_password: null,
    n8n_webhook_url: null,
    is_active: false,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

// Demo user's assigned sites (for site_admin role)
const DEMO_USER_SITES: SiteWithPermission[] = [
  {
    id: 'demo-site-1',
    name: '健康メディア',
    slug: 'health-media',
    description: '健康・ウェルネスに関する情報を発信するメディアサイト',
    role: 'admin',
  },
  {
    id: 'demo-site-2',
    name: 'ウイスキーマガジン',
    slug: 'whisky-magazine',
    description: 'ウイスキーの魅力を伝える専門メディア',
    role: 'manager',
  },
];

interface UserPermissionWithSite {
  role: string;
  sites: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
}

// Get all sites (for super admin)
export async function getAllSites(isDemoMode: boolean = false): Promise<Site[]> {
  if (isDemoMode) {
    return ALL_DEMO_SITES;
  }

  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all sites:', error);
    throw error;
  }

  return data || [];
}

// Get user's assigned sites (for site admin/manager)
export async function getUserSites(firebaseUid: string, isDemoMode: boolean = false): Promise<SiteWithPermission[]> {
  // Return demo data in demo mode
  if (isDemoMode) {
    return DEMO_USER_SITES;
  }

  const { data, error } = await supabase
    .from('user_permissions')
    .select(`
      role,
      sites (
        id,
        name,
        slug,
        description
      )
    `)
    .eq('firebase_uid', firebaseUid);

  if (error) {
    console.error('Error fetching user sites:', error);
    throw error;
  }

  if (!data) return [];

  const typedData = data as unknown as UserPermissionWithSite[];

  return typedData
    .filter((item) => item.sites !== null)
    .map((item) => ({
      id: item.sites!.id,
      name: item.sites!.name,
      slug: item.sites!.slug,
      description: item.sites!.description,
      role: item.role as SiteRole,
    }));
}

// Get sites based on user's platform role
export async function getSitesForUser(
  firebaseUid: string,
  isSuperAdmin: boolean,
  isDemoMode: boolean = false
): Promise<SiteWithPermission[]> {
  if (isSuperAdmin) {
    // Super admin sees all sites with 'admin' role
    const allSites = await getAllSites(isDemoMode);
    return allSites.map((site) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      description: site.description,
      role: 'admin' as SiteRole,
    }));
  } else {
    // Regular user sees only assigned sites
    return getUserSites(firebaseUid, isDemoMode);
  }
}

// Get demo site by ID
export function getDemoSiteById(siteId: string): SiteWithPermission | undefined {
  const site = ALL_DEMO_SITES.find((site) => site.id === siteId);
  if (!site) return undefined;

  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    description: site.description,
    role: 'admin',
  };
}

// Get full site data by ID
export async function getSiteById(siteId: string, isDemoMode: boolean = false): Promise<Site | null> {
  // Check if siteId is a valid UUID
  const isValidUUID = UUID_REGEX.test(siteId);

  if (isDemoMode || !isValidUUID) {
    // In demo mode or with non-UUID siteId, try to get demo site
    return ALL_DEMO_SITES.find((site) => site.id === siteId) || null;
  }

  // Only query database with valid UUID
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching site:', error);
    throw error;
  }

  return data;
}
