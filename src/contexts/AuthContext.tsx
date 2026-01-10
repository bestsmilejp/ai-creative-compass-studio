'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  getIdToken,
  isDemoMode as isFirebaseNotConfigured,
} from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/firebase';
import type { PlatformRole } from '@/types';

// Fetch platform role from Supabase
async function fetchPlatformRole(firebaseUid: string): Promise<PlatformRole> {
  try {
    const { data, error } = await supabase
      .from('platform_users')
      .select('role')
      .eq('firebase_uid', firebaseUid)
      .single();

    if (error || !data) {
      // User not in platform_users table, default to 'user'
      return 'user';
    }

    const userData = data as { role: PlatformRole };
    return userData.role;
  } catch {
    return 'user';
  }
}

// Demo user for testing without Firebase
const DEMO_USER = {
  uid: 'demo-user-123',
  email: 'demo@example.com',
  displayName: 'デモユーザー',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
} as User;

// Demo modes for testing different roles
type DemoRole = 'super_admin' | 'site_admin';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  isDemoMode: boolean;
  platformRole: PlatformRole;
  isSuperAdmin: boolean;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformRole, setPlatformRole] = useState<PlatformRole>('user');
  const [demoRole, setDemoRole] = useState<DemoRole>('super_admin');
  const [userSelectedDemo, setUserSelectedDemo] = useState(false);

  // isDemoMode is true if Firebase is not configured OR user selected demo mode
  const isDemoMode = isFirebaseNotConfigured || userSelectedDemo;

  useEffect(() => {
    if (isFirebaseNotConfigured) {
      // Firebase not configured, don't set user automatically
      // User needs to click "login" to enter
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (!userSelectedDemo) {
        setUser(firebaseUser);

        // Fetch platform role from Supabase
        if (firebaseUser) {
          const role = await fetchPlatformRole(firebaseUser.uid);
          setPlatformRole(role);
        } else {
          setPlatformRole('user');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userSelectedDemo]);

  // Update platform role based on demo role selection
  useEffect(() => {
    if (isDemoMode && user) {
      setPlatformRole(demoRole === 'super_admin' ? 'super_admin' : 'user');
    }
  }, [demoRole, user, isDemoMode]);

  // Sign in with Google (real authentication)
  const handleSignIn = async () => {
    if (isFirebaseNotConfigured) {
      // Firebase not configured, use demo mode
      handleSignInDemo();
      return;
    }
    await signInWithGoogle();
  };

  // Sign in with demo mode (no real authentication)
  const handleSignInDemo = () => {
    setUserSelectedDemo(true);
    setUser(DEMO_USER);
    setPlatformRole(demoRole === 'super_admin' ? 'super_admin' : 'user');
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      setUser(null);
      setPlatformRole('user');
      setUserSelectedDemo(false);
      return;
    }
    await signOut();
  };

  // Check if super admin features are enabled (disabled in production)
  const isSuperAdminEnabled = process.env.NEXT_PUBLIC_ENABLE_SUPER_ADMIN !== 'false';
  const isSuperAdmin = isSuperAdminEnabled && platformRole === 'super_admin';

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signInDemo: handleSignInDemo,
    signOut: handleSignOut,
    getIdToken,
    isDemoMode,
    platformRole,
    isSuperAdmin,
    demoRole,
    setDemoRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
