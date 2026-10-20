"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Field, Form, Formik, type FormikHelpers } from "formik";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCatchAllPath } from "@/lib/use-catch-all-path";
import * as Yup from "yup";
import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangle, Edit3, Trash2, Eye, Plus, Building2, IndianRupee } from "lucide-react";
import { PageHeader, StatusBadge, Button, Input, Select, Textarea, Field as UIField, Grid2, Card, SearchableCombobox } from "@/components/ui/index";
import { DataTable } from "@/components/tables/DataTable";
import { useEntity, useEntityList, useEntityMutations, type Kind } from "@/features/crud/hooks";
import { authService } from "@/lib/auth/auth-service";
import { useFranchise } from "@/lib/context/franchise-context";
import { calculateAgeFromDob, formatPatientAgeLabel } from "@/lib/patient-age";
import { DoctorLedgerView } from "@/components/doctors/DoctorLedgerView";
import type { Doctor, Franchise, Patient, Supplier, User, UserRole } from "@/types/domain";

type Entity = Patient | Doctor | Franchise | Supplier | User;

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "textarea" | "password";
  placeholder?: string;
  options?: readonly { label: string; value: string }[];
  colSpan?: 1 | 2;
  required?: boolean;
  hint?: string;
  section?: string;
}

export { calculateAgeFromDob } from "@/lib/patient-age";

function recordFranchiseId(record?: { franchiseId?: string; franchise?: { id?: string } } | null): string {
  if (!record) return "";
  return String(record.franchiseId || record.franchise?.id || "").trim();
}

function billingHrefFromPatient(patient: Pick<Patient, "id" | "patientCode" | "referringDoctorId" | "franchiseId"> & { referringDoctor?: { id?: string; name?: string }; franchise?: { id?: string } }) {
  const q = new URLSearchParams({ patientId: patient.id });
  if (patient.patientCode) q.set("patientCode", patient.patientCode);
  const docRef = patient.referringDoctor?.name 
    ? (patient.referringDoctor.name.startsWith("Doctor – ") || patient.referringDoctor.name === "Direct / Walk-in" || patient.referringDoctor.name.startsWith("Referred by") 
        ? patient.referringDoctor.name 
        : `Doctor – ${patient.referringDoctor.name}`)
    : (patient.referringDoctorId || "");
  if (docRef) q.set("doctorId", String(docRef));
  const franchiseId = recordFranchiseId(patient);
  if (franchiseId) q.set("franchiseId", franchiseId);
  return `/billing/new?${q.toString()}`;
}

const DETAIL_NA = "N/A";

function isEmptyDetailValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && (!value.trim() || value === "null" || value === "undefined")) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function namedLabel(obj: Record<string, unknown>, extraKeys: string[] = []): string {
  const name = obj.name ?? obj.label ?? obj.title ?? obj.code;
  if (name == null || String(name).trim() === "") return "";
  const extras = extraKeys
    .map((k) => obj[k])
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v));
  return extras.length ? `${name} (${extras.join(" · ")})` : String(name);
}

function formatSampleLine(sample: Record<string, unknown>): string {
  const tests = Array.isArray(sample.tests)
    ? sample.tests.map((t: Record<string, unknown>) => t.code || t.name).filter(Boolean).join(", ")
    : "";
  return [sample.accession, sample.sampleType, sample.status, tests].filter(Boolean).join(" · ") || DETAIL_NA;
}

function formatReportLine(report: Record<string, unknown>): string {
  const tests = Array.isArray(report.testIds)
    ? report.testIds.filter((t) => typeof t === "string" && !/^[0-9a-f-]{36}$/i.test(t)).join(", ")
    : "";
  return [report.reportNumber, report.status, report.department, tests].filter(Boolean).join(" · ") || DETAIL_NA;
}

function formatInvoiceLine(invoice: Record<string, unknown>): string {
  const items = Array.isArray(invoice.items)
    ? invoice.items.map((it: Record<string, unknown>) => it.description || it.code).filter(Boolean).join(", ")
    : "";
  const total = invoice.total != null && invoice.total !== "" ? `₹${invoice.total}` : "";
  return [invoice.billNumber, invoice.paymentStatus, total, items].filter(Boolean).join(" · ") || DETAIL_NA;
}

function formatAppointmentLine(appt: Record<string, unknown>): string {
  return [appt.date, appt.time, appt.type, appt.status].filter(Boolean).join(" · ") || DETAIL_NA;
}

function formatDetailLines(key: string, value: unknown): string[] {
  if (isEmptyDetailValue(value)) return [DETAIL_NA];
  if (typeof value !== "object") return [String(value)];

  const k = key.toLowerCase();

  if (Array.isArray(value)) {
    if (k.includes("sample")) return value.map((s) => formatSampleLine(s as Record<string, unknown>));
    if (k.includes("report")) return value.map((r) => formatReportLine(r as Record<string, unknown>));
    if (k.includes("invoice")) return value.map((inv) => formatInvoiceLine(inv as Record<string, unknown>));
    if (k.includes("appointment")) return value.map((a) => formatAppointmentLine(a as Record<string, unknown>));
    return value.map((item) => {
      if (item == null || item === "") return DETAIL_NA;
      if (typeof item !== "object") return String(item);
      return namedLabel(item as Record<string, unknown>) || DETAIL_NA;
    });
  }

  const obj = value as Record<string, unknown>;
  if (k.includes("doctor") || k.includes("referring")) {
    return [namedLabel(obj, ["specialty"]) || DETAIL_NA];
  }
  if (k.includes("franchise")) {
    return [namedLabel(obj, ["code"]) || DETAIL_NA];
  }
  return [namedLabel(obj) || DETAIL_NA];
}

