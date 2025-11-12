// NodeConfigurationPanel.jsx
import React, { useState, useEffect } from "react";
import { XCircle, Play, Trash2, AlertCircle } from "lucide-react";
import "./styles/NodeConfigurationPanel.css";
import { NODE_FIELD_CONFIGS } from "./hooks/constants";

/**
 * Props:
 * - action
 * - isVisible
 * - onExecute(action)
 * - onClose()
 * - onDeleteNode(nodeId)
 * - updateNodeConfiguration(nodeId, newConfig)
 * - nodes  <-- LISTA completa de nodos (necesario para dropdown browserId)
 */
export default function NodeConfigurationPanel({
  action,
  isVisible,
  onExecute,
  onClose,
  onDeleteNode,
  updateNodeConfiguration,
  nodes = [], // recibir la lista de nodos desde App
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!action?.nodeId) {
      setFormData({});
      setErrors({});
      setIsDirty(false);
      return;
    }
    const currentData = action.currentData || {};
    const fields = NODE_FIELD_CONFIGS[action.type] || [];

    const initialData = {};
    if (fields.length === 0) {
      initialData.browserType = currentData.browserType ?? "chromium";
      initialData.headless =
        typeof currentData.headless === "boolean" ? currentData.headless : true;
      initialData.slowMo = currentData.slowMo ?? 0;
      initialData.args = Array.isArray(currentData.args)
        ? currentData.args.join(" ")
        : (currentData.args ?? "");
      initialData.endpoint = currentData.endpoint ?? "";
      initialData.browserId =
        currentData.browserId ?? currentData.instanceId ?? "";
    } else {
      fields.forEach((field) => {
        let value = currentData[field.name];
        if (
          (field.type === "text" || field.type === "args") &&
          Array.isArray(value)
        ) {
          value = value.join(" ");
        }
        initialData[field.name] =
          value ??
          field.defaultValue ??
          (field.type === "checkbox" ? false : "");
      });
    }

    setFormData(initialData);
    setErrors({});
    setIsDirty(false);
  }, [action?.nodeId, action?.type, action?.currentData]);

  const validateField = (fieldConfig, value) => {
    if (!fieldConfig) return null;
    if (
      fieldConfig.required &&
      (value === "" || value === undefined || value === null)
    ) {
      return `${fieldConfig.label || fieldConfig.name} es requerido`;
    }
    if (fieldConfig.validation) return fieldConfig.validation(value, formData);
    return null;
  };

  const validateForm = () => {
    const fields = NODE_FIELD_CONFIGS[action?.type] || [];
    const newErrors = {};

    if (fields.length === 0) {
      if (action?.type === "open_url") {
        if (!formData.url) newErrors.url = "URL requerida";
      }
    } else {
      fields.forEach((field) => {
        const err = validateField(field, formData[field.name]);
        if (err) newErrors[field.name] = err;
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setIsDirty(true);
    if (errors[name]) {
      setErrors((prev) => {
        const c = { ...prev };
        delete c[name];
        return c;
      });
    }
  };

  const handleSave = async () => {
    const normalized = { ...formData };
    if (normalized.slowMo !== undefined && normalized.slowMo !== "")
      normalized.slowMo = Number(normalized.slowMo);
    if (typeof updateNodeConfiguration === "function" && action?.nodeId) {
      try {
        updateNodeConfiguration(action.nodeId, normalized);
        setIsDirty(false);
      } catch (err) {
        console.error("updateNodeConfiguration falló:", err);
        alert("No se pudo guardar: " + err.message);
      }
    } else {
      setIsDirty(false);
    }
  };

  const handleExecute = async () => {
    const valid = validateForm();
    if (!valid) return;
    await handleSave();
    if (!action) return;

    // Construir payload según tipo
    let payload = {};
    if (action.type === "launch_browser") {
      payload = {
        browserType: formData.browserType ?? "chromium",
        headless: !!formData.headless,
        slowMo: Number(formData.slowMo) || 0,
        args: formData.args ?? "",
      };
    } else if (action.type === "open_url") {
      payload = {
        url: formData.url,
        waitUntil: formData.waitUntil ?? "domcontentloaded",
        timeout: Number(formData.timeout) || 20000,
        browserId: formData.browserId ?? "",
      };
    } else {
      // generic: enviar formData tal cual
      payload = { ...formData };
    }

    if (formData.endpoint && formData.endpoint.trim() !== "")
      payload.endpoint = formData.endpoint.trim();

    try {
      const success = await onExecute({
        nodeId: action.nodeId,
        type: action.type,
        payload,
      });
      if (!success)
        alert("La ejecución del nodo falló. Revisa la consola o apiStatus.");
      else setIsDirty(false);
    } catch (err) {
      console.error("Error ejecutando:", err);
      alert("Error ejecutando: " + err.message);
    }
  };

  const handleDelete = () => {
    if (!action) return;
    if (
      window.confirm("¿Eliminar este nodo? Esta acción no se puede deshacer.")
    ) {
      onDeleteNode(action.nodeId);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (
        !window.confirm(
          "Hay cambios sin guardar. ¿Deseas descartarlos y cerrar?",
        )
      )
        return;
    }
    onClose();
  };

  // Helper: lista de launch_browser ejecutados con instanceId/browserId
  const launchedBrowsers = (nodes || []).filter(
    (n) =>
      n.data?.type === "launch_browser" &&
      (n.data?.configuration?.instanceId || n.data?.configuration?.browserId),
  );

  const renderField = (fieldConfig) => {
    const { name, label, type, placeholder, options, min, max } = fieldConfig;
    const value =
      formData[name] ?? (fieldConfig.type === "checkbox" ? false : "");
    const error = errors[name];

    const commonProps = {
      name,
      onChange: handleChange,
      className: error ? "input-error" : "",
    };

    if (type === "select") {
      return (
        <div key={name} className="field-group">
          <label>
            {label}
            {fieldConfig.required && <span className="required">*</span>}
          </label>
          <select {...commonProps} value={value}>
            <option value="">Selecciona...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && (
            <span className="field-error">
              <AlertCircle size={14} /> {error}
            </span>
          )}
        </div>
      );
    }

    if (type === "checkbox") {
      return (
        <div key={name} className="field-group checkbox-field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name={name}
              checked={!!value}
              onChange={handleChange}
            />
            <span>{label}</span>
          </label>
          {error && (
            <span className="field-error">
              <AlertCircle size={14} /> {error}
            </span>
          )}
        </div>
      );
    }

    if (type === "number") {
      return (
        <div key={name} className="field-group">
          <label>
            {label}
            {fieldConfig.required && <span className="required">*</span>}
          </label>
          <input
            type="number"
            {...commonProps}
            value={value}
            placeholder={placeholder}
            min={min}
            max={max}
          />
          {error && (
            <span className="field-error">
              <AlertCircle size={14} /> {error}
            </span>
          )}
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div key={name} className="field-group">
          <label>
            {label}
            {fieldConfig.required && <span className="required">*</span>}
          </label>
          <textarea
            {...commonProps}
            value={value}
            placeholder={placeholder}
            rows={4}
          />
          {error && (
            <span className="field-error">
              <AlertCircle size={14} /> {error}
            </span>
          )}
        </div>
      );
    }

    // default text
    return (
      <div key={name} className="field-group">
        <label>
          {label}
          {fieldConfig.required && <span className="required">*</span>}
        </label>
        <input
          type="text"
          {...commonProps}
          value={value}
          placeholder={placeholder}
        />
        {error && (
          <span className="field-error">
            <AlertCircle size={14} /> {error}
          </span>
        )}
      </div>
    );
  };

  const renderFields = () => {
    const fields = NODE_FIELD_CONFIGS[action?.type] || [];
    if (!action) return null;

    if (!fields || fields.length === 0) {
      // default UI for launch_browser/open_url
      if (action.type === "launch_browser") {
        return (
          <>
            <div className="field-group">
              <label>Tipo de navegador</label>
              <select
                name="browserType"
                value={formData.browserType ?? "chromium"}
                onChange={handleChange}
              >
                <option value="chromium">chromium</option>
                <option value="firefox">firefox</option>
                <option value="webkit">webkit</option>
              </select>
            </div>
            <div className="field-group checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="headless"
                  checked={!!formData.headless}
                  onChange={handleChange}
                />{" "}
                <span>Headless</span>
              </label>
            </div>
            <div className="field-group">
              <label>SlowMo (ms)</label>
              <input
                type="number"
                name="slowMo"
                value={formData.slowMo ?? 0}
                onChange={handleChange}
              />
            </div>
            <div className="field-group">
              <label>Args (string)</label>
              <input
                type="text"
                name="args"
                value={formData.args ?? ""}
                onChange={handleChange}
                placeholder="--start-maximized"
              />
              <small className="field-hint">
                Se enviará tal cual como string.
              </small>
            </div>
            <div className="field-group">
              <label>Endpoint (opcional)</label>
              <input
                type="text"
                name="endpoint"
                value={formData.endpoint ?? ""}
                onChange={handleChange}
                placeholder="http://localhost:2001/api/actions/launch_browser"
              />
            </div>
          </>
        );
      }

      if (action.type === "open_url") {
        return (
          <>
            <div className="field-group">
              <label>URL</label>
              <input
                type="text"
                name="url"
                value={formData.url ?? ""}
                onChange={handleChange}
                placeholder="https://www.google.com"
              />
            </div>

            <div className="field-group">
              <label>waitUntil</label>
              <select
                name="waitUntil"
                value={formData.waitUntil ?? "domcontentloaded"}
                onChange={handleChange}
              >
                <option value="load">load</option>
                <option value="domcontentloaded">domcontentloaded</option>
                <option value="networkidle0">networkidle0</option>
                <option value="networkidle2">networkidle2</option>
              </select>
            </div>

            <div className="field-group">
              <label>Timeout (ms)</label>
              <input
                type="number"
                name="timeout"
                value={formData.timeout ?? 20000}
                onChange={handleChange}
              />
            </div>

            <div className="field-group">
              <label>Browser ID (usar instancia lanzada)</label>
              <select
                name="browserId"
                value={formData.browserId ?? ""}
                onChange={handleChange}
              >
                <option value="">Selecciona una instancia...</option>
                {launchedBrowsers.map((n) => {
                  const id =
                    n.data?.configuration?.instanceId ??
                    n.data?.configuration?.browserId ??
                    "";
                  return (
                    <option key={n.id} value={id}>
                      {id} — {n.data?.label || n.id}
                    </option>
                  );
                })}
              </select>
              <small className="field-hint">
                También puedes escribir manualmente un browserId si lo
                prefieres.
              </small>
            </div>

            <div className="field-group">
              <label>Endpoint (opcional)</label>
              <input
                type="text"
                name="endpoint"
                value={formData.endpoint ?? ""}
                onChange={handleChange}
                placeholder="http://localhost:2001/api/actions/open_url"
              />
            </div>
          </>
        );
      }

      // fallback generic: show raw keys from current data
      return Object.keys(formData).map((k) => (
        <div className="field-group" key={k}>
          <label>{k}</label>
          <input
            type="text"
            name={k}
            value={formData[k] ?? ""}
            onChange={handleChange}
          />
        </div>
      ));
    }

    return fields.map(renderField);
  };

  if (!action) return null;
  const hasErrors = Object.keys(errors).length > 0;
  const canExecute = !hasErrors;

  return (
    <aside
      className={`config-panel ${isVisible ? "visible" : ""}`}
      aria-hidden={!isVisible}
    >
      <div className="config-header">
        <h2>
          Configurar: <span className="node-type">{action.type}</span>
        </h2>
        <button
          className="btn-close-panel"
          onClick={handleClose}
          aria-label="Cerrar panel"
        >
          <XCircle size={22} />
        </button>
      </div>

      <div className="config-body">
        {renderFields()}

        {isDirty && (
          <div className="unsaved-changes">
            <AlertCircle size={16} />
            <span>Cambios sin guardar</span>
          </div>
        )}
      </div>

      <div className="config-footer">
        <button
          className={`btn-run ${!canExecute ? "disabled" : ""}`}
          onClick={handleExecute}
          disabled={!canExecute}
        >
          <Play size={18} /> Ejecutar
        </button>
        <button className="btn-cancel" onClick={handleClose}>
          Cancelar
        </button>
        <button className="btn-delete" onClick={handleDelete}>
          <Trash2 size={18} /> Eliminar
        </button>
      </div>
    </aside>
  );
}
