import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  const diagnostics: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      FIREBASE_ADMIN_PRIVATE_KEY_LENGTH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0,
      FIREBASE_ADMIN_PRIVATE_KEY_STARTS: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30),
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "AIzaSyATOrVQdJT..." : false,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
  };

  try {
    diagnostics.adminAuth = !!adminAuth;
    diagnostics.adminDb = !!adminDb;
    
    // TEST QUERY
    if (adminDb) {
      const teachersSnap = await adminDb.collection("teachers").limit(1).get();
      if (!teachersSnap.empty) {
        const teacherRef = teachersSnap.docs[0]!.ref;
        let query = teacherRef.collection("students").where("deletedAt", "==", null);
        const snap1 = await query.get();
        diagnostics.test_deletedAt_null = snap1.docs.length;
        
        try {
          const snap2 = await query.orderBy("createdAt", "desc").limit(20).get();
          diagnostics.test_orderBy = snap2.docs.length;
        } catch(e: any) {
          diagnostics.test_orderBy_error = e.message;
        }
        
        const { getStudents } = await import("@/lib/actions/students");
        const result = await getStudents();
        diagnostics.test_getStudents_success = result.success;
        if (!result.success) {
          diagnostics.test_getStudents_error = result.error;
        } else {
          diagnostics.test_getStudents_count = result.students.length;
        }
      }
    }
  } catch (e: unknown) {
    const err = e as Error;
    diagnostics.adminError = err.message;
    diagnostics.adminStack = err.stack?.split("\n").slice(0, 5);
  }

  return NextResponse.json(diagnostics);
}
