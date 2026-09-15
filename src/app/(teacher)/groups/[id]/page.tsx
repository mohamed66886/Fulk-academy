import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/actions/groups";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DAY_LABELS } from "@/lib/validators/group";
import {
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Edit2,
  Building2,
  Layers,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
  Percent,
  Plus,
  ExternalLink,
  DollarSign,
} from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function GroupDetailsPage({ params }: PageProps) {
  const res = await getGroupById(params.id);

  if (!res.success || !res.groupData) {
    notFound();
  }

  const { group, className, students, latestSession } = res.groupData;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link href="/groups">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-text tracking-tight">{group.name}</h1>
              {group.status === "active" ? (
                <Badge variant="success" dot>
                  نشطة
                </Badge>
              ) : (
                <Badge variant="default">مؤرشفة</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted mt-1">
              <span className="flex items-center gap-1 font-semibold text-text">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {className}
              </span>
              <span>•</span>
              <span>تاريخ الإنشاء: {new Date(group.createdAt).toLocaleDateString("ar-EG")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/attendance?groupId=${group.id}`}>
            <Button variant="secondary" size="md" className="gap-2 font-bold">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>تسجيل الحضور</span>
            </Button>
          </Link>

          <Link href={`/groups/${group.id}/edit`}>
            <Button size="md" className="gap-2 font-bold">
              <Edit2 className="h-4 w-4" />
              <span>تعديل المجموعة</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">إجمالي الطلاب المسجلين</span>
            <h3 className="text-2xl font-black text-text mt-0.5">{students.length} طالب</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">السعر الشهري الافتراضي</span>
            <h3 className="text-2xl font-black text-text mt-0.5">
              {group.price > 0 ? `${group.price} ج.م` : "مجانية"}
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">مكان إقامة الحصص</span>
            <h3 className="text-base font-bold text-text mt-0.5">
              {group.hasCenter ? "سنتر تعليمي" : "مجموعة خاصة / أونلاين"}
            </h3>
            {group.hasCenter && group.centerSessionPrice !== undefined && (
              <span className="text-xs text-muted">{group.centerSessionPrice} ج.م لحصة الطالب</span>
            )}
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">الحصص الأسبوعية</span>
            <h3 className="text-2xl font-black text-text mt-0.5">
              {group.schedule?.length || 0} مواعيد
            </h3>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Schedule Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">مواعيد الحصص الأسبوعية</CardTitle>
            </div>
            <CardDescription>الجدول الدوري الثابت لحصص المجموعة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.schedule && group.schedule.length > 0 ? (
              group.schedule.map((sch, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-text">يوم {DAY_LABELS[sch.day]}</span>
                      <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted" />
                        من {sch.startTime} إلى {sch.endTime}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted text-center py-4">لم يتم تحديد مواعيد أسبوعية.</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Attendance Session Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">ملخص حضور آخر جلسة</CardTitle>
              </div>
              <CardDescription className="mt-1">
                تقرير فوري عن نسبة الحضور والغياب لآخر حصة تم رصدها.
              </CardDescription>
            </div>

            <Link href={`/attendance?groupId=${group.id}`}>
              <Button size="sm" variant="secondary" className="gap-1 font-bold text-xs">
                <span>جلسة جديدة</span>
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {latestSession ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-border bg-surface/40">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>تاريخ الجلسة: {latestSession.date}</span>
                    <span className="text-xs text-muted font-normal">
                      (بدأت الساعة {latestSession.startTime})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-sm font-bold text-primary">
                    <Percent className="h-4 w-4" />
                    <span>نسبة الحضور: {latestSession.attendanceRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl border border-success/20 bg-success/5">
                    <div className="flex items-center justify-center gap-1.5 text-success mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">حضور</span>
                    </div>
                    <span className="text-xl font-black text-text">
                      {latestSession.presentCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-danger/20 bg-danger/5">
                    <div className="flex items-center justify-center gap-1.5 text-danger mb-1">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs font-semibold">غياب</span>
                    </div>
                    <span className="text-xl font-black text-text">
                      {latestSession.absentCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
                    <div className="flex items-center justify-center gap-1.5 text-warning mb-1">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-xs font-semibold">متأخر</span>
                    </div>
                    <span className="text-xl font-black text-text">{latestSession.lateCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
                <UserCheck className="h-10 w-10 text-muted stroke-[1.5] mb-2" />
                <h4 className="font-bold text-sm text-text">لا توجد جلسات حضور سابقة</h4>
                <p className="text-xs text-muted mt-1 max-w-sm">
                  لم يتم تسجيل أي حضور لهذه المجموعة بعد. يمكنك بدء تسجيل حضور الطلاب الآن.
                </p>
                <Link href={`/attendance?groupId=${group.id}`} className="mt-4">
                  <Button size="sm" className="gap-1.5 font-bold">
                    <Plus className="h-4 w-4" />
                    <span>تسجيل أول جلسة حضور</span>
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registered Students Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">قائمة الطلاب المسجلين بالمجموعة</CardTitle>
            </div>
            <CardDescription className="mt-1">
              الطلاب المقيدون بهذه المجموعة مع تفاصيل الأسعار الفردية والخصومات الخاصة بكل طالب.
            </CardDescription>
          </div>

          <Link href={`/students/create?groupId=${group.id}`}>
            <Button size="sm" className="gap-1.5 font-bold">
              <Plus className="h-4 w-4" />
              <span>إضافة طالب للمجموعة</span>
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>رقم هاتف الطالب</TableHead>
                <TableHead>رقم ولي الأمر</TableHead>
                <TableHead className="text-center">سعر المجموعة</TableHead>
                <TableHead className="text-center">الخصم الفردي</TableHead>
                <TableHead className="text-center">السعر النهائي (المستحق)</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">الملف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableEmpty
                  colSpan={8}
                  icon={<Users className="h-10 w-10 text-muted stroke-[1.5]" />}
                  title="لا يوجد طلاب مسجلون في هذه المجموعة"
                  description="ابدأ بإضافة أو نقل طلاب إلى هذه المجموعة لتظهر بياناتهم هنا."
                />
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    {/* Student Name */}
                    <TableCell>
                      <Link
                        href={`/students/${student.id}`}
                        className="font-bold text-text hover:text-primary transition-colors text-sm flex items-center gap-2"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <span>{student.name}</span>
                      </Link>
                    </TableCell>

                    {/* Student Phone */}
                    <TableCell className="text-xs text-muted font-mono" dir="ltr">
                      {student.phone || "—"}
                    </TableCell>

                    {/* Parent Phone */}
                    <TableCell className="text-xs text-muted font-mono" dir="ltr">
                      {student.parentPhone || "—"}
                    </TableCell>

                    {/* Group Base Price */}
                    <TableCell className="text-center text-xs text-muted font-semibold">
                      {student.groupPrice} ج.م
                    </TableCell>

                    {/* Student Discount */}
                    <TableCell className="text-center">
                      {student.discount > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-danger/10 text-danger px-2 py-0.5 text-xs font-bold">
                          -{student.discount} ج.م
                        </span>
                      ) : (
                        <span className="text-xs text-muted">لا يوجد</span>
                      )}
                    </TableCell>

                    {/* Final Price */}
                    <TableCell className="text-center">
                      <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-black">
                        {student.finalPrice} ج.م
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {student.status === "active" ? (
                        <Badge variant="success" size="sm" dot>
                          نشط
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          محظور
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-center">
                      <Link href={`/students/${student.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="عرض ملف الطالب"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