const patientFields: readonly FieldConfig[] = [
  { name: "name", label: "Full Name", type: "text", placeholder: "Maya Sharma", required: true, section: "Personal Details" },
  { name: "patientCode", label: "Patient Code", type: "text", placeholder: "BL-01 (Auto-generated)", section: "Personal Details", hint: "Auto-generated sequential code (e.g. BL-01, BL-02)" },
  { name: "registrationDate", label: "Registration Date", type: "date", placeholder: "YYYY-MM-DD", section: "Personal Details", hint: "Date on which patient is registered" },
  {
    name: "sex",
    label: "Gender",
    type: "select",
    required: true,
    section: "Personal Details",
    options: [
      { label: "Select gender", value: "" },
      { label: "Female", value: "Female" },
      { label: "Male", value: "Male" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "YYYY-MM-DD", hint: "Selecting Date of Birth calculates Age automatically", section: "Personal Details" },
  { name: "age", label: "Age", type: "number", placeholder: "32", required: true, hint: "Auto-calculated from Date of Birth (days, months, or years).", section: "Personal Details" },
  {
    name: "bloodGroup",
    label: "Blood Group",
    type: "select",
    required: false,
    section: "Personal Details",
    options: [
      { label: "Select blood group", value: "" },
      { label: "A", value: "A" },
      { label: "B", value: "B" },
      { label: "AB", value: "AB" },
      { label: "O", value: "O" },
      { label: "A+", value: "A+" },
      { label: "A-", value: "A-" },
      { label: "B+", value: "B+" },
      { label: "B-", value: "B-" },
      { label: "AB+", value: "AB+" },
      { label: "AB-", value: "AB-" },
      { label: "O+", value: "O+" },
      { label: "O-", value: "O-" },
    ],
  },
  { name: "phone", label: "Phone Number", type: "text", placeholder: "+91 9876543210", section: "Contact Details" },
  { name: "email", label: "Email Address", type: "text", placeholder: "maya.sharma@example.com", section: "Contact Details" },
  { name: "emergencyContact", label: "Emergency Contact Phone", type: "text", placeholder: "+91 9811122334", section: "Contact Details" },
  { name: "city", label: "City", type: "text", placeholder: "Bangalore", section: "Contact Details" },
  { name: "state", label: "State", type: "text", placeholder: "Karnataka", section: "Contact Details" },
  { name: "pincode", label: "Pincode", type: "text", placeholder: "560001", required: true, section: "Contact Details" },
  { name: "address", label: "Residential Address", type: "textarea", placeholder: "#42, 3rd Cross, Indiranagar", colSpan: 2, section: "Contact Details" },
  { name: "referringDoctorId", label: "Referring Doctor Code / ID", type: "select", placeholder: "Select Referring Doctor", section: "Clinical Information", hint: "Dynamically filtered by franchise" },
];

const doctorFields: readonly FieldConfig[] = [
  { name: "name", label: "Doctor Full Name", type: "text", placeholder: "Dr. Rajesh Verma", required: true, section: "Personal Details" },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    section: "Personal Details",
    options: [
      { label: "Select gender", value: "" },
      { label: "Female", value: "Female" },
      { label: "Male", value: "Male" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "YYYY-MM-DD", section: "Personal Details" },
  { name: "phone", label: "Contact Phone Number", type: "text", placeholder: "+91 9822012345", section: "Contact Details" },
  { name: "emergencyContact", label: "Emergency Contact (optional)", type: "text", placeholder: "+91 9811122334", section: "Contact Details" },
  { name: "country", label: "Country", type: "text", placeholder: "India", section: "Contact Details" },
  { name: "state", label: "State / Province", type: "text", placeholder: "Karnataka", section: "Contact Details" },
  { name: "city", label: "City / Hospital Branch", type: "text", placeholder: "Bangalore", section: "Contact Details" },
  { name: "pincode", label: "Pin Code", type: "text", placeholder: "560001", section: "Contact Details" },
  { name: "address", label: "Office / Clinic Address", type: "textarea", placeholder: "Suite 402, Apollo Medical Center, Indiranagar", colSpan: 2, section: "Contact Details" },
  { name: "email", label: "Official Email Address", type: "text", placeholder: "dr.verma@hospital.org", section: "Login Details (Optional for account creation)", hint: "Optional: Only required if creating a login account for this doctor." },
  { name: "password", label: "Login Password", type: "password", placeholder: "Enter secure password (min 6 characters)", section: "Login Details (Optional for account creation)", hint: "Optional: Set only if creating a login account for this doctor." },
  { name: "specialty", label: "Specialist / Clinical Department", type: "text", placeholder: "Pathology, Hematology, Internal Medicine", section: "Doctor & Professional Details" },
  { name: "experience", label: "Work Experience", type: "text", placeholder: "12 years", section: "Doctor & Professional Details" },
  { name: "dateOfJoining", label: "Date of Joining", type: "date", placeholder: "YYYY-MM-DD", section: "Doctor & Professional Details" },
  {
    name: "status",
    label: "Account Status",
    type: "select",
    section: "Doctor & Professional Details",
    options: [
      { label: "Active (Permitted)", value: "Active" },
      { label: "Inactive (Disabled)", value: "Inactive" },
    ],
  },
  { name: "description", label: "Professional Notes & Affiliations", type: "textarea", placeholder: "Head of Diagnostic Services, MBBS MD (Pathology)", colSpan: 2, section: "Doctor & Professional Details" },
];

const franchiseFields: readonly FieldConfig[] = [
  { name: "name", label: "Franchise Name", type: "text", placeholder: "BL Dignostic Hub - Indiranagar", required: true, section: "Franchise Identification" },
  { name: "code", label: "Franchise Code", type: "text", placeholder: "FR-BLR-01 (Auto-generated if left blank)", section: "Franchise Identification" },
  { name: "licenseNumber", label: "License / Accr. Number", type: "text", placeholder: "KAR-FR-2026-9081", section: "Franchise Identification" },
  { name: "gstNumber", label: "GSTIN Number", type: "text", placeholder: "29AAAAA0000A1Z5", section: "Franchise Identification" },
  
  { name: "ownerName", label: "Franchise Owner / In-charge Name", type: "text", placeholder: "Dr. Suresh Varma", required: true, section: "Owner & Contact Details" },
  { name: "phone", label: "Primary Contact Phone", type: "text", placeholder: "+91 98450 12345", required: true, section: "Owner & Contact Details" },
  { name: "emergencyPhone", label: "Emergency / Support Phone", type: "text", placeholder: "+91 98000 11223", section: "Owner & Contact Details" },

  { name: "email", label: "Official Franchise Email", type: "text", placeholder: "blr.indiranagar@lis.local", required: true, section: "Login Details (Used for login)", hint: "Used by the franchise owner to sign in to the portal." },
  { name: "password", label: "Login Password", type: "password", placeholder: "Enter secure password (min 6 characters)", section: "Login Details (Used for login)", hint: "Used to authenticate when the franchise logs in." },

  {
    name: "country",
    label: "Country",
    type: "select",
    section: "Location Details",
    options: [
      { label: "India", value: "India" },
      { label: "United States", value: "United States" },
      { label: "United Kingdom", value: "United Kingdom" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "state", label: "State / Province", type: "text", placeholder: "Karnataka", section: "Location Details" },
  { name: "city", label: "City", type: "text", placeholder: "Bengaluru", required: true, section: "Location Details" },
  { name: "pincode", label: "Pin Code", type: "text", placeholder: "560038", section: "Location Details" },
  { name: "address", label: "Complete Address", type: "textarea", placeholder: "#102, 100ft Road, Indiranagar, Bengaluru", colSpan: 2, section: "Location Details" },

  { name: "revenueShare", label: "Revenue Share (%)", type: "number", placeholder: "15", section: "Business & Financial Terms" },
  {
    name: "status",
    label: "Franchise Status",
    type: "select",
    section: "Business & Financial Terms",
    options: [
      { label: "Active (Operational)", value: "Active" },
      { label: "Inactive (Paused)", value: "Inactive" },
      { label: "Suspended", value: "Suspended" },
    ],
  },
  { name: "notes", label: "Operational Notes & Agreement Terms", type: "textarea", placeholder: "Phlebotomy collection hub with automated analyzer sync.", colSpan: 2, section: "Business & Financial Terms" },
];

const pathologistFields: readonly FieldConfig[] = [
  { name: "name", label: "Pathologist Full Name", type: "text", placeholder: "Dr. Ananya Rao", required: true, section: "Personal Details" },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    section: "Personal Details",
    options: [
      { label: "Select gender", value: "" },
      { label: "Female", value: "Female" },
      { label: "Male", value: "Male" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "YYYY-MM-DD", section: "Personal Details" },
  { name: "mobile", label: "Contact Phone Number", type: "text", placeholder: "+91 98450 11223", required: true, section: "Contact Details" },
  { name: "emergencyContact", label: "Emergency Contact (optional)", type: "text", placeholder: "+91 9811122334", section: "Contact Details" },
  { name: "country", label: "Country", type: "text", placeholder: "India", section: "Contact Details" },
  { name: "state", label: "State / Province", type: "text", placeholder: "Karnataka", section: "Contact Details" },
  { name: "location", label: "Assigned Facility / Lab Location", type: "text", placeholder: "Central Processing & Histopathology Lab", section: "Contact Details" },
  { name: "pincode", label: "Pin Code", type: "text", placeholder: "560001", section: "Contact Details" },
  { name: "address", label: "Address", type: "textarea", placeholder: "Flat 304, Green Meadows, Bengaluru", colSpan: 2, section: "Contact Details" },
  { name: "email", label: "Official Email Address", type: "text", placeholder: "ananya.rao@hospital.org", required: true, section: "Login Details (Used for login)" },
  { name: "password", label: "Login Password", type: "password", placeholder: "Enter secure password (min 6 characters)", section: "Login Details (Used for login)", hint: "Used to authenticate when the pathologist signs in." },
  {
    name: "permissions",
    label: "Permissions Scope",
    type: "select",
    required: true,
    section: "Role & Permission Details",
    options: [
      { label: "Reports & QC Sign-off (reports:approve, results:write, qc:manage)", value: "reports:approve,results:write,qc:manage" },
      { label: "All Permissions (*)", value: "*" },
      { label: "Read Only (reports:read, samples:read)", value: "read:all" },
    ],
  },
  { name: "specialty", label: "Sub-Specialization", type: "text", placeholder: "Histopathology, Hematopathology, Molecular Diagnostics", section: "Role & Permission Details" },
  { name: "experience", label: "Years of Experience", type: "text", placeholder: "8 years", section: "Role & Permission Details" },
  { name: "dateOfJoining", label: "Date of Joining", type: "date", placeholder: "YYYY-MM-DD", section: "Role & Permission Details" },
  {
    name: "status",
    label: "Account Status",
    type: "select",
    section: "Role & Permission Details",
    options: [
      { label: "Active (Permitted)", value: "Active" },
      { label: "Inactive (Disabled)", value: "Inactive" },
    ],
  },
  { name: "description", label: "Medical Registration / Council Notes", type: "textarea", placeholder: "Reg No. KMC-2015-8942 · Consultant Pathologist", colSpan: 2, section: "Role & Permission Details" },
];

const technicianFields: readonly FieldConfig[] = [
  { name: "name", label: "Technician Full Name", type: "text", placeholder: "Vikram Mehta", required: true, section: "Personal Details" },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    section: "Personal Details",
    options: [
      { label: "Select gender", value: "" },
      { label: "Male", value: "Male" },
      { label: "Female", value: "Female" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "YYYY-MM-DD", section: "Personal Details" },
  { name: "mobile", label: "Contact Phone Number", type: "text", placeholder: "+91 98765 43210", required: true, section: "Contact Details" },
  { name: "emergencyContact", label: "Emergency Contact (optional)", type: "text", placeholder: "+91 9811122334", section: "Contact Details" },
  { name: "country", label: "Country", type: "text", placeholder: "India", section: "Contact Details" },
  { name: "state", label: "State / Province", type: "text", placeholder: "Karnataka", section: "Contact Details" },
  { name: "location", label: "Assigned Laboratory Section / Room", type: "text", placeholder: "Hematology & Biochemistry Lab, Room 102", section: "Contact Details" },
  { name: "pincode", label: "Pin Code", type: "text", placeholder: "560001", section: "Contact Details" },
  { name: "address", label: "Address", type: "textarea", placeholder: "12, 4th Main Road, Indiranagar", colSpan: 2, section: "Contact Details" },
  { name: "email", label: "Official Email Address", type: "text", placeholder: "vikram.mehta@lis.local", required: true, section: "Login Details (Used for login)" },
  { name: "password", label: "Login Password", type: "password", placeholder: "Enter secure password (min 6 characters)", section: "Login Details (Used for login)", hint: "Used to authenticate when the technician signs in." },
  {
    name: "permissions",
    label: "Permissions Scope",
    type: "select",
    required: true,
    section: "Role & Permission Details",
    options: [
      { label: "Lab Processing & Instruments (samples:write, results:write, instruments:manage)", value: "samples:write,results:write,instruments:manage" },
      { label: "All Permissions (*)", value: "*" },
      { label: "Read Only (reports:read, samples:read)", value: "read:all" },
    ],
  },
  { name: "specialty", label: "Assigned Bench / Workstation", type: "text", placeholder: "Automated Analyzers & Phlebotomy", section: "Role & Permission Details" },
  { name: "experience", label: "Work Experience", type: "text", placeholder: "5 years", section: "Role & Permission Details" },
  { name: "dateOfJoining", label: "Date of Joining", type: "date", placeholder: "YYYY-MM-DD", section: "Role & Permission Details" },
  {
    name: "status",
    label: "Account Status",
    type: "select",
    section: "Role & Permission Details",
    options: [
      { label: "Active (Permitted)", value: "Active" },
      { label: "Inactive (Disabled)", value: "Inactive" },
    ],
  },
  { name: "description", label: "Certifications & Equipment Clearance", type: "textarea", placeholder: "Certified DMLT, Sysmex & Roche Certified Operator", colSpan: 2, section: "Role & Permission Details" },
];

const supplierFields: readonly FieldConfig[] = [
  { name: "name", label: "Supplier / Company Name", type: "text", placeholder: "Roche Diagnostics India", required: true, section: "Company Details" },
  { name: "phone", label: "Contact Phone", type: "text", placeholder: "+91 22 67890000", required: true, section: "Contact Details" },
  { name: "emergencyContact", label: "Support / Emergency Line", type: "text", placeholder: "+91 1800 200 4000", section: "Contact Details" },
  {
    name: "country",
    label: "Country",
    type: "select",
    required: true,
    section: "Location Details",
    options: [
      { label: "Select country", value: "" },
      { label: "India", value: "India" },
      { label: "United States", value: "United States" },
      { label: "Germany", value: "Germany" },
      { label: "Japan", value: "Japan" },
      { label: "United Kingdom", value: "United Kingdom" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "city", label: "City", type: "text", placeholder: "Pune", required: true, section: "Location Details" },
  { name: "state", label: "State / Province", type: "text", placeholder: "Maharashtra", section: "Location Details" },
  { name: "pincode", label: "Pincode / Postal Code", type: "text", placeholder: "411001", section: "Location Details" },
  { name: "address", label: "Office Address", type: "textarea", placeholder: "Plot 14, MIDC Industrial Area", colSpan: 2, section: "Location Details" },
  { name: "description", label: "Supply Categories & Delivery Terms", type: "textarea", placeholder: "Primary vendor for hematology reagents and control serums", colSpan: 2, section: "Vendor Information" },
];

const userFields: readonly FieldConfig[] = [
  { name: "name", label: "Staff Full Name", type: "text", placeholder: "Priya Nair", required: true, section: "Personal Details" },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    section: "Personal Details",
    options: [
      { label: "Select gender", value: "" },
      { label: "Female", value: "Female" },
      { label: "Male", value: "Male" },
      { label: "Other", value: "Other" },
    ],
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date", placeholder: "YYYY-MM-DD", section: "Personal Details" },
  { name: "mobile", label: "Contact Phone Number", type: "text", placeholder: "+91 98450 33445", section: "Contact Details" },
  { name: "location", label: "Assigned Facility / Lab Location", type: "text", placeholder: "Main Central Laboratory, Bengaluru", section: "Contact Details" },
  { name: "email", label: "Official Email Address", type: "text", placeholder: "priya.nair@lis.local", required: true, section: "Login Details (Used for login)" },
  { name: "password", label: "Login Password", type: "password", placeholder: "Enter secure password (min 6 characters)", section: "Login Details (Used for login)", hint: "Used to authenticate when this staff member signs in." },
  {
    name: "role",
    label: "System Role",
    type: "select",
    required: true,
    section: "System Role & Permissions Scope",
    options: [
      { label: "Select user role", value: "" },
      { label: "Admin - Full System Access", value: "Admin" },
      { label: "Pathologist - Sign-off & Reports", value: "Pathologist" },
      { label: "Technician - Samples & Results", value: "Technician" },
      { label: "Doctor - Clinical Review & Referrals", value: "Doctor" },
      { label: "Franchise - Hub & Operations", value: "Franchise" },
      { label: "Receptionist - Patient Registration", value: "Receptionist" },
      { label: "Billing Staff - Invoices & Payments", value: "Billing" },
      { label: "Other - Custom Role", value: "Other" },
    ],
  },
  {
    name: "permissions",
    label: "Permissions Scope",
    type: "select",
    required: true,
    section: "System Role & Permissions Scope",
    options: [
      { label: "All Permissions (*)", value: "*" },
      { label: "Laboratory & Samples (samples:write, results:write)", value: "samples:write,results:write" },
      { label: "Reports & QC Sign-off (reports:approve, qc:manage)", value: "reports:approve,qc:manage" },
      { label: "Patient Management (patients:write)", value: "patients:write" },
      { label: "Billing & Operations (billing:write)", value: "billing:write" },
      { label: "Read Only (reports:read, samples:read)", value: "read:all" },
    ],
  },
  {
    name: "status",
    label: "Account Status",
    type: "select",
    section: "System Role & Permissions Scope",
    options: [
      { label: "Active (Permitted)", value: "Active" },
      { label: "Inactive (Disabled)", value: "Inactive" },
    ],
  },
];

const patientSchema = Yup.object({
  name: Yup.string().trim().required("Full name is required").min(2, "Name must be at least 2 characters"),
  patientCode: Yup.string().trim(),
  registrationDate: Yup.string(),
  sex: Yup.string().required("Please select gender").oneOf(["Female", "Male", "Other"], "Invalid gender option"),
  age: Yup.number().typeError("Age must be a valid number").required("Age is required").min(0, "Age cannot be negative").max(130, "Please enter a valid age"),
  bloodGroup: Yup.string().trim(),
  phone: Yup.string().trim(),
  email: Yup.string().trim().email("Please enter a valid email address"),
  city: Yup.string().trim(),
  state: Yup.string().trim(),
  pincode: Yup.string().trim().required("Pincode is required"),
  emergencyContact: Yup.string().trim(),
  address: Yup.string().trim(),
  referringDoctorId: Yup.string().trim(),
});

const doctorSchema = Yup.object({
  name: Yup.string().trim().required("Doctor name is required").min(2, "Name must be at least 2 characters"),
  specialty: Yup.string().trim(),
  phone: Yup.string().trim(),
  email: Yup.string().trim().email("Please enter a valid email address"),
  password: Yup.string().trim(),
  city: Yup.string().trim(),
  gender: Yup.string(),
  experience: Yup.string().trim(),
  dateOfJoining: Yup.string(),
  description: Yup.string().trim(),
  status: Yup.string(),
});

const franchiseSchema = Yup.object({
  name: Yup.string().trim().required("Franchise name is required").min(2, "Name must be at least 2 characters"),
  ownerName: Yup.string().trim().required("Owner name is required").min(2, "Name must be at least 2 characters"),
  email: Yup.string().trim().email("Please enter a valid email address").required("Official email is required for login"),
  phone: Yup.string().trim().required("Phone number is required"),
  city: Yup.string().trim().required("City is required"),
  code: Yup.string().trim(),
  password: Yup.string().trim(),
  status: Yup.string(),
  state: Yup.string().trim(),
  country: Yup.string().trim(),
  pincode: Yup.string().trim(),
  address: Yup.string().trim(),
  licenseNumber: Yup.string().trim(),
  gstNumber: Yup.string().trim(),
  notes: Yup.string().trim(),
});

const pathologistSchema = Yup.object({
  name: Yup.string().trim().required("Pathologist name is required").min(2, "Name must be at least 2 characters"),
  mobile: Yup.string().trim().required("Phone number is required"),
  email: Yup.string().trim().email("Please enter a valid email address").required("Email is required for login"),
  password: Yup.string().trim(),
  permissions: Yup.string().required("Please select permission scope"),
  gender: Yup.string(),
  dateOfBirth: Yup.string(),
  location: Yup.string().trim(),
  specialty: Yup.string().trim(),
  experience: Yup.string().trim(),
  dateOfJoining: Yup.string(),
  description: Yup.string().trim(),
  status: Yup.string(),
});

const technicianSchema = Yup.object({
  name: Yup.string().trim().required("Technician name is required").min(2, "Name must be at least 2 characters"),
  mobile: Yup.string().trim().required("Phone number is required"),
  email: Yup.string().trim().email("Please enter a valid email address").required("Email is required for login"),
  password: Yup.string().trim(),
  permissions: Yup.string().required("Please select permission scope"),
  gender: Yup.string(),
  dateOfBirth: Yup.string(),
  location: Yup.string().trim(),
  specialty: Yup.string().trim(),
  experience: Yup.string().trim(),
  dateOfJoining: Yup.string(),
  description: Yup.string().trim(),
  status: Yup.string(),
});

const supplierSchema = Yup.object({
  name: Yup.string().trim().required("Supplier company name is required").min(2, "Name must be at least 2 characters"),
  phone: Yup.string().trim().required("Contact phone is required"),
  emergencyContact: Yup.string().trim(),
  country: Yup.string().required("Please select country"),
  city: Yup.string().trim().required("City is required"),
  state: Yup.string().trim(),
  pincode: Yup.string().trim(),
  address: Yup.string().trim(),
  description: Yup.string().trim(),
});

const userSchema = Yup.object({
  name: Yup.string().trim().required("Staff name is required").min(2, "Name must be at least 2 characters"),
  email: Yup.string().trim().email("Please enter a valid email address").required("Email is required for login"),
  password: Yup.string().trim(),
  role: Yup.string().required("Please select a system role").oneOf(["Admin", "Pathologist", "Technician", "Doctor", "Franchise", "Receptionist", "Billing", "Other"], "Invalid role"),
  permissions: Yup.string().required("Please select permission scope"),
  status: Yup.string(),
  mobile: Yup.string().trim(),
  location: Yup.string().trim(),
  gender: Yup.string(),
  dateOfBirth: Yup.string(),
});

const schemas = {
  patients: patientSchema,
  doctors: doctorSchema,
  franchises: franchiseSchema,
  pathologists: pathologistSchema,
  technicians: technicianSchema,
  suppliers: supplierSchema,
  users: userSchema,
};

const emptyInitialValues = {
  patients: { patientCode: "", registrationDate: new Date().toISOString().slice(0, 10), name: "", sex: "", dateOfBirth: "", age: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", emergencyContact: "", bloodGroup: "", referringDoctorId: "", status: "Active", franchiseId: "" },
  doctors: { name: "", specialty: "", gender: "", dateOfBirth: "", phone: "", emergencyContact: "", country: "India", state: "", city: "", pincode: "", address: "", email: "", password: "", experience: "", dateOfJoining: "", description: "", status: "Active", franchiseId: "" },
  franchises: { name: "", code: "", ownerName: "", email: "", password: "", phone: "", emergencyPhone: "", country: "India", state: "Karnataka", city: "Bengaluru", pincode: "", address: "", licenseNumber: "", gstNumber: "", revenueShare: 0, status: "Active", notes: "" },
  pathologists: { name: "", gender: "", dateOfBirth: "", mobile: "", emergencyContact: "", country: "India", state: "", location: "", pincode: "", address: "", email: "", password: "", permissions: "reports:approve,results:write,qc:manage", specialty: "", experience: "", dateOfJoining: "", description: "", status: "Active", franchiseId: "" },
  technicians: { name: "", gender: "", dateOfBirth: "", mobile: "", emergencyContact: "", country: "India", state: "", location: "", pincode: "", address: "", email: "", password: "", permissions: "samples:write,results:write,instruments:manage", specialty: "", experience: "", dateOfJoining: "", description: "", status: "Active", franchiseId: "" },
  suppliers: { name: "", phone: "", emergencyContact: "", country: "India", address: "", state: "", city: "", pincode: "", description: "" },
  users: { name: "", gender: "", dateOfBirth: "", email: "", password: "", role: "", permissions: "*", status: "Active", mobile: "", location: "", franchiseId: "" },
};

const configs = {
  patients: { singular: "Patient", plural: "Patients", fields: patientFields },
  doctors: { singular: "Doctor", plural: "Doctors", fields: doctorFields },
  franchises: { singular: "Franchise", plural: "Franchises", fields: franchiseFields },
  pathologists: { singular: "Pathologist", plural: "Pathologists", fields: pathologistFields },
  technicians: { singular: "Technician", plural: "Technicians", fields: technicianFields },
  suppliers: { singular: "Supplier", plural: "Suppliers", fields: supplierFields },
  users: { singular: "User", plural: "Users", fields: userFields },
} as const;

export function EntityManager({ kind, path: pathProp }: Readonly<{ kind: Kind; path?: readonly string[] }>) {
  const routePath = useCatchAllPath();
  const path = pathProp ?? routePath;
  const config = configs[kind];
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFranchiseId = searchParams?.get("franchiseId") || "";
  const { selectedFranchiseId } = useFranchise();
  const isNew = path[0] === "new";
  const id = isNew ? "" : (path[0] ?? "");
  const edit = path[1] === "edit";
  const editable = isNew || edit;

  // ALL HOOKS MUST BE UNCONDITIONALLY CALLED AT THE TOP LEVEL
  const [currentRole, setCurrentRole] = useState<UserRole | undefined>(undefined);
  const [currentSession, setCurrentSession] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [proceedToBilling, setProceedToBilling] = useState(false);

  useEffect(() => {
    const s = authService.getSession();
    if (s) {
      setCurrentSession(s);
      if (s.role) setCurrentRole(s.role);
    }
  }, []);

  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";
  const isFranchise = currentRole === "Franchise";
  const isTechnician = currentRole === "Technician";
  const canViewCreatedBy = isAdmin || isFranchise;
  const canManage = isAdmin || isFranchise || (isTechnician && kind === "patients");
  const canEdit = canManage && !isTechnician;
  const canDelete = canManage && !isTechnician;

  useEffect(() => {
    if (kind === "patients" && edit && isTechnician && id) {
      router.replace(`/patients/${id}`);
    }
  }, [kind, edit, isTechnician, id, router]);

  const list = useEntityList<Entity>(kind);
  const detail = useEntity<Entity>(kind, id);
  const mutations = useEntityMutations<Entity>(kind);
  const franchisesList = useEntityList<Franchise>("franchises");
  const doctorsList = useEntityList<Doctor>("doctors");

  // Dynamic franchise-scoped next sequential patient code (BL-01, BL-02...)
  const getNextPatientCodeForFranchise = (targetFranchiseId?: string) => {
    if (kind !== "patients") return "BL-01";
    const patients = (list.data ?? []) as Patient[];
    const franchiseId = targetFranchiseId || currentSession?.franchiseId;
    const scopedPatients = franchiseId
      ? patients.filter((p) => p.franchiseId === franchiseId)
      : patients;
    const count = scopedPatients.length;
    const nextNum = count + 1;
    const formatted = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    return `BL-${formatted}`;
  };

  const nextPatientCode = useMemo(() => {
    return getNextPatientCodeForFranchise(currentSession?.franchiseId);
  }, [kind, list.data, currentSession?.franchiseId]);

  // Franchise-scoped doctors and all referral sources helper
  const getDoctorOptions = (franchiseId?: string) => {
    const allDocs = (doctorsList.data ?? []) as Doctor[];
    const targetFranchise = franchiseId || currentSession?.franchiseId;
    const filtered = targetFranchise
      ? allDocs.filter((d) => !d.franchiseId || d.franchiseId === targetFranchise)
      : allDocs;

    const businessSources = [
      { label: "Direct / Walk-in (Self Referral)", value: "Direct / Walk-in", secondary: "Standard OPD walk-in patient" },
      { label: "Referred by Blood Collection Centre", value: "Referred by Blood Collection Centre", secondary: "Collection kiosk / phlebotomy centre" },
      { label: "Referred by Health Camp / Outreach", value: "Referred by Health Camp / Outreach", secondary: "Community screening / corporate camp" },
    ];

    const doctorItems = filtered.map((d) => ({
      label: `Doctor – ${d.name} (${d.specialty || "Practitioner"})`,
      value: `Doctor – ${d.name}`,
      secondary: d.phone ? `Phone: ${d.phone}` : (d.specialty || "Practitioner"),
    }));

    return [
      ...businessSources,
      ...doctorItems,
    ];
  };

  // Dynamic franchise options for Admin assignment
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

  // Dynamically inject Franchise selection field for Admin on franchise-managed entities
  const effectiveFields = useMemo(() => {
    const baseFields = [...config.fields];
    if (isAdmin && kind !== "franchises" && kind !== "suppliers") {
      const franchiseField: FieldConfig = {
        name: "franchiseId",
        label: "Assign to Franchise",
        type: "select",
        required: true,
        section: "Franchise Assignment",
        options: franchiseOptions,
        hint: "Select which Franchise owns this record, or select '+ Other / Add New Franchise'.",
      };
      return [franchiseField, ...baseFields];
    }
    return baseFields;
  }, [config.fields, isAdmin, kind, franchiseOptions]);

  // Validation Schema
  const effectiveSchema = useMemo(() => {
    let base = schemas[kind];
    if (isAdmin && kind !== "franchises" && kind !== "suppliers") {
      base = base.shape({
        franchiseId: Yup.string().required("Please assign this record to a Franchise (or create a new one)"),
      });
    }
    return base;
  }, [kind, isAdmin]);

  const columns = useMemo(() => {
    const h = createColumnHelper<Entity>();

    if (kind === "patients") {
      const p = h as ReturnType<typeof createColumnHelper<Patient>>;
      return [
        p.accessor("patientCode", {
          header: "Patient Code",
          cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-[#176b87]">{getValue()}</span>,
        }),
        p.accessor("name", {
          header: "Full Name",
          cell: ({ getValue }) => <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>,
        }),
        p.accessor("sex", { header: "Gender" }),
        p.accessor("age", {
          header: "Age",
          cell: ({ row }) => (
            <span>
              {formatPatientAgeLabel(row.original.dateOfBirth, row.original.age)}
            </span>
          ),
        }),
        p.accessor("bloodGroup", {
          header: "Blood Group",
          cell: ({ getValue }) => <span className="font-semibold text-rose-600">{getValue() || "—"}</span>,
        }),
        p.accessor("phone", {
          header: "Phone Number",
          cell: ({ getValue }) => {
            const phone = String(getValue() ?? "").trim();
            return phone ? phone : <span className="text-[color:var(--muted)]">N/A</span>;
          },
        }),
        p.accessor("pincode", {
          header: "Pincode",
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() || "—"}</span>,
        }),
        ...(canViewCreatedBy
          ? [
              p.accessor((row: any) => row.createdBy || "System", {
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
        ...(isAdmin
          ? [
              p.accessor((row: any) => row.franchise?.name || row.franchise?.code || "Central Lab", {
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
        p.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const val = getValue();
            return <StatusBadge tone={val === "Active" ? "success" : "neutral"} size="sm">{val}</StatusBadge>;
          },
        }),
        p.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => (
            <div className="flex items-center justify-center gap-1.5">
              <Link href={billingHrefFromPatient(row.original as Patient)}>
                <Button size="sm" variant="outline" leftIcon={<IndianRupee size={13} />}>
                  Bill
                </Button>
              </Link>
              <Link href={`/${kind}/${row.original.id}`}>
                <Button size="sm" variant="ghost" leftIcon={<Eye size={13} />}>
                  View
                </Button>
              </Link>
              {canEdit && (
                <Link href={`/${kind}/${row.original.id}/edit`}>
                  <Button size="sm" variant="secondary" leftIcon={<Edit3 size={13} />}>
                    Edit
                  </Button>
                </Link>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="danger-outline"
                  leftIcon={<Trash2 size={13} />}
                  onClick={() => setConfirmDeleteId(row.original.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          ),
        }),
      ];
    }

    if (kind === "franchises") {
      const f = h as ReturnType<typeof createColumnHelper<Franchise>>;
      return [
        f.accessor("name", {
          header: "Franchise Name",
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-[#e8f4f7] text-xs font-bold text-[#176b87]">
                <Building2 size={16} />
              </div>
              <div>
                <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>
                <p className="font-mono text-[11px] text-[color:var(--muted)]">{row.original.code}</p>
              </div>
            </div>
          ),
        }),
        f.accessor("city", {
          header: "Location",
          cell: ({ getValue, row }) => <span>{getValue()}{row.original.state ? `, ${row.original.state}` : ""}</span>,
        }),
        f.accessor("ownerName", { header: "Owner / Lead" }),
        f.accessor("email", {
          header: "Login Email",
          cell: ({ getValue }) => <span className="font-mono text-xs text-[color:var(--muted)]">{getValue()}</span>,
        }),
        f.accessor("phone", { header: "Contact Phone" }),
        f.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const val = getValue();
            return <StatusBadge tone={val === "Active" ? "success" : val === "Suspended" ? "danger" : "warning"} size="sm">{val}</StatusBadge>;
          },
        }),
        f.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const isSelf = Boolean(
              currentSession && (
                currentSession.id === row.original.id ||
                (row.original.email && currentSession.email && row.original.email.toLowerCase() === currentSession.email.toLowerCase())
              )
            );
            return (
              <div className="flex items-center justify-center gap-1.5">
                <Link href={`/${kind}/${row.original.id}`}>
                  <Button size="sm" variant="ghost" leftIcon={<Eye size={13} />}>
                    View
                  </Button>
                </Link>
                {isAdmin && (
                  <>
                    <Link href={`/${kind}/${row.original.id}/edit`}>
                      <Button size="sm" variant="secondary" leftIcon={<Edit3 size={13} />}>
                        Edit
                      </Button>
                    </Link>
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="danger-outline"
                        leftIcon={<Trash2 size={13} />}
                        onClick={() => setConfirmDeleteId(row.original.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          },
        }),
      ];
    }

    if (kind === "doctors") {
      const d = h as ReturnType<typeof createColumnHelper<Doctor>>;
      return [
        d.accessor("name", {
          header: "Doctor Name",
          cell: ({ getValue }) => <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>,
        }),
        d.accessor("specialty", { header: "Specialty / Department" }),
        d.accessor("phone", { header: "Contact Phone" }),
        d.accessor("email", {
          header: "Login Email",
          cell: ({ getValue }) => <span className="text-xs text-[color:var(--muted)]">{getValue() || "—"}</span>,
        }),
        d.accessor("city", { header: "Branch / City" }),
        ...(canViewCreatedBy
          ? [
              d.accessor((row: any) => row.createdBy || "System", {
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
        ...(isAdmin
          ? [
              d.accessor((row: any) => row.franchise?.name || row.franchise?.code || "Central Lab", {
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
        d.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const isSelf = Boolean(
              currentSession && (
                currentSession.id === row.original.id ||
                (row.original.email && currentSession.email && row.original.email.toLowerCase() === currentSession.email.toLowerCase())
              )
            );
            return (
              <div className="flex items-center justify-center gap-1.5">
                <Link href={`/doctors/${row.original.id}`}>
                  <Button size="sm" variant="ghost" className="text-[#176b87] hover:bg-[#e8f4f7]" leftIcon={<IndianRupee size={13} />}>
                    Ledger
                  </Button>
                </Link>
                <Link href={`/${kind}/${row.original.id}`}>
                  <Button size="sm" variant="ghost" leftIcon={<Eye size={13} />}>
                    Profile
                  </Button>
                </Link>
                {canManage && (
                  <>
                    <Link href={`/${kind}/${row.original.id}/edit`}>
                      <Button size="sm" variant="secondary" leftIcon={<Edit3 size={13} />}>
                        Edit
                      </Button>
                    </Link>
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="danger-outline"
                        leftIcon={<Trash2 size={13} />}
                        onClick={() => setConfirmDeleteId(row.original.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          },
        }),
      ];
    }

    if (kind === "pathologists" || kind === "technicians" || kind === "users") {
      const u = h as ReturnType<typeof createColumnHelper<User>>;
      return [
        u.accessor("name", {
          header: "Staff Name",
          cell: ({ getValue, row }) => (
            <div className="flex items-center gap-2.5">
              <div className="grid size-7 place-items-center rounded-lg bg-[#e8f4f7] text-xs font-bold text-[#176b87]">
                {row.original.initials || "ST"}
              </div>
              <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>
            </div>
          ),
        }),
        u.accessor("role", {
          header: "Role",
          cell: ({ getValue }) => <span className="text-xs font-semibold text-[#176b87]">{getValue()}</span>,
        }),
        u.accessor("email", {
          header: "Login Email",
          cell: ({ getValue }) => <span className="font-mono text-xs text-[color:var(--muted)]">{getValue()}</span>,
        }),
        u.accessor("mobile", {
          header: "Contact",
          cell: ({ getValue }) => <span>{getValue() || "—"}</span>,
        }),
        u.accessor("location", {
          header: "Lab Location",
          cell: ({ getValue }) => <span className="text-xs text-[color:var(--muted)]">{getValue() || "—"}</span>,
        }),
        ...(isAdmin
          ? [
              u.accessor((row: any) => row.franchise?.name || row.franchise?.code || "Central Lab", {
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
        u.accessor("active", {
          header: "Status",
          cell: ({ getValue }) => (
            <StatusBadge tone={getValue() ? "success" : "neutral"} size="sm">
              {getValue() ? "Active" : "Inactive"}
            </StatusBadge>
          ),
        }),
        u.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const isSelf = Boolean(
              currentSession && (
                currentSession.id === row.original.id ||
                (row.original.email && currentSession.email && row.original.email.toLowerCase() === currentSession.email.toLowerCase())
              )
            );
            return (
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
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="danger-outline"
                        leftIcon={<Trash2 size={13} />}
                        onClick={() => setConfirmDeleteId(row.original.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          },
        }),
      ];
    }

    // Default Suppliers
    const s = h as ReturnType<typeof createColumnHelper<Supplier>>;
    return [
      s.accessor("name", {
        header: "Company Name",
        cell: ({ getValue }) => <span className="font-semibold text-[color:var(--foreground)]">{getValue()}</span>,
      }),
      s.accessor("phone", { header: "Contact Phone" }),
      s.accessor("city", { header: "City" }),
      s.accessor("country", { header: "Country" }),
      ...(canViewCreatedBy
        ? [
            s.accessor((row: any) => row.createdBy || "System", {
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
      s.display({
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
                {canDelete && (
                <Button
                  size="sm"
                  variant="danger-outline"
                  leftIcon={<Trash2 size={15} />}
                  onClick={() => setConfirmDeleteId(row.original.id)}
                >
                  Delete
                </Button>
                )}
              </>
            )}
          </div>
        ),
      }),
    ];
  }, [kind, isAdmin, canViewCreatedBy, canManage, canEdit, canDelete, currentSession]);

  const formInitialValues = useMemo(() => {
    const base = { ...emptyInitialValues[kind] };
    if (isNew && kind === "patients") {
      (base as any).patientCode = nextPatientCode;
      (base as any).registrationDate = new Date().toISOString().slice(0, 10);
      const defaultFranchise =
        urlFranchiseId ||
        (selectedFranchiseId && selectedFranchiseId !== "all" ? selectedFranchiseId : "");
      if (defaultFranchise) {
        (base as any).franchiseId = defaultFranchise;
      }
    }
    if (!isNew && detail.data) {
      const data = detail.data as unknown as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...base };
      for (const field of effectiveFields) {
        const val = data[field.name];
        if (field.name === "password") {
          merged[field.name] = "";
        } else if (val === null || val === undefined) {
          merged[field.name] = "";
        } else if (field.name === "permissions" && Array.isArray(val)) {
          if (val.length === 0) merged[field.name] = "read:all";
          else if (val.includes("billing:manage") || (val.includes("patients:write") && val.includes("qc:manage"))) merged[field.name] = "*";
          else if (val.includes("samples:write") || val.includes("results:write")) merged[field.name] = "samples:write,results:write";
          else if (val.includes("reports:approve")) merged[field.name] = "reports:approve,results:write,qc:manage";
          else if (val.includes("patients:write")) merged[field.name] = "patients:write";
          else merged[field.name] = "read:all";
        } else {
          merged[field.name] = val;
        }
      }
      if (kind === "patients") {
        if (data.createdAt) {
          merged.registrationDate = new Date(data.createdAt as string).toISOString().slice(0, 10);
        }
      }
      if (kind === "users" || kind === "pathologists" || kind === "technicians") {
        merged.status = (detail.data as User).active === false ? "Inactive" : "Active";
      }
      return merged;
    }
    return base;
  }, [kind, isNew, detail.data, effectiveFields, nextPatientCode, urlFranchiseId, selectedFranchiseId]);

  // Group fields by section for clean rendering
  const sections = useMemo(() => {
    const map = new Map<string, FieldConfig[]>();
    for (const field of effectiveFields) {
      const sec = field.section || "General Information";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(field);
    }
    return Array.from(map.entries());
  }, [effectiveFields]);

  const handleDelete = async () => {
    if (!confirmDeleteId || !canDelete) return;
    try {
      await mutations.remove.mutateAsync(confirmDeleteId);
      setConfirmDeleteId(null);
      if (id) {
        router.push(`/${kind}`);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete record.");
    }
  };

  const handleFormSubmit = async (
    values: Record<string, unknown>,
    { setSubmitting, setErrors }: FormikHelpers<Record<string, unknown>>
  ) => {
    setFormError(null);

    // If Admin chose "+ Other / Add New Franchise", redirect to create franchise
    if (values.franchiseId === "__add_franchise__") {
      router.push("/franchises/new");
      return;
    }

    try {
      const input: Record<string, unknown> = { ...values };

      // Multi-tenant assignment logic
      if ((isFranchise || isTechnician) && currentSession?.franchiseId) {
        input.franchiseId = currentSession.franchiseId;
      }

      if (kind === "users" || kind === "pathologists" || kind === "technicians") {
        input.initials = String(values.name ?? "").split(" ").map((part) => part[0]).join("").toUpperCase();
        input.active = values.status !== "Inactive";
      }
      if (kind === "pathologists") {
        input.role = "Pathologist";
      }
      if (kind === "technicians") {
        input.role = "Technician";
      }
      if (kind === "patients" && values.age !== undefined && values.age !== "") {
        input.age = Number(values.age);
      }
      if (kind === "franchises" && values.revenueShare !== undefined && values.revenueShare !== "") {
        input.revenueShare = Number(values.revenueShare);
      }

      // If updating and password field was left blank, do not send empty password string
      if (!isNew && (!input.password || String(input.password).trim() === "")) {
        delete input.password;
      }

      let createdEntityId = id;
      let createdPatientCode = "";
      let createdFranchiseId = String(input.franchiseId || urlFranchiseId || "");
      if (isNew) {
        const res = await mutations.create.mutateAsync(input as never);
        const created = (res as any)?.data ?? res;
        createdEntityId = created?.id || (res as any)?.id || "";
        createdPatientCode = created?.patientCode || (res as any)?.patientCode || (input.patientCode as string) || "";
        createdFranchiseId = String(
          created?.franchiseId ||
          created?.franchise?.id ||
          input.franchiseId ||
          urlFranchiseId ||
          ""
        );
      } else {
        if (kind === "patients" && isTechnician) {
          setFormError("Technicians cannot edit patient records.");
          return;
        }
        await mutations.update.mutateAsync({ id, input: input as never });
      }

      if (kind === "patients" && proceedToBilling && createdEntityId) {
        const docParam = input.referringDoctorId ? `&doctorId=${encodeURIComponent(String(input.referringDoctorId))}` : "";
        const franchiseParam = createdFranchiseId ? `&franchiseId=${encodeURIComponent(createdFranchiseId)}` : "";
        router.push(`/billing/new?patientId=${createdEntityId}&patientCode=${encodeURIComponent(createdPatientCode)}${docParam}${franchiseParam}`);
      } else {
        router.push(`/${kind}`);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to save record. Please check the inputs.";
      setFormError(msg);
      if (msg.toLowerCase().includes("email")) {
        setErrors({ email: msg });
      }
      if (msg.toLowerCase().includes("code")) {
        setErrors({ code: msg });
      }
      if (msg.toLowerCase().includes("patient code") || msg.toLowerCase().includes("patientcode")) {
        setErrors({ patientCode: msg });
      }
      if (msg.toLowerCase().includes("phone")) {
        setErrors({ phone: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 1. LIST VIEW
  if (!path.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={config.plural}
          description={`Manage registered ${config.plural.toLowerCase()}, credentials, roles, and profiles.`}
          action={
            (kind === "franchises" ? isAdmin : canManage) && (
              <Link href={`/${kind}/new`}>
                <Button variant="primary" leftIcon={<Plus size={16} />}>
                  Add {config.singular}
                </Button>
              </Link>
            )
          }
        />
        <DataTable
          columns={columns as any}
          data={list.data as any}
          isLoading={list.isLoading}
          isError={list.isError}
          searchable
          searchPlaceholder={`Search ${config.plural.toLowerCase()}...`}
        />

        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                  <p className="text-xs text-[color:var(--muted)]">This action will delete the record from database.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
                Are you sure you want to permanently delete this {config.singular.toLowerCase()}?
              </p>
              <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
                <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" loading={mutations.remove.isPending} onClick={handleDelete}>
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. LOADING STATE FOR DETAIL/EDIT
  const record = isNew ? emptyInitialValues[kind] : detail.data;
  if (!record && !isNew) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[color:var(--muted)]">
        Loading {config.singular.toLowerCase()} record…
      </div>
    );
  }

  // 3. DETAIL VIEW
  if (!editable && record) {
    if (kind === "doctors") {
      return <DoctorLedgerView doctorId={id} />;
    }
    const raw = record as Record<string, unknown>;
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title={(record as { name?: string }).name ?? config.singular}
          description={`${config.singular} record details, credentials, and profile history.`}
          action={
            <div className="flex items-center gap-2">
              <Link href={`/${kind}`}>
                <Button variant="ghost">← Back to {config.plural}</Button>
              </Link>
              {kind === "patients" && (
                <Link href={billingHrefFromPatient({ ...(record as Patient), id })}>
                  <Button variant="primary" leftIcon={<IndianRupee size={15} />}>
                    Initiate Billing
                  </Button>
                </Link>
              )}
              {(kind === "franchises" ? isAdmin : canEdit) && (
                <Link href={`/${kind}/${id}/edit`}>
                  <Button variant="outline" leftIcon={<Edit3 size={15} />}>Edit {config.singular}</Button>
                </Link>
              )}
              {(kind === "franchises" ? isAdmin : canDelete) && (
                <Button
                  variant="danger-outline"
                  leftIcon={<Trash2 size={15} />}
                  onClick={() => setConfirmDeleteId(id)}
                >
                  Delete
                </Button>
              )}
            </div>
          }
        />

        <Card padding={false} className="overflow-hidden">
          <dl className="grid gap-px bg-[color:var(--line)] sm:grid-cols-2">
            {Object.entries(raw)
              .filter(([key]) => {
                if (key === "id" || key === "passwordHash" || key === "password" || key.startsWith("_")) return false;
                if (key === "referringDoctorId" && raw.referringDoctor) return false;
                if (key === "franchiseId" && raw.franchise) return false;
                return true;
              })
              .map(([key, value]) => {
                const lines = formatDetailLines(key, value);
                const isEmpty = lines.length === 1 && lines[0] === DETAIL_NA;
                const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
                return (
                  <div className="bg-[color:var(--surface)] p-4" key={key}>
                    <dt className="text-xs font-semibold uppercase text-[color:var(--muted)]">{label}</dt>
                    <dd className="mt-1 text-sm font-medium">
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

        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="grid size-10 place-items-center rounded-xl bg-rose-50">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[color:var(--foreground)]">Confirm Permanent Delete</h3>
                  <p className="text-xs text-[color:var(--muted)]">This action will delete the record from database.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
                Are you sure you want to permanently delete this {config.singular.toLowerCase()}?
              </p>
              <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--line)] pt-4">
                <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" loading={mutations.remove.isPending} onClick={handleDelete}>
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. CREATE / EDIT FORM VIEW
  if (kind === "patients" && edit && isTechnician) {
    return <p className="text-sm text-[color:var(--muted)]">Redirecting…</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={isNew ? `Add New ${config.singular}` : `Edit ${config.singular}`}
        description={isNew ? `Fill out the required information, credentials, and settings below.` : `Update details, credentials, and settings below.`}
        action={
          <Link href={`/${kind}`}>
            <Button variant="ghost">← Back to {config.plural}</Button>
          </Link>
        }
      />

      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-3 shadow-sm">
          <AlertTriangle size={20} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Unable to save record</p>
            <p className="text-xs text-rose-600 mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      <Card>
        <Formik
          initialValues={formInitialValues}
          validationSchema={effectiveSchema}
          enableReinitialize
          validateOnMount={false}
          validateOnChange={true}
          validateOnBlur={true}
          onSubmit={handleFormSubmit}
        >
          {({ errors, touched, isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-8">
              {sections.map(([sectionTitle, fields]) => (
                <div key={sectionTitle} className="space-y-4">
                  <div className="border-b border-[color:var(--line)] pb-2">
                    <h3 className="text-sm font-bold tracking-tight text-[color:var(--foreground)]">
                      {sectionTitle}
                    </h3>
                  </div>
                  <Grid2>
                    {fields.map((field) => {
                      const errorMsg = touched[field.name as keyof typeof touched] ? (errors[field.name as keyof typeof errors] as string) : undefined;
                      const isPasswordField = field.type === "password";
                      const placeholder = isPasswordField && !isNew ? "Leave blank to keep current password" : field.placeholder;

                      return (
                        <UIField
                          key={field.name}
                          label={field.label}
                          name={field.name}
                          required={field.required && (isNew || !isPasswordField)}
                          hint={isPasswordField && !isNew ? "Leave blank to preserve existing password." : field.hint}
                          className={field.colSpan === 2 ? "sm:col-span-2" : ""}
                          error={errorMsg}
                        >
                          {kind === "patients" && field.name === "referringDoctorId" ? (
                            <SearchableCombobox
                              options={getDoctorOptions((values as any).franchiseId)}
                              value={((values as any).referringDoctorId as string) || ""}
                              onChange={(val) => setFieldValue("referringDoctorId", val)}
                              placeholder="Select Referring Doctor or Referral Source (e.g. Doctor, Self, Collection Centre)..."
                              searchPlaceholder="Search doctor or business referral source..."
                              loading={doctorsList.isLoading}
                              allowClear
                            />
                          ) : field.type === "select" ? (
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
                                if (kind === "patients" && isNew && field.name === "franchiseId") {
                                  const updatedCode = getNextPatientCodeForFranchise(selected);
                                  setFieldValue("patientCode", updatedCode);
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
                            <Field
                              name={field.name}
                              as={Textarea}
                              placeholder={placeholder}
                            />
                          ) : kind === "patients" && field.name === "age" ? (
                            (values as any).dateOfBirth ? (
                              <Input
                                readOnly
                                tabIndex={-1}
                                value={formatPatientAgeLabel((values as any).dateOfBirth, (values as any).age)}
                                className="cursor-not-allowed bg-slate-50 font-semibold"
                              />
                            ) : (
                              <Field
                                name="age"
                                type="number"
                                as={Input}
                                placeholder={placeholder}
                              />
                            )
                          ) : field.name === "dateOfBirth" ? (
                            <Field
                              name={field.name}
                              type="date"
                              as={Input}
                              placeholder={placeholder}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const val = e.target.value;
                                setFieldValue("dateOfBirth", val);
                                if (kind === "patients") {
                                  const computedAge = calculateAgeFromDob(val);
                                  if (computedAge !== "") {
                                    setFieldValue("age", computedAge);
                                  }
                                }
                              }}
                            />
                          ) : (
                            <Field
                              name={field.name}
                              type={field.type}
                              as={Input}
                              placeholder={placeholder}
                            />
                          )}
                        </UIField>
                      );
                    })}
                  </Grid2>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-[color:var(--line)]">
                <Button 
                  type="submit" 
                  variant="primary" 
                  loading={isSubmitting || mutations.create.isPending || mutations.update.isPending}
                  onClick={() => setProceedToBilling(false)}
                >
                  {isNew ? `Register ${config.singular}` : `Update ${config.singular}`}
                </Button>
                {kind === "patients" && isNew && (
                  <Button
                    type="submit"
                    variant="secondary"
                    leftIcon={<IndianRupee size={15} />}
                    loading={isSubmitting || mutations.create.isPending}
                    onClick={() => setProceedToBilling(true)}
                  >
                    Save & Proceed to Billing
                  </Button>
                )}
                <Link href={`/${kind}`}>
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
                {!isNew && isAdmin && (
                  <Button
                    type="button"
                    variant="danger-outline"
                    className="ml-auto"
                    leftIcon={<Trash2 size={15} />}
                    onClick={() => setConfirmDeleteId(id)}
                  >
                    Delete {config.singular}
                  </Button>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </div>
  );
}
