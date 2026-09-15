export function getFirebaseAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    case "auth/invalid-email":
      return "صيغة البريد الإلكتروني غير صالحة.";
    case "auth/user-disabled":
      return "تم إيقاف هذا الحساب، تواصل مع الإدارة.";
    case "auth/too-many-requests":
      return "تم حظر محاولات تسجيل الدخول مؤقتًا بسبب تكرار المحاولات الخاطئة. يرجى الانتظار والمحاولة لاحقًا.";
    case "auth/network-request-failed":
      return "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
    case "ACCOUNT_DISABLED":
      return "تم إيقاف هذا الحساب، تواصل مع الإدارة.";
    default:
      return "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.";
  }
}
