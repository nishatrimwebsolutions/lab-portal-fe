"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentApi, billingApi, inventoryApi } from "@/mocks/services/operations";
import type { Appointment, InventoryItem, Invoice } from "@/types/domain";

export const useAppointments = () => useQuery({ queryKey: ["appointments"], queryFn: appointmentApi.list, select: (r) => r.data });
export const useAppointment = (id: string) => useQuery({ queryKey: ["appointments", id], queryFn: () => appointmentApi.getById(id), select: (r) => r.data, enabled: Boolean(id && id !== "new") });

export const useInvoices = () => useQuery({ queryKey: ["billing"], queryFn: billingApi.list, select: (r) => r.data });
export const useInvoice = (id: string) => useQuery({ queryKey: ["billing", id], queryFn: () => billingApi.getById(id), select: (r) => r.data, enabled: Boolean(id && id !== "new") });

export const useInventory = () => useQuery({ queryKey: ["inventory"], queryFn: inventoryApi.list, select: (r) => r.data });

const mutation = <T,>(key: string, fn: (input: T) => Promise<unknown>) => {
  const c = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => c.invalidateQueries({ queryKey: [key] }) });
};

export const useCreateAppointment = () => mutation<Omit<Appointment, "id">>("appointments", appointmentApi.create);
export const useUpdateAppointment = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Appointment> }) => appointmentApi.update(id, input),
    onSuccess: () => c.invalidateQueries({ queryKey: ["appointments"] }),
  });
};
export const useDeleteAppointment = () => mutation<string>("appointments", appointmentApi.delete);

// Bills feed the doctor ledger and test-wise report, so refresh those caches too.
const useInvoiceMutation = <T,>(fn: (input: T) => Promise<unknown>) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      c.invalidateQueries({ queryKey: ["billing"] });
      c.invalidateQueries({ queryKey: ["doctors"] });
      c.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};
export const useCreateInvoice = () => useInvoiceMutation<Omit<Invoice, "id">>(billingApi.create);
export const useUpdateInvoice = () =>
  useInvoiceMutation(({ id, input }: { id: string; input: Partial<Invoice> }) => billingApi.update(id, input));
export const useDeleteInvoice = () => useInvoiceMutation<string>(billingApi.delete);

export const useCreateInventory = () => mutation<Omit<InventoryItem, "id">>("inventory", inventoryApi.create);
export const useUpdateInventory = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<InventoryItem> }) => inventoryApi.update(id, input),
    onSuccess: () => c.invalidateQueries({ queryKey: ["inventory"] }),
  });
};
export const useDeleteInventory = () => mutation<string>("inventory", inventoryApi.delete);
