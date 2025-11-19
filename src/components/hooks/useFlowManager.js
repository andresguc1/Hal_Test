// hal_test/src/components/hooks/useFlowManager.js

import { useState, useCallback, useRef, useEffect } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { NODE_LABELS, STORAGE_KEYS } from "./constants";
import * as payloadBuilders from "./payloadBuilders";
// ✨ Importación de estilos y estados separados
import { NODE_STATES, PROFESSIONAL_COLORS, getNodeStyle } from "./flowStyles";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const AUTO_SAVE_INTERVAL = 30000; // Auto-guardar cada 30s

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// API Base URL
export const API_BASE_URL = import.meta.env?.VITE_API_BASE ?? "/api/actions";

// Funciones puras
const generateNodeId = () => `node_${uuidv4()}`;

const createExecutedLabel = (action) => {
  const typeLabel = NODE_LABELS[action.type] || action.type;
  const payload = action.payload || action || {};
  let detail = "";

  // Lógica simplificada para encontrar el detalle más relevante
  if (payload.url) detail = payload.url;
  else if (payload.width && payload.height)
    detail = `${payload.width}x${payload.height}`;
  else if (payload.duration) detail = `${payload.duration}ms`;
  else if (payload.text) detail = payload.text;
  else if (payload.selector) detail = payload.selector;
  else if (payload.browserType) detail = payload.browserType;

  const fullLabel = detail ? `${typeLabel}: ${detail}` : typeLabel;
  // Límite de longitud ajustado
  return fullLabel.length > 35 ? `${fullLabel.substring(0, 32)}...` : fullLabel;
};

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
    details: null,
  });

  const [executionStats, setExecutionStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  });

  // FIX 1: setFlowChains renombrado a _setFlowChains para evitar 'no-unused-vars'
  const [_, _setFlowChains] = useState([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const executionAbortController = useRef(null);

  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Auto-guardado
  const saveFlow = useCallback(
    (silent = false) => {
      const flowData = {
        nodes,
        edges,
        viewport: getViewport(),
        timestamp: new Date().toISOString(),
        version: "2.0",
        stats: executionStats,
      };

      try {
        localStorage.setItem(
          STORAGE_KEYS.flow || "flow",
          JSON.stringify(flowData),
        );
        if (!silent) {
          setApiStatus({
            state: "success",
            message: "✓ Flujo guardado correctamente",
          });
        }
        return flowData;
      } catch (err) {
        console.error("Error al guardar el flujo en localStorage:", err);
        setApiStatus({
          state: "error",
          message: `✗ Error al guardar: ${err.message}`,
        });
        return flowData;
      }
    },
    [nodes, edges, getViewport, executionStats],
  );

  // FIX: Añadido saveFlow al array de dependencias para cumplir con 'react-hooks/exhaustive-deps'
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(() => {
      if (nodes.length > 0) {
        saveFlow(true); // silent save
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [nodes, edges, autoSaveEnabled, saveFlow]);

  // Topological Sort (Kahn's Algorithm)
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

    // Si hay ciclo, retorna la lista original.
    if (resultIds.length !== nodesList.length) {
      return nodesList;
    }

    const nodeMap = Object.fromEntries(nodesList.map((n) => [n.id, n]));
    return resultIds.map((id) => nodeMap[id]);
  }, []);

  // Actualizar estado visual del nodo
  const updateNodeState = useCallback((nodeId, state, errorDetails = null) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              state,
              errorDetails,
              lastExecuted: new Date().toISOString(),
            },
            // Se usa el estilo importado
            style: getNodeStyle(state, node.style),
          };
        }
        return node;
      }),
    );
  }, []);

  // Resetear estados
  const resetNodeStates = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          state: NODE_STATES.DEFAULT,
          executed: false,
          errorDetails: null,
          executionTime: null,
        },
        style: getNodeStyle(NODE_STATES.DEFAULT, node.style),
      })),
    );
    setExecutionStats({
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    });
    setApiStatus({
      state: "idle",
      message: "Estados de nodos reseteados",
    });
  }, []);

  // Historial (Se mantiene el límite de 20 estados)
  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [
        ...prev.past.slice(-20),
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

  // Operaciones de nodo mejoradas
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
        data: {
          label,
          type: typeKey,
          executed: false,
          configuration: {},
          state: NODE_STATES.DEFAULT,
          retryCount: 0,
          errorDetails: null,
        },
        // Posición ajustada para el zoom del viewport
        position: {
          x: viewport.x + viewport.zoom * xOffset,
          y: viewport.y + viewport.zoom * yOffset,
        },
        style: getNodeStyle(NODE_STATES.DEFAULT),
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
          data: {
            ...nodeToDup.data,
            executed: false,
            state: NODE_STATES.DEFAULT,
            errorDetails: null,
          },
          style: getNodeStyle(NODE_STATES.DEFAULT),
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

  // Ejecutar paso individual (Lógica limpia de logs innecesarios)
  const executeStep = useCallback(
    // FIX 2: Renombrado _options a __options para evitar 'no-unused-vars' en parámetros
    async (action, __options = {}) => {
      console.log("options", __options);
      if (!action || !action.nodeId) {
        console.error("Acción inválida", action);
        return { success: false, error: "Acción inválida" };
      }

      const { nodeId, type, payload } = action;
      const endpoint =
        (payload && payload.endpoint) || `${API_BASE_URL}/${type}`;

      updateNodeState(nodeId, NODE_STATES.EXECUTING);
      setIsLoading(true);
      setApiStatus({
        state: "loading",
        message: `Ejecutando ${NODE_LABELS[type] || type}...`,
        details: null,
      });

      const startTime = Date.now();
      let lastErrorDetails = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Verificar si se canceló la ejecución
        if (executionAbortController.current?.signal.aborted) {
          updateNodeState(nodeId, NODE_STATES.SKIPPED);
          setIsLoading(false);
          return {
            success: false,
            skipped: true,
            error: "Ejecución cancelada",
          };
        }

        let bodyToSend;

        try {
          const builder = payloadBuilders[type];
          bodyToSend = builder ? builder(payload || {}) : payload || {};
        } catch (builderError) {
          console.error(`Error en payload builder para ${type}:`, builderError);
          const errorMsg = `Payload inválido: ${builderError.message}`;
          lastErrorDetails = {
            message: errorMsg,
            timestamp: new Date().toISOString(),
            attempt: attempt + 1,
          };
          updateNodeState(nodeId, NODE_STATES.ERROR, lastErrorDetails);
          setApiStatus({
            state: "error",
            message: errorMsg,
            details: lastErrorDetails,
          });
          setIsLoading(false);
          return { success: false, error: errorMsg };
        }

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyToSend),
            signal: executionAbortController.current?.signal,
          });

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            let errData = null;
            try {
              errData = JSON.parse(text);
              // FIX 3: Se omite la variable en el catch para evitar 'no-unused-vars' (_e)
            } catch {
              /* Error al parsear el texto de respuesta como JSON. Se ignora. */
            }

            const serverMsg =
              (errData && errData.message) || text || response.statusText;

            // Reintentar solo en errores de servidor (5xx)
            const shouldRetry =
              response.status >= 500 && attempt < MAX_RETRIES - 1;

            if (shouldRetry) {
              const delay = RETRY_BASE_MS * 2 ** attempt;
              updateNodeState(nodeId, NODE_STATES.WARNING, {
                message: `Error ${response.status}. Reintentando...`,
                attempt: attempt + 1,
              });
              setApiStatus({
                state: "warning",
                message: `Error ${response.status}. Reintentando en ${delay / 1000}s...`,
              });
              await sleep(delay);
              continue;
            }

            // Error definitivo
            throw new Error(serverMsg || `Error ${response.status}`);
          }

          // Éxito
          const result = await response.json().catch(() => ({}));
          const duration = Date.now() - startTime;

          // Lógica simplificada para obtener el ID de instancia
          const instanceId =
            result.instanceId ??
            result.browserId ??
            result.instance?.id ??
            null;

          // Actualizar nodo con éxito
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                const newConfig = {
                  ...(node.data.configuration || {}),
                  ...(payload || {}),
                };
                if (instanceId) {
                  // Almacenar el ID de instancia/navegador para pasos posteriores
                  newConfig.instanceId = instanceId;
                  newConfig.browserId = instanceId;
                }

                return {
                  ...node,
                  data: {
                    ...node.data,
                    configuration: newConfig,
                    executed: true,
                    state: NODE_STATES.SUCCESS,
                    label: createExecutedLabel({ type, payload: newConfig }),
                    executionTime: duration,
                    result: result,
                  },
                  style: getNodeStyle(NODE_STATES.SUCCESS),
                };
              }
              return node;
            }),
          );

          setApiStatus({
            state: "success",
            message: `✓ Ejecución exitosa en ${duration}ms`,
            details: result,
          });
          setIsLoading(false);

          return {
            success: true,
            result,
            duration,
            instanceId,
          };
        } catch (error) {
          const isNetworkError =
            error.name === "AbortError" ||
            error.message === "Failed to fetch" ||
            error.message.includes("NetworkError");

          // Reintentar errores de red
          if (
            isNetworkError &&
            attempt < MAX_RETRIES - 1 &&
            error.name !== "AbortError"
          ) {
            const delay = RETRY_BASE_MS * 2 ** attempt;
            updateNodeState(nodeId, NODE_STATES.WARNING, {
              message: `Fallo de red. Reintentando...`,
              attempt: attempt + 1,
            });
            setApiStatus({
              state: "warning",
              message: `Fallo de red. Reintentando en ${delay / 1000}s...`,
            });
            await sleep(delay);
            continue;
          }

          // Fallo definitivo
          lastErrorDetails = {
            message: error.message,
            timestamp: new Date().toISOString(),
            attempts: attempt + 1,
            duration: Date.now() - startTime,
          };

          updateNodeState(nodeId, NODE_STATES.ERROR, lastErrorDetails);
          setApiStatus({
            state: "error",
            message: `✗ Fallo: ${error.message}`,
            details: lastErrorDetails,
          });
          setIsLoading(false);

          return {
            success: false,
            error: error.message,
            details: lastErrorDetails,
          };
        }
      }

      // Si el bucle termina, es que se alcanzó el máximo de reintentos
      setIsLoading(false);
      return { success: false, error: "Max reintentos alcanzados" };
    },
    [updateNodeState],
  );

  // Ejecutar flujo completo (Mejorada la detección de ciclos)
  const executeFlow = useCallback(
    async (options = {}) => {
      const { stopOnError = true } = options;

      const sortedNodes = topologicalSort(nodes, edges);

      if (!sortedNodes || sortedNodes.length === 0) {
        setApiStatus({
          state: "idle",
          message: "No hay nodos para ejecutar.",
        });
        return { success: true, stats: executionStats };
      }

      // Detener si se detecta un ciclo
      if (sortedNodes.length !== nodes.length) {
        setApiStatus({
          state: "error",
          message: "✗ Flujo no ejecutable: Ciclo detectado.",
        });
        return { success: false, error: "Ciclo detectado" };
      }

      // Inicializar controlador de cancelación y resetear estados
      executionAbortController.current = new AbortController();
      resetNodeStates();

      const startTime = Date.now();
      const stats = {
        total: sortedNodes.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };

      setExecutionStats(stats);
      setApiStatus({
        state: "loading",
        message: `Ejecutando flujo (${sortedNodes.length} pasos)...`,
      });

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        const action = {
          nodeId: node.id,
          type: node.data.type,
          payload: node.data.configuration || {},
        };

        const result = await executeStep(action, options);

        if (result.skipped) {
          stats.skipped++;
        } else if (result.success) {
          stats.successful++;
        } else {
          stats.failed++;
          if (stopOnError) {
            stats.duration = Date.now() - startTime;
            setExecutionStats(stats);
            setApiStatus({
              state: "error",
              message: `✗ Flujo detenido en paso ${i + 1}/${sortedNodes.length}`,
              details: stats,
            });
            return { success: false, stats };
          }
        }

        // Actualizar progreso
        setApiStatus({
          state: "loading",
          message: `Progreso: ${i + 1}/${sortedNodes.length} (${stats.successful} exitosos, ${stats.failed} fallidos)`,
        });
      }

      stats.duration = Date.now() - startTime;
      setExecutionStats(stats);

      const allSuccess = stats.failed === 0;
      setApiStatus({
        state: allSuccess ? "success" : "warning",
        message: allSuccess
          ? `✓ Flujo completado en ${(stats.duration / 1000).toFixed(2)}s`
          : `⚠ Flujo completado con errores (${stats.failed} fallidos)`,
        details: stats,
      });

      return { success: allSuccess, stats };
    },
    [
      nodes,
      edges,
      topologicalSort,
      executeStep,
      resetNodeStates,
      executionStats,
    ],
  );

  // Cancelar ejecución (Mejorada la lógica de estado de nodos)
  const cancelExecution = useCallback(() => {
    if (executionAbortController.current) {
      executionAbortController.current.abort();
      setApiStatus({
        state: "warning",
        message: "⚠ Ejecución cancelada por el usuario",
      });
      setIsLoading(false);
      // Restablecer nodos a SKIPPED si estaban en EXECUTING
      setNodes((nds) =>
        nds.map((node) => {
          if (node.data.state === NODE_STATES.EXECUTING) {
            return {
              ...node,
              data: { ...node.data, state: NODE_STATES.SKIPPED },
              style: getNodeStyle(NODE_STATES.SKIPPED),
            };
          }
          return node;
        }),
      );
    }
  }, []);

  // Validación de flujo (Mejorada la lógica de nodos desconectados)
  const validateFlow = useCallback(() => {
    const errors = [];
    const warnings = [];

    // Verificar nodos sin configuración
    nodes.forEach((node) => {
      if (
        !node.data.configuration ||
        Object.keys(node.data.configuration).length === 0
      ) {
        warnings.push(
          `Nodo "${node.data.label}" [${node.id}] sin configuración`,
        );
      }
    });

    // Verificar nodos desconectados (solo si hay más de 1 nodo)
    if (nodes.length > 1) {
      nodes.forEach((node) => {
        const isConnected = edges.some(
          (e) => e.source === node.id || e.target === node.id,
        );
        if (!isConnected) {
          warnings.push(
            `Nodo "${node.data.label}" [${node.id}] está desconectado`,
          );
        }
      });
    }

    // Verificar ciclos (Topological Sort falla)
    const sorted = topologicalSort(nodes, edges);
    if (sorted.length !== nodes.length) {
      errors.push("El flujo contiene ciclos (bucles infinitos)");
    }

    return { valid: errors.length === 0, errors, warnings };
  }, [nodes, edges, topologicalSort]);

  // Persistencia: Guardar/Cargar/Exportar/Importar
  // saveFlow está definido arriba

  const loadFlow = useCallback(
    (flowData) => {
      if (!flowData || !Array.isArray(flowData.nodes)) return false;
      saveToHistory();
      // Aplicar el nuevo estilo de botón al cargar
      const loadedNodes = flowData.nodes.map((n) => ({
        ...n,
        style: getNodeStyle(n.data.state || NODE_STATES.DEFAULT, n.style),
        data: {
          ...n.data,
          state: n.data.state || NODE_STATES.DEFAULT,
        },
      }));
      setNodes(loadedNodes);
      setEdges(flowData.edges || []);
      if (flowData.stats) {
        setExecutionStats(flowData.stats);
      }
      setApiStatus({
        state: "success",
        message: "✓ Flujo cargado correctamente",
      });
      return true;
    },
    [saveToHistory],
  );

  // Ejecutar flujos encadenados (Lógica mantenida y limpia)
  const executeChainedFlows = useCallback(
    async (flowIds, options = {}) => {
      const { stopOnFlowError = true } = options;

      const chainStats = {
        totalFlows: flowIds.length,
        completedFlows: 0,
        failedFlows: 0,
        totalDuration: 0,
      };

      setApiStatus({
        state: "loading",
        message: `Ejecutando ${flowIds.length} flujos encadenados...`,
      });

      const startTime = Date.now();

      for (let i = 0; i < flowIds.length; i++) {
        const flowId = flowIds[i];

        setApiStatus({
          state: "loading",
          message: `Flujo ${i + 1}/${flowIds.length}: Cargando flujo...`,
        });

        const savedFlow = localStorage.getItem(
          `${STORAGE_KEYS.flow}_${flowId}`,
        );
        if (!savedFlow) {
          chainStats.failedFlows++;
          console.error(`Flujo ${flowId} no encontrado en localStorage`);
          if (stopOnFlowError) {
            setApiStatus({
              state: "error",
              message: `✗ Flujo ${flowId} no encontrado. Cadena detenida.`,
            });
            return { success: false, stats: chainStats };
          }
          continue;
        }

        const flowData = JSON.parse(savedFlow);
        loadFlow(flowData);

        // Ejecutar flujo
        const result = await executeFlow(options);

        if (result.success) {
          chainStats.completedFlows++;
        } else {
          chainStats.failedFlows++;
          if (stopOnFlowError) {
            chainStats.totalDuration = Date.now() - startTime;
            setApiStatus({
              state: "error",
              message: `✗ Flujo ${i + 1} falló. Cadena detenida.`,
              details: chainStats,
            });
            return { success: false, stats: chainStats };
          }
        }

        await sleep(500); // Pausa breve entre flujos para estabilidad
      }

      chainStats.totalDuration = Date.now() - startTime;
      const allSuccess = chainStats.failedFlows === 0;

      setApiStatus({
        state: allSuccess ? "success" : "warning",
        message: allSuccess
          ? `✓ ${chainStats.completedFlows} flujos completados en ${(chainStats.totalDuration / 1000).toFixed(2)}s`
          : `⚠ Cadena completada: ${chainStats.completedFlows} OK, ${chainStats.failedFlows} fallidos`,
        details: chainStats,
      });

      return { success: allSuccess, stats: chainStats };
    },
    [executeFlow, loadFlow],
  );

  const exportFlow = useCallback(() => {
    const flowData = saveFlow(true);
    const blob = new Blob([JSON.stringify(flowData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setApiStatus({
      state: "success",
      message: "✓ Flujo exportado correctamente",
    });
  }, [saveFlow]);

  const importFlow = useCallback(() => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return reject(new Error("No se seleccionó archivo"));
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const success = loadFlow(parsed);
          if (success) resolve(parsed);
          else reject(new Error("Formato de flujo inválido"));
        } catch (err) {
          setApiStatus({
            state: "error",
            message: `✗ Error al importar: ${err.message}`,
          });
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
    setExecutionStats({
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    });
    setApiStatus({
      state: "idle",
      message: "Canvas limpio",
    });
  }, [saveToHistory]);

  // ReactFlow callbacks
  const onConnect = useCallback(
    (connection) => {
      saveToHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            // Estilo de arista usando color por defecto de los botones
            style: {
              stroke: PROFESSIONAL_COLORS[NODE_STATES.DEFAULT].border,
              strokeWidth: 2,
            },
            markerEnd: {
              type: "arrowclosed",
              color: PROFESSIONAL_COLORS[NODE_STATES.DEFAULT].border,
            },
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
      state: node.data.state,
      errorDetails: node.data.errorDetails,
    });
  }, []);

  // Ejecutar solo nodos seleccionados (Mejorada la validación de ciclos)
  const executeSelectedNodes = useCallback(
    async (nodeIds, options = {}) => {
      if (!nodeIds || nodeIds.length === 0) {
        setApiStatus({
          state: "warning",
          message: "⚠ No hay nodos seleccionados",
        });
        return { success: false, error: "No nodes selected" };
      }

      // Resetear el estado de los nodos seleccionados antes de la ejecución
      const tempNodes = nodes.map((n) =>
        nodeIds.includes(n.id)
          ? {
              ...n,
              data: { ...n.data, state: NODE_STATES.DEFAULT },
              style: getNodeStyle(NODE_STATES.DEFAULT),
            }
          : n,
      );
      setNodes(tempNodes);

      const selectedNodes = tempNodes.filter((n) => nodeIds.includes(n.id));
      const sortedSelected = topologicalSort(selectedNodes, edges);

      if (sortedSelected.length !== selectedNodes.length) {
        setApiStatus({
          state: "error",
          message:
            "✗ Nodos seleccionados contienen ciclos. No se puede ejecutar.",
        });
        return { success: false, error: "Ciclo detectado" };
      }

      const stats = {
        total: sortedSelected.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };

      const startTime = Date.now();
      executionAbortController.current = new AbortController();

      for (const node of sortedSelected) {
        if (executionAbortController.current?.signal.aborted) {
          setApiStatus({ state: "warning", message: "⚠ Ejecución cancelada" });
          break;
        }

        const action = {
          nodeId: node.id,
          type: node.data.type,
          payload: node.data.configuration || {},
        };

        const result = await executeStep(action, options);

        if (result.success) {
          stats.successful++;
        } else if (result.skipped) {
          stats.skipped++;
        } else {
          stats.failed++;
          if (options.stopOnError) break;
        }
      }

      stats.duration = Date.now() - startTime;

      setApiStatus({
        state: stats.failed === 0 ? "success" : "warning",
        message: `Nodos seleccionados: ${stats.successful} OK, ${stats.failed} fallidos`,
        details: stats,
      });

      return { success: stats.failed === 0, stats };
    },
    [nodes, edges, topologicalSort, executeStep],
  );

  const getNodeDependencies = useCallback(
    (nodeId) => {
      const dependencies = new Set();
      const visited = new Set();

      const traverse = (id) => {
        if (visited.has(id)) return;
        visited.add(id);

        const incomingEdges = edges.filter((e) => e.target === id);
        incomingEdges.forEach((edge) => {
          dependencies.add(edge.source);
          traverse(edge.source);
        });
      };

      traverse(nodeId);
      return Array.from(dependencies);
    },
    [edges],
  );

  const cloneFlow = useCallback(() => {
    saveToHistory();

    const idMap = {};
    const offset = 300;

    const clonedNodes = nodes.map((node) => {
      const newId = generateNodeId();
      idMap[node.id] = newId;

      return {
        ...JSON.parse(JSON.stringify(node)),
        id: newId,
        position: {
          x: node.position.x + offset,
          y: node.position.y,
        },
        data: {
          ...node.data,
          executed: false,
          state: NODE_STATES.DEFAULT,
          errorDetails: null,
        },
        style: getNodeStyle(NODE_STATES.DEFAULT),
      };
    });

    const clonedEdges = edges
      .map((edge) => {
        if (idMap[edge.source] && idMap[edge.target]) {
          return {
            ...edge,
            id: `${idMap[edge.source]}-${idMap[edge.target]}`,
            source: idMap[edge.source],
            target: idMap[edge.target],
            style: edge.style || {
              stroke: PROFESSIONAL_COLORS[NODE_STATES.DEFAULT].border,
              strokeWidth: 2,
            },
            markerEnd: edge.markerEnd || {
              type: "arrowclosed",
              color: PROFESSIONAL_COLORS[NODE_STATES.DEFAULT].border,
            },
          };
        }
        return null;
      })
      .filter((e) => e !== null);

    setNodes((nds) => [...nds, ...clonedNodes]);
    setEdges((eds) => [...eds, ...clonedEdges]);

    setApiStatus({
      state: "success",
      message: `✓ Flujo clonado: ${clonedNodes.length} nodos duplicados`,
    });
  }, [nodes, edges, saveToHistory]);

  const exportStats = useCallback(() => {
    const statsReport = {
      timestamp: new Date().toISOString(),
      flowInfo: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
      executionStats,
      nodeStates: nodes.reduce((acc, node) => {
        acc[node.data.state || NODE_STATES.DEFAULT] =
          (acc[node.data.state || NODE_STATES.DEFAULT] || 0) + 1;
        return acc;
      }, {}),
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        state: node.data.state,
        executed: node.data.executed,
        executionTime: node.data.executionTime,
        errorDetails: node.data.errorDetails,
      })),
    };

    const blob = new Blob([JSON.stringify(statsReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow_stats_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setApiStatus({
      state: "success",
      message: "✓ Estadísticas exportadas",
    });
  }, [nodes, edges, executionStats]);

  const searchNodes = useCallback(
    (criteria) => {
      const { type, state, hasErrors, text } = criteria;

      return nodes.filter((node) => {
        if (type && node.data.type !== type) return false;
        if (state && node.data.state !== state) return false;
        if (hasErrors && node.data.state !== NODE_STATES.ERROR) return false;
        if (text) {
          const searchText = text.toLowerCase();
          const nodeText =
            `${node.data.label} ${node.data.type} ${JSON.stringify(node.data.configuration)}`.toLowerCase();
          if (!nodeText.includes(searchText)) return false;
        }
        return true;
      });
    },
    [nodes],
  );

  const autoLayoutNodes = useCallback(() => {
    saveToHistory();

    // Mejorada la lógica de auto-layout para manejar ciclos
    const sorted = topologicalSort(nodes, edges);
    if (sorted.length !== nodes.length) {
      setApiStatus({
        state: "error",
        message: "✗ No se puede auto-organizar: Ciclo detectado en el flujo.",
      });
      return;
    }

    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 80;

    const levels = {};
    const inDegree = {};

    nodes.forEach((n) => {
      inDegree[n.id] = 0;
    });
    edges.forEach((e) => {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    const assignLevel = (nodeId, level = 0, currentPath = new Set()) => {
      if (currentPath.has(nodeId)) return;

      levels[nodeId] = Math.max(levels[nodeId] || 0, level);

      const outgoing = edges.filter((e) => e.source === nodeId);
      currentPath.add(nodeId);
      outgoing.forEach((e) => {
        assignLevel(e.target, level + 1, currentPath);
      });
      currentPath.delete(nodeId);
    };

    nodes.forEach((node) => {
      if (inDegree[node.id] === 0) {
        assignLevel(node.id);
      }
    });

    nodes.forEach((node) => {
      if (levels[node.id] === undefined) {
        levels[node.id] = 0;
      }
    });

    const nodesByLevel = {};
    Object.entries(levels).forEach(([nodeId, level]) => {
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(nodeId);
    });

    const updatedNodes = nodes.map((node) => {
      const level = levels[node.id];
      const indexInLevel = nodesByLevel[level].indexOf(node.id);

      return {
        ...node,
        position: {
          x: level * HORIZONTAL_SPACING,
          y:
            (indexInLevel - (nodesByLevel[level].length - 1) / 2) *
            VERTICAL_SPACING,
        },
      };
    });

    setNodes(updatedNodes);
    setApiStatus({
      state: "success",
      message: "✓ Nodos organizados automáticamente",
    });
  }, [nodes, edges, topologicalSort, saveToHistory]);

  return {
    // Estados básicos
    nodes,
    edges,
    selectedAction,
    history,
    isLoading,
    apiStatus,
    executionStats,
    autoSaveEnabled,

    // Setters
    setNodes,
    setEdges,
    setSelectedAction,
    setAutoSaveEnabled,

    // Operaciones de nodo
    addNode,
    deleteNode,
    duplicateNode,
    updateNodeConfiguration,
    updateNodeState,

    // Ejecución
    executeStep,
    executeFlow,
    executeChainedFlows,
    executeSelectedNodes,
    cancelExecution,

    // ReactFlow callbacks
    onConnect,
    onNodesChange,
    onEdgesChange,
    onNodeClick,

    // Persistencia
    saveFlow,
    loadFlow,
    exportFlow,
    importFlow,
    clearFlow,

    // Historial
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,

    // Validación y análisis
    validateFlow,
    getNodeDependencies,
    searchNodes,

    // Utilidades avanzadas
    resetNodeStates,
    cloneFlow,
    autoLayoutNodes,
    exportStats,
    topologicalSort,

    // Constantes exportadas
    NODE_STATES,
    PROFESSIONAL_COLORS,
  };
};
