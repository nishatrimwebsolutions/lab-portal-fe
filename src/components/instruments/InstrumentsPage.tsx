"use client";
import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Field, Form, Formik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCatchAllPath } from "@/lib/use-catch-all-path";
import { format } from "date-fns";
import {
  Activity, AlertCircle, ArrowLeftRight, Cpu, Download, Pencil, Plus, Power, RefreshCw, Settings2, Share2, Trash2, UploadCloud, Wifi, WifiOff
} from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import {
  Alert, Button, Card, Dot, Field as UIField, FormSection, Grid2, Grid4, Grid3, Input, KPICard, PageHeader, Select, StatusBadge, Tag, Tabs, Textarea, cn
} from "@/components/ui";
import {
  useAnalyzerErrors, useAnalyzerOrders, useAnalyzerResults, useAnalyzerStatus, useAnalyzerMutations, type AnalyzerStatusItem, getAnalyzerAdapter
} from "@/features/analyzer/hooks";
import { useInstrument, useInstrumentMutations, useInstruments } from "@/features/instruments/hooks";
import type { Instrument, InstrumentStatus, ConnectionStatus, InstrumentType } from "@/types/domain";

function safeFormatDate(dateStr?: string | null, pattern: string = "dd MMM HH:mm", fallback: string = "—"): string {
  if (!dateStr || typeof dateStr !== "string") return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, pattern);
  } catch {
    return dateStr;
  }
}

const statusTone = (s: InstrumentStatus) =>
  s === "Online" ? "success" : s === "Offline" ? "neutral" : s === "Maintenance" ? "warning" : "danger";

const connTone = (c: ConnectionStatus) =>
  c === "Connected" ? "success" : c === "Disconnected" ? "neutral" : c === "Connecting" ? "warning" : "danger";

const instrumentSchema = Yup.object({
  name: Yup.string().trim().required("Instrument name is required (. Sysmex XN-550)").min(2, "Name must be at least 2 characters"),
  manufacturer: Yup.string().trim().required("Manufacturer is required (. Sysmex, Roche, Abbott)").min(2, "Manufacturer must be at least 2 characters"),
  model: Yup.string().trim().required("Model identifier is required (. XN-550)"),
  serialNumber: Yup.string().trim().required("Serial number is required (. SN-882910)"),
  department: Yup.string().required("Please select a laboratory department"),
  instrumentType: Yup.string().required("Please select the instrument type"),
  status: Yup.string().required("Please select operational status").oneOf(["Online", "Offline", "Maintenance", "Error"], "Invalid status option"),
  installationDate: Yup.string().required("Installation date is required"),
  connectionStatus: Yup.string().required("Please select connection status").oneOf(["Connected", "Disconnected", "Connecting", "Error"], "Invalid connection status"),
  ipAddress: Yup.string().trim().matches(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^$/, "Please enter a valid IP address (. 192.168.1.101)"),
  location: Yup.string().trim(),
  description: Yup.string().trim(),
});

