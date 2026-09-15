import dns from "node:dns";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

// Prevent 30-40s gRPC / network timeouts caused by IPv6 ENETUNREACH in Node.js 18+
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Strictly guard against importing or executing on the client
if (typeof window !== "undefined") {
  throw new Error(
    "Firebase Admin SDK can only be imported in Server Components / Actions / API Routes."
  );
}

interface FirebaseAdminGlobal {
  adminApp?: App | null;
  adminDb?: Firestore | null;
  adminAuth?: Auth | null;
  adminStorage?: Storage | null;
}

const globalForFirebase = globalThis as unknown as FirebaseAdminGlobal;

function initAdminApp(): App | null {
  if (globalForFirebase.adminApp) {
    return globalForFirebase.adminApp;
  }

  if (getApps().length > 0) {
    return getApps()[0] as App;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    // Return null in development/build environments if env vars are not yet set
    return null;
  }

  // Handle private key: strip surrounding quotes first, then convert \\n to real newlines
  const privateKey = rawPrivateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function initFirestore(app: App | null): Firestore | null {
  if (!app) return null;
  if (globalForFirebase.adminDb) {
    return globalForFirebase.adminDb;
  }

  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Prevent throw if Firestore settings() has already been called or instance initialized
  }
  return db;
}

export const adminApp: App | null = globalForFirebase.adminApp ?? initAdminApp();
export const adminDb: Firestore | null = globalForFirebase.adminDb ?? initFirestore(adminApp);
export const adminAuth: Auth | null =
  globalForFirebase.adminAuth ?? (adminApp ? getAuth(adminApp) : null);
export const adminStorage: Storage | null =
  globalForFirebase.adminStorage ?? (adminApp ? getStorage(adminApp) : null);

// Cache instances on globalThis to prevent re-initialization during Fast Refresh / HMR
if (adminApp) globalForFirebase.adminApp = adminApp;
if (adminDb) globalForFirebase.adminDb = adminDb;
if (adminAuth) globalForFirebase.adminAuth = adminAuth;
if (adminStorage) globalForFirebase.adminStorage = adminStorage;
