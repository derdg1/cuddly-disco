import React from "react";
import { Handle, Position } from "@xyflow/react";

interface BaseNodeProps {
  title: string;
  icon: string;
  color: string;
  children?: React.ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  status?: "idle" | "running" | "ok" | "error";
}

const statusColors = {
  idle: "bg-gray-500",
  running: "bg-blue-500 animate-pulse",
  ok: "bg-green-500",
  error: "bg-red-500",
};

export function BaseNode({
  title,
  icon,
  color,
  children,
  hasInput = true,
  hasOutput = true,
  status = "idle",
}: BaseNodeProps) {
  return (
    <div
      className="rounded-lg border border-border bg-card shadow-lg min-w-[180px] max-w-[220px]"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: color, border: "2px solid #1e2d45" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-foreground truncate flex-1">{title}</span>
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>

      {/* Body */}
      {children && <div className="px-3 py-2 text-xs text-muted-foreground">{children}</div>}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: color, border: "2px solid #1e2d45" }}
        />
      )}
    </div>
  );
}
