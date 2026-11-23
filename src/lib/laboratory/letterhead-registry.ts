import { LETTERHEAD_TEMPLATE_BASE64 } from "./letterhead-template-base64";
import { LETTERHEAD_ALIGARH_BASE64 } from "./letterhead-aligarh-base64";
import { LETTERHEAD_ZIPCURE_BASE64 } from "./letterhead-zipcure-base64";

export interface FranchiseLetterheadConfig {
  id: "varanasi" | "aligarh" | string;
  franchiseName: string;
  franchiseCode: string;
  franchiseCity: string;
  backgroundImage: string;
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
  doctorSignatureArea: {
    showOverlayDoctorTitle: boolean;
    doctorName?: string;
    doctorCredentials?: string;
  };
  footerNoteArea: {
    endOfReportText: string;
  };
}

/**
 * Letterhead Template Configuration for Varanasi Franchise (BL Diagnostic Hub)
 */
export const VARANASI_LETTERHEAD_CONFIG: FranchiseLetterheadConfig = {
  id: "varanasi",
  franchiseName: "Varanasi",
  franchiseCode: "VAR-01",
  franchiseCity: "Varanasi",
  backgroundImage: LETTERHEAD_TEMPLATE_BASE64,
  paddingTop: "165px",
  paddingBottom: "140px",
  paddingLeft: "36px",
  paddingRight: "48px",
  doctorSignatureArea: {
    showOverlayDoctorTitle: false, // Dr. Namrata's signature and credentials are pre-printed on the background
  },
  footerNoteArea: {
    endOfReportText: "",
  },
};

/**
 * Letterhead Template Configuration for Aligarh Franchise (DEV HOSPITAL PATHOLOGY)
 */
export const ALIGARH_LETTERHEAD_CONFIG: FranchiseLetterheadConfig = {
  id: "aligarh",
  franchiseName: "Aligarh",
  franchiseCode: "ALG-02",
  franchiseCity: "Aligarh",
  backgroundImage: LETTERHEAD_ALIGARH_BASE64,
  paddingTop: "205px",
  paddingBottom: "155px",
  paddingLeft: "36px",
  paddingRight: "48px",
  doctorSignatureArea: {
    showOverlayDoctorTitle: false, // Dr. Vishakha Sharma signature and credentials are pre-printed on the background letterhead
    doctorName: "DR. VISHAKHA SHARMA",
    doctorCredentials: "M.B.B.S D.G.O.",
  },
  footerNoteArea: {
    endOfReportText: "",
  },
};

/**
 * Letterhead for Zipcure Healthcare Pvt. Ltd. (DEL-03)
 */
export const ZIPCURE_LETTERHEAD_CONFIG: FranchiseLetterheadConfig = {
  id: "zipcure",
  franchiseName: "Zipcure Healthcare Pvt. Ltd.",
  franchiseCode: "DEL-03",
  franchiseCity: "New Delhi",
  backgroundImage: LETTERHEAD_ZIPCURE_BASE64,
  paddingTop: "278px",
  paddingBottom: "170px",
  paddingLeft: "36px",
  paddingRight: "48px",
  doctorSignatureArea: {
    showOverlayDoctorTitle: false,
  },
  footerNoteArea: {
    endOfReportText: "",
  },
};

/**
 * Registry of all available franchise letterheads
 */
export const FRANCHISE_LETTERHEAD_REGISTRY: Record<string, FranchiseLetterheadConfig> = {
  varanasi: VARANASI_LETTERHEAD_CONFIG,
  "fr-varanasi": VARANASI_LETTERHEAD_CONFIG,
  aligarh: ALIGARH_LETTERHEAD_CONFIG,
  "alg-02": ALIGARH_LETTERHEAD_CONFIG,
  "var-01": VARANASI_LETTERHEAD_CONFIG,
  "e748a2b6-2f2d-43a3-b32f-928b74906177": ALIGARH_LETTERHEAD_CONFIG,
  "95e74dde-fec7-419c-87b1-8722721772f4": ALIGARH_LETTERHEAD_CONFIG,
  zipcure: ZIPCURE_LETTERHEAD_CONFIG,
  "del-03": ZIPCURE_LETTERHEAD_CONFIG,
  "5268f39c-8032-4b20-a6e8-2ad796f530f7": ZIPCURE_LETTERHEAD_CONFIG,
};

export interface ResolveLetterheadOptions {
  franchiseId?: string | null;
  franchiseCode?: string | null;
  franchiseCity?: string | null;
  franchiseName?: string | null;
  report?: any;
  patient?: any;
  franchisesList?: Array<{ id: string; name?: string; code?: string; city?: string }>;
}

/**
 * Dynamically resolves the correct letterhead configuration based on franchise ID, code, city, or name.
 * Falls back safely to Varanasi (default) if unassigned or unrecognized.
 */
