import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null | undefined;
let adminDb: Firestore | null | undefined;
let adminAuth: Auth | null | undefined;
let initializationError: string | null = null;
let configuredProjectId: string | null = null;

const parseServiceAccount = (): ServiceAccount | null => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('service account JSON eksik alan içeriyor');
    }

    configuredProjectId = parsed.project_id;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch (error) {
    initializationError = error instanceof Error ? error.message : String(error);
    return null;
  }
};

const getPrivatRoomAdminApp = (): App | null => {
  if (adminApp !== undefined) return adminApp;
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    adminApp = null;
    return adminApp;
  }

  try {
    adminApp = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
    return adminApp;
  } catch (error) {
    initializationError = error instanceof Error ? error.message : String(error);
    adminApp = null;
    return adminApp;
  }
};

export const getPrivatRoomAdminDb = (): Firestore | null => {
  if (adminDb !== undefined) return adminDb;
  const app = getPrivatRoomAdminApp();
  if (!app) {
    adminDb = null;
    return adminDb;
  }

  // The PrivatRoom browser client uses the Nexus project's default Firestore database.
  // Keep Firebase Admin on the same database so room messages and Kaira listeners
  // observe the exact same persisted data.
  adminDb = getFirestore(app);
  return adminDb;
};

export const getPrivatRoomAdminAuth = (): Auth | null => {
  if (adminAuth !== undefined) return adminAuth;
  const app = getPrivatRoomAdminApp();
  adminAuth = app ? getAuth(app) : null;
  return adminAuth;
};

export const getFirebaseAdminStatus = () => {
  const configured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const ready = Boolean(getPrivatRoomAdminDb() && getPrivatRoomAdminAuth());
  return {
    configured,
    ready,
    projectId: configuredProjectId,
    error: ready ? null : initializationError,
  };
};
