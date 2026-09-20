import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Helper for Google Authentication with deduplication and state check
let authPromise: Promise<User> | null = null;

export const ensureFirebaseAuth = async (): Promise<User> => {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      if (auth.currentUser) {
        return auth.currentUser;
      }
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        const customErr = new Error(
          'Google ile giriş işlemi kapatıldı. Devam etmek için Google hesabınızla oturum açmalısınız.'
        );
        (customErr as any).code = 'auth/popup-closed-by-user';
        throw customErr;
      }
      throw err;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
};

// Backwards-compatible export alias
export const ensureAnonymousAuth = ensureFirebaseAuth;

export default app;
