// hal_test/src/components/UserMenu.jsx
import React, { useState, useEffect, useRef } from "react";
import "./styles/UserMenu.css";

/**
 * UserMenu con verificación de estado de API.
 * - Por defecto consulta: http://localhost:2001/api/status
 * - Comprueba al abrir el menú y al pulsar "Verificar API"
 */
export default function UserMenu({
  apiUrl = "http://localhost:2001/api/status", // tu endpoint local
  timeoutMs = 5000,
}) {
  const [open, setOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    state: "unknown", // 'unknown' | 'checking' | 'up' | 'down' | 'error'
    lastChecked: null,
    message: "",
    service: null,
    uptime: null, // seconds (number) si viene en la respuesta
  });
  const menuRef = useRef(null);
  const abortRef = useRef(null);

  const toggleMenu = () => setOpen((s) => !s);

  // cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // comprobar al abrir
  useEffect(() => {
    if (open) checkApiStatus();
    else {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const formatUptime = (seconds) => {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) return null;
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hrs || days) parts.push(`${hrs}h`);
    if (mins || hrs || days) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  const checkApiStatus = async () => {
    // cancelar petición anterior
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setApiStatus((s) => ({
      ...s,
      state: "checking",
      message: "Comprobando...",
    }));

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      );

      const responsePromise = fetch(apiUrl, { signal: controller.signal });

      const response = await Promise.race([responsePromise, timeout]);

      if (!response || controller.signal.aborted) {
        throw new Error("Aborted or no response");
      }

      const is2xx = response.status >= 200 && response.status < 300;

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      // Tu formato esperado:
      // { "success": true, "status": "ok", "service": "HaltTest Backend API", "uptime": 65934.309335159 }
      const successFlag = body && body.success === true;
      const statusField =
        body && typeof body.status === "string"
          ? body.status.toLowerCase()
          : null;
      const serviceName = body && body.service ? String(body.service) : null;
      const uptimeSeconds =
        body &&
        (typeof body.uptime === "number" || !Number.isNaN(Number(body.uptime)))
          ? Number(body.uptime)
          : null;

      // lógica: 'up' si HTTP 2xx y success true and status==='ok'
      const isUp =
        is2xx && successFlag && (statusField === "ok" || statusField === "up");

      const newState = isUp ? "up" : is2xx ? "down" : "down";

      const msgParts = [];
      if (response && response.status) msgParts.push(`HTTP ${response.status}`);
      if (body && body.status) msgParts.push(`status: ${body.status}`);
      const msg = msgParts.join(" — ") || (is2xx ? "OK" : "No OK");

      setApiStatus({
        state: newState,
        lastChecked: new Date(),
        message: msg,
        service: serviceName,
        uptime: uptimeSeconds,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        setApiStatus((s) => ({
          ...s,
          state: "unknown",
          message: "Petición cancelada",
        }));
      } else if (err.message === "timeout") {
        setApiStatus({
          state: "error",
          lastChecked: new Date(),
          message: `Timeout (${timeoutMs}ms)`,
          service: null,
          uptime: null,
        });
      } else {
        setApiStatus({
          state: "error",
          lastChecked: new Date(),
          message: err.message || "Error desconocido",
          service: null,
          uptime: null,
        });
      }
    } finally {
      abortRef.current = null;
      // (podrías usar elapsed para logging)
    }
  };

  const renderStatusLabel = () => {
    const { state, lastChecked, message, service, uptime } = apiStatus;
    let label = "Desconocido";
    if (state === "checking") label = "Comprobando…";
    if (state === "up") label = "Operativa";
    if (state === "down") label = "No disponible";
    if (state === "error") label = "Error";

    return (
      <div className="api-status">
        <span className={`status-dot ${state}`} aria-hidden="true" />
        <div className="status-info">
          <div className="status-line">
            <strong>API:</strong> <span>{label}</span>
          </div>

          {/* servicio y uptime si vienen */}
          {service && (
            <div className="status-sub">
              <strong>{service}</strong>
            </div>
          )}

          {typeof uptime === "number" && !Number.isNaN(uptime) && (
            <div className="status-sub">
              Uptime: {formatUptime(uptime)} ({Math.floor(uptime)}s)
            </div>
          )}

          <div className="status-sub">
            {lastChecked ? (
              <span className="last-checked">
                Última: {new Date(lastChecked).toLocaleString()}
              </span>
            ) : (
              <span className="last-checked">No verificada</span>
            )}
            {message ? <span className="status-msg"> — {message}</span> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="burger-btn"
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Abrir menú de usuario"
      >
        ☰
      </button>

      {open && (
        <div className="menu-dropdown" role="menu" aria-label="Menú de usuario">
          <div className="profile-section">
            <img
              src="https://via.placeholder.com/40"
              alt="Perfil"
              className="profile-pic"
            />
            <span className="username">Usuario</span>
          </div>

          {/* Estado de API */}
          <div className="menu-section api-section">
            {renderStatusLabel()}
            <div className="api-actions">
              <button
                className="check-api-btn"
                onClick={checkApiStatus}
                disabled={apiStatus.state === "checking"}
                aria-disabled={apiStatus.state === "checking"}
              >
                {apiStatus.state === "checking"
                  ? "Comprobando…"
                  : "Verificar API"}
              </button>
            </div>
          </div>

          <ul className="menu-options" role="menu">
            <li role="menuitem">Perfil</li>
            <li role="menuitem">Configuración</li>
            <li role="menuitem">Cerrar sesión</li>
          </ul>
        </div>
      )}
    </div>
  );
}
