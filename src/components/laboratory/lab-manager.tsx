"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Field, Form, Formik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCatchAllPath } from "@/lib/use-catch-all-path";
import * as Yup from "yup";
import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle, Edit3, Eye, Plus, Trash2, Sparkles } from "lucide-react";
import { PageHeader, StatusBadge, Button, Input, Select, Textarea, Field as UIField, Grid2, Card, cn, SearchableCombobox, ComboboxOption } from "@/components/ui/index";
import { DataTable } from "@/components/tables/DataTable";
import { ResultSection, ResultTable } from "@/components/laboratory/result-engine";
import { useCreateSample, useCreateTest, useDeleteSample, useDeleteTest, useResults, useSample, useSamples, useTest, useTests, useUpdateSample, useUpdateTest } from "@/features/laboratory/hooks";
import { useTestMasters } from "@/features/test-masters/hooks";
import { useEntityList } from "@/features/crud/hooks";
import { authService } from "@/lib/auth/auth-service";
import { SubParameterSelect } from "@/components/laboratory/SubParameterSelect";
import { formatPatientAgeLabel } from "@/lib/patient-age";
import type { Franchise, Patient, Sample, Test, TestMaster, UserRole } from "@/types/domain";

type Kind = "samples" | "tests";
type Entity = Sample | Test;

const DETAIL_NA = "N/A";

function isEmptyDetailValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && (!value.trim() || value === "null" || value === "undefined")) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function namedLabel(obj: Record<string, unknown>, extraKeys: string[] = []): string {
  const name = obj.name ?? obj.label ?? obj.title ?? obj.code ?? obj.accession;
  if (name == null || String(name).trim() === "") return "";
  const extras = extraKeys.map((k) => obj[k]).filter((v) => v != null && String(v).trim() !== "").map((v) => String(v));
  return extras.length ? `${name} (${extras.join(" · ")})` : String(name);
}

function formatLabDetailLines(key: string, value: unknown): string[] {
  if (isEmptyDetailValue(value)) return [DETAIL_NA];
  if (typeof value !== "object") return [String(value)];

  const k = key.toLowerCase();
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item == null || item === "") return DETAIL_NA;
      if (typeof item !== "object") return String(item);
      const o = item as Record<string, unknown>;
      return namedLabel(o) || [o.parameter, o.value, o.unit].filter(Boolean).join(" · ") || DETAIL_NA;
    });
  }

  const obj = value as Record<string, unknown>;
  if (k.includes("patient")) return [namedLabel(obj, ["patientCode"]) || DETAIL_NA];
  if (k.includes("franchise")) return [namedLabel(obj, ["code"]) || DETAIL_NA];
  if (k.includes("sample")) return [[obj.accession, obj.sampleType, obj.status].filter(Boolean).join(" · ") || namedLabel(obj) || DETAIL_NA];
  if (k.includes("doctor")) return [namedLabel(obj, ["specialty"]) || DETAIL_NA];
  return [namedLabel(obj) || DETAIL_NA];
}

interface FormFieldDef {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "number" | "datetime";
  placeholder?: string;
  required?: boolean;
  hint?: string;
  colSpan?: 1 | 2;
  options?: readonly { label: string; value: string }[];
}

const sampleFields: readonly FormFieldDef[] = [
  { name: "accession", label: "Accession Number", type: "text", placeholder: "LIS-240822 (auto-generated if empty)" },
  { name: "barcode", label: "Barcode ID", type: "text", placeholder: "BC902188 (auto-generated if empty)" },
  { name: "patientId", label: "Registered Patient", type: "text", placeholder: "Search patient by name, code, phone...", required: true, hint: "Select from registered patients list" },
  {
    name: "sampleType",
    label: "Specimen Type",
    type: "select",
    required: true,
    options: [
      { label: "Select specimen type", value: "" },
      { label: "Whole Blood (EDTA/Heparin)", value: "Blood" },
      { label: "Serum", value: "Serum" },
      { label: "Plasma", value: "Plasma" },
      { label: "Urine (Clean Catch/24h)", value: "Urine" },
      { label: "Cerebrospinal Fluid (CSF)", value: "CSF" },
      { label: "Synovial / Serous Fluid", value: "Fluid" },
      { label: "Stool Sample", value: "Stool" },
      { label: "Other Biopsy / Swab", value: "Other" },
    ],
  },
  { name: "collectedAt", label: "Collection Date & Time", type: "datetime", required: true },
  {
    name: "priority",
    label: "Processing Priority",
    type: "select",
    required: true,
    options: [
      { label: "Select priority", value: "" },
      { label: "Routine (Standard TAT)", value: "Routine" },
      { label: "Urgent (Priority processing)", value: "Urgent" },
      { label: "STAT (Emergency immediate)", value: "STAT" },
    ],
  },
  {
    name: "status",
    label: "Specimen Status",
    type: "select",
    required: true,
    options: [
      { label: "Select status", value: "" },
      { label: "Collected (Phlebotomy complete)", value: "Collected" },
      { label: "Received (In Laboratory)", value: "Received" },
      { label: "Processing (On Analyzer)", value: "Processing" },
      { label: "Completed (Results Ready)", value: "Completed" },
      { label: "Rejected (Hemolyzed/Clotted)", value: "Rejected" },
    ],
  },
  { name: "notes", label: "Phlebotomy / Clinical Notes", type: "textarea", placeholder: "Fasting sample, collected without hemolysis, stored at 2-8°C", colSpan: 2 },
];

