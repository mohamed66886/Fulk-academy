import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Strip surrounding quotes that may leak from Vercel env var values
const clean = (v: string | undefined) => (v || "").replace(/^["']|["']$/g, "");

const apiKey = clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const firebaseConfig = {
  apiKey,
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// During SSG / prerendering the env vars may be empty.
// Only initialise Firebase when we have a real API key (starts with "AIza").
const isValidConfig = apiKey.startsWith("AIza");

export const app: FirebaseApp = isValidConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : ({} as FirebaseApp);

export const auth: Auth = isValidConfig ? getAuth(app) : ({} as Auth);
export const db: Firestore = isValidConfig ? getFirestore(app) : ({} as Firestore);
export const storage: FirebaseStorage = isValidConfig ? getStorage(app) : ({} as FirebaseStorage);
