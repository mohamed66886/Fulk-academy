import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      FIREBASE_ADMIN_PRIVATE_KEY_LENGTH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0,
      FIREBASE_ADMIN_PRIVATE_KEY_STARTS: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.slice(0, 30),
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.slice(0, 15) + "...",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
  };

  // Try to initialize admin
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
    diagnostics.adminAuth = !!adminAuth;
    diagnostics.adminDb = !!adminDb;
  } catch (e: unknown) {
    const err = e as Error;
    diagnostics.adminError = err.message;
    diagnostics.adminStack = err.stack?.split("\n").slice(0, 5);
  }

  return NextResponse.json(diagnostics);
}
