import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, { Controls, Background } from "reactflow";
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
  // KEYBOARD SHORTCUTS
  // ========================================
  useFlowShortcuts({
    onSave: handleSaveFlow,
    onUndo: canUndo ? undo : undefined,
    onRedo: canRedo ? redo : undefined,
    onExecute: handleExecuteFlow,
    onDelete: selectedAction
      ? () => deleteNode(selectedAction.nodeId)
      : undefined,
    onDeselect: selectedAction ? closeConfiguration : undefined,
    onZoomIn: () => zoomIn({ duration: 300 }),
    onZoomOut: () => zoomOut({ duration: 300 }),
    onFitView: () => fitView({ duration: 300 }),
  });

  // ========================================
  // MEMOIZACIÓN OPTIMIZADA
  // ========================================

  // Props estáticas que no cambian
  // Props estáticas que no cambian
  const staticFlowProps = useMemo(
    () => ({
      fitView: true,
      snapToGrid: true,
      snapGrid: [15, 15],
      style: { backgroundColor: colors.deepSpace },
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
