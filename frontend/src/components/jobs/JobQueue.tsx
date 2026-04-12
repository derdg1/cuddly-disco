import React, { useEffect } from "react";
import { jobsApi } from "../../api/client";
import { useStore } from "../../store";
import type { Job } from "../../types";

const statusConfig = {
  pending: { color: "text-muted-foreground", bg: "bg-secondary", label: "Wartend" },
  running: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Läuft" },
  completed: { color: "text-green-400", bg: "bg-green-900/20", label: "Fertig" },
  failed: { color: "text-red-400", bg: "bg-red-900/20", label: "Fehler" },
};

export function JobQueue() {
  const { jobs, setJobs } = useStore();

  const loadJobs = async () => {
    try {
      const res = await jobsApi.list();
      setJobs(res.data);
    } catch {}
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Job-Queue</h3>
        <button
          onClick={loadJobs}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Aktualisieren
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-3xl mb-2">📋</span>
            <p className="text-sm text-muted-foreground">Keine Jobs vorhanden</p>
          </div>
        )}

        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const cfg = statusConfig[job.status] ?? statusConfig.pending;

  const handleDownload = () => {
    window.open(jobsApi.download(job.id), "_blank");
  };

  return (
    <div className={`rounded-lg border border-border ${cfg.bg} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {job.operation}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {job.id.slice(0, 8)}...
          </p>
          <p className="text-[10px] text-muted-foreground">
            {job.created_at ? new Date(job.created_at).toLocaleString("de-DE") : ""}
          </p>
        </div>

        {job.status === "running" && (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
        )}

        {job.has_output && job.status === "completed" && (
          <button
            onClick={handleDownload}
            className="px-2 py-1 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded shrink-0"
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
}
