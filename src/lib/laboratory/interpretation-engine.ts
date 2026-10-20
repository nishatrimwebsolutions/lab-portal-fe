// Pure interpretation engine. An identical copy lives in lab-portal-backend/src/services/interpretation-engine.ts
// (authoritative evaluation when a report is saved) — keep both files in sync.

export const INTERPRETATION_FLAGS = [
  "Normal",
  "Low",
  "High",
  "Critical Low",
  "Critical High",
  "Borderline",
  "Positive",
  "Negative",
  "Reactive",
  "Non-Reactive",
  "Abnormal",
] as const;

export type InterpretationFlag = (typeof INTERPRETATION_FLAGS)[number];

const NON_ABNORMAL_FLAGS: readonly string[] = ["Normal", "Negative", "Non-Reactive"];

/** Numeric category, matched when `above < value <= upTo` (either bound optional). */
export interface InterpretationBand {
  above?: number | null;
  upTo?: number | null;
  flag: InterpretationFlag;
  label?: string;
  text?: string;
}

/** Qualitative outcome, matched when the entered result equals one of `values` (case/spacing ignored). */
export interface InterpretationOutcome {
  values: string[];
  flag: InterpretationFlag;
  label?: string;
  text?: string;
}

export interface InterpretationRuleLike {
  id: string;
  parameterKey: string;
  parameterName: string;
  aliases?: string[] | null;
  franchiseId?: string | null;
  gender?: string | null;
  ageMinYears?: number | null;
  ageMaxYears?: number | null;
  unit?: string | null;
  resultType: string;
  normalMin?: number | null;
  normalMax?: number | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
  lowText?: string | null;
  normalText?: string | null;
  highText?: string | null;
  criticalText?: string | null;
  bands?: unknown;
  outcomes?: unknown;
  referenceRangeText?: string | null;
}

export interface InterpretationResult {
  ruleId: string;
  flag: InterpretationFlag;
  label: string;
  interpretation: string;
  isAbnormal: boolean;
  isCritical: boolean;
  referenceRangeText?: string | null;
}

export interface InterpretationContext {
  parameterId?: string;
  parameterName: string;
  unit?: string;
  sex?: string | null;
  ageYears?: number | null;
  franchiseId?: string | null;
}

export const normalizeKey = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/µ/g, "u")
    .replace(/[^a-z0-9+<>]+/g, "");

const normalizeSex = (sex: unknown): "male" | "female" | "" => {
  const s = String(sex ?? "").trim().toLowerCase();
  if (s.startsWith("f")) return "female";
  if (s.startsWith("m")) return "male";
  return "";
};

const parseDob = (dob: string): Date | null => {
  const clean = dob.trim();
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [y, m, day] = clean.slice(0, 10).split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(clean)) {
    const p = clean.split(/[/-]/).map(Number);
    d = new Date(p[2], p[1] - 1, p[0]);
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** Age in (fractional) years from date of birth, falling back to the stored age in years. */
export function patientAgeYears(patient?: { age?: unknown; dateOfBirth?: string | null } | null, now: Date = new Date()): number | null {
  if (patient?.dateOfBirth) {
    const dob = parseDob(patient.dateOfBirth);
    if (dob && dob.getTime() <= now.getTime()) {
      return (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
  }
  const age = parseFloat(String(patient?.age ?? ""));
  return Number.isFinite(age) && age >= 0 ? age : null;
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

const ruleMatchesParameter = (rule: InterpretationRuleLike, ctx: InterpretationContext): boolean => {
  if (ctx.parameterId && rule.parameterKey === ctx.parameterId) return true;
  const target = normalizeKey(ctx.parameterName);
  if (!target) return false;
  return [rule.parameterName, ...(rule.aliases || [])].some((name) => normalizeKey(name) === target);
};

/** Picks the most specific applicable rule: franchise-specific > gender-specific > age-bounded. */
export function selectInterpretationRule<T extends InterpretationRuleLike>(rules: readonly T[], ctx: InterpretationContext): T | null {
  const sex = normalizeSex(ctx.sex);
  let best: T | null = null;
  let bestScore = -1;
  for (const rule of rules) {
    if (!ruleMatchesParameter(rule, ctx)) continue;
    if (rule.franchiseId && rule.franchiseId !== ctx.franchiseId) continue;
    const ruleSex = normalizeSex(rule.gender);
    if (ruleSex && ruleSex !== sex) continue;
    const hasAgeBound = isNum(rule.ageMinYears) || isNum(rule.ageMaxYears);
    if (hasAgeBound) {
      if (!isNum(ctx.ageYears)) continue;
      if (isNum(rule.ageMinYears) && ctx.ageYears < rule.ageMinYears) continue;
      if (isNum(rule.ageMaxYears) && ctx.ageYears >= rule.ageMaxYears) continue;
    }
    if (rule.unit && ctx.unit && normalizeKey(rule.unit) !== normalizeKey(ctx.unit)) continue;
    const score = (rule.franchiseId ? 4 : 0) + (ruleSex ? 2 : 0) + (hasAgeBound ? 1 : 0);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }
  return best;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const build = (rule: InterpretationRuleLike, flag: InterpretationFlag, label: string | undefined, text: string | null | undefined): InterpretationResult => ({
  ruleId: rule.id,
  flag,
  label: label?.trim() || flag,
  interpretation: (text || "").trim(),
  isAbnormal: !NON_ABNORMAL_FLAGS.includes(flag),
  isCritical: flag.startsWith("Critical"),
  referenceRangeText: rule.referenceRangeText,
});

const matchOutcome = (rule: InterpretationRuleLike, value: string): InterpretationResult | null => {
  const key = normalizeKey(value);
  const outcome = asArray<InterpretationOutcome>(rule.outcomes).find((o) => asArray<string>(o?.values).some((v) => normalizeKey(v) === key));
  return outcome ? build(rule, outcome.flag, outcome.label, outcome.text) : null;
};

/** Evaluates one entered value against a rule. Returns null when the rule cannot classify the value. */
export function evaluateInterpretationRule(rule: InterpretationRuleLike, rawValue: unknown): InterpretationResult | null {
  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  if (rule.resultType === "Qualitative") return matchOutcome(rule, value);

  const numericText = value.replace(/,/g, "").replace(/^[<>]=?\s*/, "");
  if (!/^[-+]?\d*\.?\d+$/.test(numericText)) return matchOutcome(rule, value);
  const v = Number(numericText);

  if (isNum(rule.criticalLow) && v <= rule.criticalLow) return build(rule, "Critical Low", undefined, rule.criticalText || rule.lowText);
  if (isNum(rule.criticalHigh) && v >= rule.criticalHigh) return build(rule, "Critical High", undefined, rule.criticalText || rule.highText);

  const band = asArray<InterpretationBand>(rule.bands).find(
    (b) => b && (!isNum(b.above) || v > b.above) && (!isNum(b.upTo) || v <= b.upTo)
  );
  if (band) return build(rule, band.flag, band.label, band.text);

  if (isNum(rule.normalMin) && v < rule.normalMin) return build(rule, "Low", undefined, rule.lowText);
  if (isNum(rule.normalMax) && v > rule.normalMax) return build(rule, "High", undefined, rule.highText);
  return build(rule, "Normal", undefined, rule.normalText);
}

/** Convenience: select the applicable rule and evaluate the value in one step. */
export function interpretResult<T extends InterpretationRuleLike>(rules: readonly T[], ctx: InterpretationContext, value: unknown): InterpretationResult | null {
  const rule = selectInterpretationRule(rules, ctx);
  return rule ? evaluateInterpretationRule(rule, value) : null;
}
