export type UserRole = "Administrator" | "Pathologist" | "Technician" | "Admin" | "Receptionist" | "Doctor" | "Franchise" | "Billing";

export interface Franchise {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  licenseNumber?: string;
  gstNumber?: string;
  revenueShare?: number;
  status: "Active" | "Inactive" | "Suspended";
  notes?: string;
  createdAt?: string;
  _count?: {
    patients?: number;
    samples?: number;
    invoices?: number;
    users?: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  active?: boolean;
  permissions?: readonly string[];
  avatar?: string;
  mobile?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  location?: string;
  franchiseId?: string;
  franchise?: { id: string; name: string; code: string; city: string; status: string };
}

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  age: number;
  sex: "Female" | "Male" | "Other";
  phone: string;
  createdAt: string;
  email?: string;
  city?: string;
  status?: "Active" | "Inactive";
  bloodGroup?: string;
  referringDoctorId?: string;
  franchiseId?: string;
  registrationDate?: string;
  address?: string;
  state?: string;
  pincode?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  createdBy?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  phone: string;
  email?: string;
  city?: string;
  gender?: string;
  experience?: string;
  description?: string;
  dateOfJoining?: string;
  franchiseId?: string;
  franchise?: Franchise;
  createdBy?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  pincode: string;
  description?: string;
  emergencyContact?: string;
  createdBy?: string;
}

export interface Sample {
  id: string;
  accession: string;
  barcode?: string;
  patientId: string;
  franchiseId?: string;
  sampleType?: "Blood" | "Serum" | "Plasma" | "Urine" | "Other";
  collectedAt: string;
  receivedAt?: string;
  receivedBy?: string;
  priority?: "Routine" | "Urgent" | "STAT";
  notes?: string;
  status: "Collected" | "Received" | "Processing" | "Completed" | "Rejected";
  createdBy?: string;
}

export interface Test {
  id: string;
  code: string;
  name: string;
  department: string;
  sampleId?: string;
  patientId?: string;
  franchiseId?: string;
  sampleType?: string;
  price?: number;
  discountPrice?: number;
  referenceRange?: string;
  unit?: string;
  turnaroundHours: number;
  status?: "Active" | "Inactive";
  patient?: Patient;
  sample?: Sample;
  franchise?: Franchise;
  createdBy?: string;
}

