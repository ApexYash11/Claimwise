"use client"

import { useQuery } from "@tanstack/react-query"
import { getSupabase } from "@/lib/get-supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"

async function getAuthHeaders() {
  const supabase = await getSupabase()
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    if (i < 5) await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error("Not authenticated")
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(createApiUrlWithLogging("/policies"), {
        headers, timeoutMs: 12000,
      })
      if (!res.ok) throw new Error("Failed to fetch policies")
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(createApiUrlWithLogging("/dashboard/stats"), {
        headers, timeoutMs: 12000,
      })
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(createApiUrlWithLogging("/dashboard/metrics"), {
        headers, timeoutMs: 12000,
      })
      if (!res.ok) throw new Error("Failed to fetch metrics")
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(createApiUrlWithLogging("/activities"), {
        headers, timeoutMs: 12000,
      })
      if (!res.ok) throw new Error("Failed to fetch activities")
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useHistory(page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["history", page, pageSize],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const res = await fetchWithTimeout(
        createApiUrlWithLogging(`/history?page=${page}&page_size=${pageSize}`),
        { headers, timeoutMs: 12000 },
      )
      if (!res.ok) throw new Error("Failed to fetch history")
      return res.json()
    },
    staleTime: 30_000,
  })
}
