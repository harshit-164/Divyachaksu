import axios from "axios";
import { API_BASE } from "../utils/constants";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error("[Divyachaksu API]", error?.config?.url, error?.message, error?.response?.status);
    }
    return Promise.reject(error);
  }
);

export const api = {
  health: () => client.get("/api/health"),
  dashboardStats: () => client.get("/api/dashboard/stats"),
  recentEvents: (limit = 20) => client.get("/api/dashboard/recent-events", { params: { limit } }),
  recentAlerts: (limit = 10) => client.get("/api/dashboard/recent-alerts", { params: { limit } }),

  events: (params) => client.get("/api/events", { params }),
  event: (id) => client.get(`/api/events/${id}`),
  eventExplanation: (id) => client.get(`/api/events/${id}/explanation`),
  eventRelatedAlerts: (id) => client.get(`/api/events/${id}/related-alerts`),
  eventsByUser: (userId) => client.get(`/api/events/user/${userId}`),
  analyzeEvent: (payload) => client.post("/api/events/analyze", payload),

  alerts: (params) => client.get("/api/alerts", { params }),
  alert: (id) => client.get(`/api/alerts/${id}`),
  updateAlert: (id, payload) => client.put(`/api/alerts/${id}`, payload),
  resolveAlert: (id) => client.post(`/api/alerts/${id}/resolve`),
  falsePositiveAlert: (id) => client.post(`/api/alerts/${id}/false-positive`),
  addAlertNote: (id, payload) => client.post(`/api/alerts/${id}/notes`, payload),

  simulatorStatus: () => client.get("/api/simulator/status"),
  startSimulator: () => client.post("/api/simulator/start"),
  stopSimulator: () => client.post("/api/simulator/stop"),

  analyticsEvents: () => client.get("/api/analytics/events"),
  analyticsAnomalies: () => client.get("/api/analytics/anomalies"),
  analyticsRisk: () => client.get("/api/analytics/risk"),
  analyticsAlerts: () => client.get("/api/analytics/alerts"),

  reports: () => client.get("/api/reports"),
  generateReport: (payload) => client.post("/api/reports/generate", payload),
  report: (id) => client.get(`/api/reports/${id}`),
  exportReportCsv: (id) => `${API_BASE}/api/reports/${id}/export-csv`,
  exportReportJson: (id) => `${API_BASE}/api/reports/${id}/export-json`,

  riskProfiles: () => client.get("/api/users/risk-profiles"),
  riskProfile: (userId) => client.get(`/api/users/risk-profiles/${userId}`),

  modelStatus: () => client.get("/api/model/status"),
  trainModel: () => client.post("/api/model/train"),
  updateModelThreshold: (threshold) => client.put("/api/model/threshold", { threshold }),
  modelPredictions: () => client.get("/api/model/predictions"),

  settings: () => client.get("/api/settings"),
  updateSettings: (payload) => client.put("/api/settings", payload),

  login: (payload) => client.post("/api/auth/login", payload),
};

export default client;
