"use client";

/**
 * Client-side React Query hooks for all data-fetching pages.
 * All hooks call CLIENT actions (direct Firestore access) for maximum performance.
 * No Server Actions are used for data reading — eliminating the server middleware round-trip.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import { type StudentsQueryParams } from "@/lib/actions/students";
import { getStudentsClient } from "@/lib/client-actions/students";
import {
  getClassesForSelectClient,
  getClassesClient,
  getClassByIdClient,
} from "@/lib/client-actions/classes";
import { getGroupsClient, getGroupByIdClient } from "@/lib/client-actions/groups";
import { getExamsClient, getClassesAndGroupsForExamsClient } from "@/lib/client-actions/exams";
import {
  getMonthPaymentsClient,
  type GetMonthPaymentsFilters,
} from "@/lib/client-actions/payments";
import { getAttendanceHistoryClient } from "@/lib/client-actions/attendance";
import { getTeacherDashboardDataClient } from "@/lib/client-actions/dashboard";
import { getStudentByIdClient } from "@/lib/client-actions/students";
import type { GetExamsFilters } from "@/lib/actions/exams";
import type { AttendanceHistoryFilters } from "@/lib/actions/attendance";

// Re-export the filter type from client-actions for convenience
export type { GetMonthPaymentsFilters } from "@/lib/client-actions/payments";

// ─── Query Key Factories ──────────────────────────────────────
export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  students: (params?: StudentsQueryParams) => ["students", params ?? {}] as const,
  studentDetail: (id: string) => ["student", id] as const,
  classes: () => ["classes"] as const,
  classDetail: (id: string) => ["class", id] as const,
  classesForSelect: () => ["classesForSelect"] as const,
  groups: (classIdFilter?: string) => ["groups", classIdFilter ?? "all"] as const,
  groupDetail: (id: string) => ["group", id] as const,
  classesAndGroupsForExams: () => ["classesAndGroupsForExams"] as const,
  exams: (params?: GetExamsFilters) => ["exams", params ?? {}] as const,
  payments: (params?: GetMonthPaymentsFilters) => ["payments", params ?? {}] as const,
  attendanceHistory: (params?: AttendanceHistoryFilters) =>
    ["attendanceHistory", params ?? {}] as const,
};

// ─── Dashboard ────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => getTeacherDashboardDataClient(),
    staleTime: 1 * 60 * 1000, // 1 minute - dashboard data changes frequently
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Students ─────────────────────────────────────────────────
export function useStudents(params?: StudentsQueryParams) {
  return useQuery({
    queryKey: queryKeys.students(params),
    queryFn: () => getStudentsClient(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Student Detail ───────────────────────────────────────────
export function useStudentDetail(studentId: string) {
  return useQuery({
    queryKey: queryKeys.studentDetail(studentId),
    queryFn: () => getStudentByIdClient(studentId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!studentId,
  });
}

// ─── Classes ──────────────────────────────────────────────────
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes(),
    queryFn: () => getClassesClient(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  });
}

export function useClassDetail(classId: string) {
  return useQuery({
    queryKey: queryKeys.classDetail(classId),
    queryFn: () => getClassByIdClient(classId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!classId,
  });
}

export function useClassesForSelect() {
  return useQuery({
    queryKey: queryKeys.classesForSelect(),
    queryFn: () => getClassesForSelectClient(),
    staleTime: 15 * 60 * 1000, // 15 minutes - classes rarely change
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Groups ───────────────────────────────────────────────────
export function useGroups(classIdFilter?: string) {
  return useQuery({
    queryKey: queryKeys.groups(classIdFilter),
    queryFn: () => getGroupsClient(classIdFilter),
    staleTime: 15 * 60 * 1000, // 15 minutes - groups rarely change
    gcTime: 30 * 60 * 1000,
  });
}

export function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groupDetail(groupId),
    queryFn: () => getGroupByIdClient(groupId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!groupId,
  });
}

// ─── Exams ────────────────────────────────────────────────────
export function useExams(params?: GetExamsFilters) {
  return useQuery({
    queryKey: queryKeys.exams(params),
    queryFn: () => getExamsClient(params),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useClassesAndGroupsForExams() {
  return useQuery({
    queryKey: queryKeys.classesAndGroupsForExams(),
    queryFn: () => getClassesAndGroupsForExamsClient(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Payments ─────────────────────────────────────────────────
export function usePayments(params?: GetMonthPaymentsFilters) {
  return useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: () =>
      getMonthPaymentsClient(params ?? { month: new Date().toISOString().slice(0, 7) }),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Attendance History ───────────────────────────────────────
export function useAttendanceHistory(params?: AttendanceHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.attendanceHistory(params),
    queryFn: () => getAttendanceHistoryClient(params),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutation Invalidation Helper ─────────────────────────────
/**
 * Generic hook that returns a function to invalidate specific query keys
 * after a mutation succeeds.
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (keys: string[]) => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
}

/**
 * Creates a mutation wrapper that automatically invalidates the
 * specified query keys on success.
 */
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  invalidateKeys: string[]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });
}
