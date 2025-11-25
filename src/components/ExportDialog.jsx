import React, { useState, useCallback } from "react";
import {
    Download,
    FileCode,
    FileJson,
    X,
    AlertCircle,
    CheckCircle,
    Loader,
    Code2,
} from "lucide-react";
import "./ExportDialog.css";

/**
 * ExportDialog Component
 *
 * Provides a comprehensive UI for exporting flows
 * Supports:
 * - JSON export (for backup/import)
 * - Playwright code export (executable script)
 * - Real-time progress tracking
 */
const ExportDialog = ({ isOpen, onClose, nodes, edges }) => {
    const [exportMode, setExportMode] = useState("json"); // 'json', 'code'
    const [framework, setFramework] = useState("playwright"); // Future: support more frameworks
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [generatedCode, setGeneratedCode] = useState(null);

    const resetState = useCallback(() => {
        setIsProcessing(false);
        setProgress(null);
        setError(null);
        setGeneratedCode(null);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    // Convert nodes to flow actions for backend
    const convertNodesToFlow = useCallback(() => {
        // Sort nodes topologically based on edges
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        const visited = new Set();
        const result = [];

        const visit = (nodeId) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const node = nodeMap.get(nodeId);
            if (!node) return;

            // Add node action
            result.push({
                action: node.data.type,
                ...node.data.configuration,
            });

            // Visit children
            const outgoingEdges = edges.filter((e) => e.source === nodeId);
            outgoingEdges.forEach((edge) => visit(edge.target));
        };

        // Find root nodes (nodes with no incoming edges)
        const targetIds = new Set(edges.map((e) => e.target));
        const rootNodes = nodes.filter((n) => !targetIds.has(n.id));

        // Visit from each root
        rootNodes.forEach((node) => visit(node.id));

        return result;
    }, [nodes, edges]);

    // Handle JSON export
    const handleJsonExport = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        setProgress({ stage: "preparing", message: "Preparando exportación..." });

        try {
            const flow = convertNodesToFlow();

            setProgress({ stage: "sending", message: "Generando archivo JSON..." });

            const response = await fetch("/api/export/json", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ flow }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Error del servidor: ${response.statusText}`
                );
            }

            // Download the file
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `hal_test_flow_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            setProgress({
                stage: "complete",
                message: "✓ Flujo exportado exitosamente",
            });

            // Close dialog after success
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            setError(err.message || "Error al exportar el flujo");
            setProgress(null);
        } finally {
            setIsProcessing(false);
        }
    }, [convertNodesToFlow, handleClose]);

    // Handle code export
    const handleCodeExport = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        setProgress({ stage: "preparing", message: "Preparando exportación..." });

        try {
            const flow = convertNodesToFlow();

            setProgress({
                stage: "generating",
                message: "Generando código Playwright...",
            });

            const response = await fetch("/api/export/code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    framework,
                    flow,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Error del servidor: ${response.statusText}`
                );
            }

            const result = await response.json();

            if (!result.code) {
                throw new Error("No se recibió código del servidor");
            }

            // Show generated code
            setGeneratedCode(result.code);

            setProgress({
                stage: "complete",
                message: "✓ Código generado exitosamente",
            });
        } catch (err) {
            setError(err.message || "Error al generar el código");
            setProgress(null);
        } finally {
            setIsProcessing(false);
        }
    }, [convertNodesToFlow, framework]);

    // Download generated code
    const handleDownloadCode = useCallback(() => {
        if (!generatedCode) return;

        const blob = new Blob([generatedCode], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hal_test_${framework}_${Date.now()}.js`;
        a.click();
        URL.revokeObjectURL(url);

        handleClose();
    }, [generatedCode, framework, handleClose]);

    // Copy code to clipboard
    const handleCopyCode = useCallback(() => {
        if (!generatedCode) return;

        navigator.clipboard.writeText(generatedCode).then(() => {
            setProgress({
                stage: "complete",
                message: "✓ Código copiado al portapapeles",
            });
            setTimeout(() => {
                setProgress({
                    stage: "complete",
                    message: "✓ Código generado exitosamente",
                });
            }, 2000);
        });
    }, [generatedCode]);

    const handleExportClick = useCallback(() => {
        if (exportMode === "json") {
            handleJsonExport();
        } else {
            handleCodeExport();
        }
    }, [exportMode, handleJsonExport, handleCodeExport]);

    if (!isOpen) return null;

    return (
        <div className="export-dialog-overlay" onClick={handleClose}>
            <div
                className={`export-dialog ${generatedCode ? "with-code" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="export-dialog-header">
                    <h2>
                        <Download size={24} />
                        Exportar Flujo
                    </h2>
                    <button className="close-button" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Selection */}
                <div className="export-mode-selector">
                    <button
                        className={`mode-button ${exportMode === "json" ? "active" : ""}`}
                        onClick={() => {
                            setExportMode("json");
                            resetState();
                        }}
                        disabled={isProcessing}
                    >
                        <FileJson size={20} />
                        <span>JSON</span>
                        <span className="mode-description">Backup del flujo</span>
                    </button>
                    <button
                        className={`mode-button ${exportMode === "code" ? "active" : ""}`}
                        onClick={() => {
                            setExportMode("code");
                            resetState();
                        }}
                        disabled={isProcessing}
                    >
                        <Code2 size={20} />
                        <span>Código</span>
                        <span className="mode-description">Script ejecutable</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="export-dialog-content">
                    {/* JSON Mode */}
                    {exportMode === "json" && !generatedCode && (
                        <div className="export-section">
                            <div className="export-info">
                                <FileJson size={48} />
                                <h3>Exportar como JSON</h3>
                                <p>
                                    Genera un archivo JSON con la configuración completa del
                                    flujo. Ideal para hacer backups o compartir flujos.
                                </p>
                                <div className="export-stats">
                                    <div className="stat">
                                        <span className="stat-label">Nodos:</span>
                                        <span className="stat-value">{nodes.length}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Conexiones:</span>
                                        <span className="stat-value">{edges.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Code Mode */}
                    {exportMode === "code" && !generatedCode && (
                        <div className="export-section">
                            <div className="export-info">
                                <Code2 size={48} />
                                <h3>Exportar como Código</h3>
                                <p>
                                    Genera un script de Playwright ejecutable basado en tu flujo.
                                    Podrás ejecutarlo directamente con Node.js.
                                </p>
                                <div className="framework-selector">
                                    <label>Framework:</label>
                                    <select
                                        value={framework}
                                        onChange={(e) => setFramework(e.target.value)}
                                        disabled={isProcessing}
                                    >
                                        <option value="playwright">Playwright</option>
                                        {/* Future: Add more frameworks */}
                                    </select>
                                </div>
                                <div className="export-stats">
                                    <div className="stat">
                                        <span className="stat-label">Acciones:</span>
                                        <span className="stat-value">{nodes.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generated Code Display */}
                    {generatedCode && (
                        <div className="code-display-section">
                            <div className="code-header">
                                <h3>
                                    <FileCode size={20} />
                                    Código Generado
                                </h3>
                                <div className="code-actions">
                                    <button
                                        className="button-icon"
                                        onClick={handleCopyCode}
                                        title="Copiar al portapapeles"
                                    >
                                        <FileCode size={16} />
                                        Copiar
                                    </button>
                                </div>
                            </div>
                            <pre className="code-display">
                                <code>{generatedCode}</code>
                            </pre>
                        </div>
                    )}

                    {/* Progress */}
                    {progress && (
                        <div className={`progress-section ${progress.stage}`}>
                            {progress.stage === "complete" ? (
                                <CheckCircle size={20} />
                            ) : (
                                <Loader size={20} className="spinner" />
                            )}
                            <span>{progress.message}</span>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="error-section">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="export-dialog-footer">
                    <button
                        className="button-secondary"
                        onClick={handleClose}
                        disabled={isProcessing}
                    >
                        {generatedCode ? "Cerrar" : "Cancelar"}
                    </button>
                    {generatedCode ? (
                        <button className="button-primary" onClick={handleDownloadCode}>
                            <Download size={16} />
                            Descargar
                        </button>
                    ) : (
                        <button
                            className="button-primary"
                            onClick={handleExportClick}
                            disabled={isProcessing || nodes.length === 0}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader size={16} className="spinner" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Exportar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportDialog;
