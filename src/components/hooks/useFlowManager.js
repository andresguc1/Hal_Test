// hal_test/src/components/hooks/useFlowManager.js
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

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- CONFIG: base API URL ---
// Preferencia: usa Vite env var VITE_API_BASE si existe, sino usar proxy ("/api/actions")
export const API_BASE_URL = import.meta.env?.VITE_API_BASE ?? "/api/actions"; // <-- keep trailing '/api/actions' or set to 'http://localhost:2001/api/actions'

// --- OPTIMIZACIÓN: Funciones puras movidas fuera del hook ---
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

  // refs estables
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // topologicalSort (Kahn)
  const topologicalSort = useCallback((nodesList, edgesList) => {
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

  // historial estable
  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [
        ...prev.past,
        { nodes: nodesRef.current, edges: edgesRef.current },
      ],
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      const newFuture = [
        { nodes: nodesRef.current, edges: edgesRef.current },
        ...prev.future,
      ];
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return { past: newPast, future: newFuture };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      const newPast = [
        ...prev.past,
        { nodes: nodesRef.current, edges: edgesRef.current },
      ];
      setNodes(next.nodes);
      setEdges(next.edges);
      return { past: newPast, future: newFuture };
    });
  }, []);

  // Operaciones de nodo
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

  // --- executeStep robusto ---
  const executeStep = useCallback(async (action) => {
    if (!action || !action.nodeId) {
      console.warn("executeStep: acción inválida", action);
      return false;
    }

    const { nodeId, type, payload } = action;

    // Endpoint resolved via API_BASE_URL (puede ser relativo /api/actions o absoluto)
    const endpoint = (payload && payload.endpoint) || `${API_BASE_URL}/${type}`;

    setIsLoading(true);
    setApiStatus({
      state: "loading",
      message: `Ejecutando ${NODE_LABELS[type] || type}...`,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let bodyToSend;

      try {
        const builder = payloadBuilders[type];
        if (builder) {
          // builder puede lanzar si payload inválido
          bodyToSend = builder(payload || {});
        } else {
          bodyToSend = payload || {};
        }
      } catch (builderError) {
        console.error(
          "[executeStep] Error en payload builder para",
          type,
          builderError,
        );
        setApiStatus({
          state: "error",
          message: `Payload inválido para ${type}: ${builderError.message}`,
        });
        setIsLoading(false);
        return false;
      }

      try {
        console.log(
          "[executeStep] POST ->",
          endpoint,
          "body:",
          bodyToSend,
          "attempt:",
          attempt + 1,
        );

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyToSend),
        });

        if (!response.ok) {
          // Reintentar solo en errores de servidor (5xx)
          const text = await response.text().catch(() => "");
          let errData = null;
          try {
            errData = JSON.parse(text);
          } catch {
            console.log("debes revisar aqui");
          }
          const serverMsg =
            (errData && errData.message) || text || response.statusText;
          console.warn(
            `[executeStep] Error response ${response.status}:`,
            serverMsg,
          );

          if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
            const delay = RETRY_BASE_MS * 2 ** attempt;
            setApiStatus((prev) => ({
              ...prev,
              message: `Error ${response.status}. Reintentando en ${delay / 1000}s...`,
            }));
            await sleep(delay);
            continue; // reintentar
          }

          // error definitivo
          throw new Error(serverMsg || `Error ${response.status}`);
        }

        // OK
        const result = await response.json().catch(() => ({}));

        // Extraer instanceId/browserId si viene
        const instanceId =
          result.instanceId ??
          result.browserId ??
          (result.instance && result.instance.id) ??
          null;

        // Actualizar estado del nodo
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              const newConfig = {
                ...(node.data.configuration || {}),
                ...(payload || {}),
              };
              if (instanceId) {
                newConfig.instanceId = instanceId;
                newConfig.browserId = instanceId;
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
        return true;
      } catch (error) {
        // error de red o definitivo
        const isNetworkError =
          error.message === "Failed to fetch" ||
          error.message.includes("NetworkError") ||
          error.message.includes("Network request failed");
        const isServerError = !isNetworkError && attempt < MAX_RETRIES - 1;
        console.log("revisa server error: " + isServerError);

        console.error("[executeStep] intento failed:", error.message || error);

        if (isNetworkError && attempt < MAX_RETRIES - 1) {
          // reintentar en caso de fallo de red
          const delay = RETRY_BASE_MS * 2 ** attempt;
          setApiStatus((prev) => ({
            ...prev,
            message: `Fallo de red: ${error.message}. Reintentando en ${delay / 1000}s...`,
          }));
          await sleep(delay);
          continue;
        }

        // No reintentar: fallo definitivo
        setApiStatus({
          state: "error",
          message: `Fallo definitivo: ${error.message}`,
        });
        setIsLoading(false);
        return false;
      }
    }

    setIsLoading(false);
    return false;
  }, []);

  // edges & reactflow callbacks
  const onConnect = useCallback(
    (connection) => {
      saveToHistory();
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

  // executeFlow (usa executeStep estable)
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

  // save/load/export/import/clear
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
      saveToHistory();
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
  }, [saveFlow]);

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
          const success = loadFlow(parsed);
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
    saveToHistory();
    setNodes([]);
    setEdges([]);
    setSelectedAction(null);
    setApiStatus({ state: "idle", message: "Canvas limpio." });
  }, [saveToHistory]);

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
