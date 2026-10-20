"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/query-keys";
import { doctorApi, franchiseApi, patientApi, pathologistApi, supplierApi, technicianApi, userApi } from "@/mocks/services/resources";
import type { Doctor, Franchise, Patient, Supplier, User } from "@/types/domain";

type Entity = Patient | Doctor | Franchise | Supplier | User;
export type Kind = "patients" | "doctors" | "franchises" | "pathologists" | "technicians" | "suppliers" | "users";

const api = {
  patients: patientApi,
  doctors: doctorApi,
  franchises: franchiseApi,
  pathologists: pathologistApi,
  technicians: technicianApi,
  suppliers: supplierApi,
  users: userApi,
} as const;

const keys = {
  patients: queryKeys.patients.all,
  doctors: queryKeys.doctors.all,
  franchises: queryKeys.franchises.all,
  pathologists: queryKeys.pathologists.all,
  technicians: queryKeys.technicians.all,
  suppliers: queryKeys.suppliers.all,
  users: queryKeys.users.all,
} as const;

const serviceFor = <T extends Entity>(kind: Kind) =>
  api[kind] as unknown as {
    list: (params?: Record<string, any>) => Promise<ApiResponse<T[]>>;
    getById: (id: string) => Promise<ApiResponse<T | null>>;
    create: (input: Omit<T, "id">) => Promise<ApiResponse<T>>;
    update: (id: string, input: Partial<Omit<T, "id">>) => Promise<ApiResponse<T>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
  };

export function useEntityList<T extends Entity>(kind: Kind) {
  const service = serviceFor<T>(kind);
  return useQuery<ApiResponse<T[]>, Error, T[]>({
    queryKey: keys[kind],
    queryFn: service.list,
    select: (result) => result.data,
  });
}

export function useEntity<T extends Entity>(kind: Kind, id: string) {
  const service = serviceFor<T>(kind);
  return useQuery<ApiResponse<T | null>, Error, T | null>({
    queryKey: [...keys[kind], id],
    queryFn: () => service.getById(id),
    select: (result) => result.data,
    enabled: Boolean(id && id !== "new"),
  });
}

export function useEntityMutations<T extends Entity>(kind: Kind) {
  const client = useQueryClient();
  const service = serviceFor<T>(kind);
  const invalidate = () => {
    client.invalidateQueries({ queryKey: keys[kind] });
    if (kind === "franchises") {
      client.invalidateQueries({ queryKey: keys.users });
      client.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    }
    if (kind === "pathologists" || kind === "technicians" || kind === "doctors") {
      client.invalidateQueries({ queryKey: keys.users });
    }
  };
  return {
    create: useMutation({ mutationFn: service.create, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<Omit<T, "id">> }) => service.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: service.delete, onSuccess: invalidate }),
  };
}

export const usePatients = () => useEntityList<Patient>("patients");
export const useDoctors = () => useEntityList<Doctor>("doctors");
export const useFranchises = () => useEntityList<Franchise>("franchises");
export const usePathologists = () => useEntityList<User>("pathologists");
export const useTechnicians = () => useEntityList<User>("technicians");
export const useSuppliers = () => useEntityList<Supplier>("suppliers");
export const useUsers = () => useEntityList<User>("users");

export function useDoctorLedger(id: string, startDate?: string, endDate?: string) {
  return useQuery<ApiResponse<import("@/types/domain").DoctorLedgerReport>, Error, import("@/types/domain").DoctorLedgerReport>({
    queryKey: queryKeys.doctors.ledger(id, startDate, endDate),
    queryFn: () => doctorApi.getLedger(id, startDate, endDate),
    select: (result) => result.data,
    enabled: Boolean(id && id !== "new"),
  });
}

export function useCreateDoctorPayment(doctorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: import("@/types/domain").DoctorPaymentInput) => doctorApi.addPayment(doctorId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.doctors.all }),
  });
}

export function useDeleteDoctorPayment(doctorId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => doctorApi.deletePayment(doctorId, paymentId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.doctors.all }),
  });
}
