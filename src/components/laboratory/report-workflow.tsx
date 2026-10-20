"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Form, Formik, Field } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Award, Calendar, CheckCircle2, ChevronRight, Clock, Download,
  Edit3, Eye, FileText, FlaskConical, Mail, MessageCircle, Microscope,
  Phone, Plus, Printer, QrCode, Share2, ShieldCheck, Trash2, ArrowLeft, Loader2
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { PageHeader, StatusBadge, Button, Input, Select, Textarea, Field as UIField, Grid2, Card, cn } from "@/components/ui/index";
import { DataTable } from "@/components/tables/DataTable";
import { useResults } from "@/features/laboratory/hooks";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useReport,
  useReportActions,
  useReports,
  useReportTemplate,
  useReportTemplates,
  useUpdateTemplate
} from "@/features/reports/hooks";
import { ReportGeneratorWizard } from "@/components/laboratory/ReportGeneratorWizard";
import { getTestParameterSchema, evaluateParameterFlag } from "@/lib/laboratory/test-parameter-definitions";
import { DEFAULT_CLINICAL_NOTE_TEXT, resolveClinicalNotesConfig, resolveReportLetterhead } from "@/lib/laboratory/letterhead-registry";
import { formatPatientAgeLabel } from "@/lib/patient-age";
import { useLaboratorySettings } from "@/features/settings/hooks";
import { useEntityList } from "@/features/crud/hooks";
import { authService } from "@/lib/auth/auth-service";
import type { Franchise, Report, ReportTemplate, Result, UserRole } from "@/types/domain";

function formatReportDateTime(value?: string | null, fallback?: string | null): string {
  const raw = value || fallback;
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const dateOnly = String(raw).slice(0, 10);
    return dateOnly || "—";
  }
  const date = parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const time = parsed.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

const templateSchema = Yup.object({
  name: Yup.string().trim().required("Template name is required (. Hematology Complete Blood Count)").min(2, "Template name must be at least 2 characters"),
  department: Yup.string().required("Please select a laboratory department"),
  tests: Yup.string().trim().required("Included test codes are required (. CBC, ESR, Hemoglobin)"),
  header: Yup.string().trim().required("Report header title is required (. BL Dignostic Clinical Laboratory)"),
  footer: Yup.string().trim().required("Report footer disclaimer is required"),
  signatory: Yup.string().trim().required("Signatory pathologist name is required (. Dr. Ananya Rao, MD)"),
  referenceRanges: Yup.string().trim(),
  notes: Yup.string().trim(),
});

