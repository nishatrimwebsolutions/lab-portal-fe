"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Stethoscope, Calendar, IndianRupee, FileText, Users, ArrowUpRight, 
  CheckCircle2, Clock3, Filter, Download, Printer, Search, RefreshCw, 
  ChevronLeft, Building2, Phone, Mail, MapPin, Edit3, Plus, Eye
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { Card, Button, StatusBadge, cn } from "@/components/ui/index";
import { useDoctorLedger } from "@/features/crud/hooks";
import { useFranchise } from "@/lib/context/franchise-context";
import type { DoctorLedgerInvoiceItem } from "@/types/domain";
import { DoctorAccountLedgerPanel } from "@/components/doctors/DoctorAccountLedger";

interface DoctorLedgerViewProps {
  doctorId: string;
  onBack?: () => void;
  className?: string;
}

export function DoctorLedgerView({
  doctorId,
  onBack,
  className = "",
}: DoctorLedgerViewProps) {
  const { isFranchiseUser } = useFranchise();

  // Helper to format date as YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Defaults to 1st of current month to today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("all_time");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patientSearchTerm, setPatientSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"account" | "ledger" | "patients" | "profile">("account");

  const { data: ledgerReport, isLoading, isFetching, refetch } = useDoctorLedger(
    doctorId,
    startDate,
    endDate
  );

  const doctor = ledgerReport?.doctor;
  const summary = ledgerReport?.summary || {
    totalBusiness: 0,
    totalPaid: 0,
    totalPending: 0,
    totalDiscount: 0,
    totalInvoices: 0,
    totalPatients: 0,
    averageInvoiceValue: 0,
  };
  const dateWiseBreakdown = ledgerReport?.dateWiseBreakdown || [];
  const rawInvoices = ledgerReport?.invoices || [];
  const rawPatients = ledgerReport?.patients || [];

  // Quick Preset Handlers
  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(now));
    } else if (preset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
    } else if (preset === "last_30_days") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(now));
    } else if (preset === "today") {
      setStartDate(formatYMD(now));
      setEndDate(formatYMD(now));
    } else if (preset === "all_time") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          inv.billNumber.toLowerCase().includes(q) ||
          inv.patientName.toLowerCase().includes(q) ||
          inv.patientCode.toLowerCase().includes(q) ||
          (inv.itemsSummary && inv.itemsSummary.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [rawInvoices, statusFilter, searchTerm]);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return rawPatients.filter((p) => {
      if (patientSearchTerm.trim()) {
        const q = patientSearchTerm.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.patientCode.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rawPatients, patientSearchTerm]);

  // Chart data
  const chartData = useMemo(() => {
    return dateWiseBreakdown
      .slice()
      .reverse()
      .map((d) => ({
        date: d.date.length >= 10 ? d.date.slice(5) : d.date,
        fullDate: d.date,
        business: d.totalBusiness,
        paid: d.totalPaid,
        pending: d.totalPending,
        invoices: d.invoiceCount,
      }));
  }, [dateWiseBreakdown]);

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setActivePreset(start || end ? "custom" : "all_time");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center text-xs text-[color:var(--muted)]">
        <RefreshCw size={18} className="animate-spin text-[#176b87] mr-2" />
        Loading Doctor Ledger & Business Profile…
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Doctor Record Not Found</p>
        <p className="text-xs text-[color:var(--muted)] mt-1">The requested doctor profile or ledger does not exist or you do not have permission to view it.</p>
        <Link href="/doctors" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to Doctors Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 max-w-6xl mx-auto", className)}>
      {/* 1. Header Navigation & Doctor Banner */}
      <div className="rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid size-12 place-items-center rounded-xl bg-[#e8f4f7] text-[#176b87]">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[color:var(--foreground)]">
                  {doctor.name}
                </h1>
                <StatusBadge tone="success" size="sm">Registered Doctor</StatusBadge>
              </div>
              <p className="text-xs text-[#176b87] font-semibold mt-0.5">
                {doctor.specialty || "General / Referring Physician"}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)] mt-2">
                {doctor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {doctor.phone}
                  </span>
                )}
                {doctor.email && (
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Mail size={12} /> {doctor.email}
                  </span>
                )}
                {doctor.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {doctor.city}
                  </span>
                )}
                <span className="flex items-center gap-1 font-semibold text-[#176b87]">
                  <Building2 size={12} /> {doctor.franchiseName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/doctors">
              <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />}>
                Doctors List
              </Button>
            </Link>
            <Link href={`/doctors/${doctor.id}/edit`}>
              <Button variant="outline" size="sm" leftIcon={<Edit3 size={14} />}>
                Edit Doctor
              </Button>
            </Link>
            <Link href={`/billing/new?doctorId=${doctor.id}&franchiseId=${doctor.franchiseId || ""}`}>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>
                New Bill for Doctor
              </Button>
            </Link>
            <Button variant="outline" size="sm" leftIcon={<Printer size={14} />} onClick={handlePrint}>
              Print Page
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-t border-[color:var(--line)] mt-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition",
              activeTab === "account"
                ? "bg-[#176b87] text-white shadow-xs"
                : "text-[color:var(--muted)] hover:bg-slate-100"
            )}
          >
            💳 Account Ledger (Dues & Payments)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition",
              activeTab === "ledger"
                ? "bg-[#176b87] text-white shadow-xs"
                : "text-[color:var(--muted)] hover:bg-slate-100"
            )}
          >
            📊 Business Ledger & Invoices ({rawInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("patients")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition",
              activeTab === "patients"
                ? "bg-[#176b87] text-white shadow-xs"
                : "text-[color:var(--muted)] hover:bg-slate-100"
            )}
          >
            👥 Referred Patients ({rawPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition",
              activeTab === "profile"
                ? "bg-[#176b87] text-white shadow-xs"
                : "text-[color:var(--muted)] hover:bg-slate-100"
            )}
          >
            👤 Doctor Profile Details
          </button>
        </div>
      </div>

      {activeTab === "account" ? (
        <DoctorAccountLedgerPanel
          doctor={doctor}
          ledger={ledgerReport?.ledger}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleRangeChange}
          isFetching={isFetching}
        />
      ) : activeTab === "ledger" ? (
        <Card className="border border-[color:var(--line)] shadow-sm overflow-hidden p-0">
          {/* 2. Date Range Filter Bar */}
          <div className="bg-[#0f172a] text-white px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-tight">Doctor Referral Business Ledger</h3>
              {isFetching && <RefreshCw size={12} className="animate-spin text-slate-400" />}
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1 text-xs">
              <div className="flex items-center gap-1 px-1.5 text-slate-300">
                <Calendar size={13} />
                <span className="font-medium text-[11px]">From:</span>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset("custom");
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
              <span className="text-slate-400 text-xs px-0.5">–</span>
              <div className="flex items-center gap-1 px-1.5 text-slate-300">
                <span className="font-medium text-[11px]">To:</span>
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset("custom");
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="bg-slate-50 border-b border-[color:var(--line)] px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[color:var(--muted)] font-semibold text-[11px]">Period Presets:</span>
              <button
                type="button"
                onClick={() => handlePreset("all_time")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition text-xs",
                  activePreset === "all_time"
                    ? "bg-[#176b87] text-white"
                    : "bg-white border border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-slate-100"
                )}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handlePreset("this_month")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition text-xs",
                  activePreset === "this_month"
                    ? "bg-[#176b87] text-white"
                    : "bg-white border border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-slate-100"
                )}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("last_month")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition text-xs",
                  activePreset === "last_month"
                    ? "bg-[#176b87] text-white"
                    : "bg-white border border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-slate-100"
                )}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("last_30_days")}
                className={cn(
                  "px-2.5 py-1 rounded font-medium transition text-xs",
                  activePreset === "last_30_days"
                    ? "bg-[#176b87] text-white"
                    : "bg-white border border-[color:var(--line)] text-[color:var(--foreground)] hover:bg-slate-100"
                )}
              >
                Last 30 Days
              </button>
            </div>

            <div className="text-[11px] text-[color:var(--muted)]">
              Showing: <span className="font-bold text-[color:var(--foreground)]">{startDate || "All Beginning"}</span> to{" "}
              <span className="font-bold text-[color:var(--foreground)]">{endDate || "Present"}</span>
            </div>
          </div>

          {/* 3. Executive Business Metrics Grid */}
          <div className="p-5 border-b border-[color:var(--line)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Metric 1: Total Business */}
              <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/50">
                <div className="flex items-center justify-between text-sky-800">
                  <span className="text-[10px] font-bold uppercase">Total Business</span>
                  <IndianRupee size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-slate-900">₹{summary.totalBusiness.toLocaleString()}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Referred Diagnostic Total</p>
                </div>
              </div>

              {/* Metric 2: Paid Business */}
              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-[10px] font-bold uppercase">Collected / Paid</span>
                  <CheckCircle2 size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-emerald-700">₹{summary.totalPaid.toLocaleString()}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Cleared Collections</p>
                </div>
              </div>

              {/* Metric 3: Pending / Due */}
              <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[10px] font-bold uppercase">Pending / Due</span>
                  <Clock3 size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-amber-700">₹{summary.totalPending.toLocaleString()}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Unsettled Balance</p>
                </div>
              </div>

              {/* Metric 4: Patients Referred */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50">
                <div className="flex items-center justify-between text-indigo-800">
                  <span className="text-[10px] font-bold uppercase">Referred Patients</span>
                  <Users size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-indigo-900">{summary.totalPatients}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Unique Individuals</p>
                </div>
              </div>

              {/* Metric 5: Total Invoices */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-bold uppercase">Invoices</span>
                  <FileText size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-slate-900">{summary.totalInvoices}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Bills Generated</p>
                </div>
              </div>

              {/* Metric 6: Avg Ticket */}
              <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50">
                <div className="flex items-center justify-between text-purple-800">
                  <span className="text-[10px] font-bold uppercase">Avg. Ticket</span>
                  <ArrowUpRight size={14} />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-purple-900">₹{summary.averageInvoiceValue}</p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">Per Referral Order</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Chart & Date-wise Summary */}
          <div className="p-5 grid gap-6 lg:grid-cols-12 border-b border-[color:var(--line)]">
            {/* Chart (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--foreground)]">
                  Daily Referral Business Trend
                </h4>
                <span className="text-[11px] text-[color:var(--muted)]">Amounts in INR (₹)</span>
              </div>

              <div className="h-60 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-[color:var(--line)] bg-slate-900 p-2.5 text-xs text-white shadow-md">
                                <p className="font-bold text-emerald-300">{data.fullDate}</p>
                                <p className="mt-1 font-semibold text-emerald-400">Total Business: ₹{data.business}</p>
                                <p className="text-[11px] text-slate-300">Paid: ₹{data.paid} · Bills: {data.invoices}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="business"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#docGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[color:var(--muted)]">
                    No referral business recorded for this doctor in selected date range.
                  </div>
                )}
              </div>
            </div>

            {/* Date-wise Table (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--foreground)]">
                  Date-wise Referral Summary
                </h4>
                <span className="text-[11px] font-semibold text-[#176b87]">
                  {dateWiseBreakdown.length} Dates
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-[color:var(--muted)] border-b border-[color:var(--line)] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-2 text-right">Bills</th>
                      <th className="py-2 px-2 text-right">Paid (₹)</th>
                      <th className="py-2 px-3 text-right">Business (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--line)]">
                    {dateWiseBreakdown.map((item) => (
                      <tr key={item.date} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-medium font-mono text-[11px]">{item.date}</td>
                        <td className="py-2 px-2 text-right text-[color:var(--muted)]">{item.invoiceCount}</td>
                        <td className="py-2 px-2 text-right text-emerald-700 font-semibold">₹{item.totalPaid}</td>
                        <td className="py-2 px-3 text-right font-bold text-[color:var(--foreground)]">₹{item.totalBusiness}</td>
                      </tr>
                    ))}
                    {dateWiseBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-[color:var(--muted)]">
                          No referrals recorded during this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5. Detailed Referred Invoices Table */}
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[color:var(--foreground)]">
                  Referred Patient Invoices & Tests ({filteredInvoices.length})
                </h4>
                <p className="text-xs text-[color:var(--muted)]">
                  Complete line item bills linked to this doctor's referrals.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-[color:var(--muted)]" />
                  <input
                    type="text"
                    placeholder="Search patient, bill #, test..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-lg border border-[color:var(--line)] bg-white pl-8 pr-3 py-1.5 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#176b87] w-52"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-[color:var(--line)] bg-white px-2.5 py-1.5 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#176b87]"
                >
                  <option value="all">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[color:var(--line)] bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[color:var(--muted)] border-b border-[color:var(--line)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Bill Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Patient Details</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Prescribed Tests / Items</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#176b87]">
                        {inv.billNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[color:var(--muted)]">
                        {inv.billDate || inv.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-[color:var(--foreground)]">{inv.patientName}</p>
                        <p className="font-mono text-[10px] text-[color:var(--muted)]">{inv.patientCode}</p>
                      </td>
                      <td className="py-2.5 px-3 text-[color:var(--muted)] font-mono text-[11px]">
                        {inv.patientPhone || "—"}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-[color:var(--muted)]" title={inv.itemsSummary}>
                        {inv.itemsSummary}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[color:var(--foreground)]">
                        ₹{inv.total}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge tone={inv.paymentStatus === "Paid" ? "success" : "warning"} size="sm">
                          {inv.paymentStatus}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link href={`/billing/${inv.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" leftIcon={<Eye size={12} />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[color:var(--muted)]">
                        No referral billing transactions found for this doctor matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : activeTab === "patients" ? (
        /* Referred Patients Tab */
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[color:var(--line)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[color:var(--foreground)]">
                All Patients Referred by {doctor.name} ({filteredPatients.length})
              </h3>
              <p className="text-xs text-[color:var(--muted)] mt-0.5">
                Patients registered with this doctor as the referral source.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-[color:var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search by name, code, phone..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="rounded-lg border border-[color:var(--line)] bg-white pl-8 pr-3 py-1.5 text-xs text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#176b87] w-64"
                />
              </div>
              <Link href={`/patients/new?doctorId=${encodeURIComponent(doctor.name)}&franchiseId=${doctor.franchiseId || ""}`}>
                <Button size="sm" variant="primary" leftIcon={<Plus size={14} />}>
                  Register Patient
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[color:var(--line)] bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[color:var(--muted)] border-b border-[color:var(--line)] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Patient Code</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Age / Sex</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Registered On</th>
                  <th className="py-2.5 px-3 text-center">Bills Created</th>
                  <th className="py-2.5 px-3 text-right">Total Billed (₹)</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#176b87]">
                      {p.patientCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[color:var(--foreground)]">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3 text-[color:var(--muted)]">
                      {p.age} Y / {p.sex}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[color:var(--muted)]">
                      {p.phone}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[color:var(--muted)]">
                      {p.createdAt ? p.createdAt.slice(0, 10) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                        {p.totalInvoices}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#176b87]">
                      ₹{p.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link href={`/patients/${p.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" leftIcon={<Eye size={12} />}>
                            View
                          </Button>
                        </Link>
                        <Link href={`/billing/new?patientId=${p.id}&patientCode=${p.patientCode}&doctorId=${encodeURIComponent(doctor.name)}&franchiseId=${doctor.franchiseId || ""}`}>
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" leftIcon={<Plus size={12} />}>
                            Bill
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[color:var(--muted)]">
                      No referred patients found for this doctor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Doctor Profile Card */
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[color:var(--foreground)]">Doctor Credentials & Information</h3>
              <p className="text-xs text-[color:var(--muted)] mt-0.5">Permanently saved details in database.</p>
            </div>
            <Link href={`/doctors/${doctor.id}/edit`}>
              <Button variant="outline" size="sm" leftIcon={<Edit3 size={14} />}>Edit Information</Button>
            </Link>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Doctor Full Name</dt>
              <dd className="mt-1 text-sm font-bold text-[color:var(--foreground)]">{doctor.name}</dd>
            </div>

            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Clinical Specialty</dt>
              <dd className="mt-1 text-sm font-bold text-[#176b87]">{doctor.specialty || "General / Pathological"}</dd>
            </div>

            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Contact Phone</dt>
              <dd className="mt-1 text-sm font-mono font-medium">{doctor.phone || "—"}</dd>
            </div>

            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Official Email</dt>
              <dd className="mt-1 text-sm font-mono font-medium">{doctor.email || "—"}</dd>
            </div>

            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">City / Branch</dt>
              <dd className="mt-1 text-sm font-medium">{doctor.city || "—"}</dd>
            </div>

            <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
              <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Assigned Franchise</dt>
              <dd className="mt-1 text-sm font-semibold text-[#176b87]">{doctor.franchiseName}</dd>
            </div>

            {doctor.experience && (
              <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
                <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Experience</dt>
                <dd className="mt-1 text-sm font-medium">{doctor.experience}</dd>
              </div>
            )}

            {doctor.dateOfJoining && (
              <div className="p-3.5 rounded-xl border border-[color:var(--line)] bg-slate-50">
                <dt className="text-[11px] font-bold uppercase text-[color:var(--muted)]">Date of Association</dt>
                <dd className="mt-1 text-sm font-medium">{doctor.dateOfJoining}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}
