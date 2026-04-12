import React, { useEffect, useState } from "react";
import { WorkflowEditor } from "../components/workflow/WorkflowEditor";
import { workflowsApi } from "../api/client";
import { useStore } from "../store";
import type { Workflow } from "../types";

export function WorkflowPage() {
  const { workflows, setWorkflows, activeWorkflowId, setActiveWorkflowId } = useStore();
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWorkflows = async () => {
    try {
      const res = await workflowsApi.list();
      setWorkflows(res.data);
    } catch {}
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const openWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const res = await workflowsApi.get(id);
      setActiveWorkflow(res.data);
      setActiveWorkflowId(id);
    } finally {
      setLoading(false);
    }
  };

  const newWorkflow = () => {
    setActiveWorkflow(null);
    setActiveWorkflowId(null);
  };

  const deleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Workflow löschen?")) return;
    await workflowsApi.delete(id);
    if (activeWorkflowId === id) newWorkflow();
    await loadWorkflows();
  };

  const onSaved = (workflow: Workflow) => {
    setActiveWorkflow(workflow);
    setActiveWorkflowId(workflow.id);
    loadWorkflows();
  };

  return (
    <div className="flex h-full">
      {/* Workflow list sidebar */}
      <div className="w-56 border-r border-border bg-card flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Workflows</h2>
          <button
            onClick={newWorkflow}
            className="w-6 h-6 flex items-center justify-center rounded bg-primary text-primary-foreground text-sm hover:bg-primary/80"
            title="Neuer Workflow"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workflows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Noch keine Workflows
            </p>
          )}
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => openWorkflow(wf.id)}
              className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer group transition-colors ${
                activeWorkflowId === wf.id
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">⚡</span>
                <span className="text-xs font-medium truncate">{wf.name}</span>
              </div>
              <button
                onClick={(e) => deleteWorkflow(wf.id, e)}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 ml-1 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={newWorkflow}
            className="w-full py-2 text-xs text-center bg-secondary hover:bg-accent border border-border rounded text-muted-foreground"
          >
            + Neuer Workflow
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <WorkflowEditor workflow={activeWorkflow} onSaved={onSaved} />
        )}
      </div>
    </div>
  );
}
