export interface ParameterDefinition {
  id: string;
  name: string;
  unit: string;
  method?: string;
  machine?: string;
  min?: number | null;
  max?: number | null;
  referenceRange: string;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  defaultValue?: string;
  options?: string[]; // for categorical results like Negative/Positive or Visual color
  isHeading?: boolean;
  isSubItem?: boolean;
  parentHeadingId?: string;
}

export interface TestInterpretation {
  heading: string;
  content: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface TestDefinition {
  code: string;
  name: string;
  department: string;
  sampleType: string;
  standardPrice: number;
  parameters: ParameterDefinition[];
  interpretations?: TestInterpretation[];
  remarks?: string[];
  guidelinesRef?: string;
}

export const STANDARD_TEST_CATALOG: readonly TestDefinition[] = [
  {
    code: "CBC",
    name: "Complete Blood Count (CBC / Hemogram)",
    department: "Hematology",
    sampleType: "Whole Blood EDTA",
    standardPrice: 450,
    guidelinesRef: "International Council for Standardization in Haematology (ICSH)",
    parameters: [
      { id: "hb", name: "HAEMOGLOBIN (Hb)", unit: "GM %", min: 11.0, max: 16.0, referenceRange: "11.0 - 16.0", criticalLow: 7.0, criticalHigh: 20.0, method: "Spectrophotometry", machine: "Horiba Yumizen H1500", defaultValue: "12.1" },
      { id: "tlc", name: "TLC (Total Leucocyte Count )", unit: "/cu mm", min: 4000, max: 11000, referenceRange: "4000 - 11000", criticalLow: 2000, criticalHigh: 30000, method: "Impedance", machine: "Horiba Yumizen H1500", defaultValue: "5,800" },
      { id: "dlc_heading", name: "DIFFERENTIAL LEUCOCYTE COUNT", unit: "", referenceRange: "HEADING", method: "", defaultValue: "", isHeading: true },
      { id: "neutrophils", name: "NEUTROPHILS", unit: "%", min: 40, max: 80, referenceRange: "40 - 80", method: "Flow-Cytometry DHSS", machine: "Horiba Yumizen H1500", defaultValue: "", isSubItem: true, parentHeadingId: "dlc" },
      { id: "lymphocytes", name: "LYMPHOCYTES", unit: "%", min: 20, max: 45, referenceRange: "20 - 45", method: "Flow-Cytometry DHSS", machine: "Horiba Yumizen H1500", defaultValue: "", isSubItem: true, parentHeadingId: "dlc" },
      { id: "monocytes", name: "MONOCYTES", unit: "%", min: 1, max: 8, referenceRange: "1 - 8", method: "Flow-Cytometry DHSS", machine: "Horiba Yumizen H1500", defaultValue: "", isSubItem: true, parentHeadingId: "dlc" },
      { id: "eosinophils", name: "EOSINOPHILS", unit: "%", min: 1, max: 6, referenceRange: "1 - 6", method: "Flow-Cytometry DHSS", machine: "Horiba Yumizen H1500", defaultValue: "", isSubItem: true, parentHeadingId: "dlc" },
      { id: "basophils", name: "BASOPHILS", unit: "%", min: 0, max: 1, referenceRange: "0 - 1", method: "Impedance", machine: "Horiba Yumizen H1500", defaultValue: "", isSubItem: true, parentHeadingId: "dlc" },
      { id: "rbc", name: "R B C (Red Blood Cell Count)", unit: "Millions/cm m", min: 3.5, max: 5.0, referenceRange: "3.5 - 5.0", method: "Impedance", machine: "Horiba Yumizen H1500", defaultValue: "3.92" },
      { id: "pcv", name: "PCV / HCt (Hematocrit)", unit: "%", min: 34, max: 47, referenceRange: "34 - 47", method: "Calculated", machine: "Horiba Yumizen H1500", defaultValue: "36.3" },
      { id: "mcv", name: "M C V (Mean Corp Volume)", unit: "fl", min: 76.0, max: 96.0, referenceRange: "76.0 - 96.0", method: "Derived from RBC Histogram", machine: "Horiba Yumizen H1500", defaultValue: "92.6" },
      { id: "mch", name: "M C H (Mean Corp Hb)", unit: "pg", min: 27.0, max: 32.0, referenceRange: "27.0 - 32.0", method: "Calculated", machine: "Horiba Yumizen H1500", defaultValue: "30.9" },
      { id: "mchc", name: "M C H C (Mean Corp Hb Conc)", unit: "g/dl", min: 30.0, max: 35.0, referenceRange: "30.0 - 35.0", method: "Calculated", machine: "Horiba Yumizen H1500", defaultValue: "33.3" },
      { id: "plt", name: "PLATELET COUNT", unit: "/mm", min: 150000, max: 450000, referenceRange: "150000 - 450000", criticalLow: 50000, criticalHigh: 800000, method: "Impedance", machine: "Horiba Yumizen H1500", defaultValue: "1,19,000" },
      { id: "esr", name: "Erythrocyte Sedimentation Rate (ESR)", unit: "mm/hr", min: 0, max: 15, referenceRange: "0 - 15", method: "Westergren Automated", machine: "Alifax Roller 20", defaultValue: "8" },
      { id: "rdw_cv", name: "RDW - CV", unit: "%", min: 11.6, max: 14.0, referenceRange: "11.6 - 14.0", method: "Derived from RBC Histogram", machine: "Horiba Yumizen H1500", defaultValue: "13.1" },
      { id: "rdw_sd", name: "RDW - SD", unit: "fL", min: 39.0, max: 46.0, referenceRange: "39.0 - 46.0", method: "Derived from RBC Histogram", machine: "Horiba Yumizen H1500", defaultValue: "42.0" },
    ],
    interpretations: [
      {
        heading: "Clinical Interpretation & Peripheral Smear Remarks",
        content: "The complete blood count reflects normal erythropoiesis, normocytic normochromic red cells, and adequate platelet distribution. No toxic granulation or atypical leucocytes noted on automated differential review."
      }
    ],
    remarks: [
      "1. Results verified with automated multi-angle hydrodynamic flow cytometry and impedance measurement.",
      "2. Clinical correlation recommended for any isolated borderline differentials.",
      "3. Giant platelets: Absent. Adequate platelet aggregation seen."
    ]
  },
  {
    code: "LIPID",
    name: "Lipid Profile Advance",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 650,
    guidelinesRef: "Lipid Association of India (LAI) & NCEP ATP-IV",
    parameters: [
      { id: "chol_total", name: "Total Cholesterol", unit: "mg/dL", min: 0, max: 200, referenceRange: "< 200 Desirable", criticalHigh: 300, method: "CHO-POD (Trac. Abel-Kendall)", machine: "Beckman Coulter AU 5800", defaultValue: "165.0" },
      { id: "hdl", name: "Serum HDL Cholesterol", unit: "mg/dL", min: 40, max: 60, referenceRange: "40 - 60 Optimal", method: "Direct Enzymatic Immunoinhibition", machine: "Beckman Coulter AU 5800", defaultValue: "48.0" },
      { id: "ldl", name: "LDL Cholesterol Calculated", unit: "mg/dL", min: 0, max: 100, referenceRange: "< 100 Optimal", criticalHigh: 190, method: "Calculated (Friedewald)", machine: "Beckman Coulter AU 5800", defaultValue: "91.4" },
      { id: "vldl", name: "VLDL Cholesterol Calculated", unit: "mg/dL", min: 0, max: 30, referenceRange: "< 30 Desirable", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "25.6" },
      { id: "triglycerides", name: "Serum Triglycerides", unit: "mg/dL", min: 0, max: 150, referenceRange: "< 150 Desirable", criticalHigh: 500, method: "GPO-POD", machine: "Beckman Coulter AU 5800", defaultValue: "128.0" },
      { id: "chol_hdl_ratio", name: "Total CHOL / HDL Ratio", unit: "Ratio", min: 3.30, max: 4.40, referenceRange: "3.30 - 4.40", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "3.44" },
      { id: "ldl_hdl_ratio", name: "LDL / HDL Cholesterol Ratio", unit: "Ratio", min: 0.5, max: 3.0, referenceRange: "0.5 - 3.0 Low Risk", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "1.90" },
      { id: "non_hdl", name: "Non-HDL Cholesterol", unit: "mg/dL", min: 0, max: 160, referenceRange: "0 - 160 Desirable", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "117.0" },
    ],
    interpretations: [
      {
        heading: "Cardiovascular Risk Stratification (NCEP ATP IV / LAI)",
        content: "Optimal lipid targets: LDL-C < 100 mg/dL (Low/Moderate Risk) or < 70 mg/dL (High Risk). Total Cholesterol and Triglycerides within desirable therapeutic thresholds.",
        table: {
          headers: ["Risk Category", "Target LDL-C", "Target Non-HDL", "Apo-B"],
          rows: [
            ["Low Risk", "< 100 mg/dL", "< 130 mg/dL", "< 90 mg/dL"],
            ["Moderate Risk", "< 100 mg/dL", "< 130 mg/dL", "< 90 mg/dL"],
            ["High Risk", "< 70 mg/dL", "< 100 mg/dL", "< 80 mg/dL"],
            ["Very High Risk", "< 50 mg/dL", "< 80 mg/dL", "< 65 mg/dL"],
          ]
        }
      }
    ],
    remarks: [
      "1. Lipid testing performed following recommended 10-12 hour overnight fasting protocol.",
      "2. Friedewald calculation is valid when Triglycerides < 400 mg/dL."
    ]
  },
  {
    code: "LFT",
    name: "Liver Function Test (LFT)",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 700,
    guidelinesRef: "American Association for the Study of Liver Diseases (AASLD)",
    parameters: [
      { id: "bili_total", name: "Serum Bilirubin, (Total)", unit: "mg/dL", min: 0.3, max: 1.2, referenceRange: "0.3 - 1.2", criticalHigh: 5.0, method: "DPD", machine: "Beckman Coulter AU 5800", defaultValue: "0.75" },
      { id: "bili_direct", name: "Serum Bilirubin, (Direct)", unit: "mg/dL", min: 0.0, max: 0.2, referenceRange: "0.0 - 0.2", method: "DPD", machine: "Beckman Coulter AU 5800", defaultValue: "0.15" },
      { id: "bili_indirect", name: "Serum Bilirubin, (Indirect)", unit: "mg/dL", min: 0.0, max: 0.8, referenceRange: "0.0 - 0.8", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "0.60" },
      { id: "total_protein", name: "Serum Total Protein", unit: "g/dL", min: 6.6, max: 8.3, referenceRange: "6.6 - 8.3", method: "Biuret", machine: "Beckman Coulter AU 5800", defaultValue: "7.30" },
      { id: "albumin", name: "Serum Albumin", unit: "g/dL", min: 3.5, max: 5.2, referenceRange: "3.5 - 5.2", method: "Bromocresol Green (BCG)", machine: "Beckman Coulter AU 5800", defaultValue: "4.20" },
      { id: "globulin", name: "Serum Globulin", unit: "g/dL", min: 3.0, max: 4.2, referenceRange: "3.0 - 4.2", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "3.10" },
      { id: "ag_ratio", name: "Albumin / Globulin Ratio", unit: "Ratio", min: 1.2, max: 2.5, referenceRange: "1.2 - 2.5", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "1.35" },
      { id: "ast_sgot", name: "Aspartate Aminotransferase (AST/SGOT)", unit: "U/L", min: 3, max: 50, referenceRange: "3 - 50", criticalHigh: 250, method: "UV without P5P", machine: "Beckman Coulter AU 5800", defaultValue: "24.0" },
      { id: "alt_sgpt", name: "Alanine Aminotransferase (ALT/SGPT)", unit: "U/L", min: 3, max: 50, referenceRange: "3 - 50", criticalHigh: 250, method: "UV without P5P", machine: "Beckman Coulter AU 5800", defaultValue: "22.0" },
      { id: "alp", name: "Alkaline Phosphatase (ALP)", unit: "U/L", min: 43, max: 115, referenceRange: "43 - 115", method: "AMP Buffer", machine: "Beckman Coulter AU 5800", defaultValue: "76.0" },
      { id: "ggt", name: "Gamma Glutamyl Transferase (GGT)", unit: "U/L", min: 5, max: 47, referenceRange: "ADULT MALES : 7 - 47 U/L\nADULT FEMALES : 5 - 25 U/L\nNEWBORNS : Up to 5 times adult levels", method: "IFCC", machine: "Beckman Coulter AU 5800", defaultValue: "" },
    ],
    interpretations: [
      {
        heading: "Hepatic Evaluation & Enzymes",
        content: "Transaminases (AST/ALT) and excretory enzymes (ALP/GGT) demonstrate preserved hepatocellular integrity with normal protein-synthetic capacity (Albumin/Globulin ratio within normal physiological limits)."
      }
    ],
    remarks: [
      "1. Bilirubin is measured by diazo reaction spectrophotometry.",
      "2. Mild isolated enzyme elevations may occur after vigorous physical exertion or medication."
    ]
  },
  {
    code: "KFT",
    name: "Kidney Function Test (KFT / Renal Profile)",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 650,
    guidelinesRef: "Kidney Disease Improving Global Outcomes (KDIGO)",
    parameters: [
      { id: "sugar_r", name: "Random Blood Sugar (Sugar - R)", unit: "mg/dL", min: 70, max: 140, referenceRange: "70 - 140", criticalLow: 50, criticalHigh: 300, method: "Hexokinase", machine: "Beckman Coulter AU 5800", defaultValue: "110.0" },
      { id: "blood_urea", name: "Blood Urea", unit: "mg/dL", min: 17, max: 43, referenceRange: "17 - 43", criticalHigh: 100, method: "GLDH, Kinetic assay", machine: "Beckman Coulter AU 5800", defaultValue: "26.0" },
      { id: "creatinine", name: "Serum Creatinine", unit: "mg/dL", min: 0.7, max: 1.4, referenceRange: "0.7 - 1.4", criticalHigh: 4.0, method: "Modified Jaffe, Kinetic", machine: "Beckman Coulter AU 5800", defaultValue: "0.92" },
      { id: "uric_acid", name: "Serum Uric Acid", unit: "mg/dL", min: 3.5, max: 7.2, referenceRange: "3.5 - 7.2", method: "Uricase PAP", machine: "Beckman Coulter AU 5800", defaultValue: "5.4" },
      { id: "sodium", name: "Serum Sodium (Na+)", unit: "mmol/L", min: 135, max: 145, referenceRange: "135 - 145", criticalLow: 120, criticalHigh: 160, method: "Direct ISE", machine: "Beckman Coulter AU 5800", defaultValue: "140.0" },
      { id: "potassium", name: "Serum Potassium (K+)", unit: "mmol/L", min: 3.5, max: 5.1, referenceRange: "3.5 - 5.1", criticalLow: 2.8, criticalHigh: 6.2, method: "Direct ISE", machine: "Beckman Coulter AU 5800", defaultValue: "4.2" },
      { id: "chloride", name: "Serum Chloride (Cl-)", unit: "mmol/L", min: 98, max: 107, referenceRange: "98 - 107", method: "Direct ISE", machine: "Beckman Coulter AU 5800", defaultValue: "102.0" },
      { id: "egfr", name: "eGFR (Estimated Glomerular Filtration Rate)", unit: "mL/min/1.73m²", min: 90, max: 140, referenceRange: "> 90 Normal", criticalLow: 30, method: "Calculated (CKD-EPI)", machine: "Beckman Coulter AU 5800", defaultValue: "105.0" },
      { id: "bun", name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", min: 8, max: 20, referenceRange: "8 - 20", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "12.1" },
      { id: "calcium", name: "Serum Calcium", unit: "mg/dL", min: 8.8, max: 10.6, referenceRange: "8.8 - 10.6", criticalLow: 6.0, criticalHigh: 13.0, method: "Arsenazo III", machine: "Beckman Coulter AU 5800", defaultValue: "9.5" },
      { id: "phosphorus", name: "Serum Phosphorus", unit: "mg/dL", min: 2.5, max: 4.5, referenceRange: "2.5 - 4.5", method: "Phosphomolybdate Complex", machine: "Beckman Coulter AU 5800", defaultValue: "3.6" },
      { id: "bun_creat_ratio", name: "BUN / Creatinine Ratio", unit: "Ratio", min: 10, max: 20, referenceRange: "10 - 20", method: "Calculated", machine: "Beckman Coulter AU 5800", defaultValue: "13.1" },
    ],
    interpretations: [
      {
        heading: "Renal Function & eGFR Interpretation",
        content: "Serum creatinine and estimated GFR indicate normal stage 1 renal clearance (> 90 mL/min/1.73m²). Electrolytes and mineral balance are maintained within physiological reference ranges.",
        table: {
          headers: ["CKD Stage", "eGFR Range (mL/min/1.73m²)", "Description"],
          rows: [
            ["Stage 1", "≥ 90", "Normal / High function"],
            ["Stage 2", "60 – 89", "Mild reduction"],
            ["Stage 3a / 3b", "30 – 59", "Moderate reduction"],
            ["Stage 4", "15 – 29", "Severe reduction"],
            ["Stage 5", "< 15", "Kidney failure"],
          ]
        }
      }
    ],
    remarks: [
      "1. eGFR calculated using standardized CKD-EPI formula adjusted for adult biological reference ranges.",
      "2. Adequate hydration recommended prior to subsequent monitoring."
    ]
  },
  {
    code: "HBA1C",
    name: "HbA1c (Glycosylated Hemoglobin)",
    department: "Biochemistry",
    sampleType: "Whole Blood EDTA",
    standardPrice: 500,
    guidelinesRef: "American Diabetes Association (ADA) Standards of Care 2024",
    parameters: [
      { id: "hba1c", name: "HbA1c (Glycosylated Hemoglobin)", unit: "%", min: 4.2, max: 5.7, referenceRange: "< 5.7 Normal", criticalHigh: 10.0, method: "Ion-Exchange HPLC", machine: "Tosoh G11 Automated Glycohemoglobin Analyzer", defaultValue: "5.4" },
      { id: "eag", name: "Average Estimated Glucose (eAG)", unit: "mg/dL", min: 70, max: 117, referenceRange: "70 - 117", method: "Calculated (28.7 × HbA1c - 46.7)", machine: "Tosoh G11", defaultValue: "108.3" },
    ],
    interpretations: [
      {
        heading: "American Diabetes Association (ADA) Diagnostic Criteria",
        content: "HbA1c reflects mean glycemic control over the preceding 90–120 days.",
        table: {
          headers: ["Diagnostic Category", "HbA1c (%)", "Estimated Avg Glucose (eAG)"],
          rows: [
            ["Normal / Non-Diabetic", "< 5.7 %", "< 117 mg/dL"],
            ["Pre-Diabetes / Impaired Glycemia", "5.7 – 6.4 %", "117 – 137 mg/dL"],
            ["Diabetes Mellitus", "≥ 6.5 %", "≥ 140 mg/dL"],
          ]
        }
      }
    ],
    remarks: [
      "1. NGSP certified and IFCC traceable High Performance Liquid Chromatography (HPLC).",
      "2. In cases of hemoglobin variants or hemolytic conditions, alternative glycemic monitoring (fructosamine) should be considered."
    ]
  },
  {
    code: "BC052",
    name: "BLOOD GLUCOSE FASTING",
    department: "Biochemistry",
    sampleType: "Sodium Fluoride Plasma",
    standardPrice: 100,
    guidelinesRef: "ADA Diagnostic Guidelines",
    parameters: [
      { id: "glucose_fasting", name: "GLUCOSE FASTING", unit: "mg/dL", min: 70, max: 100, referenceRange: "70 - 100", criticalLow: 50, criticalHigh: 300, method: "Hexokinase Enzymatic", machine: "Beckman Coulter DXC 700 AU", defaultValue: "88.0" },
    ],
    interpretations: [
      {
        heading: "Fasting Glucose Classification",
        content: "Normal fasting plasma glucose: 70–100 mg/dL. Impaired fasting glucose (prediabetes): 101–125 mg/dL. Provisional diabetes: ≥ 126 mg/dL."
      }
    ],
    remarks: [
      "1. Sample drawn in sodium fluoride glycolytic inhibitor tube after 8-10 hour fast."
    ]
  },
  {
    code: "BC053",
    name: "BLOOD GLUCOSE PP",
    department: "Biochemistry",
    sampleType: "Sodium Fluoride Plasma",
    standardPrice: 100,
    guidelinesRef: "ADA Diagnostic Guidelines",
    parameters: [
      { id: "glucose_pp", name: "GLUCOSE PP", unit: "mg/dL", min: 70, max: 140, referenceRange: "70 - 140", criticalLow: 50, criticalHigh: 350, method: "Hexokinase Enzymatic", machine: "Beckman Coulter DXC 700 AU", defaultValue: "115.0" },
    ],
    interpretations: [
      {
        heading: "Post Prandial Glucose Classification",
        content: "Normal 2-hour post prandial plasma glucose: 70–140 mg/dL. Impaired glucose tolerance: 141–199 mg/dL. Provisional diabetes: ≥ 200 mg/dL."
      }
    ],
    remarks: [
      "1. Sample drawn exactly 2 hours after commencement of meal."
    ]
  },
  {
    code: "BC289",
    name: "BLOOD GLUCOSE FASTING AND PP",
    department: "Biochemistry",
    sampleType: "Sodium Fluoride Plasma",
    standardPrice: 180,
    guidelinesRef: "ADA Diagnostic Guidelines",
    parameters: [
      { id: "glucose_fasting", name: "GLUCOSE FASTING", unit: "mg/dL", min: 70, max: 100, referenceRange: "70 - 100", criticalLow: 50, criticalHigh: 300, method: "Hexokinase Enzymatic", machine: "Beckman Coulter DXC 700 AU", defaultValue: "88.0" },
      { id: "glucose_pp", name: "GLUCOSE PP", unit: "mg/dL", min: 70, max: 140, referenceRange: "70 - 140", criticalLow: 50, criticalHigh: 350, method: "Hexokinase Enzymatic", machine: "Beckman Coulter DXC 700 AU", defaultValue: "115.0" },
    ],
    interpretations: [
      {
        heading: "Glycemic Assessment (Fasting & Post Prandial)",
        content: "Fasting Normal: 70–100 mg/dL (Prediabetes: 101–125 mg/dL; Diabetes: ≥ 126 mg/dL). Post Prandial Normal: 70–140 mg/dL (Impaired: 141–199 mg/dL; Diabetes: ≥ 200 mg/dL)."
      }
    ],
    remarks: [
      "1. Fasting sample drawn after 8-10 hours overnight fast.",
      "2. PP sample collected 2 hours after meal intake."
    ]
  },
  {
    code: "BC054",
    name: "BLOOD GLUCOSE RANDOM",
    department: "Biochemistry",
    sampleType: "Sodium Fluoride Plasma",
    standardPrice: 100,
    guidelinesRef: "ADA Diagnostic Guidelines",
    parameters: [
      { id: "glucose_random", name: "GLUCOSE RANDOM", unit: "mg/dL", min: 70, max: 140, referenceRange: "70 - 140", criticalLow: 50, criticalHigh: 350, method: "Hexokinase Enzymatic", machine: "Beckman Coulter DXC 700 AU", defaultValue: "95.0" },
    ],
    interpretations: [
      {
        heading: "Random Blood Glucose Classification",
        content: "Normal random plasma glucose: 70–140 mg/dL. Diabetes suspect if random plasma glucose ≥ 200 mg/dL in presence of classical symptoms."
      }
    ],
    remarks: [
      "1. Non-fasting spot blood sample."
    ]
  },
  {
    code: "THYROID",
    name: "Thyroid Profile (Total T3, T4 & TSH Ultra-Sensitive)",
    department: "Immunology",
    sampleType: "Serum",
    standardPrice: 600,
    guidelinesRef: "American Thyroid Association (ATA)",
    parameters: [
      { id: "t3", name: "Tri-Iodothyronine (T3, Total)", unit: "ng/mL", min: 0.60, max: 1.81, referenceRange: "0.60 - 1.81", method: "Chemiluminescence Immunoassay (CLIA)", machine: "Siemens Atellica IM 1600", defaultValue: "1.15" },
      { id: "t4", name: "Thyroxine (T4, Total)", unit: "µg/dL", min: 3.2, max: 12.6, referenceRange: "3.2 - 12.6", method: "Chemiluminescence Immunoassay (CLIA)", machine: "Siemens Atellica IM 1600", defaultValue: "7.8" },
      { id: "tsh", name: "Thyroid Stimulating Hormone (TSH) Ultra-sensitive", unit: "µIU/mL", min: 0.55, max: 4.78, referenceRange: "0.55 - 4.78", criticalLow: 0.1, criticalHigh: 20.0, method: "Chemiluminescence Immunoassay (CLIA)", machine: "Siemens Atellica IM 1600", defaultValue: "2.10" },
    ],
    interpretations: [
      {
        heading: "Thyroid Axis Evaluation",
        content: "TSH and circulating total thyroid hormone levels demonstrate euthyroid state with intact pituitary-thyroid feedback regulation.",
        table: {
          headers: ["Pregnancy Trimester", "TSH Biological Reference Interval (µIU/mL)"],
          rows: [
            ["First Trimester", "0.10 – 2.50"],
            ["Second Trimester", "0.20 – 3.00"],
            ["Third Trimester", "0.30 – 3.00"],
          ]
        }
      }
    ],
    remarks: [
      "1. Circadian peak of TSH occurs between 2:00 AM – 4:00 AM; basal morning sampling recommended.",
      "2. Free fractions (FT3/FT4) or anti-TPO antibodies recommended if autoimmune etiology is suspected."
    ]
  },
  {
    code: "URINE",
    name: "Urine Routine & Microscopic Examination",
    department: "Clinical Pathology",
    sampleType: "Clean Catch Midstream Urine",
    standardPrice: 250,
    guidelinesRef: "European Confederation of Laboratory Medicine (ECLM)",
    parameters: [
      { id: "u_color", name: "Colour", unit: "Visual", referenceRange: "Pale Yellow", method: "Physical Examination", defaultValue: "Pale Yellow", options: ["Pale Yellow", "Yellow", "Dark Yellow", "Amber", "Red / Turbid"] },
      { id: "u_app", name: "Appearance", unit: "Visual", referenceRange: "Clear", method: "Physical Examination", defaultValue: "Clear", options: ["Clear", "Hazy", "Cloudy", "Turbid"] },
      { id: "u_sg", name: "Specific Gravity", unit: "Ratio", min: 1.001, max: 1.035, referenceRange: "1.001 - 1.035", method: "Dipstick-Ion Exchange", machine: "URIPLUS 600", defaultValue: "1.018" },
      { id: "u_ph", name: "pH", unit: "pH", min: 4.5, max: 7.5, referenceRange: "4.5 - 7.5", method: "Dipstick-Double Indicator", machine: "URIPLUS 600", defaultValue: "6.0" },
      { id: "u_prot", name: "Urine Protein / Albumin", unit: "Dipstick", referenceRange: "Negative", method: "Dipstick-Bromophenol Blue", machine: "URIPLUS 600", defaultValue: "Negative", options: ["Negative", "Trace", "1+ (30 mg/dL)", "2+ (100 mg/dL)", "3+ (300 mg/dL)"] },
      { id: "u_glu", name: "Urine Glucose", unit: "Dipstick", referenceRange: "Negative", method: "Dipstick-Glucose Oxidase", machine: "URIPLUS 600", defaultValue: "Negative", options: ["Negative", "Trace", "1+", "2+", "3+"] },
      { id: "u_ket", name: "Ketones", unit: "Dipstick", referenceRange: "Negative", method: "Dipstick-Nitroprusside", machine: "URIPLUS 600", defaultValue: "Negative", options: ["Negative", "Trace", "Positive"] },
      { id: "u_bili", name: "Bilirubin", unit: "Dipstick", referenceRange: "Negative", method: "Dipstick-Ehrlichs", machine: "URIPLUS 600", defaultValue: "Negative", options: ["Negative", "Positive"] },
      { id: "u_uro", name: "Urobilinogen", unit: "Dipstick", referenceRange: "Normal", method: "Dipstick-Ehrlichs", machine: "URIPLUS 600", defaultValue: "Normal", options: ["Normal", "Elevated"] },
      { id: "u_nit", name: "Nitrite", unit: "Dipstick", referenceRange: "Negative", method: "Dipstick-Griess", machine: "URIPLUS 600", defaultValue: "Negative", options: ["Negative", "Positive"] },
      { id: "u_bld", name: "Blood / Hemoglobin", unit: "Dipstick", referenceRange: "Nil", method: "Dipstick-Peroxidase", machine: "URIPLUS 600", defaultValue: "Nil", options: ["Nil", "Trace", "Moderate", "Large"] },
      { id: "u_pus", name: "Pus Cells (Leucocytes)", unit: "/HPF", min: 0, max: 5, referenceRange: "0 - 5", method: "Microscopic Examination", defaultValue: "1-2" },
      { id: "u_epi", name: "Epithelial Cells", unit: "/HPF", min: 0, max: 5, referenceRange: "0 - 5", method: "Microscopic Examination", defaultValue: "1-2" },
      { id: "u_rbc", name: "RBCs", unit: "/HPF", referenceRange: "Nil", method: "Microscopic Examination", defaultValue: "Nil" },
      { id: "u_casts", name: "Casts", unit: "/LPF", referenceRange: "Nil", method: "Microscopic Examination", defaultValue: "Nil" },
      { id: "u_cryst", name: "Crystals", unit: "/HPF", referenceRange: "Nil", method: "Microscopic Examination", defaultValue: "Nil" },
      { id: "u_bac", name: "Bacteria", unit: "/HPF", referenceRange: "Absent", method: "Microscopic Examination", defaultValue: "Absent", options: ["Absent", "Few", "Moderate", "Many"] },
    ],
    interpretations: [
      {
        heading: "Urine Routine Microscopic Evaluation",
        content: "Microscopic examination of centrifugal sediment reveals normal physiological cellular components without significant bacteriuria, casts, or crystal precipitation."
      }
    ],
    remarks: [
      "1. Fresh early morning mid-stream specimen collected in sterile container.",
      "2. Dipstick automated optical reflectance with manual microscopy validation."
    ]
  },
  {
    code: "ELECTROLYTES",
    name: "Serum Electrolytes (Sodium, Potassium, Chloride)",
    department: "Electrolytes",
    sampleType: "Serum",
    standardPrice: 400,
    guidelinesRef: "Clinical Laboratory Improvement Amendments (CLIA)",
    parameters: [
      { id: "na", name: "Serum Sodium (Na+)", unit: "mmol/L", min: 136, max: 146, referenceRange: "136 - 146", criticalLow: 120, criticalHigh: 160, method: "Direct Ion Selective Electrode (ISE)", machine: "Roche 9180 Electrolyte Analyzer", defaultValue: "140.0" },
      { id: "k", name: "Serum Potassium (K+)", unit: "mmol/L", min: 3.5, max: 5.1, referenceRange: "3.5 - 5.1", criticalLow: 2.8, criticalHigh: 6.2, method: "Direct Ion Selective Electrode (ISE)", machine: "Roche 9180 Electrolyte Analyzer", defaultValue: "4.2" },
      { id: "cl", name: "Serum Chloride (Cl-)", unit: "mmol/L", min: 101, max: 109, referenceRange: "101 - 109", criticalLow: 80, criticalHigh: 125, method: "Direct Ion Selective Electrode (ISE)", machine: "Roche 9180 Electrolyte Analyzer", defaultValue: "104.0" },
    ],
    interpretations: [
      {
        heading: "Acid-Base & Fluid Balance",
        content: "Serum sodium, potassium, and chloride concentrations reflect preserved extracellular osmolar and fluid balance."
      }
    ],
    remarks: [
      "1. Direct ISE measurement avoids pseudohyponatremia in hyperproteinemic/hyperlipidemic specimens."
    ]
  },
  {
    code: "WIDAL",
    name: "WIDAL (SLIDE AGGLUTINATION)",
    department: "Serology",
    sampleType: "Serum",
    standardPrice: 350,
    guidelinesRef: "Standard Widal slide agglutination protocol",
    parameters: [
      { id: "typhi_o", name: "Salmonella typhi O", unit: "", referenceRange: "<1:80 Negative", method: "Slide Method", defaultValue: "", options: ["<1:20", "<1:40", "<1:80", "1:80", "1:160", "1:320", "1:640"] },
      { id: "typhi_h", name: "Salmonella typhi H", unit: "", referenceRange: "<1:80 Negative", method: "Slide Method", defaultValue: "", options: ["<1:20", "<1:40", "<1:80", "1:80", "1:160", "1:320", "1:640"] },
      { id: "paratyphi_ah", name: "Salmonella paratyphi A,H", unit: "", referenceRange: "<1:80 Negative", method: "Slide Method", defaultValue: "", options: ["<1:20", "<1:40", "<1:80", "1:80", "1:160", "1:320", "1:640"] },
      { id: "paratyphi_bh", name: "Salmonella paratyphi B,H", unit: "", referenceRange: "<1:80 Negative", method: "Slide Method", defaultValue: "", options: ["<1:20", "<1:40", "<1:80", "1:80", "1:160", "1:320", "1:640"] },
      { id: "widal_interpretation", name: "INTERPRETATION", unit: "", referenceRange: "", method: "", defaultValue: "", options: ["NON REACTIVE", "REACTIVE"] },
    ],
    interpretations: [
      {
        heading: "Widal Slide Agglutination Interpretation",
        content: "Titres <1:80 are considered negative. Significant agglutination (typically ≥1:160) with compatible clinical findings may indicate enteric fever. A rising titre on paired sera is more diagnostic than a single reading."
      }
    ],
    remarks: [
      "1. Widal slide agglutination performed on serum.",
      "2. Interpret titres in clinical context; vaccination and prior infection may cause residual antibodies."
    ]
  },
  {
    code: "MALARIA",
    name: "MALARIA PARASITE (RAPID / CARD)",
    department: "Serology",
    sampleType: "Whole Blood EDTA",
    standardPrice: 300,
    guidelinesRef: "WHO malaria rapid diagnostic test / peripheral smear correlation",
    parameters: [
      {
        id: "malaria_result",
        name: "Malaria Parasite",
        unit: "",
        referenceRange: "Negative",
        method: "Rapid Antigen / Peripheral Smear",
        defaultValue: "",
        options: ["Negative", "Positive"],
      },
    ],
    interpretations: [
      {
        heading: "Malaria Antigen / Parasite Report",
        content: "Rapid immunochromatographic assay for P. falciparum (HRP-2) and P. vivax (pLDH). Correlate with clinical findings and peripheral smear when indicated."
      }
    ],
    remarks: [
      "1. Negative result does not completely exclude malaria in early infection; repeat if clinically suspected.",
      "2. Positive results should be correlated with clinical presentation and smear microscopy where available."
    ]
  },
  {
    code: "ES154",
    name: "TYPHI DOT- IGG : SALMONELLA TYPHI",
    department: "Serology",
    sampleType: "Serum",
    standardPrice: 400,
    parameters: [
      { id: "typhidot_igg", name: "TYPHI DOT IgG (Salmonella typhi)", unit: "", referenceRange: "NEGATIVE", method: "", defaultValue: "", options: ["NEGATIVE", "POSITIVE"] },
    ],
  },
  {
    code: "ES155",
    name: "TYPHI DOT- IGM: SALMONELLA TYPHI",
    department: "Serology",
    sampleType: "Serum",
    standardPrice: 400,
    parameters: [
      { id: "typhidot_igm", name: "TYPHI DOT IgM (Salmonella typhi)", unit: "", referenceRange: "NEGATIVE", method: "", defaultValue: "", options: ["NEGATIVE", "POSITIVE"] },
    ],
  },
  {
    code: "CRP",
    name: "C-REACTIVE PROTEIN (CRP)",
    department: "Serology",
    sampleType: "Serum",
    standardPrice: 350,
    guidelinesRef: "Age-stratified CRP biological reference intervals",
    parameters: [
      {
        id: "crp",
        name: "C-REACTIVE PROTEIN",
        unit: "mg/L",
        min: 0,
        max: 6,
        referenceRange: "ADULTS : Up to 6 mg/L\nNEW BORNS UPTO 3 WEEKS : < 4.1 mg/L\nINFANTS AND CHILDREN : < 2.8 mg/L",
        method: "Immunoturbidimetry",
        defaultValue: "",
      },
    ],
    interpretations: [
      {
        heading: "C-Reactive Protein",
        content: "CRP is an acute-phase reactant. Interpret against age-specific reference intervals (adults, newborns up to 3 weeks, infants and children) and correlate clinically."
      }
    ],
    remarks: [
      "1. Reference intervals vary by age group as printed on the report.",
      "2. Markedly elevated CRP suggests significant inflammation or infection; clinical correlation is advised."
    ]
  },
  {
    code: "HM009",
    name: "BLOOD GROUP (ABO & RH TYPING)",
    department: "Haematology",
    sampleType: "Whole Blood EDTA",
    standardPrice: 100,
    guidelinesRef: "Standard Blood Grouping Tube/Slide Agglutination Technique",
    parameters: [
      {
        id: "blood_group",
        name: "Blood Groups",
        unit: "",
        referenceRange: "A / B / AB / O",
        method: "Agglutination",
        defaultValue: "B",
        options: ["A", "B", "AB", "O"],
      },
      {
        id: "rh_typing",
        name: "RH TYPING",
        unit: "",
        referenceRange: "POSITIVE / NEGATIVE",
        method: "Slide / Tube Agglutination",
        defaultValue: "POSITIVE",
        options: ["POSITIVE", "NEGATIVE"],
      },
    ],
    interpretations: [
      {
        heading: "Immunohematology & Blood Group Typing",
        content: "ABO blood grouping and Rh (D) typing performed using monoclonal anti-A, anti-B and anti-D antisera by standard hemagglutination technique."
      }
    ],
    remarks: [
      "1. Blood group verified with standardized monoclonal agglutination reagents.",
      "2. Cross-matching is mandatory prior to blood transfusion."
    ]
  }
] as const;

export const ALIGARH_FRANCHISE_ID = "95e74dde-fec7-419c-87b1-8722721772f4";
export const ALIGARH_LIVE_FRANCHISE_ID = "e748a2b6-2f2d-43a3-b32f-928b74906177";

/**
 * Checks if a given franchise identifier, object, or code represents the Aligarh franchise.
 */
export function isAligarhFranchise(franchise?: string | { id?: string; code?: string; name?: string; email?: string } | null): boolean {
  if (!franchise) return false;
  if (typeof franchise === "object") {
    const str = `${franchise.id || ""} ${franchise.code || ""} ${franchise.name || ""} ${franchise.email || ""}`.toLowerCase();
    return (
      str.includes(ALIGARH_FRANCHISE_ID.toLowerCase()) ||
      str.includes(ALIGARH_LIVE_FRANCHISE_ID.toLowerCase()) ||
      str.includes("alg") ||
      str.includes("aligarh") ||
      str.includes("akshataligarh")
    );
  }
  const s = String(franchise).toLowerCase().trim();
  return (
    s === ALIGARH_FRANCHISE_ID.toLowerCase() ||
    s === ALIGARH_LIVE_FRANCHISE_ID.toLowerCase() ||
    s.includes("alg") ||
    s.includes("aligarh")
  );
}

export const ALIGARH_TEST_CATALOG: readonly TestDefinition[] = [
  {
    code: "LFT",
    name: "Liver Function Test (LFT)",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 700,
    guidelinesRef: "American Association for the Study of Liver Diseases (AASLD)",
    parameters: [
      { id: "s_bili_total", name: "S.BILIRUBIN (TOTAL)", unit: "mg %", min: 0.1, max: 1.0, referenceRange: "0.1 - 1.0", method: "DPD", defaultValue: "0.60" },
      { id: "bili_conj_direct", name: "CONJUGATED (DIRECT)", unit: "mg %", min: 0.0, max: 0.25, referenceRange: "0.0 - 0.25", method: "DPD", defaultValue: "0.15" },
      { id: "bili_unconj_indirect", name: "UNCONJUGATED (INDIRECT)", unit: "mg %", min: 0.0, max: 0.75, referenceRange: "0.0 - 0.75", method: "Calculated", defaultValue: "0.45" },
      { id: "ast_sgot", name: "SGOT", unit: "U/L", min: 10.0, max: 50.0, referenceRange: "10.0 - 50.0", method: "UV without P5P", defaultValue: "24.0" },
      { id: "alt_sgpt", name: "SGPT", unit: "U/L", min: 10.0, max: 50.0, referenceRange: "10.0 - 50.0", method: "UV without P5P", defaultValue: "22.0" },
      { id: "s_alp", name: "S.ALKALINE PHOSPHATASE", unit: "U/L", min: 37, max: 143, referenceRange: "37 - 143", method: "AMP Buffer", defaultValue: "76.0" },
      { id: "ggt", name: "GGT", unit: "U/L", min: 5, max: 47, referenceRange: "ADULT MALES : 7 - 47 U/L\nADULT FEMALES : 5 - 25 U/L\nNEWBORNS : Up to 5 times adult levels", method: "IFCC", defaultValue: "" },
    ],
    interpretations: [
      {
        heading: "Hepatic Evaluation & Enzymes",
        content: "Transaminases (AST/ALT) and excretory enzymes demonstrate preserved hepatocellular integrity."
      }
    ],
    remarks: [
      "1. Bilirubin is measured by diazo reaction spectrophotometry.",
      "2. Mild isolated enzyme elevations may occur after vigorous physical exertion or medication."
    ]
  },
  {
    code: "RFT",
    name: "Renal Function Test (RFT / KFT)",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 650,
    guidelinesRef: "Kidney Disease Improving Global Outcomes (KDIGO)",
    parameters: [
      { id: "blood_urea", name: "BLOOD UREA", unit: "mg %", min: 10.0, max: 50.0, referenceRange: "10.0 - 50.0", method: "GLDH, Kinetic assay", defaultValue: "26.0" },
      { id: "serum_creatinine", name: "SERUM CREATININE", unit: "mg %", min: 0.6, max: 1.2, referenceRange: "0.6 - 1.2", method: "Modified Jaffe, Kinetic", defaultValue: "0.92" },
      { id: "serum_uric_acid", name: "SERUM URIC ACID", unit: "mg %", min: 2.5, max: 6.5, referenceRange: "2.5 - 6.5", method: "Uricase PAP", defaultValue: "4.8" },
      { id: "serum_sodium", name: "Serum Sodium", unit: "mmol /L", min: 135.0, max: 150.0, referenceRange: "135.0 - 150.0", method: "Direct ISE", defaultValue: "140.0" },
      { id: "s_potassium", name: "S. Potassium", unit: "mmol /L", min: 3.5, max: 5.5, referenceRange: "3.5 - 5.5", method: "Direct ISE", defaultValue: "4.2" },
      { id: "ionised_calcium", name: "IONISED CALCIUM", unit: "meq /L", min: 1.0, max: 2.3, referenceRange: "1.0 - 2.3", method: "Direct ISE / Arsenazo", defaultValue: "1.6" },
    ],
    interpretations: [
      {
        heading: "Renal Function & Electrolyte Interpretation",
        content: "Serum creatinine, urea and electrolytes demonstrate preserved renal clearance and fluid balance."
      }
    ],
    remarks: [
      "1. Renal parameters measured by automated biochemical analyzer.",
      "2. Adequate hydration recommended prior to subsequent monitoring."
    ]
  },
  {
    code: "LIPID",
    name: "Lipid Profile Advance",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 650,
    guidelinesRef: "Lipid Association of India (LAI) & NCEP ATP-IV",
    parameters: [
      { id: "s_cholesterol", name: "S. CHOLESTEROL", unit: "mg %", min: 120.0, max: 200.0, referenceRange: "120.0 - 200.0", method: "CHO-POD (Trac. Abel-Kendall)", defaultValue: "165.0" },
      { id: "s_triglycerides", name: "S.TRIGLYCCERIDES", unit: "mg%", min: 60.0, max: 200.0, referenceRange: "60.0 - 200.0", method: "GPO-POD", defaultValue: "128.0" },
      { id: "hdl_cholesterol", name: "HDL CHOLESTEROL", unit: "mg%", min: 35.0, max: 95.0, referenceRange: "35.0 - 95.0", method: "Direct Enzymatic Immunoinhibition", defaultValue: "48.0" },
      { id: "vldl_cholesterol", name: "V L D L CHOLESTEROL", unit: "mg%", min: 5.0, max: 40.0, referenceRange: "5.0 - 40.0", method: "Calculated", defaultValue: "25.6" },
      { id: "ldl_cholesterol", name: "LDL CHOLESTEROL", unit: "mg%", min: 50.0, max: 190.0, referenceRange: "50.0 - 190.0", method: "Calculated (Friedewald)", defaultValue: "91.4" },
      { id: "total_hdl_ratio", name: "TOTAL / HDL CHOLESTEROL RATIO", unit: "", min: 0.00, max: 4.9, referenceRange: "0.00 - 4.9", method: "Calculated", defaultValue: "3.44" },
    ],
    interpretations: [
      {
        heading: "Cardiovascular Risk Stratification (NCEP ATP IV / LAI)",
        content: "Total Cholesterol and Triglycerides within desirable therapeutic thresholds."
      }
    ],
    remarks: [
      "1. Lipid testing performed following recommended 10-12 hour overnight fasting protocol.",
      "2. Friedewald calculation is valid when Triglycerides < 400 mg/dL."
    ]
  },
  {
    code: "THYROID",
    name: "Thyroid Profile (Total T3, T4 & TSH)",
    department: "Bio Chemistry",
    sampleType: "Serum",
    standardPrice: 600,
    guidelinesRef: "American Thyroid Association (ATA)",
    parameters: [
      { id: "t3", name: "T3", unit: "nmol/l", min: 0.6, max: 2.0, referenceRange: "0.6 - 2.0", method: "Chemiluminescence Immunoassay (CLIA)", defaultValue: "1.20" },
      { id: "t4", name: "T4", unit: "nmol/l", min: 60, max: 155, referenceRange: "60 - 155", method: "Chemiluminescence Immunoassay (CLIA)", defaultValue: "95.0" },
      { id: "tsh", name: "TSH", unit: "ulU/ml", min: 0.38, max: 5.50, referenceRange: "0.38 - 5.50", method: "Chemiluminescence Immunoassay (CLIA)", defaultValue: "2.10" },
    ],
    interpretations: [
      {
        heading: "Thyroid Axis Evaluation",
        content: "TSH and circulating thyroid hormone levels demonstrate euthyroid state with intact pituitary-thyroid feedback regulation."
      }
    ],
    remarks: [
      "1. Basal morning sampling recommended.",
      "2. Clinical correlation advised for borderline results."
    ]
  }
];

export interface MainParameterConfig {
  department: string;
  mainParameter: string;
  aliases: string[];
  subParameters: Array<{
    name: string;
    aliasList: string[];
    paramId: string;
  }>;
}

// 1. DEFAULT MAIN PARAMETERS (Varanasi / Shared Global)
export const MAIN_PARAMETERS_CONFIG: MainParameterConfig[] = [
  {
    department: "Hematology",
    mainParameter: "CBC",
    aliases: ["CBC", "COMPLETE BLOOD COUNT", "HEMOGRAM", "HAEMOGRAM", "COMPLETE HEMOGRAM", "CBC WITH ESR", "CBC AUTO", "HAEMATOLOGY COMPLETE"],
    subParameters: [
      { name: "Hb", aliasList: ["hb", "haemoglobin", "hemoglobin", "hgb", "haemoglobin (hb)"], paramId: "hb" },
      { name: "TLC", aliasList: ["tlc", "total leucocyte count", "wbc", "total wbc", "total leucocyte count (tlc / wbc)"], paramId: "tlc" },
      { name: "DIFFERENTIAL LEUCOCYTE COUNT (DLC)", aliasList: ["dlc", "differential count", "differential leucocyte count", "differential leucocyte count (dlc)", "dlc (differential leucocyte count)", "dlc_heading", "neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils"], paramId: "dlc" },
      { name: "RBC", aliasList: ["rbc", "red blood cell count", "total rbc", "red blood cell count (rbc)"], paramId: "rbc" },
      { name: "PCV", aliasList: ["pcv", "pcv / hct", "pcv / hct (hematocrit)", "hematocrit", "hct"], paramId: "pcv" },
      { name: "MCV", aliasList: ["mcv", "mean corp volume", "mean corp volume (mcv)"], paramId: "mcv" },
      { name: "MCH", aliasList: ["mch", "mean corp hb", "mean corp hb (mch)"], paramId: "mch" },
      { name: "MCHC", aliasList: ["mchc", "mean corp hb conc", "mean corp hb conc (mchc)"], paramId: "mchc" },
      { name: "Platelet", aliasList: ["platelet", "platelets", "platelet count", "plt", "platelet count (plt)"], paramId: "plt" },
      { name: "ESR", aliasList: ["esr", "erythrocyte sedimentation rate", "erythrocyte sedimentation rate (esr)"], paramId: "esr" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "LFT",
    aliases: ["LFT", "LIVER FUNCTION TEST", "LIVER FUNCTION TESTS", "LIVER PROFILE", "HEPATIC PROFILE", "LIVER PANEL"],
    subParameters: [
      { name: "Bilirubin-total", aliasList: ["bilirubin-total", "total bilirubin", "serum bilirubin total", "serum bilirubin, (total)", "bili total", "bili_total"], paramId: "bili_total" },
      { name: "Bilirubin-Direct", aliasList: ["bilirubin-direct", "direct bilirubin", "serum bilirubin direct", "serum bilirubin, (direct)", "bili direct", "bili_direct"], paramId: "bili_direct" },
      { name: "Bilirubin- Indirect", aliasList: ["bilirubin- indirect", "indirect bilirubin", "serum bilirubin indirect", "serum bilirubin, (indirect)", "bili indirect", "bili_indirect"], paramId: "bili_indirect" },
      { name: "Total Protein", aliasList: ["total protein", "serum total protein", "protein total"], paramId: "total_protein" },
      { name: "Albumin", aliasList: ["albumin", "serum albumin"], paramId: "albumin" },
      { name: "Globulin", aliasList: ["globulin", "serum globulin"], paramId: "globulin" },
      { name: "A/G Ratio", aliasList: ["a/g ratio", "albumin/globulin ratio", "ag ratio", "albumin / globulin ratio"], paramId: "ag_ratio" },
      { name: "SGOT", aliasList: ["sgot", "ast", "aspartate aminotransferase", "aspartate aminotransferase (ast/sgot)", "ast/sgot"], paramId: "ast_sgot" },
      { name: "SGPT", aliasList: ["sgpt", "alt", "alanine aminotransferase", "alanine aminotransferase (alt/sgpt)", "alt/sgpt"], paramId: "alt_sgpt" },
      { name: "ALP", aliasList: ["alp", "alkaline phosphatase", "alkaline phosphatase (alp)"], paramId: "alp" },
      { name: "GGT", aliasList: ["ggt", "gamma gt", "gamma glutamyl", "gamma glutamyl transferase", "gamma glutamyl transferase (ggt)"], paramId: "ggt" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "KFT",
    aliases: ["KFT", "KIDNEY FUNCTION TEST", "KIDNEY FUNCTION TESTS", "RENAL FUNCTION TEST", "RENAL FUNCTION TESTS", "RFT", "RENAL PROFILE", "KIDNEY PROFILE"],
    subParameters: [
      { name: "sugar- R", aliasList: ["sugar- r", "sugar r", "random blood sugar", "rbs", "glucose random", "random blood sugar (sugar - r)"], paramId: "sugar_r" },
      { name: "UREA", aliasList: ["urea", "blood urea", "serum urea"], paramId: "blood_urea" },
      { name: "CREATININE", aliasList: ["creatinine", "serum creatinine"], paramId: "creatinine" },
      { name: "URIC ACID", aliasList: ["uric acid", "serum uric acid"], paramId: "uric_acid" },
      { name: "SODIUM", aliasList: ["sodium", "serum sodium", "serum sodium (na+)", "na+"], paramId: "sodium" },
      { name: "POTASSIUM", aliasList: ["potassium", "serum potassium", "serum potassium (k+)", "k+"], paramId: "potassium" },
      { name: "CHOLORIDE", aliasList: ["choloride", "chloride", "serum chloride", "serum chloride (cl-)", "cl-"], paramId: "chloride" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "LIPID PROFILE",
    aliases: ["LIPID PROFILE", "LIPID", "LIPID PANEL", "CHOLESTEROL PROFILE", "CORONARY RISK PROFILE", "LIPIDS"],
    subParameters: [
      { name: "CHOLESTROL", aliasList: ["cholestrol", "cholesterol", "total cholesterol", "serum cholesterol"], paramId: "chol_total" },
      { name: "HDL", aliasList: ["hdl", "hdl cholesterol", "serum hdl", "serum hdl cholesterol"], paramId: "hdl" },
      { name: "LDL", aliasList: ["ldl", "ldl cholesterol", "ldl-c", "ldl cholesterol calculated"], paramId: "ldl" },
      { name: "VLDL", aliasList: ["vldl", "vldl cholesterol", "vldl-c", "vldl cholesterol calculated"], paramId: "vldl" },
      { name: "TRIGLYCERIDE", aliasList: ["triglyceride", "triglycerides", "serum triglycerides", "tg"], paramId: "triglycerides" },
    ],
  },
  {
    department: "Serology",
    mainParameter: "WIDAL",
    aliases: ["WIDAL", "WIDAL TEST", "WIDAL (SLIDE AGGLUTINATION)", "WIDAL SLIDE", "SLIDE AGGLUTINATION WIDAL", "TYPHOID WIDAL"],
    subParameters: [
      { name: "Salmonella typhi O", aliasList: ["salmonella typhi o", "typhi o", "s. typhi o", "to"], paramId: "typhi_o" },
      { name: "Salmonella typhi H", aliasList: ["salmonella typhi h", "typhi h", "s. typhi h", "th"], paramId: "typhi_h" },
      { name: "Salmonella paratyphi A,H", aliasList: ["salmonella paratyphi a,h", "paratyphi a,h", "paratyphi ah", "s. paratyphi a", "ah"], paramId: "paratyphi_ah" },
      { name: "Salmonella paratyphi B,H", aliasList: ["salmonella paratyphi b,h", "paratyphi b,h", "paratyphi bh", "s. paratyphi b", "bh"], paramId: "paratyphi_bh" },
      { name: "INTERPRETATION", aliasList: ["interpretation", "widal interpretation", "impression"], paramId: "widal_interpretation" },
    ],
  },
  {
    department: "Haematology",
    mainParameter: "BLOOD GROUP (ABO & RH TYPING)",
    aliases: [
      "BLOOD GROUP",
      "BLOOD GROUP (ABO & RH TYPING)",
      "BLOOD GROUP & RH TYPING",
      "ABO & RH TYPING",
      "ABO AND RH TYPING",
      "BLOOD GROUPING",
      "BLOOD GROUPING & RH FACTOR",
      "HM009",
      "LSHHI302",
      "BLOOD GROUP TEST",
      "ABO RH TYPING",
    ],
    subParameters: [
      { name: "Blood Groups", aliasList: ["blood groups", "blood group", "abo blood group", "abo group", "blood_group", "abo"], paramId: "blood_group" },
      { name: "RH TYPING", aliasList: ["rh typing", "rh factor", "rh(d) typing", "rh typing (d)", "rh_typing", "rh factor (rh typing)"], paramId: "rh_typing" },
    ],
  },
];

// 2. ALIGARH MAIN PARAMETERS CONFIGURATION
export const ALIGARH_MAIN_PARAMETERS_CONFIG: MainParameterConfig[] = [
  {
    department: "Bio Chemistry",
    mainParameter: "LFT",
    aliases: ["LFT", "LIVER FUNCTION TEST", "LIVER FUNCTION TESTS", "LIVER PROFILE", "HEPATIC PROFILE", "LIVER PANEL", "LFT PARAMETERS"],
    subParameters: [
      { name: "S.BILIRUBIN (TOTAL)", aliasList: ["s.bilirubin (total)", "bilirubin (total)", "bilirubin-total", "total bilirubin", "s_bili_total"], paramId: "s_bili_total" },
      { name: "CONJUGATED (DIRECT)", aliasList: ["conjugated (direct)", "bilirubin-direct", "direct bilirubin", "bili_conj_direct"], paramId: "bili_conj_direct" },
      { name: "UNCONJUGATED (INDIRECT)", aliasList: ["unconjugated (indirect)", "bilirubin- indirect", "indirect bilirubin", "bili_unconj_indirect"], paramId: "bili_unconj_indirect" },
      { name: "SGOT", aliasList: ["sgot", "ast", "aspartate aminotransferase", "ast/sgot"], paramId: "ast_sgot" },
      { name: "SGPT", aliasList: ["sgpt", "alt", "alanine aminotransferase", "alt/sgpt"], paramId: "alt_sgpt" },
      { name: "S.ALKALINE PHOSPHATASE", aliasList: ["s.alkaline phosphatase", "alkaline phosphatase", "alp", "s_alp"], paramId: "s_alp" },
      { name: "GGT", aliasList: ["ggt", "gamma gt", "gamma glutamyl", "gamma glutamyl transferase", "gamma glutamyl transferase (ggt)"], paramId: "ggt" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "RFT",
    aliases: ["RFT", "RFT PARAMETERS", "RENAL FUNCTION TEST", "RENAL FUNCTION TESTS", "RENAL PROFILE", "KFT", "KIDNEY FUNCTION TEST", "KIDNEY FUNCTION TESTS"],
    subParameters: [
      { name: "BLOOD UREA", aliasList: ["blood urea", "urea", "serum urea"], paramId: "blood_urea" },
      { name: "SERUM CREATININE", aliasList: ["serum creatinine", "creatinine"], paramId: "serum_creatinine" },
      { name: "SERUM URIC ACID", aliasList: ["serum uric acid", "uric acid"], paramId: "serum_uric_acid" },
      { name: "Serum Sodium", aliasList: ["serum sodium", "sodium", "na+"], paramId: "serum_sodium" },
      { name: "S. Potassium", aliasList: ["s. potassium", "potassium", "serum potassium", "k+"], paramId: "s_potassium" },
      { name: "IONISED CALCIUM", aliasList: ["ionised calcium", "calcium", "serum calcium"], paramId: "ionised_calcium" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "LIPID PROFILE",
    aliases: ["LIPID PROFILE", "LIPID", "LIPID PANEL", "CHOLESTEROL PROFILE", "CORONARY RISK PROFILE", "LIPIDS"],
    subParameters: [
      { name: "S. CHOLESTEROL", aliasList: ["s. cholesterol", "cholesterol", "total cholesterol", "cholestrol", "s_cholesterol"], paramId: "s_cholesterol" },
      { name: "S.TRIGLYCCERIDES", aliasList: ["s.triglycerides", "triglycerides", "triglyceride", "s_triglycerides"], paramId: "s_triglycerides" },
      { name: "HDL CHOLESTEROL", aliasList: ["hdl cholesterol", "hdl", "serum hdl", "hdl_cholesterol"], paramId: "hdl_cholesterol" },
      { name: "V L D L CHOLESTEROL", aliasList: ["v l d l cholesterol", "vldl cholesterol", "vldl", "vldl_cholesterol"], paramId: "vldl_cholesterol" },
      { name: "LDL CHOLESTEROL", aliasList: ["ldl cholesterol", "ldl", "ldl_cholesterol"], paramId: "ldl_cholesterol" },
      { name: "TOTAL / HDL CHOLESTEROL RATIO", aliasList: ["total / hdl cholesterol ratio", "total / hdl ratio", "chol/hdl ratio", "total_hdl_ratio"], paramId: "total_hdl_ratio" },
    ],
  },
  {
    department: "Bio Chemistry",
    mainParameter: "THYROID PROFILE",
    aliases: ["THYROID PROFILE", "THYROID", "THYROID PANEL", "T3 T4 TSH", "THYROID FUNCTION TEST"],
    subParameters: [
      { name: "T3", aliasList: ["t3", "tri-iodothyronine", "total t3"], paramId: "t3" },
      { name: "T4", aliasList: ["t4", "thyroxine", "total t4"], paramId: "t4" },
      { name: "TSH", aliasList: ["tsh", "thyroid stimulating hormone"], paramId: "tsh" },
    ],
  },
  {
    department: "Haematology",
    mainParameter: "BLOOD GROUP (ABO & RH TYPING)",
    aliases: [
      "BLOOD GROUP",
      "BLOOD GROUP (ABO & RH TYPING)",
      "BLOOD GROUP & RH TYPING",
      "ABO & RH TYPING",
      "ABO AND RH TYPING",
      "BLOOD GROUPING",
      "BLOOD GROUPING & RH FACTOR",
      "HM009",
      "LSHHI302",
      "BLOOD GROUP TEST",
      "ABO RH TYPING",
    ],
    subParameters: [
      { name: "Blood Groups", aliasList: ["blood groups", "blood group", "abo blood group", "abo group", "blood_group", "abo"], paramId: "blood_group" },
      { name: "RH TYPING", aliasList: ["rh typing", "rh factor", "rh(d) typing", "rh typing (d)", "rh_typing", "rh factor (rh typing)"], paramId: "rh_typing" },
    ],
  },
];

/**
 * Resolves whether a test name or code maps to one of our standard Main Parameters (CBC, LFT, KFT, LIPID PROFILE, THYROID PROFILE, BLOOD GROUP),
 * taking into account franchise-specific configurations when specified.
 */
export function resolveMainParameter(
  testNameOrCode: string,
  franchiseIdentifier?: string | { id?: string; code?: string; name?: string } | null
): MainParameterConfig | null {
  const query = (testNameOrCode || "").toLowerCase().trim();
  if (!query) return null;

  // 1. Check Aligarh configuration if Aligarh franchise is active
  if (isAligarhFranchise(franchiseIdentifier)) {
    for (const config of ALIGARH_MAIN_PARAMETERS_CONFIG) {
      if (config.mainParameter.toLowerCase() === query) return config;
      for (const alias of config.aliases) {
        const a = alias.toLowerCase();
        if (query === a || query.includes(a) || a.includes(query)) {
          return config;
        }
      }
    }
  }

  // 2. Default / Varanasi configuration
  for (const config of MAIN_PARAMETERS_CONFIG) {
    if (config.mainParameter.toLowerCase() === query) return config;
    for (const alias of config.aliases) {
      const a = alias.toLowerCase();
      if (query === a || query.includes(a) || a.includes(query)) {
        return config;
      }
    }
  }
  return null;
}

/**
 * Returns available sub-parameters for a given test (if mapped to a Main Parameter),
 * scoped to the active franchise.
 */
export function getSubParametersForTest(
  testNameOrCode: string,
  franchiseIdentifier?: string | { id?: string; code?: string; name?: string } | null
): string[] {
  const mainConfig = resolveMainParameter(testNameOrCode, franchiseIdentifier);
  if (mainConfig) {
    return mainConfig.subParameters.map(sp => sp.name);
  }
  return [];
}

/**
 * Returns the test schema with parameters optionally filtered by selectedSubParams and scoped to franchise.
 */
export function getTestParameterSchema(
  testNameOrCode: string,
  selectedSubParams?: string[],
  franchiseIdentifier?: string | { id?: string; code?: string; name?: string } | null
): TestDefinition {
  const query = (testNameOrCode || "").toLowerCase().trim();
  const isAligarh = isAligarhFranchise(franchiseIdentifier);

  let baseSchema: TestDefinition | undefined;
  const isMalariaQuery =
    query.includes("malaria") ||
    query.includes("plasmodium") ||
    query.includes("falciparum") ||
    query.includes("vivax") ||
    /\bmp\b/.test(query) ||
    query.includes("mp smear") ||
    query.includes("malaria antigen") ||
    query.includes("malaria card");
  const isCrpQuery =
    query.includes("crp") ||
    query.includes("c-reactive") ||
    query.includes("c reactive") ||
    query.includes("reactive protein");

  // 1. If Aligarh franchise, search Aligarh-specific catalog first
  if (isAligarh) {
    if (query.includes("liver") || query.includes("lft") || query.includes("bilirubin")) {
      baseSchema = ALIGARH_TEST_CATALOG[0]; // LFT
    } else if (query.includes("kidney") || query.includes("kft") || query.includes("renal") || query.includes("rft") || query.includes("creatinine") || query.includes("urea")) {
      baseSchema = ALIGARH_TEST_CATALOG[1]; // RFT / KFT
    } else if (query.includes("lipid") || query.includes("cholesterol") || query.includes("triglyceride")) {
      baseSchema = ALIGARH_TEST_CATALOG[2]; // Lipid
    } else if (query.includes("thyroid") || query.includes("tsh") || query.includes("t3") || query.includes("t4")) {
      baseSchema = ALIGARH_TEST_CATALOG[3]; // Thyroid
    }
  }

  // 2. Direct match or standard catalog fallback (Varanasi / Default)
  if (!baseSchema && isMalariaQuery) {
    baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "MALARIA");
  }
  if (!baseSchema && isCrpQuery) {
    baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "CRP");
  }

  // Typhidot is a separate antibody test; without this it falls into the Widal branch via "typhi".
  const isTyphidotQuery =
    query.includes("typhi dot") || query.includes("typhidot") || query.includes("es154") || query.includes("es155");
  if (!baseSchema && isTyphidotQuery) {
    const isIgm = /\bigm\b/.test(query) || query.includes("es155");
    baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === (isIgm ? "ES155" : "ES154"));
  }

  // Specific Blood Glucose tests (FASTING, PP, FASTING AND PP, RANDOM)
  const isGlucoseQuery =
    query.includes("glucose") ||
    query.includes("sugar") ||
    query.includes("fbs") ||
    query.includes("ppbs") ||
    query.includes("rbs") ||
    query.includes("bc052") ||
    query.includes("bc053") ||
    query.includes("bc289") ||
    query.includes("bc054") ||
    query.includes("lshhi821") ||
    query.includes("lshhi822") ||
    query.includes("lshhi6152") ||
    query.includes("lshhi823");

  if (!baseSchema && isGlucoseQuery) {
    const hasFasting =
      query.includes("fasting") ||
      query.includes("fbs") ||
      query.includes("bc052") ||
      query.includes("lshhi821");
    const hasPP =
      query.includes("pp") ||
      query.includes("post prandial") ||
      query.includes("postprandial") ||
      query.includes("ppbs") ||
      query.includes("bc053") ||
      query.includes("lshhi822");
    const isFastingAndPP =
      (hasFasting && hasPP) ||
      query.includes("fasting and pp") ||
      query.includes("fasting & pp") ||
      query.includes("fasting/pp") ||
      query.includes("f & pp") ||
      query.includes("f and pp") ||
      query.includes("bc289") ||
      query.includes("lshhi6152");
    const isRandom =
      query.includes("random") ||
      query.includes("rbs") ||
      query.includes("bc054") ||
      query.includes("lshhi823");

    if (isFastingAndPP) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "BC289" || t.name === "BLOOD GLUCOSE FASTING AND PP");
    } else if (hasPP && !hasFasting) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "BC053" || t.name === "BLOOD GLUCOSE PP");
    } else if (hasFasting && !hasPP) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "BC052" || t.name === "BLOOD GLUCOSE FASTING");
    } else if (isRandom) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "BC054" || t.name === "BLOOD GLUCOSE RANDOM");
    } else {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "BC052" || t.name === "BLOOD GLUCOSE FASTING");
    }
  }

