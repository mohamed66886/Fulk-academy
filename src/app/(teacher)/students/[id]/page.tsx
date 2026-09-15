import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "./tabs/overview-tab";
import { AttendanceTab } from "./tabs/attendance-tab";
import { PaymentsTab } from "./tabs/payments-tab";
import { ExamsTab } from "./tabs/exams-tab";
import { CardTab } from "./tabs/card-tab";
import {
  ArrowRight,
  Edit2,
  Layers,
  User,
  CalendarCheck,
  CreditCard,
  Award,
  IdCard,
} from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentProfilePage({ params }: PageProps) {
  const res = await getStudentById(params.id);

  if (!res.success || !res.student) {
    notFound();
  }

  const { student } = res;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          {/* Avatar */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl overflow-hidden border border-border">
            {student.photoUrl ? (
              <Image
                src={student.photoUrl}
                alt={student.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span>{student.name.charAt(0)}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-text tracking-tight">{student.name}</h1>
              {student.status === "active" ? (
                <Badge variant="success" dot>
                  نشط
                </Badge>
              ) : (
                <Badge variant="danger">محظور</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-1">
              <span className="flex items-center gap-1 font-semibold text-text">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {student.className}
              </span>
              <span>•</span>
              <span className="font-semibold text-text">{student.groupName}</span>
              <span>•</span>
              <span className="font-mono" dir="ltr">
                {student.phone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href={`/students/${student.id}/edit`}>
            <Button size="md" className="gap-2 font-bold">
              <Edit2 className="h-4 w-4" />
              <span>تعديل البيانات</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Tabs with Suspense Boundaries */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-11 p-1 bg-surface border border-border">
            <TabsTrigger value="overview" className="gap-2 px-4 py-2 font-bold">
              <User className="h-4 w-4" />
              <span>نظرة عامة</span>
            </TabsTrigger>

            <TabsTrigger value="attendance" className="gap-2 px-4 py-2 font-bold">
              <CalendarCheck className="h-4 w-4" />
              <span>الحضور والغياب</span>
            </TabsTrigger>

            <TabsTrigger value="payments" className="gap-2 px-4 py-2 font-bold">
              <CreditCard className="h-4 w-4" />
              <span>المدفوعات والشهور</span>
            </TabsTrigger>

            <TabsTrigger value="exams" className="gap-2 px-4 py-2 font-bold">
              <Award className="h-4 w-4" />
              <span>الامتحانات والدرجات</span>
            </TabsTrigger>

            <TabsTrigger value="card" className="gap-2 px-4 py-2 font-bold">
              <IdCard className="h-4 w-4" />
              <span>بطاقة الطالب (QR)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <OverviewTab student={student} />
        </TabsContent>

        {/* Tab 2: Attendance */}
        <TabsContent value="attendance">
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-muted text-sm">
                جاري تحميل سجل حضور الطالب...
              </div>
            }
          >
            <AttendanceTab studentId={student.id} />
          </React.Suspense>
        </TabsContent>

        {/* Tab 3: Payments */}
        <TabsContent value="payments">
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-muted text-sm">جاري تحميل سجل الاشتراكات...</div>
            }
          >
            <PaymentsTab studentId={student.id} />
          </React.Suspense>
        </TabsContent>

        {/* Tab 4: Exams */}
        <TabsContent value="exams">
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-muted text-sm">
                جاري تحميل درجات الامتحانات...
              </div>
            }
          >
            <ExamsTab studentId={student.id} />
          </React.Suspense>
        </TabsContent>

        {/* Tab 5: Card */}
        <TabsContent value="card">
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-muted text-sm">جاري إنشاء بطاقة الطالب...</div>
            }
          >
            <CardTab student={student} />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
