import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAdminProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    hasAdminClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    hasAdminPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    hasPublicApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    hasPublicAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    privateKeyStarts: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30),
    privateKeyEnds: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.slice(-30),
    nodeEnv: process.env.NODE_ENV,
  });
}
