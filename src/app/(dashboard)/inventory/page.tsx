"use client";
import React, { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Download, Plus, Trash2 } from "lucide-react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { PageHeader, StatusBadge, Button, Input, Select, Field as UIField, Grid4, Card } from "@/components/ui/index";
import { useCreateInventory, useDeleteInventory, useInventory } from "@/features/operations/hooks";
import { useEntityList } from "@/features/crud/hooks";
import { authService } from "@/lib/auth/auth-service";
import type { Franchise } from "@/types/domain";
import { downloadCsv } from "@/lib/utils/report-export";

const inventorySchema = Yup.object({
  medicine: Yup.string().trim().required("Item / consumable name is required (. Vacutainer EDTA Tubes 3ml)").min(2, "Name must be at least 2 characters"),
  stockQuantity: Yup.number().typeError("Quantity must be a valid number").required("Stock quantity is required").min(0, "Quantity cannot be negative"),
  purchasePrice: Yup.number().typeError("Purchase price must be a valid number").required("Purchase price is required").min(0, "Price cannot be negative"),
  salePrice: Yup.number().typeError("Sale price must be a valid number").required("Sale price is required").min(0, "Price cannot be negative"),
  stockHolder: Yup.string().required("Please select a storage location / holder"),
  batchNumber: Yup.string().trim().required("Batch number is required (. LOT-2026-08)").min(2, "Batch number must be at least 2 characters"),
  expiryDate: Yup.string().required("Expiry date is required"),
  reorderLevel: Yup.number().typeError("Reorder level must be a valid number").required("Reorder alert level is required").min(0, "Reorder level cannot be negative"),
});

const initialStockValues = {
  medicine: "",
  stockQuantity: "",
  purchasePrice: "",
  salePrice: "",
  stockHolder: "",
  batchNumber: "",
  expiryDate: "",
  reorderLevel: "",
};

