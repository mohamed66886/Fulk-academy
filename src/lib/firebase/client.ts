import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const stripQuotes = (str?: string) => str?.replace(/^"|"$/g, "");

// Strictly read credentials from .env.local via process.env (fallback provided for build-time evaluation)
const firebaseConfig = {
  apiKey:
    stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) ||
    "AIzaSyDemoPlaceholderForBuildEvaluation123",
  authDomain:
    stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "fulk-academy.firebaseapp.com",
  projectId: stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "fulk-academy",
  storageBucket:
    stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "fulk-academy.appspot.com",
  messagingSenderId:
    stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "123456789012",
  appId: stripQuotes(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "1:123456789012:web:demo123456",
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
