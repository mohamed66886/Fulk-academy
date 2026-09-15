"use client";

import * as React from "react";
import { getStudentPayments, type StudentPaymentRecord } from "@/lib/actions/students";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableSkeleton,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

interface PaymentsTabProps {
  studentId: string;
}

export function PaymentsTab({ studentId }: PaymentsTabProps) {
  const [payments, setPayments] = React.useState<StudentPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadPayments() {
      setIsLoading(true);
      try {
        const res = await getStudentPayments(studentId);
        if (res.success && res.payments) {
          setPayments(res.payments);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadPayments();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="space-y-4" dir="rtl">
        <TableSkeleton rows={4} cols={6} />
      </div>
    );
  }

  const totalRequired = payments.reduce((acc, p) => acc + p.required, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.paid, 0);
  const totalBalance = Math.max(0, totalRequired - totalPaid);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface/40">
          <span className="text-xs text-muted font-medium">إجمالي المبالغ المستحقة</span>
          <h4 className="text-xl font-bold text-text mt-1">{totalRequired} ج.م</h4>
          <span className="text-[11px] text-muted">إجمالي رسوم الشهور المسجلة</span>
        </div>

        <div className="p-4 rounded-xl border border-success/20 bg-success/5">
          <span className="text-xs text-success font-semibold">إجمالي المبالغ المسددة</span>
          <h4 className="text-xl font-black text-success mt-1">{totalPaid} ج.م</h4>
          <span className="text-[11px] text-muted">ما تم تحصيله فعلياً</span>
        </div>

        <div className="p-4 rounded-xl border border-danger/20 bg-danger/5">
          <span className="text-xs text-danger font-semibold">المتبقي / المتأخرات</span>
          <h4 className="text-xl font-black text-danger mt-1">{totalBalance} ج.م</h4>
          <span className="text-[11px] text-muted">مبالغ مستحقة لم تسدد</span>
        </div>
      </div>

      {/* Payments History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">سجل الاشتراكات والشهور</CardTitle>
          </div>
          <CardDescription>متابعة سداد الاشتراكات الشهرية وحالة كل شهر.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشهر</TableHead>
                <TableHead className="text-center">سعر المجموعة</TableHead>
                <TableHead className="text-center">الخصم</TableHead>
                <TableHead className="text-center">المطلوب</TableHead>
                <TableHead className="text-center">المسدد</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  icon={<DollarSign className="h-10 w-10 text-muted stroke-[1.5]" />}
                  title="لا توجد سجلات دفع مسجلة"
                  description="لم يتم إنشاء أو تسجيل إيصالات دفع لهذا الطالب بعد."
                />
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-text text-sm">{p.month}</TableCell>

                    <TableCell className="text-center text-xs text-muted">
                      {p.groupPrice} ج.م
                    </TableCell>

                    <TableCell className="text-center text-xs">
                      {p.discount > 0 ? (
                        <span className="text-danger font-semibold">-{p.discount} ج</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center text-sm font-bold text-text">
                      {p.required} ج.م
                    </TableCell>

                    <TableCell className="text-center text-sm font-bold text-success">
                      {p.paid} ج.م
                    </TableCell>

                    <TableCell className="text-center">
                      {p.status === "paid" ? (
                        <Badge variant="success" size="sm" dot>
                          مسدد بالكامل
                        </Badge>
                      ) : p.status === "partial" ? (
                        <Badge variant="warning" size="sm">
                          سداد جزئي
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          غير مسدد
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted">{p.notes || "—"}</TableCell>
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
