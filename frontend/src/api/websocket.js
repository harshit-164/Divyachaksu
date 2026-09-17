import { WS_BASE } from "../utils/constants";

export class LiveSocket {
  constructor({ onEvent, onAlert, onStatus, onConnection }) {
    this.onEvent = onEvent;
    this.onAlert = onAlert;
    this.onStatus = onStatus;
    this.onConnection = onConnection;
    this.ws = null;
    this.shouldRun = false;
    this.retryMs = 1000;
    this.maxRetryMs = 10000;
    this.pingTimer = null;
    this.retryTimer = null;
  }

  connect() {
    this.shouldRun = true;
    this._open();
  }

  disconnect() {
    this.shouldRun = false;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.onConnection?.("Disconnected");
  }

  _open() {
    if (!this.shouldRun) return;
    this.onConnection?.("Reconnecting");

    let ws;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/events`);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retryMs = 1000;
      this.onConnection?.("Connected");
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 15000);
    };

    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        if (payload.type === "pong" || payload.type === "connected") return;
        if (payload.type === "event") this.onEvent?.(payload.data);
        if (payload.type === "alert") this.onAlert?.(payload.data);
        if (payload.type === "simulation_status") this.onStatus?.(payload.data);
        if (payload.type === "stats_refresh") this.onStatus?.({ refresh: true });
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.onConnection?.("Disconnected");
      this._scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }

  _scheduleReconnect() {
    if (!this.shouldRun) return;
    this.onConnection?.("Reconnecting");
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this._open();
      this.retryMs = Math.min(this.retryMs * 1.7, this.maxRetryMs);
    }, this.retryMs);
  }
}