export default function InventoryPage() {
  const inventory = useInventory();
  const create = useCreateInventory();
  const remove = useDeleteInventory();

  const [currentRole, setCurrentRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const s = authService.getSession();
    if (s?.role) setCurrentRole(s.role);
  }, []);

  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";
  const isFranchise = currentRole === "Franchise";
  const canViewCreatedBy = isAdmin || isFranchise;

  const franchiseList = useEntityList<Franchise>("franchises");
  const franchises = franchiseList.data ?? [];

  const dynamicStorageOptions = useMemo(() => {
    const defaultOptions = [
      { label: "Select storage location", value: "" },
      { label: "Central Store - Main Inventory (HQ)", value: "Central Store" },
      { label: "Hematology Lab - Reagent Storage", value: "Hematology Lab" },
      { label: "Biochemistry Lab - Reagent Storage", value: "Biochemistry Lab" },
      { label: "Microbiology Lab", value: "Microbiology Lab" },
      { label: "Emergency / Phlebotomy Stock", value: "Emergency Stock" },
    ];

    const franchiseOptions = franchises.map((f) => ({
      label: `Franchise Hub - ${f.name} (${f.code} · ${f.city})`,
      value: `Franchise: ${f.name} (${f.code})`,
    }));

    return [...defaultOptions, ...franchiseOptions];
  }, [franchises]);

  const lowStockCount = (inventory.data ?? []).filter((item) => item.stockQuantity <= item.reorderLevel).length;

  const handleExport = () => {
    const items = inventory.data ?? [];
    downloadCsv(`stock-list-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Item Name", "In Stock", "Reorder Level", "Purchase Price", "Sale Price", "Storage Location / Hub", "Batch", "Expiry Date", ...(canViewCreatedBy ? ["Created By"] : []), "Status"],
      ...items.map((item) => [
        item.medicine,
        item.stockQuantity,
        item.reorderLevel,
        item.purchasePrice,
        item.salePrice,
        item.stockHolder,
        item.batchNumber,
        item.expiryDate,
        ...(canViewCreatedBy ? [item.createdBy || "System"] : []),
        item.stockQuantity <= item.reorderLevel ? "Low Stock" : "In Stock",
      ]),
    ]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Laboratory Inventory" 
        description="Monitor consumables, reagents, vacutainers, and stock across headquarters and franchise hubs." 
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" leftIcon={<Download size={16} />} onClick={handleExport} disabled={!inventory.data?.length}>
              Export Excel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => document.getElementById("new-stock")?.scrollIntoView({ behavior: "smooth" })}
            >
              Add Stock Item
            </Button>
          </div>
        }
      />

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border-l-4 border-[color:var(--warning)] bg-[color:var(--warning-bg)] p-4 text-sm text-[color:var(--warning)]">
          <AlertTriangle size={20} className="shrink-0" />
          <div>
            <p className="font-semibold">Low Stock Alert ({lowStockCount} items)</p>
            <p className="mt-0.5 text-xs opacity-90">Some consumables have reached or fallen below their reorder threshold. Replenishment is recommended.</p>
          </div>
        </div>
      )}

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-[color:var(--line)] text-xs uppercase text-[color:var(--muted)]">
              <tr>
                <th className="pb-3 font-semibold">Item Name</th>
                <th className="pb-3 font-semibold text-center">In Stock</th>
                <th className="pb-3 font-semibold text-right">Purchase Price</th>
                <th className="pb-3 font-semibold text-right">Sale Price</th>
                <th className="pb-3 font-semibold">Storage Location / Hub</th>
                <th className="pb-3 font-semibold">Batch</th>
                <th className="pb-3 font-semibold">Expiry Date</th>
                {canViewCreatedBy && <th className="pb-3 font-semibold">Created By</th>}
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {(inventory.data ?? []).map((item) => {
                const isLow = item.stockQuantity <= item.reorderLevel;
                return (
                  <tr className="border-b border-[color:var(--line)] last:border-b-0 hover:bg-[color:var(--surface-2)]" key={item.id}>
                    <td className="py-3.5 font-semibold text-[color:var(--foreground)]">{item.medicine}</td>
                    <td className="py-3.5 text-center font-bold">{item.stockQuantity}</td>
                    <td className="py-3.5 text-right font-mono">₹{item.purchasePrice}</td>
                    <td className="py-3.5 text-right font-mono">₹{item.salePrice}</td>
                    <td className="py-3.5 text-xs font-medium text-[color:var(--foreground)]">{item.stockHolder}</td>
                    <td className="py-3.5 text-xs font-mono">{item.batchNumber}</td>
                    <td className="py-3.5 text-xs font-mono">{item.expiryDate}</td>
                    {canViewCreatedBy && (
                      <td className="py-3.5">
                        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.createdBy || "System"}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5">
                      <StatusBadge tone={isLow ? "warning" : "success"} size="sm">
                        {isLow ? "Low Stock" : "In Stock"}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 text-center">
                      <button 
                        onClick={() => remove.mutate(item.id)} 
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--danger)] hover:underline"
                        title="Delete item"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!inventory.data || inventory.data.length === 0) && !inventory.isLoading && (
                <tr>
                  <td colSpan={canViewCreatedBy ? 10 : 9} className="py-8 text-center text-xs text-[color:var(--muted)]">
                    No inventory items found. Add your first reagent or consumable below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <section id="new-stock" className="pt-4">
        <Card>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[color:var(--foreground)]">Add New Stock / Reagent Item</h3>
            <p className="mt-1 text-xs text-[color:var(--muted)]">Enter reagent, consumable, or medical inventory specifications below. Storage location includes all registered franchise hubs.</p>
          </div>
          <Formik 
            initialValues={initialStockValues} 
            validationSchema={inventorySchema}
            validateOnMount={false}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={async (values, helpers) => {
              const payload = {
                medicine: values.medicine,
                stockQuantity: Number(values.stockQuantity) || 0,
                purchasePrice: Number(values.purchasePrice) || 0,
                salePrice: Number(values.salePrice) || 0,
                stockHolder: values.stockHolder,
                batchNumber: values.batchNumber,
                expiryDate: values.expiryDate,
                reorderLevel: Number(values.reorderLevel) || 10,
              };
              await create.mutateAsync(payload);
              helpers.resetForm();
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-5">
                <Grid4>
                  <UIField label="Item / Consumable Name" name="medicine" required error={touched.medicine ? errors.medicine : undefined} className="sm:col-span-2">
                    <Field name="medicine" as={Input} placeholder="Vacutainer K3 EDTA 3ml Tubes (Pack of 100)" />
                  </UIField>
                  <UIField label="Storage Location / Franchise Hub" name="stockHolder" required error={touched.stockHolder ? errors.stockHolder : undefined} className="sm:col-span-2">
                    <Field name="stockHolder" as={Select}>
                      {dynamicStorageOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                          {opt.label}
                        </option>
                      ))}
                    </Field>
                  </UIField>
                  <UIField label="Initial Quantity (Units)" name="stockQuantity" required error={touched.stockQuantity ? errors.stockQuantity : undefined}>
                    <Field name="stockQuantity" type="number" as={Input} placeholder="200" />
                  </UIField>
                  <UIField label="Purchase Price per Unit (₹)" name="purchasePrice" required error={touched.purchasePrice ? errors.purchasePrice : undefined}>
                    <Field name="purchasePrice" type="number" step="any" as={Input} placeholder="15.50" />
                  </UIField>
                  <UIField label="Sale / Billing Price (₹)" name="salePrice" required error={touched.salePrice ? errors.salePrice : undefined}>
                    <Field name="salePrice" type="number" step="any" as={Input} placeholder="25.00" />
                  </UIField>
                  <UIField label="Reorder Threshold Level" name="reorderLevel" required hint="Alert triggered when stock falls to this amount" error={touched.reorderLevel ? errors.reorderLevel : undefined}>
                    <Field name="reorderLevel" type="number" as={Input} placeholder="25" />
                  </UIField>
                  <UIField label="Batch / Lot Number" name="batchNumber" required error={touched.batchNumber ? errors.batchNumber : undefined} className="sm:col-span-2">
                    <Field name="batchNumber" as={Input} placeholder="BATCH-2026-08-01" />
                  </UIField>
                  <UIField label="Expiry Date" name="expiryDate" required error={touched.expiryDate ? errors.expiryDate : undefined} className="sm:col-span-2">
                    <Field name="expiryDate" type="date" as={Input} />
                  </UIField>
                </Grid4>
                <div className="flex justify-end pt-3 border-t border-[color:var(--line)]">
                  <Button type="submit" variant="primary" loading={isSubmitting || create.isPending}>
                    Save Stock Item
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card>
      </section>
    </div>
  );
}
