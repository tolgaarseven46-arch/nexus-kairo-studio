import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

try {
  if (firebaseConfig.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Fallback to default firestore initialization:', e);
  db = getFirestore(app);
}

try {
  const bucketUrl = firebaseConfig.storageBucket
    ? `gs://${firebaseConfig.storageBucket.replace(/^gs:\/\//, '')}`
    : undefined;
  storage = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);
  
  // Set realistic timeout limits (120 seconds) for storage operations
  storage.maxUploadRetryTime = 120000;
  storage.maxOperationRetryTime = 120000;
} catch (e) {
  console.warn('Fallback storage initialization:', e);
  storage = getStorage(app);
}

try {
  auth = getAuth(app);
} catch (e) {
  console.warn('Auth initialization warning:', e);
  auth = getAuth(app);
}

export { app, db, storage, auth };


