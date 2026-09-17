import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type {
  StudentPaymentRow,
  MonthlyPaymentAggregation,
  GetMonthPaymentsFilters,
} from "@/lib/actions/payments";

export type { GetMonthPaymentsFilters } from "@/lib/actions/payments";

export async function getMonthPaymentsClient(filters: GetMonthPaymentsFilters): Promise<{
  success: boolean;
  month: string;
  students: StudentPaymentRow[];
  aggregation: MonthlyPaymentAggregation;
  groups: Array<{ id: string; name: string; className: string }>;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const month = filters.month || new Date().toISOString().slice(0, 7);

    // Parallel fetch: groups, students, existing payments for this month
    const [groupsSnap, studentsSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(teacherRef, "groups"), where("deletedAt", "==", null))),
      getDocs(query(collection(teacherRef, "students"), where("deletedAt", "==", null))),
      getDocs(query(collection(teacherRef, "payments"), where("month", "==", month))),
    ]);

    const groupsList: Array<{ id: string; name: string; className: string }> = [];
    const groupMap = new Map<string, { name: string; className: string; price: number }>();

    groupsSnap.forEach((d) => {
      const g = d.data();
      const price = Number(g.monthlyPrice) || Number(g.price) || 0;
      const item = {
        name: (g.name as string) || "مجموعة",
        className: (g.className as string) || "",
        price,
      };
      groupMap.set(d.id, item);
      groupsList.push({ id: d.id, name: item.name, className: item.className });
    });

    // Build payment map
    const paymentMap = new Map<string, Record<string, unknown>>();
    paymentsSnap.forEach((d) => {
      const data = d.data();
      const sId = (data.studentId as string) || "";
      if (sId) {
        const expectedId = `${month}_${sId}`;
        if (d.id === expectedId) {
          paymentMap.set(sId, { ...data, id: d.id });
        } else if (!paymentMap.has(sId)) {
          paymentMap.set(sId, { ...data, id: d.id });
        }
      }
    });

    // Build rows from active students
    const activeStudents = studentsSnap.docs.filter((d) => d.data().status === "active");

    let rows: StudentPaymentRow[] = [];
    let totalRequired = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    activeStudents.forEach((d) => {
      const s = d.data();
      const groupInfo = groupMap.get(s.groupId as string);
      const payment = paymentMap.get(d.id);

      const groupPrice = Number(groupInfo?.price) || 0;
      const discount = Number(s.discount) || 0;
      const defaultPrice = Math.max(0, groupPrice - discount);

      let required = payment ? Number(payment.required) || 0 : defaultPrice;
      let remaining = payment ? Number(payment.remaining) || 0 : required;

      // Fix for previously broken auto-generated payments
      if (required === 0 && defaultPrice > 0 && Number(payment?.paid || 0) === 0) {
        required = defaultPrice;
        remaining = defaultPrice;
      }

      const paid = payment ? Number(payment.paid) || 0 : 0;
      const status = (payment?.status as "paid" | "partial" | "unpaid") || "unpaid";

      totalRequired += required;
      totalCollected += paid;
      totalRemaining += remaining;

      if (status === "paid") paidCount++;
      else if (status === "partial") partialCount++;
      else unpaidCount++;

      rows.push({
        paymentId: (payment?.id as string) || "",
        studentId: d.id,
        studentName: (s.name as string) || "طالب",
        studentPhone: (s.phone as string) || "",
        parentPhone: (s.parentPhone as string) || "",
        groupId: (s.groupId as string) || "",
        groupName: groupInfo?.name || (payment?.groupName as string) || "مجموعة",
        className: groupInfo?.className || (payment?.className as string) || "",
        month,
        groupPrice,
        discount,
        required,
        paid,
        remaining,
        status,
        notes: (payment?.notes as string) || "",
        updatedAt: (payment?.updatedAt as string) || "",
      });
    });

    const totalStudents = activeStudents.length;
    const collectionRate =
      totalRequired > 0 ? Math.round((totalCollected / totalRequired) * 100) : 0;

    const aggregation: MonthlyPaymentAggregation = {
      month,
      totalStudents,
      paidCount,
      partialCount,
      unpaidCount,
      totalRequired,
      totalCollected,
      totalRemaining,
      collectionRate,
      updatedAt: new Date().toISOString(),
    };

    // Apply client-side filters
    if (filters.groupId && filters.groupId !== "all") {
      rows = rows.filter((r) => r.groupId === filters.groupId);
    }
    if (filters.status && filters.status !== "all") {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentPhone.includes(q) ||
          r.parentPhone.includes(q)
      );
    }

    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

    return {
      success: true,
      month,
      students: rows,
      aggregation,
      groups: groupsList,
    };
  } catch (error) {
    console.error("GET_PAYMENTS_CLIENT_ERROR:", error);
    return {
      success: false,
      month: filters.month,
      students: [],
      aggregation: {
        month: filters.month,
        totalStudents: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        totalRequired: 0,
        totalCollected: 0,
        totalRemaining: 0,
        collectionRate: 0,
        updatedAt: "",
      },
      groups: [],
      error: error instanceof Error ? error.message : "فشل جلب مدفوعات الشهر",
    };
  }
}
