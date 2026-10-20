"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock3, Download, IndianRupee, Plus, Printer, RefreshCw, Scale, Trash2, Wallet } from "lucide-react";
import { Button, Card, StatusBadge, cn } from "@/components/ui/index";
import { useCreateDoctorPayment, useDeleteDoctorPayment } from "@/features/crud/hooks";
import { authService } from "@/lib/auth/auth-service";
import { downloadCsv, escapeHtml, formatINR, printHtmlReport } from "@/lib/utils/report-export";
import type { DoctorAccountLedger, DoctorLedgerReport } from "@/types/domain";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"] as const;
const PAYMENT_ROLES = ["Administrator", "Admin", "Franchise", "Billing", "Receptionist"];

const formatYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const EMPTY_LEDGER: DoctorAccountLedger = {
  openingBalance: 0,
  totalBilled: 0,
  totalReceived: 0,
  closingBalance: 0,
  currentOutstanding: 0,
  entries: [],
};

interface DoctorAccountLedgerProps {
  doctor: DoctorLedgerReport["doctor"];
  ledger?: DoctorAccountLedger;
  startDate: string;
  endDate: string;
  onRangeChange: (startDate: string, endDate: string) => void;
  isFetching?: boolean;
}

export function DoctorAccountLedgerPanel({ doctor, ledger = EMPTY_LEDGER, startDate, endDate, onRangeChange, isFetching }: DoctorAccountLedgerProps) {
  // Rendered only after the client-side ledger fetch, so reading the session here cannot cause a hydration mismatch.
  const [canRecordPayment] = useState(() => {
    const role = authService.getSession()?.role;
    return Boolean(role && PAYMENT_ROLES.includes(role));
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [payment, setPayment] = useState({ paymentDate: formatYMD(new Date()), amount: "", paymentMode: "Cash", referenceNo: "", notes: "" });
  const createPayment = useCreateDoctorPayment(doctor.id);
  const deletePayment = useDeleteDoctorPayment(doctor.id);

  const monthValue = startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7) && startDate.endsWith("-01") ? startDate.slice(0, 7) : "";

  const selectMonth = (value: string) => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    onRangeChange(formatYMD(new Date(year, month - 1, 1)), formatYMD(new Date(year, month, 0)));
  };

  const periodLabel = `${startDate || "Beginning"} to ${endDate || "Today"}`;

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const amount = Number(payment.amount);
    if (!payment.paymentDate) return setFormError("Payment date is required.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a valid amount greater than 0.");
    try {
      await createPayment.mutateAsync({
        paymentDate: payment.paymentDate,
        amount,
        paymentMode: payment.paymentMode,
        referenceNo: payment.referenceNo.trim() || undefined,
        notes: payment.notes.trim() || undefined,
      });
      setPayment({ paymentDate: formatYMD(new Date()), amount: "", paymentMode: "Cash", referenceNo: "", notes: "" });
      setShowPaymentForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to record payment.");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm("Delete this payment entry? The outstanding balance will be recalculated.")) return;
    try {
      await deletePayment.mutateAsync(paymentId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete payment entry.");
    }
  };

  const handlePrint = () => {
    const rows = ledger.entries
      .map(
        (entry) => `<tr>
          <td>${escapeHtml(entry.date)}</td>
          <td>${escapeHtml(entry.type === "Bill" ? "Bill" : `Payment${entry.paymentMode ? ` (${entry.paymentMode})` : ""}`)}</td>
          <td>${escapeHtml(entry.reference || "-")}</td>
          <td>${escapeHtml(entry.description)}</td>
          <td class="num">${entry.debit ? escapeHtml(formatINR(entry.debit)) : ""}</td>
          <td class="num">${entry.credit ? escapeHtml(formatINR(entry.credit)) : ""}</td>
          <td class="num">${escapeHtml(formatINR(entry.balance))}</td>
        </tr>`
      )
      .join("");
    printHtmlReport(
      `Doctor Ledger - ${doctor.name}`,
      `<h1>Doctor Ledger Report</h1>
      <p class="meta"><strong>${escapeHtml(doctor.name)}</strong>${doctor.specialty ? ` &middot; ${escapeHtml(doctor.specialty)}` : ""}</p>
      <p class="meta">${escapeHtml(doctor.franchiseName || "")}${doctor.phone ? ` &middot; Ph: ${escapeHtml(doctor.phone)}` : ""}</p>
      <p class="meta">Period: ${escapeHtml(periodLabel)}</p>
      <div class="summary">
        <div><span>Opening Balance</span><strong>${escapeHtml(formatINR(ledger.openingBalance))}</strong></div>
        <div><span>Total Billed</span><strong>${escapeHtml(formatINR(ledger.totalBilled))}</strong></div>
        <div><span>Payment Received</span><strong>${escapeHtml(formatINR(ledger.totalReceived))}</strong></div>
        <div><span>Outstanding (Closing)</span><strong>${escapeHtml(formatINR(ledger.closingBalance))}</strong></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Invoice / Ref No.</th><th>Particulars</th><th class="num">Billed (Dr)</th><th class="num">Received (Cr)</th><th class="num">Balance</th></tr></thead>
        <tbody>
          <tr><td colspan="6"><em>Opening Balance</em></td><td class="num">${escapeHtml(formatINR(ledger.openingBalance))}</td></tr>
          ${rows || `<tr><td colspan="7">No transactions in this period.</td></tr>`}
        </tbody>
        <tfoot><tr><td colspan="4">Total</td><td class="num">${escapeHtml(formatINR(ledger.totalBilled))}</td><td class="num">${escapeHtml(formatINR(ledger.totalReceived))}</td><td class="num">${escapeHtml(formatINR(ledger.closingBalance))}</td></tr></tfoot>
      </table>`
    );
  };

  const handleExport = () => {
    downloadCsv(`doctor-ledger-${doctor.name.replace(/[^a-z0-9]+/gi, "-")}-${startDate || "all"}-${endDate || "today"}.csv`, [
      ["Doctor Ledger Report", doctor.name],
      ["Period", periodLabel],
      [],
      ["Date", "Type", "Invoice / Ref No.", "Particulars", "Billed (Dr)", "Received (Cr)", "Balance"],
      ["", "", "", "Opening Balance", "", "", ledger.openingBalance],
      ...ledger.entries.map((entry) => [
        entry.date,
        entry.type === "Bill" ? "Bill" : `Payment${entry.paymentMode ? ` (${entry.paymentMode})` : ""}`,
        entry.reference || "",
        entry.description,
        entry.debit || "",
        entry.credit || "",
        entry.balance,
      ]),
      ["", "", "", "Total", ledger.totalBilled, ledger.totalReceived, ledger.closingBalance],
    ]);
  };

  const presetClass = (active: boolean) =>
    cn(
      "px-2.5 py-1 rounded font-medium transition text-xs",
      active ? "bg-[#176b87] text-white" : "bg-white border border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-slate-100"
    );
  const now = new Date();
  const thisMonthStart = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = formatYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const lastMonthStart = formatYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = formatYMD(new Date(now.getFullYear(), now.getMonth(), 0));

  return (
    <Card className="border border-[color:var(--line)] shadow-sm overflow-hidden p-0">
      <div className="bg-[#0f172a] text-white px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-emerald-300" />
          <h3 className="text-sm font-bold tracking-tight">Doctor Account Ledger (Dues & Payments)</h3>
          {isFetching && <RefreshCw size={12} className="animate-spin text-slate-400" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" leftIcon={<Printer size={14} />} onClick={handlePrint} className="bg-white text-slate-900">
            Print Ledger
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} className="bg-white text-slate-900">
            Export Excel
          </Button>
          {canRecordPayment && (
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowPaymentForm((v) => !v)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="bg-slate-50 border-b border-[color:var(--line)] px-5 py-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[color:var(--muted)] font-semibold text-[11px]">Period:</span>
        <button type="button" onClick={() => onRangeChange("", "")} className={presetClass(!startDate && !endDate)}>All Time</button>
        <button type="button" onClick={() => onRangeChange(thisMonthStart, thisMonthEnd)} className={presetClass(startDate === thisMonthStart && endDate === thisMonthEnd)}>This Month</button>
        <button type="button" onClick={() => onRangeChange(lastMonthStart, lastMonthEnd)} className={presetClass(startDate === lastMonthStart && endDate === lastMonthEnd)}>Last Month</button>
        <label className="flex items-center gap-1 ml-1">
          <span className="text-[11px] text-[color:var(--muted)]">Month:</span>
          <input type="month" value={monthValue} onChange={(e) => selectMonth(e.target.value)} className="rounded border border-[color:var(--line)] bg-white px-2 py-1 text-xs" />
        </label>
        <label className="flex items-center gap-1 ml-1">
          <Calendar size={13} className="text-[color:var(--muted)]" />
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => onRangeChange(e.target.value, endDate)} className="rounded border border-[color:var(--line)] bg-white px-2 py-1 text-xs" />
          <span className="text-[color:var(--muted)]">to</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => onRangeChange(startDate, e.target.value)} className="rounded border border-[color:var(--line)] bg-white px-2 py-1 text-xs" />
        </label>
      </div>

      {showPaymentForm && canRecordPayment && (
        <form onSubmit={handleSavePayment} className="px-5 py-4 border-b border-[color:var(--line)] bg-emerald-50/40 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 text-xs">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Payment Date *</span>
            <input type="date" required value={payment.paymentDate} max={formatYMD(new Date())} onChange={(e) => setPayment((p) => ({ ...p, paymentDate: e.target.value }))} className="rounded border border-[color:var(--line)] bg-white px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Amount (₹) *</span>
            <input type="number" required min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} className="rounded border border-[color:var(--line)] bg-white px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Mode</span>
            <select value={payment.paymentMode} onChange={(e) => setPayment((p) => ({ ...p, paymentMode: e.target.value }))} className="rounded border border-[color:var(--line)] bg-white px-2 py-1.5">
              {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Reference / UTR / Cheque No.</span>
            <input type="text" maxLength={100} value={payment.referenceNo} onChange={(e) => setPayment((p) => ({ ...p, referenceNo: e.target.value }))} className="rounded border border-[color:var(--line)] bg-white px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Notes</span>
            <input type="text" maxLength={500} value={payment.notes} onChange={(e) => setPayment((p) => ({ ...p, notes: e.target.value }))} className="rounded border border-[color:var(--line)] bg-white px-2 py-1.5" />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" variant="primary" loading={createPayment.isPending}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
          </div>
          {formError && <p className="sm:col-span-2 lg:col-span-6 text-red-600 font-medium">{formError}</p>}
        </form>
      )}

      <div className="p-5 border-b border-[color:var(--line)] grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryTile label="Opening Balance" value={ledger.openingBalance} hint="Due before period" icon={<Wallet size={14} />} tone="slate" />
        <SummaryTile label="Total Billed" value={ledger.totalBilled} hint="Pending bills in period" icon={<IndianRupee size={14} />} tone="sky" />
        <SummaryTile label="Payment Received" value={ledger.totalReceived} hint="Received in period" icon={<CheckCircle2 size={14} />} tone="emerald" />
        <SummaryTile label="Closing Balance" value={ledger.closingBalance} hint="Outstanding at period end" icon={<Clock3 size={14} />} tone="amber" />
        <SummaryTile label="Total Outstanding" value={ledger.currentOutstanding} hint="As of today (all time)" icon={<Scale size={14} />} tone="rose" />
      </div>

      <div className="p-5">
        <p className="text-[11px] text-[color:var(--muted)] mb-2">
          Only bills saved with Payment Status &quot;Pending&quot; are added to the doctor&apos;s dues. Bills marked &quot;Paid&quot; were settled at billing time.
        </p>
        <div className="overflow-x-auto rounded-xl border border-[color:var(--line)] bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[color:var(--muted)] border-b border-[color:var(--line)] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Invoice / Ref No.</th>
                <th className="py-2.5 px-3">Particulars</th>
                <th className="py-2.5 px-3 text-right">Billed (₹)</th>
                <th className="py-2.5 px-3 text-right">Received (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              <tr className="bg-slate-50">
                <td colSpan={6} className="py-2 px-3 italic text-[color:var(--muted)]">Opening Balance</td>
                <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(ledger.openingBalance)}</td>
                <td />
              </tr>
              {ledger.entries.map((entry) => (
                <tr key={`${entry.type}-${entry.id}`} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono text-[11px]">{entry.date}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge tone={entry.type === "Bill" ? "warning" : "success"} size="sm">
                      {entry.type === "Bill" ? "Bill" : `Payment${entry.paymentMode ? ` · ${entry.paymentMode}` : ""}`}
                    </StatusBadge>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#176b87]">{entry.reference || "—"}</td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-[color:var(--muted)]" title={entry.description}>{entry.description}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{entry.debit ? formatINR(entry.debit) : ""}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{entry.credit ? formatINR(entry.credit) : ""}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(entry.balance)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {entry.type === "Bill" ? (
                      <Link href={`/billing/${entry.id}`} className="text-[11px] font-semibold text-[#176b87] hover:underline">View</Link>
                    ) : canRecordPayment ? (
                      <button type="button" onClick={() => handleDeletePayment(entry.id)} disabled={deletePayment.isPending} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50">
                        <Trash2 size={12} /> Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {ledger.entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[color:var(--muted)]">No bills or payments in this period.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t border-[color:var(--line)]">
              <tr>
                <td colSpan={4} className="py-2.5 px-3">Total for period</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatINR(ledger.totalBilled)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatINR(ledger.totalReceived)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatINR(ledger.closingBalance)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  );
}

const TONES = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  sky: "border-sky-100 bg-sky-50/50 text-sky-800",
  emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-800",
  amber: "border-amber-100 bg-amber-50/50 text-amber-800",
  rose: "border-rose-100 bg-rose-50/50 text-rose-800",
} as const;

function SummaryTile({ label, value, hint, icon, tone }: Readonly<{ label: string; value: number; hint: string; icon: React.ReactNode; tone: keyof typeof TONES }>) {
  return (
    <div className={cn("p-3.5 rounded-xl border", TONES[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-lg font-extrabold text-slate-900">{formatINR(value)}</p>
      <p className="text-[10px] text-[color:var(--muted)] mt-0.5">{hint}</p>
    </div>
  );
}