  if (!baseSchema) {
    const found = STANDARD_TEST_CATALOG.find(t =>
      t.code.toLowerCase() === query ||
      t.name.toLowerCase() === query ||
      t.name.toLowerCase().includes(query) ||
      query.includes(t.code.toLowerCase()) ||
      query.includes(t.name.toLowerCase())
    );

    if (found) {
      baseSchema = found;
    } else if (query.includes("group") || query.includes("abo") || query.includes("rh typing") || query.includes("hm009") || query.includes("lshhi302") || (query.includes("blood") && query.includes("rh"))) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "HM009" || t.name.includes("BLOOD GROUP")) || STANDARD_TEST_CATALOG[STANDARD_TEST_CATALOG.length - 1];
    } else if (query.includes("cbc") || query.includes("hemogram") || query.includes("haemogram") || query.includes("complete blood count") || query.includes("hm078")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "CBC");
    } else if (query.includes("lipid") || query.includes("cholesterol") || query.includes("triglyceride")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "LIPID");
    } else if (query.includes("liver") || query.includes("lft") || query.includes("bilirubin") || query.includes("sgot") || query.includes("sgpt")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "LFT");
    } else if (query.includes("kidney") || query.includes("kft") || query.includes("renal") || query.includes("rft") || query.includes("creatinine") || query.includes("urea")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "KFT");
    } else if (query.includes("sugar") || query.includes("glucose") || query.includes("fbs") || query.includes("diabetes")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "BC052");
    } else if (query.includes("hba1c") || query.includes("glycated")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "HBA1C");
    } else if (query.includes("thyroid") || query.includes("tsh") || query.includes("t3") || query.includes("t4")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "THYROID");
    } else if (query.includes("urine")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "URINE");
    } else if (query.includes("electrolyte") || query.includes("sodium") || query.includes("potassium")) {
      baseSchema = STANDARD_TEST_CATALOG.find(t => t.code === "ELECTROLYTES");
    } else if (query.includes("widal") || query.includes("typhi") || query.includes("paratyphi")) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "WIDAL") || STANDARD_TEST_CATALOG[STANDARD_TEST_CATALOG.length - 2];
    } else if (query.includes("malaria") || query.includes("plasmodium") || query === "mp" || query.includes("mp smear") || query.includes("malaria antigen") || query.includes("malaria card")) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "MALARIA") || STANDARD_TEST_CATALOG[STANDARD_TEST_CATALOG.length - 2];
    } else if (query.includes("crp") || query.includes("c-reactive") || query.includes("c reactive") || query.includes("reactive protein")) {
      baseSchema = STANDARD_TEST_CATALOG.find((t) => t.code === "CRP");
    }
  }

  // Basic and Advance lipid profiles share one parameter template; only the report title differs.
  if (baseSchema?.code === "LIPID" && query.includes("basic")) {
    baseSchema = { ...baseSchema, name: "Lipid Profile Basic" };
  }

  const resolvedSchema: TestDefinition = baseSchema ?? {
    code: testNameOrCode.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "") || "TEST",
    name: testNameOrCode || "Diagnostic Clinical Test",
    department: "Clinical Pathology",
    sampleType: "Serum / Blood",
    standardPrice: 350,
    parameters: [
      {
        id: "param_1",
        name: testNameOrCode || "Test Result Parameter",
        unit: "mg/dL",
        referenceRange: "Normal",
        method: "Automated Clinical Analyzer",
        defaultValue: "Normal",
      }
    ],
    remarks: [
      "1. Test analyzed according to standard clinical laboratory operating procedures."
    ]
  };

  // If selectedSubParams are provided and non-empty, filter parameters accordingly
  // Glucose tests always retain all their respective parameters without sub-parameter selection
  if (!isGlucoseQuery && selectedSubParams && selectedSubParams.length > 0) {
    const normSelected = selectedSubParams.map(s => s.toLowerCase().trim());
    const isDlcSelected = normSelected.some(
      s => s === "dlc" || s.includes("differential leucocyte count") || s === "differential count" || s.includes("(dlc)") || s === "dlc_heading"
    );
    const mainConfig = resolveMainParameter(testNameOrCode, franchiseIdentifier);

    const filteredParams = resolvedSchema.parameters.filter(param => {
      // 1. DLC Heading and its differential sub-parameters
      if (param.isHeading && (param.id === "dlc_heading" || param.name.toLowerCase().includes("differential leucocyte count"))) {
        return isDlcSelected;
      }
      if (param.isSubItem && (param.parentHeadingId === "dlc" || ["neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils"].includes(param.id.toLowerCase()))) {
        return isDlcSelected;
      }

      const pId = param.id.toLowerCase();
      const pName = param.name.toLowerCase();

      // Direct check against selected sub-parameters
      if (normSelected.some(sel => sel === pId || sel === pName || pName.includes(sel) || sel.includes(pId))) {
        return true;
      }

      // Check aliases in main config
      if (mainConfig) {
        for (const sp of mainConfig.subParameters) {
          if (normSelected.includes(sp.name.toLowerCase())) {
            if (sp.paramId.toLowerCase() === pId) return true;
            if (sp.aliasList.some(a => a === pId || a === pName || pName.includes(a))) return true;
          }
        }
      }

      return false;
    });

    if (filteredParams.length > 0) {
      return {
        ...resolvedSchema,
        parameters: filteredParams,
      };
    }
  }

  return resolvedSchema;
}

