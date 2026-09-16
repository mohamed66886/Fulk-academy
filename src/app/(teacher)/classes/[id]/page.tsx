import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassById } from "@/lib/actions/classes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { ArrowRight, Layers, Users, Calendar, Plus, Edit2, Eye, Clock } from "lucide-react";
import { formatArabicTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

interface ClassDetailsPageProps {
  params: {
    id: string;
  };
}

const arabicDaysMap: Record<string, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

export default async function ClassDetailsPage({ params }: ClassDetailsPageProps) {
  const result = await getClassById(params.id);

  if (!result.success || !result.classData) {
    notFound();
  }

  const { classData } = result;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link href="/classes">
            <Button variant="ghost" size="sm" className="gap-1 p-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-text tracking-tight">{classData.name}</h1>
              {classData.status === "active" ? (
                <Badge variant="success" dot>
                  نشط
                </Badge>
              ) : (
                <Badge variant="default">مؤرشف</Badge>
              )}
            </div>
            {classData.description && (
              <p className="text-xs text-muted mt-1">{classData.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/groups/create?classId=${classData.id}`}>
            <Button size="md" className="gap-2 font-bold shadow-sm">
              <Plus className="h-4 w-4" />
              <span>إضافة مجموعة جديدة</span>
            </Button>
          </Link>
          <Link href={`/classes/${classData.id}/edit`}>
            <Button variant="outline" size="md" className="gap-1.5">
              <Edit2 className="h-4 w-4" />
              <span>تعديل الصف</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">المجموعات التابعة</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{classData.groupsCount}</div>
            <p className="text-[11px] text-muted mt-1">مجموعة دراسية في هذا الصف</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{classData.studentsCount}</div>
            <p className="text-[11px] text-muted mt-1">طالب مسجل في هذا الصف</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">تاريخ الإنشاء</CardTitle>
            <Calendar className="h-4 w-4 text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-text">
              {new Date(classData.createdAt).toLocaleDateString("ar-EG")}
            </div>
            <p className="text-[11px] text-muted mt-1 font-mono">معرّف الصف: {classData.id}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attached Groups List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text">المجموعات التابعة لهذا الصف</h2>
            <Badge variant="primary" size="sm">
              {classData.groups.length} مجموعة
            </Badge>
          </div>
        </div>

        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>اسم المجموعة</TableHead>
              <TableHead>سعر الاشتراك</TableHead>
              <TableHead>مواعيد الحصص</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classData.groups.length === 0 ? (
              <TableEmpty
                colSpan={6}
                icon={<Layers className="h-10 w-10 text-muted stroke-[1.5]" />}
                title="لا توجد مجموعات تابعة لهذا الصف"
                description="قم بإنشاء مجموعة دراسية أولى لتحديد المواعيد وقبول الطلاب."
              />
            ) : (
              classData.groups.map((grp) => (
                <TableRow key={grp.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-text">{grp.name}</span>
                      {grp.hasCenter && (
                        <span className="text-[10px] text-muted">
                          حصة سنتر (+{grp.centerSessionPrice ?? 0} ج.م)
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-semibold text-text">{grp.price} ج.م</TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {grp.schedule.map((sch, i) => (
                        <span
                          key={`sch-${i}`}
                          className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] text-text"
                        >
                          <Clock className="h-3 w-3 text-muted" />
                          <span>{arabicDaysMap[sch.day] || sch.day}</span>
                          <span>
                            ({formatArabicTime(sch.startTime)} - {formatArabicTime(sch.endTime)})
                          </span>
                        </span>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold">
                      {grp.studentsCount} طالب
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    {grp.status === "active" ? (
                      <Badge variant="success" dot size="sm">
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        مؤرشف
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <Link href={`/groups/${grp.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        <span>عرض</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
