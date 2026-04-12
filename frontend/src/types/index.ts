export interface PDFFile {
  id: string;
  filename: string;
  pages: number;
  width_mm: number;
  height_mm: number;
  size: number;
  color_spaces: string[];
  spot_colors: string[];
  uploaded_at: string;
}

export interface PreflightIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  page: number | null;
}

export interface PreflightReport {
  passed: boolean;
  profile: string;
  pages_checked: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: PreflightIssue[];
}

export interface InkCoverage {
  C: number;
  M: number;
  Y: number;
  K: number;
  total: number;
}

export interface Job {
  id: string;
  workflow_id: string | null;
  file_id: string;
  operation: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  log?: string;
  created_at: string;
  completed_at: string | null;
  has_output: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  flow_data?: WorkflowFlowData;
  created_at: string;
  updated_at: string;
}

export interface WorkflowFlowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeType =
  | "fileInput"
  | "preflight"
  | "colorConvert"
  | "addMarks"
  | "imposition"
  | "inkCoverage"
  | "condition"
  | "output";
