'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { getDemoSiteById } from '@/lib/sites';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isDemoMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [currentSiteId, setCurrentSiteId] = useState<string | undefined>();
  const [currentSiteName, setCurrentSiteName] = useState<string | undefined>();

  // Reserved routes that should not be treated as siteId
  const RESERVED_ROUTES = ['admin'];

  // Check if string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Extract siteId from pathname
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/([^/]+)/);
    if (match) {
      const potentialSiteId = match[1];

      // Skip reserved routes and non-UUID values (except demo mode)
      if (RESERVED_ROUTES.includes(potentialSiteId)) {
        setCurrentSiteId(undefined);
        setCurrentSiteName(undefined);
        return;
      }

      // In demo mode, allow demo site IDs (demo-site-1, etc.)
      // In production, only allow valid UUIDs
      if (!isDemoMode && !isValidUUID(potentialSiteId)) {
        setCurrentSiteId(undefined);
        setCurrentSiteName(undefined);
        return;
      }

      setCurrentSiteId(potentialSiteId);

      if (isDemoMode) {
        // Use demo data
        const demoSite = getDemoSiteById(potentialSiteId);
        if (demoSite) {
          setCurrentSiteName(demoSite.name);
        }
      } else {
        // Fetch site name from Supabase
        supabase
          .from('sites')
          .select('name')
          .eq('id', potentialSiteId)
          .single()
          .then(({ data }) => {
            if (data) {
              setCurrentSiteName((data as { name: string }).name);
            }
          });
      }
    } else {
      setCurrentSiteId(undefined);
      setCurrentSiteName(undefined);
    }
  }, [pathname, isDemoMode]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentSiteId={currentSiteId} currentSiteName={currentSiteName} />

      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="lg:pl-64">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200">
            デモモードで動作中 - Firebase/Supabase未設定のため、モックデータを表示しています
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
