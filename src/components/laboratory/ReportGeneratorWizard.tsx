"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  AlertCircle, CheckCircle2, ChevronRight, ClipboardCheck, FileText, 
  FlaskConical, Sparkles, User, ArrowLeft, Plus, ShieldCheck, Microscope,
  Check, ArrowRight, Layers
} from "lucide-react";
import { PageHeader, Card, Button, Input, Select, Textarea, Field as UIField, StatusBadge, cn, SearchableCombobox, ComboboxOption } from "@/components/ui/index";
import { usePatients, useDoctors, useEntity } from "@/features/crud/hooks";
import { useSamples } from "@/features/laboratory/hooks";
import { useTestMasters } from "@/features/test-masters/hooks";
import { useReportTemplates } from "@/features/reports/hooks";
import { reportApi } from "@/mocks/services/resources";
import { authService } from "@/lib/auth/auth-service";
import { 
  STANDARD_TEST_CATALOG, 
  getTestParameterSchema, 
  getSubParametersForTest,
  evaluateParameterFlag,
  crpMaxForPatient,
  ggtLimitsForPatient,
  type ParameterDefinition,
  type TestDefinition
} from "@/lib/laboratory/test-parameter-definitions";
import { SubParameterSelect } from "@/components/laboratory/SubParameterSelect";
import { resolveClinicalNotesConfig } from "@/lib/laboratory/letterhead-registry";
import { formatPatientAgeLabel } from "@/lib/patient-age";
import { useFranchise } from "@/lib/context/franchise-context";
import { useInterpretationRules } from "@/features/interpretation/hooks";
import { interpretResult, patientAgeYears, type InterpretationResult } from "@/lib/laboratory/interpretation-engine";
import type { Patient, Sample, Doctor, TestMaster } from "@/types/domain";

interface PrescribedTestItem {
  name: string;
  code?: string;
  department?: string;
  mrp?: number;
  subParameters?: string[];
}

