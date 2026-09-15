"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Search,
  RotateCw,
  UserCheck,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Users,
} from "lucide-react";
import {
  getBlockedStudents,
  unblockStudent,
  type BlockedStudentItem,
} from "@/lib/actions/students";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function BlockedStudentsPage() {
  const [students, setStudents] = React.useState<BlockedStudentItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [unblockingId, setUnblockingId] = React.useState<string | null>(null);

  const loadBlocked = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await getBlockedStudents();
      if (res.success) {
        setStudents(res.students);
        if (showToast) {
          toast.success("تم تحديث قائمة الطلاب المحظورين");
        }
      } else {
        toast.error(res.error || "فشل جلب قائمة الطلاب المحظورين");
      }
    } catch {
      toast.error("حدث خطأ أثناء تحميل بيانات المحظورين");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  // Handle Unblock
  const handleUnblock = async (student: BlockedStudentItem) => {
    setUnblockingId(student.id);
    try {
      const res = await unblockStudent(student.id);
      if (res.success) {
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        toast.success(`تم إلغاء حظر الطالب ${student.name} بنجاح`);
      } else {
        toast.error(res.error || "فشل إلغاء الحظر");
      }
    } catch {
      toast.error("حدث خطأ أثناء إلغاء الحظر");
    } finally {
      setUnblockingId(null);
    }
  };

  // Filter students
  const filteredStudents = React.useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.parentPhone.includes(q) ||
        s.blockReason.toLowerCase().includes(q) ||
        s.groupName.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-danger/10 text-danger">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              الطلاب المحظورون
            </h1>
          </div>
          <p className="text-sm text-muted">
            قائمة الطلاب المحظورين من حضور الحصص ومسح كروت الـ QR مع أسباب الحظر وإمكانية فك الحظر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBlocked(true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
            تحديث
          </Button>

          <Link href="/students">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted hover:text-text"
            >
              <Users className="w-4 h-4" />
              الطلاب النشطون
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Security Banner & Stat Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-500">إجمالي الطلاب المحظورين</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 mt-1">
              {students.length}
            </div>
            <p className="text-xs text-muted mt-0.5">طالب ممنوع من الحضور</p>
          </div>
          <div className="p-3 rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="md:col-span-2 p-5 rounded-2xl bg-surface border border-border shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">
              الحماية الصارمة في نقطة مسح الحضور (Scanner)
            </h3>
            <p className="text-xs text-muted leading-relaxed mt-1">
              يقوم نظام المسح الذكي برفض أي محاولة حضور فورية لأي طالب متواجد في هذه القائمة مع
              إطلاق صوت تنبيه تحذيري وإظهار سبب الحظر على الشاشة لمسؤول الحضور.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، سبب الحظر أو اسم المجموعة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-text"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* 4. Blocked Students Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted">جاري تحميل قائمة الطلاب المحظورين...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="p-4 bg-success/10 rounded-2xl w-fit mx-auto text-success">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-text">
              {searchQuery ? "لا توجد نتائج مطابقة لبحثك" : "رائع! لا يوجد طلاب محظورون حالياً"}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              {searchQuery
                ? "جرب البحث بكلمات أخرى أو مسح حقل البحث"
                : "جميع الطلاب المسجلين بالأكاديمية نشطون ومصرح لهم بحضور الحصص والامتحانات"}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                مسح البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[180px]">الطالب</th>
                  <th className="py-3.5 px-4 min-w-[140px]">المجموعة والصف</th>
                  <th className="py-3.5 px-4 min-w-[220px]">سبب الحظر</th>
                  <th className="py-3.5 px-4 min-w-[150px]">تاريخ الحظر</th>
                  <th className="py-3.5 px-4 text-center min-w-[160px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredStudents.map((student, idx) => {
                  const isUnblocking = unblockingId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className={cn(
                        "hover:bg-background/50 transition-colors",
                        isUnblocking && "opacity-50 pointer-events-none"
                      )}
                    >
                      <td className="py-3.5 px-4 text-center text-xs text-muted font-mono">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text text-sm flex items-center gap-1.5">
                          {student.name}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted mt-0.5 font-mono">
                          {student.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {student.phone}
                            </span>
                          )}
                          {student.parentPhone && <span>ولي الأمر: {student.parentPhone}</span>}
                        </div>
                      </td>

                      {/* Group & Class */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-xs text-text">{student.groupName}</div>
                        {student.className && (
                          <Badge variant="outline" size="sm" className="mt-1 text-[10px]">
                            {student.className}
                          </Badge>
                        )}
                      </td>

                      {/* Block Reason */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-start gap-1.5 p-2 rounded-xl bg-danger/5 border border-danger/20 text-danger text-xs max-w-sm">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{student.blockReason}</span>
                        </div>
                      </td>

                      {/* Block Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          <span>
                            {student.blockedAt
                              ? new Date(student.blockedAt).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblock(student)}
                            disabled={isUnblocking}
                            className="text-xs h-8 px-3 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 border-emerald-500/20 font-medium flex items-center gap-1.5"
                            title="إلغاء حظر الطالب وإعادته للنشاط"
                          >
                            {isUnblocking ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            <span>إلغاء الحظر</span>
                          </Button>

                          <Link href={`/students/${student.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 px-2 text-muted hover:text-text"
                              title="عرض ملف الطالب"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
