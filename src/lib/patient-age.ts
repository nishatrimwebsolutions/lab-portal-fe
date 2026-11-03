export function parsePatientDob(dob?: string | null): Date | null {
  if (!dob || typeof dob !== "string" || !dob.trim()) return null;
  const clean = dob.trim();
  let birthDate: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number);
    birthDate = new Date(y, m - 1, d);
  } else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[/-]/).map(Number);
    birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) birthDate = parsed;
  }
  if (!birthDate || Number.isNaN(birthDate.getTime())) return null;
  birthDate.setHours(0, 0, 0, 0);
  return birthDate;
}

/** Whole years from DOB — stored on the patient record for APIs / reference ranges. */
export function calculateAgeFromDob(dob: string): number | "" {
  const birthDate = parsePatientDob(dob);
  if (!birthDate) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : 0;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function formatMonthsLabel(monthsExact: number): string {
  const rounded = Math.round(monthsExact * 10) / 10;
  if (rounded === 1) return "1 month";
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} months`;
}

/**
 * Display age from DOB: days (< 30 days), decimal months up to 12, then years.
 * Example: 1 day, 10 days, 1 month, 1.4 months, 12 months, 2 years.
 */
export function formatPatientAgeLabel(
  dob?: string | null,
  fallbackYears?: number | string | null
): string {
  const birthDate = parsePatientDob(dob);
  if (birthDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate > today) return "N/A";

    const days = Math.floor((today.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 30) return plural(Math.max(days, 1), "day", "days");

    const monthsExact = days / 30;
    if (monthsExact < 12) return formatMonthsLabel(Math.max(monthsExact, 1));

    let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) totalMonths--;
    const years = Math.max(Math.floor(totalMonths / 12), 1);
    const months = Math.max(totalMonths, 12) % 12;
    // Paediatric ages need the month part (e.g. 1 year 6 months); adults keep whole years.
    if (years < 5 && months > 0) return `${plural(years, "year", "years")} ${plural(months, "month", "months")}`;
    return plural(years, "year", "years");
  }

  if (fallbackYears === undefined || fallbackYears === null || fallbackYears === "") return "N/A";
  const years = Number(fallbackYears);
  if (Number.isNaN(years)) return "N/A";
  return plural(Math.max(Math.floor(years), 0), "year", "years");
}
