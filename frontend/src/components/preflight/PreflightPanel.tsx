import React, { useState } from "react";
import { preflightApi } from "../../api/client";
import type { PDFFile, PreflightReport, PreflightIssue } from "../../types";

const PROFILES = [
  { value: "default", label: "Standard Druck" },
  { value: "pdf_x3", label: "PDF/X-3" },
  { value: "pdf_x4", label: "PDF/X-4" },
];

const severityConfig = {
  error: { color: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/40", icon: "✕" },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-900/30",
    border: "border-amber-500/40",
    icon: "⚠",
  },
  info: { color: "text-blue-400", bg: "bg-blue-900/30", border: "border-blue-500/40", icon: "ℹ" },
};

interface PreflightPanelProps {
  file: PDFFile;
}

export function PreflightPanel({ file }: PreflightPanelProps) {
  const [profile, setProfile] = useState("default");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<PreflightReport | null>(null);

  const runPreflight = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await preflightApi.run(file.id, profile);
      setReport(res.data);
    } catch (err) {
      console.error("Preflight error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Preflight-Profil</label>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground"
          >
            {PROFILES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={runPreflight}
          disabled={running}
          className="w-full py-2 text-sm font-medium bg-primary hover:bg-primary/80 text-primary-foreground rounded disabled:opacity-50 transition-colors"
        >
          {running ? "Prüfung läuft..." : "Preflight starten"}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {!report && !running && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm text-muted-foreground">
              Profil wählen und Preflight starten
            </p>
          </div>
        )}

        {running && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">PDF wird geprüft...</p>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Verdict */}
            <div
              className={`rounded-lg p-4 border ${
                report.passed
                  ? "bg-green-900/20 border-green-500/40"
                  : "bg-red-900/20 border-red-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{report.passed ? "✅" : "❌"}</span>
                <div>
                  <p
                    className={`font-semibold ${report.passed ? "text-green-400" : "text-red-400"}`}
                  >
                    {report.passed ? "Preflight bestanden" : "Preflight fehlgeschlagen"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.pages_checked} Seiten geprüft • Profil: {report.profile}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="text-red-400 font-mono">{report.errors} Fehler</span>
                <span className="text-amber-400 font-mono">{report.warnings} Warnungen</span>
                <span className="text-blue-400 font-mono">{report.infos} Info</span>
              </div>
            </div>

            {/* Issues */}
            {report.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Probleme gefunden 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue, idx) => {
                  const cfg = severityConfig[issue.severity];
                  return (
                    <IssueRow key={idx} issue={issue} cfg={cfg} />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  cfg,
}: {
  issue: PreflightIssue;
  cfg: { color: string; bg: string; border: string; icon: string };
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded border ${cfg.border} ${cfg.bg} cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2 p-2">
        <span className={`text-sm font-bold ${cfg.color} mt-0.5`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground leading-relaxed">{issue.message}</p>
          {issue.page && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Seite {issue.page}</p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{issue.code}</span>
      </div>
    </div>
  );
}
