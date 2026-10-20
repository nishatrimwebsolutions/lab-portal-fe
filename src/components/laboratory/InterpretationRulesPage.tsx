"use client";
import React, { useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Power, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, StatusBadge, cn } from "@/components/ui/index";
import { useInterpretationRuleMutations, useInterpretationRules } from "@/features/interpretation/hooks";
import { useFranchise } from "@/lib/context/franchise-context";
import { authService } from "@/lib/auth/auth-service";
import { INTERPRETATION_FLAGS } from "@/lib/laboratory/interpretation-engine";
import type { InterpretationRule } from "@/types/domain";

const MANAGER_ROLES = ["Administrator", "Admin", "Pathologist"];
const STATUS_TABS = ["Draft", "Approved", "Inactive", "All"] as const;

type BandRow = { above: string; upTo: string; flag: string; label: string; text: string };
type OutcomeRow = { values: string; flag: string; label: string; text: string };
type FormState = {
  id?: string;
  parameterKey: string;
  parameterName: string;
  aliases: string;
  testName: string;
  franchiseId: string;
  gender: "Both" | "Male" | "Female";
  ageMinYears: string;
  ageMaxYears: string;
  unit: string;
  resultType: "Numeric" | "Qualitative";
  normalMin: string;
  normalMax: string;
  criticalLow: string;
  criticalHigh: string;
  lowText: string;
  normalText: string;
  highText: string;
  criticalText: string;
  referenceRangeText: string;
  notes: string;
  bands: BandRow[];
  outcomes: OutcomeRow[];
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

const emptyForm = (): FormState => ({
  parameterKey: "", parameterName: "", aliases: "", testName: "", franchiseId: "", gender: "Both", ageMinYears: "", ageMaxYears: "",
  unit: "", resultType: "Numeric", normalMin: "", normalMax: "", criticalLow: "", criticalHigh: "", lowText: "", normalText: "",
  highText: "", criticalText: "", referenceRangeText: "", notes: "", bands: [], outcomes: [],
});

const toForm = (r: InterpretationRule): FormState => ({
  id: r.id,
  parameterKey: r.parameterKey,
  parameterName: r.parameterName,
  aliases: (r.aliases || []).join(", "),
  testName: str(r.testName),
  franchiseId: str(r.franchiseId),
  gender: r.gender,
  ageMinYears: str(r.ageMinYears),
  ageMaxYears: str(r.ageMaxYears),
  unit: str(r.unit),
  resultType: r.resultType,
  normalMin: str(r.normalMin),
  normalMax: str(r.normalMax),
  criticalLow: str(r.criticalLow),
  criticalHigh: str(r.criticalHigh),
  lowText: str(r.lowText),
  normalText: str(r.normalText),
  highText: str(r.highText),
  criticalText: str(r.criticalText),
  referenceRangeText: str(r.referenceRangeText),
  notes: str(r.notes),
  bands: (r.bands || []).map((b) => ({ above: str(b.above), upTo: str(b.upTo), flag: b.flag, label: str(b.label), text: str(b.text) })),
  outcomes: (r.outcomes || []).map((o) => ({ values: (o.values || []).join(", "), flag: o.flag, label: str(o.label), text: str(o.text) })),
});

const toPayload = (f: FormState): Partial<InterpretationRule> => ({
  parameterKey: f.parameterKey.trim(),
  parameterName: f.parameterName.trim(),
  aliases: f.aliases.split(",").map((a) => a.trim()).filter(Boolean),
  testName: f.testName.trim() || null,
  franchiseId: f.franchiseId || null,
  gender: f.gender,
  ageMinYears: num(f.ageMinYears),
  ageMaxYears: num(f.ageMaxYears),
  unit: f.unit.trim() || null,
  resultType: f.resultType,
  normalMin: num(f.normalMin),
  normalMax: num(f.normalMax),
  criticalLow: num(f.criticalLow),
  criticalHigh: num(f.criticalHigh),
  lowText: f.lowText,
  normalText: f.normalText,
  highText: f.highText,
  criticalText: f.criticalText,
  referenceRangeText: f.referenceRangeText,
  notes: f.notes,
  bands: f.resultType === "Numeric" ? f.bands.map((b) => ({ above: num(b.above), upTo: num(b.upTo), flag: b.flag, label: b.label, text: b.text })) : [],
  outcomes: f.outcomes.map((o) => ({ values: o.values.split(",").map((v) => v.trim()).filter(Boolean), flag: o.flag, label: o.label, text: o.text })),
});

const describeAppliesTo = (r: InterpretationRule) => {
  const parts = [r.franchise?.name || "All franchises", r.gender === "Both" ? "Both sexes" : r.gender];
  if (r.ageMinYears != null || r.ageMaxYears != null) parts.push(`Age ${r.ageMinYears ?? 0}–${r.ageMaxYears ?? "∞"} y`);
  return parts.join(" · ");
};

const describeCriteria = (r: InterpretationRule) => {
  if (r.resultType === "Qualitative") return (r.outcomes || []).map((o) => `${o.values.join("/")} → ${o.label || o.flag}`).join("; ");
  const parts: string[] = [];
  if (r.normalMin != null || r.normalMax != null) parts.push(`Normal ${r.normalMin ?? "–"} to ${r.normalMax ?? "–"}${r.unit ? ` ${r.unit}` : ""}`);
  if (r.criticalLow != null || r.criticalHigh != null) parts.push(`Critical ≤${r.criticalLow ?? "–"} / ≥${r.criticalHigh ?? "–"}`);
  if (r.bands?.length) parts.push(`${r.bands.length} categor${r.bands.length === 1 ? "y" : "ies"}`);
  return parts.join(" · ");
};

const inputCls = "w-full rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#176b87]";

export function InterpretationRulesPage() {
  const { selectedFranchiseId, franchises, isFranchiseUser } = useFranchise();
  const [canManage] = useState(() => MANAGER_ROLES.includes(authService.getSession()?.role || ""));
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("Draft");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  const { data: rules = [], isLoading } = useInterpretationRules({ status: statusTab === "All" ? undefined : statusTab, franchiseId: selectedFranchiseId });
  const { save, approve, deactivate, remove } = useInterpretationRuleMutations();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) =>
      [r.parameterName, r.parameterKey, r.testName || "", ...(r.aliases || [])].some((v) => v.toLowerCase().includes(q))
    );
  }, [rules, search]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Action failed.");
    }
  };

  const handleApproveAll = async () => {
    const drafts = filtered.filter((r) => r.status === "Draft");
    if (drafts.length === 0) return;
    if (!window.confirm(`Approve ${drafts.length} draft rule(s) shown? Approved rules are applied automatically to new reports. Review each rule before approving.`)) return;
    let done = 0;
    for (const r of drafts) {
      try {
        await approve.mutateAsync(r.id);
        done++;
      } catch {
        // continue with the remaining rules; count is reported below
      }
    }
    setBulkMessage(`${done} of ${drafts.length} rule(s) approved.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setFormError("");
    try {
      await save.mutateAsync({ id: form.id, input: toPayload(form) });
      setForm(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save rule.");
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnostic reports"
        title="Interpretation Rules"
        description="Rules that automatically interpret entered results (Normal / Low / High / Positive / Negative / test-specific findings) using the patient's age and sex. A rule is applied to new reports only after a pathologist approves it; any edit sends it back to Draft."
        action={
          canManage ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => { setFormError(""); setForm(emptyForm()); }}>
              New Rule
            </Button>
          ) : undefined
        }
      />

      <Card className="flex flex-wrap items-center gap-2 text-xs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setStatusTab(tab); setBulkMessage(""); }}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition",
              statusTab === tab ? "bg-[#176b87] text-white" : "border border-[color:var(--line)] bg-white hover:bg-slate-100"
            )}
          >
            {tab}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[color:var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parameter / test..." className={cn(inputCls, "pl-8 w-60")} />
        </div>
        {canManage && statusTab === "Draft" && filtered.length > 0 && (
          <Button size="sm" variant="outline" leftIcon={<ShieldCheck size={14} />} onClick={handleApproveAll} loading={approve.isPending}>
            Approve all shown ({filtered.length})
          </Button>
        )}
        {bulkMessage && <span className="w-full text-emerald-700 font-medium">{bulkMessage}</span>}
      </Card>

      {isLoading ? (
        <Card><p className="text-xs text-[color:var(--muted)]">Loading rules…</p></Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No rules found" description="Change the status filter or search, or create a new rule." icon={ShieldCheck} />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[color:var(--muted)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Parameter</th>
                  <th className="py-2.5 px-3">Applies to</th>
                  <th className="py-2.5 px-3">Criteria</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-[color:var(--foreground)]">{r.parameterName}</p>
                      <p className="text-[10px] text-[color:var(--muted)] font-mono">{r.parameterKey}{r.testName ? ` · ${r.testName}` : ""}</p>
                    </td>
                    <td className="py-2.5 px-3 text-[color:var(--muted)]">{describeAppliesTo(r)}</td>
                    <td className="py-2.5 px-3 text-[color:var(--muted)] max-w-md">
                      <span className="font-medium text-[color:var(--foreground)]">{r.resultType}</span> · {describeCriteria(r)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge tone={r.status === "Approved" ? "success" : r.status === "Draft" ? "warning" : "neutral"} size="sm">
                        {r.status} · v{r.version}
                      </StatusBadge>
                      {r.status === "Approved" && r.approvedBy && (
                        <p className="text-[10px] text-[color:var(--muted)] mt-1">
                          {r.approvedBy}
                          {r.approvedAt ? ` · ${new Date(r.approvedAt).toLocaleDateString("en-IN")}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" leftIcon={<Pencil size={12} />} onClick={() => { setFormError(""); setForm(toForm(r)); }}>
                          {canManage ? "Edit" : "View"}
                        </Button>
                        {canManage && r.status !== "Approved" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-emerald-700" leftIcon={<CheckCircle2 size={12} />} onClick={() => run(() => approve.mutateAsync(r.id))}>
                            Approve
                          </Button>
                        )}
                        {canManage && r.status === "Approved" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" leftIcon={<Power size={12} />} onClick={() => run(() => deactivate.mutateAsync(r.id))}>
                            Deactivate
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-red-600"
                            leftIcon={<Trash2 size={12} />}
                            onClick={() => window.confirm(`Delete rule for "${r.parameterName}"?`) && run(() => remove.mutateAsync(r.id))}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleSave} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{form.id ? (canManage ? "Edit Interpretation Rule" : "Interpretation Rule") : "New Interpretation Rule"}</h3>
              <button type="button" onClick={() => setForm(null)} className="text-[color:var(--muted)] hover:text-slate-900"><X size={16} /></button>
            </div>
            {form.id && canManage && <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">Saving changes moves this rule back to Draft; it stops applying until it is approved again.</p>}

            <fieldset disabled={!canManage} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Parameter name *"><input required className={inputCls} value={form.parameterName} onChange={(e) => set("parameterName", e.target.value)} placeholder="e.g. HAEMOGLOBIN (Hb)" /></Field>
                <Field label="Parameter key *" hint="Catalog id, e.g. hb, tsh"><input required className={inputCls} value={form.parameterKey} onChange={(e) => set("parameterKey", e.target.value)} /></Field>
                <Field label="Test name"><input className={inputCls} value={form.testName} onChange={(e) => set("testName", e.target.value)} /></Field>
                <Field label="Other names (comma separated)" className="sm:col-span-2"><input className={inputCls} value={form.aliases} onChange={(e) => set("aliases", e.target.value)} placeholder="Hemoglobin, Haemoglobin" /></Field>
                <Field label="Unit" hint="Rule is skipped if result unit differs"><input className={inputCls} value={form.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
                <Field label="Franchise">
                  <select className={inputCls} value={form.franchiseId} onChange={(e) => set("franchiseId", e.target.value)} disabled={isFranchiseUser}>
                    <option value="">All franchises</option>
                    {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>
                <Field label="Sex">
                  <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value as FormState["gender"])}>
                    <option>Both</option><option>Male</option><option>Female</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Age from (years)"><input type="number" step="any" min="0" className={inputCls} value={form.ageMinYears} onChange={(e) => set("ageMinYears", e.target.value)} /></Field>
                  <Field label="Age below (years)"><input type="number" step="any" min="0" className={inputCls} value={form.ageMaxYears} onChange={(e) => set("ageMaxYears", e.target.value)} /></Field>
                </div>
                <Field label="Result type">
                  <select className={inputCls} value={form.resultType} onChange={(e) => set("resultType", e.target.value as FormState["resultType"])}>
                    <option value="Numeric">Numeric (value vs range)</option>
                    <option value="Qualitative">Qualitative (Positive / Negative / text)</option>
                  </select>
                </Field>
              </div>

              {form.resultType === "Numeric" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Normal min"><input type="number" step="any" className={inputCls} value={form.normalMin} onChange={(e) => set("normalMin", e.target.value)} /></Field>
                    <Field label="Normal max"><input type="number" step="any" className={inputCls} value={form.normalMax} onChange={(e) => set("normalMax", e.target.value)} /></Field>
                    <Field label="Critical low (≤)"><input type="number" step="any" className={inputCls} value={form.criticalLow} onChange={(e) => set("criticalLow", e.target.value)} /></Field>
                    <Field label="Critical high (≥)"><input type="number" step="any" className={inputCls} value={form.criticalHigh} onChange={(e) => set("criticalHigh", e.target.value)} /></Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Interpretation when Low"><textarea rows={2} className={inputCls} value={form.lowText} onChange={(e) => set("lowText", e.target.value)} /></Field>
                    <Field label="Interpretation when High"><textarea rows={2} className={inputCls} value={form.highText} onChange={(e) => set("highText", e.target.value)} /></Field>
                    <Field label="Interpretation when Normal (optional)"><textarea rows={2} className={inputCls} value={form.normalText} onChange={(e) => set("normalText", e.target.value)} /></Field>
                    <Field label="Interpretation when Critical (optional)"><textarea rows={2} className={inputCls} value={form.criticalText} onChange={(e) => set("criticalText", e.target.value)} /></Field>
                  </div>
                  <RowsEditor
                    title="Categories (checked before Low/High, first match wins)"
                    hint="Matches when value is above 'Above' and up to 'Up to' (inclusive). Example: Above 100, Up to 125 → Impaired fasting glucose."
                    onAdd={() => set("bands", [...form.bands, { above: "", upTo: "", flag: "High", label: "", text: "" }])}
                    canEdit={canManage}
                  >
                    {form.bands.map((b, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-12 items-start">
                        <input type="number" step="any" placeholder="Above" className={cn(inputCls, "sm:col-span-1")} value={b.above} onChange={(e) => set("bands", form.bands.map((x, j) => (j === i ? { ...x, above: e.target.value } : x)))} />
                        <input type="number" step="any" placeholder="Up to" className={cn(inputCls, "sm:col-span-1")} value={b.upTo} onChange={(e) => set("bands", form.bands.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)))} />
                        <FlagSelect className="sm:col-span-2" value={b.flag} onChange={(v) => set("bands", form.bands.map((x, j) => (j === i ? { ...x, flag: v } : x)))} />
                        <input placeholder="Label (e.g. Prediabetes range)" className={cn(inputCls, "sm:col-span-3")} value={b.label} onChange={(e) => set("bands", form.bands.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                        <input placeholder="Interpretation text" className={cn(inputCls, "sm:col-span-4")} value={b.text} onChange={(e) => set("bands", form.bands.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                        <RemoveButton onClick={() => set("bands", form.bands.filter((_, j) => j !== i))} />
                      </div>
                    ))}
                  </RowsEditor>
                </>
              )}

              <RowsEditor
                title={form.resultType === "Qualitative" ? "Result outcomes *" : "Text results (optional, e.g. 'Reactive')"}
                hint="Enter the exact result options (comma separated) that map to each flag."
                onAdd={() => set("outcomes", [...form.outcomes, { values: "", flag: "Positive", label: "", text: "" }])}
                canEdit={canManage}
              >
                {form.outcomes.map((o, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-12 items-start">
                    <input placeholder="Results, e.g. Positive, Reactive" className={cn(inputCls, "sm:col-span-3")} value={o.values} onChange={(e) => set("outcomes", form.outcomes.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
                    <FlagSelect className="sm:col-span-2" value={o.flag} onChange={(v) => set("outcomes", form.outcomes.map((x, j) => (j === i ? { ...x, flag: v } : x)))} />
                    <input placeholder="Label" className={cn(inputCls, "sm:col-span-2")} value={o.label} onChange={(e) => set("outcomes", form.outcomes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input placeholder="Interpretation text" className={cn(inputCls, "sm:col-span-4")} value={o.text} onChange={(e) => set("outcomes", form.outcomes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    <RemoveButton onClick={() => set("outcomes", form.outcomes.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </RowsEditor>

              <Field label="Notes (source / reviewer remarks)"><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
            </fieldset>

            {formError && <p className="text-red-600 font-medium">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>Close</Button>
              {canManage && <Button type="submit" size="sm" loading={save.isPending}>Save as Draft</Button>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, className, children }: Readonly<{ label: string; hint?: string; className?: string; children: React.ReactNode }>) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[color:var(--muted)]">{hint}</span>}
    </label>
  );
}

function FlagSelect({ value, onChange, className }: Readonly<{ value: string; onChange: (v: string) => void; className?: string }>) {
  return (
    <select className={cn(inputCls, className)} value={value} onChange={(e) => onChange(e.target.value)}>
      {INTERPRETATION_FLAGS.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  );
}

function RemoveButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button type="button" onClick={onClick} className="sm:col-span-1 inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] py-1.5 text-red-600 hover:bg-red-50">
      <Trash2 size={12} />
    </button>
  );
}

function RowsEditor({ title, hint, onAdd, canEdit, children }: Readonly<{ title: string; hint: string; onAdd: () => void; canEdit: boolean; children: React.ReactNode }>) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-[10px] text-[color:var(--muted)]">{hint}</p>
        </div>
        {canEdit && <Button type="button" size="sm" variant="outline" leftIcon={<Plus size={12} />} onClick={onAdd}>Add</Button>}
      </div>
      {children}
    </div>
  );
}
