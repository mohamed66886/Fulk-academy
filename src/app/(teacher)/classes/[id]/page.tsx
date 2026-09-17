"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useClassDetail } from "@/hooks/use-cached-data";
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
} from "@/components/ui/table";
import { ArrowRight, Layers, Users, Calendar, Plus, Edit2, Eye, Loader2 } from "lucide-react";

export default function ClassDetailsPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const { data: result, isLoading } = useClassDetail(classId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="font-semibold">جاري تحميل تفاصيل الصف...</span>
      </div>
    );
  }

  if (!result?.success || !result.classData) {
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
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{classData.studentsCount}</div>
            <p className="text-[11px] text-muted mt-1">طالب مسجل في المجموعات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">تاريخ الإنشاء</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-text dir-ltr text-right mt-1">
              {new Date(classData.createdAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List inside this class */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>المجموعات الدراسية المضافة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface hover:bg-surface">
                <TableHead className="w-[200px]">اسم المجموعة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classData.activeGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted">
                      <p className="font-semibold text-text">لا توجد مجموعات مسجلة في هذا الصف.</p>
                      <Link href={`/groups/create?classId=${classData.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span>إنشاء أول مجموعة</span>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                classData.activeGroups.map((group: { id: string; name: string }) => (
                  <TableRow key={group.id} className="group hover:bg-surface/50">
                    <TableCell className="font-bold text-text">{group.name}</TableCell>
                    <TableCell>
                      <Badge variant="success" className="text-[10px]" dot>
                        نشط
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/groups/${group.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            <span>عرض</span>
                          </Button>
                        </Link>
                        <Link href={`/groups/${group.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>تعديل</span>
                          </Button>
                        </Link>
                      </div>
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
