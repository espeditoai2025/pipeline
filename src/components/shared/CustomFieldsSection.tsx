"use client";

import type { CustomField } from "@/types/custom-fields";

interface Props {
  fields: CustomField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}

const inputCls =
  "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

export function CustomFieldsSection({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--crm-neutral-100)]">
      <p className="text-xs font-semibold text-[var(--crm-neutral-400)] uppercase tracking-wide">
        Campi personalizzati
      </p>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium mb-1">
            {field.name}
            {field.isRequired && <span className="text-[var(--crm-danger)] ml-0.5">*</span>}
          </label>
          <FieldInput field={field} value={values[field.id] ?? ""} onChange={(v) => onChange(field.id, v)} />
        </div>
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (field.fieldType) {
    case "text":
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(value === "true" ? "" : "true")}
            className={`relative h-5 w-9 rounded-full transition-colors ${value === "true" ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value === "true" ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
          <span className="text-sm text-[var(--crm-neutral-600)]">
            {value === "true" ? "Sì" : "No"}
          </span>
        </div>
      );

    case "select":
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Seleziona...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return null;
  }
}
