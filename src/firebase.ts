import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

// Configuration Firebase fournie pour le projet buno-tech (Hosting site: buno-tech-services)
export const BUNO_TECH_CUSTOM_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBybAXdKtJAORPvP2y70COqIRfBJk3a8Gw',
  authDomain: 'buno-tech.firebaseapp.com',
  projectId: 'buno-tech',
  storageBucket: 'buno-tech.firebasestorage.app',
  messagingSenderId: '809104771696',
  appId: '1:809104771696:web:4a785c36125fd55f9082b5',
  measurementId: 'G-8BYKPPVMSB',
  hostingSite: 'buno-tech-services',
};

const isHostedOnBunoTechDomain =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('buno-tech') ||
    import.meta.env.VITE_USE_BUNO_TECH_FIREBASE === 'true');

const activeFirebaseConfig = isHostedOnBunoTechDomain
  ? BUNO_TECH_CUSTOM_FIREBASE_CONFIG
  : {
      ...firebaseAppletConfig,
      measurementId: firebaseAppletConfig.measurementId || BUNO_TECH_CUSTOM_FIREBASE_CONFIG.measurementId,
    };

export const app = initializeApp(activeFirebaseConfig);

export const db = isHostedOnBunoTechDomain
  ? getFirestore(app)
  : getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Analytics safely when supported by the browser environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics initialization errors in restricted iframe contexts
    });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ADMIN_EMAILS = [
  'aimablebunoti@gmail.com',
  'aimablebunotech@gmail.com',
];

export function isVerifiedAdminUser(email?: string | null, emailVerified?: boolean | null, role?: string): boolean {
  if (role === 'admin') return true;
  if (!email || !emailVerified) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || `id_${Date.now()}`;
}

export function generateId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return sanitizeId(`${prefix}_${Date.now()}_${randomPart}`);
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
