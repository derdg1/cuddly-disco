import { Handle, Position } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

// ── FileInput Node ───────────────────────────────────────────────────────────
export function FileInputNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="PDF Eingang" icon="📁" color="#3b82f6" hasInput={false}>
      <p className="text-xs text-muted-foreground">
        {(data.filename as string) || "Datei wählen..."}
      </p>
    </BaseNode>
  );
}

// ── Preflight Node ────────────────────────────────────────────────────────────
export function PreflightNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="Preflight" icon="🔍" color="#f59e0b">
      <p>Profil: {(data.profile as string) || "default"}</p>
      <div className="flex gap-2 mt-1">
        <Handle
          id="ok"
          type="source"
          position={Position.Right}
          style={{ top: "35%", background: "#22c55e", border: "2px solid #1e2d45" }}
        />
        <Handle
          id="error"
          type="source"
          position={Position.Right}
          style={{ top: "65%", background: "#ef4444", border: "2px solid #1e2d45" }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className="text-green-400">OK ↗</span>
        <span className="text-red-400">Fehler ↘</span>
      </div>
    </BaseNode>
  );
}

// ── ColorConvert Node ─────────────────────────────────────────────────────────
export function ColorConvertNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="Farbkonvertierung" icon="🎨" color="#8b5cf6">
      <p>Ziel: {(data.target as string) || "CMYK"}</p>
    </BaseNode>
  );
}

// ── AddMarks Node ─────────────────────────────────────────────────────────────
export function AddMarksNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="Druckmarken" icon="✂️" color="#06b6d4">
      <p>Anschnitt: {(data.bleed_mm as number) || 3}mm</p>
      <p>Schnittmarken: {(data.add_crop_marks as boolean) !== false ? "Ja" : "Nein"}</p>
    </BaseNode>
  );
}

// ── Imposition Node ───────────────────────────────────────────────────────────
export function ImpositionNode({ data }: { data: Record<string, unknown> }) {
  const cols = (data.cols as number) || 2;
  const rows = (data.rows as number) || 2;
  return (
    <BaseNode title="Ausschießen" icon="📐" color="#f97316">
      <p>
        {cols} × {rows} = {cols * rows} Nutzen
      </p>
      <p>Abstand: {(data.gap_mm as number) || 5}mm</p>
    </BaseNode>
  );
}

// ── InkCoverage Node ──────────────────────────────────────────────────────────
export function InkCoverageNode() {
  return (
    <BaseNode title="Tintendeckung" icon="💧" color="#10b981">
      <p>Bericht generieren</p>
    </BaseNode>
  );
}

// ── Condition Node ────────────────────────────────────────────────────────────
export function ConditionNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="Bedingung" icon="🔀" color="#ec4899">
      <p>{(data.condition as string) || "Preflight OK?"}</p>
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        style={{ top: "35%", background: "#22c55e", border: "2px solid #1e2d45" }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        style={{ top: "65%", background: "#ef4444", border: "2px solid #1e2d45" }}
      />
    </BaseNode>
  );
}

// ── Output Node ───────────────────────────────────────────────────────────────
export function OutputNode({ data }: { data: Record<string, unknown> }) {
  return (
    <BaseNode title="Ausgabe" icon="📤" color="#22c55e" hasOutput={false}>
      <p>{(data.output_name as string) || "output.pdf"}</p>
    </BaseNode>
  );
}
