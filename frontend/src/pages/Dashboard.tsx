import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { filesApi } from "../api/client";
import { useStore } from "../store";
import type { PDFFile } from "../types";

export function Dashboard() {
  const navigate = useNavigate();
  const { files, setFiles, setSelectedFile } = useStore();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      const res = await filesApi.list();
      setFiles(res.data);
    } catch {}
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      setUploadError(null);
      for (const file of acceptedFiles) {
        try {
          await filesApi.upload(file);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload fehlgeschlagen";
          setUploadError(msg);
        }
      }
      await loadFiles();
      setUploading(false);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const openFile = (file: PDFFile) => {
    setSelectedFile(file);
    navigate("/editor");
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Datei löschen?")) return;
    await filesApi.delete(id);
    await loadFiles();
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">PrePress Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Professionelle PDF-Prepress-Bearbeitung
        </p>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl">{uploading ? "⏳" : "📄"}</span>
          {uploading ? (
            <p className="text-sm text-muted-foreground">PDF wird hochgeladen...</p>
          ) : isDragActive ? (
            <p className="text-sm text-primary font-medium">PDF hier ablegen...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                PDF-Dateien hier ablegen oder klicken
              </p>
              <p className="text-xs text-muted-foreground">Unterstützt: PDF (alle Versionen)</p>
            </>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg px-4 py-2 text-sm text-red-400">
          {uploadError}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-auto">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Dateien ({files.length})
        </h2>

        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">📂</span>
            <p className="text-sm text-muted-foreground">Noch keine PDFs hochgeladen</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => openFile(file)}
              onDelete={(e) => deleteFile(file.id, e)}
              formatSize={formatSize}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FileCard({
  file,
  onClick,
  onDelete,
  formatSize,
}: {
  file: PDFFile;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  formatSize: (bytes: number) => string;
}) {
  const previewSrc = filesApi.preview(file.id, 0, 100);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-secondary flex items-center justify-center overflow-hidden">
        <img
          src={previewSrc}
          alt={file.filename}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            {file.pages}S • {file.width_mm}×{file.height_mm}mm
          </p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        {file.spot_colors.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {file.spot_colors.slice(0, 3).map((sc) => (
              <span
                key={sc}
                className="text-[10px] bg-amber-900/30 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 truncate max-w-full"
              >
                {sc}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {file.color_spaces.map((cs) => (
              <span key={cs} className="text-[10px] bg-secondary text-muted-foreground rounded px-1">
                {cs}
              </span>
            ))}
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
