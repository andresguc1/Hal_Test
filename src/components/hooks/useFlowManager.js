// hal_test/src/components/hooks/useFlowManager.js
// ✨ VERSIÓN OPTIMIZADA según best practices de React Flow

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { NODE_LABELS, STORAGE_KEYS, SCREENSHOT_RECOMMENDATIONS, VISUAL_CHANGE_NODES } from "./constants";
import * as payloadBuilders from "./payloadBuilders";
import { NODE_STATES, PROFESSIONAL_COLORS, getNodeStyle } from "./flowStyles";
import { debounce, wouldCreateCycle } from "../../utils/flowUtils";
import { logger } from "../../utils/logger";
import screenshotManager from "../../utils/ScreenshotManager";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const AUTO_SAVE_INTERVAL = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const API_BASE_URL = import.meta.env?.VITE_API_BASE ?? "/api/actions";

// ========================================
// OPTIMIZACIÓN 1: Funciones puras fuera del hook
// ========================================
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

// ========================================
// OPTIMIZACIÓN 2: Memoización de estilos de edges
// ========================================
const DEFAULT_EDGE_OPTIONS = {
  animated: true,
  style: {
    stroke: "#B0B0B0", // metallicSilver
    strokeWidth: 2,
  },
  markerEnd: {
    type: "arrowclosed",
    color: "#B0B0B0", // metallicSilver
  },
  // Hacer los edges seleccionables y eliminables
  focusable: true,
  deletable: true,
  // Estilos cuando el edge está seleccionado
  selectedStyle: {
    stroke: "#FF8C32", // halOrange
    strokeWidth: 3,
  },
};

import { projectManager } from "../../utils/ProjectManager";

