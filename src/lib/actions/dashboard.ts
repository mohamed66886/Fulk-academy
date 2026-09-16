"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getCairoCurrentDate, formatArabicTime } from "@/lib/utils/date";
import type { GroupSchedule } from "@/types";
import { withCache } from "@/lib/cache/server-cache";

export interface TodaySessionItem {
  groupId: string;
  groupName: string;
  className: string;
  startTime: string;
  endTime: string;
  formattedTime: string;
  studentCount: number;
}

export interface DashboardData {
  cairoDate: ReturnType<typeof getCairoCurrentDate>;
  teacherName: string;
  stats: {
    totalStudents: number;
    totalGroups: number;
    todayAttendance: number;
    duePaymentsAmount: number;
    duePaymentsCount: number;
  };
  todaySessions: TodaySessionItem[];
}

export async function getTeacherDashboardData(): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    if (!adminAuth || !adminDb) {
      return { success: false, error: "خدمة الخادم غير مهيأة" };
    }

    // 1. Authenticate user from session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    let teacherId = "";
    let teacherName = "المدرس";

    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, false);
        teacherId = (decoded.teacherId as string) || decoded.uid;
        teacherName = (decoded.name as string) || "المدرس";
      } catch {
        // Fallback for development if session cookie verification is bypassed
      }
    }

    // If teacherId is not found from cookie, look up the first available teacher for demonstration
    if (!teacherId) {
      const teachersSnap = await adminDb.collection("teachers").limit(1).get();
      if (!teachersSnap.empty) {
        teacherId = teachersSnap.docs[0]!.id;
        teacherName = (teachersSnap.docs[0]!.data()?.name as string) || "المدرس";
      }
    }

    if (!teacherId) {
      return {
        success: false,
        error: "لم يتم العثور على حساب المدرس",
      };
    }

    const teacherRef = adminDb.collection("teachers").doc(teacherId);

    // Fetch teacher profile name if available
    const teacherDoc = await teacherRef.get();
    if (teacherDoc.exists) {
      teacherName = (teacherDoc.data()?.name as string) || teacherName;
    }

    // 2. Calculate current day and date in Egypt Timezone (Africa/Cairo)
    const cairoDate = getCairoCurrentDate();

    return await withCache(
      `dashboard:${teacherId}:${cairoDate.formattedDate}`,
      [`dashboard:${teacherId}`],
      30,
      async () => {
        // 3. Fast Aggregation Queries for top statistics cards
        const [studentsSnap, groupsSnap] = await Promise.all([
          teacherRef.collection("students").where("deletedAt", "==", null).count().get(),
          teacherRef.collection("groups").where("status", "==", "active").count().get(),
        ]);

        const totalStudents = studentsSnap.data().count;
        const totalGroups = groupsSnap.data().count;

        // Today's attendance calculation (sum of presentCount in sessions for today's date)
        let todayAttendance = 0;
        try {
          const sessionsSnap = await teacherRef
            .collection("attendanceSessions")
            .where("date", "==", cairoDate.formattedDate)
            .get();

          sessionsSnap.docs.forEach((doc) => {
            const data = doc.data();
            todayAttendance += (data.presentCount as number) || 0;
          });
        } catch {
          todayAttendance = 0;
        }

        // Due / unpaid payments calculation
        let duePaymentsAmount = 0;
        let duePaymentsCount = 0;
        try {
          const paymentsSnap = await teacherRef
            .collection("payments")
            .where("status", "in", ["unpaid", "partial"])
            .get();

          duePaymentsCount = paymentsSnap.size;
          paymentsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const required = (data.required as number) || 0;
            const paid = (data.paid as number) || 0;
            duePaymentsAmount += Math.max(0, required - paid);
          });
        } catch {
          // ignore
        }

        // 4. Fetch Classes map for quick name lookup
        const classesSnap = await teacherRef.collection("classes").get();
        const classNamesMap = new Map<string, string>();
        classesSnap.docs.forEach((doc) => {
          classNamesMap.set(doc.id, (doc.data().name as string) || "صف دراسي");
        });

        // 5. Fetch Today's Groups (matching schedule.day in Egypt timezone)
        const activeGroupsSnap = await teacherRef
          .collection("groups")
          .where("status", "==", "active")
          .get();

        const todaySessions: TodaySessionItem[] = [];

        await Promise.all(
          activeGroupsSnap.docs.map(async (doc) => {
            const data = doc.data();
            const schedule = (data.schedule as GroupSchedule[]) || [];

            // Check if group has a slot matching today in Cairo
            const matchingSlot = schedule.find(
              (slot) => slot.day.toLowerCase() === cairoDate.dayOfWeek
            );

            if (matchingSlot) {
              // Count active students in this specific group
              let groupStudentsCount = 0;
              try {
                const countSnap = await teacherRef
                  .collection("students")
                  .where("groupId", "==", doc.id)
                  .where("status", "==", "active")
                  .where("deletedAt", "==", null)
                  .count()
                  .get();
                groupStudentsCount = countSnap.data().count;
              } catch {
                // ignore
              }

              const className = classNamesMap.get(data.classId as string) || "غير محدد";

              const formattedStart = formatArabicTime(matchingSlot.startTime);
              const formattedEnd = formatArabicTime(matchingSlot.endTime);
              const formattedTime = `${formattedStart} - ${formattedEnd}`;

              todaySessions.push({
                groupId: doc.id,
                groupName: (data.name as string) || "مجموعة",
                className,
                startTime: matchingSlot.startTime,
                endTime: matchingSlot.endTime,
                formattedTime,
                studentCount: groupStudentsCount,
              });
            }
          })
        );

        // 6. Sort sessions ascending by start time (e.g. 14:00 before 16:30)
        todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

        return {
          success: true,
          data: {
            cairoDate,
            teacherName,
            stats: {
              totalStudents,
              totalGroups,
              todayAttendance,
              duePaymentsAmount,
              duePaymentsCount,
            },
            todaySessions,
          },
        };
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message || "حدث خطأ أثناء جلب بيانات لوحة التحكم",
    };
  }
}
