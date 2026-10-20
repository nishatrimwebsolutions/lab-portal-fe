"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/mocks/services/dashboard";
import { queryKeys } from "@/lib/query/query-keys";
import type { ApiResponse } from "@/lib/api/client";
import type { Activity, ChartPoint, CriticalResult, DashboardStats, PendingWork, ProfitLossReport, MonthlySalesReport, TestWiseReport } from "@/types/domain";
export const useDashboardStats = (franchiseId?: string) =>
  useQuery<ApiResponse<DashboardStats>, Error, DashboardStats>({
    queryKey: queryKeys.dashboard.stats(franchiseId),
    queryFn: () => dashboardApi.getStats(franchiseId),
    select: (response) => response.data,
  });

export const useTestVolume = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly ChartPoint[]>, Error, readonly ChartPoint[]>({
    queryKey: queryKeys.dashboard.testVolume(franchiseId),
    queryFn: () => dashboardApi.getTestVolume(franchiseId),
    select: (response) => response.data,
  });

export const useDepartmentDistribution = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly ChartPoint[]>, Error, readonly ChartPoint[]>({
    queryKey: queryKeys.dashboard.departments(franchiseId),
    queryFn: () => dashboardApi.getDepartmentDistribution(franchiseId),
    select: (response) => response.data,
  });

export const useSampleStatistics = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly ChartPoint[]>, Error, readonly ChartPoint[]>({
    queryKey: queryKeys.dashboard.sampleStatistics(franchiseId),
    queryFn: () => dashboardApi.getSampleStatistics(franchiseId),
    select: (response) => response.data,
  });

export const useRevenue = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly ChartPoint[]>, Error, readonly ChartPoint[]>({
    queryKey: queryKeys.dashboard.revenue(franchiseId),
    queryFn: () => dashboardApi.getRevenue(franchiseId),
    select: (response) => response.data,
  });

export const useTurnaround = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly ChartPoint[]>, Error, readonly ChartPoint[]>({
    queryKey: queryKeys.dashboard.turnaround(franchiseId),
    queryFn: () => dashboardApi.getTurnaround(franchiseId),
    select: (response) => response.data,
  });

export const useRecentActivity = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly Activity[]>, Error, readonly Activity[]>({
    queryKey: queryKeys.dashboard.activity(franchiseId),
    queryFn: () => dashboardApi.getRecentActivity(franchiseId),
    select: (response) => response.data,
  });

export const usePendingWork = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly PendingWork[]>, Error, readonly PendingWork[]>({
    queryKey: queryKeys.dashboard.pendingWork(franchiseId),
    queryFn: () => dashboardApi.getPendingWork(franchiseId),
    select: (response) => response.data,
  });

export const useCriticalResults = (franchiseId?: string) =>
  useQuery<ApiResponse<readonly CriticalResult[]>, Error, readonly CriticalResult[]>({
    queryKey: queryKeys.dashboard.criticalResults(franchiseId),
    queryFn: () => dashboardApi.getCriticalResults(franchiseId),
    select: (response) => response.data,
  });

export const useProfitLoss = (year?: number, franchiseId?: string) =>
  useQuery<ApiResponse<ProfitLossReport>, Error, ProfitLossReport>({
    queryKey: queryKeys.dashboard.profitLoss(year, franchiseId),
    queryFn: () => dashboardApi.getProfitLoss(year, franchiseId),
    select: (response) => response.data,
  });

export const useSalesReport = (startDate?: string, endDate?: string, franchiseId?: string) =>
  useQuery<ApiResponse<MonthlySalesReport>, Error, MonthlySalesReport>({
    queryKey: queryKeys.dashboard.salesReport(startDate, endDate, franchiseId),
    queryFn: () => dashboardApi.getSalesReport(startDate, endDate, franchiseId),
    select: (response) => response.data,
  });

export const useTestWiseReport = (testCode: string, startDate?: string, endDate?: string, franchiseId?: string) =>
  useQuery<ApiResponse<TestWiseReport>, Error, TestWiseReport>({
    queryKey: queryKeys.dashboard.testWiseReport(testCode, startDate, endDate, franchiseId),
    queryFn: () => dashboardApi.getTestWiseReport(testCode, startDate, endDate, franchiseId),
    select: (response) => response.data,
    enabled: Boolean(testCode),
  });



