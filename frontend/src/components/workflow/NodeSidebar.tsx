import React from "react";

const NODE_PALETTE = [
  { type: "fileInput", label: "PDF Eingang", icon: "📁", color: "#3b82f6" },
  { type: "preflight", label: "Preflight", icon: "🔍", color: "#f59e0b" },
  { type: "colorConvert", label: "Farbkonvertierung", icon: "🎨", color: "#8b5cf6" },
  { type: "addMarks", label: "Druckmarken", icon: "✂️", color: "#06b6d4" },
  { type: "imposition", label: "Ausschießen", icon: "📐", color: "#f97316" },
  { type: "inkCoverage", label: "Tintendeckung", icon: "💧", color: "#10b981" },
  { type: "condition", label: "Bedingung", icon: "🔀", color: "#ec4899" },
  { type: "output", label: "Ausgabe", icon: "📤", color: "#22c55e" },
];

interface NodeSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export function NodeSidebar({ onDragStart }: NodeSidebarProps) {
  return (
    <div className="w-48 bg-card border-r border-border flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Module
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {NODE_PALETTE.map((node) => (
          <div
            key={node.type}
            className="flex items-center gap-2 px-3 py-2 rounded-md cursor-grab bg-secondary hover:bg-accent transition-colors border border-transparent hover:border-border"
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            style={{ borderLeftColor: node.color, borderLeftWidth: 3 }}
          >
            <span className="text-base">{node.icon}</span>
            <span className="text-xs font-medium text-foreground">{node.label}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Module per Drag &amp; Drop auf den Canvas ziehen
        </p>
      </div>
    </div>
  );
}
