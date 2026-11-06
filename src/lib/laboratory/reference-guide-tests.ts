import type { ParameterDefinition, TestDefinition } from "./test-parameter-definitions";

/**
 * Single-analyte report templates taken from the lab's "BL Diagnostics – Complete Pathology Master Reference Guide"
 * (BL Diagnostics test report.docx). Each entry lists the Test Master codes it applies to; the report keeps the
 * master's own name. Amylase Serum uses the range the lab confirmed separately (0.0 - 90 U/L).
 */

interface SexRange {
  text: string;
  min?: number;
  max?: number;
}

export interface GuideParameter extends Omit<ParameterDefinition, "referenceRange" | "defaultValue"> {
  referenceRange?: string;
  /** Sex-specific interval; resolved for the patient by applyPatientSexRanges. */
  sexRanges?: { male: SexRange; female: SexRange };
}

interface GuideTest {
  codes: readonly string[];
  name: string;
  department: string;
  sampleType: string;
  method?: string;
  parameters: readonly GuideParameter[];
  interpretation: string;
  note?: string;
}

const param = (id: string, name: string, unit: string, referenceRange: string, min?: number, max?: number): GuideParameter => ({
  id,
  name,
  unit,
  referenceRange,
  ...(min !== undefined ? { min } : {}),
  ...(max !== undefined ? { max } : {}),
});

const sexParam = (id: string, name: string, unit: string, male: SexRange, female: SexRange): GuideParameter => ({
  id,
  name,
  unit,
  sexRanges: { male, female },
});

const qualitative = (id: string, name: string, expected: string): GuideParameter => param(id, name, "", expected);

const LIPID_NOTE = "State whether the sample was fasting. Treatment targets depend on cardiovascular risk and applicable clinical guidelines.";
const DIABETES_NOTE = "In the absence of unequivocal symptomatic hyperglycemia, a diabetes-range result generally requires confirmation.";
const THYROID_NOTE = "Intervals differ by analyzer and assay. Pregnancy requires trimester- and method-appropriate interpretation.";
const HORMONE_NOTE = "Hormone levels vary with age, sex, cycle phase, pregnancy, medication and assay method. Interpret with clinical context.";
const TUMOR_NOTE = "Tumor markers are used alongside clinical examination and imaging; they are not standalone screening or diagnostic tests. Trends over time are more useful than an isolated value.";
const SEROLOGY_NOTE = "A reactive/positive screening result should be confirmed according to the applicable testing algorithm. All results to be clinically correlated.";
const COAG_NOTE = "Sample: sodium-citrate plasma, tube filled to the required mark.";
const AUTOIMMUNE_NOTE = "Autoantibodies alone do not establish a diagnosis. Interpret with clinical findings.";
const TDM_NOTE = "Therapeutic range; interpret against dose, time since last dose and clinical indication.";

