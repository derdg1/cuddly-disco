import React, { useState } from "react";
import { processApi } from "../api/client";
import type { PDFFile } from "../types";

interface ProcessPanelProps {
  file: PDFFile;
}

export function ProcessPanel({ file }: ProcessPanelProps) {
  const [activeSection, setActiveSection] = useState<string>("marks");

  const sections = [
    { id: "marks", label: "Druckmarken", icon: "✂️" },
    { id: "impose", label: "Ausschießen", icon: "📐" },
    { id: "color", label: "Farbkonvertierung", icon: "🎨" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              activeSection === s.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSection === "marks" && <MarksSection file={file} />}
        {activeSection === "impose" && <ImpositionSection file={file} />}
        {activeSection === "color" && <ColorSection file={file} />}
      </div>
    </div>
  );
}

function MarksSection({ file }: { file: PDFFile }) {
  const [params, setParams] = useState({
    bleed_mm: 3,
    mark_offset_mm: 5,
    mark_length_mm: 5,
    add_crop_marks: true,
    add_registration: true,
    add_color_bar: true,
  });
  const [result, setResult] = useState<{ download_url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await processApi.addMarks({ file_id: file.id, ...params });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Druckmarken hinzufügen</h4>

      <FormField label="Anschnitt (mm)">
        <NumberInput
          value={params.bleed_mm}
          onChange={(v) => setParams({ ...params, bleed_mm: v })}
        />
      </FormField>
      <FormField label="Marken Offset (mm)">
        <NumberInput
          value={params.mark_offset_mm}
          onChange={(v) => setParams({ ...params, mark_offset_mm: v })}
        />
      </FormField>
      <FormField label="Markenlänge (mm)">
        <NumberInput
          value={params.mark_length_mm}
          onChange={(v) => setParams({ ...params, mark_length_mm: v })}
        />
      </FormField>

      <div className="space-y-2">
        <CheckboxField
          label="Schnittmarken"
          checked={params.add_crop_marks}
          onChange={(v) => setParams({ ...params, add_crop_marks: v })}
        />
        <CheckboxField
          label="Passermarken"
          checked={params.add_registration}
          onChange={(v) => setParams({ ...params, add_registration: v })}
        />
        <CheckboxField
          label="Farbbalken"
          checked={params.add_color_bar}
          onChange={(v) => setParams({ ...params, add_color_bar: v })}
        />
      </div>

      <RunButton onClick={run} loading={loading} />

      {result && (
        <a
          href={result.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2 text-sm bg-green-700 hover:bg-green-600 text-white rounded"
        >
          PDF herunterladen ↓
        </a>
      )}
    </div>
  );
}

function ImpositionSection({ file }: { file: PDFFile }) {
  const [params, setParams] = useState({
    cols: 2,
    rows: 2,
    gap_mm: 5,
    bleed_mm: 3,
    sheet_width_mm: null as number | null,
    sheet_height_mm: null as number | null,
  });
  const [result, setResult] = useState<{
    download_url: string;
    sheet_width_mm: number;
    sheet_height_mm: number;
    copies: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await processApi.impose({ file_id: file.id, ...params });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Step & Repeat</h4>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Spalten">
          <NumberInput value={params.cols} onChange={(v) => setParams({ ...params, cols: v })} min={1} />
        </FormField>
        <FormField label="Zeilen">
          <NumberInput value={params.rows} onChange={(v) => setParams({ ...params, rows: v })} min={1} />
        </FormField>
        <FormField label="Abstand (mm)">
          <NumberInput value={params.gap_mm} onChange={(v) => setParams({ ...params, gap_mm: v })} />
        </FormField>
        <FormField label="Anschnitt (mm)">
          <NumberInput value={params.bleed_mm} onChange={(v) => setParams({ ...params, bleed_mm: v })} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Bogen B (mm, opt.)">
          <NumberInput
            value={params.sheet_width_mm ?? 0}
            onChange={(v) => setParams({ ...params, sheet_width_mm: v || null })}
          />
        </FormField>
        <FormField label="Bogen H (mm, opt.)">
          <NumberInput
            value={params.sheet_height_mm ?? 0}
            onChange={(v) => setParams({ ...params, sheet_height_mm: v || null })}
          />
        </FormField>
      </div>

      <div className="text-xs text-muted-foreground bg-secondary rounded p-2">
        {params.cols} × {params.rows} = <strong className="text-foreground">{params.cols * params.rows} Nutzen</strong>
      </div>

      <RunButton onClick={run} loading={loading} label="Ausschießen" />

      {result && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground bg-secondary rounded p-2">
            <p>Bogengröße: {result.sheet_width_mm} × {result.sheet_height_mm} mm</p>
            <p>Nutzen: {result.copies}</p>
          </div>
          <a
            href={result.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 text-sm bg-green-700 hover:bg-green-600 text-white rounded"
          >
            Ausgeschossenes PDF ↓
          </a>
        </div>
      )}
    </div>
  );
}

function ColorSection({ file }: { file: PDFFile }) {
  const [target, setTarget] = useState("cmyk");
  const [result, setResult] = useState<{ download_url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await processApi.colorConvert({ file_id: file.id, target });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Farbkonvertierung</h4>

      <FormField label="Ziel-Farbraum">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground"
        >
          <option value="cmyk">CMYK (Offset)</option>
          <option value="pdf_x3">PDF/X-3 normalisieren</option>
          <option value="pdf_x4">PDF/X-4 normalisieren</option>
        </select>
      </FormField>

      <RunButton onClick={run} loading={loading} label="Konvertieren" />

      {result && (
        <a
          href={result.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2 text-sm bg-green-700 hover:bg-green-600 text-white rounded"
        >
          Konvertiertes PDF ↓
        </a>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground"
    />
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      <span className="text-xs text-foreground">{label}</span>
    </label>
  );
}

function RunButton({
  onClick,
  loading,
  label = "Ausführen",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2 text-sm font-medium bg-primary hover:bg-primary/80 text-primary-foreground rounded disabled:opacity-50"
    >
      {loading ? "Wird verarbeitet..." : label}
    </button>
  );
}
