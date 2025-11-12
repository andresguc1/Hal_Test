// useFlowManager.js
import { useState, useCallback, useRef } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { NODE_LABELS, NODE_STATE_COLORS, STORAGE_KEYS } from "./constants";
import * as payloadBuilders from "./payloadBuilders";

const API_BASE_URL = "http://localhost:2001/api/actions";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- OPTIMIZACIÓN: Funciones puras movidas fuera del hook ---
// Se crean una sola vez.

const generateNodeId = () => `node_${uuidv4()}`;

const createExecutedLabel = (action) => {
  const typeLabel = NODE_LABELS[action.type] || action.type;
  const payload = action.payload || action || {};
  let detail = "";
  if (payload.url) detail = payload.url;
  else if (payload.width && payload.height)
    detail = `${payload.width}x${payload.height}`;
  else if (payload.duration) detail = `${payload.duration}ms`;
  else if (payload.text) detail = payload.text;
  else if (payload.selector) detail = payload.selector;
  else if (payload.browserType) detail = payload.browserType;

  const fullLabel = detail ? `${typeLabel}: ${detail}` : typeLabel;
  return fullLabel.length > 35 ? `${fullLabel.substring(0, 32)}...` : fullLabel;
};
// -----------------------------------------------------------

export const useFlowManager = () => {
  const { getViewport } = useReactFlow();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [history, setHistory] = useState({ past: [], future: [] });

  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    state: "idle",
    message: "Esperando acción...",
  });

  // --- OPTIMIZACIÓN: Refs para estado estable ---
  // Mantenemos una referencia siempre actualizada del estado
  // para que los callbacks no necesiten depender de [nodes, edges].
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  // ---------------------------------------------

  // topologicalSort (Kahn)
  const topologicalSort = useCallback((nodesList, edgesList) => {
    // ... (sin cambios en esta lógica) ...
    if (!nodesList || nodesList.length === 0) return [];
    const indegree = {};
    const adj = {};
    nodesList.forEach((n) => {
      indegree[n.id] = 0;
      adj[n.id] = [];
    });
    (edgesList || []).forEach((e) => {
      if (adj[e.source]) {
        adj[e.source].push(e.target);
        indegree[e.target] = (indegree[e.target] || 0) + 1;
      }
    });
    const queue = [];
    Object.keys(indegree).forEach((id) => {
      if (indegree[id] === 0) queue.push(id);
    });
    const resultIds = [];
    while (queue.length > 0) {
      const id = queue.shift();
      resultIds.push(id);
      (adj[id] || []).forEach((nei) => {
        indegree[nei] -= 1;
        if (indegree[nei] === 0) queue.push(nei);
      });
    }
    if (resultIds.length !== nodesList.length) {
      console.warn(
        "topologicalSort: ciclo detectado. Retornando orden original.",
      );
      return nodesList;
    }
    const nodeMap = Object.fromEntries(nodesList.map((n) => [n.id, n]));
    return resultIds.map((id) => nodeMap[id]);
  }, []);

  // --- OPTIMIZACIÓN: Callbacks de historial estables ---
  const saveToHistory = useCallback(() => {
    // Obtenemos el estado actual de las refs
    setHistory((prev) => ({
      past: [
        ...prev.past,
        { nodes: nodesRef.current, edges: edgesRef.current },
      ],
      future: [],
    }));
  }, []); // Dependencia vacía = ¡Estable!

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      // Guardamos el estado actual (de las refs) en 'future'
      const newFuture = [
        { nodes: nodesRef.current, edges: edgesRef.current },
        ...prev.future,
      ];
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return { past: newPast, future: newFuture };
    });
  }, []); // Dependencia vacía = ¡Estable!

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      // Guardamos el estado actual (de las refs) en 'past'
      const newPast = [
        ...prev.past,
        { nodes: nodesRef.current, edges: edgesRef.current },
      ];
      setNodes(next.nodes);
      setEdges(next.edges);
      return { past: newPast, future: newFuture };
    });
  }, []); // Dependencia vacía = ¡Estable!

  // --- Operaciones de Nodo (ahora estables) ---
  // (Dependen de saveToHistory, que ahora es estable)

  const addNode = useCallback(
    (typeKey) => {
      saveToHistory();
      const viewport = getViewport();
      const xOffset = 200;
      const yOffset = 50;
      const id = generateNodeId();
      const label = NODE_LABELS[typeKey] || typeKey;

      const newNode = {
        id,
        data: { label, type: typeKey, executed: false, configuration: {} },
        position: { x: viewport.x + xOffset, y: viewport.y + yOffset },
        style: {
          background: NODE_STATE_COLORS.default.background,
          color: NODE_STATE_COLORS.default.text,
          border: `1px solid ${NODE_STATE_COLORS.default.border}`,
          padding: "10px 15px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "500",
        },
        sourcePosition: "right",
        targetPosition: "left",
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedAction({
        type: typeKey,
        nodeId: id,
        currentData: newNode.data.configuration,
      });
    },
    [getViewport, saveToHistory],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      saveToHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedAction(null);
    },
    [saveToHistory],
  );

  const duplicateNode = useCallback(
    (nodeId) => {
      saveToHistory();
      setNodes((nds) => {
        const nodeToDup = nds.find((n) => n.id === nodeId);
        if (!nodeToDup) return nds;
        const newId = generateNodeId();
        const newNode = {
          ...JSON.parse(JSON.stringify(nodeToDup)),
          id: newId,
          position: {
            x: nodeToDup.position.x + 50,
            y: nodeToDup.position.y + 50,
          },
          data: { ...nodeToDup.data, executed: false },
        };
        return [...nds, newNode];
      });
    },
    [saveToHistory],
  );

  const updateNodeConfiguration = useCallback(
    (nodeId, newConfig) => {
      saveToHistory();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            const updated = {
              ...n,
              data: {
                ...n.data,
                configuration: newConfig,
                label: n.data.label || NODE_LABELS[n.data.type] || n.data.type,
              },
            };
            setSelectedAction((prev) =>
              prev && prev.nodeId === nodeId
                ? { ...prev, currentData: newConfig }
                : prev,
            );
            return updated;
          }
          return n;
        }),
      );
    },
    [saveToHistory],
  );

  // --- OPTIMIZACIÓN: executeStep Refactorizado ---
  // Ahora es mucho más corto. Delega la validación y construcción
  // del payload a `payloadBuilders` y se centra en el fetch y reintentos.
  const executeStep = useCallback(async (action) => {
    if (!action || !action.nodeId) {
      console.warn("executeStep: acción inválida", action);
      return false;
    }

    const { nodeId, type, payload } = action;
    const endpoint =
      payload && payload.endpoint
        ? payload.endpoint
        : `${API_BASE_URL}/${type}`;

    setIsLoading(true);
    setApiStatus({
      state: "loading",
      message: `Ejecutando ${NODE_LABELS[type] || type}...`,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let bodyToSend;

      try {
        // --- OPTIMIZACIÓN: Patrón de Despacho (Dispatch) ---
        // Busca un builder específico para este tipo
        const builder = payloadBuilders[type];

        if (builder) {
          // Si existe, úsalo para sanear/validar el payload
          // Esto PUEDE lanzar un error si la validación falla
          bodyToSend = builder(payload || {});
        } else {
          // Si no hay builder, envía el payload tal cual
          bodyToSend = payload || {};
        }
        // --------------------------------------------------

        // -----------------------------
        // Petición (Lógica sin cambios)
        // -----------------------------
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyToSend),
        });

        if (!response.ok) {
          if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
            const delay = RETRY_BASE_MS * 2 ** attempt;
            setApiStatus((prev) => ({
              ...prev,
              message: `Error ${response.status}. Reintentando en ${delay / 1000}s...`,
            }));
            await sleep(delay);
            continue;
          }
          const errorData = await response
            .json()
            .catch(() => ({ message: "Respuesta sin JSON" }));
          throw new Error(
            `Error ${response.status}: ${errorData.message || "Ejecución fallida en backend."}`,
          );
        }

        const result = await response.json();

        // Extraer instanceId/browserId si el backend lo devuelve
        const instanceId =
          result.instanceId ??
          result.browserId ??
          (result.instance && result.instance.id) ??
          null;

        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              const newConfig = {
                ...(node.data.configuration || {}),
                ...(payload || {}),
              };
              if (instanceId) {
                newConfig.instanceId = instanceId;
                newConfig.browserId = instanceId; // alias
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  configuration: newConfig,
                  executed: true,
                  label: createExecutedLabel({ type, payload: newConfig }),
                },
                style: {
                  ...node.style,
                  background: NODE_STATE_COLORS.executed.background,
                  border: `2px solid ${NODE_STATE_COLORS.executed.border}`,
                  color: NODE_STATE_COLORS.executed.text,
                },
              };
            }
            return node;
          }),
        );

        setApiStatus({
          state: "success",
          message: `Ejecución exitosa. Resultado: ${result.status || "OK"}`,
        });
        setIsLoading(false);
        return true; // Éxito, salimos del loop
      } catch (error) {
        // El catch ahora maneja errores de validación (del builder) Y errores de red/fetch

        // No reintentar en errores de validación (ej. "browserId obligatorio")
        const isValidationError =
          error.message.includes("obligatorio") ||
          error.message.includes("inválid");

        if (!isValidationError && attempt < MAX_RETRIES - 1) {
          // Es un error de red/conexión, reintentamos
          const delay = RETRY_BASE_MS * 2 ** attempt;
          setApiStatus((prev) => ({
            ...prev,
            message: `Error: ${error.message}. Reintentando en ${delay / 1000}s...`,
          }));
          await sleep(delay);
          continue;
        }

        // Error definitivo (sea de validación o fallo final de red)
        setApiStatus({
          state: "error",
          message: `Fallo definitivo: ${error.message}`,
        });
        setIsLoading(false);
        return false; // Fallo, salimos del loop
      }
    }

    setIsLoading(false);
    return false;
  }, []); // Este hook es estable (no depende de props/estado)

  // edges & reactflow callbacks
  const onConnect = useCallback(
    (connection) => {
      saveToHistory(); // Estable
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#1A73E8", strokeWidth: 2 },
            markerEnd: { type: "arrowclosed", color: "#1A73E8" },
          },
          eds,
        ),
      );
    },
    [saveToHistory],
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onNodeClick = useCallback((event, node) => {
    setSelectedAction({
      type: node.data.type,
      nodeId: node.id,
      currentData: node.data.configuration || {},
    });
  }, []);

  // executeFlow (sin cambios, pero ahora depende de un executeStep estable)
  const executeFlow = useCallback(async () => {
    const sortedNodes = topologicalSort(nodes, edges);
    if (!sortedNodes || sortedNodes.length === 0) {
      setApiStatus({ state: "idle", message: "No hay nodos para ejecutar." });
      return true;
    }
    setApiStatus({
      state: "loading",
      message: `Ejecutando flujo completo (${sortedNodes.length} pasos)...`,
    });
    for (const node of sortedNodes) {
      const action = {
        nodeId: node.id,
        type: node.data.type,
        payload: node.data.configuration || {},
      };
      const success = await executeStep(action);
      if (!success) {
        setApiStatus((prev) => ({
          ...prev,
          message: `Ejecución detenida en nodo ${node.id}.`,
        }));
        return false;
      }
    }
    setApiStatus({
      state: "success",
      message: "Flujo completado correctamente.",
    });
    return true;
  }, [nodes, edges, topologicalSort, executeStep]);

  // Save/load/export/import/clear (sin cambios funcionales)
  const saveFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      viewport: getViewport(),
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
    try {
      localStorage.setItem(
        STORAGE_KEYS.flow || "flow",
        JSON.stringify(flowData),
      );
      setApiStatus({
        state: "success",
        message: "Flujo guardado en localStorage.",
      });
    } catch (err) {
      setApiStatus({
        state: "error",
        message: `No se pudo guardar: ${err.message}`,
      });
    }
    return flowData;
  }, [nodes, edges, getViewport]);

  const loadFlow = useCallback(
    (flowData) => {
      if (!flowData || !flowData.nodes) return false;
      saveToHistory(); // Estable
      setNodes(flowData.nodes);
      setEdges(flowData.edges || []);
      setApiStatus({ state: "success", message: "Flujo cargado." });
      return true;
    },
    [saveToHistory],
  );

  const exportFlow = useCallback(() => {
    const flowData = saveFlow();
    const blob = new Blob([JSON.stringify(flowData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [saveFlow]); // Este sigue dependiendo de saveFlow (que depende de nodes/edges), lo cual es correcto.

  const importFlow = useCallback(() => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return reject(new Error("No file selected"));
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const success = loadFlow(parsed); // loadFlow ahora es estable
          if (success) resolve(parsed);
          else reject(new Error("Formato de flujo inválido"));
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }, [loadFlow]);

  const clearFlow = useCallback(() => {
    saveToHistory(); // Estable
    setNodes([]);
    setEdges([]);
    setSelectedAction(null);
    setApiStatus({ state: "idle", message: "Canvas limpio." });
  }, [saveToHistory]);

  // --- Retorno del Hook (sin cambios) ---
  return {
    nodes,
    edges,
    selectedAction,
    history,
    isLoading,
    apiStatus,

    setNodes,
    setEdges,
    setSelectedAction,

    addNode,
    deleteNode,
    duplicateNode,
    updateNodeConfiguration,
    executeStep,

    onConnect,

    onNodesChange,
    onEdgesChange,
    onNodeClick,

    executeFlow,
    saveFlow,
    loadFlow,
    exportFlow,
    importFlow,
    clearFlow,

    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
};
