import { apiClient } from "@/lib/api/client";
import type { Activity, ChartPoint, CriticalResult, DashboardStats, PendingWork, ProfitLossReport, MonthlySalesReport, TestWiseReport } from "@/types/domain";

export const dashboardApi = {
  getStats: (franchiseId?: string) =>
    apiClient.get<DashboardStats>("/dashboard/stats", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getTestVolume: (franchiseId?: string) =>
    apiClient.get<readonly ChartPoint[]>("/dashboard/test-volume", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getDepartmentDistribution: (franchiseId?: string) =>
    apiClient.get<readonly ChartPoint[]>("/dashboard/department-distribution", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getSampleStatistics: (franchiseId?: string) =>
    apiClient.get<readonly ChartPoint[]>("/dashboard/sample-statistics", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getRevenue: (franchiseId?: string) =>
    apiClient.get<readonly ChartPoint[]>("/dashboard/revenue", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getTurnaround: (franchiseId?: string) =>
    apiClient.get<readonly ChartPoint[]>("/dashboard/turnaround", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getRecentActivity: (franchiseId?: string) =>
    apiClient.get<readonly Activity[]>("/dashboard/recent-activity", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getPendingWork: (franchiseId?: string) =>
    apiClient.get<readonly PendingWork[]>("/dashboard/pending-work", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getCriticalResults: (franchiseId?: string) =>
    apiClient.get<readonly CriticalResult[]>("/dashboard/critical-results", {
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getProfitLoss: (year?: number, franchiseId?: string) =>
    apiClient.get<ProfitLossReport>("/dashboard/profit-loss", {
      year,
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getSalesReport: (startDate?: string, endDate?: string, franchiseId?: string) =>
    apiClient.get<MonthlySalesReport>("/dashboard/sales-report", {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
  getTestWiseReport: (testCode: string, startDate?: string, endDate?: string, franchiseId?: string) =>
    apiClient.get<TestWiseReport>("/dashboard/test-wise-report", {
      testCode,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      franchiseId: franchiseId && franchiseId !== "all" ? franchiseId : undefined,
    }),
};