const testFields: readonly FormFieldDef[] = [
  { name: "patientId", label: "Registered Patient / Patient Name", type: "text", placeholder: "Search patient by name, code, phone...", required: true, hint: "Select registered patient for this diagnostic test", colSpan: 2 },
  { name: "name", label: "Test Full Name (Master Database)", type: "text", placeholder: "Search by test name (e.g. Calcium, CBC, Bilirubin)...", required: true, hint: "Search test name from database catalog", colSpan: 2 },
  { name: "code", label: "Test Code", type: "text", placeholder: "e.g. HM001, BC001, CBC", required: true, hint: "Auto-populated from test master or search by code" },
  {
    name: "department",
    label: "Laboratory Department",
    type: "select",
    required: true,
    options: [
      { label: "Select department", value: "" },
      { label: "Biochemistry", value: "Biochemistry" },
      { label: "Clinical Pathology", value: "Clinical Pathology" },
      { label: "Cytogenetics", value: "Cytogenetics" },
      { label: "Cytology", value: "Cytology" },
      { label: "Flow Cytometry", value: "Flow Cytometry" },
      { label: "Hematology", value: "Hematology" },
      { label: "Histopathology", value: "Histopathology" },
      { label: "Immunology", value: "Immunology" },
      { label: "Maternal Marker", value: "Maternal Marker" },
      { label: "Microbiology", value: "Microbiology" },
      { label: "Molecular Biology", value: "Molecular Biology" },
      { label: "OPD Package", value: "OPD Package" },
      { label: "Serology", value: "Serology" },
      { label: "Special Tests", value: "Special Tests" },
    ],
  },
  {
    name: "sampleType",
    label: "Required Specimen",
    type: "select",
    required: true,
    options: [
      { label: "Select required specimen", value: "" },
      { label: "Whole Blood (EDTA)", value: "Blood" },
      { label: "Serum", value: "Serum" },
      { label: "Plasma", value: "Plasma" },
      { label: "Random / 24hr Urine", value: "Urine" },
      { label: "Body Fluid / CSF", value: "Fluid" },
      { label: "Stool Specimen", value: "Stool" },
      { label: "Other / Swab / Biopsy", value: "Other" },
    ],
  },
  { name: "price", label: "Test Price / MRP (₹)", type: "number", placeholder: "450", required: true, hint: "Auto-filled from test master MRP/Rate" },
  { name: "turnaroundHours", label: "Standard Turnaround Time (Hours)", type: "number", placeholder: "24", required: true },
  { name: "referenceRange", label: "Default Reference Range", type: "text", placeholder: "e.g. 13.0 - 17.0 g/dL" },
  { name: "unit", label: "Measurement Unit", type: "text", placeholder: "e.g. g/dL, mg/dL, mmol/L" },
  {
    name: "status",
    label: "Catalog Status",
    type: "select",
    required: true,
    options: [
      { label: "Active (Available for order)", value: "Active" },
      { label: "Inactive (Discontinued)", value: "Inactive" },
    ],
  },
];

const sampleSchema = Yup.object({
  patientId: Yup.string().trim().required("Registered patient selection is required"),
  sampleType: Yup.string().required("Please select specimen type").oneOf(["Blood", "Serum", "Plasma", "Urine", "CSF", "Fluid", "Stool", "Other"], "Invalid specimen type"),
  accession: Yup.string().trim(),
  barcode: Yup.string().trim(),
  collectedAt: Yup.string().required("Collection date and time is required"),
  priority: Yup.string().required("Please select priority level").oneOf(["Routine", "Urgent", "STAT"], "Invalid priority"),
  status: Yup.string().required("Please select initial sample status").oneOf(["Collected", "Received", "Processing", "Completed", "Rejected"], "Invalid status"),
  notes: Yup.string().trim(),
});

const testSchema = Yup.object({
  patientId: Yup.string().trim().required("Registered patient selection is required"),
  code: Yup.string().trim().required("Test code is required").min(2, "Test code must be at least 2 characters"),
  name: Yup.string().trim().required("Test full name is required from catalog").min(2, "Name must be at least 2 characters"),
  department: Yup.string().required("Please select a department"),
  sampleType: Yup.string().required("Please select required specimen type"),
  price: Yup.number().typeError("Price must be a valid number").required("Price is required").min(0, "Price cannot be negative"),
  turnaroundHours: Yup.number().typeError("Turnaround time must be a number").required("Turnaround time is required").min(1, "Turnaround time must be at least 1 hour"),
  referenceRange: Yup.string().trim(),
  unit: Yup.string().trim(),
  status: Yup.string().required("Please select catalog status").oneOf(["Active", "Inactive"], "Invalid status"),
});

