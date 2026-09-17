import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { LiveSocket } from "../api/websocket";
import { api } from "../api/client";

const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const [connection, setConnection] = useState("Disconnected");
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [simStatus, setSimStatus] = useState(null);
  const [statsTick, setStatsTick] = useState(0);
  const toastGuard = useRef(new Set());

  useEffect(() => {
    api.simulatorStatus()
      .then((res) => setSimStatus(res.data))
      .catch(() => null);

    const socket = new LiveSocket({
      onConnection: setConnection,
      onEvent: (event) => {
        setLiveEvents((prev) => [event, ...prev].slice(0, 100));
        setStatsTick((t) => t + 1);
        if (event.risk_level === "Critical" || (event.is_anomaly && event.risk_score >= 90)) {
          // Visual urgency for critical live events without flooding toasts
        }
      },
      onAlert: (alert) => {
        setLiveAlerts((prev) => [alert, ...prev].slice(0, 50));
        const key = alert.alert_id || alert.id;
        if (key && toastGuard.current.has(key)) {
          setStatsTick((t) => t + 1);
          return;
        }
        if (key) {
          toastGuard.current.add(key);
          setTimeout(() => toastGuard.current.delete(key), 15000);
        }
        if (alert.severity === "Critical") {
          toast.error(`Critical alert: ${alert.title}`, { duration: 5500, id: `alert-${key}` });
        } else if (alert.severity === "High") {
          toast.error(`High-risk alert: ${alert.title}`, { duration: 4500, id: `alert-${key}` });
        } else {
          toast(`Alert opened · ${alert.severity}`, { icon: "⚠", id: `alert-${key}` });
        }
        setStatsTick((t) => t + 1);
      },
      onStatus: (status) => {
        if (status?.refresh) {
          setStatsTick((t) => t + 1);
          return;
        }
        setSimStatus(status);
      },
    });
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const simulatorRunning = Boolean(simStatus?.is_running);

  const value = useMemo(
    () => ({
      connection,
      liveEvents,
      liveAlerts,
      simStatus,
      simulatorRunning,
      statsTick,
      setSimStatus,
    }),
    [connection, liveEvents, liveAlerts, simStatus, simulatorRunning, statsTick]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveProvider");
  return ctx;
}