export function ReportWorkflow({ path }: Readonly<{ path: readonly string[] }>) {
  const router = useRouter();
  const reports = useReports();
  const templates = useReportTemplates();
  const report = useReport(path[0] && path[0] !== "new" && path[0] !== "templates" ? path[0] : "");
  const results = useResults();
  const actions = useReportActions();

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);

  // New report creation flow
  if (path[0] === "new") {
    return <ReportGeneratorWizard />;
  }

  const isTemplateFlow = path[0] === "templates";
  const templateId = isTemplateFlow && path[1] && path[1] !== "new" ? path[1] : "";
  const isNewTemplate = isTemplateFlow && path[1] === "new";
  const isEditTemplate = isTemplateFlow && path[2] === "edit";

  // Template List View
  if (isTemplateFlow && !templateId && !isNewTemplate) {
    const templateColumns = [
      {
        id: "name",
        header: "Template Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div>
            <p className="font-bold text-[color:var(--foreground)]">{row.original.name}</p>
            <p className="text-xs text-[color:var(--muted)]">{row.original.department}</p>
          </div>
        )
      },
      {
        id: "tests",
        header: "Associated Tests",
        accessorKey: "tests",
        cell: ({ getValue }: any) => {
          const t = getValue() as string[];
          return <span className="font-mono text-xs text-[color:var(--muted)]">{Array.isArray(t) ? t.join(", ") : t}</span>;
        }
      },
      {
        id: "signatory",
        header: "Signatory Pathologist",
        accessorKey: "signatory",
        cell: ({ getValue }: any) => <span className="text-xs font-medium text-[color:var(--foreground)]">{getValue()}</span>
      },
      {
        id: "active",
        header: "Status",
        accessorKey: "active",
        cell: ({ getValue }: any) => (
          <StatusBadge tone={getValue() ? "success" : "neutral"} size="sm">
            {getValue() ? "Active" : "Inactive"}
          </StatusBadge>
        )
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 justify-center">
            <Link href={`/reports/templates/${row.original.id}`}>
              <Button size="sm" variant="ghost" leftIcon={<Eye size={13} />}>
                View
              </Button>
            </Link>
            <Link href={`/reports/templates/${row.original.id}/edit`}>
              <Button size="sm" variant="secondary" leftIcon={<Edit3 size={13} />}>
                Edit
              </Button>
            </Link>
            <Button
              size="sm"
              variant="danger-outline"
              leftIcon={<Trash2 size={13} />}
              onClick={() => setConfirmDeleteTemplateId(row.original.id)}
            >
              Delete
            </Button>
          </div>
        )
      }
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title="Diagnostic Report Templates"
          description="Pre-configured reporting headers, biological reference ranges, and digital pathologist signatories."
          action={
            <div className="flex gap-2">
              <Link href="/reports">
                <Button variant="ghost">← Back to Reports</Button>
              </Link>
              <Link href="/reports/templates/new">
                <Button variant="primary" leftIcon={<Plus size={16} />}>
                  New Template
                </Button>
              </Link>
            </div>
          }
        />
        <DataTable
          columns={templateColumns}
          data={templates.data}
          isLoading={templates.isLoading}
          isError={templates.isError}
          searchable
          searchPlaceholder="Search templates..."
          emptyTitle="No report templates found"
        />

        {confirmDeleteTemplateId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                  <p className="text-xs text-[color:var(--muted)]">This will delete the report template from database.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
                Are you sure you want to permanently delete this report template? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
                <Button variant="ghost" onClick={() => setConfirmDeleteTemplateId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={deleteTemplate.isPending}
                  onClick={async () => {
                    await deleteTemplate.mutateAsync(confirmDeleteTemplateId);
                    setConfirmDeleteTemplateId(null);
                  }}
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

  // Template Create/Edit Form View
  if (isNewTemplate || isEditTemplate) {
    return <TemplateFormView id={templateId} isNew={isNewTemplate} />;
  }

  // Template Detail View
  if (isTemplateFlow && templateId) {
    return <TemplateDetailView id={templateId} />;
  }

  // Report Detail View (Single Report preview and PDF download)
  if (path.length && path[0] !== "templates") {
    return <ReportDetailView id={path[0]} />;
  }

  // Default Reports List
  return <ReportListView />;
}

// -------------------------------------------------------------
// TEMPLATE FORM VIEW
// -------------------------------------------------------------
function TemplateFormView({ id, isNew }: Readonly<{ id: string; isNew: boolean }>) {
  const router = useRouter();
  const templateQuery = useReportTemplate(isNew ? "" : id);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const existing = templateQuery.data;

  const initialValues = {
    name: existing?.name ?? "",
    department: existing?.department ?? "",
    tests: Array.isArray(existing?.tests) ? existing.tests.join(", ") : (existing?.tests ?? ""),
    header: existing?.header ?? "BL Dignostic LIMS Reference Laboratory",
    footer: existing?.footer ?? "This is a computer-generated report and does not require physical signature. Interpret clinically.",
    signatory: existing?.signatory ?? "Dr. Ananya Rao, MD (Pathology)",
    referenceRanges: existing?.referenceRanges ?? "",
    notes: existing?.notes ?? "Specimen processed under certified automated CLIA/NABL standards.",
    active: existing?.active ?? true,
  };

  const submit = async (values: typeof initialValues) => {
    const payload: Omit<ReportTemplate, "id"> = {
      ...values,
      tests: typeof values.tests === "string"
        ? values.tests.split(",").map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(values.tests) ? values.tests : [],
    };

    if (isNew) {
      await createTemplate.mutateAsync(payload);
    } else {
      await updateTemplate.mutateAsync({ id, input: payload });
    }
    router.push("/reports/templates");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={isNew ? "New Report Template" : `Edit Template: ${existing?.name || ""}`}
        description="Configure diagnostic layout, reference ranges, and authorization signatory for clinical reports."
        action={
          <Link href="/reports/templates">
            <Button variant="ghost">← Back to Templates</Button>
          </Link>
        }
      />
      <Card>
        <Formik
          initialValues={initialValues}
          validationSchema={templateSchema}
          enableReinitialize
          validateOnChange={true}
          validateOnBlur={true}
          onSubmit={submit}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="space-y-6">
              <Grid2>
                <UIField
                  label="Template Name"
                  name="name"
                  required
                  error={touched.name ? errors.name : undefined}
                >
                  <Field name="name" as={Input} placeholder="e.g. Standard Hematology CBC Profile" />
                </UIField>

                <UIField
                  label="Laboratory Department"
                  name="department"
                  required
                  error={touched.department ? errors.department : undefined}
                >
                  <Field name="department" as={Select}>
                    <option value="">Select department</option>
                    <option value="Hematology">Hematology & Coagulation</option>
                    <option value="Biochemistry">Clinical Biochemistry</option>
                    <option value="Electrolytes">Electrolytes & Blood Gas</option>
                    <option value="Serology">Immunology & Serology</option>
                    <option value="Microbiology">Microbiology & Cultures</option>
                    <option value="Histopathology">Histopathology & Cytology</option>
                    <option value="Molecular">Molecular Diagnostics</option>
                  </Field>
                </UIField>

                <UIField
                  label="Included Test Codes (comma-separated)"
                  name="tests"
                  required
                  hint="e.g. CBC, ESR, HB, PLATELET"
                  className="sm:col-span-2"
                  error={touched.tests ? errors.tests : undefined}
                >
                  <Field name="tests" as={Input} placeholder="CBC, ESR, HB" />
                </UIField>

                <UIField
                  label="Report Header Title"
                  name="header"
                  required
                  className="sm:col-span-2"
                  error={touched.header ? errors.header : undefined}
                >
                  <Field name="header" as={Input} placeholder="BL Dignostic Clinical Laboratory" />
                </UIField>

                <UIField
                  label="Signatory Pathologist Name & Credentials"
                  name="signatory"
                  required
                  error={touched.signatory ? errors.signatory : undefined}
                >
                  <Field name="signatory" as={Input} placeholder="Dr. Ananya Rao, MD (Pathology)" />
                </UIField>

                <UIField
                  label="Status"
                  name="active"
                >
                  <Field name="active" as={Select}>
                    <option value="true">Active (Enabled)</option>
                    <option value="false">Inactive (Disabled)</option>
                  </Field>
                </UIField>

                <UIField
                  label="Default Reference Ranges & Methodology Notes"
                  name="referenceRanges"
                  className="sm:col-span-2"
                >
                  <Field name="referenceRanges" as={Textarea} rows={2} placeholder="Adult Indian biological reference intervals apply." />
                </UIField>

                <UIField
                  label="Report Footer Disclaimer"
                  name="footer"
                  required
                  className="sm:col-span-2"
                  error={touched.footer ? errors.footer : undefined}
                >
                  <Field name="footer" as={Textarea} rows={2} placeholder="This is a computer-generated diagnostic report." />
                </UIField>
              </Grid2>

              <div className="flex gap-3 pt-4 border-t border-[color:var(--line)]">
                <Button type="submit" variant="primary" loading={isSubmitting || createTemplate.isPending || updateTemplate.isPending}>
                  Save Template
                </Button>
                <Link href="/reports/templates">
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </div>
  );
}

// -------------------------------------------------------------
// TEMPLATE DETAIL VIEW
// -------------------------------------------------------------
function TemplateDetailView({ id }: Readonly<{ id: string }>) {
  const templateQuery = useReportTemplate(id);
  const item = templateQuery.data;

  if (templateQuery.isLoading) return <p className="text-sm text-[color:var(--muted)]">Loading template...</p>;
  if (!item) return <p className="text-sm text-[color:var(--muted)]">Template not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={item.name}
        description={`Department: ${item.department}`}
        action={
          <div className="flex gap-2">
            <Link href="/reports/templates">
              <Button variant="ghost">← Back to Templates</Button>
            </Link>
            <Link href={`/reports/templates/${id}/edit`}>
              <Button variant="outline" leftIcon={<Edit3 size={15} />}>Edit Template</Button>
            </Link>
          </div>
        }
      />
      <Card padding={false} className="overflow-hidden">
        <dl className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--line)]">
          <div className="p-4">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Department</dt>
            <dd className="mt-1 text-sm font-bold text-[color:var(--foreground)]">{item.department}</dd>
          </div>
          <div className="p-4">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Status</dt>
            <dd className="mt-1">
              <StatusBadge tone={item.active ? "success" : "neutral"} size="sm">
                {item.active ? "Active" : "Inactive"}
              </StatusBadge>
            </dd>
          </div>
          <div className="p-4 sm:border-t border-[color:var(--line)]">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Associated Tests</dt>
            <dd className="mt-1 text-sm font-mono">{Array.isArray(item.tests) ? item.tests.join(", ") : item.tests}</dd>
          </div>
          <div className="p-4 sm:border-t border-[color:var(--line)]">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Signatory</dt>
            <dd className="mt-1 text-sm font-semibold">{item.signatory}</dd>
          </div>
          <div className="p-4 sm:col-span-2 border-t border-[color:var(--line)]">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Report Header</dt>
            <dd className="mt-1 text-sm font-medium">{item.header}</dd>
          </div>
          <div className="p-4 sm:col-span-2 border-t border-[color:var(--line)]">
            <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">Footer Disclaimer</dt>
            <dd className="mt-1 text-xs text-[color:var(--muted)]">{item.footer}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