export const useFlowManager = (currentProject, currentFlowId) => {
  const { getViewport } = useReactFlow();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
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

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [changeCounter, setChangeCounter] = useState(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const executionAbortController = useRef(null);

  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Compute selectedAction from current nodes state
  const selectedAction = useMemo(() => {
    if (!selectedNodeId) return null;

    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return null;

    return {
      type: node.data.type,
      nodeId: node.id,
      currentData: node.data.configuration || {},
      data: node.data, // Include full node data for screenshots
    };
  }, [selectedNodeId, nodes]);

  // ========================================
  // LOAD FLOW DATA
  // ========================================
  useEffect(() => {
    const loadFlowData = async () => {
      if (currentProject && currentFlowId) {
        // Find flow in project data first (fastest)
        let flow = currentProject.flows.find(f => f.id === currentFlowId);

        // If not found or needs refresh, fetch from DB
        if (!flow) {
          try {
            flow = await projectManager.getFlow(currentProject.id, currentFlowId);
          } catch (err) {
            console.error("Error loading flow:", err);
          }
        }

        if (flow) {
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          // DISABLED: Auto-focus was causing issues
          // if (flow.viewport) {
          //   setViewport(flow.viewport);
          // }
          // Reset history on flow switch
          setHistory({ past: [], future: [] });
        }
      }
    };

    loadFlowData();
  }, [currentProject, currentFlowId]);

  // ========================================
  // OPTIMIZACIÓN: Cleanup de AbortController
  // ========================================
  useEffect(() => {
    return () => {
      // Cleanup al desmontar componente
      if (executionAbortController.current) {
        executionAbortController.current.abort();
        executionAbortController.current = null;
        logger.debug("AbortController cleaned up", null, "useFlowManager");
      }
    };
  }, []);

  // ========================================
  // OPTIMIZACIÓN 3: Topological Sort memoizado
  // ========================================
  const topologicalSort = useMemo(() => {
    return (nodesList, edgesList) => {
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
        return nodesList;
      }

      const nodeMap = Object.fromEntries(nodesList.map((n) => [n.id, n]));
      return resultIds.map((id) => nodeMap[id]);
    };
  }, []); // Función pura, no necesita dependencias

  // ========================================
  // OPTIMIZACIÓN 4: useCallback con deps correctas
  // ========================================
  const saveFlow = useCallback(
    async (silent = false) => {
      if (!currentProject || !currentFlowId) return;

      const flowData = {
        nodes,
        edges,
        viewport: getViewport(),
        updatedAt: new Date().toISOString()
      };

      try {
        await projectManager.updateFlow(
          currentProject.id,
          currentFlowId,
          flowData
        );

        if (!silent) {
          setApiStatus({
            state: "success",
            message: "✓ Flujo guardado correctamente",
          });
        }

        // Increment change counter for versioning
        setChangeCounter(prev => prev + 1);

        return flowData;
      } catch (err) {
        logger.error("Error al guardar el flujo", err, "useFlowManager");
        setApiStatus({
          state: "error",
          message: `✗ Error al guardar: ${err.message}`,
        });
        return flowData;
      }
    },
    [nodes, edges, getViewport, currentProject, currentFlowId],
  );

  // ========================================
  // OPTIMIZACIÓN: Auto-guardado con debounce
  // ========================================
  useEffect(() => {
    if (!autoSaveEnabled || !currentProject || !currentFlowId) return;

    // Debounce de 2 segundos - solo guarda si no hay cambios recientes
    const debouncedSave = debounce(() => {
      logger.debug(
        "Auto-saving flow",
        { nodeCount: nodes.length },
        "useFlowManager",
      );
      saveFlow(true);
    }, 2000);

    debouncedSave();

    return () => {
      debouncedSave.cancel();
    };
  }, [nodes, edges, autoSaveEnabled, saveFlow, currentProject, currentFlowId]);

  // ========================================
  // VERSIONADO AUTOMÁTICO
  // ========================================
  useEffect(() => {
    if (changeCounter > 0 && changeCounter % 10 === 0 && currentProject) {
      projectManager.saveVersion(
        currentProject.id,
        `Auto-save: ${changeCounter} changes`,
        true
      ).then(() => {
        logger.info("Auto-version created", { changeCounter }, "useFlowManager");
      }).catch(err => {
        logger.error("Failed to create auto-version", err, "useFlowManager");
      });
    }
  }, [changeCounter, currentProject]);

  // ========================================
  // OPTIMIZACIÓN 5: Batch updates con useCallback
  // ========================================
  const updateNodeState = useCallback((nodeId, state, errorDetails = null) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node;

        return {
          ...node,
          data: {
            ...node.data,
            state,
            errorDetails,
            lastExecuted: new Date().toISOString(),
          },
          style: getNodeStyle(state, node.style),
        };
      }),
    );
  }, []);

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

  // ========================================
  // OPTIMIZACIÓN 6: Historial con límite
  // ========================================
  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [
        ...prev.past.slice(-19), // Mantener solo últimos 20
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

  // ========================================
  // OPTIMIZACIÓN 7: Operaciones de nodo optimizadas
  // ========================================
  const addNode = useCallback(
    (typeKey) => {
      saveToHistory();
      const id = generateNodeId();
      const label = NODE_LABELS[typeKey] || typeKey;

      // Calculate position based on existing nodes to avoid overlap
      const nodeWidth = 160; // Reduced from 220
      const nodeHeight = 60; // Reduced from 80
      const horizontalSpacing = 80; // Reduced from 100
      const verticalSpacing = 80; // Reduced from 100
      const nodesPerRow = 3; // Number of nodes per row

      // NEW: Central offset to position nodes in the middle of the canvas
      const startX = 400;
      const startY = 250;

      // Calculate grid position
      const nodeCount = nodesRef.current.length;
      const row = Math.floor(nodeCount / nodesPerRow);
      const col = nodeCount % nodesPerRow;

      const newNode = {
        id,
        type: "custom", // Use custom memoized node type
        position: {
          x: startX + col * (nodeWidth + horizontalSpacing),
          y: startY + row * (nodeHeight + verticalSpacing),
        },
        data: {
          label, // Only show user-friendly label
          type: typeKey,
          configuration: {},
          state: NODE_STATES.DEFAULT,
        },
        style: getNodeStyle(NODE_STATES.DEFAULT),
        sourcePosition: "right",
        targetPosition: "left",
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);

      // Auto-fit view removed to prevent unwanted zoom
    },
    [saveToHistory],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      saveToHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedNodeId(null);
    },
    [saveToHistory],
  );

  const updateNodeConfiguration = useCallback(
    (nodeId, newConfig) => {
      saveToHistory();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;

          const updated = {
            ...n,
            data: {
              ...n.data,
              configuration: newConfig,
              label: n.data.label || NODE_LABELS[n.data.type] || n.data.type,
            },
          };

          // selectedAction will update automatically via useMemo

          return updated;
        }),
      );
    },
    [saveToHistory],
  );

  // ========================================
  // SCREENSHOT CAPTURE METHODS
  // ========================================

  /**
   * Update node with screenshot data
   */
  const updateNodeScreenshot = useCallback((nodeId, timing, screenshotData) => {
    console.log('🖼️ updateNodeScreenshot called:', { nodeId, timing, screenshotData });
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node;

        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            screenshots: {
              ...node.data.screenshots,
              [timing]: screenshotData,
            },
          },
        };
        console.log('🖼️ Updated node:', { nodeId, screenshots: updatedNode.data.screenshots });
        return updatedNode;
      }),
    );
  }, []);

  /**
   * Capture screenshot for a node
   */
  const captureScreenshot = useCallback(
    async ({ nodeId, timing, browserId, nodeType }) => {
      try {
        // Get recommended delay for this node type
        const recommendation = SCREENSHOT_RECOMMENDATIONS[nodeType];
        const delay = recommendation?.delay?.[timing] || 0;

        // Wait for animations/transitions to complete
        if (delay > 0) {
          await sleep(delay);
        }

        // Call backend to capture screenshot
        // Use the correct payload format matching take_screenshot action
        const screenshotPayload = {
          browserId,
          selector: null,      // Capture full viewport
          path: null,          // EXPLICITLY null to force base64 return
          fullPage: false,     // Only viewport
          format: 'jpeg',      // JPEG for compression
          quality: 80,         // 80% quality
          timeout: 30000,      // 30 second timeout
        };

        const response = await fetch(`${API_BASE_URL}/take_screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(screenshotPayload),
        });

        if (!response.ok) {
          throw new Error(`Screenshot API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Log response for debugging
        logger.debug('Screenshot API response', {
          dataKeys: Object.keys(data),
          hasScreenshot: !!data.screenshot,
          screenshotType: typeof data.screenshot
        }, 'useFlowManager');

        // Check for screenshot data in response
        // Backend might return it as 'screenshot', 'image', or 'data'
        // CRITICAL: Ensure we pick a STRING, not an object (like { path: ... })
        let base64Screenshot = null;

        if (typeof data.screenshot === 'string') base64Screenshot = data.screenshot;
        else if (typeof data.image === 'string') base64Screenshot = data.image;
        else if (typeof data.data === 'string') base64Screenshot = data.data;

        if (!base64Screenshot) {
          logger.error('No valid screenshot string in response', { data }, 'useFlowManager');
          throw new Error('No screenshot string in response. Got: ' + JSON.stringify(data));
        }

        // Cleanup old screenshot before saving new one
        await screenshotManager.deleteScreenshot(nodeId, timing);

        // Save screenshot using ScreenshotManager
        const screenshotMetadata = await screenshotManager.saveScreenshot(
          nodeId,
          timing,
          base64Screenshot
        );

        // Update node with screenshot metadata
        updateNodeScreenshot(nodeId, timing, screenshotMetadata);

        logger.debug('Screenshot captured', { nodeId, timing }, 'useFlowManager');

        return screenshotMetadata;
      } catch (error) {
        logger.error('Screenshot capture failed', error, 'useFlowManager');
        return null;
      }
    },
    [updateNodeScreenshot]
  );

  // ========================================
  // OPTIMIZACIÓN 8: Ejecutar paso con mejor manejo de errores
  // ========================================
  const executeStep = useCallback(
    async (action, options = {}) => {
      console.log(options);
      if (!action || !action.nodeId) {
        console.error("Acción inválida", action);
        return { success: false, error: "Acción inválida" };
      }

      const { nodeId, type, payload } = action;
      const endpoint =
        (payload && payload.endpoint) || `${API_BASE_URL}/${type}`;

      // Get node and browserId for screenshot capture
      const node = nodesRef.current.find(n => n.id === nodeId);
      const config = node?.data?.configuration || {};
      const browserId = payload?.browserId || config?.browserId;

      // Automatic screenshot for visual-change nodes
      const shouldAutoCapture = VISUAL_CHANGE_NODES.has(type) && browserId;

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
          // NOTE: "Before" screenshot logic removed as per simplified requirements.

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
            } catch {
              // Ignorar error de parsing
            }

            const serverMsg =
              (errData && errData.message) || text || response.statusText;

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

            throw new Error(serverMsg || `Error ${response.status}`);
          }

          const result = await response.json().catch(() => ({}));
          const duration = Date.now() - startTime;

          const instanceId =
            result.instanceId ??
            result.browserId ??
            result.instance?.id ??
            null;

          // ✨ OPTIMIZACIÓN: Actualización batch
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id !== nodeId) return node;

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
                  state: NODE_STATES.SUCCESS,
                  label: createExecutedLabel({ type, payload: newConfig }),
                  executionTime: duration,
                  result: result,
                },
                style: getNodeStyle(NODE_STATES.SUCCESS),
              };
            }),
          );

          setApiStatus({
            state: "success",
            message: `✓ Ejecución exitosa en ${duration}ms`,
            details: result,
          });

          // SCREENSHOT: Automatic capture for visual-change nodes
          if (shouldAutoCapture) {
            updateNodeState(nodeId, NODE_STATES.CAPTURING_AFTER);
            await captureScreenshot({
              nodeId,
              timing: 'after',
              browserId,
              nodeType: type,
            });
            // Restore success state after screenshot
            updateNodeState(nodeId, NODE_STATES.SUCCESS);
          }

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

      setIsLoading(false);
      return { success: false, error: "Max reintentos alcanzados" };
    },
    [updateNodeState, captureScreenshot],
  );

  // ========================================
  // OPTIMIZACIÓN 9: ReactFlow callbacks optimizados
  // ========================================
  const onConnect = useCallback(
    (connection) => {
      console.log("🔗 onConnect triggered!", connection);
      console.log("📊 Current nodes:", nodes.length);
      console.log("📊 Current edges:", edges.length);

      // VALIDACIÓN 1: Prevenir conexiones duplicadas
      const isDuplicate = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target,
      );

      if (isDuplicate) {
        console.log("❌ Duplicate connection detected");
        logger.warn(
          "Duplicate connection rejected",
          connection,
          "useFlowManager",
        );
        setApiStatus({
          state: "warning",
          message: "⚠️ Ya existe una conexión entre estos nodos",
        });
        return;
      }

      // VALIDACIÓN 2: Prevenir auto-conexiones
      if (connection.source === connection.target) {
        console.log("❌ Self-connection detected");
        setApiStatus({
          state: "warning",
          message: "⚠️ No se puede conectar un nodo consigo mismo",
        });
        return;
      }

      // VALIDACIÓN 3: Validar ciclos antes de agregar edge
      if (wouldCreateCycle(connection, nodes, edges)) {
        console.log("❌ Cycle detected, rejecting connection");
        logger.warn(
          "Cycle detected, connection rejected",
          connection,
          "useFlowManager",
        );
        setApiStatus({
          state: "warning",
          message: "⚠️ No se puede crear un ciclo en el flujo",
        });
        return;
      }

      console.log("✅ Adding edge...");
      saveToHistory();

      // Agregar edge con ID único y label
      const edgeId = `edge-${connection.source}-${connection.target}`;

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            ...DEFAULT_EDGE_OPTIONS,
          },
          eds,
        ),
      );

      console.log("✅ Edge added successfully");
      logger.debug("Edge added", connection, "useFlowManager");

      setApiStatus({
        state: "success",
        message: "✓ Conexión creada exitosamente",
      });
    },
    [saveToHistory, nodes, edges],
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      // Guardar historial si se está eliminando un edge
      const hasRemove = changes.some((change) => change.type === "remove");
      if (hasRemove) {
        saveToHistory();
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [saveToHistory],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // ========================================
  // Resto de funciones (executeFlow, etc.)
  // Mantener la lógica existente con las optimizaciones aplicadas
  // ========================================

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

      if (sortedNodes.length !== nodes.length) {
        setApiStatus({
          state: "error",
          message: "✗ Flujo no ejecutable: Ciclo detectado.",
        });
        return { success: false, error: "Ciclo detectado" };
      }

      // --- DEBUG LOGGING ---
      console.group("🚀 Execute Flow - Plan");
      console.log("Total Nodes:", sortedNodes.length);
      console.log("Execution Order (Topological Sort):");

      const debugNodes = sortedNodes.map((node, index) => {
        const outgoingEdges = edges.filter((e) => e.source === node.id);
        const nextNodes = outgoingEdges.map((e) => {
          const targetNode = nodes.find((n) => n.id === e.target);
          return targetNode
            ? `${targetNode.data.label} (${targetNode.id})`
            : e.target;
        });

        return {
          step: index + 1,
          id: node.id,
          type: node.data.type,
          label: node.data.label,
          payload: node.data.configuration,
          nextSteps: nextNodes,
        };
      });

      console.table(debugNodes);
      console.groupEnd();
      // ---------------------

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

      const runtimeContext = {};

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];

        // Merge runtime context (e.g., browserId) into the payload
        const payload = {
          ...(node.data.configuration || {}),
          ...runtimeContext,
        };

        const action = {
          nodeId: node.id,
          type: node.data.type,
          payload,
        };

        const result = await executeStep(action, options);

        // Update runtime context with new instanceId/browserId if available
        if (result.success && result.instanceId) {
          runtimeContext.browserId = result.instanceId;
          runtimeContext.instanceId = result.instanceId;
        }

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
      executionStats,
      executeStep,
      resetNodeStates,
    ],
  );

  // ========================================
  // Export and Import Flow Functions
  // ========================================

  /**
   * Exports the current flow as a downloadable JSON file
   * @returns {object} The exported flow data
   */
  const exportFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      viewport: getViewport(),
      timestamp: new Date().toISOString(),
      version: "2.0",
      stats: executionStats,
      metadata: {
        exportedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    };

    try {
      // Create blob and download
      const blob = new Blob([JSON.stringify(flowData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hal_test_flow_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setApiStatus({
        state: "success",
        message: "✓ Flujo exportado correctamente",
      });

      return flowData;
    } catch (error) {
      console.error("Error al exportar el flujo:", error);
      setApiStatus({
        state: "error",
        message: `✗ Error al exportar: ${error.message}`,
      });
      throw error;
    }
  }, [nodes, edges, getViewport, executionStats]);

  /**
   * Enhanced import function supporting multiple modes
   * @param {Object} options - Import options
   * @param {string} options.mode - Import mode: 'file', 'directory', 'directory-pom'
   * @param {string} options.content - File content (for file mode)
   * @param {string} options.filename - Filename (for file mode)
   * @param {string} options.framework - Detected framework (optional)
   * @param {Object} options.result - Import result from backend (for directory modes)
   * @returns {Promise<void>}
   */
  const importFlow = useCallback(
    async (options = {}) => {
      const { mode = "file", content, filename, framework, result } = options;

      try {
        // Handle JSON flow import (legacy)
        if (filename?.endsWith(".json")) {
          const flowData = JSON.parse(content);

          // Validate flow data structure
          if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
            throw new Error(
              "Formato de archivo inválido: falta el array de nodos",
            );
          }

          if (!flowData.edges || !Array.isArray(flowData.edges)) {
            throw new Error(
              "Formato de archivo inválido: falta el array de edges",
            );
          }

          saveToHistory();
          setNodes(flowData.nodes);
          setEdges(flowData.edges);

          setExecutionStats({
            total: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
          });

          setApiStatus({
            state: "success",
            message: `✓ Flujo importado: ${flowData.nodes.length} nodos, ${flowData.edges.length} conexiones`,
            details: {
              version: flowData.version,
              timestamp: flowData.timestamp,
            },
          });

          return;
        }

        // Handle directory import result
        if (mode === "directory" || mode === "directory-pom") {
          if (!result || !result.flows || result.flows.length === 0) {
            throw new Error("No se generaron flujos desde el directorio");
          }

          // For now, merge all flows into a single canvas
          // In the future, we could create a flow selector UI
          const allNodes = [];
          const allEdges = [];
          let currentY = 100;
          const flowGap = 300;

          result.flows.forEach((flowData, flowIndex) => {
            const flow = flowData.flow;
            const startX = 100 + (flowIndex % 3) * 400; // Arrange flows in columns
            const startY = currentY + Math.floor(flowIndex / 3) * flowGap;
            let lastNodeId = null;

            flow.forEach((action, actionIndex) => {
              const nodeId = generateNodeId();
              const nodeType = action.action;
              const config = { ...action };
              const label = createExecutedLabel({
                type: nodeType,
                payload: config,
              });

              const newNode = {
                id: nodeId,
                type: "custom",
                position: { x: startX, y: startY + actionIndex * 150 },
                data: {
                  label,
                  type: nodeType,
                  configuration: config,
                  state: NODE_STATES.DEFAULT,
                },
                style: getNodeStyle(NODE_STATES.DEFAULT),
                sourcePosition: "bottom",
                targetPosition: "top",
              };

              allNodes.push(newNode);

              if (lastNodeId) {
                allEdges.push({
                  id: `e_${lastNodeId}_${nodeId}`,
                  source: lastNodeId,
                  target: nodeId,
                  ...DEFAULT_EDGE_OPTIONS,
                });
              }

              lastNodeId = nodeId;
            });
          });

          saveToHistory();
          setNodes(allNodes);
          setEdges(allEdges);

          setApiStatus({
            state: "success",
            message: `✓ ${result.flows.length} flujos importados (${allNodes.length} nodos totales)`,
            details: {
              mode,
              stats: result.stats,
            },
          });

          return;
        }

        // Handle single file import with conversion
        if (mode === "file" && content) {
          setApiStatus({
            state: "loading",
            message: "Analizando archivo de prueba...",
          });

          // 1. Analyze the file (if framework not provided)
          let detectedFramework = framework;
          if (!detectedFramework) {
            const analyzeResponse = await fetch("/api/import/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content, filename }),
            });

            if (!analyzeResponse.ok) {
              throw new Error(
                `Error al analizar el archivo: ${analyzeResponse.statusText}`,
              );
            }

            const analysis = await analyzeResponse.json();

            if (!analysis.detected) {
              throw new Error("No se pudo detectar el framework de pruebas.");
            }

            detectedFramework = analysis.framework;
          }

          setApiStatus({
            state: "loading",
            message: `Framework detectado: ${detectedFramework}. Convirtiendo...`,
          });

          // 2. Convert to Flow
          const convertResponse = await fetch("/api/import/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              framework: detectedFramework,
            }),
          });

          if (!convertResponse.ok) {
            throw new Error(
              `Error al convertir el archivo: ${convertResponse.statusText}`,
            );
          }

          const conversion = await convertResponse.json();

          if (
            !conversion.success ||
            !conversion.flows ||
            conversion.flows.length === 0
          ) {
            throw new Error("No se pudieron generar flujos desde el archivo.");
          }

          // Take the first flow
          const generatedFlow = conversion.flows[0].flow;
          const newNodes = [];
          const newEdges = [];
          let lastNodeId = null;

          const startX = 100;
          const startY = 100;
          const gapY = 150;

          generatedFlow.forEach((action, index) => {
            const nodeId = generateNodeId();
            const nodeType = action.action;
            const config = { ...action };
            const label = createExecutedLabel({
              type: nodeType,
              payload: config,
            });

            const newNode = {
              id: nodeId,
              type: "custom",
              position: { x: startX, y: startY + index * gapY },
              data: {
                label,
                type: nodeType,
                configuration: config,
                state: NODE_STATES.DEFAULT,
              },
              style: getNodeStyle(NODE_STATES.DEFAULT),
              sourcePosition: "bottom",
              targetPosition: "top",
            };

            newNodes.push(newNode);

            if (lastNodeId) {
              newEdges.push({
                id: `e_${lastNodeId}_${nodeId}`,
                source: lastNodeId,
                target: nodeId,
                ...DEFAULT_EDGE_OPTIONS,
              });
            }

            lastNodeId = nodeId;
          });

          saveToHistory();
          setNodes(newNodes);
          setEdges(newEdges);

          setApiStatus({
            state: "success",
            message: `✓ Importación completada: ${newNodes.length} pasos generados`,
            details: {
              framework: detectedFramework,
              flowName: conversion.flows[0].meta?.name || filename,
            },
          });
        }
      } catch (error) {
        console.error("Error al importar:", error);
        setApiStatus({
          state: "error",
          message: `✗ Error al importar: ${error.message}`,
        });
        throw error;
      }
    },
    [saveToHistory],
  );

  // Exportar funciones y estados
  return {
    nodes,
    edges,
    selectedAction,
    history,
    isLoading,
    apiStatus,
    executionStats,
    autoSaveEnabled,

    setNodes,
    setEdges,
    setSelectedAction: setSelectedNodeId, // Expose as setSelectedAction for backward compatibility
    setAutoSaveEnabled,

    addNode,
    deleteNode,
    updateNodeConfiguration,
    updateNodeState,

    executeStep,
    executeFlow,

    onConnect,
    onNodesChange,
    onEdgesChange,
    onNodeClick,

    saveFlow,
    exportFlow,
    importFlow,
    resetNodeStates,

    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,

    NODE_STATES,
    PROFESSIONAL_COLORS,
  };
};
