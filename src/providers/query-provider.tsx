"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Base staleTime — individual hooks override this per data type
        staleTime: 5 * 60 * 1000, // 5 minutes default
        // Keep inactive cache in memory for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Disable aggressive window focus refetching
        refetchOnWindowFocus: false,
        // Refresh stale data when network reconnects
        refetchOnReconnect: true,
        // Retry failed queries once
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
