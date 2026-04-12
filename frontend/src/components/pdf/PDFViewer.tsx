import React, { useState } from "react";
import { filesApi } from "../../api/client";
import type { PDFFile, InkCoverage } from "../../types";
import { useStore } from "../../store";

const CHANNELS = ["C", "M", "Y", "K"];
const CHANNEL_COLORS: Record<string, string> = {
  C: "#00b4d8",
  M: "#e63946",
  Y: "#ffd60a",
  K: "#6c757d",
};

interface PDFViewerProps {
  file: PDFFile;
}

export function PDFViewer({ file }: PDFViewerProps) {
  const { currentPage, setCurrentPage, viewMode, setViewMode, activeChannel, setActiveChannel } =
    useStore();
  const [inkCoverage, setInkCoverage] = useState<InkCoverage | null>(null);
  const [loadingInk, setLoadingInk] = useState(false);

  const totalPages = file.pages;
  const previewSrc =
    viewMode === "separation"
      ? filesApi.separation(file.id, currentPage, activeChannel)
      : filesApi.preview(file.id, currentPage, 150);

  const loadInkCoverage = async () => {
    setLoadingInk(true);
    try {
      const res = await filesApi.inkCoverage(file.id, currentPage);
      setInkCoverage(res.data);
    } finally {
      setLoadingInk(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 text-xs bg-secondary hover:bg-accent rounded border border-border disabled:opacity-40"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground px-2">
            Seite {currentPage + 1} / {totalPages}
          </span>
          <button
            className="px-2 py-1 text-xs bg-secondary hover:bg-accent rounded border border-border disabled:opacity-40"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            →
          </button>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* View mode toggle */}
        <div className="flex rounded overflow-hidden border border-border">
          <button
            className={`px-3 py-1 text-xs ${viewMode === "normal" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
            onClick={() => setViewMode("normal")}
          >
            Normal
          </button>
          <button
            className={`px-3 py-1 text-xs ${viewMode === "separation" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
            onClick={() => setViewMode("separation")}
          >
            Separation
          </button>
        </div>

        {/* Channel selector */}
        {viewMode === "separation" && (
          <div className="flex gap-1">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`w-7 h-7 rounded text-xs font-bold border-2 transition-all ${
                  activeChannel === ch ? "border-white scale-110" : "border-transparent opacity-60"
                }`}
                style={{ background: CHANNEL_COLORS[ch], color: ch === "Y" ? "#000" : "#fff" }}
              >
                {ch}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Ink coverage button */}
        <button
          onClick={loadInkCoverage}
          disabled={loadingInk}
          className="px-3 py-1 text-xs bg-secondary hover:bg-accent border border-border rounded text-muted-foreground disabled:opacity-50"
        >
          {loadingInk ? "Berechne..." : "Tintendeckung"}
        </button>
      </div>

      {/* PDF image */}
      <div className="flex-1 flex items-center justify-center bg-[hsl(222,47%,8%)] overflow-auto p-4">
        <img
          key={previewSrc}
          src={previewSrc}
          alt={`Seite ${currentPage + 1}`}
          className="max-h-full max-w-full object-contain shadow-2xl rounded"
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>

      {/* Ink coverage panel */}
      {inkCoverage && (
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-muted-foreground">Tintendeckung S.{currentPage + 1}:</span>
            {CHANNELS.map((ch) => (
              <div key={ch} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ background: CHANNEL_COLORS[ch] }}
                />
                <span className="text-xs font-mono text-foreground">
                  {ch}: {inkCoverage[ch as keyof InkCoverage].toFixed(1)}%
                </span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              Gesamt: <strong className="text-foreground">{inkCoverage.total.toFixed(1)}%</strong>
              {inkCoverage.total > 320 && (
                <span className="ml-2 text-red-400 font-semibold">⚠ Über TAC-Limit (320%)</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* File info */}
      <div className="px-4 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{file.filename}</span>
          <span>•</span>
          <span>
            {file.width_mm} × {file.height_mm} mm
          </span>
          <span>•</span>
          <span>{file.color_spaces.join(", ") || "Keine Farbraum-Info"}</span>
          {file.spot_colors.length > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-400">
                Sonderfarben: {file.spot_colors.join(", ")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
