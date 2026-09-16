import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IdCard,
  Barcode,
  QrCode,
  Users,
  ShieldCheck,
  Printer,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function CardsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
                كروت الطلاب الذكية (Smart ID Cards)
              </h1>
              <p className="text-xs md:text-sm text-muted">
                نظام كروت ذكية متكامل بوجهين: باركود للحضور السريع و QR لبوابة متابعة ولي الأمر.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/students/print-cards">
            <Button size="md" className="gap-2 font-bold shadow-sm bg-primary hover:bg-primary/95">
              <Printer className="h-4 w-4" />
              <span>استوديو طباعة الكروت (A4)</span>
            </Button>
          </Link>

          <Link href="/students">
            <Button variant="outline" size="md" className="gap-2 font-bold">
              <Users className="h-4 w-4" />
              <span>تحديد وطباعة الطلاب</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Systems Explained (Barcode vs QR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Face: Barcode for Attendance */}
        <Card className="border-primary/30 relative overflow-hidden bg-gradient-to-br from-surface to-primary/5">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                  <Barcode className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-text">
                  الوجه الأمامي: باركود حضور الطالب
                </CardTitle>
              </div>
              <Badge variant="primary">حضور الطلاب</Badge>
            </div>
            <CardDescription className="text-xs">
              مخصص لجلسات الحضور اليومية في السنتر أو القاعة الدراسية.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                <strong>مسح فوري بمسدس الباركود (USB / Laser Scanner):</strong> يسجل حضور الطالب في
                أقل من ثانية وبدون تأخير عند باب السنتر.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                <strong>دعم كاميرا الجهاز:</strong> تم ضبط كاميرا الحضور للتعرف التلقائي على
                الباركود المطبوع بدقة عالية.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                <strong>تشفير آمن:</strong> الباركود مشفر ولا يحمل بيانات شخصية مقروءة للعيان.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Back Face: QR Code for Parent Portal */}
        <Card className="border-border relative overflow-hidden bg-gradient-to-br from-surface to-surface-raised">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-secondary" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base font-bold text-text">
                  الوجه الخلفي: QR كود ولي الأمر
                </CardTitle>
              </div>
              <Badge variant="default">متابعة أولياء الأمور</Badge>
            </div>
            <CardDescription className="text-xs">
              مخصص لمسحه بكاميرا الهاتف المحمول دون الحاجة لأي تطبيقات إضافية.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted">
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>مسح مباشر بكاميرا الموبايل:</strong> يقوم ولي الأمر بفتح كاميرا هاتفه
                وتوجيهها نحو الكود ليفتح الرابط فوراً.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>بوابة متابعة شاملة:</strong> يتيح لولي الأمر متابعة سجل الحضور والغياب،
                درجات الاختبارات الشهرية، وتقارير المتابعة.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                <strong>رابط مشفر خاص:</strong> كل طالب لديه رمز فريد يضمن سرية وخصوصية بياناته.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How to print notice */}
      <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">طباعة كارت أي طالب</h3>
            <p className="text-xs text-muted mt-0.5">
              انتقل لصفحة الطلاب واختر أي طالب، ثم افتح تبويب &quot;الكارت الذكي&quot; لمعاينة
              الوجهين وطباعتها بمقاس ID القياسي (85.6mm × 54mm) أو تصديرها كصورة PNG عالية الدقة.
            </p>
          </div>
        </div>

        <Link href="/students" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 font-bold">
            <span>انتقل إلى الطلاب</span>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
