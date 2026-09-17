import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type { GroupSchedule, DayOfWeek } from "@/types";
import type { DashboardData } from "@/lib/actions/dashboard";

/** Calculate current date/time in Cairo timezone (client-side equivalent) */
function getCairoCurrentDateClient() {
  const now = new Date();

  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  })
    .format(now)
    .toLowerCase() as DayOfWeek;

  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const arabicFormattedDate = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const arabicDayName = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  }).format(now);

  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return { dayOfWeek, formattedDate, arabicDayName, arabicFormattedDate, currentTime };
}

function formatArabicTimeClient(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parts[1];
  const period = hours >= 12 ? "م" : "ص";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
}

export async function getTeacherDashboardDataClient(): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const cairoDate = getCairoCurrentDateClient();

    // Fetch teacher name
    const teacherDoc = await getDoc(teacherRef);
    const teacherName = teacherDoc.exists()
      ? (teacherDoc.data()?.name as string) || "المدرس"
      : "المدرس";

    // Parallel aggregation queries
    const [studentsCountSnap, groupsCountSnap, classesSnap, activeGroupsSnap] = await Promise.all([
      getCountFromServer(query(collection(teacherRef, "students"), where("deletedAt", "==", null))),
      getCountFromServer(query(collection(teacherRef, "groups"), where("status", "==", "active"))),
      getDocs(collection(teacherRef, "classes")),
      getDocs(query(collection(teacherRef, "groups"), where("status", "==", "active"))),
    ]);

    const totalStudents = studentsCountSnap.data().count;
    const totalGroups = groupsCountSnap.data().count;

    // Class names map
    const classNamesMap = new Map<string, string>();
    classesSnap.docs.forEach((d) => {
      classNamesMap.set(d.id, (d.data().name as string) || "صف دراسي");
    });

    // Today's attendance
    let todayAttendance = 0;
    try {
      const sessionsSnap = await getDocs(
        query(
          collection(teacherRef, "attendanceSessions"),
          where("date", "==", cairoDate.formattedDate)
        )
      );
      sessionsSnap.forEach((d) => {
        todayAttendance += (d.data().presentCount as number) || 0;
      });
    } catch {
      // ignore
    }

    // Due payments
    let duePaymentsAmount = 0;
    let duePaymentsCount = 0;
    try {
      const paymentsSnap = await getDocs(
        query(collection(teacherRef, "payments"), where("status", "in", ["unpaid", "partial"]))
      );
      duePaymentsCount = paymentsSnap.size;
      paymentsSnap.forEach((d) => {
        const data = d.data();
        const required = (data.required as number) || 0;
        const paid = (data.paid as number) || 0;
        duePaymentsAmount += Math.max(0, required - paid);
      });
    } catch {
      // ignore
    }

    // Today's sessions
    const todaySessions: DashboardData["todaySessions"] = [];

    // Get student counts per group in parallel
    const groupStudentCountPromises = activeGroupsSnap.docs.map(async (gDoc) => {
      const gData = gDoc.data();
      const schedule = (gData.schedule as GroupSchedule[]) || [];
      const matchingSlot = schedule.find((slot) => slot.day.toLowerCase() === cairoDate.dayOfWeek);

      if (!matchingSlot) return null;

      let groupStudentsCount = 0;
      try {
        const countSnap = await getCountFromServer(
          query(
            collection(teacherRef, "students"),
            where("groupId", "==", gDoc.id),
            where("status", "==", "active"),
            where("deletedAt", "==", null)
          )
        );
        groupStudentsCount = countSnap.data().count;
      } catch {
        // ignore
      }

      const className = classNamesMap.get(gData.classId as string) || "غير محدد";
      const formattedStart = formatArabicTimeClient(matchingSlot.startTime);
      const formattedEnd = formatArabicTimeClient(matchingSlot.endTime);

      return {
        groupId: gDoc.id,
        groupName: (gData.name as string) || "مجموعة",
        className,
        startTime: matchingSlot.startTime,
        endTime: matchingSlot.endTime,
        formattedTime: `${formattedStart} - ${formattedEnd}`,
        studentCount: groupStudentsCount,
      };
    });

    const sessionResults = await Promise.all(groupStudentCountPromises);
    sessionResults.forEach((r) => {
      if (r) todaySessions.push(r);
    });
    todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Weekly attendance (last 7 days)
    const last7Days: { dateStr: string; dayName: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);
      const year = parts.find((p) => p.type === "year")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const day = parts.find((p) => p.type === "day")?.value || "";
      const dateStr = `${year}-${month}-${day}`;
      const dayName = new Intl.DateTimeFormat("ar-EG", {
        timeZone: "Africa/Cairo",
        weekday: "short",
      }).format(d);
      last7Days.push({ dateStr, dayName, isToday: i === 0 });
    }

    const attendanceByDate: Record<string, number> = {};
    try {
      const dateStrings = last7Days.map((d) => d.dateStr);
      const weeklySnap = await getDocs(
        query(collection(teacherRef, "attendanceSessions"), where("date", "in", dateStrings))
      );
      weeklySnap.forEach((d) => {
        const data = d.data();
        const dStr = (data.date as string) || "";
        const count = (data.presentCount as number) || 0;
        attendanceByDate[dStr] = (attendanceByDate[dStr] || 0) + count;
      });
    } catch {
      // ignore
    }

    const weeklyAttendance = last7Days.map((d) => ({
      day: d.dayName,
      date: d.dateStr,
      presentCount: attendanceByDate[d.dateStr] || (d.isToday ? todayAttendance : 0),
      isToday: d.isToday,
    }));

    // Class distribution
    const CLASS_COLORS = ["#0EA5E9", "#10B981", "#F97316", "#EAB308"];
    const classDistribution: DashboardData["classDistribution"] = [];

    if (classesSnap.docs.length > 0) {
      const counts = await Promise.all(
        classesSnap.docs.map(async (cDoc, index) => {
          let count = 0;
          try {
            const snap = await getCountFromServer(
              query(
                collection(teacherRef, "students"),
                where("classId", "==", cDoc.id),
                where("status", "==", "active"),
                where("deletedAt", "==", null)
              )
            );
            count = snap.data().count;
          } catch {
            count = 0;
          }
          return {
            classId: cDoc.id,
            className: (cDoc.data().name as string) || "صف دراسي",
            studentCount: count,
            color: CLASS_COLORS[index % CLASS_COLORS.length]!,
          };
        })
      );

      const totalClassStudents =
        counts.reduce((acc, c) => acc + c.studentCount, 0) || totalStudents || 1;
      classDistribution.push(
        ...counts.map((c) => ({
          ...c,
          percentage: Math.round((c.studentCount / totalClassStudents) * 100),
        }))
      );
    }

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
        weeklyAttendance,
        classDistribution,
      },
    };
  } catch (error) {
    console.error("DASHBOARD_CLIENT_ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات لوحة التحكم",
    };
  }
}
