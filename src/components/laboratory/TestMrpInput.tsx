"use client";
import { Input } from "@/components/ui/index";

type TestMrpInputProps = {
  mrp: number;
  isAdmin: boolean;
  canSaveToCatalog: boolean;
  saveToCatalog: boolean;
  onMrpChange: (mrp: number) => void;
  onSaveToCatalogChange: (checked: boolean) => void;
};

export function TestMrpInput({ mrp, isAdmin, canSaveToCatalog, saveToCatalog, onMrpChange, onSaveToCatalogChange }: TestMrpInputProps) {
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8f4f7] border border-[#176b87]/20 text-[#176b87] font-mono text-xs font-bold min-w-[90px] justify-center">
        ₹{Number(mrp || 0).toFixed(2)}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 text-[#176b87] font-mono text-xs font-bold">
        <span>₹</span>
        <Input
          type="number"
          min={0}
          step="0.01"
          aria-label="Test MRP"
          title="Edit MRP (Admin only)"
          value={Number.isFinite(mrp) ? mrp : 0}
          onChange={(e) => {
            const next = Number(e.target.value);
            onMrpChange(Number.isFinite(next) && next >= 0 ? next : 0);
          }}
          className="h-8 w-[100px] font-mono text-xs font-bold text-[#176b87]"
        />
      </div>
      {canSaveToCatalog && (
        <label className="flex items-center gap-1 text-[10px] text-[color:var(--muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveToCatalog}
            onChange={(e) => onSaveToCatalogChange(e.target.checked)}
            className="rounded border-[color:var(--line)] text-[color:var(--brand-600)]"
          />
          Save to test catalog
        </label>
      )}
    </div>
  );
}
