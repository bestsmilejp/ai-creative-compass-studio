export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Role types
export type PlatformRole = 'super_admin' | 'user';
export type SiteRole = 'admin' | 'manager';

export interface Database {
  public: {
    Tables: {
      // Platform-level users (for super_admin tracking)
      platform_users: {
        Row: {
          id: string;
          firebase_uid: string;
          email: string;
          display_name: string | null;
          role: PlatformRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firebase_uid: string;
          email: string;
          display_name?: string | null;
          role?: PlatformRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firebase_uid?: string;
          email?: string;
          display_name?: string | null;
          role?: PlatformRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      sites: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          system_prompt: string | null;
          wp_url: string | null;
          wp_username: string | null;
          wp_app_password: string | null;
          n8n_webhook_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          system_prompt?: string | null;
          wp_url?: string | null;
          wp_username?: string | null;
          wp_app_password?: string | null;
          n8n_webhook_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          system_prompt?: string | null;
          wp_url?: string | null;
          wp_username?: string | null;
          wp_app_password?: string | null;
          n8n_webhook_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          firebase_uid: string;
          site_id: string;
          role: SiteRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          firebase_uid: string;
          site_id: string;
          role: SiteRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          firebase_uid?: string;
          site_id?: string;
          role?: SiteRole;
          created_at?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          site_id: string;
          title: string;
          content_html: string | null;
          status: 'draft' | 'review' | 'published';
          source_data: Json;
          feedback_history: Json;
          wp_post_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          title: string;
          content_html?: string | null;
          status?: 'draft' | 'review' | 'published';
          source_data?: Json;
          feedback_history?: Json;
          wp_post_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          title?: string;
          content_html?: string | null;
          status?: 'draft' | 'review' | 'published';
          source_data?: Json;
          feedback_history?: Json;
          wp_post_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      article_jobs: {
        Row: {
          id: string;
          site_id: string;
          wp_post_id: number;
          idempotency_key: string | null;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          result_data: Json | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          wp_post_id: number;
          idempotency_key?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          result_data?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          wp_post_id?: number;
          idempotency_key?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          result_data?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_keywords: {
        Row: {
          id: string;
          site_id: string;
          keyword: string;
          priority: number;
          is_active: boolean;
          use_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          keyword: string;
          priority?: number;
          is_active?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          keyword?: string;
          priority?: number;
          is_active?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_schedules: {
        Row: {
          id: string;
          site_id: string;
          is_enabled: boolean;
          frequency_type: 'daily' | 'weekly' | 'custom';
          time_of_day: string;
          days_of_week: number[];
          custom_interval_hours: number | null;
          articles_per_run: number;
          last_run_at: string | null;
          next_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          is_enabled?: boolean;
          frequency_type?: 'daily' | 'weekly' | 'custom';
          time_of_day?: string;
          days_of_week?: number[];
          custom_interval_hours?: number | null;
          articles_per_run?: number;
          last_run_at?: string | null;
          next_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          is_enabled?: boolean;
          frequency_type?: 'daily' | 'weekly' | 'custom';
          time_of_day?: string;
          days_of_week?: number[];
          custom_interval_hours?: number | null;
          articles_per_run?: number;
          last_run_at?: string | null;
          next_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Convenience types
export type PlatformUser = Database['public']['Tables']['platform_users']['Row'];
export type Site = Database['public']['Tables']['sites']['Row'];
export type UserPermission = Database['public']['Tables']['user_permissions']['Row'];
export type Article = Database['public']['Tables']['articles']['Row'];
export type ArticleJobRow = Database['public']['Tables']['article_jobs']['Row'];
export type SiteKeyword = Database['public']['Tables']['site_keywords']['Row'];
export type SiteSchedule = Database['public']['Tables']['site_schedules']['Row'];

// Feedback history item type
export interface FeedbackHistoryItem {
  text: string;
  created_at: string;
}

// Source data item type
export interface SourceDataItem {
  title?: string;
  url?: string;
  content?: string;
}
