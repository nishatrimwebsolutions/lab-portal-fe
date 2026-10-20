"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Download, FlaskConical, IndianRupee, Printer, RefreshCw, Users } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, cn } from "@/components/ui/index";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { useTestMasters } from "@/features/test-masters/hooks";
import { useTestWiseReport } from "@/features/dashboard/hooks";
import { useFranchise } from "@/lib/context/franchise-context";
import { downloadCsv, escapeHtml, formatINR, printHtmlReport } from "@/lib/utils/report-export";

const formatYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function TestWiseReportPage() {
  const { selectedFranchiseId, activeFranchiseName } = useFranchise();
  const franchiseId = selectedFranchiseId !== "all" ? selectedFranchiseId : undefined;
  const now = new Date();
  const [testCode, setTestCode] = useState("");
  const [startDate, setStartDate] = useState(formatYMD(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEndDate] = useState(formatYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0)));

  const { data: testMasters = [], isLoading: testsLoading } = useTestMasters(undefined, undefined, 2500, franchiseId);
  const { data: report, isLoading, isFetching, error } = useTestWiseReport(testCode, startDate, endDate, selectedFranchiseId);

  const testOptions = useMemo<ComboboxOption[]>(() => {
    const byCode = new Map<string, ComboboxOption>();
    testMasters.forEach((t) => {
      const code = (t.code || "").trim().toUpperCase();
      if (!code || byCode.has(code)) return;
      byCode.set(code, { value: code, label: t.name, secondary: `${code} · ${t.department || ""}`, badge: t.mrp ? `₹${t.mrp}` : undefined });
    });
    return Array.from(byCode.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [testMasters]);

  const selectedTestLabel = report?.test.name || testOptions.find((o) => o.value === testCode)?.label || testCode;
  const monthValue = startDate.slice(0, 7) === endDate.slice(0, 7) && startDate.endsWith("-01") ? startDate.slice(0, 7) : "";

  const selectMonth = (value: string) => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    setStartDate(formatYMD(new Date(year, month - 1, 1)));
    setEndDate(formatYMD(new Date(year, month, 0)));
  };

  const summary = report?.summary;
  const periodLabel = `${startDate || "Beginning"} to ${endDate || "Today"}`;

  const handlePrint = () => {
    if (!report) return;
    const rows = report.dateWiseBreakdown
      .map(
        (d) => `<tr><td>${escapeHtml(d.date)}</td><td>${escapeHtml(report.test.name)}</td><td class="num">${d.testCount}</td><td class="num">${escapeHtml(d.rates.map(formatINR).join(", "))}</td><td class="num">${escapeHtml(formatINR(d.grossAmount))}</td><td class="num">${escapeHtml(formatINR(d.netAmount))}</td></tr>`
      )
      .join("");
    printHtmlReport(
      `Test-wise Report - ${report.test.name}`,
      `<h1>Test-wise Billing Report</h1>
      <p class="meta"><strong>${escapeHtml(report.test.name)}</strong>${report.test.code ? ` (${escapeHtml(report.test.code)})` : ""}</p>
      <p class="meta">${escapeHtml(activeFranchiseName)} &middot; Period: ${escapeHtml(periodLabel)}</p>
      <div class="summary">
        <div><span>Total Tests</span><strong>${report.summary.totalTests}</strong></div>
        <div><span>Billing at Rate (MRP)</span><strong>${escapeHtml(formatINR(report.summary.totalGross))}</strong></div>
        <div><span>Net Billed (after discount)</span><strong>${escapeHtml(formatINR(report.summary.totalNet))}</strong></div>
        <div><span>Patients</span><strong>${report.summary.uniquePatients}</strong></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Test Name</th><th class="num">No. of Tests</th><th class="num">Rate</th><th class="num">Amount at Rate</th><th class="num">Net Billed</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6">No records in this period.</td></tr>`}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="num">${report.summary.totalTests}</td><td></td><td class="num">${escapeHtml(formatINR(report.summary.totalGross))}</td><td class="num">${escapeHtml(formatINR(report.summary.totalNet))}</td></tr></tfoot>
      </table>`
    );
  };

  const handleExport = () => {
    if (!report) return;
    const safeName = report.test.name.replace(/[^a-z0-9]+/gi, "-");
    downloadCsv(`test-wise-report-${safeName}-${startDate || "all"}-${endDate || "today"}.csv`, [
      ["Test-wise Billing Report", report.test.name, report.test.code],
      ["Franchise", activeFranchiseName],
      ["Period", periodLabel],
      [],
      ["Date-wise Summary"],
      ["Date", "Test Name", "No. of Tests", "Rate", "Amount at Rate", "Net Billed"],
      ...report.dateWiseBreakdown.map((d) => [d.date, report.test.name, d.testCount, d.rates.join(" / "), d.grossAmount, d.netAmount]),
      ["Total", "", report.summary.totalTests, "", report.summary.totalGross, report.summary.totalNet],
      [],
      ["Bill-wise Details"],
      ["Date", "Bill No.", "Patient", "Patient Code", "Doctor", "Franchise", "Qty", "Rate", "Amount at Rate", "Net Billed", "Payment Status"],
      ...report.records.map((r) => [r.date, r.billNumber, r.patientName, r.patientCode, r.doctorName, r.franchiseName, r.quantity, r.rate, r.grossAmount, r.netAmount, r.paymentStatus]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing analysis"
        title="Test-wise Report"
        description="Select a test and period to see date-wise test count and billing generated from actual bills."
        action={
          <>
            <Button variant="outline" size="sm" leftIcon={<Printer size={14} />} onClick={handlePrint} disabled={!report}>Print</Button>
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!report}>Export Excel</Button>
          </>
        }
      />

      <Card className="grid gap-4 md:grid-cols-12 items-end text-xs">
        <div className="md:col-span-5 space-y-1">
          <span className="font-semibold">Test *</span>
          <SearchableCombobox
            options={testOptions}
            value={testCode}
            onChange={(value) => setTestCode(value)}
            placeholder="Select a test..."
            searchPlaceholder="Search by test name or code..."
            loading={testsLoading}
          />
        </div>
        <label className="md:col-span-2 flex flex-col gap-1">
          <span className="font-semibold">Month</span>
          <input type="month" value={monthValue} onChange={(e) => selectMonth(e.target.value)} className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-2" />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1">
          <span className="font-semibold">From</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-2" />
        </label>
        <label className="md:col-span-2 flex flex-col gap-1">
          <span className="font-semibold">To</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-2" />
        </label>
        <div className="md:col-span-1 text-[11px] text-[color:var(--muted)] pb-2">
          {isFetching && <RefreshCw size={14} className="animate-spin text-[#176b87]" />}
        </div>
      </Card>

      {!testCode ? (
        <EmptyState title="Select a test" description="Choose a test from the list to view its date-wise count and billing." icon={FlaskConical} />
      ) : error ? (
        <Card><p className="text-sm text-red-600">{error.message}</p></Card>
      ) : isLoading || !report ? (
        <div className="flex min-h-[200px] items-center justify-center text-xs text-[color:var(--muted)]">
          <RefreshCw size={16} className="animate-spin text-[#176b87] mr-2" /> Loading report…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Total Tests" value={String(summary?.totalTests ?? 0)} hint={`${summary?.activeDays ?? 0} active days`} icon={<FlaskConical size={14} />} tone="border-sky-100 bg-sky-50/50 text-sky-800" />
            <Tile label="Billing at Rate (MRP)" value={formatINR(summary?.totalGross ?? 0)} hint="Rate × number of tests" icon={<IndianRupee size={14} />} tone="border-indigo-100 bg-indigo-50/50 text-indigo-800" />
            <Tile label="Net Billed" value={formatINR(summary?.totalNet ?? 0)} hint={`After bill discount: ${formatINR(summary?.totalDiscount ?? 0)}`} icon={<IndianRupee size={14} />} tone="border-emerald-100 bg-emerald-50/50 text-emerald-800" />
            <Tile label="Patients / Bills" value={`${summary?.uniquePatients ?? 0} / ${summary?.invoiceCount ?? 0}`} hint={selectedTestLabel} icon={<Users size={14} />} tone="border-slate-200 bg-slate-50 text-slate-700" />
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-[color:var(--line)] flex items-center justify-between">
              <h3 className="text-sm font-bold">Date-wise Summary · {selectedTestLabel}</h3>
              <span className="text-[11px] text-[color:var(--muted)] flex items-center gap-1"><Calendar size={12} /> {periodLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[color:var(--muted)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Test Name</th>
                    <th className="py-2.5 px-3 text-right">No. of Tests</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount at Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Net Billed (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {report.dateWiseBreakdown.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-[11px]">{d.date}</td>
                      <td className="py-2 px-3">{report.test.name}</td>
                      <td className="py-2 px-3 text-right font-semibold">{d.testCount}</td>
                      <td className="py-2 px-3 text-right font-mono">{d.rates.map(formatINR).join(", ")}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatINR(d.grossAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(d.netAmount)}</td>
                    </tr>
                  ))}
                  {report.dateWiseBreakdown.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-[color:var(--muted)]">No bills found for this test in the selected period.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3">Total</td>
                    <td className="py-2.5 px-3 text-right">{summary?.totalTests ?? 0}</td>
                    <td />
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(summary?.totalGross ?? 0)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatINR(summary?.totalNet ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-[color:var(--line)]">
              <h3 className="text-sm font-bold">Bill-wise Details ({report.records.length})</h3>
              <p className="text-[11px] text-[color:var(--muted)]">Net billed shares each bill&apos;s discount across its tests in proportion to their rate.</p>
            </div>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[color:var(--muted)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Bill No.</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Net Billed (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {report.records.map((r, index) => (
                    <tr key={`${r.invoiceId}-${index}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-[11px]">{r.date}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#176b87]">
                        <Link href={`/billing/${r.invoiceId}`} className="hover:underline">{r.billNumber}</Link>
                      </td>
                      <td className="py-2 px-3">{r.patientName} <span className="font-mono text-[10px] text-[color:var(--muted)]">{r.patientCode}</span></td>
                      <td className="py-2 px-3 text-[color:var(--muted)]">{r.doctorName || "—"}</td>
                      <td className="py-2 px-3 text-right">{r.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatINR(r.rate)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatINR(r.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, hint, icon, tone }: Readonly<{ label: string; value: string; hint: string; icon: React.ReactNode; tone: string }>) {
  return (
    <div className={cn("p-3.5 rounded-xl border", tone)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-lg font-extrabold text-slate-900">{value}</p>
      <p className="text-[10px] text-[color:var(--muted)] mt-0.5 truncate" title={hint}>{hint}</p>
    </div>
  );
}
