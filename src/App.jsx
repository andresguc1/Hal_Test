import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, { Controls, Background, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import "./components/styles/App.css";

import AppHeader from "./components/AppHeader";
import NodeCreationPanel from "./components/NodeCreationPanel";
import NodeConfigurationPanel from "./components/NodeConfigurationPanel";
import AppFooter from "./components/AppFooter";
import StyledMiniMap from "./components/StyledMiniMap";
import { nodeTypes } from "./components/nodes";
import StatusIndicator from "./components/StatusIndicator";
import ProgressBar from "./components/ProgressBar";
import ImportDialog from "./components/ImportDialog";
import ExportDialog from "./components/ExportDialog";

import { colors } from "./components/styles/colors";
import { useFlowManager } from "./components/hooks/useFlowManager.js";
import { useFlowShortcuts } from "./hooks/useKeyboardShortcuts";
import { useToast } from "./hooks/useToast";
import { useFigmaInteraction } from "./hooks/useFigmaInteraction";

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function App() {
  // Toast notifications
  const toast = useToast();

  // React Flow hooks & Figma Interaction
  const { figmaConfig, handlers } = useFigmaInteraction();
  const { zoomIn, zoomOut, fitView } = handlers;

  // Hook de React Flow para acceder a funciones de eliminación
  const { getNodes, getEdges, deleteElements } = useReactFlow();

  // Panel visibility state
  const [isCreationPanelVisible, setIsCreationPanelVisible] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Execution state for progress bar
  const [executionProgress, setExecutionProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Custom hook para manejar el flujo
  const {
    nodes,
    edges,
    selectedAction,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    addNode,
    deleteNode,
    executeStep,
    setSelectedAction,
    setNodes,
    executeFlow,
    saveFlow,
    importFlow,
    updateNodeConfiguration,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFlowManager();

  // Computed values
  const isConfigurationPanelVisible = selectedAction !== null;

  // ========================================
  // CALLBACKS - UI
  // ========================================

  const toggleCreationPanel = useCallback(() => {
    setIsCreationPanelVisible((prev) => !prev);
  }, []);

  const closeConfiguration = useCallback(() => {
    setSelectedAction(null);
  }, [setSelectedAction]);

  // ========================================
  // CALLBACKS - Footer Actions
  // ========================================

  const handleExecuteFlow = useCallback(async () => {
    try {
      await executeFlow();
      toast.success("✓ Flujo ejecutado correctamente");
    } catch (error) {
      console.error("Error ejecutando flujo:", error);
      toast.error("✗ Error al ejecutar el flujo: " + error.message);
    }
  }, [executeFlow, toast]);

  const handleSaveFlow = useCallback(() => {
    try {
      setIsSaving(true);
      saveFlow();
      toast.success("✓ Flujo guardado correctamente");
    } catch (error) {
      console.error("Error guardando flujo:", error);
      toast.error("✗ Error al guardar el flujo");
    } finally {
      setIsSaving(false);
    }
  }, [saveFlow, toast]);

  const handleExportFlow = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleExportDialogClose = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  const handleImportFlow = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const handleImportDialogClose = useCallback(() => {
    setIsImportDialogOpen(false);
  }, []);

  const handleImport = useCallback(
    async (options) => {
      try {
        await importFlow(options);
        toast.success("✓ Flujo importado exitosamente");
      } catch (error) {
        console.error("Error importando flujo:", error);
        toast.error("✗ Error al importar el flujo: " + error.message);
        throw error; // Re-throw to let ImportDialog handle it
      }
    },
    [importFlow, toast],
  );

  // ========================================
  // CALLBACKS - Eliminación de elementos
  // ========================================
  const handleDeleteSelected = useCallback(() => {
    const allNodes = getNodes();
    const allEdges = getEdges();

    // Encontrar nodos y edges seleccionados
    const selectedNodes = allNodes.filter((node) => node.selected);
    const selectedEdges = allEdges.filter((edge) => edge.selected);

    // PRIORIDAD 1: Si hay edges seleccionados, eliminarlos (y nodos seleccionados también)
    // Esto evita que se elimine el "nodo activo" del panel si el usuario en realidad quería borrar un edge
    if (selectedEdges.length > 0 || selectedNodes.length > 0) {
      const elementsToDelete = {
        nodes: selectedNodes,
        edges: selectedEdges,
      };
      deleteElements(elementsToDelete);

      // Si el nodo que se estaba configurando fue eliminado, cerrar el panel
      if (
        selectedAction &&
        selectedNodes.some((n) => n.id === selectedAction.nodeId)
      ) {
        closeConfiguration();
      }
      return;
    }

    // PRIORIDAD 2: REMOVED - Fallback to delete active node was dangerous.
    // Now we ONLY delete explicitly selected elements.
  }, [selectedAction, getNodes, getEdges, deleteElements, closeConfiguration]);

  // ========================================
  // CALLBACKS - Duplicar nodos
  // ========================================
  const handleDuplicateNodes = useCallback(() => {
    const allNodes = getNodes();
    const selectedNodes = allNodes.filter((node) => node.selected);

    if (selectedNodes.length === 0) return;

    const newNodes = selectedNodes.map((node) => ({
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
      data: {
        ...node.data,
        label: `${node.data.label} (copia)`,
      },
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    toast.success(`✓ ${newNodes.length} nodo(s) duplicado(s)`);
  }, [getNodes, setNodes, toast]);

  // ========================================
  // CALLBACKS - Seleccionar todos
  // ========================================
  const handleSelectAll = useCallback(() => {
    const allNodes = getNodes();
    setNodes(allNodes.map((node) => ({ ...node, selected: true })));
  }, [getNodes, setNodes]);

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================
  useFlowShortcuts({
    onSave: handleSaveFlow,
    onUndo: canUndo ? undo : undefined,
    onRedo: canRedo ? redo : undefined,
    onExecute: handleExecuteFlow,
    onDelete: handleDeleteSelected,
    onDuplicate: handleDuplicateNodes,
    onSelectAll: handleSelectAll,
    onDeselect: selectedAction ? closeConfiguration : undefined,
    onZoomIn: () => zoomIn({ duration: 300 }),
    onZoomOut: () => zoomOut({ duration: 300 }),
    onFitView: () => fitView({ duration: 300 }),
  });

  // ========================================
  // MEMOIZACIÓN OPTIMIZADA
  // ========================================

  // Props estáticas que no cambian
  const staticFlowProps = useMemo(
    () => ({
      // Disable automatic fitView on mount – we will control zoom ourselves
      fitView: false,
      // Sensible defaults for the first node
      defaultViewport: { x: 0, y: 0, zoom: 1 },
      snapToGrid: true,
      snapGrid: [15, 15],
      style: { backgroundColor: colors.deepSpace },
      // Habilitar selección y eliminación de edges
      edgesFocusable: true,
      edgesUpdatable: true,
      elementsSelectable: true,
      // Mejorar selección múltiple
      multiSelectionKeyCode: "Shift", // Shift para selección múltiple
      selectionKeyCode: "Shift", // Shift para selección de área
      // Disable native delete to prevent conflicts with our custom handler
      deleteKeyCode: null,
      // Mejorar interacción
      selectNodesOnDrag: false, // No seleccionar al arrastrar
      panOnDrag: [1, 2], // Pan con click medio o derecho
      zoomOnScroll: true, // Zoom con scroll
      zoomOnPinch: true, // Zoom con pinch en trackpad
      zoomOnDoubleClick: false, // Deshabilitar zoom con doble click
      ...figmaConfig, // Use Figma configuration
    }),
    [figmaConfig],
  );

  // Props dinámicas que sí cambian
  const flowConfig = useMemo(
    () => ({
      ...staticFlowProps,
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick,
      onPaneClick: closeConfiguration, // Deselect on background click
      nodeTypes, // Custom node types for optimized rendering
    }),
    [
      staticFlowProps,
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick,
      closeConfiguration,
    ],
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="app-container">
      {/* Status Indicator */}
      <div
        style={{ position: "fixed", top: "70px", right: "20px", zIndex: 9998 }}
      >
        <StatusIndicator
          isConnected={true}
          isSaving={isSaving}
          executionStats={
            nodes.length > 0 ? { successful: 0, total: nodes.length } : null
          }
        />
      </div>

      {/* Progress Bar */}
      {executionProgress.total > 0 && (
        <ProgressBar
          current={executionProgress.current}
          total={executionProgress.total}
          status={executionProgress.status}
          onCancel={() =>
            setExecutionProgress({ current: 0, total: 0, status: "" })
          }
        />
      )}

      {/* Header */}
      <AppHeader toggleCreationPanel={toggleCreationPanel} />

      {/* Panel izquierdo */}
      <NodeCreationPanel
        addNode={addNode}
        isVisible={isCreationPanelVisible}
        togglePanel={toggleCreationPanel}
      />

      {/* Área principal */}
      <div
        className={`main-content 
          ${isCreationPanelVisible ? "shifted-left" : ""} 
          ${isConfigurationPanelVisible ? "shifted-right" : ""}`}
      >
        <ReactFlow {...flowConfig}>
          <StyledMiniMap />
          <Controls />
          <Background
            color={colors.metallicSilver}
            variant="dots"
            gap={12}
            size={1}
          />
        </ReactFlow>
      </div>

      {/* Panel derecho */}
      <NodeConfigurationPanel
        action={selectedAction}
        isVisible={isConfigurationPanelVisible}
        onExecute={executeStep}
        onClose={closeConfiguration}
        onDeleteNode={deleteNode}
        updateNodeConfiguration={updateNodeConfiguration} // <-- pasado correctamente
        nodes={nodes} // <-- pasado para el dropdown de browserId
      />

      {/* Footer */}
      <AppFooter
        onExecuteFlow={handleExecuteFlow}
        onSave={handleSaveFlow}
        onExport={handleExportFlow}
        onImport={handleImportFlow}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={handleImportDialogClose}
        onImport={handleImport}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={handleExportDialogClose}
        nodes={nodes}
        edges={edges}
      />
    </div>
  );
}