export function evaluateParameterFlag(
  valueStr: string | number,
  param: ParameterDefinition
): {
  isAbnormal: boolean;
  isCritical: boolean;
  flag: "Normal" | "High" | "Low" | "Critical" | "Borderline";
  tone: "success" | "warning" | "danger" | "neutral";
} {
  if (param.isHeading || param.referenceRange === "HEADING") {
    return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "neutral" };
  }

  const str = String(valueStr ?? "").trim();
  if (!str) {
    return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "neutral" };
  }

  const lower = str.toLowerCase();

  // Blood group / Rh Typing evaluations
  if (
    param.id === "blood_group" ||
    param.id === "rh_typing" ||
    param.name.toLowerCase().includes("blood group") ||
    param.name.toLowerCase().includes("rh typing") ||
    param.name.toLowerCase().includes("rh factor") ||
    ["a", "b", "ab", "o", "a+", "b+", "ab+", "o+", "a-", "b-", "ab-", "o-"].includes(lower)
  ) {
    return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "success" };
  }

  // Categorical string evaluations (Negative, Nil, Clear, Pale Yellow)
  if (
    lower === "negative" ||
    lower === "nil" ||
    lower === "normal" ||
    lower === "absent" ||
    lower === "clear" ||
    lower === "pale yellow" ||
    lower === "non reactive" ||
    lower === "non-reactive" ||
    lower === "<1:80" ||
    lower === "<1:40" ||
    lower === "<1:20"
  ) {
    return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "success" };
  }
  if (
    lower === "positive" ||
    lower === "present" ||
    lower === "reactive" ||
    lower.includes("trace") ||
    lower.includes("1+") ||
    lower.includes("2+") ||
    lower.includes("3+")
  ) {
    return { isAbnormal: true, isCritical: false, flag: "Borderline", tone: "warning" };
  }

  const val = parseFloat(str);
  if (isNaN(val)) {
    return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "neutral" };
  }

  // Critical checks
  if (param.criticalLow !== undefined && param.criticalLow !== null && val <= param.criticalLow) {
    return { isAbnormal: true, isCritical: true, flag: "Critical", tone: "danger" };
  }
  if (param.criticalHigh !== undefined && param.criticalHigh !== null && val >= param.criticalHigh) {
    return { isAbnormal: true, isCritical: true, flag: "Critical", tone: "danger" };
  }

  // Range checks
  if (param.min !== undefined && param.min !== null && val < param.min) {
    return { isAbnormal: true, isCritical: false, flag: "Low", tone: "warning" };
  }
  if (param.max !== undefined && param.max !== null && val > param.max) {
    return { isAbnormal: true, isCritical: false, flag: "High", tone: "warning" };
  }

  return { isAbnormal: false, isCritical: false, flag: "Normal", tone: "success" };
}

