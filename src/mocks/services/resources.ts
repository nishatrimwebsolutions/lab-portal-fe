import { apiClient } from "@/lib/api/client";
import type { Doctor, DoctorLedgerReport, DoctorPaymentInput, Franchise, Patient, Report, ReportTemplate, Result, Sample, Supplier, Test, TestMaster, User } from "@/types/domain";

const apiCrud = <T extends { id: string }>(resource: string) => ({
  list: (params?: Record<string, any>) => apiClient.get<T[]>(`/${resource}`, params),
  getById: (id: string) => apiClient.get<T | null>(`/${resource}/${id}`),
  create: (input: Omit<T, "id">) => apiClient.post<T>(`/${resource}`, input),
  update: (id: string, input: Partial<Omit<T, "id">>) => apiClient.put<T>(`/${resource}/${id}`, input),
  delete: (id: string) => apiClient.delete<void>(`/${resource}/${id}`),
});

export const patientApi = apiCrud<Patient>("patients");
export const doctorApi = {
  ...apiCrud<Doctor>("doctors"),
  getLedger: (id: string, startDate?: string, endDate?: string) =>
    apiClient.get<DoctorLedgerReport>(`/doctors/${id}/ledger`, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  addPayment: (id: string, input: DoctorPaymentInput) => apiClient.post<unknown>(`/doctors/${id}/payments`, input),
  deletePayment: (id: string, paymentId: string) => apiClient.delete<void>(`/doctors/${id}/payments/${paymentId}`),
};
export const franchiseApi = apiCrud<Franchise>("franchises");
export const userApi = apiCrud<User>("users");
export const supplierApi = apiCrud<Supplier>("suppliers");
export const sampleApi = apiCrud<Sample>("samples");
export const testApi = apiCrud<Test>("tests");
export const testMasterApi = apiCrud<TestMaster>("test-masters");
export const resultApi = apiCrud<Result>("results");
export const reportApi = apiCrud<Report>("reports");

export const pathologistApi = {
  list: (params?: Record<string, any>) => apiClient.get<User[]>("/users", { role: "Pathologist", ...params }),
  getById: (id: string) => apiClient.get<User | null>(`/users/${id}`),
  create: (input: any) => apiClient.post<User>("/users", { ...input, role: "Pathologist" }),
  update: (id: string, input: any) => apiClient.put<User>(`/users/${id}`, { ...input, role: "Pathologist" }),
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
};

export const technicianApi = {
  list: (params?: Record<string, any>) => apiClient.get<User[]>("/users", { role: "Technician", ...params }),
  getById: (id: string) => apiClient.get<User | null>(`/users/${id}`),
  create: (input: any) => apiClient.post<User>("/users", { ...input, role: "Technician" }),
  update: (id: string, input: any) => apiClient.put<User>(`/users/${id}`, { ...input, role: "Technician" }),
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
};

export const reportTemplateApi = {
  list: () => apiClient.get<ReportTemplate[]>("/reports/templates"),
  getById: (id: string) => apiClient.get<ReportTemplate | null>(`/reports/templates/${id}`),
  create: (input: Omit<ReportTemplate, "id">) => apiClient.post<ReportTemplate>("/reports/templates", input),
  update: (id: string, input: Partial<Omit<ReportTemplate, "id">>) => apiClient.put<ReportTemplate>(`/reports/templates/${id}`, input),
  delete: (id: string) => apiClient.delete<void>(`/reports/templates/${id}`),
};
