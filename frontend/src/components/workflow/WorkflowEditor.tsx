import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NodeSidebar } from "./NodeSidebar";
import {
  FileInputNode,
  PreflightNode,
  ColorConvertNode,
  AddMarksNode,
  ImpositionNode,
  InkCoverageNode,
  ConditionNode,
  OutputNode,
} from "./nodes";
import { workflowsApi } from "../../api/client";
import type { Workflow } from "../../types";

const nodeTypes = {
  fileInput: FileInputNode,
  preflight: PreflightNode,
  colorConvert: ColorConvertNode,
  addMarks: AddMarksNode,
  imposition: ImpositionNode,
  inkCoverage: InkCoverageNode,
  condition: ConditionNode,
  output: OutputNode,
};

const defaultNodeData: Record<string, Record<string, unknown>> = {
  fileInput: { filename: "" },
  preflight: { profile: "default" },
  colorConvert: { target: "cmyk" },
  addMarks: { bleed_mm: 3, add_crop_marks: true, add_registration: true, add_color_bar: true },
  imposition: { cols: 2, rows: 2, gap_mm: 5, bleed_mm: 3 },
  inkCoverage: {},
  condition: { condition: "Preflight OK?" },
  output: { output_name: "output.pdf" },
};

interface WorkflowEditorProps {
  workflow: Workflow | null;
  onSaved?: (workflow: Workflow) => void;
}

let nodeIdCounter = 1;

export function WorkflowEditor({ workflow, onSaved }: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof import("@xyflow/react").useReactFlow> | null>(null);

  const initialNodes: Node[] = workflow?.flow_data?.nodes ?? [];
  const initialEdges: Edge[] = workflow?.flow_data?.edges ?? [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saving, setSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState(workflow?.name ?? "Neuer Workflow");

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();

      // Use stored instance position
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 40,
      };

      const newNode: Node = {
        id: `node_${nodeIdCounter++}`,
        type,
        position,
        data: { ...defaultNodeData[type] },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const flowData = { nodes, edges };
      if (workflow?.id) {
        const res = await workflowsApi.update(workflow.id, {
          name: workflowName,
          flow_data: flowData,
        });
        onSaved?.(res.data);
      } else {
        const res = await workflowsApi.create({
          name: workflowName,
          flow_data: flowData,
        });
        onSaved?.(res.data);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="flex h-full">
      <NodeSidebar onDragStart={onDragStart} />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground flex-1 max-w-xs"
            placeholder="Workflow-Name..."
          />
          <button
            onClick={handleClear}
            className="px-3 py-1 text-xs bg-secondary hover:bg-accent border border-border rounded text-muted-foreground"
          >
            Leeren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded font-medium disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: "hsl(222, 47%, 9%)" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(217, 32%, 20%)"
            />
            <Controls
              style={{
                background: "hsl(222, 47%, 14%)",
                border: "1px solid hsl(217, 32%, 25%)",
              }}
            />
            <MiniMap
              style={{
                background: "hsl(222, 47%, 11%)",
                border: "1px solid hsl(217, 32%, 25%)",
              }}
              nodeColor="hsl(210, 100%, 56%)"
            />
            <Panel position="top-right">
              <div className="bg-card border border-border rounded-lg p-3 text-xs text-muted-foreground shadow-lg">
                <p className="font-semibold text-foreground mb-1">Hinweis</p>
                <p>Module aus der Palette</p>
                <p>auf den Canvas ziehen.</p>
                <p>Verbindungen per Klick</p>
                <p>auf die Handles ziehen.</p>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
