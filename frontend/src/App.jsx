import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LiveProvider } from "./context/LiveContext";
import AppLayout from "./components/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import LiveMonitor from "./pages/LiveMonitor";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Alerts from "./pages/Alerts";
import AlertDetails from "./pages/AlertDetails";
import UserRiskProfiles from "./pages/UserRiskProfiles";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import ModelMonitoring from "./pages/ModelMonitoring";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <LiveProvider>
      <Toaster position="top-right" toastOptions={{ className: "text-sm" }} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="live" element={<LiveMonitor />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="alerts/:id" element={<AlertDetails />} />
          <Route path="users" element={<UserRiskProfiles />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="model" element={<ModelMonitoring />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LiveProvider>
  );
}
