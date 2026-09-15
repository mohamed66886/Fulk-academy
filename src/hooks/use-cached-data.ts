"use client";

/**
 * Client-side React Query hooks for all data-fetching pages.
 * Wraps Server Actions with useQuery for instant navigation caching,
 * background refetching, and optimistic UI updates.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import { getStudents, type StudentsQueryParams } from "@/lib/actions/students";
import { getClasses } from "@/lib/actions/classes";
import { getGroups, getClassesForSelect } from "@/lib/actions/groups";
import { getExams, getClassesAndGroupsForExams, type GetExamsFilters } from "@/lib/actions/exams";
import { getMonthPayments, type GetMonthPaymentsFilters } from "@/lib/actions/payments";
import { getAttendanceHistory, type AttendanceHistoryFilters } from "@/lib/actions/attendance";
import { getTeacherDashboardData } from "@/lib/actions/dashboard";

// ─── Query Key Factories ──────────────────────────────────────
export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  students: (params?: StudentsQueryParams) => ["students", params ?? {}] as const,
  classes: () => ["classes"] as const,
  classesForSelect: () => ["classesForSelect"] as const,
  groups: (classIdFilter?: string) => ["groups", classIdFilter ?? "all"] as const,
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
    queryFn: () => getTeacherDashboardData(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ─── Students ─────────────────────────────────────────────────
export function useStudents(params?: StudentsQueryParams) {
  return useQuery({
    queryKey: queryKeys.students(params),
    queryFn: () => getStudents(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Classes ──────────────────────────────────────────────────
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes(),
    queryFn: () => getClasses(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useClassesForSelect() {
  return useQuery({
    queryKey: queryKeys.classesForSelect(),
    queryFn: () => getClassesForSelect(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ─── Groups ───────────────────────────────────────────────────
export function useGroups(classIdFilter?: string) {
  return useQuery({
    queryKey: queryKeys.groups(classIdFilter),
    queryFn: () => getGroups(classIdFilter),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ─── Exams ────────────────────────────────────────────────────
export function useExams(params?: GetExamsFilters) {
  return useQuery({
    queryKey: queryKeys.exams(params),
    queryFn: () => getExams(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useClassesAndGroupsForExams() {
  return useQuery({
    queryKey: queryKeys.classesAndGroupsForExams(),
    queryFn: () => getClassesAndGroupsForExams(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ─── Payments ─────────────────────────────────────────────────
export function usePayments(params?: GetMonthPaymentsFilters) {
  return useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: () => getMonthPayments(params ?? { month: new Date().toISOString().slice(0, 7) }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Attendance History ───────────────────────────────────────
export function useAttendanceHistory(params?: AttendanceHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.attendanceHistory(params),
    queryFn: () => getAttendanceHistory(params),
    staleTime: 5 * 60 * 1000,
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
