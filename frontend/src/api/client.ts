import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

// Files
export const filesApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => api.get("/files"),
  info: (id: string) => api.get(`/files/${id}/info`),
  preview: (id: string, page: number, dpi = 150) =>
    `/api/files/${id}/preview/${page}?dpi=${dpi}`,
  separation: (id: string, page: number, channel: string) =>
    `/api/files/${id}/separation/${page}/${channel}`,
  inkCoverage: (id: string, page: number) =>
    api.get(`/files/${id}/ink-coverage/${page}`),
  delete: (id: string) => api.delete(`/files/${id}`),
};

// Preflight
export const preflightApi = {
  run: (fileId: string, profile = "default") =>
    api.post("/preflight/run", { file_id: fileId, profile }),
};

// Processing
export const processApi = {
  addMarks: (params: {
    file_id: string;
    bleed_mm?: number;
    add_crop_marks?: boolean;
    add_registration?: boolean;
    add_color_bar?: boolean;
  }) => api.post("/process/marks", params),

  impose: (params: {
    file_id: string;
    cols: number;
    rows: number;
    gap_mm?: number;
    bleed_mm?: number;
    sheet_width_mm?: number | null;
    sheet_height_mm?: number | null;
  }) => api.post("/process/impose", params),

  colorConvert: (params: { file_id: string; target: string }) =>
    api.post("/process/color-convert", params),

  downloadUrl: (filename: string) => `/api/process/download/${filename}`,
};

// Workflows
export const workflowsApi = {
  list: () => api.get("/workflows"),
  create: (data: { name: string; description?: string; flow_data?: object }) =>
    api.post("/workflows", data),
  get: (id: string) => api.get(`/workflows/${id}`),
  update: (id: string, data: { name?: string; description?: string; flow_data?: object }) =>
    api.put(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  run: (id: string, fileId: string) =>
    api.post(`/workflows/${id}/run`, { file_id: fileId }),
};

// Jobs
export const jobsApi = {
  list: () => api.get("/jobs"),
  get: (id: string) => api.get(`/jobs/${id}`),
  download: (id: string) => `/api/jobs/${id}/download`,
};
