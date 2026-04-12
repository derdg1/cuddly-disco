import { create } from "zustand";
import type { PDFFile, Job, Workflow } from "../types";

interface AppStore {
  // Files
  files: PDFFile[];
  selectedFile: PDFFile | null;
  setFiles: (files: PDFFile[]) => void;
  setSelectedFile: (file: PDFFile | null) => void;

  // Jobs
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  updateJob: (job: Job) => void;

  // Workflows
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  activeWorkflowId: string | null;
  setActiveWorkflowId: (id: string | null) => void;

  // UI state
  currentPage: number;
  setCurrentPage: (page: number) => void;
  viewMode: "normal" | "separation";
  setViewMode: (mode: "normal" | "separation") => void;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
}

export const useStore = create<AppStore>((set) => ({
  files: [],
  selectedFile: null,
  setFiles: (files) => set({ files }),
  setSelectedFile: (file) => set({ selectedFile: file, currentPage: 0 }),

  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === job.id ? job : j)),
    })),

  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  activeWorkflowId: null,
  setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),

  currentPage: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
  viewMode: "normal",
  setViewMode: (mode) => set({ viewMode: mode }),
  activeChannel: "C",
  setActiveChannel: (channel) => set({ activeChannel: channel }),
}));