export function resolveReportLetterhead(options?: ResolveLetterheadOptions): FranchiseLetterheadConfig {
  if (!options) return VARANASI_LETTERHEAD_CONFIG;

  const { franchiseId, franchiseCode, franchiseCity, franchiseName, report, patient, franchisesList } = options;

  // Gather all identifier strings for the target franchise
  const identifiers: string[] = [];

  const addId = (val?: unknown) => {
    if (typeof val === "string" && val.trim()) {
      identifiers.push(val.trim().toLowerCase());
    }
  };

  addId(franchiseId);
  addId(franchiseCode);
  addId(franchiseCity);
  addId(franchiseName);

  // Check from report object
  if (report) {
    addId(report.franchiseId);
    if (typeof report.franchise === "object" && report.franchise) {
      addId(report.franchise.id);
      addId(report.franchise.code);
      addId(report.franchise.name);
      addId(report.franchise.city);
    }
  }

  // Check from patient object
  if (patient) {
    addId(patient.franchiseId);
    if (typeof patient.franchise === "object" && patient.franchise) {
      addId(patient.franchise.id);
      addId(patient.franchise.code);
      addId(patient.franchise.name);
      addId(patient.franchise.city);
    }
  }

  // Cross-reference with loaded franchises list if franchiseId is present
  const targetFranchiseId = franchiseId || report?.franchiseId || patient?.franchiseId;
  if (targetFranchiseId && franchisesList && franchisesList.length > 0) {
    const fObj = franchisesList.find((f) => f.id === targetFranchiseId);
    if (fObj) {
      addId(fObj.id);
      addId(fObj.code);
      addId(fObj.name);
      addId(fObj.city);
    }
  }

  // Direct registry match (id, code, uuid)
  for (const idStr of identifiers) {
    const mapped = FRANCHISE_LETTERHEAD_REGISTRY[idStr];
    if (mapped) return mapped;
  }

  const isZipcure = identifiers.some(
    (idStr) =>
      idStr === "zipcure" ||
      idStr === "del-03" ||
      idStr === "5268f39c-8032-4b20-a6e8-2ad796f530f7" ||
      idStr.includes("zipcure")
  );

  if (isZipcure) {
    return ZIPCURE_LETTERHEAD_CONFIG;
  }

  // Detection logic for Aligarh
  const isAligarh = identifiers.some(
    (idStr) =>
      idStr === "aligarh" ||
      idStr === "alg-02" ||
      idStr === "e748a2b6-2f2d-43a3-b32f-928b74906177" ||
      idStr === "95e74dde-fec7-419c-87b1-8722721772f4" ||
      idStr.includes("aligarh") ||
      idStr.includes("alg-") ||
      idStr.includes("akshataligarh") ||
      idStr.includes("dev hospital") ||
      idStr.includes("vishakha")
  );

  if (isAligarh) {
    return ALIGARH_LETTERHEAD_CONFIG;
  }

  // Default / Varanasi
  return VARANASI_LETTERHEAD_CONFIG;
}

export const DEFAULT_CLINICAL_NOTE_TEXT =
  "Clinical findings correlate with biological laboratory standards. Routine follow-up suggested.";

export type ClinicalNotesEmptyMode = "default-text" | "dotted-lines";

export interface FranchiseClinicalNotesConfig {
  /** Short key used in logs / future admin UI */
  id: string;
  /** Franchise letterhead id, code, uuid, or name fragments (lowercase) */
  match: readonly string[];
  title: string;
  emptyMode: ClinicalNotesEmptyMode;
  defaultText?: string;
  dottedLineCount?: number;
}

/** Per-franchise notes layout. First match wins; add a row here to change a franchise later. */
export const CLINICAL_NOTES_BY_FRANCHISE: readonly FranchiseClinicalNotesConfig[] = [
  {
    id: "zipcure",
    match: ["zipcure", "del-03", "5268f39c-8032-4b20-a6e8-2ad796f530f7"],
    title: "Clinical Interpretation & Pathological Notes",
    emptyMode: "dotted-lines",
    dottedLineCount: 3,
  },
];

export const DEFAULT_CLINICAL_NOTES_CONFIG: FranchiseClinicalNotesConfig = {
  id: "default",
  match: ["*"],
  title: "Clinical Interpretation & Pathological Notes",
  emptyMode: "default-text",
  defaultText: DEFAULT_CLINICAL_NOTE_TEXT,
};

export function resolveClinicalNotesConfig(
  keys?: Array<string | null | undefined>
): FranchiseClinicalNotesConfig {
  const normalized = (keys ?? [])
    .map((k) => String(k || "").trim().toLowerCase())
    .filter(Boolean);

  const found = CLINICAL_NOTES_BY_FRANCHISE.find((cfg) =>
    cfg.match.some((token) => normalized.includes(token) || normalized.some((k) => k.includes(token)))
  );
  return found ?? DEFAULT_CLINICAL_NOTES_CONFIG;
}
