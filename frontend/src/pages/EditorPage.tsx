import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { PDFViewer } from "../components/pdf/PDFViewer";
import { PreflightPanel } from "../components/preflight/PreflightPanel";
import { ProcessPanel } from "./ProcessPanel";

type ActiveTool = "preflight" | "process" | "info";

export function EditorPage() {
  const navigate = useNavigate();
  const { selectedFile } = useStore();
  const [activeTool, setActiveTool] = useState<ActiveTool>("preflight");

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-4xl mb-4">📄</span>
        <p className="text-muted-foreground mb-4">Keine Datei ausgewählt</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
        >
          Zurück zum Dashboard
        </button>
      </div>
    );
  }

  const toolTabs: { id: ActiveTool; label: string; icon: string }[] = [
    { id: "preflight", label: "Preflight", icon: "🔍" },
    { id: "process", label: "Verarbeitung", icon: "⚙️" },
    { id: "info", label: "Info", icon: "ℹ️" },
  ];

  return (
    <div className="flex h-full">
      {/* PDF Viewer (main content) */}
      <div className="flex-1 min-w-0">
        <PDFViewer file={selectedFile} />
      </div>

      {/* Right panel */}
      <div className="w-80 flex flex-col border-l border-border bg-card shrink-0">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                activeTool === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {activeTool === "preflight" && <PreflightPanel file={selectedFile} />}
          {activeTool === "process" && <ProcessPanel file={selectedFile} />}
          {activeTool === "info" && <InfoPanel file={selectedFile} />}
        </div>
      </div>
    </div>
  );
}

function InfoPanel({ file }: { file: ReturnType<typeof useStore>["selectedFile"] }) {
  if (!file) return null;
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">PDF-Informationen</h3>
      <InfoRow label="Dateiname" value={file.filename} />
      <InfoRow label="Seiten" value={String(file.pages)} />
      <InfoRow
        label="Format"
        value={`${file.width_mm} × ${file.height_mm} mm`}
      />
      <InfoRow
        label="Dateigröße"
        value={
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
            : `${(file.size / 1024).toFixed(0)} KB`
        }
      />
      {file.color_spaces.length > 0 && (
        <InfoRow label="Farbräume" value={file.color_spaces.join(", ")} />
      )}
      {file.spot_colors.length > 0 && (
        <InfoRow label="Sonderfarben" value={file.spot_colors.join(", ")} />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 break-all">{value}</p>
    </div>
  );
}