const GUIDE_TESTS: readonly GuideTest[] = [
  // Lipid
  { codes: ["BC072"], name: "CHOLESTEROL - TOTAL", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (CHOD-POD)", parameters: [param("chol_total", "TOTAL CHOLESTEROL", "mg/dL", "< 200", undefined, 200)], interpretation: "High: increased cardiovascular risk in context.", note: LIPID_NOTE },
  { codes: ["BC186"], name: "TRIGLYCERIDES - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (GPO-POD)", parameters: [param("triglycerides", "TRIGLYCERIDES", "mg/dL", "< 150", undefined, 150)], interpretation: "High: metabolic risk; very high levels increase pancreatitis risk.", note: LIPID_NOTE },
  { codes: ["BC071"], name: "CHOLESTEROL - HDL (DIRECT)", department: "Biochemistry", sampleType: "Serum", method: "Direct Enzymatic", parameters: [sexParam("hdl", "HDL CHOLESTEROL", "mg/dL", { text: "> 40", min: 40 }, { text: "> 50", min: 50 })], interpretation: "Low: associated with increased cardiovascular risk.", note: LIPID_NOTE },
  { codes: ["BC073"], name: "CHOLESTEROL - LDL (DIRECT)", department: "Biochemistry", sampleType: "Serum", method: "Direct Enzymatic", parameters: [param("ldl", "LDL CHOLESTEROL", "mg/dL", "< 100 (Optimal)", undefined, 100)], interpretation: "Higher levels may increase atherosclerotic risk; target depends on overall risk.", note: LIPID_NOTE },
  { codes: ["BC202"], name: "VLDL CHOLESTEROL", department: "Biochemistry", sampleType: "Serum", method: "Calculated", parameters: [param("vldl", "VLDL CHOLESTEROL", "mg/dL", "5 - 40", 5, 40)], interpretation: "Often estimated from triglycerides; method dependent.", note: LIPID_NOTE },

  // Diabetes
  { codes: ["BC056", "BC364"], name: "PLASMA GLUCOSE 2 HOUR (75 G OGTT)", department: "Biochemistry", sampleType: "Fluoride Plasma", method: "Hexokinase / Glucose Oxidase", parameters: [param("glucose_2h", "PLASMA GLUCOSE (2 HOUR)", "mg/dL", "< 140", undefined, 140)], interpretation: "140 - 199: impaired glucose tolerance; >= 200: diabetes range.", note: DIABETES_NOTE },
  { codes: ["BC083", "ELISA-CPEPTIDE"], name: "C-PEPTIDE", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("c_peptide", "C-PEPTIDE (FASTING)", "ng/mL", "0.5 - 2.0", 0.5, 2.0)], interpretation: "Reflects endogenous insulin secretion; interpret with simultaneous glucose and sampling conditions.", note: "Method-dependent interval. Record fasting or stimulated status." },
  { codes: ["BC287"], name: "C-PEPTIDE PP", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("c_peptide_pp", "C-PEPTIDE (POST PRANDIAL)", "ng/mL", "")], interpretation: "Reflects endogenous insulin secretion; interpret with simultaneous glucose and sampling conditions." },
  { codes: ["BC218"], name: "GLUCOSE - URINE", department: "Clinical Pathology", sampleType: "Urine", method: "Dipstick / Benedict's", parameters: [qualitative("urine_glucose", "URINE GLUCOSE", "Negative")], interpretation: "Positive with hyperglycemia or reduced renal glucose threshold." },

  // Thyroid
  { codes: ["BC181", "BC367", "ELISA-TSH"], name: "THYROID STIMULATING HORMONE (TSH)", department: "Immunology", sampleType: "Serum", method: "CLIA / ECLIA", parameters: [param("tsh", "TSH", "mIU/L", "0.4 - 4.0", 0.4, 4.0)], interpretation: "High: primary hypothyroidism; sometimes other causes.\nLow: hyperthyroidism; pituitary or other causes.", note: THYROID_NOTE },
  { codes: ["BC188"], name: "TRIIODOTHYRONINE TOTAL (T3)", department: "Immunology", sampleType: "Serum", method: "CLIA / ECLIA", parameters: [param("t3", "TOTAL T3", "ng/dL", "80 - 200", 80, 200)], interpretation: "High: hyperthyroidism in context.\nLow: hypothyroidism, severe illness or other causes.", note: THYROID_NOTE },
  { codes: ["BC183"], name: "THYROXINE TOTAL (T4)", department: "Immunology", sampleType: "Serum", method: "CLIA / ECLIA", parameters: [param("t4", "TOTAL T4", "µg/dL", "5 - 12", 5, 12)], interpretation: "High: hyperthyroidism or altered binding proteins.\nLow: hypothyroidism or altered binding proteins.", note: THYROID_NOTE },
  { codes: ["BC187", "ELISA-FT3"], name: "TRIIODOTHYRONINE FREE (FT3)", department: "Immunology", sampleType: "Serum", method: "CLIA / ECLIA", parameters: [param("ft3", "FREE T3 (FT3)", "pg/mL", "2.0 - 4.4", 2.0, 4.4)], interpretation: "High: hyperthyroidism.\nLow: may be low in hypothyroidism or non-thyroidal illness.", note: THYROID_NOTE },
  { codes: ["BC182", "ELISA-FT4"], name: "THYROXINE FREE (FT4)", department: "Immunology", sampleType: "Serum", method: "CLIA / ECLIA", parameters: [param("ft4", "FREE T4 (FT4)", "ng/dL", "0.8 - 1.8", 0.8, 1.8)], interpretation: "High: hyperthyroidism or thyroid hormone excess.\nLow: hypothyroidism; pituitary causes also possible.", note: THYROID_NOTE },
  { codes: ["BC041", "BC041A"], name: "ANTI TPO ANTIBODY", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("anti_tpo", "ANTI-TPO ANTIBODY", "IU/mL", "< 35", undefined, 35)], interpretation: "High: supports autoimmune thyroid disease. A negative result does not exclude it.", note: "Assay-specific interval." },
  { codes: ["BC040"], name: "ANTI THYROGLOBULIN ANTIBODY", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("anti_tg", "ANTI-THYROGLOBULIN ANTIBODY", "IU/mL", "")], interpretation: "High: may support autoimmune thyroid disease. Interpret using the kit-specific interval." },

  // Iron studies and vitamins
  { codes: ["BC125"], name: "IRON", department: "Biochemistry", sampleType: "Serum", method: "Colorimetric", parameters: [sexParam("serum_iron", "SERUM IRON", "µg/dL", { text: "65 - 175", min: 65, max: 175 }, { text: "50 - 170", min: 50, max: 170 })], interpretation: "Low in iron deficiency or inflammation; high in some iron-loading conditions." },
  { codes: ["BC260"], name: "TIBC (TOTAL IRON BINDING CAPACITY)", department: "Biochemistry", sampleType: "Serum", method: "Colorimetric", parameters: [param("tibc", "TIBC", "µg/dL", "250 - 450", 250, 450)], interpretation: "Often high in iron deficiency; may be low in inflammation or some liver disorders." },
  { codes: ["BC096"], name: "FERRITIN", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [sexParam("ferritin", "FERRITIN", "ng/mL", { text: "30 - 400", min: 30, max: 400 }, { text: "15 - 150", min: 15, max: 150 })], interpretation: "Low strongly supports depleted iron stores; high may suggest iron overload.", note: "Ferritin is an acute-phase reactant. A normal or high ferritin does not always exclude iron deficiency, particularly during inflammation or chronic disease." },
  { codes: ["BC200", "ELISA-B12"], name: "VITAMIN B12", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("vit_b12", "VITAMIN B12", "pg/mL", "200 - 900", 200, 900)], interpretation: "Low may indicate deficiency; borderline results may need further assessment." },
  { codes: ["BC102"], name: "FOLATE (FOLIC ACID) - SERUM", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("folate", "FOLATE (SERUM)", "ng/mL", "> 4.0", 4.0)], interpretation: "Low may indicate folate deficiency; assay-specific interval applies." },
  { codes: ["BC264", "BC368", "ELISA-VITD"], name: "VITAMIN D 25-HYDROXY", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("vit_d25", "25-OH VITAMIN D", "ng/mL", "Deficient: < 12\nInadequate: 12 - 19\nSufficient: >= 20", 20)], interpretation: "Interpret with clinical context and applicable guidance." },
  { codes: ["BC268"], name: "VITAMIN D 1,25-DIHYDROXY", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("vit_d125", "1,25-DIHYDROXY VITAMIN D", "pg/mL", "")], interpretation: "Not the usual screening test for vitamin D stores. Assay-specific interval applies." },

  // Coagulation
  { codes: ["HM049"], name: "PROTHROMBIN TIME & INR", department: "Hematology", sampleType: "Citrate Plasma", method: "Clot-based (Coagulation Analyzer)", parameters: [param("pt", "PROTHROMBIN TIME (PT)", "seconds", "11 - 14", 11, 14), param("inr", "INR", "Ratio", "0.8 - 1.2", 0.8, 1.2)], interpretation: "PT prolonged in some factor deficiencies, vitamin K deficiency, liver disease and anticoagulant effect.\nINR therapeutic target depends on the indication and treatment.", note: COAG_NOTE },
  { codes: ["HM007"], name: "ACTIVATED PARTIAL THROMBOPLASTIN TIME (APTT)", department: "Hematology", sampleType: "Citrate Plasma", method: "Clot-based (Coagulation Analyzer)", parameters: [param("aptt", "APTT", "seconds", "25 - 35", 25, 35)], interpretation: "Prolonged in certain factor deficiencies, heparin effect, inhibitors and other conditions.", note: COAG_NOTE },
  { codes: ["HM058"], name: "THROMBIN TIME", department: "Hematology", sampleType: "Citrate Plasma", method: "Clot-based (Coagulation Analyzer)", parameters: [param("tt", "THROMBIN TIME (TT)", "seconds", "14 - 21", 14, 21)], interpretation: "May be prolonged with heparin, fibrinogen abnormalities or inhibitors.", note: COAG_NOTE },
  { codes: ["HM030"], name: "FIBRINOGEN", department: "Hematology", sampleType: "Citrate Plasma", method: "Clot-based (Clauss)", parameters: [param("fibrinogen", "FIBRINOGEN", "mg/dL", "200 - 400", 200, 400)], interpretation: "Low in consumption or severe synthetic impairment; high in inflammation.", note: COAG_NOTE },
  { codes: ["ES049"], name: "D-DIMER", department: "Hematology", sampleType: "Citrate Plasma", method: "Immunoassay", parameters: [param("d_dimer", "D-DIMER", "ng/mL FEU", "< 500", undefined, 500)], interpretation: "Elevated in thrombosis but also in many other conditions.", note: "Assay-specific cut-off." },

  // Cardiac
  { codes: ["ES170", "ES171"], name: "TROPONIN (QUALITATIVE)", department: "Serology", sampleType: "Serum / Whole Blood", method: "Immunochromatography", parameters: [qualitative("troponin_qual", "TROPONIN", "Negative")], interpretation: "A positive result indicates myocardial injury; interpret with serial changes, symptoms and ECG findings.", note: "Troponin above the assay's 99th-percentile limit indicates myocardial injury, not automatically a heart attack." },
  { codes: ["ES170A", "ES171A"], name: "TROPONIN (QUANTITATIVE)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("troponin_quant", "TROPONIN", "", "")], interpretation: "Values above the assay's 99th-percentile upper reference limit indicate myocardial injury; interpret with serial changes, symptoms and ECG findings.", note: "Use the assay-specific reference limit and units." },
  { codes: ["BC084"], name: "CREATINE KINASE MB (CK-MB)", department: "Biochemistry", sampleType: "Serum", method: "Immunoassay / Enzymatic", parameters: [param("ck_mb", "CK-MB", "", "")], interpretation: "High: cardiac or skeletal muscle injury.", note: "Method-specific interval." },
  { codes: ["BC087"], name: "CREATINE PHOSPHOKINASE (CPK)", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic", parameters: [sexParam("cpk", "TOTAL CK (CPK)", "U/L", { text: "39 - 308", min: 39, max: 308 }, { text: "26 - 192", min: 26, max: 192 })], interpretation: "High: skeletal muscle injury, exercise, muscle disease or other causes." },
  { codes: ["BC130"], name: "LACTATE DEHYDROGENASE (LDH)", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic", parameters: [param("ldh", "LDH", "U/L", "140 - 280", 140, 280)], interpretation: "High: tissue injury, hemolysis or liver/muscle disease." },
  { codes: ["BC248"], name: "NT-PRO BNP", department: "Biochemistry", sampleType: "Serum / Plasma", method: "Immunoassay", parameters: [param("nt_probnp", "NT-proBNP", "pg/mL", "< 125", undefined, 125)], interpretation: "High: may support assessment for heart failure; age and renal function affect levels." },

  // Viral and infectious serology
  { codes: ["ES080", "ES165", "BC113", "ELISA-HBSAG"], name: "HEPATITIS B SURFACE ANTIGEN (HBsAg)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("hbsag", "HBsAg", "Non-Reactive")], interpretation: "A reactive screening result requires interpretation and confirmation according to the testing algorithm.", note: SEROLOGY_NOTE },
  { codes: ["ES081"], name: "HEPATITIS B SURFACE ANTIBODY (ANTI-HBs)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("anti_hbs", "ANTI-HBs", "mIU/mL", ">= 10 (Protective)")], interpretation: ">= 10 mIU/mL is commonly considered protective after a completed hepatitis B vaccine series." },
  { codes: ["ES076"], name: "HEPATITIS B CORE ANTIBODY - TOTAL", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_hbc_total", "TOTAL ANTI-HBc", "Non-Reactive")], interpretation: "Reactive indicates previous or current exposure; not produced by vaccination.", note: SEROLOGY_NOTE },
  { codes: ["ES077"], name: "HEPATITIS B CORE ANTIBODY - IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_hbc_igm", "IgM ANTI-HBc", "Non-Reactive")], interpretation: "Reactive supports recent/acute hepatitis B infection in the appropriate context.", note: SEROLOGY_NOTE },
  { codes: ["ES082", "ES166", "ES083", "ELISA-HCV"], name: "HEPATITIS C ANTIBODY (ANTI-HCV)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_hcv", "ANTI-HCV", "Non-Reactive")], interpretation: "A reactive result indicates exposure; HCV RNA testing is needed to establish current infection.", note: SEROLOGY_NOTE },
  { codes: ["ES167", "ES096", "ES097", "ELISA-HIV"], name: "HIV 1 & 2", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("hiv", "HIV 1 & 2", "Non-Reactive")], interpretation: "A reactive screening result must not be reported as a definitive diagnosis; follow the applicable NACO testing algorithm.", note: SEROLOGY_NOTE },
  { codes: ["ES056", "ES057", "ELISA-DENGUE-NS1"], name: "DENGUE NS1 ANTIGEN", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("dengue_ns1", "DENGUE NS1 ANTIGEN", "Negative")], interpretation: "Positive may support early dengue diagnosis.", note: SEROLOGY_NOTE },
  { codes: ["ES054", "ES055", "ELISA-DENGUE-IGM"], name: "DENGUE IgM ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("dengue_igm", "DENGUE IgM", "Negative")], interpretation: "Positive may support recent infection; timing and cross-reactivity matter.", note: SEROLOGY_NOTE },
  { codes: ["ES052", "ES053", "ELISA-DENGUE-IGG"], name: "DENGUE IgG ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("dengue_igg", "DENGUE IgG", "Negative")], interpretation: "Positive may indicate previous exposure or a later immune response.", note: SEROLOGY_NOTE },
  { codes: ["ES051"], name: "DENGUE IgG & IgM ANTIBODIES", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("dengue_igg", "DENGUE IgG", "Negative"), qualitative("dengue_igm", "DENGUE IgM", "Negative")], interpretation: "IgM positive may support recent infection; IgG positive may indicate previous exposure or a later immune response. Timing and cross-reactivity matter.", note: SEROLOGY_NOTE },
  { codes: ["ES175", "ELISA-CHIK-IGM"], name: "CHIKUNGUNYA IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("chik_igm", "CHIKUNGUNYA IgM", "Negative")], interpretation: "Positive may support recent infection, depending on illness timing.", note: SEROLOGY_NOTE },
  { codes: ["ES131", "ES132"], name: "RAPID PLASMA REAGIN (RPR)", department: "Serology", sampleType: "Serum", method: "Flocculation", parameters: [qualitative("rpr", "RPR", "Non-Reactive")], interpretation: "Used for screening and monitoring treatment; report titre when reactive. Reactive results may occur in some non-syphilis conditions.", note: SEROLOGY_NOTE },
  { codes: ["ES169"], name: "TPHA", department: "Serology", sampleType: "Serum", method: "Haemagglutination", parameters: [qualitative("tpha", "TPHA", "Non-Reactive")], interpretation: "Reactive supports evidence of present or previous syphilis; can remain positive after treatment.", note: SEROLOGY_NOTE },
  { codes: ["ES071"], name: "HELICOBACTER PYLORI ANTIGEN - STOOL", department: "Clinical Pathology", sampleType: "Stool", method: "Immunoassay", parameters: [qualitative("hpylori_ag", "H. PYLORI STOOL ANTIGEN", "Negative")], interpretation: "A positive result supports current infection." },
  { codes: ["ES073"], name: "HELICOBACTER PYLORI IgG ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("hpylori_igg", "H. PYLORI IgG", "Negative")], interpretation: "Positive suggests exposure but cannot reliably distinguish current from past infection.", note: "Negative according to kit cut-off." },
  { codes: ["ES106", "ES106A"], name: "LEPTOSPIRA IgM ANTIBODY", department: "Serology", sampleType: "Serum", method: "ELISA / Rapid Immunoassay", parameters: [qualitative("lepto_igm", "LEPTOSPIRA IgM", "Negative")], interpretation: "Positive may support recent infection; timing affects sensitivity.", note: SEROLOGY_NOTE },
  { codes: ["ES141", "ES141A", "ELISA-SCRUB-IGM"], name: "SCRUB TYPHUS IgM", department: "Serology", sampleType: "Serum", method: "ELISA / Rapid Immunoassay", parameters: [qualitative("scrub_igm", "SCRUB TYPHUS IgM", "Negative")], interpretation: "Positive may support infection in the correct clinical setting.", note: "Negative according to kit cut-off." },

  // TORCH
  { codes: ["ES151"], name: "TOXOPLASMA IgG", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("toxo_igg", "TOXOPLASMA IgG", "Negative")], interpretation: "Positive indicates previous exposure; does not alone prove recent infection." },
  { codes: ["ES152"], name: "TOXOPLASMA IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("toxo_igm", "TOXOPLASMA IgM", "Negative")], interpretation: "Positive results may require confirmation and avidity testing." },
  { codes: ["ES138"], name: "RUBELLA IgG", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("rubella_igg", "RUBELLA IgG", "Negative (below assay cut-off)")], interpretation: "Positive generally indicates immunity from vaccination or prior infection." },
  { codes: ["ES139"], name: "RUBELLA IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("rubella_igm", "RUBELLA IgM", "Negative")], interpretation: "Positive may suggest recent infection, but false positives occur." },
  { codes: ["ES046"], name: "CMV IgG", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("cmv_igg", "CMV IgG", "Negative")], interpretation: "Positive indicates previous exposure." },
  { codes: ["ES047"], name: "CMV IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("cmv_igm", "CMV IgM", "Negative")], interpretation: "Does not independently confirm primary or active infection." },
  { codes: ["ES088", "ES089", "ES092"], name: "HERPES SIMPLEX VIRUS IgG", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("hsv_igg", "HSV IgG", "Negative")], interpretation: "Positive indicates prior exposure; does not identify the site of infection. Low-positive results may need confirmation." },
  { codes: ["ES090", "ES091", "ES093"], name: "HERPES SIMPLEX VIRUS IgM", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("hsv_igm", "HSV IgM", "Negative")], interpretation: "Poor specificity for distinguishing recent infection; generally not recommended for routine diagnosis." },

  // Autoimmune and allergy
  { codes: ["ES022", "ES021"], name: "ANTI NUCLEAR ANTIBODY (ANA)", department: "Serology", sampleType: "Serum", method: "IFA (HEp-2) / Immunoassay", parameters: [qualitative("ana", "ANA", "Negative")], interpretation: "Positive may support lupus or another autoimmune disease; positive results can also occur in healthy people. Report titre and pattern when applicable.", note: AUTOIMMUNE_NOTE },
  { codes: ["ES142"], name: "ANTI-Sm ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_sm", "ANTI-Sm", "Negative")], interpretation: "Positive is relatively specific for SLE.", note: AUTOIMMUNE_NOTE },
  { codes: ["ES143", "ES156"], name: "ANTI-RNP ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_rnp", "ANTI-RNP", "Negative")], interpretation: "May occur in mixed connective tissue disease and SLE.", note: AUTOIMMUNE_NOTE },
  { codes: ["ES140"], name: "ANTI-Scl-70 ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_scl70", "ANTI-Scl-70", "Negative")], interpretation: "Associated with systemic sclerosis.", note: AUTOIMMUNE_NOTE },
  { codes: ["ES039"], name: "ANTI-CENTROMERE ANTIBODY", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [qualitative("anti_centromere", "ANTI-CENTROMERE", "Negative")], interpretation: "Associated with limited cutaneous systemic sclerosis.", note: AUTOIMMUNE_NOTE },
  { codes: ["ES015", "ES016", "ES017", "ES018"], name: "ANTI NEUTROPHIL CYTOPLASMIC ANTIBODY (ANCA)", department: "Serology", sampleType: "Serum", method: "IFA / PR3-MPO Immunoassay", parameters: [qualitative("anca", "ANCA", "Negative")], interpretation: "Positive may support evaluation for certain vasculitides; requires antigen-specific confirmation.", note: AUTOIMMUNE_NOTE },
  { codes: ["BC220"], name: "C3 COMPLEMENT", department: "Biochemistry", sampleType: "Serum", method: "Immunoturbidimetry", parameters: [param("c3", "C3 COMPLEMENT", "mg/dL", "90 - 180", 90, 180)], interpretation: "Increased with some inflammatory states; decreased in immune-complex disease or complement consumption." },
  { codes: ["BC221"], name: "C4 COMPLEMENT", department: "Biochemistry", sampleType: "Serum", method: "Immunoturbidimetry", parameters: [param("c4", "C4 COMPLEMENT", "mg/dL", "10 - 40", 10, 40)], interpretation: "Low levels may occur in lupus or complement-related disorders." },
  { codes: ["BC184", "BC184B"], name: "TOTAL IgE", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("total_ige", "TOTAL IgE", "IU/mL", "Up to 100 - 150 (lab-specific)")], interpretation: "Elevated in some allergic conditions, parasitic infections and other disorders; not diagnostic alone." },
  { codes: ["HM004", "HM004A"], name: "ABSOLUTE EOSINOPHIL COUNT (AEC)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("aec", "ABSOLUTE EOSINOPHIL COUNT", "cells/µL", "0 - 500", 0, 500)], interpretation: "High: eosinophilia; consider allergy, parasites, medicines and other causes." },

  // Reproductive and other hormones
  { codes: ["BC252", "BC160", "ELISA-PROLACTIN"], name: "PROLACTIN (PRL)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [sexParam("prolactin", "PROLACTIN", "ng/mL", { text: "4 - 15", min: 4, max: 15 }, { text: "5 - 25 (Non-pregnant)", min: 5, max: 25 })], interpretation: "High levels may be associated with medicines, hypothyroidism or pituitary conditions.", note: HORMONE_NOTE },
  { codes: ["BC233", "ELISA-FSH"], name: "FSH (FOLLICLE STIMULATING HORMONE)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [sexParam("fsh", "FSH", "mIU/mL", { text: "1.5 - 12.4", min: 1.5, max: 12.4 }, { text: "Follicular phase: 3 - 10" })], interpretation: "Female: high levels may occur in menopause or reduced ovarian reserve.\nMale: may be elevated in impaired sperm production.", note: HORMONE_NOTE },
  { codes: ["BC134", "ELISA-LH"], name: "LH (LUTEINIZING HORMONE)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [sexParam("lh", "LH", "mIU/mL", { text: "1.7 - 8.6", min: 1.7, max: 8.6 }, { text: "Follicular phase: 2 - 12" })], interpretation: "Interpretation depends on cycle phase and clinical context; helps assess pituitary-gonadal function.", note: HORMONE_NOTE },
  { codes: ["BC232", "ELISA-E2"], name: "ESTRADIOL (E2)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [sexParam("estradiol", "ESTRADIOL (E2)", "pg/mL", { text: "10 - 40", min: 10, max: 40 }, { text: "Follicular phase: 20 - 150" })], interpretation: "Varies considerably throughout the menstrual cycle. Elevated levels in males may affect reproductive function.", note: HORMONE_NOTE },
  { codes: ["BC159", "ELISA-PROGESTERONE"], name: "PROGESTERONE", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("progesterone", "PROGESTERONE", "ng/mL", "Follicular phase: < 1\nLuteal phase: 5 - 20")], interpretation: "Timing is essential when assessing ovulation.", note: HORMONE_NOTE },
  { codes: ["BC265", "ELISA-AMH"], name: "ANTI MULLERIAN HORMONE (AMH)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("amh", "AMH", "ng/mL", "")], interpretation: "Used as one component of ovarian reserve assessment; not a direct fertility prediction. Age- and assay-dependent.", note: HORMONE_NOTE },
  { codes: ["BC047", "ELISA-BHCG"], name: "BETA HCG", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("beta_hcg", "BETA hCG", "mIU/mL", "Non-pregnant: < 5")], interpretation: "Elevated results can occur in pregnancy and certain other conditions." },
  { codes: ["BC179", "ELISA-TESTOSTERONE"], name: "TESTOSTERONE TOTAL", department: "Immunology", sampleType: "Serum (morning sample)", method: "CLIA / ELISA", parameters: [sexParam("testosterone", "TOTAL TESTOSTERONE", "ng/dL", { text: "300 - 1000", min: 300, max: 1000 }, { text: "" })], interpretation: "Low levels in males may indicate hypogonadism; symptoms and repeat morning testing matter.", note: HORMONE_NOTE },
  { codes: ["ES146"], name: "TESTOSTERONE FREE", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("free_testosterone", "FREE TESTOSTERONE", "pg/mL", "")], interpretation: "Method-specific interpretation is essential.", note: HORMONE_NOTE },
  { codes: ["BC176"], name: "SHBG (SEX HORMONE BINDING GLOBULIN)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("shbg", "SHBG", "nmol/L", "10 - 57", 10, 57)], interpretation: "Affects calculated/free testosterone interpretation.", note: HORMONE_NOTE },
  { codes: ["BC082", "ELISA-CORTISOL"], name: "CORTISOL (MORNING SAMPLE)", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("cortisol_am", "CORTISOL (8 AM)", "µg/dL", "5 - 25", 5, 25)], interpretation: "High may occur with stress or cortisol excess; low may indicate adrenal insufficiency.", note: "Method-dependent interval; record collection time." },
  { codes: ["BC003"], name: "ACTH (ADRENOCORTICOTROPIC HORMONE)", department: "Serology", sampleType: "EDTA Plasma", method: "Immunoassay", parameters: [param("acth", "ACTH", "pg/mL", "7 - 63", 7, 63)], interpretation: "Interpret with simultaneous cortisol to evaluate pituitary/adrenal function." },
  { codes: ["BC148", "BC149"], name: "PARATHYROID HORMONE (PTH) - INTACT", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("pth", "INTACT PTH", "pg/mL", "15 - 65", 15, 65)], interpretation: "Interpret alongside calcium, phosphate, vitamin D and kidney function." },
  { codes: ["BC121", "ELISA-INSULIN"], name: "INSULIN - FASTING", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("insulin_fasting", "INSULIN (FASTING)", "µIU/mL", "2 - 25", 2, 25)], interpretation: "Interpret with fasting glucose and clinical context.", note: "Method-dependent interval." },
  { codes: ["BC112"], name: "GROWTH HORMONE (GH)", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("gh", "GROWTH HORMONE", "ng/mL", "")], interpretation: "Random values are difficult to interpret because secretion is pulsatile; abnormal results usually require stimulation or suppression testing." },
  { codes: ["ES100"], name: "IGF-1 (SOMATOMEDIN C)", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("igf1", "IGF-1", "ng/mL", "")], interpretation: "Useful for evaluation of GH excess or deficiency. Age- and sex-specific range." },
  { codes: ["BC231"], name: "DHEA-S", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("dheas", "DHEA-S", "µg/dL", "")], interpretation: "Increased levels may occur in adrenal androgen excess. Age- and sex-specific range." },
  { codes: ["BC210"], name: "ALDOSTERONE - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Immunoassay", parameters: [param("aldosterone", "ALDOSTERONE", "ng/dL", "")], interpretation: "Interpret with renin and the aldosterone-renin ratio. Position-, sodium- and medication-dependent." },
  { codes: ["ES128"], name: "PLASMA RENIN ACTIVITY", department: "Biochemistry", sampleType: "EDTA Plasma", method: "Immunoassay / Activity assay", parameters: [param("renin", "PLASMA RENIN", "", "")], interpretation: "Interpret with aldosterone and clinical context. Position-, sodium- and medication-dependent." },
  { codes: ["BC064"], name: "CALCITONIN", department: "Serology", sampleType: "Serum", method: "Immunoassay", parameters: [param("calcitonin", "CALCITONIN", "pg/mL", "")], interpretation: "May be used in evaluation of selected thyroid disorders. Method- and sex-specific range." },

  // Tumor markers
  { codes: ["BC166", "ELISA-PSA"], name: "PSA (PROSTATE SPECIFIC ANTIGEN) - TOTAL", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("psa_total", "PSA TOTAL", "ng/mL", "< 4.0", undefined, 4.0)], interpretation: "Used for prostate assessment and monitoring; age and clinical context matter.", note: TUMOR_NOTE },
  { codes: ["BC165"], name: "PSA (PROSTATE SPECIFIC ANTIGEN) - FREE", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("psa_free", "FREE PSA", "ng/mL", "")], interpretation: "May help refine risk assessment in selected patients.", note: TUMOR_NOTE },
  { codes: ["BC224", "ELISA-CEA"], name: "CEA (CARCINO EMBRYONIC ANTIGEN)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("cea", "CEA", "ng/mL", "Non-smokers: < 3.0\nSmokers: < 5.0")], interpretation: "Used for monitoring selected cancers, particularly colorectal cancer.", note: TUMOR_NOTE },
  { codes: ["BC061", "ELISA-CA125"], name: "CA-125", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("ca125", "CA-125", "U/mL", "< 35", undefined, 35)], interpretation: "Used for monitoring selected ovarian cancer cases; can rise in benign conditions.", note: TUMOR_NOTE },
  { codes: ["BC063", "ELISA-CA199"], name: "CA 19-9", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("ca199", "CA 19-9", "U/mL", "< 37", undefined, 37)], interpretation: "Used for monitoring selected pancreatic/biliary cancers; not a standalone screening test.", note: TUMOR_NOTE },
  { codes: ["BC062", "ELISA-CA153"], name: "CA 15-3", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("ca153", "CA 15-3", "U/mL", "< 30", undefined, 30)], interpretation: "Used for monitoring selected breast cancer cases.", note: TUMOR_NOTE },
  { codes: ["BC025", "ELISA-AFP"], name: "ALPHA FETO PROTEIN (AFP)", department: "Immunology", sampleType: "Serum", method: "CLIA / ELISA", parameters: [param("afp", "AFP", "ng/mL", "< 10", undefined, 10)], interpretation: "Used for monitoring selected liver and germ-cell tumors; also elevated in pregnancy.", note: TUMOR_NOTE },

  // Hematology singles
  { codes: ["HM084"], name: "HAEMOGLOBIN (Hb)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [sexParam("hb", "HAEMOGLOBIN (Hb)", "g/dL", { text: "13.0 - 17.0", min: 13.0, max: 17.0 }, { text: "12.0 - 15.0", min: 12.0, max: 15.0 })], interpretation: "High: dehydration, erythrocytosis.\nLow: anemia, blood loss." },
  { codes: ["HM074"], name: "TOTAL LEUCOCYTE COUNT (TLC)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("tlc", "TOTAL LEUCOCYTE COUNT (TLC)", "cells/µL", "4000 - 11000", 4000, 11000)], interpretation: "High: infection, inflammation, steroids.\nLow: viral illness, marrow suppression." },
  { codes: ["HM097"], name: "DIFFERENTIAL LEUCOCYTE COUNT (DLC)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("neutrophils", "NEUTROPHILS", "%", "40 - 75", 40, 75), param("lymphocytes", "LYMPHOCYTES", "%", "20 - 40", 20, 40), param("monocytes", "MONOCYTES", "%", "2 - 10", 2, 10), param("eosinophils", "EOSINOPHILS", "%", "1 - 6", 1, 6), param("basophils", "BASOPHILS", "%", "0 - 1", 0, 1)], interpretation: "Neutrophils high: bacterial infection, stress, steroids; low: viral illness, medicines, marrow disorders.\nLymphocytes high: some viral infections; low: steroids, immunodeficiency.\nEosinophils high: allergy, asthma, parasitic disease." },
  { codes: ["HM073"], name: "TLC & DLC", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("tlc", "TOTAL LEUCOCYTE COUNT (TLC)", "cells/µL", "4000 - 11000", 4000, 11000), param("neutrophils", "NEUTROPHILS", "%", "40 - 75", 40, 75), param("lymphocytes", "LYMPHOCYTES", "%", "20 - 40", 20, 40), param("monocytes", "MONOCYTES", "%", "2 - 10", 2, 10), param("eosinophils", "EOSINOPHILS", "%", "1 - 6", 1, 6), param("basophils", "BASOPHILS", "%", "0 - 1", 0, 1)], interpretation: "TLC high: infection, inflammation, steroids; low: viral illness, marrow suppression.\nNeutrophils high: bacterial infection, stress, steroids. Lymphocytes high: some viral infections. Eosinophils high: allergy, asthma, parasitic disease." },
  { codes: ["HM072"], name: "PLATELET COUNT", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("plt", "PLATELET COUNT", "cells/µL", "150000 - 450000", 150000, 450000)], interpretation: "High: reactive thrombocytosis, inflammation.\nLow: thrombocytopenia, medicines, marrow/liver disorders.", note: "Review platelet clumping on smear when the count is unexpectedly low." },
  { codes: ["HM070"], name: "MEAN PLATELET VOLUME (MPV)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Automated Hematology Analyzer", parameters: [param("mpv", "MPV", "fL", "7.5 - 12.0", 7.5, 12.0)], interpretation: "High: larger platelets.\nLow: smaller platelets; context-dependent." },
  { codes: ["HM192"], name: "ERYTHROCYTE SEDIMENTATION RATE (ESR)", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Westergren", parameters: [sexParam("esr", "ESR", "mm/hr", { text: "0 - 15", min: 0, max: 15 }, { text: "0 - 20", min: 0, max: 20 })], interpretation: "Nonspecific inflammation marker." },
  { codes: ["HM051"], name: "RETICULOCYTE COUNT", department: "Hematology", sampleType: "EDTA Whole Blood", method: "Supravital Stain / Analyzer", parameters: [param("retic", "RETICULOCYTE COUNT", "%", "0.5 - 2.5", 0.5, 2.5)], interpretation: "Helps assess bone marrow red cell production." },

  // Liver singles
  { codes: ["BC217"], name: "BILIRUBIN - TOTAL", department: "Biochemistry", sampleType: "Serum", method: "Diazo", parameters: [param("bil_total", "TOTAL BILIRUBIN", "mg/dL", "0.2 - 1.2", 0.2, 1.2)], interpretation: "High: jaundice, hemolysis, hepatobiliary disease." },
  { codes: ["BC215"], name: "BILIRUBIN - DIRECT", department: "Biochemistry", sampleType: "Serum", method: "Diazo", parameters: [param("bil_direct", "DIRECT BILIRUBIN", "mg/dL", "0.0 - 0.3", 0, 0.3)], interpretation: "High: cholestasis, hepatobiliary disease." },
  { codes: ["BC216"], name: "BILIRUBIN - TOTAL, DIRECT & INDIRECT", department: "Biochemistry", sampleType: "Serum", method: "Diazo", parameters: [param("bil_total", "TOTAL BILIRUBIN", "mg/dL", "0.2 - 1.2", 0.2, 1.2), param("bil_direct", "DIRECT BILIRUBIN", "mg/dL", "0.0 - 0.3", 0, 0.3), param("bil_indirect", "INDIRECT BILIRUBIN (Total - Direct)", "mg/dL", "")], interpretation: "Total high: jaundice, hemolysis, hepatobiliary disease.\nDirect high: cholestasis, hepatobiliary disease.\nIndirect high: hemolysis or impaired bilirubin conjugation." },
  { codes: ["BC174"], name: "SGOT / AST", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (IFCC)", parameters: [param("sgot", "SGOT / AST", "U/L", "10 - 40", 10, 40)], interpretation: "High: liver or muscle injury.", note: "AST/ALT indicate enzyme release and possible injury; they do not measure the liver's complete functional capacity." },
  { codes: ["BC175"], name: "SGPT / ALT", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (IFCC)", parameters: [param("sgpt", "SGPT / ALT", "U/L", "7 - 56", 7, 56)], interpretation: "High: hepatocellular injury.", note: "AST/ALT indicate enzyme release and possible injury; they do not measure the liver's complete functional capacity." },
  { codes: ["BC015"], name: "ALKALINE PHOSPHATASE (ALP)", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (IFCC)", parameters: [param("alp", "ALKALINE PHOSPHATASE (ALP)", "U/L", "40 - 130", 40, 130)], interpretation: "High: cholestasis or bone-related conditions.\nLow: may occur with certain nutritional deficiencies." },
  { codes: ["BC107"], name: "GAMMA GLUTAMYL TRANSFERASE (GGT)", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic (IFCC)", parameters: [sexParam("ggt", "GGT", "U/L", { text: "8 - 61", min: 8, max: 61 }, { text: "5 - 36", min: 5, max: 36 })], interpretation: "High: cholestasis, alcohol exposure, medicines." },
  { codes: ["BC163"], name: "PROTEIN TOTAL", department: "Biochemistry", sampleType: "Serum", method: "Biuret", parameters: [param("total_protein", "TOTAL PROTEIN", "g/dL", "6.0 - 8.3", 6.0, 8.3)], interpretation: "High: dehydration, increased immunoglobulins.\nLow: reduced production, protein loss or malnutrition." },
  { codes: ["BC010"], name: "ALBUMIN", department: "Biochemistry", sampleType: "Serum", method: "Bromocresol Green", parameters: [param("albumin", "ALBUMIN", "g/dL", "3.5 - 5.0", 3.5, 5.0)], interpretation: "High: dehydration.\nLow: liver disease, renal protein loss, inflammation." },
  { codes: ["BC108"], name: "GLOBULIN", department: "Biochemistry", sampleType: "Serum", method: "Calculated", parameters: [param("globulin", "GLOBULIN", "g/dL", "2.0 - 3.5", 2.0, 3.5)], interpretation: "High: inflammation or increased immunoglobulins.\nLow: some immune or protein-loss disorders." },
  { codes: ["BC011"], name: "ALBUMIN : GLOBULIN (A/G) RATIO", department: "Biochemistry", sampleType: "Serum", method: "Calculated", parameters: [param("ag_ratio", "A/G RATIO", "Ratio", "1.0 - 2.2", 1.0, 2.2)], interpretation: "May increase with low globulin; may decrease with low albumin or high globulin." },
  { codes: ["BC164", "BC278"], name: "PROTEIN TOTAL WITH ALBUMIN & GLOBULIN", department: "Biochemistry", sampleType: "Serum", method: "Biuret / Bromocresol Green", parameters: [param("total_protein", "TOTAL PROTEIN", "g/dL", "6.0 - 8.3", 6.0, 8.3), param("albumin", "ALBUMIN", "g/dL", "3.5 - 5.0", 3.5, 5.0), param("globulin", "GLOBULIN", "g/dL", "2.0 - 3.5", 2.0, 3.5), param("ag_ratio", "A/G RATIO", "Ratio", "1.0 - 2.2", 1.0, 2.2)], interpretation: "Low albumin: liver disease, renal protein loss, inflammation.\nHigh globulin: inflammation or increased immunoglobulins." },

  // Kidney and electrolytes singles
  { codes: ["BC192"], name: "UREA - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Urease-GLDH", parameters: [param("urea", "BLOOD UREA", "mg/dL", "15 - 40", 15, 40)], interpretation: "High: renal dysfunction, dehydration, increased protein breakdown.\nLow: low protein intake or impaired urea production." },
  { codes: ["BC058"], name: "BLOOD UREA NITROGEN (BUN)", department: "Biochemistry", sampleType: "Serum", method: "Calculated / Urease", parameters: [param("bun", "BLOOD UREA NITROGEN (BUN)", "mg/dL", "7 - 20", 7, 20)], interpretation: "High: renal dysfunction, dehydration.\nLow: low protein intake or reduced urea production." },
  { codes: ["BC088"], name: "CREATININE - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Jaffe / Enzymatic", parameters: [sexParam("creatinine", "CREATININE", "mg/dL", { text: "0.7 - 1.3", min: 0.7, max: 1.3 }, { text: "0.6 - 1.1", min: 0.6, max: 1.1 })], interpretation: "High: reduced kidney filtration; other causes possible.\nLow: low muscle mass." },
  { codes: ["BC194"], name: "URIC ACID - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Uricase", parameters: [sexParam("uric_acid", "URIC ACID", "mg/dL", { text: "3.5 - 7.2", min: 3.5, max: 7.2 }, { text: "2.6 - 6.0", min: 2.6, max: 6.0 })], interpretation: "High: gout risk, renal impairment, medicines." },
  { codes: ["BC258"], name: "SODIUM - SERUM", department: "Biochemistry", sampleType: "Serum", method: "ISE", parameters: [param("sodium", "SODIUM (Na+)", "mmol/L", "135 - 145", 135, 145)], interpretation: "High: water deficit or sodium-related disorders.\nLow: excess water relative to sodium, fluid loss." },
  { codes: ["BC157"], name: "POTASSIUM - SERUM", department: "Biochemistry", sampleType: "Serum", method: "ISE", parameters: [param("potassium", "POTASSIUM (K+)", "mmol/L", "3.5 - 5.1", 3.5, 5.1)], interpretation: "High: kidney dysfunction, medicines, hemolysis.\nLow: gastrointestinal loss, diuretics." },
  { codes: ["BC228"], name: "CHLORIDE - SERUM", department: "Biochemistry", sampleType: "Serum", method: "ISE", parameters: [param("chloride", "CHLORIDE (Cl-)", "mmol/L", "98 - 107", 98, 107)], interpretation: "High: fluid or acid-base disturbances.\nLow: vomiting or other fluid losses." },
  { codes: ["BC069"], name: "CALCIUM - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Arsenazo / OCPC", parameters: [param("calcium", "CALCIUM (TOTAL)", "mg/dL", "8.5 - 10.5", 8.5, 10.5)], interpretation: "High: parathyroid or other disorders.\nLow: vitamin D deficiency or other disorders." },
  { codes: ["BC154"], name: "PHOSPHORUS - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Phosphomolybdate", parameters: [param("phosphorus", "PHOSPHORUS", "mg/dL", "2.5 - 4.5", 2.5, 4.5)], interpretation: "High: renal impairment, cell breakdown.\nLow: malnutrition or other metabolic causes." },
  { codes: ["BC092"], name: "CYSTATIN C", department: "Biochemistry", sampleType: "Serum", method: "Immunoassay", parameters: [param("cystatin_c", "CYSTATIN C", "mg/L", "0.6 - 1.0", 0.6, 1.0)], interpretation: "Increased concentration may indicate reduced kidney filtration.", note: "Method-dependent interval." },
  { codes: ["BC094"], name: "eGFR (ESTIMATED GLOMERULAR FILTRATION RATE)", department: "Biochemistry", sampleType: "Serum", method: "Calculated (creatinine, age, sex)", parameters: [param("egfr", "eGFR", "mL/min/1.73 m²", ">= 90")], interpretation: "Persistent eGFR below 60 for at least 3 months can indicate CKD. >= 90 is generally normal in the absence of kidney-damage markers." },
  { codes: ["BC246"], name: "MICROALBUMIN / CREATININE RATIO (ACR)", department: "Biochemistry", sampleType: "Spot Urine (first morning)", method: "Immunoturbidimetry", parameters: [param("acr", "ALBUMIN / CREATININE RATIO (ACR)", "mg/g creatinine", "< 30", undefined, 30)], interpretation: "< 30: normal to mildly increased (A1).\n30 - 300: moderately increased albuminuria (A2).\n> 300: severely increased albuminuria (A3).", note: "Persistent albuminuria should be confirmed. Exercise, fever, urinary infection, menstruation and acute illness can affect results." },
  { codes: ["BC271"], name: "PROTEIN - 24 HRS URINE", department: "Biochemistry", sampleType: "24-hour Urine", method: "Quantitative assay", parameters: [param("urine_protein_24h", "URINE PROTEIN (24 HOUR)", "mg/day", "< 150", undefined, 150)], interpretation: "Increased protein loss may indicate kidney disease." },
  { codes: ["BC162"], name: "PROTEIN CREATININE RATIO - URINE", department: "Biochemistry", sampleType: "Spot Urine", method: "Quantitative assay", parameters: [param("upcr", "PROTEIN / CREATININE RATIO", "mg/g creatinine", "< 150 - 200")], interpretation: "Elevated values may indicate increased urinary protein loss." },
  { codes: ["BC250"], name: "OSMOLALITY - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Osmometry", parameters: [param("serum_osm", "SERUM OSMOLALITY", "mOsm/kg", "275 - 295", 275, 295)], interpretation: "Increased in dehydration or excess effective solutes; decreased in hypotonic states." },

  // Pancreatic, digestive and other chemistry
  { codes: ["BC035"], name: "AMYLASE-SERUM", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic", parameters: [param("amylase_serum", "AMYLASE-SERUM", "U/L", "0.0 - 90", 0, 90)], interpretation: "Increased in pancreatitis and several non-pancreatic conditions." },
  { codes: ["BC136"], name: "LIPASE", department: "Biochemistry", sampleType: "Serum", method: "Enzymatic", parameters: [param("lipase", "LIPASE", "U/L", "13 - 60", 13, 60)], interpretation: "Increased in acute pancreatitis and some renal or abdominal disorders.", note: "Assay-dependent interval." },
  { codes: ["ES064", "ES064B"], name: "FECAL CALPROTECTIN", department: "Clinical Pathology", sampleType: "Stool", method: "Immunoassay", parameters: [param("calprotectin", "FECAL CALPROTECTIN", "µg/g", "< 50", undefined, 50)], interpretation: "Increased levels can indicate intestinal inflammation; infection and medicines may also elevate it." },
  { codes: ["ES064A"], name: "FECAL ELASTASE", department: "Clinical Pathology", sampleType: "Stool", method: "Immunoassay", parameters: [param("elastase", "FECAL ELASTASE-1", "µg/g", "> 200", 200)], interpretation: "100 - 200 may suggest reduced pancreatic function; below 100 supports severe insufficiency." },
  { codes: ["HM055"], name: "STOOL OCCULT BLOOD", department: "Clinical Pathology", sampleType: "Stool", method: "Guaiac / Immunochemical", parameters: [qualitative("stool_occult", "OCCULT BLOOD", "Negative")], interpretation: "A positive result needs clinical follow-up.", note: "A positive result does not diagnose cancer by itself, and a negative result does not exclude all gastrointestinal disease." },
  { codes: ["BC032"], name: "AMMONIA", department: "Biochemistry", sampleType: "EDTA Plasma (processed promptly)", method: "Enzymatic", parameters: [param("ammonia", "AMMONIA", "µmol/L", "15 - 45", 15, 45)], interpretation: "Increased values may occur in liver failure and other metabolic conditions.", note: "Laboratory-dependent interval." },
  { codes: ["BC225"], name: "CERULOPLASMIN", department: "Biochemistry", sampleType: "Serum", method: "Immunoassay", parameters: [param("ceruloplasmin", "CERULOPLASMIN", "mg/dL", "20 - 40", 20, 40)], interpretation: "Low levels may occur in Wilson disease but are not diagnostic alone." },
  { codes: ["BC079"], name: "COPPER - SERUM", department: "Biochemistry", sampleType: "Serum", method: "Elemental analysis", parameters: [param("copper", "SERUM COPPER", "µg/dL", "70 - 140", 70, 140)], interpretation: "Interpret with ceruloplasmin, clinical history and other copper studies." },
  { codes: ["BC051"], name: "BILE ACIDS - TOTAL", department: "Biochemistry", sampleType: "Serum (fasting)", method: "Enzymatic", parameters: [param("bile_acids", "TOTAL BILE ACIDS", "µmol/L", "< 10 (Fasting)", undefined, 10)], interpretation: "Increased levels can occur in cholestasis and selected pregnancy-related liver conditions." },
  { codes: ["BC129"], name: "LACTATE - PLASMA", department: "Biochemistry", sampleType: "Plasma", method: "Enzymatic", parameters: [param("lactate", "LACTATE", "mmol/L", "0.5 - 2.0", 0.5, 2.0)], interpretation: "High: tissue hypoperfusion or other causes." },

  // Therapeutic drug monitoring
  { codes: ["BC137"], name: "LITHIUM", department: "Biochemistry", sampleType: "Serum", method: "ISE", parameters: [param("lithium", "LITHIUM", "mmol/L", "0.6 - 1.0 (Therapeutic)", 0.6, 1.0)], interpretation: "Common maintenance target; indication-dependent.", note: TDM_NOTE },
  { codes: ["BC199"], name: "VALPROIC ACID", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("valproate", "VALPROIC ACID", "µg/mL", "50 - 100 (Therapeutic)", 50, 100)], interpretation: "Common total concentration range; indication-dependent.", note: TDM_NOTE },
  { codes: ["BC151"], name: "PHENYTOIN", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("phenytoin", "PHENYTOIN", "µg/mL", "10 - 20 (Therapeutic)", 10, 20)], interpretation: "Total concentration therapeutic range.", note: TDM_NOTE },
  { codes: ["BC070"], name: "CARBAMAZEPINE", department: "Immunology", sampleType: "Serum", method: "Immunoassay", parameters: [param("carbamazepine", "CARBAMAZEPINE", "µg/mL", "4 - 12 (Therapeutic)", 4, 12)], interpretation: "Therapeutic range.", note: TDM_NOTE },
  { codes: ["BC093"], name: "DIGOXIN", department: "Biochemistry", sampleType: "Serum", method: "Immunoassay", parameters: [param("digoxin", "DIGOXIN", "ng/mL", "0.5 - 0.9 (Therapeutic)", 0.5, 0.9)], interpretation: "Commonly used range for selected heart-failure indications; indication-dependent.", note: TDM_NOTE },
];

/**
 * Masters that keyword matching used to send to an unrelated multi-parameter template (fluids, ratios, IHC,
 * molecular tests, OGTT time points without a lab range). They get the plain single-result form instead.
 */
export const GENERIC_TEMPLATE_CODES: ReadonlySet<string> = new Set([
  "BC055", "BC057", "BC363", "BC365", "BC359", "BC360", "BC361", "BC111", "BC111A", "BC109", "BC109A", "BC198A", "BC219",
  "BC059", "BC088A", "BC088B", "BC193", "BC350", "HP003", "BC217A", "ES005", "ES025", "ES107", "BC186A",
  "ES125", "ES126", "ES127", "P004", "BC181A", "BC273", "BC273A", "HP042", "MC001", "MC058", "P154", "P155", "P098",
  "BC262", "BC262A", "BC301", "ES002A", "P012", "P013",
]);

const GUIDE_BY_CODE = new Map<string, GuideTest>();
for (const test of GUIDE_TESTS) {
  for (const code of test.codes) GUIDE_BY_CODE.set(code.toUpperCase(), test);
}

/** Finds a guide (or generic-only) Test Master code among the whitespace-separated tokens of a lookup key. */
function findMasterCode(lookupKey: string, has: (code: string) => boolean): string | undefined {
  return lookupKey
    .toUpperCase()
    .split(/\s+/)
    .find((token) => has(token));
}

export function isGenericTemplateTest(lookupKey: string): boolean {
  return Boolean(findMasterCode(lookupKey, (c) => GENERIC_TEMPLATE_CODES.has(c)));
}

export function resolveGuideTest(lookupKey: string): TestDefinition | undefined {
  const code = findMasterCode(lookupKey, (c) => GUIDE_BY_CODE.has(c));
  const test = code ? GUIDE_BY_CODE.get(code) : undefined;
  if (!code || !test) return undefined;
  return {
    code,
    name: test.name,
    department: test.department,
    sampleType: test.sampleType,
    standardPrice: 0,
    parameters: test.parameters.map((p) => ({
      ...p,
      referenceRange: p.sexRanges ? `Male: ${p.sexRanges.male.text}\nFemale: ${p.sexRanges.female.text}`.replace(/\n?Female: $/, "") : p.referenceRange ?? "",
      method: p.method ?? test.method,
      defaultValue: "",
    })),
    interpretations: [{ heading: "Interpretation", content: test.interpretation }],
    remarks: test.note ? [test.note] : undefined,
    prefillClinicalNotes: true,
  };
}

/** Narrows sex-specific guide ranges to the patient's sex so the printed interval and High/Low flag match. */
export function applyPatientSexRanges(schema: TestDefinition, sex?: string | null): TestDefinition {
  const s = String(sex || "").trim().toLowerCase();
  const key = s.startsWith("f") ? "female" : s.startsWith("m") ? "male" : null;
  if (!key) return schema;
  let changed = false;
  const parameters = schema.parameters.map((p) => {
    const ranges = (p as GuideParameter).sexRanges;
    if (!ranges) return p;
    changed = true;
    const r = ranges[key];
    return { ...p, referenceRange: r.text, min: r.min ?? null, max: r.max ?? null };
  });
  return changed ? { ...schema, parameters } : schema;
}