// REPORT DETAIL / PRINT & DIRECT PDF DOWNLOAD VIEW
// -------------------------------------------------------------
function ReportDetailView({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const report = useReport(id);
  const actions = useReportActions();
  const lab = useLaboratorySettings();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | undefined>(undefined);

  useEffect(() => {
    const s = authService.getSession();
    if (s?.role) setCurrentRole(s.role);
  }, []);

  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";
  const isFranchise = currentRole === "Franchise";
  const isTechnician = currentRole === "Technician";
  const isPathologist = currentRole === "Pathologist";
  const canManage = isAdmin || isFranchise || isTechnician || isPathologist;
  const canDelete = canManage && !isTechnician;

  const item = report.data as any;
  const franchisesList = useEntityList<Franchise>("franchises");

  const letterhead = useMemo(() => {
    return resolveReportLetterhead({
      report: item,
      patient: item?.patient,
      franchisesList: (franchisesList.data as any) || undefined,
    });
  }, [item, franchisesList.data]);

  if (report.isLoading) return <p className="text-sm text-[color:var(--muted)]">Loading report details...</p>;
  if (!item) return <p className="text-sm text-[color:var(--muted)]">Report not found.</p>;

  // Load test schema to auto-populate default results if empty
  const reportFranchise = item.franchiseId || (item.patient as any)?.franchiseId || (item.franchise as any)?.id;
  const testSchema = getTestParameterSchema(
    item.testCode || (item.testIds && item.testIds[0]) || "CBC",
    undefined,
    reportFranchise
  );

  let reportResults: Result[] = (item.results ?? []) as Result[];
  if (!reportResults.length && testSchema.parameters.length) {
    reportResults = testSchema.parameters.map((p) => ({
      id: p.id,
      testId: item.id,
      parameter: p.name,
      value: p.defaultValue || "Normal",
      unit: p.unit,
      referenceRange: p.referenceRange,
      abnormalFlag: false,
      criticalFlag: false,
      comments: p.method ? `Method: ${p.method}` : undefined,
    }));
  }

  const critical = reportResults.some((result) => result.criticalFlag);
  const patient = item.patient || {};
  const doctor = item.doctor || {};
  const sample = item.sample || {};
  const barcodeNumber = sample.barcode || sample.accession || "E8399903";
  const clinicalNotesConfig = resolveClinicalNotesConfig([
    letterhead.id,
    letterhead.franchiseCode,
    item.franchiseId,
    item.franchise?.id,
    item.franchise?.code,
    item.franchise?.name,
    patient.franchiseId,
    patient.franchise?.id,
  ]);
  const rawClinicalNotes = String(item.comments || "").trim();
  const isStockClinicalNote =
    !rawClinicalNotes ||
    rawClinicalNotes === DEFAULT_CLINICAL_NOTE_TEXT ||
    rawClinicalNotes === (clinicalNotesConfig.defaultText || "");
  const typedClinicalNotes = isStockClinicalNote ? "" : rawClinicalNotes;

  const approve = () => {
    if (!critical || confirm("Critical values are present. Confirm final approval & release?")) {
      actions.approveReport.mutate(item.id);
    }
  };

  /**
   * Direct PDF download with full width, crystal clear typography, and accurate layout.
   * Uses an isolated 820px iframe with all document styles to guarantee zero viewport clipping
   * and perfectly centered A4 PDF placement with equal margins.
   */
  const downloadPdfDirectly = async () => {
    const containerElement = document.getElementById("diagnostic-report-article");
    if (!containerElement) return;

    setIsDownloadingPdf(true);

    let iframe: HTMLIFrameElement | null = null;
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      // Create a hidden isolated iframe with standard desktop A4 width (820px)
      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "820px";
      iframe.style.height = "2400px";
      iframe.style.zIndex = "-99999";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      // Copy all stylesheets, link tags, and font definitions from parent document
      const styleNodes = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
      for (const node of styleNodes) {
        iframeDoc.head.appendChild(node.cloneNode(true));
      }

      const customStyle = iframeDoc.createElement("style");
      customStyle.textContent = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #ffffff; width: 820px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .report-page { 
          width: 820px !important; 
          min-width: 820px !important; 
          max-width: 820px !important; 
          height: 1160px !important;
          min-height: 1160px !important;
          max-height: 1160px !important;
          margin: 0 !important; 
          margin-bottom: 0 !important;
          padding-top: ${letterhead.paddingTop} !important;
          padding-bottom: ${letterhead.paddingBottom} !important;
          padding-left: ${letterhead.paddingLeft} !important;
          padding-right: ${letterhead.paddingRight} !important;
          border: none !important; 
          box-shadow: none !important; 
          border-radius: 0 !important; 
          background-color: #ffffff !important;
          background-image: url('${letterhead.backgroundImage}') !important;
          background-size: 100% 100% !important;
          background-position: top center !important;
          background-repeat: no-repeat !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        table, tr, td, th, section, div {
          background-color: transparent !important;
        }
      `;
      iframeDoc.head.appendChild(customStyle);

      // Clone the report element into the iframe
      const clone = containerElement.cloneNode(true) as HTMLElement;
      iframeDoc.body.appendChild(clone);

      // Allow fonts, stylesheets, and images to settle in the iframe
      await new Promise((resolve) => setTimeout(resolve, 200));

      const pageElements = Array.from(iframeDoc.querySelectorAll(".report-page")) as HTMLElement[];
      const targets = pageElements.length > 0 ? pageElements : [clone];

      // Standard A4 dimensions in mm: 210 x 297
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
      const marginX = 8; // Equal 8mm margins on both left and right
      const marginY = 8; // 8mm top margin
      const contentWidth = pdfWidth - marginX * 2; // 194 mm (centered on 210mm page)
      const contentHeight = (1160 * contentWidth) / 820; // Exact A4 height proportion in mm (~274.5 mm)

      for (let i = 0; i < targets.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        const imgData = await toPng(targets[i], {
          quality: 1.0,
          pixelRatio: 3,
          backgroundColor: "#ffffff",
          cacheBust: true,
          width: 820,
          height: 1160,
        });

        const img = new Image();
        img.src = imgData;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
        });

        pdf.addImage(imgData, "PNG", marginX, marginY, contentWidth, contentHeight, undefined, "FAST");
      }

      const filename = `Diagnostic_Report_${item.reportNumber || "RPT"}_${(patient.name || "Patient").replace(/\s+/g, "_")}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Failed to generate direct PDF download:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setIsDownloadingPdf(false);
    }
  };

  /**
   * Direct high-fidelity Print functionality that produces 100% identical output
   * to the View page and the Download PDF (including full letterhead, logo, colors, and layout).
   */
  const printReportDirectly = async () => {
    const containerElement = document.getElementById("diagnostic-report-article");
    if (!containerElement) {
      window.print();
      return;
    }

    setIsPrinting(true);

    let renderIframe: HTMLIFrameElement | null = null;
    let printIframe: HTMLIFrameElement | null = null;

    try {
      const { toPng } = await import("html-to-image");

      // 1. Create a hidden isolated iframe with standard desktop A4 width (820px) to render report exactly
      renderIframe = document.createElement("iframe");
      renderIframe.style.position = "fixed";
      renderIframe.style.top = "0";
      renderIframe.style.left = "0";
      renderIframe.style.width = "820px";
      renderIframe.style.height = "2400px";
      renderIframe.style.zIndex = "-99999";
      renderIframe.style.opacity = "0";
      renderIframe.style.pointerEvents = "none";
      renderIframe.style.border = "none";
      document.body.appendChild(renderIframe);

      const renderDoc = renderIframe.contentDocument || renderIframe.contentWindow?.document;
      if (!renderDoc) throw new Error("Could not access render iframe document");

      // Copy all stylesheets, link tags, and font definitions from parent document
      const styleNodes = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
      for (const node of styleNodes) {
        renderDoc.head.appendChild(node.cloneNode(true));
      }

      const customStyle = renderDoc.createElement("style");
      customStyle.textContent = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #ffffff; width: 820px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .report-page { 
          width: 820px !important; 
          min-width: 820px !important; 
          max-width: 820px !important; 
          height: 1160px !important;
          min-height: 1160px !important;
          max-height: 1160px !important;
          margin: 0 !important; 
          margin-bottom: 0 !important;
          padding-top: ${letterhead.paddingTop} !important;
          padding-bottom: ${letterhead.paddingBottom} !important;
          padding-left: ${letterhead.paddingLeft} !important;
          padding-right: ${letterhead.paddingRight} !important;
          border: none !important; 
          box-shadow: none !important; 
          border-radius: 0 !important; 
          background-color: #ffffff !important;
          background-image: url('${letterhead.backgroundImage}') !important;
          background-size: 100% 100% !important;
          background-position: top center !important;
          background-repeat: no-repeat !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        table, tr, td, th, section, div {
          background-color: transparent !important;
        }
      `;
      renderDoc.head.appendChild(customStyle);

      // Clone the report element into the iframe
      const clone = containerElement.cloneNode(true) as HTMLElement;
      renderDoc.body.appendChild(clone);

      // Allow fonts, stylesheets, and images to settle in the iframe
      await new Promise((resolve) => setTimeout(resolve, 250));

      const pageElements = Array.from(renderDoc.querySelectorAll(".report-page")) as HTMLElement[];
      const targets = pageElements.length > 0 ? pageElements : [clone];

      const imagesData: string[] = [];
      for (const target of targets) {
        const imgData = await toPng(target, {
          quality: 1.0,
          pixelRatio: 3,
          backgroundColor: "#ffffff",
          cacheBust: true,
          width: 820,
          height: 1160,
        });
        imagesData.push(imgData);
      }

      // 2. Create isolated print iframe
      printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.top = "0";
      printIframe.style.left = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      printIframe.style.visibility = "hidden";
      document.body.appendChild(printIframe);

      const printDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!printDoc) throw new Error("Could not access print iframe document");

      const imagesHtml = imagesData
        .map(
          (src) =>
            `<div class="page-container"><img class="report-print-img" src="${src}" alt="Diagnostic Report" /></div>`
        )
        .join("\n");

      printDoc.open();
      printDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Diagnostic Report - ${item.reportNumber || "RPT"}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page-container {
                width: 100vw;
                height: 100vh;
                page-break-after: always;
                page-break-inside: avoid;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #ffffff;
              }
              .page-container:last-child {
                page-break-after: auto;
              }
              img.report-print-img {
                width: 100%;
                height: 100%;
                object-fit: fill;
                display: block;
              }
            </style>
          </head>
          <body>
            ${imagesHtml}
          </body>
        </html>
      `);
      printDoc.close();

      // Wait for images in printDoc to fully load
      const printImages = Array.from(printDoc.querySelectorAll("img"));
      await Promise.all(
        printImages.map(
          (img) =>
            new Promise<void>((res) => {
              if (img.complete) {
                res();
              } else {
                img.onload = () => res();
                img.onerror = () => res();
              }
            })
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      if (printIframe.contentWindow) {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      }
    } catch (error) {
      console.error("Failed to execute high-fidelity print:", error);
      window.print();
    } finally {
      if (renderIframe && renderIframe.parentNode) {
        renderIframe.parentNode.removeChild(renderIframe);
      }
      setTimeout(() => {
        if (printIframe && printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      }, 60000);
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Print Styles for Direct Native Page Print */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background: #ffffff !important;
              }
              header, nav, aside, footer, button, .print\\:hidden, [role="navigation"] {
                display: none !important;
              }
              #diagnostic-report-article {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
              }
              .report-page {
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />}>
              All Reports
            </Button>
          </Link>
          <span className="text-xs text-[color:var(--muted)]">/</span>
          <span className="font-mono text-xs font-bold text-[color:var(--foreground)]">{item.reportNumber}</span>
          <StatusBadge tone={item.status === "Approved" ? "success" : item.status === "Rejected" ? "danger" : "warning"} size="sm">
            {item.status || "Pending Review"}
          </StatusBadge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={printReportDirectly}
            loading={isPrinting}
            leftIcon={<Printer size={15} />}
          >
            Print Report
          </Button>
          <Button
            variant="outline"
            onClick={downloadPdfDirectly}
            loading={isDownloadingPdf}
            leftIcon={<Download size={15} />}
          >
            Download PDF
          </Button>
          {item.status !== "Approved" && (
            <Button variant="primary" onClick={approve} leftIcon={<CheckCircle2 size={15} />}>
              Approve & Release
            </Button>
          )}
          {canDelete && (
            <Button
              variant="danger-outline"
              onClick={() => setConfirmDeleteId(item.id)}
              leftIcon={<Trash2 size={15} />}
            >
              Delete Report
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* ORIGINAL PDF LETTERHEAD BACKGROUND REPORT ARTICLE CONTAINER */}
      {/* ========================================================== */}
      <div id="diagnostic-report-article" className="space-y-6 print:space-y-0">
        <article
          className="report-page mx-auto max-w-4xl text-slate-900 border border-slate-300 shadow-lg rounded-xl print:border-0 print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full font-sans relative"
          style={{
            backgroundColor: "#ffffff",
            backgroundImage: `url(${letterhead.backgroundImage})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
            minHeight: "1160px",
            width: "100%",
            maxWidth: "820px",
            boxSizing: "border-box",
            paddingTop: letterhead.paddingTop,
            paddingBottom: letterhead.paddingBottom,
            paddingLeft: letterhead.paddingLeft,
            paddingRight: letterhead.paddingRight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            color: "#0f172a",
          }}
        >
          {/* Explicit Letterhead Background Image (ensures print engine always renders full graphics) */}
          <img
            src={letterhead.backgroundImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {/* Dynamic Report Content Area */}
          <div className="space-y-1.5 flex-1 relative" style={{ zIndex: 10, backgroundColor: "transparent" }}>
            {/* Patient Demographic & Specimen Information Table/Card */}
            <section
              style={{
                borderTop: letterhead.id === "zipcure" ? "none" : "1.5px solid #0f172a",
                borderBottom: "1.5px solid #0f172a",
                backgroundColor: "transparent",
                paddingTop: letterhead.id === "zipcure" ? "2px" : "5px",
                paddingBottom: "5px",
                fontSize: "16px",
                lineHeight: "1.3",
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-3">
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-[13.5px]">{patient.name || "Patient Name"}</span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Age / Gender</span>
                  <span className="font-bold text-slate-900 text-[12.5px]">{formatPatientAgeLabel(patient.dateOfBirth, patient.age)} / {patient.sex || "Male"}</span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Order / Booking ID</span>
                  <span className="font-mono font-bold text-slate-900 text-[12.5px]">{item.reportNumber}</span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Referred By</span>
                  <span className="font-bold text-slate-900 text-[12.5px]">{doctor.name || "Self / Clinical OPD"}</span>
                </div>

                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Sample Type</span>
                  <span className="font-semibold text-slate-900 text-[12px]">{sample.sampleType || testSchema.sampleType || "Whole Blood EDTA"}</span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Sample Collected On</span>
                  <span className="font-mono font-semibold text-slate-900 text-[12px]">
                    {formatReportDateTime(sample.collectedAt, item.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Report Generated On</span>
                  <span className="font-mono font-semibold text-slate-900 text-[12px]">
                    {formatReportDateTime(item.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 text-[10.5px] block font-bold uppercase tracking-wider">Sample Barcode</span>
                  <span className="font-mono font-bold text-slate-900 text-[12px]">{barcodeNumber}</span>
                </div>
              </div>
            </section>

            {/* Diagnostic Investigation Section Title */}
            <div className="text-center pt-0.5 pb-0.5" style={{ backgroundColor: "transparent" }}>
              <span
                className="inline-block px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-widest text-[#0a534c] border-b border-[#139a8c]"
              >
                DEPARTMENT OF {item.department || testSchema.department}
              </span>
              <h2 className="text-[14px] sm:text-[15.5px] font-black tracking-wide text-slate-900 mt-0.5 uppercase">
                {testSchema.name}
              </h2>
            </div>

            {/* Investigation Parameter Results Table */}
            <table className="w-full text-left text-[14px] border-collapse" style={{ backgroundColor: "transparent" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "transparent",
                    borderTop: "1.5px solid #0f172a",
                    borderBottom: "1.5px solid #0f172a",
                    color: "#0f172a",
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th className="py-0.5 px-2">Investigation Parameter</th>
                  <th className="py-0.5 px-2 text-right">Observed Value</th>
                  <th className="py-0.5 px-2">Unit</th>
                  <th className="py-0.5 px-2">Biological Reference Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80" style={{ backgroundColor: "transparent" }}>
                {reportResults.map((r, idx) => {
                  const paramUpper = (r.parameter || "").trim().toUpperCase();
                  const isHeadingRow = 
                    r.referenceRange === "HEADING" || 
                    paramUpper === "DIFFERENTIAL LEUCOCYTE COUNT" ||
                    paramUpper === "DIFFERENTIAL LEUCOCYTE COUNT (DLC)" ||
                    (paramUpper.includes("DIFFERENTIAL LEUCOCYTE COUNT") && !r.value && !r.unit);

                  const isSubItem = ["NEUTROPHILS", "LYMPHOCYTES", "MONOCYTES", "EOSINOPHILS", "BASOPHILS"].includes(paramUpper);

                  if (isHeadingRow) {
                    return (
                      <tr key={r.id || idx} style={{ backgroundColor: "transparent" }}>
                        <td colSpan={4} className="pt-1.5 pb-0.5 px-2">
                          <p className="font-black text-slate-900 text-[12.5px] uppercase tracking-wide">
                            {r.parameter.replace(/\s*\(dlc\)\s*/i, "")}
                          </p>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.id || idx} style={{ backgroundColor: "transparent" }}>
                      <td className={cn("py-0.5 px-2", isSubItem && "pl-4")}>
                        <p className="font-bold text-slate-900 text-[12px] leading-tight">{r.parameter}</p>
                        {r.comments && <p className="text-[10px] text-slate-500 italic leading-none">{r.comments}</p>}
                        {r.interpretation && <p className="text-[10px] text-slate-700 leading-tight">{r.interpretation}</p>}
                      </td>
                      <td
                        className="py-0.5 px-2 text-right font-mono text-[12.5px] text-slate-900"
                        style={{
                          fontWeight: r.value && (r.abnormalFlag || r.criticalFlag) ? 700 : 400,
                        }}
                      >
                        {r.value}
                        {r.value && (r.flag === "High" || r.flag === "Critical High" || r.flag === "Low" || r.flag === "Critical Low") && (
                          <span className="ml-1 text-[10px] font-bold" title={r.flag}>
                            {r.flag.endsWith("High") ? "H" : "L"}
                          </span>
                        )}
                      </td>
                      <td className="py-0.5 px-2 font-mono font-medium text-slate-700 text-[11px]">
                        {r.unit || "—"}
                      </td>
                      <td className="py-0.5 px-2 font-mono font-medium text-slate-700 text-[11px] whitespace-pre-line leading-snug">
                        {r.referenceRange || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Clinical Comments & Pathological Observations */}
            <div style={{ borderTop: "1px solid #cbd5e1", backgroundColor: "transparent", paddingTop: "3px" }}>
              <h4 className="font-bold uppercase tracking-wider text-slate-800 mb-0.5 text-[10.5px]">
                {clinicalNotesConfig.title}
              </h4>
              {typedClinicalNotes ? (
                <p className="text-slate-700 leading-tight whitespace-pre-wrap text-[11px]">
                  {typedClinicalNotes}
                </p>
              ) : clinicalNotesConfig.emptyMode === "dotted-lines" ? (
                <div className="pt-1" aria-hidden="true">
                  {Array.from({ length: clinicalNotesConfig.dottedLineCount || 3 }).map((_, i) => (
                    <div key={i} style={{ borderBottom: "1px dotted #94a3b8", height: "16px" }} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-700 leading-tight whitespace-pre-wrap text-[11px]">
                  {clinicalNotesConfig.defaultText || DEFAULT_CLINICAL_NOTE_TEXT}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Overlay Row: Doctor Signature & Page Indicator */}
          <div 
            className="flex items-end justify-between pt-1" 
            style={{ 
              minHeight: letterhead.id === "aligarh" || letterhead.id === "zipcure" ? "35px" : "75px", 
              zIndex: 10, 
              backgroundColor: "transparent" 
            }}
          >
            <div className="w-1/2" style={{ backgroundColor: "transparent" }}>
              {letterhead.doctorSignatureArea.showOverlayDoctorTitle ? (
                <div className="text-left leading-tight">
                  <p className="font-extrabold text-slate-900 text-[13px] tracking-wide">
                    {letterhead.doctorSignatureArea.doctorName}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600">
                    {letterhead.doctorSignatureArea.doctorCredentials}
                  </p>
                </div>
              ) : (
                /* For Varanasi / Aligarh: signature area shows cleanly from background letterhead */
                <div aria-hidden="true" />
              )}
            </div>
            <div className="text-right text-slate-700 text-[12px] font-bold tracking-wide">
              {letterhead.footerNoteArea.endOfReportText}
            </div>
          </div>
        </article>
      </div>

      {/* Delete Confirmation Modal in Report Detail */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                <p className="text-xs text-[color:var(--muted)]">This will delete the diagnostic report from database.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
              Are you sure you want to permanently delete report <strong>{item.reportNumber}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
              <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={actions.deleteReport.isPending}
                onClick={async () => {
                  if (!canDelete) return;
                  await actions.deleteReport.mutateAsync(item.id);
                  setConfirmDeleteId(null);
                  router.push("/reports");
                }}
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

type DatePreset = "all" | "today" | "week" | "month" | "custom";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function recordDateKey(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return toDateKey(d);
}

function isDateInRange(dateKey: string, from: string, to: string): boolean {
  if (!dateKey) return false;
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  return true;
}

// -------------------------------------------------------------
// DEFAULT REPORT LIST VIEW
// -------------------------------------------------------------
function ReportListView() {
  const router = useRouter();
  const reports = useReports();
  const actions = useReportActions();
  const [currentRole, setCurrentRole] = useState<UserRole | undefined>(undefined);
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const s = authService.getSession();
    if (s?.role) setCurrentRole(s.role);
  }, []);

  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";
  const isFranchise = currentRole === "Franchise";
  const isTechnician = currentRole === "Technician";
  const isPathologist = currentRole === "Pathologist";
  const canViewCreatedBy = isAdmin || isFranchise;
  const canManage = isAdmin || isFranchise || isTechnician || isPathologist;
  const canDelete = canManage && !isTechnician;

  const todayStr = useMemo(() => toDateKey(new Date()), []);
  const dateRange = useMemo(() => {
    if (datePreset === "all") return { from: "", to: "" };
    if (datePreset === "today") return { from: todayStr, to: todayStr };
    if (datePreset === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { from: toDateKey(start), to: todayStr };
    }
    if (datePreset === "month") {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { from: toDateKey(start), to: todayStr };
    }
    let from = customFrom;
    let to = customTo;
    if (from && to && from > to) {
      from = customTo;
      to = customFrom;
    }
    return { from, to };
  }, [datePreset, customFrom, customTo, todayStr]);

  const hasDateFilter = Boolean(dateRange.from || dateRange.to);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  const filteredReports = useMemo(() => {
    const list = (reports.data ?? []) as Report[];
    if (!hasDateFilter) return list;
    return list.filter((report) =>
      isDateInRange(recordDateKey(report.createdAt), dateRange.from, dateRange.to)
    );
  }, [reports.data, hasDateFilter, dateRange.from, dateRange.to]);

  const columns = useMemo(() => {
    const h = createColumnHelper<Report>();
    return [
      h.accessor("reportNumber", {
        header: "Report No.",
        cell: ({ getValue }) => <span className="font-mono font-bold text-[color:var(--foreground)] whitespace-nowrap">{getValue()}</span>
      }),
      h.accessor(row => (row as any).patient?.name || row.patientId, {
        id: "patient",
        header: "Patient",
        cell: ({ getValue }) => <span className="font-medium text-[color:var(--foreground)] whitespace-nowrap">{getValue()}</span>
      }),
      h.accessor(row => (row as any).department || (row.testIds && row.testIds[0]) || "General", {
        id: "department",
        header: "Department / Test",
        cell: ({ getValue }) => <span className="text-[color:var(--muted)] whitespace-nowrap">{getValue()}</span>
      }),
      ...(isAdmin
        ? [
            h.accessor((row: any) => row.franchise?.name || row.franchise?.code || "Central Lab", {
              id: "franchise",
              header: "Franchise",
              cell: ({ getValue }) => (
                <span className="inline-flex items-center rounded-md bg-[#e8f4f7] px-2 py-0.5 text-xs font-semibold text-[#176b87] whitespace-nowrap">
                  {getValue()}
                </span>
              ),
            }),
          ]
        : []),
      ...(canViewCreatedBy
        ? [
            h.accessor((row: any) => row.createdBy || row.pathologist || "System", {
              id: "createdBy",
              header: "Created By",
              cell: ({ getValue }) => (
                <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                  {getValue()}
                </span>
              ),
            }),
          ]
        : []),
      h.accessor("status", {
        header: "Report Status",
        cell: ({ getValue }) => {
          const val = getValue();
          const tone = val === "Approved" ? "success" : val === "Draft" ? "neutral" : val === "Rejected" ? "danger" : "warning";
          return (
            <div className="whitespace-nowrap">
              <StatusBadge tone={tone} size="sm">{val}</StatusBadge>
            </div>
          );
        }
      }),
      h.accessor("createdAt", {
        header: "Generated Date",
        cell: ({ getValue }) => <span className="text-xs text-[color:var(--muted)] font-mono whitespace-nowrap">{getValue() ? String(getValue()).slice(0, 10) : "—"}</span>
      }),
      h.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 justify-end whitespace-nowrap">
            <Link href={`/reports/${row.original.id}`}>
              <Button size="sm" variant="ghost" className="whitespace-nowrap hover:bg-slate-100" leftIcon={<Eye size={13} />}>
                View / Print
              </Button>
            </Link>
            {row.original.status !== "Approved" && (
              <Button
                size="sm"
                variant="primary"
                className="whitespace-nowrap"
                leftIcon={<CheckCircle2 size={13} />}
                onClick={() => actions.approveReport.mutate(row.original.id)}
              >
                Approve
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="danger-outline"
                className="whitespace-nowrap text-rose-600 bg-rose-50/50 hover:bg-rose-100/80 border-rose-200"
                leftIcon={<Trash2 size={13} />}
                onClick={() => setConfirmDeleteReportId(row.original.id)}
              >
                Delete
              </Button>
            )}
          </div>
        )
      })
    ];
  }, [isAdmin, canViewCreatedBy, actions, canDelete]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostic Reports Workflow"
        description="Verify laboratory findings, pathologist digital signatures, and release certified patient reports."
        action={
          <div className="flex gap-2">
            <Link href="/reports/templates">
              <Button variant="outline" leftIcon={<FileText size={15} />}>
                Templates
              </Button>
            </Link>
            <Link href="/reports/new">
              <Button variant="primary" leftIcon={<Plus size={15} />}>
                Generate Report
              </Button>
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[color:var(--surface)] border border-[color:var(--line)] rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-[#176b87]" />
          <span className="text-xs font-bold text-[color:var(--foreground)]">Filter by Date:</span>
          <Select
            value={datePreset}
            onChange={(e) => applyDatePreset(e.target.value as DatePreset)}
            className="h-8 text-xs w-36 font-medium"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">Last week</option>
            <option value="month">Last month</option>
            <option value="custom">Custom range</option>
          </Select>
          {datePreset === "custom" && (
            <>
              <Input
                type="date"
                max={customTo || todayStr}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs w-36 font-medium"
              />
              <span className="text-xs text-[color:var(--muted)]">to</span>
              <Input
                type="date"
                min={customFrom}
                max={todayStr}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 text-xs w-36 font-medium"
              />
            </>
          )}
          {datePreset !== "all" && datePreset !== "custom" && dateRange.from && (
            <span className="text-[11px] text-[color:var(--muted)]">
              {dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} – ${dateRange.to}`}
            </span>
          )}
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 text-rose-600"
              onClick={() => applyDatePreset("all")}
            >
              Clear Date
            </Button>
          )}
        </div>
        <span className="text-xs font-medium text-[color:var(--muted)]">
          Showing <b>{filteredReports.length}</b> reports
        </span>
      </div>
      <DataTable
        columns={columns}
        data={filteredReports}
        isLoading={reports.isLoading}
        isError={reports.isError}
        searchable
        searchPlaceholder="Search reports by patient, code, number..."
        emptyTitle="No diagnostic reports found"
      />

      {/* Delete Confirmation Modal */}
      {confirmDeleteReportId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                <p className="text-xs text-[color:var(--muted)]">This will delete the diagnostic report from database.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
              Are you sure you want to permanently delete this report? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
              <Button variant="ghost" onClick={() => setConfirmDeleteReportId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={actions.deleteReport.isPending}
                onClick={async () => {
                  if (!canDelete || !confirmDeleteReportId) return;
                  await actions.deleteReport.mutateAsync(confirmDeleteReportId);
                  setConfirmDeleteReportId(null);
                }}
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
