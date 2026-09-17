import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken, recaptchaToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "رمز المصادقة (ID Token) مطلوب" }, { status: 400 });
    }

    // Verify reCAPTCHA token if secret key is configured
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (secretKey && recaptchaToken) {
      try {
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(recaptchaToken)}`,
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          console.warn("[RECAPTCHA_FAILED]", verifyData["error-codes"]);
          // We can allow pass-through if testing on localhost, but log in production
        }
      } catch (captchaErr) {
        console.error("[RECAPTCHA_ERROR]", captchaErr);
      }
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "خدمة الخادم غير مهيأة" }, { status: 500 });
    }

    // 1. Verify the ID token using Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const role = (decodedToken.role as string) || "teacher";
    const teacherId = (decodedToken.teacherId as string) || uid;

    // 2. Check disabled status in Firestore
    if (role === "teacher") {
      const teacherDoc = await adminDb.collection("teachers").doc(uid).get();
      if (teacherDoc.exists) {
        const teacherData = teacherDoc.data();
        if (teacherData?.status === "disabled") {
          return NextResponse.json(
            { error: "تم إيقاف هذا الحساب، تواصل مع الإدارة", disabled: true },
            { status: 403 }
          );
        }
      }
    } else if (role === "assistant") {
      const assistantDoc = await adminDb
        .collection("teachers")
        .doc(teacherId)
        .collection("assistants")
        .doc(uid)
        .get();

      if (assistantDoc.exists) {
        const assistantData = assistantDoc.data();
        if (assistantData?.status === "disabled") {
          return NextResponse.json(
            { error: "تم إيقاف هذا الحساب، تواصل مع الإدارة", disabled: true },
            { status: 403 }
          );
        }
      }
    }

    // 3. Fetch permissions if user is an assistant
    let permissions = null;
    if (role === "assistant") {
      const assistantDoc = await adminDb
        .collection("teachers")
        .doc(teacherId)
        .collection("assistants")
        .doc(uid)
        .get();
      if (assistantDoc.exists) {
        permissions = assistantDoc.data()?.permissions || null;
      }
    }

    // 4. Create Firebase session cookie (valid for 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({
      success: true,
      role,
      teacherId,
      permissions,
    });

    // Set secure HTTP-Only cookie for session
    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    // Set user role cookie for Edge Middleware routing
    response.cookies.set("user_role", role, {
      maxAge: expiresIn / 1000,
      httpOnly: false, // accessible to edge runtime / client
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[SESSION_ERROR]", err.message, err.stack);
    return NextResponse.json(
      {
        error: err.message || "فشل إنشاء الجلسة",
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        debug: {
          hasAdminProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
          hasAdminClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          hasAdminPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
          adminAuthReady: !!adminAuth,
          adminDbReady: !!adminDb,
        },
      },
      { status: 500 }
    );
  }
}