export function LabManager({ kind, path: pathProp }: Readonly<{ kind: Kind; path?: readonly string[] }>) {
  const routePath = useCatchAllPath();
  const path = pathProp ?? routePath;
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | undefined>(undefined);
  const [currentSession, setCurrentSession] = useState<{ role?: UserRole; franchiseId?: string; id?: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedCatalogTests, setSelectedCatalogTests] = useState<Array<{ name: string; code: string; mrp: number; rate: number; department?: string; sampleType?: string; unit?: string; referenceRange?: string; subParameters?: string[] }>>([
    { name: "", code: "", mrp: 0, rate: 0 }
  ]);

  useEffect(() => {
    const s = authService.getSession();
    if (s) {
      setCurrentSession({ role: s.role, franchiseId: s.franchiseId, id: s.id });
      if (s.role) setCurrentRole(s.role);
    }
  }, []);

  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";
  const isFranchise = currentRole === "Franchise";
  const isTechnician = currentRole === "Technician";
  const canViewCreatedBy = isAdmin || isFranchise;
  const canManage = isAdmin || isFranchise || isTechnician;
  const franchisesList = useEntityList<Franchise>("franchises");
  const patientsList = useEntityList<Patient>("patients");
  const testMastersQuery = useTestMasters("", undefined, 2500);

  const franchiseOptions = useMemo(() => {
    const franchises = (franchisesList.data ?? []) as Franchise[];
    return [
      { label: "Select Franchise...", value: "" },
      ...franchises.map((f) => ({
        label: `${f.name} (${f.code || f.city || "Branch"})`,
        value: f.id,
      })),
      { label: "+ Other / Add New Franchise", value: "__add_franchise__" },
    ];
  }, [franchisesList.data]);

  const getPatientComboboxOptions = (formFranchiseId?: string): ComboboxOption[] => {
    const allPatients = (patientsList.data ?? []) as Patient[];
    let filtered = allPatients;
    if (isAdmin) {
      if (formFranchiseId && formFranchiseId !== "__add_franchise__") {
        filtered = allPatients.filter((p) => p.franchiseId === formFranchiseId);
      } else {
        filtered = [];
      }
    } else if (currentSession?.franchiseId) {
      filtered = allPatients.filter((p) => !p.franchiseId || p.franchiseId === currentSession.franchiseId);
    }

    return filtered.map((p) => ({
      value: p.id,
      label: p.name,
      secondary: `Code: ${p.patientCode || p.id} · Age: ${formatPatientAgeLabel(p.dateOfBirth, p.age)} · ${p.sex || ""}`,
      badge: p.phone,
      extra: p,
    }));
  };

  const testMasterNameOptions = useMemo<ComboboxOption[]>(() => {
    const tests = testMastersQuery.data ?? [];
    return tests.map((t) => ({
      value: t.name,
      label: t.name,
      secondary: `Code: ${t.code} · Rate: ₹${t.rate} · MRP: ₹${t.mrp}`,
      badge: t.department,
      extra: t,
    }));
  }, [testMastersQuery.data]);

  const testMasterCodeOptions = useMemo<ComboboxOption[]>(() => {
    const tests = testMastersQuery.data ?? [];
    return tests.map((t) => ({
      value: t.code,
      label: t.code,
      secondary: t.name,
      badge: `₹${t.mrp || t.rate}`,
      extra: t,
    }));
  }, [testMastersQuery.data]);

  const sampleList = useSamples();
  const testList = useTests();
  const sampleDetail = useSample(kind === "samples" && path[0] && path[0] !== "new" ? path[0] : "");
  const testDetail = useTest(kind === "tests" && path[0] && path[0] !== "new" ? path[0] : "");
  
  const createSample = useCreateSample();
  const updateSample = useUpdateSample();
  const deleteSample = useDeleteSample();

  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const deleteTest = useDeleteTest();

  const results = useResults();
  
  const isSample = kind === "samples";
  const list = isSample ? sampleList : testList;
  const detail = isSample ? sampleDetail : testDetail;
  const isNew = path[0] === "new";
  const id = isNew ? "" : path[0];
  const edit = path[1] === "edit";

  const columns = useMemo(() => {
    const h = createColumnHelper<Entity>();
    return [
      h.accessor(row => ("accession" in row ? row.accession : row.name), {
        id: "id_name",
        header: isSample ? "Sample ID / Barcode" : "Test Name",
        cell: ({ getValue }) => <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>
      }),
      h.accessor(row => {
        if ("patient" in row && (row as any).patient?.name) {
          return (row as any).patient.name;
        }
        if ("sample" in row && (row as any).sample?.patient?.name) {
          return (row as any).sample.patient.name;
        }
        if ("patientId" in row && row.patientId) {
          const p = (patientsList.data ?? []).find(pt => pt.id === row.patientId || pt.patientCode === row.patientId);
          if (p) return p.name;
          return row.patientId;
        }
        return "—";
      }, {
        id: "patient_name",
        header: "Patient",
        cell: ({ getValue }) => <span className="font-medium text-[color:var(--foreground)]">{getValue()}</span>
      }),
      h.accessor(row => ("department" in row ? row.department : (row as any).sampleType || "Blood"), {
        id: "dept_type",
        header: isSample ? "Specimen" : "Department",
        cell: ({ getValue }) => <span className="text-[color:var(--muted)]">{getValue()}</span>
      }),
      ...(isAdmin
        ? [
            h.accessor((row: any) => row.franchise?.name || row.franchise?.code || "Central Lab", {
              id: "franchise",
              header: "Franchise",
              cell: ({ getValue }) => (
                <span className="inline-flex items-center rounded-md bg-[#e8f4f7] px-2 py-0.5 text-xs font-semibold text-[#176b87]">
                  {getValue()}
                </span>
              ),
            }),
          ]
        : []),
      ...(canViewCreatedBy
        ? [
            h.accessor((row: any) => row.createdBy || row.receivedBy || "System", {
              id: "createdBy",
              header: "Created By",
              cell: ({ getValue }) => (
                <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {getValue()}
                </span>
              ),
            }),
          ]
        : []),
      h.accessor(row => row.status ?? "Active", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const val = getValue();
          const tone = val === "Completed" || val === "Active" ? "success" : val === "Processing" ? "warning" : val === "Rejected" ? "danger" : "neutral";
          return <StatusBadge tone={tone} size="sm">{val}</StatusBadge>;
        }
      }),
      h.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1.5">
            <Link href={`/${kind}/${row.original.id}`}>
              <Button size="sm" variant="ghost" leftIcon={<Eye size={13} />}>
                View
              </Button>
            </Link>
            {canManage && (
              <>
                <Link href={`/${kind}/${row.original.id}/edit`}>
                  <Button size="sm" variant="secondary" leftIcon={<Edit3 size={13} />}>
                    Edit
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  variant="danger-outline" 
                  leftIcon={<Trash2 size={13} />}
                  onClick={() => setConfirmDeleteId(row.original.id)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )
      })
    ];
  }, [isSample, kind, isAdmin, canViewCreatedBy, patientsList.data, canManage]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (isSample) {
      await deleteSample.mutateAsync(confirmDeleteId);
    } else {
      await deleteTest.mutateAsync(confirmDeleteId);
    }
    setConfirmDeleteId(null);
    if (id && !isNew) {
      router.push(`/${kind}`);
    }
  };

  if (!path.length) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title={isSample ? "Samples" : "Tests Catalog"} 
          description={isSample ? "Track specimen collection, receipt, and laboratory processing." : "Manage catalogued and assigned laboratory diagnostic tests from Master Database."} 
          action={
            <Link href={`/${kind}/new`}>
              <Button variant="primary" leftIcon={<Plus size={16} />}>New {isSample ? "sample" : "test"}</Button>
            </Link>
          } 
        />
        <DataTable
          columns={columns}
          data={list.data}
          isLoading={list.isLoading}
          isError={list.isError}
          searchable
          searchPlaceholder={`Search ${kind}...`}
          emptyTitle={`No ${kind} found`}
        />

        {/* Delete Confirmation Modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                  <p className="text-xs text-[color:var(--muted)]">This will delete the {isSample ? "sample" : "test"} from the database.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
                Are you sure you want to delete this {isSample ? "sample record" : "test catalog entry"}? This action is permanent and cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
                <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  loading={isSample ? deleteSample.isPending : deleteTest.isPending} 
                  onClick={handleDelete}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (path[0] === "new" || edit) {
    const rawRecord = detail.data as Record<string, any> | undefined;
    const initialValues = isNew
      ? isSample
        ? { accession: "", barcode: "", patientId: "", sampleType: "", collectedAt: new Date().toISOString().slice(0, 16), priority: "", status: "", notes: "", franchiseId: "" }
        : { patientId: "", code: "", name: "", department: "", sampleType: "", price: "", referenceRange: "", unit: "", turnaroundHours: "24", status: "Active", franchiseId: "" }
      : isSample
      ? {
          accession: rawRecord?.accession ?? "",
          barcode: rawRecord?.barcode ?? "",
          patientId: rawRecord?.patientId ?? "",
          sampleType: rawRecord?.sampleType ?? "",
          collectedAt: rawRecord?.collectedAt ? new Date(rawRecord.collectedAt).toISOString().slice(0, 16) : "",
          priority: rawRecord?.priority ?? "",
          status: rawRecord?.status ?? "",
          notes: rawRecord?.notes ?? "",
          franchiseId: rawRecord?.franchiseId ?? "",
        }
      : {
          patientId: rawRecord?.patientId ?? rawRecord?.sample?.patientId ?? "",
          code: rawRecord?.code ?? "",
          name: rawRecord?.name ?? "",
          department: rawRecord?.department ?? "",
          sampleType: rawRecord?.sampleType ?? "",
          price: rawRecord?.price ?? "",
          referenceRange: rawRecord?.referenceRange ?? "",
          unit: rawRecord?.unit ?? "",
          turnaroundHours: rawRecord?.turnaroundHours ?? "24",
          status: rawRecord?.status ?? "Active",
          franchiseId: rawRecord?.franchiseId ?? "",
        };

    const baseFields = isSample ? sampleFields : testFields;
    const fields: FormFieldDef[] = isAdmin
      ? [
          {
            name: "franchiseId",
            label: "Assign to Franchise",
            type: "select",
            required: true,
            options: franchiseOptions,
            hint: "Select which Franchise owns this record.",
            colSpan: 2,
          },
          ...baseFields,
        ]
      : [...baseFields];

    const schema = (isSample ? sampleSchema : testSchema).shape(
      isAdmin
        ? {
            franchiseId: Yup.string().trim().required("Please select which Franchise this record belongs to."),
          }
        : {}
    );

    const updateCatalogTest = (
      idx: number,
      testMaster: TestMaster | null,
      testName: string,
      setFieldValue: (field: string, value: any) => void
    ) => {
      const updated = [...selectedCatalogTests];
      if (testMaster) {
        updated[idx] = {
          name: testMaster.name,
          code: testMaster.code || "",
          mrp: testMaster.mrp || testMaster.rate || 0,
          rate: testMaster.rate || testMaster.mrp || 0,
          department: testMaster.department || "Biochemistry",
          sampleType: testMaster.sampleType || "Blood",
          unit: testMaster.unit || "",
          referenceRange: testMaster.referenceRange || "",
          subParameters: [],
        };
      } else {
        updated[idx] = {
          name: testName,
          code: "",
          mrp: 0,
          rate: 0,
          subParameters: [],
        };
      }
      setSelectedCatalogTests(updated);
      const totalMrp = updated.reduce((sum, t) => sum + (t.mrp || 0), 0);
      const names = updated.map(t => t.name).filter(Boolean).join(", ");
      const codes = updated.map(t => t.code).filter(Boolean).join(", ");
      setFieldValue("price", totalMrp);
      setFieldValue("name", names || "Diagnostic Test");
      setFieldValue("code", codes || "TEST");
      if (testMaster?.department) setFieldValue("department", testMaster.department);
      if (testMaster?.sampleType) setFieldValue("sampleType", testMaster.sampleType);
    };

    const addCatalogTest = () => {
      setSelectedCatalogTests(prev => [...prev, { name: "", code: "", mrp: 0, rate: 0 }]);
    };

    const removeCatalogTest = (idx: number, setFieldValue: (field: string, value: any) => void) => {
      const updated = selectedCatalogTests.filter((_, i) => i !== idx);
      const finalTests = updated.length > 0 ? updated : [{ name: "", code: "", mrp: 0, rate: 0 }];
      setSelectedCatalogTests(finalTests);
      const totalMrp = finalTests.reduce((sum, t) => sum + (t.mrp || 0), 0);
      const names = finalTests.map(t => t.name).filter(Boolean).join(", ");
      const codes = finalTests.map(t => t.code).filter(Boolean).join(", ");
      setFieldValue("price", totalMrp);
      setFieldValue("name", names || "Diagnostic Test");
      setFieldValue("code", codes || "TEST");
    };

    const submit = async (values: typeof initialValues) => {
      if (values.franchiseId === "__add_franchise__") {
        router.push("/franchises/new");
        return;
      }

      if (isSample) {
        const payload = {
          ...values,
          accession: values.accession || `LIS-${Date.now().toString().slice(-6)}`,
          barcode: values.barcode || `BC${Date.now()}`,
          collectedAt: values.collectedAt || new Date().toISOString(),
          franchiseId: values.franchiseId || (currentSession?.franchiseId ?? undefined),
        };
        if (isNew) {
          await createSample.mutateAsync(payload as Omit<Sample, "id">);
        } else {
          await updateSample.mutateAsync({ id, input: payload });
        }
      } else {
        const validTests = selectedCatalogTests.filter(t => t.name.trim() !== "");
        const totalPrice = validTests.length > 0 
          ? validTests.reduce((sum, t) => sum + (t.mrp || 0), 0)
          : (Number(values.price) || 0);
        const compositeName = validTests.length > 0 ? validTests.map(t => t.name).join(", ") : values.name;
        const compositeCode = validTests.length > 0 ? validTests.map(t => t.code).filter(Boolean).join(", ") : values.code;

        const payload = {
          ...values,
          name: compositeName,
          code: compositeCode || "TEST",
          patientId: values.patientId || undefined,
          price: totalPrice,
          turnaroundHours: Number(values.turnaroundHours) || 24,
          franchiseId: values.franchiseId || (currentSession?.franchiseId ?? undefined),
        };
        if (isNew) {
          await createTest.mutateAsync(payload as Omit<Test, "id">);
        } else {
          await updateTest.mutateAsync({ id, input: payload });
        }
      }
      router.push(`/${kind}`);
    };

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader 
          title={isNew ? `New ${isSample ? "sample" : "test"}` : `Edit ${isSample ? "sample" : "test"}`} 
          description={
            !isSample 
              ? "Select patient and multiple tests from Master Database catalog. Rates & MRPs automatically sum together."
              : "Complete the required fields below. Select registered patient to link diagnostic sample."
          }
          action={
            <Link href={`/${kind}`}>
              <Button variant="ghost">← Back to {isSample ? "samples" : "tests"}</Button>
            </Link>
          }
        />

        {!isSample && (
          <div className="flex items-center gap-2.5 rounded-[var(--radius)] border border-[#176b87]/20 bg-[#e8f4f7]/60 p-3 text-xs text-[#176b87]">
            <Sparkles size={16} className="shrink-0" />
            <span>
              <strong>Multiple Tests Support:</strong> Add single or multiple tests. Test prices & MRPs automatically calculate and sum into total price.
            </span>
          </div>
        )}

        <Card>
          <Formik 
            initialValues={initialValues} 
            validationSchema={schema}
            enableReinitialize
            validateOnMount={false}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={submit}
          >
            {({ errors, touched, values, isSubmitting, setFieldValue }) => {
              const patientOpts = getPatientComboboxOptions(values.franchiseId);
              const selectedPatient = (patientsList.data ?? []).find(
                (p) => p.id === values.patientId || p.patientCode === values.patientId || p.name === values.patientId
              );

              const validTests = selectedCatalogTests.filter(t => t.name.trim() !== "");
              const calculatedPrice = validTests.length > 0 
                ? validTests.reduce((sum, t) => sum + (t.mrp || 0), 0) 
                : (Number(values.price) || 0);

              return (
                <Form className="space-y-6">
                  <Grid2>
                    {fields.map((field) => {
                      const errorMsg = touched[field.name as keyof typeof touched] ? (errors[field.name as keyof typeof errors] as string) : undefined;
                      
                      // 1. Patient selection for Sample and Test Forms (Searchable Autocomplete with Franchise Isolation)
                      if (field.name === "patientId") {
                        return (
                          <div key={field.name} className={field.colSpan === 2 ? "sm:col-span-2 space-y-3" : "space-y-3"}>
                            <UIField 
                              label={field.label} 
                              name={field.name} 
                              required={field.required}
                              hint={isAdmin && !values.franchiseId ? "⚠️ Please select a Franchise above first to load patients for that branch." : field.hint}
                              error={errorMsg}
                            >
                              <SearchableCombobox
                                options={patientOpts}
                                value={values.patientId}
                                onChange={(val, opt) => {
                                  setFieldValue("patientId", val);
                                  if (opt?.extra) {
                                    const p = opt.extra as Patient;
                                    if (isAdmin && p.franchiseId && !values.franchiseId) {
                                      setFieldValue("franchiseId", p.franchiseId);
                                    }
                                  }
                                }}
                                placeholder={
                                  isAdmin && !values.franchiseId 
                                    ? "← Select Franchise above first to load patients..." 
                                    : patientOpts.length === 0 
                                    ? "No patients registered under this franchise" 
                                    : "Select registered patient (type name, code, phone)..."
                                }
                                searchPlaceholder="Search by name, patient code, phone..."
                                loading={patientsList.isLoading}
                                disabled={isAdmin && !values.franchiseId}
                              />
                            </UIField>

                            {/* Verified Patient Detail Card */}
                            {selectedPatient && (
                              <div className="rounded-xl border border-[#176b87]/30 bg-[#e8f4f7]/70 p-3 text-xs text-[#176b87] shadow-xs">
                                <div className="flex items-center justify-between border-b border-[#176b87]/20 pb-1.5 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span className="font-bold text-sm text-[color:var(--foreground)]">{selectedPatient.name}</span>
                                    <span className="font-mono text-xs font-semibold bg-white/80 px-2 py-0.5 rounded border border-[#176b87]/20">
                                      {selectedPatient.patientCode || selectedPatient.id}
                                    </span>
                                  </div>
                                  <StatusBadge tone="success" size="sm">Registered Patient</StatusBadge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-[color:var(--muted)] block">Age & Gender</span>
                                    <span className="font-semibold text-[color:var(--foreground)]">{selectedPatient.age} yrs · {selectedPatient.sex || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[color:var(--muted)] block">Contact Phone</span>
                                    <span className="font-mono font-semibold text-[color:var(--foreground)]">{selectedPatient.phone || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[color:var(--muted)] block">Blood Group</span>
                                    <span className="font-semibold text-rose-600">{selectedPatient.bloodGroup || "Not Recorded"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[color:var(--muted)] block">Assigned Franchise</span>
                                    <span className="font-semibold text-[#176b87]">
                                      {franchisesList.data?.find(f => f.id === selectedPatient.franchiseId)?.name || "Central Lab"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 2. Multi-Test Selection Builder for Test Form
                      if (!isSample && field.name === "name") {
                        return (
                          <div key={field.name} className="space-y-4 sm:col-span-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-2)]/50 p-4">
                            <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
                              <div>
                                <h4 className="text-sm font-bold text-[color:var(--foreground)] flex items-center gap-2">
                                  <Sparkles size={16} className="text-[#176b87]" />
                                  Diagnostic Test / Service (Master Database)
                                </h4>
                                <p className="text-xs text-[color:var(--muted)]">
                                  Select one or multiple tests. Rates & MRPs automatically sum together.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                leftIcon={<Plus size={14} />}
                                onClick={addCatalogTest}
                              >
                                Add Another Test
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {selectedCatalogTests.map((testItem, idx) => (
                                <div key={idx} className="flex flex-col gap-2 bg-[color:var(--surface)] p-2.5 rounded-lg border border-[color:var(--line)] shadow-xs">
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="flex-1">
                                      <SearchableCombobox
                                        options={testMasterNameOptions}
                                        value={testItem.name}
                                        onChange={(val, opt) => {
                                          const tm = (opt?.extra as TestMaster) || null;
                                          updateCatalogTest(idx, tm, val, setFieldValue);
                                        }}
                                        placeholder={`Select test ${idx + 1} from Master Database (e.g. Calcium, CBC, Bilirubin)...`}
                                        searchPlaceholder="Type test name (e.g. Calcium, CBC)..."
                                        loading={testMastersQuery.isLoading}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8f4f7] border border-[#176b87]/20 text-[#176b87] font-mono text-xs font-bold min-w-[90px] justify-center">
                                        ₹{Number(testItem.mrp || 0).toFixed(2)}
                                      </div>
                                      {selectedCatalogTests.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeCatalogTest(idx, setFieldValue)}
                                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                          title="Remove test"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {testItem.name && (
                                    <SubParameterSelect
                                      testName={testItem.name || testItem.code}
                                      selectedSubParameters={testItem.subParameters}
                                      onChange={(newParams) => {
                                        const updated = [...selectedCatalogTests];
                                        updated[idx] = {
                                          ...updated[idx],
                                          subParameters: newParams,
                                        };
                                        setSelectedCatalogTests(updated);
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Aggregated MRP Breakdown */}
                            <div className="flex flex-wrap items-center justify-between pt-2 text-xs border-t border-[color:var(--line)] gap-2">
                              <span className="text-[color:var(--muted)] font-medium">
                                Total Tests Selected: <strong className="text-[color:var(--foreground)]">{selectedCatalogTests.filter(t => t.name).length}</strong>
                                {selectedCatalogTests.filter(t => t.name).length > 1 && (
                                  <span className="ml-1 text-[11px] text-[#176b87]">
                                    ({selectedCatalogTests.filter(t => t.name).map(t => `₹${t.mrp || 0}`).join(" + ")})
                                  </span>
                                )}
                              </span>
                              <div className="text-right">
                                <span className="text-[color:var(--muted)] mr-2">Total MRP / Price:</span>
                                <span className="font-mono text-sm font-black text-[#176b87]">
                                  ₹{calculatedPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 3. Price / MRP Auto-calculated Field
                      if (!isSample && field.name === "price") {
                        return (
                          <UIField 
                            key={field.name} 
                            label={field.label} 
                            name={field.name} 
                            required={field.required}
                            hint="Auto-calculated sum of all selected tests"
                            className={field.colSpan === 2 ? "sm:col-span-2" : ""}
                            error={errorMsg}
                          >
                            <Input
                              type="number"
                              name={field.name}
                              value={calculatedPrice}
                              readOnly
                              className="font-mono font-bold text-[#176b87] bg-[color:var(--surface-2)]"
                            />
                          </UIField>
                        );
                      }

                      // 4. Test Code field
                      if (!isSample && field.name === "code") {
                        return (
                          <UIField 
                            key={field.name} 
                            label={field.label} 
                            name={field.name} 
                            required={field.required}
                            hint={field.hint}
                            className={field.colSpan === 2 ? "sm:col-span-2" : ""}
                            error={errorMsg}
                          >
                            <Input
                              name={field.name}
                              value={values.code}
                              onChange={(e) => setFieldValue("code", e.target.value)}
                              placeholder="Test Code(s)..."
                            />
                          </UIField>
                        );
                      }

                      return (
                        <UIField 
                          key={field.name} 
                          label={field.label} 
                          name={field.name} 
                          required={field.required}
                          hint={field.hint}
                          className={field.colSpan === 2 ? "sm:col-span-2" : ""}
                          error={errorMsg}
                        >
                          {field.type === "select" ? (
                            <Field 
                              name={field.name} 
                              as={Select}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const selected = e.target.value;
                                if (field.name === "franchiseId" && selected === "__add_franchise__") {
                                  router.push("/franchises/new");
                                  return;
                                }
                                setFieldValue(field.name, selected);
                                if (field.name === "franchiseId") {
                                  // Clear patientId if patient does not belong to new franchise
                                  const curP = (patientsList.data ?? []).find(p => p.id === values.patientId || p.patientCode === values.patientId);
                                  if (curP && curP.franchiseId !== selected) {
                                    setFieldValue("patientId", "");
                                  }
                                }
                              }}
                            >
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value} disabled={opt.value === "" && field.required}>
                                  {opt.label}
                                </option>
                              ))}
                            </Field>
                          ) : field.type === "textarea" ? (
                            <Field name={field.name} as={Textarea} placeholder={field.placeholder} />
                          ) : field.type === "datetime" ? (
                            <Field name={field.name} type="datetime-local" as={Input} />
                          ) : (
                            <Field name={field.name} type={field.type} as={Input} placeholder={field.placeholder} />
                          )}
                        </UIField>
                      );
                    })}
                  </Grid2>
                  <div className="flex gap-3 pt-4 border-t border-[color:var(--line)]">
                    <Button type="submit" variant="primary" loading={isSubmitting || createSample.isPending || createTest.isPending || updateSample.isPending || updateTest.isPending}>
                      Save {isSample ? "Sample" : "Test"}
                    </Button>
                    <Link href={`/${kind}`}>
                      <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                    {!isNew && canManage && (
                      <Button 
                        type="button" 
                        variant="danger-outline"
                        className="ml-auto"
                        onClick={() => setConfirmDeleteId(id)}
                      >
                        Delete {isSample ? "Sample" : "Test"}
                      </Button>
                    )}
                  </div>
                </Form>
              );
            }}
          </Formik>
        </Card>
      </div>
    );
  }

  const item = detail.data;
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader 
        title={item && ("accession" in item ? item.accession : item.name) || "Loading..."} 
        description="Linked laboratory diagnostic record."
        action={
          <div className="flex items-center gap-2">
            <Link href={`/${kind}`}>
              <Button variant="ghost">← Back to {isSample ? "samples" : "tests"}</Button>
            </Link>
            {canManage && (
              <>
                <Link href={`/${kind}/${id}/edit`}>
                  <Button variant="outline" leftIcon={<Edit3 size={15} />}>Edit {isSample ? "Sample" : "Test"}</Button>
                </Link>
                <Button 
                  variant="danger-outline" 
                  leftIcon={<Trash2 size={15} />}
                  onClick={() => setConfirmDeleteId(id)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />
      {item && (
        <Card padding={false} className="overflow-hidden">
          <dl className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--line)]">
            {Object.entries(item)
              .filter(([key]) => {
                if (key === "id" || key === "password" || key.startsWith("_")) return false;
                if (key === "patientId" && (item as any).patient) return false;
                if (key === "sampleId" && (item as any).sample) return false;
                if (key === "franchiseId" && (item as any).franchise) return false;
                return true;
              })
              .map(([key, value], i) => {
                const lines = formatLabDetailLines(key, value);
                const isEmpty = lines.length === 1 && lines[0] === DETAIL_NA;
                const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
                return (
                  <div className={cn("p-4", i > 1 && "sm:border-t border-[color:var(--line)]")} key={key}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-[color:var(--muted)]">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                      {isEmpty ? (
                        <span className="text-[color:var(--muted)]">{DETAIL_NA}</span>
                      ) : lines.length === 1 ? (
                        lines[0]
                      ) : (
                        <ul className="space-y-1">
                          {lines.map((line, idx) => (
                            <li key={`${key}-${idx}`}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                );
              })}
          </dl>
        </Card>
      )}
      {!isSample && (
        <div className="mt-8">
          <ResultSection title="Results">
            <ResultTable results={(results.data ?? []).filter((result) => result.testId === path[0])} />
          </ResultSection>
        </div>
      )}

      {/* Delete Confirmation Modal in Detail View */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                <p className="text-xs text-[color:var(--muted)]">This will delete the record from database.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
              Are you sure you want to permanently delete this {isSample ? "sample" : "test"}?
            </p>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
              <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                loading={isSample ? deleteSample.isPending : deleteTest.isPending} 
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
