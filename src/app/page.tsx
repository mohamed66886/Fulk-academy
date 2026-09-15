import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          فُلك أكاديمي
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          المنصة المتكاملة لإدارة المدرسين، المجموعات، الحضور والغياب، والامتحانات.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg">تسجيل الدخول</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              لوحة التحكم
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