/** Age-stratified CRP upper limit (mg/L) matching the printed reference card. */
export function crpMaxForPatient(patient?: { age?: number; dateOfBirth?: string } | null): number {
  if (patient?.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const weeks = (Date.now() - dob.getTime()) / (7 * 24 * 60 * 60 * 1000);
      if (weeks >= 0 && weeks <= 3) return 4.1;
    }
  }
  const age = Number(patient?.age);
  if (!Number.isNaN(age) && age < 18) return 2.8;
  return 6;
}

const GGT_MALE = { min: 7, max: 47 };
const GGT_FEMALE = { min: 5, max: 25 };

/** Sex- and age-stratified GGT limits (U/L) matching the printed LFT card. */
export function ggtLimitsForPatient(patient?: { age?: number; sex?: string; dateOfBirth?: string } | null): { min: number; max: number } {
  const sex = String(patient?.sex || "").toLowerCase();
  const adult = sex.startsWith("f") ? GGT_FEMALE : sex.startsWith("m") ? GGT_MALE : { min: 5, max: 47 };

  if (patient?.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const weeks = (Date.now() - dob.getTime()) / (7 * 24 * 60 * 60 * 1000);
      if (weeks >= 0 && weeks <= 4) return { min: 0, max: adult.max * 5 };
    }
  }
  const age = Number(patient?.age);
  if (!Number.isNaN(age) && age === 0) return { min: 0, max: adult.max * 5 };
  return adult;
}


