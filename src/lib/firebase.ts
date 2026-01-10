import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we're in demo mode (no Firebase config)
export const isDemoMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === '';

// Initialize Firebase only if not in demo mode
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (!isDemoMode) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

// Sign in with Google
export async function signInWithGoogle() {
  if (isDemoMode) {
    console.log('Demo mode: Sign in simulated');
    return null;
  }

  try {
    const result = await signInWithPopup(auth!, googleProvider!);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Sign out
export async function signOut() {
  if (isDemoMode) {
    console.log('Demo mode: Sign out simulated');
    return;
  }

  try {
    await firebaseSignOut(auth!);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

// Get current user's ID token (for backend authentication)
export async function getIdToken(): Promise<string | null> {
  if (isDemoMode) {
    return 'demo-token';
  }

  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// Wrapper for onAuthStateChanged that handles demo mode
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (isDemoMode) {
    // In demo mode, return empty unsubscribe function
    return () => {};
  }

  return firebaseOnAuthStateChanged(auth!, callback);
}

export { auth };
export type { User };
