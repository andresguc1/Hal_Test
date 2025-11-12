import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, { Controls, Background } from "reactflow";
import "reactflow/dist/style.css";
import "./components/styles/App.css";

import AppHeader from "./components/AppHeader";
import NodeCreationPanel from "./components/NodeCreationPanel";
import NodeConfigurationPanel from "./components/NodeConfigurationPanel";
import AppFooter from "./components/AppFooter";
import StyledMiniMap from "./components/StyledMiniMap";

import { colors } from "./components/styles/colors";
import { useFlowManager } from "./components/hooks/useFlowManager.js";

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function App() {
  // Panel visibility state
  const [isCreationPanelVisible, setIsCreationPanelVisible] = useState(true);

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
    exportFlow,
    importFlow,
    updateNodeConfiguration, // <-- agregado aquí
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
    } catch (error) {
      console.error("Error ejecutando flujo:", error);
      alert("Error al ejecutar el flujo: " + error.message);
    }
  }, [executeFlow]);

  const handleSaveFlow = useCallback(() => {
    try {
      const flowData = saveFlow();

      // También preparar descarga
      const blob = new Blob([JSON.stringify(flowData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flow_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert("Flujo guardado exitosamente");
    } catch (error) {
      console.error("Error guardando flujo:", error);
      alert("Error al guardar el flujo");
    }
  }, [saveFlow]);

  const handleExportFlow = useCallback(() => {
    try {
      exportFlow();
      alert("Flujo exportado exitosamente");
    } catch (error) {
      console.error("Error exportando flujo:", error);
      alert("Error al exportar el flujo");
    }
  }, [exportFlow]);

  const handleImportFlow = useCallback(async () => {
    try {
      await importFlow();
      alert("Flujo importado exitosamente");
    } catch (error) {
      console.error("Error importando flujo:", error);
      alert("Error al importar el flujo: " + error.message);
    }
  }, [importFlow]);

  // ========================================
  // MEMOIZACIÓN
  // ========================================

  const flowConfig = useMemo(
    () => ({
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick,
      fitView: true,
      style: { backgroundColor: colors.deepSpace },
    }),
    [nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick],
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="app-container">
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
    </div>
  );
}
