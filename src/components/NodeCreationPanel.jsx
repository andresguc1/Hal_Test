import React, { useState } from "react";
import {
  ChevronLeft,
  Menu,
  Globe,
  Pointer,
  Code,
  Clock,
  Camera,
  Cable,
  Cookie,
  CheckSquare,
  Folder,
  Terminal,
  // Importación de Brain para la categoría LLM/AI
  Brain,
} from "lucide-react";
import "./styles/NodeCreationPanel.css";

// Definición de categorías y nodos
const NODE_CATEGORIES = {
  browser_management: {
    label: "Navegador",
    icon: <Globe size={20} />,
    nodes: [
      { id: "launch_browser", label: "Lanzar Navegador" },
      { id: "open_url", label: "Cargar URL" },
      { id: "close_browser", label: "Cerrar Navegador" },
      { id: "manage_tabs", label: "Manejar Pestañas" },
      { id: "resize_viewport", label: "Ajustar Viewport" },
      { id: "backForward", label: "BackForward" },
    ],
  },
  dom_manipulation: {
    label: "DOM",
    icon: <Code size={20} />,
    nodes: [
      { id: "find_element", label: "Buscar Elementos" },
      { id: "get_set_content", label: "Modificar Texto/Attr" },
      { id: "wait_for_element", label: "Esperar Elemento" },
      { id: "execute_js", label: "Ejecutar JavaScript" },
    ],
  },
  user_simulation: {
    label: "Interacción",
    icon: <Pointer size={20} />,
    nodes: [
      { id: "click", label: "Click" },
      { id: "type_text", label: "Escribir Texto" },
      { id: "select_option", label: "Seleccionar Opciones" },
      { id: "submit_form", label: "Enviar Formulario" },
      { id: "scroll", label: "Desplazar/Scroll" },
      { id: "drag_drop", label: "Arrastrar y Soltar" },
      { id: "upload_file", label: "Subir Archivos" },
    ],
  },
  synchronization: {
    label: "Sincronización",
    icon: <Clock size={20} />,
    nodes: [
      { id: "wait_visible", label: "Esperar Visibilidad" },
      { id: "wait_navigation", label: "Esperar Navegación/Carga" },
      { id: "wait_network", label: "Esperar Respuesta de Red" },
      { id: "wait_conditional", label: "Esperas Condicionales" },
    ],
  },
  diagnostics: {
    label: "Diagnóstico",
    icon: <Camera size={20} />,
    nodes: [
      { id: "take_screenshot", label: "Captura de Pantalla" },
      { id: "save_dom", label: "Guardar HTML/Snapshot" },
      { id: "log_errors", label: "Registrar Errores/Logs" },
      { id: "listen_events", label: "Escuchar Eventos" },
    ],
  },
  network_control: {
    label: "Red",
    icon: <Cable size={20} />,
    nodes: [
      { id: "intercept_request", label: "Interceptar Solicitud" },
      { id: "mock_response", label: "Simular Respuesta (Mock)" },
      { id: "block_resource", label: "Bloquear Recursos" },
      { id: "modify_headers", label: "Modificar Cabeceras" },
    ],
  },
  session_management: {
    label: "Sesión",
    icon: <Cookie size={20} />,
    nodes: [
      { id: "manage_cookies", label: "Leer/Escribir Cookies" },
      { id: "manage_storage", label: "Session Storage" },
      { id: "inject_tokens", label: "Inyectar Tokens" },
      { id: "persist_session", label: "Persistir Sesión" },
    ],
  },
  test_execution: {
    label: "Contexto/Control",
    icon: <CheckSquare size={20} />,
    nodes: [
      { id: "create_context", label: "Crear/Destruir Contexto" },
      { id: "cleanup_state", label: "Limpiar Estado" },
      { id: "handle_hooks", label: "Manejar Hooks" },
      { id: "control_exceptions", label: "Controlar Excepciones" },
    ],
  },
  file_data: {
    label: "Archivos/Datos",
    icon: <Folder size={20} />,
    nodes: [
      { id: "read_data", label: "Leer Datos de Archivos" },
      { id: "save_results", label: "Guardar Resultados/Logs" },
      { id: "handle_downloads", label: "Manejar Descargas" },
    ],
  },
  llm_ai: {
    label: "Modelos de IA (LLM)",
    icon: <Brain size={20} />, // NUEVA CATEGORÍA
    nodes: [
      { id: "call_llm", label: "Llamar a LLM" },
      { id: "generate_data", label: "Generar Datos" },
      { id: "validate_semantic", label: "Validar Semántica" },
    ],
  },
  execution_interface: {
    label: "Ejecución",
    icon: <Terminal size={20} />,
    nodes: [
      { id: "run_tests", label: "Ejecutar Pruebas" },
      { id: "cli_params", label: "Aceptar Parámetros CLI" },
      { id: "return_code", label: "Retornar Códigos de Salida" },
      { id: "integrate_ci", label: "Integrarse con CI/CD" },
    ],
  },
};

const initialTabId = Object.keys(NODE_CATEGORIES)[0];

export default function NodeCreationPanel({ addNode, isVisible, togglePanel }) {
  const [activeTab, setActiveTab] = useState(initialTabId);

  return (
    <div className="panel-wrapper-burger">
      {/* Botón Toggle */}
      <button
        className={`btn-toggle-burger ${isVisible ? "panel-open" : ""}`}
        aria-label={
          isVisible ? "Ocultar panel de nodos" : "Mostrar panel de nodos"
        }
        onClick={togglePanel} // <-- Función activa
      >
        {isVisible ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Panel lateral */}
      <aside
        className={`panel-left ${!isVisible ? "hidden" : ""}`}
        role="complementary"
        aria-hidden={!isVisible}
      >
        <h2>Biblioteca de Nodos</h2>

        <div className="panel-content-flex">
          {/* Tabs verticales */}
          <div
            className="tab-bar-vertical"
            role="tablist"
            aria-orientation="vertical"
          >
            {Object.keys(NODE_CATEGORIES).map((tabId) => (
              <button
                key={tabId}
                className={`tab-button-vertical ${activeTab === tabId ? "active" : ""}`}
                onClick={() => setActiveTab(tabId)}
                aria-selected={activeTab === tabId}
                role="tab"
                title={NODE_CATEGORIES[tabId].label}
              >
                {NODE_CATEGORIES[tabId].icon}
                <span className="tab-label-vertical">
                  {NODE_CATEGORIES[tabId].label}
                </span>
              </button>
            ))}
          </div>

          {/* Contenido de nodos */}
          <div className="tab-content-vertical" role="tabpanel">
            {NODE_CATEGORIES[activeTab].nodes.map((node) => (
              <button
                key={node.id}
                className="btn-node"
                onClick={() => addNode(node.id)}
                title={node.label}
              >
                {node.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