export function ReportGeneratorWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams?.get("patientId") || "";
  const initialPatientCode = searchParams?.get("patientCode") || "";
  const initialTestCode = searchParams?.get("testCode") || "";
  const initialDoctorId = searchParams?.get("doctorId") || "";
  const initialFranchiseId = searchParams?.get("franchiseId") || "";
  const rawTestsParam = searchParams?.get("tests") || "";

  // Parse prescribed tests from query if available
  const prescribedTestItems = useMemo<PrescribedTestItem[]>(() => {
    if (!rawTestsParam) return [];
    try {
      const parsed = JSON.parse(rawTestsParam);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => {
          if (typeof t === "string") {
            return { name: t, code: t };
          }
          return {
            name: t.name || t.code || t.description || "",
            code: t.code,
            department: t.department,
            mrp: t.mrp,
            subParameters: Array.isArray(t.subParameters) ? t.subParameters : undefined,
          };
        }).filter(item => Boolean(item.name && item.name.trim()));
      }
    } catch {
      return rawTestsParam.split(",").map(t => t.trim()).filter(Boolean).map(t => ({ name: t, code: t }));
    }
    return [];
  }, [rawTestsParam]);

  const parsedPrescribedTests = useMemo<string[]>(() => {
    return prescribedTestItems.map(item => item.name);
  }, [prescribedTestItems]);

  const isFlowMode = Boolean(initialPatientId || initialPatientCode || parsedPrescribedTests.length > 0);
  const defaultTestCode = initialTestCode || (parsedPrescribedTests.length > 0 ? parsedPrescribedTests[0] : "CBC");

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  const { selectedFranchiseId, setSelectedFranchiseId } = useFranchise();
  const patientsQuery = usePatients();
  const doctorsQuery = useDoctors();
  const urlPatientQuery = useEntity<Patient>("patients", initialPatientId);
  const samplesQuery = useSamples();
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);

  const looksLikeUuid = (value: string) => value.includes("-") && value.length >= 32;

  const currentPatient = useMemo(() => {
    const list = (patientsQuery.data ?? []) as Patient[];
    if (selectedPatientId) {
      const byId = list.find((p) => p.id === selectedPatientId);
      if (byId) return byId;
      if (urlPatientQuery.data?.id === selectedPatientId) return urlPatientQuery.data;
      if (looksLikeUuid(selectedPatientId)) return urlPatientQuery.data ?? undefined;
    }
    return undefined;
  }, [patientsQuery.data, selectedPatientId, urlPatientQuery.data]);

  const activeFranchiseId = useMemo(() => {
    return (
      initialFranchiseId ||
      currentPatient?.franchiseId ||
      (currentPatient as any)?.franchise?.id ||
      (selectedFranchiseId !== "all" ? selectedFranchiseId : undefined)
    );
  }, [initialFranchiseId, currentPatient, selectedFranchiseId]);

  const clinicalNotesConfig = useMemo(
    () =>
      resolveClinicalNotesConfig([
        activeFranchiseId,
        currentPatient?.franchiseId,
        (currentPatient as any)?.franchise?.id,
        (currentPatient as any)?.franchise?.code,
        (currentPatient as any)?.franchise?.name,
      ]),
    [activeFranchiseId, currentPatient]
  );

  const testMastersQuery = useTestMasters("", undefined, 2500, activeFranchiseId);
  const templatesQuery = useReportTemplates();
  const [selectedTestName, setSelectedTestName] = useState(defaultTestCode);
  const [customTestName, setCustomTestName] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId);
  const [accession, setAccession] = useState(`LIS-${Date.now().toString().slice(-6)}`);
  const [barcode, setBarcode] = useState(`E${Date.now().toString().slice(-7)}`);
  const [sampleType, setSampleType] = useState("Whole Blood EDTA");
  const [reportStatus, setReportStatus] = useState<"Draft" | "Pending Review" | "Approved">("Approved");
  const [pathologist, setPathologist] = useState("Dr. Namrata, MBBS, MD(Pathology)");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Map of test name / code -> selected sub-parameters
  const [testSubParamsMap, setTestSubParamsMap] = useState<Record<string, string[]>>(() => {
    const initialMap: Record<string, string[]> = {};
    prescribedTestItems.forEach(item => {
      if (item.subParameters && item.subParameters.length > 0) {
        if (item.name) initialMap[item.name] = item.subParameters;
        if (item.code) initialMap[item.code] = item.subParameters;
      }
    });
    return initialMap;
  });

  // Sync sub-parameters map when prescribed items arrive
  useEffect(() => {
    if (prescribedTestItems.length > 0) {
      setTestSubParamsMap(prev => {
        const next = { ...prev };
        prescribedTestItems.forEach(item => {
          if (item.subParameters && item.subParameters.length > 0) {
            if (item.name && !next[item.name]) next[item.name] = item.subParameters;
            if (item.code && !next[item.code]) next[item.code] = item.subParameters;
          }
        });
        return next;
      });
    }
  }, [prescribedTestItems]);

  // Multi-test sequential queue state
  const [pendingTestList, setPendingTestList] = useState<string[]>(parsedPrescribedTests);
  const [completedTestList, setCompletedTestList] = useState<string[]>([]);
  const [createdReportsSummary, setCreatedReportsSummary] = useState<Array<{ testName: string; reportId: string; accession: string }>>([]);

  const [currentSession, setCurrentSession] = useState<{ role?: string; franchiseId?: string } | null>(null);

  useEffect(() => {
    const s = authService.getSession();
    if (s) {
      setCurrentSession({ role: s.role, franchiseId: s.franchiseId });
    }
  }, []);

  useEffect(() => {
    if (!initialFranchiseId) return;
    const role = currentSession?.role || authService.getSession()?.role;
    const isUserAdmin = role === "Admin" || role === "Administrator";
    if (isUserAdmin && selectedFranchiseId !== initialFranchiseId) {
      setSelectedFranchiseId(initialFranchiseId);
    }
  }, [initialFranchiseId, currentSession?.role, selectedFranchiseId, setSelectedFranchiseId]);

  const isAdmin = currentSession?.role === "Admin" || currentSession?.role === "Administrator";

  // Sync initial pending list when parsedPrescribedTests changes
  useEffect(() => {
    if (parsedPrescribedTests.length > 0 && pendingTestList.length === 0 && completedTestList.length === 0) {
      setPendingTestList(parsedPrescribedTests);
      if (!selectedTestName || selectedTestName === "CBC") {
        setSelectedTestName(parsedPrescribedTests[0]);
      }
    }
  }, [parsedPrescribedTests]);

  // Match initial patient from URL by id only (patient codes like BL-01 are reused across franchises)
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
      const list = (patientsQuery.data ?? []) as Patient[];
      const match =
        list.find((p) => p.id === initialPatientId) ||
        (urlPatientQuery.data?.id === initialPatientId ? urlPatientQuery.data : undefined);
      if (match?.referringDoctorId && !selectedDoctorId) {
        setSelectedDoctorId(match.referringDoctorId);
      }
      return;
    }
    if (initialPatientCode && (patientsQuery.data ?? []).length > 0) {
      const list = patientsQuery.data as Patient[];
      const matches = list.filter((p) => p.patientCode === initialPatientCode);
      const match = initialFranchiseId
        ? matches.find((p) => (p.franchiseId || (p as any).franchise?.id) === initialFranchiseId) || matches[0]
        : matches[0];
      if (match) {
        setSelectedPatientId(match.id);
        if (match.referringDoctorId && !selectedDoctorId) {
          setSelectedDoctorId(match.referringDoctorId);
        }
      }
    }
  }, [initialPatientId, initialPatientCode, initialFranchiseId, patientsQuery.data, urlPatientQuery.data]);

  // Combobox options with Date Filter and Franchise scoping (for direct access)
  const patientComboboxOptions = useMemo<ComboboxOption[]>(() => {
    let allPatients = (patientsQuery.data ?? []) as Patient[];
    if (!isAdmin && currentSession?.franchiseId) {
      allPatients = allPatients.filter(p => !p.franchiseId || p.franchiseId === currentSession.franchiseId);
    }

    if (selectedDateFilter) {
      allPatients = allPatients.filter(p => {
        const pDate = p.registrationDate || p.createdAt?.slice(0, 10);
        return pDate === selectedDateFilter;
      });
    }

    const mapped = allPatients.map((p) => {
      const pDate = p.registrationDate || p.createdAt?.slice(0, 10) || "";
      return {
        value: p.id,
        label: p.name,
        secondary: `Code: ${p.patientCode || p.id} · Age: ${formatPatientAgeLabel(p.dateOfBirth, p.age)} · ${p.sex || ""}${pDate ? ` · Reg: ${pDate}` : ""}`,
        badge: p.phone,
        extra: p,
      };
    });

    if (currentPatient && !mapped.some((o) => o.value === currentPatient.id)) {
      const pDate = currentPatient.registrationDate || currentPatient.createdAt?.slice(0, 10) || "";
      mapped.unshift({
        value: currentPatient.id,
        label: currentPatient.name,
        secondary: `Code: ${currentPatient.patientCode || currentPatient.id} · Age: ${formatPatientAgeLabel(currentPatient.dateOfBirth, currentPatient.age)} · ${currentPatient.sex || ""}${pDate ? ` · Reg: ${pDate}` : ""}`,
        badge: currentPatient.phone,
        extra: currentPatient,
      });
    }

    return mapped;
  }, [patientsQuery.data, isAdmin, currentSession, selectedDateFilter, currentPatient]);

  const doctorComboboxOptions = useMemo<ComboboxOption[]>(() => {
    const doctors = (doctorsQuery.data ?? []) as Doctor[];
    const filtered = (!isAdmin && currentSession?.franchiseId)
      ? doctors.filter(d => !d.franchiseId || d.franchiseId === currentSession.franchiseId)
      : doctors;

    return filtered.map((d) => ({
      value: d.id,
      label: d.name,
      secondary: d.specialty || "Practitioner",
      badge: d.phone,
      extra: d,
    }));
  }, [doctorsQuery.data, isAdmin, currentSession]);

  const testMasterComboboxOptions = useMemo<ComboboxOption[]>(() => {
    const dbTests = (testMastersQuery.data ?? []) as TestMaster[];
    
    // Combine standard schemas and all DB test masters
    const dbOptions: ComboboxOption[] = dbTests.map((t) => ({
      value: t.code || t.name,
      label: t.name,
      secondary: `Code: ${t.code} · Rate: ₹${t.rate} · MRP: ₹${t.mrp}`,
      badge: t.department,
      extra: t,
    }));

    return dbOptions;
  }, [testMastersQuery.data]);


  // Set default doctor from patient when patient changes
  useEffect(() => {
    if (currentPatient?.referringDoctorId && !selectedDoctorId) {
      setSelectedDoctorId(currentPatient.referringDoctorId);
    }
  }, [currentPatient, selectedDoctorId]);

  // If initialPatientId not set and no selectedPatientId, default to first available
  useEffect(() => {
    if (!selectedPatientId && !initialPatientId && patientComboboxOptions.length > 0) {
      setSelectedPatientId(patientComboboxOptions[0].value);
    }
  }, [patientComboboxOptions, selectedPatientId, initialPatientId]);

  // Load Test Schema
  const activeTestSchema: TestDefinition = useMemo(() => {
    const masters = (testMastersQuery.data ?? []) as TestMaster[];
    const selectedMaster = masters.find(
      (t) => t.code === selectedTestName || t.name === selectedTestName
    );
    const testKey = selectedTestName === "CUSTOM" ? customTestName : selectedTestName;
    const lookupKey = [testKey, selectedMaster?.name, selectedMaster?.code]
      .filter(Boolean)
      .join(" ");
    const selectedSubParams = testSubParamsMap[selectedTestName] || testSubParamsMap[testKey] || testSubParamsMap[selectedMaster?.name || ""];
    return getTestParameterSchema(lookupKey || testKey, selectedSubParams, activeFranchiseId);
  }, [selectedTestName, customTestName, testSubParamsMap, activeFranchiseId, testMastersQuery.data]);

  // Approved interpretation rules (live preview; the backend re-evaluates authoritatively on save)
  const patientFranchiseId =
    currentPatient?.franchiseId || (currentPatient as { franchise?: { id?: string } } | null | undefined)?.franchise?.id || undefined;
  const { data: approvedRules = [] } = useInterpretationRules({ status: "Approved", franchiseId: patientFranchiseId }, Boolean(currentPatient));
  const patientAge = useMemo(() => patientAgeYears(currentPatient), [currentPatient]);
  const interpretParam = (param: ParameterDefinition, value: string, unit: string): InterpretationResult | null =>
    interpretResult(
      approvedRules,
      { parameterId: param.id, parameterName: param.name, unit, sex: currentPatient?.sex, ageYears: patientAge, franchiseId: patientFranchiseId },
      value
    );

  // Parameter values state
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramUnits, setParamUnits] = useState<Record<string, string>>({});
  const [paramRanges, setParamRanges] = useState<Record<string, string>>({});

  // Reset or initialize parameter values whenever test schema changes
  useEffect(() => {
    const initialVals: Record<string, string> = {};
    const initialUnits: Record<string, string> = {};
    const initialRanges: Record<string, string> = {};
    activeTestSchema.parameters.forEach(param => {
      initialVals[param.id] = "";
      initialUnits[param.id] = param.unit || "";
      initialRanges[param.id] = param.referenceRange || "";
    });
    setParamValues(initialVals);
    setParamUnits(initialUnits);
    setParamRanges(initialRanges);
    setSampleType(activeTestSchema.sampleType);
    setComments(
      clinicalNotesConfig.emptyMode === "dotted-lines" ? "" : (clinicalNotesConfig.defaultText || "")
    );
  }, [activeTestSchema, clinicalNotesConfig]);

  const handleValueChange = (paramId: string, val: string) => {
    setParamValues(prev => ({ ...prev, [paramId]: val }));
  };

  const handleQuickFillNormal = () => {
    const normalVals: Record<string, string> = {};
    const normalUnits: Record<string, string> = {};
    const normalRanges: Record<string, string> = {};
    activeTestSchema.parameters.forEach(p => {
      normalVals[p.id] = p.defaultValue || "";
      normalUnits[p.id] = p.unit || "";
      normalRanges[p.id] = p.referenceRange || "";
    });
    setParamValues(normalVals);
    setParamUnits(normalUnits);
    setParamRanges(normalRanges);
  };

  const remainingPendingInFlow = isFlowMode
    ? pendingTestList.filter(t => t.toLowerCase() !== selectedTestName.toLowerCase())
    : [];
  const isLastTestInFlow = isFlowMode ? remainingPendingInFlow.length === 0 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient) {
      setErrorMessage("Please select a registered patient to generate the report.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessToast(null);

    try {
      // Build results payload
      const resultsPayload = activeTestSchema.parameters.map(param => {
        if (param.isHeading) {
          return {
            parameter: param.name,
            value: "",
            unit: "",
            referenceRange: "HEADING",
            abnormalFlag: false,
            criticalFlag: false,
            comments: undefined,
          };
        }
        const value = paramValues[param.id] ?? "";
        const evalParam =
          param.id === "crp"
            ? { ...param, max: crpMaxForPatient(currentPatient) }
            : param.id === "ggt"
            ? { ...param, ...ggtLimitsForPatient(currentPatient) }
            : param;
        const evalResult = evaluateParameterFlag(value, evalParam);
        const unit = paramUnits[param.id] ?? param.unit ?? "";
        const interp = interpretParam(param, value, unit);
        return {
          parameterId: param.id,
          parameter: param.name,
          value,
          unit,
          referenceRange: paramRanges[param.id] ?? param.referenceRange ?? "",
          abnormalFlag: interp ? interp.isAbnormal : evalResult.isAbnormal,
          criticalFlag: interp ? interp.isCritical : evalResult.isCritical,
          flag: interp ? interp.flag : value.trim() ? evalResult.flag : undefined,
          comments: param.method ? `Method: ${param.method}` : undefined,
        };
      });

      const reportPayload = {
        patientId: currentPatient.id,
        doctorId: selectedDoctorId || undefined,
        franchiseId: currentPatient.franchiseId || (currentPatient as any).franchise?.id || undefined,
        accession,
        barcode,
        sampleType,
        testName: activeTestSchema.name,
        testCode: activeTestSchema.code,
        department: activeTestSchema.department,
        status: reportStatus,
        pathologist,
        comments,
        results: resultsPayload,
        testIds: [activeTestSchema.name],
      };

      const response = await reportApi.create(reportPayload as any);
      const createdId = (response as any)?.data?.id || (response as any)?.id || "";

      const currentDone = selectedTestName;
      const updatedCompleted = [...completedTestList, currentDone];
      const updatedPending = pendingTestList.filter(t => t.toLowerCase() !== currentDone.toLowerCase());
      const updatedSummary = [...createdReportsSummary, { testName: currentDone, reportId: createdId, accession }];

      setCompletedTestList(updatedCompleted);
      setPendingTestList(updatedPending);
      setCreatedReportsSummary(updatedSummary);

      if (isFlowMode && updatedPending.length > 0) {
        // Advance to next pending test
        const nextTest = updatedPending[0];
        setSelectedTestName(nextTest);
        setAccession(`LIS-${Date.now().toString().slice(-6)}`);
        setBarcode(`E${Date.now().toString().slice(-7)}`);
        setSuccessToast(`✓ Report for "${activeTestSchema.name}" created successfully! (${updatedCompleted.length} of ${parsedPrescribedTests.length} generated). Now enter values for "${nextTest}".`);
        setIsSubmitting(false);
        window.scrollTo({ top: 180, behavior: "smooth" });
      } else {
        // Flow complete or direct single test complete
        setIsSubmitting(false);
        router.push("/reports");
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to generate diagnostic report. Please check the inputs.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <PageHeader
        title={isFlowMode ? "Generate Diagnostic Reports (Billing Order)" : "Generate Diagnostic Report"}
        description={
          isFlowMode
            ? `Generating individual verified diagnostic reports for patient ${currentPatient?.name || ""} (${parsedPrescribedTests.length} tests billed).`
            : "Select patient, load dynamic test parameters from Master Database, enter technician values, and release verified diagnostic report."
        }
        action={
          <Link href="/reports">
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
              Back to Reports
            </Button>
          </Link>
        }
      />

      {/* Success Notification Banner */}
      {successToast && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3 shadow-xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Unable to generate report</p>
            <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Multi-Test Flow Progress Bar / Stepper (Only in Flow Mode) */}
      {isFlowMode && parsedPrescribedTests.length > 0 && (
        <Card className="border border-[#176b87]/30 bg-[#e8f4f7]/40 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#176b87]/20">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg bg-[#176b87] text-white font-bold text-sm shadow-xs">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)]">
                  Diagnostic Order Test Queue
                </h3>
                <p className="text-xs text-[color:var(--muted)]">
                  {completedTestList.length} of {parsedPrescribedTests.length} Reports Generated · {pendingTestList.length} Pending
                </p>
              </div>
            </div>
            <StatusBadge 
              tone={pendingTestList.length === 0 ? "success" : "info"} 
              size="sm"
            >
              {pendingTestList.length === 0 ? "All Reports Ready" : `${pendingTestList.length} Pending Report${pendingTestList.length > 1 ? "s" : ""}`}
            </StatusBadge>
          </div>

          {/* Test Queue Pills */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            {parsedPrescribedTests.map((tName, idx) => {
              const isCompleted = completedTestList.some(c => c.toLowerCase() === tName.toLowerCase());
              const isActive = selectedTestName.toLowerCase() === tName.toLowerCase();
              const isPending = !isCompleted && !isActive;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!isCompleted) {
                      setSelectedTestName(tName);
                    }
                  }}
                  disabled={isCompleted}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left",
                    isCompleted && "bg-emerald-50 text-emerald-800 border-emerald-200 cursor-default opacity-80",
                    isActive && "bg-[#176b87] text-white border-[#176b87] shadow-sm ring-2 ring-[#176b87]/30",
                    isPending && "bg-[color:var(--surface)] text-[color:var(--foreground)] border-[color:var(--line)] hover:border-[#176b87]/50 cursor-pointer"
                  )}
                >
                  <span className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-bold shrink-0",
                    isCompleted && "bg-emerald-200 text-emerald-900",
                    isActive && "bg-white text-[#176b87]",
                    isPending && "bg-slate-200 text-slate-700"
                  )}>
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <span>{tName}</span>
                  {isActive && (
                    <span className="text-[10px] font-normal opacity-90 ml-1">
                      (Generating Now)
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-medium text-emerald-700 ml-1">
                      (Saved)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Patient & Test Association */}
        <Card className="border border-[color:var(--line)] shadow-xs">
          <div className="border-b border-[color:var(--line)] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-[#e8f4f7] text-[#176b87] font-bold">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-[color:var(--foreground)]">
                  {isFlowMode ? "Patient & Order Association" : "Patient & Test Selection"}
                </h3>
                <p className="text-xs text-[color:var(--muted)]">
                  {isFlowMode 
                    ? "Patient details are locked from the current billing workflow." 
                    : "Search registered patient and select diagnostic test from Master Database."}
                </p>
              </div>
            </div>
            {currentPatient && (
              <StatusBadge tone="success" size="sm">
                Patient Verified: {currentPatient.name} ({currentPatient.patientCode || currentPatient.id})
              </StatusBadge>
            )}
          </div>

          {/* FLOW MODE: Fixed Read-Only Patient Card (No Patient Dropdown) */}
          {isFlowMode ? (
            <div className="space-y-6">
              {/* Verified Patient Overview */}
              {currentPatient ? (
                <div className="rounded-xl border border-[#176b87]/30 bg-[#e8f4f7]/50 p-4 text-xs text-[#176b87] shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#176b87]/20 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-sm text-[color:var(--foreground)]">{currentPatient.name}</span>
                      <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-[#176b87]/20 text-[#176b87]">
                        {currentPatient.patientCode || currentPatient.id}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#176b87] bg-white px-2.5 py-1 rounded-md border border-[#176b87]/20">
                      🔒 Flow Patient Locked
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                    <div>
                      <span className="text-[color:var(--muted)] block">Age / Gender</span>
                      <span className="font-semibold text-[color:var(--foreground)]">
                        {formatPatientAgeLabel(currentPatient.dateOfBirth, currentPatient.age)} · {currentPatient.sex || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Contact Phone</span>
                      <span className="font-mono font-semibold text-[color:var(--foreground)]">
                        {currentPatient.phone || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Sample Barcode</span>
                      <span className="font-mono font-bold text-[#176b87]">{barcode}</span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Registration Date</span>
                      <span className="font-medium text-[color:var(--foreground)]">
                        {currentPatient.registrationDate || currentPatient.createdAt?.slice(0, 10) || todayStr}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-700">
                  Loading patient record...
                </div>
              )}

              {/* Active Test & Referring Doctor Grid for Flow Mode */}
              <div className="grid gap-6 sm:grid-cols-2">
                <UIField 
                  label="Currently Active Diagnostic Test" 
                  name="activeTest" 
                  required 
                  hint="Test schema loaded for technician evaluation"
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-[#176b87]/30 bg-[#e8f4f7]/30 text-xs font-semibold text-[#176b87]">
                    <div className="flex items-center gap-2">
                      <Microscope size={16} className="text-[#176b87]" />
                      <span className="text-sm font-bold text-[color:var(--foreground)]">{activeTestSchema.name}</span>
                    </div>
                    <StatusBadge tone="info" size="sm">
                      {activeTestSchema.department}
                    </StatusBadge>
                  </div>
                </UIField>

                <UIField 
                  label="Referring Doctor / Business Source" 
                  name="doctorId" 
                  hint="Autofilled from patient order (editable if needed)"
                >
                  <SearchableCombobox
                    options={doctorComboboxOptions}
                    value={selectedDoctorId}
                    onChange={(val) => setSelectedDoctorId(val)}
                    placeholder="Select consulting doctor..."
                    searchPlaceholder="Search doctor..."
                    loading={doctorsQuery.isLoading}
                  />
                </UIField>
              </div>
            </div>
          ) : (
            /* DIRECT ACCESS MODE: Full Patient, Date Filter & Test Database Search */
            <div className="space-y-6">
              {/* Date Filter Bar for Direct Access */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Filter Patients by Registration Date:</span>
                  <input
                    type="date"
                    max={todayStr}
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-[#176b87]"
                  />
                  {selectedDateFilter && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateFilter("")}
                      className="text-[11px] text-rose-600 hover:underline font-medium"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {selectedDateFilter
                    ? `Showing patients registered on ${selectedDateFilter} (${patientComboboxOptions.length} found)`
                    : `Showing all registered patients (${patientComboboxOptions.length})`}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <UIField 
                  label="Select Registered Patient" 
                  name="patientId" 
                  required 
                  hint="Type name, patient code, phone"
                >
                  <SearchableCombobox
                    options={patientComboboxOptions}
                    value={selectedPatientId}
                    onChange={(val) => setSelectedPatientId(val)}
                    placeholder="Search patient..."
                    searchPlaceholder="Search by name, code, phone..."
                    loading={patientsQuery.isLoading}
                  />
                </UIField>

                <UIField label="Diagnostic Test (Master Database)" name="testCode" required hint="Search 1,000+ tests by name or code">
                  <SearchableCombobox
                    options={testMasterComboboxOptions}
                    value={selectedTestName}
                    onChange={(val, opt) => {
                      setSelectedTestName(val);
                      if (opt?.extra?.sampleType) {
                        setSampleType(opt.extra.sampleType);
                      }
                    }}
                    placeholder="Search test name or code..."
                    searchPlaceholder="Type test name (e.g. Calcium, CBC, Glucose)..."
                    loading={testMastersQuery.isLoading}
                  />
                </UIField>

                <UIField label="Referring Doctor" name="doctorId" hint="Select practitioner">
                  <SearchableCombobox
                    options={doctorComboboxOptions}
                    value={selectedDoctorId}
                    onChange={(val) => setSelectedDoctorId(val)}
                    placeholder="Select consulting doctor..."
                    searchPlaceholder="Search doctor..."
                    loading={doctorsQuery.isLoading}
                  />
                </UIField>
              </div>

              {/* Auto-populated Patient Overview Box in Direct Mode */}
              {currentPatient && (
                <div className="rounded-xl bg-[color:var(--surface-2)]/60 border border-[color:var(--line)] p-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[color:var(--muted)] block">Patient Code</span>
                      <span className="font-mono font-bold text-[color:var(--foreground)]">{currentPatient.patientCode}</span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Age / Gender</span>
                      <span className="font-semibold text-[color:var(--foreground)]">{formatPatientAgeLabel(currentPatient.dateOfBirth, currentPatient.age)} / {currentPatient.sex}</span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Contact Phone</span>
                      <span className="font-medium text-[color:var(--foreground)]">{currentPatient.phone}</span>
                    </div>
                    <div>
                      <span className="text-[color:var(--muted)] block">Sample Barcode</span>
                      <span className="font-mono font-bold text-[#176b87]">{barcode}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Step 2: Dynamic Test-Specific Parameters Table */}
        <Card className="border border-[color:var(--line)] shadow-xs overflow-hidden">
          <div className="border-b border-[color:var(--line)] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-[#e8f4f7] text-[#176b87] font-bold">
                2
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[color:var(--foreground)]">
                    {activeTestSchema.name}
                  </h3>
                  <StatusBadge tone="info" size="sm">
                    {activeTestSchema.department}
                  </StatusBadge>
                </div>
                <p className="text-xs text-[color:var(--muted)]">
                  {activeTestSchema.parameters.length} test-specific parameters loaded dynamically. Enter observed patient values.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Sparkles size={14} className="text-[#176b87]" />}
              onClick={handleQuickFillNormal}
            >
              Fill Reference Normals
            </Button>
          </div>

          {/* Dynamic Sub-Parameter Selector */}
          <div className="mb-6">
            <SubParameterSelect
              testName={activeTestSchema.name || selectedTestName}
              selectedSubParameters={testSubParamsMap[selectedTestName] || testSubParamsMap[activeTestSchema.name]}
              franchiseId={activeFranchiseId}
              onChange={(newParams) => {
                setTestSubParamsMap(prev => ({
                  ...prev,
                  [selectedTestName]: newParams,
                  [activeTestSchema.name]: newParams,
                }));
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--line)] bg-[color:var(--surface-2)]/80 text-[color:var(--muted)] uppercase font-semibold">
                  <th className="py-3 px-4">Test Parameter</th>
                  <th className="py-3 px-4 w-44">Observed Value</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Biological Reference Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {activeTestSchema.parameters.map((param) => {
                  if (param.isHeading) {
                    return (
                      <tr key={param.id} className="bg-slate-100/90 border-y-2 border-slate-300">
                        <td colSpan={4} className="py-2.5 px-4 font-black uppercase text-slate-800 text-[11px] tracking-wider">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[#176b87]" />
                            <span>{param.name}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const val = paramValues[param.id] ?? "";
                  const unitVal = paramUnits[param.id] ?? param.unit ?? "";
                  const rangeVal = paramRanges[param.id] ?? param.referenceRange ?? "";
                  const evalParam =
                    param.id === "crp"
                      ? { ...param, max: crpMaxForPatient(currentPatient) }
                      : param.id === "ggt"
                      ? { ...param, ...ggtLimitsForPatient(currentPatient) }
                      : param;
                  const baseEval = evaluateParameterFlag(val, evalParam);
                  const interp = interpretParam(param, val, unitVal);
                  const evalResult = interp
                    ? { ...baseEval, isAbnormal: interp.isAbnormal, isCritical: interp.isCritical }
                    : baseEval;

                  return (
                    <tr 
                      key={param.id} 
                      className={cn(
                        "hover:bg-[color:var(--surface-2)]/40 transition-colors",
                        evalResult.isCritical && "bg-rose-50/50",
                        evalResult.isAbnormal && !evalResult.isCritical && "bg-amber-50/40"
                      )}
                    >
                      <td className={cn("py-3.5 px-4 font-semibold text-[color:var(--foreground)]", param.isSubItem && "pl-8")}>
                        <div className="flex items-center gap-2">
                          {param.isSubItem && <span className="text-slate-400 font-normal">↳</span>}
                          <span>{param.name}</span>
                        </div>
                        {param.method && (
                          <span className="text-[10px] text-[color:var(--muted)]">
                            {param.method}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {param.options && param.options.length > 0 ? (
                          <Select
                            value={val}
                            onChange={(e) => handleValueChange(param.id, e.target.value)}
                            className={cn(
                              "h-8 text-xs font-medium",
                              evalResult.isCritical && "border-rose-500 ring-1 ring-rose-500",
                              evalResult.isAbnormal && !evalResult.isCritical && "border-amber-500"
                            )}
                          >
                            <option value="">Select result</option>
                            {param.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            value={val}
                            onChange={(e) => handleValueChange(param.id, e.target.value)}
                            placeholder="e.g. value..."
                            className={cn(
                              "h-8 text-xs font-mono font-medium",
                              evalResult.isCritical && "border-rose-500 ring-1 ring-rose-500",
                              evalResult.isAbnormal && !evalResult.isCritical && "border-amber-500"
                            )}
                          />
                        )}
                        {val.trim() && (interp || baseEval.flag !== "Normal") && (
                          <div className="mt-1 space-y-0.5">
                            <StatusBadge
                              tone={evalResult.isCritical ? "danger" : evalResult.isAbnormal ? "warning" : "success"}
                              size="sm"
                            >
                              {interp ? interp.label : baseEval.flag}
                            </StatusBadge>
                            {interp?.interpretation && (
                              <p className="text-[10px] leading-snug text-[color:var(--muted)] max-w-[11rem]">{interp.interpretation}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <Input
                          value={unitVal}
                          onChange={(e) => setParamUnits((prev) => ({ ...prev, [param.id]: e.target.value }))}
                          placeholder="Unit"
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        {rangeVal.includes("\n") ? (
                          <Textarea
                            rows={3}
                            readOnly
                            tabIndex={-1}
                            value={rangeVal}
                            className="text-xs font-mono leading-snug cursor-not-allowed bg-slate-50"
                          />
                        ) : (
                          <Input
                            readOnly
                            tabIndex={-1}
                            value={rangeVal}
                            placeholder="e.g. <1:80 Negative"
                            className="h-8 text-xs font-mono cursor-not-allowed bg-slate-50"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Step 3: Specimen & Clinical Impression */}
        <Card className="border border-[color:var(--line)] shadow-xs">
          {/* <div className="grid gap-6 sm:grid-cols-3">
            <UIField label="Accession Number" name="accession" required>
              <Input value={accession} onChange={(e) => setAccession(e.target.value)} />
            </UIField>

            <UIField label="Sample Specimen Type" name="sampleType" required>
              <Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
            </UIField>

            <UIField label="Release Status" name="reportStatus" required>
              <Select
                value={reportStatus}
                onChange={(e: any) => setReportStatus(e.target.value)}
              >
                <option value="Draft">Draft (Technician Entry)</option>
                <option value="Pending Review">Pending Review (Quality Check)</option>
                <option value="Approved">Approved (Final Signed Report)</option>
              </Select>
            </UIField>

            <div className="sm:col-span-3">
              <UIField label="Signing Pathologist" name="pathologist" required>
                <Input value={pathologist} onChange={(e) => setPathologist(e.target.value)} />
              </UIField>
            </div>

            <div className="sm:col-span-3">
              <UIField label="Clinical Interpretation & Pathological Comments" name="comments">
                <Textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter medical notes, clinical correlation advice, or laboratory remarks..."
                />
              </UIField>
            </div>
          </div> */}

          <UIField
            label={clinicalNotesConfig.title}
            name="comments"
            hint={
              clinicalNotesConfig.emptyMode === "dotted-lines"
                ? "Optional. Leave blank to print dotted lines for handwritten notes."
                : "Default remark prints if left unchanged. Edit or clear as needed."
            }
          >
            <Textarea
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add clinical correlation or pathological notes…"
            />
          </UIField>

          {/* Action buttons */}
          <div className="mt-8 pt-6 border-[color:var(--line)] flex items-center justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              leftIcon={isFlowMode && !isLastTestInFlow ? <ArrowRight size={18} /> : <ShieldCheck size={18} />}
            >
              {isFlowMode
                ? !isLastTestInFlow
                  ? `Save Report & Proceed to Next Test (${remainingPendingInFlow.length} Remaining) →`
                  : parsedPrescribedTests.length > 1
                  ? `Save Final Report & Complete All (${parsedPrescribedTests.length} Total) ✓`
                  : "Generate & Save Diagnostic Report"
                : "Generate & Save Diagnostic Report"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
