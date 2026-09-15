"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { PaymentStatus } from "@/types/payment";

import { checkPermission } from "@/lib/auth/permissions";
import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

export interface StudentPaymentRow {
  paymentId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  groupId: string;
  groupName: string;
  className: string;
  month: string; // "YYYY-MM"
  groupPrice: number;
  discount: number;
  required: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  notes?: string;
  updatedAt: string;
}

export interface MonthlyPaymentAggregation {
  month: string;
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalRequired: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
  updatedAt: string;
}

export interface GetMonthPaymentsFilters {
  month: string; // "YYYY-MM"
  groupId?: string;
  status?: string; // "all" | "paid" | "partial" | "unpaid"
  query?: string;
}

// 1. GET MONTH PAYMENTS (Auto-generates missing records for active students)
export async function getMonthPayments(filters: GetMonthPaymentsFilters): Promise<{
  success: boolean;
  month: string;
  students: StudentPaymentRow[];
  aggregation: MonthlyPaymentAggregation;
  groups: Array<{ id: string; name: string; className: string }>;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("payments", "view");
    const month = filters.month || new Date().toISOString().slice(0, 7);

    return await withCache(
      `payments:${teacherId}:${month}:${filters.groupId || "all"}:${filters.status || "all"}:${filters.query || ""}`,
      [`payments:${teacherId}`],
      30,
      async () => {
        // 1. Fetch active groups and students
        const [groupsSnap, studentsSnap] = await Promise.all([
          teacherRef.collection("groups").where("isDeleted", "!=", true).get(),
          teacherRef.collection("students").where("deletedAt", "==", null).get(),
        ]);

        const groupsList: Array<{ id: string; name: string; className: string }> = [];
        const groupMap = new Map<string, { name: string; className: string; price: number }>();

        groupsSnap.docs.forEach((d) => {
          const g = d.data();
          const price = Number(g.monthlyPrice) || Number(g.price) || 0;
          const item = {
            name: (g.name as string) || "مجموعة",
            className: (g.className as string) || "",
            price,
          };
          groupMap.set(d.id, item);
          groupsList.push({
            id: d.id,
            name: item.name,
            className: item.className,
          });
        });

        // 2. Fetch existing payments for this month
        const paymentsSnap = await teacherRef
          .collection("payments")
          .where("month", "==", month)
          .get();

        const paymentMap = new Map<string, FirebaseFirestore.DocumentData>();
        paymentsSnap.docs.forEach((d) => {
          const data = d.data();
          const sId = (data.studentId as string) || "";
          if (sId) {
            paymentMap.set(sId, { ...data, id: d.id });
          }
        });

        // 3. Detect students missing payment record for this month and auto-create them
        const missingStudents: FirebaseFirestore.DocumentData[] = [];
        const activeStudents = studentsSnap.docs.filter((d) => d.data().status === "active");

        activeStudents.forEach((d) => {
          const s = d.data();
          if (!paymentMap.has(d.id)) {
            missingStudents.push({ ...s, id: d.id });
          }
        });

        // Auto create missing records in batch
        if (missingStudents.length > 0) {
          const batch = teacherRef.firestore.batch();
          const now = new Date().toISOString();

          missingStudents.forEach((s) => {
            const groupInfo = groupMap.get(s.groupId) || {
              name: "مجموعة",
              className: "",
              price: 0,
            };
            const finalPrice =
              s.customPrice !== undefined && s.customPrice !== null
                ? Number(s.customPrice)
                : groupInfo.price;

            const newPaymentRef = teacherRef.collection("payments").doc();
            const newDocData = {
              id: newPaymentRef.id,
              teacherId: s.teacherId || "",
              studentId: s.id,
              studentName: (s.name as string) || "طالب",
              studentPhone: (s.phone as string) || "",
              parentPhone: (s.parentPhone as string) || "",
              groupId: (s.groupId as string) || "",
              groupName: groupInfo.name,
              className: groupInfo.className,
              month,
              required: finalPrice,
              paid: 0,
              remaining: finalPrice,
              status: "unpaid" as PaymentStatus,
              notes: "",
              createdAt: now,
              updatedAt: now,
            };

            batch.set(newPaymentRef, newDocData);
            paymentMap.set(s.id, newDocData);
          });

          try {
            await batch.commit();
          } catch (batchErr) {
            console.error("Failed to commit auto-generated payments batch:", batchErr);
          }
        }

        // 4. Transform into StudentPaymentRow items
        let rows: StudentPaymentRow[] = [];
        let totalRequired = 0;
        let totalCollected = 0;
        let totalRemaining = 0;
        let paidCount = 0;
        let partialCount = 0;
        let unpaidCount = 0;

        activeStudents.forEach((d) => {
          const s = d.data();
          const groupInfo = groupMap.get(s.groupId);
          const payment = paymentMap.get(d.id);

          const groupPrice = Number(groupInfo?.price) || 0;
          const discount = Number(s.discount) || 0;
          const defaultPrice =
            s.customPrice !== undefined && s.customPrice !== null
              ? Number(s.customPrice)
              : groupInfo?.price || 0;

          const required = payment ? Number(payment.required) || 0 : defaultPrice;
          const paid = payment ? Number(payment.paid) || 0 : 0;
          const remaining = payment ? Number(payment.remaining) || 0 : required;
          const status = (payment?.status as PaymentStatus) || "unpaid";

          totalRequired += required;
          totalCollected += paid;
          totalRemaining += remaining;

          if (status === "paid") paidCount++;
          else if (status === "partial") partialCount++;
          else unpaidCount++;

          rows.push({
            paymentId: payment?.id || "",
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

        // Save aggregation document asynchronously
        try {
          await teacherRef
            .collection("paymentAggregations")
            .doc(month)
            .set(aggregation, { merge: true });
        } catch {
          // Ignored
        }

        // 5. Apply filters to return rows
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

        // Sort by name alphabetically
        rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

        return {
          success: true,
          month,
          students: rows,
          aggregation,
          groups: groupsList,
        };
      }
    );
  } catch (error) {
    console.error("Error fetching month payments:", error);
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

// 2. UPDATE PAYMENT (Server-side Derived Calculations + Persistent Aggregation Update)
export async function updatePayment({
  studentId,
  month,
  paidAmount,
  notes,
}: {
  studentId: string;
  month: string;
  paidAmount: number;
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  payment?: StudentPaymentRow;
  aggregation?: MonthlyPaymentAggregation;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "payments",
      "edit"
    );

    if (!studentId || !month) {
      return { success: false, message: "بيانات الدفع غير مكتملة" };
    }

    const cleanMonth = month.trim();
    const cleanPaid = Math.max(0, Number(paidAmount) || 0);
    const now = new Date().toISOString();

    const paymentDocId = `${cleanMonth}_${studentId}`;
    const paymentRef = teacherRef.collection("payments").doc(paymentDocId);
    const aggRef = teacherRef.collection("paymentAggregations").doc(cleanMonth);

    let updatedRow: StudentPaymentRow | undefined;
    let updatedAgg: MonthlyPaymentAggregation | undefined;

    await adminDb!.runTransaction(async (transaction) => {
      // 1. Read student doc
      const studentDoc = await transaction.get(teacherRef.collection("students").doc(studentId));
      if (!studentDoc.exists) {
        throw new Error("الطالب غير موجود");
      }
      const sData = studentDoc.data()!;
      const groupId = (sData.groupId as string) || "";

      // 2. Read group doc
      let groupName = "مجموعة";
      let className = "";
      let groupPrice = 0;

      if (groupId) {
        const groupDoc = await transaction.get(teacherRef.collection("groups").doc(groupId));
        if (groupDoc.exists) {
          const gData = groupDoc.data()!;
          groupName = (gData.name as string) || "مجموعة";
          className = (gData.className as string) || "";
          groupPrice = Number(gData.monthlyPrice) || Number(gData.price) || 0;
        }
      }

      // 3. Read current payment document
      const currentPayDoc = await transaction.get(paymentRef);
      let oldStatus: PaymentStatus = "unpaid";
      let oldPaid = 0;
      let oldRequired = 0;
      let oldRemaining = 0;
      let discount = Number(sData.discount) || 0;

      if (currentPayDoc.exists) {
        const pData = currentPayDoc.data()!;
        oldStatus = (pData.status as PaymentStatus) || "unpaid";
        oldPaid = Number(pData.paid) || 0;
        oldRequired = Number(pData.required) || 0;
        oldRemaining = Number(pData.remaining) || 0;
        if (pData.groupPrice !== undefined) groupPrice = Number(pData.groupPrice);
        if (pData.discount !== undefined) discount = Number(pData.discount);
      }

      // 4. Calculate DERIVED FIELDS strictly on server (Do not trust client)
      const required = Math.max(0, groupPrice - discount);
      const paid = cleanPaid;
      const remaining = Math.max(0, required - paid);

      let status: PaymentStatus = "unpaid";
      if (paid >= required && required > 0) {
        status = "paid";
      } else if (paid > 0 && paid < required) {
        status = "partial";
      } else if (paid === 0 && required > 0) {
        status = "unpaid";
      } else if (required === 0) {
        status = "paid";
      }

      // 5. Build payment payload and save
      const paymentPayload = {
        id: paymentDocId,
        studentId,
        studentName: (sData.name as string) || "طالب",
        studentPhone: (sData.phone as string) || "",
        parentPhone: (sData.parentPhone as string) || "",
        groupId,
        groupName,
        className,
        month: cleanMonth,
        groupPrice,
        discount,
        required,
        paid,
        remaining,
        status,
        notes: notes !== undefined ? notes.trim() : (currentPayDoc.data()?.notes as string) || "",
        updatedAt: now,
        createdAt: currentPayDoc.exists ? currentPayDoc.data()?.createdAt || now : now,
        lastModifiedBy: actorId,
      };

      transaction.set(paymentRef, paymentPayload, { merge: true });

      // 6. Update Monthly Aggregation Document Atomically
      const aggDoc = await transaction.get(aggRef);
      let aggTotalStudents = 0;
      let aggPaidCount = 0;
      let aggPartialCount = 0;
      let aggUnpaidCount = 0;
      let aggTotalRequired = 0;
      let aggTotalCollected = 0;
      let aggTotalRemaining = 0;

      if (aggDoc.exists) {
        const aData = aggDoc.data()!;
        aggTotalStudents = Number(aData.totalStudents) || 0;
        aggPaidCount = Number(aData.paidCount) || 0;
        aggPartialCount = Number(aData.partialCount) || 0;
        aggUnpaidCount = Number(aData.unpaidCount) || 0;
        aggTotalRequired = Number(aData.totalRequired) || 0;
        aggTotalCollected = Number(aData.totalCollected) || 0;
        aggTotalRemaining = Number(aData.totalRemaining) || 0;

        // Decrement old status
        if (oldStatus === "paid") aggPaidCount = Math.max(0, aggPaidCount - 1);
        else if (oldStatus === "partial") aggPartialCount = Math.max(0, aggPartialCount - 1);
        else if (oldStatus === "unpaid") aggUnpaidCount = Math.max(0, aggUnpaidCount - 1);

        // Deduct old values
        aggTotalRequired = Math.max(0, aggTotalRequired - oldRequired);
        aggTotalCollected = Math.max(0, aggTotalCollected - oldPaid);
        aggTotalRemaining = Math.max(0, aggTotalRemaining - oldRemaining);
      } else {
        // First time initializing aggregation doc
        aggTotalStudents = 1;
      }

      // Increment new status
      if (status === "paid") aggPaidCount++;
      else if (status === "partial") aggPartialCount++;
      else if (status === "unpaid") aggUnpaidCount++;

      // Add new values
      aggTotalRequired += required;
      aggTotalCollected += paid;
      aggTotalRemaining += remaining;

      const collectionRate =
        aggTotalRequired > 0 ? Math.round((aggTotalCollected / aggTotalRequired) * 100) : 0;

      const aggPayload: MonthlyPaymentAggregation = {
        month: cleanMonth,
        totalStudents: aggTotalStudents,
        paidCount: aggPaidCount,
        partialCount: aggPartialCount,
        unpaidCount: aggUnpaidCount,
        totalRequired: aggTotalRequired,
        totalCollected: aggTotalCollected,
        totalRemaining: aggTotalRemaining,
        collectionRate,
        updatedAt: now,
      };

      transaction.set(aggRef, aggPayload, { merge: true });

      updatedRow = {
        paymentId: paymentDocId,
        studentId,
        studentName: (sData.name as string) || "طالب",
        studentPhone: (sData.phone as string) || "",
        parentPhone: (sData.parentPhone as string) || "",
        groupId,
        groupName,
        className,
        month: cleanMonth,
        groupPrice,
        discount,
        required,
        paid,
        remaining,
        status,
        notes: paymentPayload.notes,
        updatedAt: now,
      };

      updatedAgg = aggPayload;
    });

    // 7. Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "payment_recorded",
        entity: "payment",
        entityId: paymentDocId,
        actorId,
        actorName,
        actorRole,
        details: {
          studentId,
          studentName: updatedRow?.studentName,
          month: cleanMonth,
          paidAmount: cleanPaid,
          required: updatedRow?.required,
          remaining: updatedRow?.remaining,
          status: updatedRow?.status,
        },
        timestamp: now,
      });
    } catch {
      // Ignored
    }

    invalidateCacheTags(`payments:${teacherId}`, `dashboard:${teacherId}`, `students:${teacherId}`);
    revalidatePath("/payments");
    revalidatePath("/payments/reports");
    revalidatePath("/dashboard");
    revalidatePath(`/students/${studentId}`);

    return {
      success: true,
      message: `تم تسجيل دفع ${cleanPaid} ج.م للطالب ${updatedRow?.studentName || ""} بنجاح!`,
      payment: updatedRow,
      aggregation: updatedAgg,
    };
  } catch (error) {
    console.error("Error updating payment:", error);
    return {
      success: false,
      message: "فشل حفظ الدفعة",
      error: error instanceof Error ? error.message : "خطأ غير متوقع",
    };
  }
}

// 3. GET PAYMENT REPORTS (Read directly from pre-aggregated documents for instant performance)
export interface GroupPaymentPerformance {
  groupId: string;
  groupName: string;
  className: string;
  totalStudents: number;
  paidStudents: number;
  totalRequired: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
}

export interface PaymentReportsResult {
  month: string;
  aggregation: MonthlyPaymentAggregation;
  groupsPerformance: GroupPaymentPerformance[];
  unpaidStudents: Array<{
    studentId: string;
    studentName: string;
    studentPhone: string;
    parentPhone: string;
    groupName: string;
    required: number;
    paid: number;
    remaining: number;
    status: PaymentStatus;
  }>;
}

export async function getPaymentReports(month?: string): Promise<{
  success: boolean;
  data?: PaymentReportsResult;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("payments", "view");
    const cleanMonth = month || new Date().toISOString().slice(0, 7);

    return await withCache(
      `payment-reports:${teacherId}:${cleanMonth}`,
      [`payments:${teacherId}`],
      30,
      async () => {
        // 1. Fetch aggregation document directly
        const aggDoc = await teacherRef.collection("paymentAggregations").doc(cleanMonth).get();
        let aggregation: MonthlyPaymentAggregation;

        if (aggDoc.exists) {
          const a = aggDoc.data()!;
          aggregation = {
            month: cleanMonth,
            totalStudents: Number(a.totalStudents) || 0,
            paidCount: Number(a.paidCount) || 0,
            partialCount: Number(a.partialCount) || 0,
            unpaidCount: Number(a.unpaidCount) || 0,
            totalRequired: Number(a.totalRequired) || 0,
            totalCollected: Number(a.totalCollected) || 0,
            totalRemaining: Number(a.totalRemaining) || 0,
            collectionRate: Number(a.collectionRate) || 0,
            updatedAt: (a.updatedAt as string) || "",
          };
        } else {
          // If aggregation doc does not exist yet, trigger getMonthPayments to auto-build it
          const monthData = await getMonthPayments({ month: cleanMonth });
          aggregation = monthData.aggregation;
        }

        // 2. Fetch payments for detailed group breakdown and unpaid students list
        const paymentsSnap = await teacherRef
          .collection("payments")
          .where("month", "==", cleanMonth)
          .get();

        const groupsMap = new Map<string, GroupPaymentPerformance>();
        const unpaidList: PaymentReportsResult["unpaidStudents"] = [];

        paymentsSnap.docs.forEach((d) => {
          const p = d.data();
          const gId = (p.groupId as string) || "unknown";
          const gName = (p.groupName as string) || "مجموعة";
          const cName = (p.className as string) || "";
          const req = Number(p.required) || 0;
          const paid = Number(p.paid) || 0;
          const rem = Number(p.remaining) || 0;
          const st = (p.status as PaymentStatus) || "unpaid";

          // Group performance aggregator
          const grp = groupsMap.get(gId) || {
            groupId: gId,
            groupName: gName,
            className: cName,
            totalStudents: 0,
            paidStudents: 0,
            totalRequired: 0,
            totalCollected: 0,
            totalRemaining: 0,
            collectionRate: 0,
          };

          grp.totalStudents += 1;
          if (st === "paid") grp.paidStudents += 1;
          grp.totalRequired += req;
          grp.totalCollected += paid;
          grp.totalRemaining += rem;
          grp.collectionRate =
            grp.totalRequired > 0 ? Math.round((grp.totalCollected / grp.totalRequired) * 100) : 0;
          groupsMap.set(gId, grp);

          // Collect unpaid or partial students for reminders
          if (st === "unpaid" || st === "partial") {
            unpaidList.push({
              studentId: (p.studentId as string) || "",
              studentName: (p.studentName as string) || "طالب",
              studentPhone: (p.studentPhone as string) || "",
              parentPhone: (p.parentPhone as string) || "",
              groupName: gName,
              required: req,
              paid,
              remaining: rem,
              status: st,
            });
          }
        });

        // Sort unpaid students by remaining amount descending
        unpaidList.sort((a, b) => b.remaining - a.remaining);

        const groupsPerformance = Array.from(groupsMap.values()).sort(
          (a, b) => b.totalCollected - a.totalCollected
        );

        return {
          success: true,
          data: {
            month: cleanMonth,
            aggregation,
            groupsPerformance,
            unpaidStudents: unpaidList,
          },
        };
      }
    );
  } catch (error) {
    console.error("Error fetching payment reports:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب تقارير المدفوعات",
    };
  }
}
