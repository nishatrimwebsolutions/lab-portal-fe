export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatINR = (value: number): string =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  .meta { color: #444; margin: 2px 0; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
  .summary div { border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; min-width: 130px; }
  .summary span { display: block; font-size: 10px; text-transform: uppercase; color: #555; }
  .summary strong { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-size: 11px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: bold; background: #fafafa; }
  .footer { margin-top: 18px; color: #666; font-size: 10px; }
  @page { size: A4; margin: 12mm; }
`;

/** Prints a standalone HTML report through a hidden iframe so the app shell is not included. */
export function printHtmlReport(title: string, bodyHtml: string): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}<p class="footer">Printed on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p></body></html>`
  );
  doc.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

const csvCell = (value: string | number): string => {
  if (typeof value === "number") return String(value);
  // Prefix formula-like text so Excel does not execute it.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Downloads rows as a UTF-8 CSV file that opens directly in Excel. */
export function downloadCsv(fileName: string, rows: readonly (readonly (string | number)[])[]): void {
  if (typeof window === "undefined") return;
  const content = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