export interface TestMaster {
  id: string;
  itemId?: string;
  code: string;
  name: string;
  department: string;
  rate: number;
  mrp: number;
  discountPrice?: number;
  sampleType?: string;
  referenceRange?: string;
  unit?: string;
  turnaroundHours: number;
  status: "Active" | "Inactive";
  franchiseId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestSubParameter {
  id: string;
  department: string;
  mainParameter: string;
  subParameter: string;
  unit?: string;
  referenceRange?: string;
  defaultValue?: string;
  orderIndex: number;
  franchiseId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Result {
  id: string;
  testId: string;
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  abnormalFlag: boolean;
  criticalFlag: boolean;
  flag?: string | null;
  interpretation?: string | null;
  comments?: string;
}

export interface InterpretationRule {
  id: string;
  parameterKey: string;
  parameterName: string;
  aliases: string[];
  testName?: string | null;
  franchiseId?: string | null;
  franchise?: { id: string; name: string } | null;
  gender: "Both" | "Male" | "Female";
  ageMinYears?: number | null;
  ageMaxYears?: number | null;
  unit?: string | null;
  resultType: "Numeric" | "Qualitative";
  normalMin?: number | null;
  normalMax?: number | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  lowText?: string | null;
  normalText?: string | null;
  highText?: string | null;
  criticalText?: string | null;
  bands?: { above?: number | null; upTo?: number | null; flag: string; label?: string | null; text?: string | null }[] | null;
  outcomes?: { values: string[]; flag: string; label?: string | null; text?: string | null }[] | null;
  referenceRangeText?: string | null;
  status: "Draft" | "Approved" | "Inactive";
  version: number;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  updatedAt?: string;
}

export interface Report {
  id: string;
  reportNumber: string;
  patientId: string;
  sampleId: string;
  doctorId: string;
  franchiseId?: string;
  testIds: readonly string[];
  resultIds: readonly string[];
  department?: string;
  priority?: string;
  status: "Draft" | "Pending Review" | "Approved" | "Rejected" | "Retest Requested";
  createdAt: string;
  pathologist?: string;
  comments?: string;
  createdBy?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  department: string;
  tests: readonly string[];
  header: string;
  footer: string;
  referenceRanges: string;
  notes: string;
  signatory: string;
  active: boolean;
}

export interface DashboardStats {
  totalPatients: number;
  samplesToday: number;
  pendingTests: number;
  completedTests: number;
  pendingReports: number;
  reportsToday: number;
  criticalResults: number;
  revenue: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface MonthlyProfitLossItem {
  month: string;
  monthIndex: number;
  year: number;
  totalSale: number;
  totalCost: number;
  profitLoss: number;
  marginPercentage: number;
}

export interface ProfitLossReport {
  year: number;
  franchiseId: string | null;
  franchiseName: string;
  totalSale: number;
  totalCost: number;
  netProfitLoss: number;
  overallMargin: number;
  monthlyData: readonly MonthlyProfitLossItem[];
}

export interface Activity {
  id: string;
  type: "Patient registered" | "Sample collected" | "Test completed" | "Report approved" | "Critical result";
  subject: string;
  detail: string;
  time: string;
}

export interface PendingWork {
  id: string;
  patient: string;
  sampleId: string;
  test: string;
  department: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: "Collected" | "Received" | "Processing" | "Completed" | "Rejected";
  collectedAt: string;
  technician: string;
}

export interface CriticalResult {
  id: string;
  patient: string;
  test: string;
  result: string;
  criticalValue: string;
  time: string;
  status: "Unreviewed" | "Acknowledged";
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  franchiseId?: string;
  date: string;
  time: string;
  type: string;
  status: "Upcoming" | "Completed" | "Cancelled" | "Rescheduled";
  appointmentLink?: string;
  createdBy: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  mrp: number;
}

export interface Invoice {
  id: string;
  billNumber: string;
  patientId: string;
  doctorId: string;
  franchiseId?: string;
  billDate: string;
  items: readonly InvoiceItem[];
  discount: number;
  sgst: number;
  cgst: number;
  total: number;
  paymentStatus: "Paid" | "Pending" | "Partially Paid";
  addedBy: string;
  createdBy?: string;
}

export interface InventoryItem {
  id: string;
  medicine: string;
  stockQuantity: number;
  purchasePrice: number;
  salePrice: number;
  stockHolder: string;
  batchNumber: string;
  expiryDate: string;
  reorderLevel: number;
  franchiseId?: string;
  createdBy?: string;
}

export type QCStatus = "Passed" | "Failed" | "Warning" | "Pending";
export type ControlLevel = "Normal" | "Low" | "High";
export type ViolationStatus = "Open" | "Reviewed" | "Acknowledged" | "Resolved";

export interface QCParameter {
  id: string;
  analyte: string;
  instrumentId: string;
  instrumentName?: string;
  controlLevel: ControlLevel;
  mean: number;
  sd: number;
  acceptableMin: number;
  acceptableMax: number;
  unit: string;
  lotNumber?: string;
  effectiveDate?: string;
  active: boolean;
}

export interface QCRun {
  id: string;
  runNumber: string;
  runDate: string;
  analyte: string;
  instrumentId: string;
  instrumentName?: string;
  controlLevel: ControlLevel;
  parameterId: string;
  value: number;
  mean: number;
  sd: number;
  unit?: string;
  status: QCStatus;
  zScore: number;
  operatorId?: string;
  operatorName?: string;
  notes?: string;
}

export interface QCViolation {
  id: string;
  qcRunId: string;
  runDate: string;
  analyte: string;
  instrumentId: string;
  instrumentName?: string;
  controlLevel: ControlLevel;
  value: number;
  expectedRange: string;
  mean: number;
  sd: number;
  violationType: "1_2S" | "1_3S" | "2_2S" | "R_4S" | "4_1S" | "10_X" | "Shift" | "Trend" | "Out of range";
  status: ViolationStatus;
  correctiveAction?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
}

export interface QCDashboardStats {
  totalRunsToday: number;
  passedRuns: number;
  failedRuns: number;
  pendingReview: number;
  activeControls: number;
  recentViolations: number;
}

export type InstrumentStatus = "Online" | "Offline" | "Maintenance" | "Error";
export type InstrumentType = "Hematology Analyzer" | "Biochemistry Analyzer" | "Urine Analyzer" | "Electrolyte Analyzer" | "ELISA Reader" | "PCR Machine" | "Centrifuge" | "Microscope" | "Other";
export type ConnectionStatus = "Connected" | "Disconnected" | "Connecting" | "Error";

export interface Instrument {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  department: string;
  instrumentType: InstrumentType;
  status: InstrumentStatus;
  installationDate: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  connectionStatus: ConnectionStatus;
  lastCommunication?: string;
  ipAddress?: string;
  location?: string;
  description?: string;
}

export interface AnalyzerResult {
  id: string;
  instrumentId: string;
  instrumentName: string;
  receivedAt: string;
  sampleId?: string;
  barcode?: string;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  raw?: Record<string, unknown>;
  status: "Received" | "Matched" | "Unmatched" | "Error";
}

export interface AnalyzerOrder {
  id: string;
  instrumentId: string;
  instrumentName: string;
  sentAt: string;
  sampleId: string;
  barcode: string;
  testCodes: readonly string[];
  status: "Pending" | "Sent" | "Acknowledged" | "Error";
}

export interface AnalyzerIntegrationError {
  id: string;
  instrumentId: string;
  instrumentName: string;
  timestamp: string;
  errorType: string;
  message: string;
  acknowledged: boolean;
}

export interface IAnalyzerAdapter {
  id: string;
  name: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getStatus(): Promise<{ connected: boolean; lastSync?: string; pendingResults: number; pendingOrders: number }>;
  receiveResults(): Promise<readonly AnalyzerResult[]>;
  sendOrders(orders: readonly { sampleId: string; barcode: string; testCodes: readonly string[] }[]): Promise<boolean>;
}

export interface LaboratoryInfo {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  accreditation?: string;
  licenseNumber?: string;
}

export interface ReportSettings {
  header: string;
  logo?: string;
  footer: string;
  signature?: string;
  reportNumberingPrefix: string;
  reportNumberingNext: number;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  showLogo: boolean;
  showSignatory: boolean;
  autoApprovePathologist: boolean;
}

export interface ReferenceRange {
  id: string;
  testCode: string;
  testName: string;
  parameter: string;
  gender: "Male" | "Female" | "Both";
  ageMin?: number;
  ageMax?: number;
  minimum: number;
  maximum: number;
  unit: string;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface UnitDefinition {
  id: string;
  code: string;
  name: string;
  category: string;
  baseUnit?: string;
  conversionFactor?: number;
}

export interface NotificationSettings {
  criticalResultAlerts: boolean;
  pendingReportAlerts: boolean;
  qcAlerts: boolean;
  inventoryAlerts: boolean;
  appointmentReminders: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

export interface SystemPreferences {
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  language: "English" | "Hindi" | "Tamil" | "Telugu" | "Bengali" | "Marathi";
  theme: "light" | "dark" | "system";
  defaultLandingPage: string;
  resultsPerPage: number;
}

export interface AppSettings {
  laboratory: LaboratoryInfo;
  report: ReportSettings;
  referenceRanges: readonly ReferenceRange[];
  units: readonly UnitDefinition[];
  notifications: NotificationSettings;
  system: SystemPreferences;
}

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "pending";

// ==========================================
// MONTHLY REVENUE / SALES REPORT TYPES
// ==========================================
export interface SalesReportInvoiceItem {
  id: string;
  billNumber: string;
  billDate: string;
  createdAt: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  itemsSummary: string;
  items?: any;
  total: number;
  discount: number;
  paymentStatus: string;
  franchiseId?: string;
  franchiseName?: string;
  franchiseCode?: string;
  addedBy?: string;
}

export interface DateWiseSalesBreakdown {
  date: string;
  totalSales: number;
  paidAmount: number;
  pendingAmount: number;
  invoiceCount: number;
  uniquePatients: number;
}

export interface FranchiseWiseSalesBreakdown {
  franchiseId: string;
  franchiseName: string;
  franchiseCode: string;
  totalSales: number;
  paidAmount: number;
  pendingAmount: number;
  invoiceCount: number;
}

export interface MonthlySalesReport {
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  franchiseId: string | null;
  franchiseName: string;
  summary: {
    totalSales: number;
    paidAmount: number;
    pendingAmount: number;
    totalDiscount: number;
    totalTax: number;
    totalInvoices: number;
    uniquePatients: number;
    averageInvoiceValue: number;
  };
  dateWiseBreakdown: DateWiseSalesBreakdown[];
  franchiseWiseBreakdown?: FranchiseWiseSalesBreakdown[];
  invoices: SalesReportInvoiceItem[];
}

// ==========================================
// DOCTOR BUSINESS / LEDGER REPORT TYPES
// ==========================================
export interface DoctorLedgerInvoiceItem {
  id: string;
  billNumber: string;
  billDate: string;
  createdAt: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  itemsSummary: string;
  items?: any;
  total: number;
  discount: number;
  paymentStatus: string;
  franchiseName?: string;
  franchiseCode?: string;
}

export interface DoctorLedgerDateBreakdown {
  date: string;
  totalBusiness: number;
  totalPaid: number;
  totalPending: number;
  invoiceCount: number;
  uniquePatients: number;
}

export interface DoctorLedgerPatientItem {
  id: string;
  patientCode: string;
  name: string;
  age: number;
  sex: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  createdAt: string;
  totalInvoices: number;
  totalSpent: number;
  franchiseName?: string;
}

export interface DoctorLedgerReport {
  doctor: {
    id: string;
    name: string;
    specialty?: string | null;
    phone: string;
    email?: string | null;
    city?: string | null;
    gender?: string | null;
    experience?: string | null;
    dateOfJoining?: string | null;
    franchiseId?: string | null;
    franchiseName?: string;
    franchiseCode?: string;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalBusiness: number;
    totalPaid: number;
    totalPending: number;
    totalDiscount: number;
    totalInvoices: number;
    totalPatients: number;
    averageInvoiceValue: number;
  };
  dateWiseBreakdown: DoctorLedgerDateBreakdown[];
  invoices: DoctorLedgerInvoiceItem[];
  patients?: DoctorLedgerPatientItem[];
  ledger?: DoctorAccountLedger;
}

export interface DoctorAccountLedgerEntry {
  id: string;
  type: "Bill" | "Payment";
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMode?: string | null;
  createdAt: string;
}

export interface DoctorAccountLedger {
  openingBalance: number;
  totalBilled: number;
  totalReceived: number;
  closingBalance: number;
  currentOutstanding: number;
  entries: DoctorAccountLedgerEntry[];
}

export interface DoctorPaymentInput {
  paymentDate: string;
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  notes?: string;
}

export interface TestWiseReportRecord {
  invoiceId: string;
  billNumber: string;
  date: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  franchiseName: string;
  testCode: string;
  testName: string;
  quantity: number;
  rate: number;
  grossAmount: number;
  netAmount: number;
  paymentStatus: string;
}

export interface TestWiseReport {
  test: { code: string; name: string };
  dateRange: { startDate: string | null; endDate: string | null };
  summary: {
    totalTests: number;
    totalGross: number;
    totalNet: number;
    totalDiscount: number;
    invoiceCount: number;
    uniquePatients: number;
    activeDays: number;
  };
  dateWiseBreakdown: { date: string; testCount: number; rates: number[]; grossAmount: number; netAmount: number }[];
  records: TestWiseReportRecord[];
}