function InstrumentCard({ instrument, onEdit, onDelete }: Readonly<{ instrument: Instrument; onEdit: (id: string) => void; onDelete: (id: string) => void }>) {
  const dueSoon = (() => {
    if (!instrument.nextMaintenance) return false;
    const t = new Date(instrument.nextMaintenance).getTime();
    return !isNaN(t) && Math.abs(t - Date.now()) < 1000 * 60 * 60 * 24 * 14;
  })();

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            instrument.status === "Online" ? "bg-[color:var(--success-bg)] text-[color:var(--success)]"
            : instrument.status === "Error" ? "bg-[color:var(--danger-bg)] text-[color:var(--danger)]"
            : instrument.status === "Maintenance" ? "bg-[color:var(--warning-bg)] text-[color:var(--warning)]"
            : "bg-[color:var(--surface-2)] text-[color:var(--muted)]"
          )}>
            <Cpu size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[color:var(--foreground)]">{instrument.name}</h3>
            <p className="truncate text-xs text-[color:var(--muted)]">{instrument.manufacturer} {instrument.model}</p>
          </div>
        </div>
        <StatusBadge tone={statusTone(instrument.status)}>{instrument.status}</StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[color:var(--muted)]">Type</dt>
          <dd className="mt-0.5 font-semibold">{instrument.instrumentType}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--muted)]">Department</dt>
          <dd className="mt-0.5 font-semibold">{instrument.department}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--muted)]">Serial Number</dt>
          <dd className="mt-0.5 font-mono text-[11px]">{instrument.serialNumber}</dd>
        </div>
        <div>
          <dt className="text-[color:var(--muted)]">Connection</dt>
          <dd className="mt-0.5 inline-flex items-center gap-1.5">
            <Dot tone={connTone(instrument.connectionStatus)} />
            <span className="font-semibold">{instrument.connectionStatus}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--muted)]">Last maintenance</span>
          <span className="font-semibold">{instrument.lastMaintenance ?? "—"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[color:var(--muted)]">Next maintenance</span>
          <span className={cn("font-semibold", dueSoon && "text-[color:var(--warning)]")}>
            {instrument.nextMaintenance ?? "Not scheduled"}
          </span>
        </div>
        {instrument.lastCommunication && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[color:var(--muted)]">Last sync</span>
            <span className="font-mono">{safeFormatDate(instrument.lastCommunication, "dd MMM HH:mm")}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 pt-3 border-t border-[color:var(--line)]">
        <Link href={`/instruments/${instrument.id}`} className="flex-1">
          <Button size="sm" variant="secondary" fullWidth leftIcon={<Activity size={14} />}>View</Button>
        </Link>
        <button
          type="button"
          onClick={() => onEdit(instrument.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--line)] text-[color:var(--muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]"
          title="Edit"
        ><Pencil size={15} /></button>
        <button
          type="button"
          onClick={() => onDelete(instrument.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--danger-line)] text-[color:var(--danger)] hover:bg-[color:var(--danger-bg)]"
          title="Delete"
        ><Trash2 size={15} /></button>
      </div>
    </Card>
  );
}

function AnalyzerStatusCard({ instrumentId, instrumentName, status }: Readonly<{ instrumentId: string; instrumentName: string; status: AnalyzerStatusItem | undefined }>) {
  const [connecting, setConnecting] = useState(false);
  const adapter = getAnalyzerAdapter(instrumentId, instrumentName);
  const toggle = async () => {
    setConnecting(true);
    try {
      if (status?.connected) await adapter.disconnect();
      else await adapter.connect();
    } finally {
      setTimeout(() => setConnecting(false), 600);
    }
  };

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <Wifi size={16} className="text-[color:var(--success)]" />
          ) : (
            <WifiOff size={16} className="text-[color:var(--muted)]" />
          )}
          <span className="font-semibold">{instrumentName}</span>
        </div>
        <StatusBadge tone={status?.connected ? "success" : "neutral"} size="sm">
          {status?.connected ? "Online" : "Offline"}
        </StatusBadge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-[color:var(--muted)]">Pending results </span>
          <b>{status?.pendingResults ?? 0}</b>
        </div>
        <div>
          <span className="text-[color:var(--muted)]">Pending orders </span>
          <b>{status?.pendingOrders ?? 0}</b>
        </div>
      </div>
      <Button size="sm" variant="outline" fullWidth className="mt-3 h-8" leftIcon={<Power size={12} />} loading={connecting} onClick={toggle}>
        {status?.connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

export function InstrumentsPage({ path: pathProp }: Readonly<{ path?: readonly string[] }>) {
  const routePath = useCatchAllPath();
  const path = pathProp ?? routePath;
  const router = useRouter();
  const mutations = useInstrumentMutations();
  const [view, setView] = useState<"list" | "cards">("cards");
  const [filters, setFilters] = useState({ search: "", status: "All", department: "All" });
  const [tab, setTab] = useState<"instruments" | "integration">("instruments");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const list = useInstruments(filters);
  const detail = useInstrument(path[0] && path[0] !== "new" ? path[0] : "");
  const analyzerStatus = useAnalyzerStatus();
  const analyzerResults = useAnalyzerResults();
  const analyzerOrders = useAnalyzerOrders();
  const analyzerErrors = useAnalyzerErrors();
  const analyzerMutations = useAnalyzerMutations();

  const departments = useMemo(() => {
    const set = new Set<string>();
    (list.data ?? []).forEach((i) => set.add(i.department));
    return Array.from(set);
  }, [list.data]);

  const columns = useMemo(() => {
    const h = createColumnHelper<Instrument>();
    return [
      h.display({
        id: "name",
        header: "Instrument",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--brand-600)]"><Cpu size={16} /></div>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-xs text-[color:var(--muted)]">{row.original.manufacturer} {row.original.model}</p>
            </div>
          </div>
        ),
      }),
      h.accessor("department", { header: "Department" }),
      h.accessor("instrumentType", { header: "Type", cell: ({ getValue }) => <Tag tone="info">{getValue()}</Tag> }),
      h.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge tone={statusTone(getValue())}>{getValue()}</StatusBadge> }),
      h.accessor("connectionStatus", {
        header: "Connection",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <Dot tone={connTone(getValue())} />
            {getValue()}
          </span>
        ),
      }),
      h.accessor("nextMaintenance", {
        header: "Next Maintenance",
        cell: ({ getValue }) => <span className="text-xs font-mono">{getValue() ?? "—"}</span>,
      }),
      h.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1">
            <Link href={`/instruments/${row.original.id}`}><Button size="sm" variant="ghost">View</Button></Link>
          </div>
        ),
      }),
    ] as const;
  }, []);

  if (path[0] === "new" || path[1] === "edit") {
    const isNew = path[0] === "new";
    const id = isNew ? "" : path[0];

    if (!isNew && detail.isLoading) {
      return (
        <div className="flex min-h-[300px] items-center justify-center text-sm text-[color:var(--muted)]">
          Loading instrument details…
        </div>
      );
    }

    const current = detail.data;
    const initial = isNew || !current
      ? {
          name: "",
          manufacturer: "",
          model: "",
          serialNumber: "",
          department: "",
          instrumentType: "" as InstrumentType,
          status: "Online" as InstrumentStatus,
          installationDate: "",
          connectionStatus: "Connected" as ConnectionStatus,
          lastMaintenance: "",
          nextMaintenance: "",
          ipAddress: "",
          location: "",
          description: "",
        }
      : {
          name: current.name ?? "",
          manufacturer: current.manufacturer ?? "",
          model: current.model ?? "",
          serialNumber: current.serialNumber ?? "",
          department: current.department ?? "",
          instrumentType: (current.instrumentType ?? "") as InstrumentType,
          status: (current.status ?? "Online") as InstrumentStatus,
          installationDate: current.installationDate ?? "",
          connectionStatus: (current.connectionStatus ?? "Connected") as ConnectionStatus,
          lastMaintenance: current.lastMaintenance ?? "",
          nextMaintenance: current.nextMaintenance ?? "",
          ipAddress: current.ipAddress ?? "",
          location: current.location ?? "",
          description: current.description ?? "",
        };

    const submit = async (values: typeof initial) => {
      if (isNew) await mutations.create.mutateAsync(values);
      else await mutations.update.mutateAsync({ id, input: values });
      router.push("/instruments");
    };

    return (
      <div className="space-y-6">
        <PageHeader
          title={isNew ? "Add Instrument" : `Edit ${current?.name ?? "Instrument"}`}
          description={isNew ? "Register a laboratory analyzer, connection parameters, and maintenance interval." : "Update device profile, connection settings, and maintenance schedules."}
          action={<Link href="/instruments"><Button variant="ghost">Cancel</Button></Link>}
        />

        <Card>
          <Formik initialValues={initial} validationSchema={instrumentSchema} enableReinitialize onSubmit={submit}>
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-8">
                <FormSection title="Identification" description="Device identifiers, manufacturer, and laboratory department.">
                  <Grid2>
                    <UIField label="Instrument Name" name="name" required error={touched.name ? errors.name : undefined}>
                      <Field name="name" as={Input} placeholder="Sysmex XN-550" />
                    </UIField>
                    <UIField label="Manufacturer" name="manufacturer" required error={touched.manufacturer ? errors.manufacturer : undefined}>
                      <Field name="manufacturer" as={Input} placeholder="Sysmex Corporation" />
                    </UIField>
                    <UIField label="Model" name="model" required error={touched.model ? errors.model : undefined}>
                      <Field name="model" as={Input} placeholder="XN-550" />
                    </UIField>
                    <UIField label="Serial Number" name="serialNumber" required error={touched.serialNumber ? errors.serialNumber : undefined}>
                      <Field name="serialNumber" as={Input} placeholder="SN-240188" />
                    </UIField>
                    <UIField label="Department" name="department" required error={touched.department ? errors.department : undefined}>
                      <Field name="department" as={Select}>
                        <option value="">Select department</option>
                        <option>Hematology</option><option>Biochemistry</option><option>Urine</option><option>Electrolytes</option><option>Serology</option><option>Molecular</option>
                      </Field>
                    </UIField>
                    <UIField label="Instrument Type" name="instrumentType" required error={touched.instrumentType ? errors.instrumentType : undefined}>
                      <Field name="instrumentType" as={Select}>
                        <option value="">Select type</option>
                        <option>Hematology Analyzer</option><option>Biochemistry Analyzer</option><option>Urine Analyzer</option><option>Electrolyte Analyzer</option><option>ELISA Reader</option><option>PCR Machine</option><option>Centrifuge</option><option>Microscope</option><option>Other</option>
                      </Field>
                    </UIField>
                  </Grid2>
                </FormSection>

                <FormSection title="Operational Status & Connection" description="Current operational condition and network / interface connectivity.">
                  <Grid2>
                    <UIField label="Operational Status" name="status" required error={touched.status ? errors.status : undefined}>
                      <Field name="status" as={Select}>
                        <option value="">Select status</option>
                        <option>Online</option><option>Offline</option><option>Maintenance</option><option>Error</option>
                      </Field>
                    </UIField>
                    <UIField label="Connection Status" name="connectionStatus" required error={touched.connectionStatus ? errors.connectionStatus : undefined}>
                      <Field name="connectionStatus" as={Select}>
                        <option value="">Select connection</option>
                        <option>Connected</option><option>Disconnected</option><option>Connecting</option><option>Error</option>
                      </Field>
                    </UIField>
                    <UIField label="IP Address" name="ipAddress" error={touched.ipAddress ? errors.ipAddress : undefined}>
                      <Field name="ipAddress" as={Input} placeholder="192.168.1.101" />
                    </UIField>
                    <UIField label="Laboratory Location / Bay" name="location">
                      <Field name="location" as={Input} placeholder="Hematology Lab, Bench 2" />
                    </UIField>
                  </Grid2>
                </FormSection>

                <FormSection title="Lifecycle & Maintenance" description="Installation milestones and periodic maintenance scheduling.">
                  <Grid3>
                    <UIField label="Installation Date" name="installationDate" required error={touched.installationDate ? errors.installationDate : undefined}>
                      <Field name="installationDate" type="date" as={Input} />
                    </UIField>
                    <UIField label="Last Maintenance" name="lastMaintenance">
                      <Field name="lastMaintenance" type="date" as={Input} />
                    </UIField>
                    <UIField label="Next Scheduled Maintenance" name="nextMaintenance">
                      <Field name="nextMaintenance" type="date" as={Input} />
                    </UIField>
                  </Grid3>
                </FormSection>

                <FormSection title="Operational Notes" description="Service contract numbers, interface notes, or special handling.">
                  <UIField label="Description / Notes" name="description">
                    <Field name="description" as={Textarea} placeholder="5-part differential automated analyzer with bidirectional barcode integration." />
                  </UIField>
                </FormSection>

                <div className="flex justify-end gap-3 pt-4 border-t border-[color:var(--line)]">
                  <Link href="/instruments"><Button variant="ghost">Cancel</Button></Link>
                  <Button type="submit" variant="primary" loading={isSubmitting || mutations.create.isPending || mutations.update.isPending}>
                    {isNew ? "Create Instrument" : "Save Changes"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card>
      </div>
    );
  }

  // Detail view
  if (path[0]) {
    const ins = detail.data;
    if (detail.isLoading) return <div className="p-8 text-center text-sm text-[color:var(--muted)]">Loading instrument profile…</div>;
    if (!ins) return <div className="p-8 text-center text-sm text-[color:var(--muted)]">Instrument not found.</div>;

    const status = analyzerStatus.data?.find((s) => s.instrumentId === ins.id);
    const recentOrders = (analyzerOrders.data ?? []).filter((o) => o.instrumentId === ins.id).slice(0, 5);
    const recentResults = (analyzerResults.data ?? []).filter((r) => r.instrumentId === ins.id).slice(0, 8);
    const relatedErrors = (analyzerErrors.data ?? []).filter((e) => e.instrumentId === ins.id);

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Instrument Profile"
          title={ins.name}
          description={`${ins.manufacturer} ${ins.model} · Serial ${ins.serialNumber} · ${ins.department} Department`}
          action={
            <div className="flex gap-2">
              <Link href="/instruments"><Button variant="ghost">Back</Button></Link>
              <Link href={`/instruments/${ins.id}/edit`}><Button variant="secondary" leftIcon={<Pencil size={14} />}>Edit</Button></Link>
              <Button variant="danger" leftIcon={<Trash2 size={14} />} onClick={() => setConfirmDelete(ins.id)}>Delete</Button>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Instrument Overview</h3>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Installation, identification, and interface information.</p>
                </div>
                <StatusBadge tone={statusTone(ins.status)}>{ins.status}</StatusBadge>
              </div>
              <dl className="grid gap-px overflow-hidden rounded-xl border bg-[color:var(--line)] sm:grid-cols-2 text-sm">
                {[
                  ["Manufacturer", ins.manufacturer], ["Model", ins.model], ["Serial Number", ins.serialNumber],
                  ["Type", ins.instrumentType], ["Department", ins.department], ["Installation Date", ins.installationDate],
                  ["Last Maintenance", ins.lastMaintenance ?? "—"], ["Next Maintenance", ins.nextMaintenance ?? "—"],
                  ["Last Sync", safeFormatDate(ins.lastCommunication, "dd MMM yyyy HH:mm", "Never")],
                  ["IP Address", ins.ipAddress ?? "—"], ["Location", ins.location ?? "—"], ["Connection", ins.connectionStatus],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[color:var(--surface)] p-3.5">
                    <dt className="text-xs text-[color:var(--muted)]">{k}</dt>
                    <dd className="mt-1 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {ins.description && (
                <div className="mt-4 rounded-xl bg-[color:var(--surface-2)] p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Notes</p>
                  <p className="mt-1.5 text-[color:var(--foreground)]">{ins.description}</p>
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Analyzer Interface</h3>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Bidirectional middleware status — ready for backend LIS integration.</p>
                </div>
                <Button size="sm" variant="outline" leftIcon={<Settings2 size={14} />}>Configure</Button>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <AnalyzerStatusCard instrumentId={ins.id} instrumentName={ins.name} status={status} />
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Integration Capabilities</h4>
                  <ul className="space-y-2 text-sm">
                    {[
                      { l: "ASTM / HL7 protocol adapter", ok: true },
                      { l: "Bidirectional order transmission", ok: true },
                      { l: "Auto-matching by barcode", ok: true },
                      { l: "Automated QC import", ok: ins.instrumentType !== "Centrifuge" && ins.instrumentType !== "Microscope" },
                      { l: "Real-time status poll", ok: true },
                      { l: "Audit log / traceability", ok: true },
                    ].map((r) => (
                      <li key={r.l} className="flex items-center gap-2 text-xs">
                        <Dot tone={r.ok ? "success" : "neutral"} />
                        <span className={r.ok ? "text-[color:var(--foreground)]" : "text-[color:var(--muted)]"}>{r.l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="mb-3 text-sm font-semibold">Recent Orders</h3>
              {recentOrders.length === 0 ? (
                <p className="text-xs text-[color:var(--muted)]">No orders transmitted yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentOrders.map((o) => (
                    <li key={o.id} className="rounded-lg border border-[color:var(--line)] p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">{o.barcode}</span>
                        <StatusBadge tone={o.status === "Acknowledged" ? "success" : o.status === "Error" ? "danger" : "warning"} size="sm">{o.status}</StatusBadge>
                      </div>
                      <p className="mt-1 text-[color:var(--muted)]">{o.testCodes.join(", ")} · {safeFormatDate(o.sentAt, "dd MMM HH:mm")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold">Incoming Results</h3>
              {recentResults.length === 0 ? (
                <p className="text-xs text-[color:var(--muted)]">No results received.</p>
              ) : (
                <ul className="space-y-3">
                  {recentResults.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-xs border-b border-[color:var(--line-2)] pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold">{r.testCode} · <span className="text-[color:var(--muted)] font-normal">{r.testName}</span></p>
                        <p className="mt-0.5 text-[color:var(--muted)]">{r.barcode ?? "unmatched"} · {safeFormatDate(r.receivedAt, "dd MMM HH:mm")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{r.value} <span className="text-[color:var(--muted)] font-normal">{r.unit}</span></p>
                        <StatusBadge tone={r.status === "Matched" ? "success" : r.status === "Error" ? "danger" : r.status === "Unmatched" ? "warning" : "info"} size="sm">{r.status}</StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {relatedErrors.length > 0 && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Integration Errors</h3>
                  <AlertCircle size={14} className="text-[color:var(--danger)]" />
                </div>
                <ul className="space-y-2.5">
                  {relatedErrors.map((e) => (
                    <li key={e.id} className={cn("rounded-lg border p-2.5 text-xs", e.acknowledged ? "border-[color:var(--line)] bg-[color:var(--surface-2)] opacity-70" : "border-[color:var(--danger-line)] bg-[color:var(--danger-bg)]")}>
                      <div className="flex items-start justify-between gap-2">
                        <StatusBadge tone={e.acknowledged ? "neutral" : "danger"} size="sm">{e.errorType}</StatusBadge>
                        {!e.acknowledged && (
                          <button onClick={() => analyzerMutations.acknowledgeError.mutate(e.id)} className="text-[11px] font-semibold text-[color:var(--danger)] hover:underline">
                            Acknowledge
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-[color:var(--foreground)]">{e.message}</p>
                      <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">{safeFormatDate(e.timestamp, "dd MMM yyyy HH:mm")}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quality & Operations"
        title="Instruments"
        description="Manage laboratory analyzers and devices. Monitor connection status, maintenance cycles, and bi-directional interface health."
        action={
          <Link href="/instruments/new">
            <Button variant="primary" leftIcon={<Plus size={15} />}>Add Instrument</Button>
          </Link>
        }
      />

      <Tabs
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "instruments", label: "Instruments", badge: list.data ? String(list.data.length) : undefined },
          { key: "integration", label: "Analyzer Integration", badge: analyzerErrors.data?.filter(e => !e.acknowledged).length ? String(analyzerErrors.data.filter(e => !e.acknowledged).length) : undefined, tone: analyzerErrors.data?.filter(e => !e.acknowledged).length ? "danger" : "neutral" },
        ]}
      />

      {tab === "instruments" && (
        <>
          <div className="flex flex-wrap gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search name, manufacturer, serial…" className="h-9 w-64 pl-9" />
              <Select className="h-9 w-36" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="All">All statuses</option>
                <option>Online</option><option>Offline</option><option>Maintenance</option><option>Error</option>
              </Select>
              <Select className="h-9 w-40" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                <option value="All">All departments</option>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </div>
            <div className="inline-flex items-center rounded-[10px] border border-[color:var(--line)] bg-[color:var(--surface)] p-0.5">
              <button
                onClick={() => setView("cards")}
                className={cn("h-8 rounded-md px-3 text-xs font-semibold transition-colors", view === "cards" ? "bg-[color:var(--brand-50)] text-[color:var(--brand-600)]" : "text-[color:var(--muted)]")}
              >Cards</button>
              <button
                onClick={() => setView("list")}
                className={cn("h-8 rounded-md px-3 text-xs font-semibold transition-colors", view === "list" ? "bg-[color:var(--brand-50)] text-[color:var(--brand-600)]" : "text-[color:var(--muted)]")}
              >Table</button>
            </div>
          </div>

          {view === "cards" ? (
            <Grid3>
              {(list.data ?? []).map((i) => (
                <InstrumentCard key={i.id} instrument={i} onEdit={(id) => router.push(`/instruments/${id}/edit`)} onDelete={(id) => setConfirmDelete(id)} />
              ))}
              {list.data?.length === 0 && !list.isLoading && (
                <div className="col-span-full">No instruments match the current filters.</div>
              )}
            </Grid3>
          ) : (
            <DataTable
              columns={[...columns]}
              data={list.data}
              isLoading={list.isLoading}
              isError={list.isError}
              pageSize={10}
              emptyTitle="No instruments registered"
              emptyDescription="Add your first analyzer or device to begin maintenance and integration tracking."
              emptyIcon={Cpu}
            />
          )}
        </>
      )}

      {tab === "integration" && (
        <div className="space-y-6">
          <Grid4>
            <KPICard label="Connected" value={analyzerStatus.data?.filter(s => s.connected).length ?? 0} icon={Wifi} iconTone="success" supportingText={`of ${analyzerStatus.data?.length ?? 0} instruments`} isLoading={analyzerStatus.isLoading} />
            <KPICard label="Results today" value={analyzerResults.data?.length ?? 0} icon={UploadCloud} iconTone="info" supportingText="Received from analyzers" isLoading={analyzerResults.isLoading} />
            <KPICard label="Orders queued" value={analyzerOrders.data?.filter(o => o.status !== "Acknowledged").length ?? 0} icon={ArrowLeftRight} iconTone="warning" supportingText="Awaiting analyzer ack" isLoading={analyzerOrders.isLoading} />
            <KPICard label="Active errors" value={analyzerErrors.data?.filter(e => !e.acknowledged).length ?? 0} icon={AlertCircle} iconTone="danger" supportingText="Require attention" isLoading={analyzerErrors.isLoading} />
          </Grid4>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Analyzer Connections</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(list.data ?? []).slice(0, 6).map((i) => (
                  <AnalyzerStatusCard key={i.id} instrumentId={i.id} instrumentName={i.name} status={analyzerStatus.data?.find((s) => s.instrumentId === i.id)} />
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="mb-4 text-sm font-semibold">Integration Errors</h3>
              {analyzerErrors.data?.length === 0 ? (
                <div className="py-6 text-center text-xs text-[color:var(--muted)]">No integration errors — all systems nominal.</div>
              ) : (
                <ul className="space-y-2">
                  {(analyzerErrors.data ?? []).map((e) => (
                    <li key={e.id} className={cn("rounded-lg border p-3 text-xs", e.acknowledged ? "border-[color:var(--line)] bg-[color:var(--surface-2)] opacity-70" : "border-[color:var(--danger-line)] bg-[color:var(--danger-bg)]")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{e.instrumentName}</span>
                            <StatusBadge tone={e.acknowledged ? "neutral" : "danger"} size="sm">{e.errorType}</StatusBadge>
                          </div>
                          <p className="mt-1 text-[color:var(--foreground)]">{e.message}</p>
                          <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">{safeFormatDate(e.timestamp, "dd MMM yyyy HH:mm")}</p>
                        </div>
                        {!e.acknowledged && (
                          <button onClick={() => analyzerMutations.acknowledgeError.mutate(e.id)} className="text-[11px] font-semibold text-[color:var(--danger)] hover:underline shrink-0">
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[55] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--danger-bg)] text-[color:var(--danger)]"><AlertCircle size={20} /></div>
              <div>
                <h3 className="text-base font-semibold">Delete this instrument?</h3>
                <p className="mt-1 text-xs text-[color:var(--muted)]">This will remove the record and its associated maintenance tracking. Analyzer integration history will be retained.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={mutations.remove.isPending}
                onClick={() => mutations.remove.mutateAsync(confirmDelete).then(() => setConfirmDelete(null))}
              >Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
