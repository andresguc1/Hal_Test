// ========================================
// CONSTANTES DE CONFIGURACIÓN
// ========================================

/**
 * Mapeo de tipos de nodos a etiquetas en español
 */
export const NODE_LABELS = {
  // Navegación básica
  open_url: "Abrir URL",
  close_browser: "Cerrar navegador",
  go_back: "Retroceder",
  go_forward: "Avanzar",
  refresh: "Recargar página",

  // Configuración del navegador
  resize_viewport: "Ajustar resolución",
  launch_browser: "Lanzar Navegador",
  manage_tabs: "Manejar Pestañas",

  // Interacción con elementos
  find_element: "Buscar Elemento",
  get_set_content: "Modificar Texto/Attr",
  click: "Click",
  type_text: "Escribir Texto",
  select_option: "Seleccionar opciones",
  scroll: "Desplazar",
  hover: "Pasar mouse sobre elemento",
  drag_drop: "Arrastrar",
  upload_file: "Subir Archivos",

  // Utilidades
  wait_conditional: "Esperar (Delay)",
  take_screenshot: "Captura de Pantalla",
  extract_text: "Extraer texto",
  execute_script: "Ejecutar JavaScript",
  execute_js: "Ejecutar JavaScript",
  wait_for_element: "Esperar Elemento",
};

/**
 * Categorías de nodos para el panel de creación
 */
export const NODE_CATEGORIES = {
  navigation: {
    label: "Navegación",
    icon: "🧭",
    nodes: ["open_url", "go_back", "go_forward", "refresh", "close_browser"],
  },
  browser: {
    label: "Navegador",
    icon: "🌐",
    nodes: ["launch_browser", "resize_viewport", "manage_tabs"],
  },
  interaction: {
    label: "Interacción",
    icon: "👆",
    nodes: [
      "click",
      "type_text",
      "select_option",
      "scroll",
      "hover",
      "find_element",
    ],
  },
  utilities: {
    label: "Utilidades",
    icon: "🔧",
    nodes: [
      "wait_conditional",
      "take_screenshot",
      "extract_text",
      "execute_script",
    ],
  },
  // NUEVA CATEGORÍA
  llm_ai: {
    label: "Modelos de IA (LLM)",
    icon: "🧠",
    nodes: ["call_llm", "generate_data", "validate_semantic"],
  },
};

/**
 * Visual-change nodes that automatically capture screenshots
 * These nodes produce significant visual changes and should always capture
 */
export const VISUAL_CHANGE_NODES = new Set([
  "open_url",
  "click",
  "type_text",
  "get_set_content", // Captura screenshot en operaciones SET para validar cambios visuales
  "submit_form",
  "drag_drop",
  "upload_file",
  "scroll",
  "manage_tabs", // Captura screenshot para mostrar el resultado de la gestión de pestañas
  "select_option",
  "wait_for_element",
]);

/**
 * Screenshot timing recommendations by node type
 * Defines delays for optimal screenshot capture after action completion
 */
export const SCREENSHOT_RECOMMENDATIONS = {
  // High priority - Visual changes (automatic capture)
  open_url: { priority: "high", delay: { after: 1000 } },
  click: { priority: "high", delay: { after: 500 } },
  type_text: { priority: "high", delay: { after: 200 } },
  wait_for_element: { priority: "high", delay: { after: 500 } },
  submit_form: { priority: "high", delay: { after: 1500 } },
  drag_drop: { priority: "high", delay: { after: 300 } },
  upload_file: { priority: "high", delay: { after: 500 } },
  scroll: { priority: "high", delay: { after: 300 } },

  // Medium priority - May cause visual changes
  select_option: { priority: "medium", delay: { after: 200 } },
  execute_script: { priority: "medium", delay: { after: 300 } },
  hover: { priority: "medium", delay: { after: 200 } },

  // Medium priority - Conditional changes

  go_back: {
    defaultTiming: "both",
    priority: "medium",
    delay: { before: 0, after: 800 },
  },
  go_forward: {
    defaultTiming: "both",
    priority: "medium",
    delay: { before: 0, after: 800 },
  },
  refresh: {
    defaultTiming: "both",
    priority: "medium",
    delay: { before: 0, after: 1000 },
  },
  manage_tabs: {
    defaultTiming: "after",
    priority: "medium",
    delay: { before: 0, after: 500 },
  },

  // Low priority - No visual changes
  launch_browser: { defaultTiming: null, priority: "low", enabled: false },
  close_browser: { defaultTiming: null, priority: "low", enabled: false },
  resize_viewport: {
    defaultTiming: "after",
    priority: "low",
    delay: { before: 0, after: 200 },
  },
  find_element: { defaultTiming: null, priority: "low", enabled: false },
  wait_conditional: { defaultTiming: null, priority: "low", enabled: false },
  extract_text: { defaultTiming: null, priority: "low", enabled: false },
};

/**
 * Configuración de campos por tipo de nodo
 */
export const NODE_FIELD_CONFIGS = {
  open_url: [
    {
      name: "url",
      label: "URL",
      type: "text",
      placeholder: "https://ejemplo.com",
      required: true,
      validation: (value) => {
        if (!value) return "La URL es requerida";
        try {
          new URL(value);
          return null;
        } catch {
          return "URL inválida. Debe incluir http:// o https://";
        }
      },
    },
    {
      name: "waitUntil",
      label: "Condición de espera de carga",
      type: "select",
      options: [
        { value: "load", label: "Carga completa (Load: Recursos e imágenes)" },
        { value: "domcontentloaded", label: "DOM listo (DOMContentLoaded)" },
        { value: "networkidle", label: "Red inactiva (NetworkIdle)" },
        { value: "commit", label: "Navegación confirmada (Commit)" },
      ],
      // 'load' es el valor por defecto si se quiere replicar el antiguo 'waitForLoad: true'
      defaultValue: "load",
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 30000. Tiempo máximo para navegar.",
      // 30000 ms (30 segundos) es el valor predeterminado de Playwright
      defaultValue: 30000,
      min: 0,
    },
  ],

  resize_viewport: [
    {
      name: "width",
      label: "Width (px)",
      type: "number",
      defaultValue: 1024,
      required: true,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Width debe ser un número";
        if (Number(v) <= 0) return "Width debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "height",
      label: "Height (px)",
      type: "number",
      defaultValue: 768,
      required: true,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Height debe ser un número";
        if (Number(v) <= 0) return "Height debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/resize_viewport",
    },
  ],

  click: [
    {
      name: "selector",
      label: "Selector",
      type: "text",
      placeholder: '#algun-elemento o //button[@id="enviar"]',
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "El selector es obligatorio";
        return null;
      },
    },
    {
      name: "button",
      label: "Botón del mouse",
      type: "select",
      defaultValue: "left",
      options: [
        { value: "left", label: "Izquierdo" },
        { value: "right", label: "Derecho" },
        { value: "middle", label: "Central" },
      ],
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/click",
    },
  ],

  type_text: [
    {
      name: "selector",
      label: "Selector",
      type: "text",
      placeholder: '#campo-nombre-usuario o //input[@id="usuario"]',
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "El selector es obligatorio";
        return null;
      },
    },
    {
      name: "text",
      label: "Texto a ingresar",
      type: "text",
      placeholder: "Ej: mi_usuario@dominio.com",
      required: true,
      validation: (v) => {
        if (v === null || v === undefined)
          return "El texto a ingresar es obligatorio";
        return null;
      },
    },
    {
      name: "clearBeforeType",
      label: "Limpiar antes de escribir (clearBeforeType)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "delay",
      label: "Retardo por tecla (ms)",
      type: "number",
      defaultValue: 0,
      placeholder: "0 (escribir rápido) o 50 (escribir lento)",
      validation: (v) => {
        const num = Number(v);
        if (v === "" || v === undefined || Number.isNaN(num))
          return "Delay debe ser un número entero.";
        if (!Number.isInteger(num)) return "Delay debe ser un número entero.";
        if (num < 0) return "El retardo no puede ser negativo.";
        return null;
      },
    },
    {
      name: "timeout",
      label: "Tiempo máximo de espera (ms)",
      type: "number",
      defaultValue: 30000,
      validation: (v) => {
        const num = Number(v);
        if (v === "" || v === undefined || Number.isNaN(num))
          return "Timeout debe ser un número entero.";
        if (!Number.isInteger(num)) return "Timeout debe ser un número entero.";
        if (num < 1) return "El tiempo de espera debe ser al menos 1ms.";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/type_text",
    },
  ],

  select_option: [
    {
      name: "selector",
      label: "Selector del Dropdown (<select>)",
      type: "text",
      placeholder: "Ej: #pais-dropdown o select[name='country']",
      required: true,
      validation: (value) => {
        if (!value) return "El selector del elemento <select> es obligatorio.";
        return null;
      },
      hint: "Debe ser el selector del elemento principal <select>, no de las opciones <option>.",
    },
    {
      name: "selectionCriteria",
      label: "Criterio de Selección",
      type: "select",
      options: [
        { value: "value", label: "Por Valor (atributo 'value')" },
        { value: "label", label: "Por Etiqueta (texto visible)" },
        { value: "index", label: "Por Índice (posición, empezando en 0)" },
      ],
      defaultValue: "value",
      required: true,
      hint: "Define cómo Playwright debe buscar la opción a seleccionar.",
    },
    {
      name: "selectionValue",
      label: "Valor a Seleccionar",
      type: "text",
      placeholder:
        "Ej: 'ESP' si el criterio es Value, o 'España' si es Label, o '2' si es Index.",
      required: true,
      validation: (value) => {
        if (!value) return "El valor, etiqueta o índice es obligatorio.";
        return null;
      },
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 15000",
      defaultValue: 30000,
      min: 1,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El tiempo de espera debe ser al menos 1 ms.";
        return null;
      },
    },
  ],

  submit_form: [
    {
      name: "selector",
      label: "Selector del Formulario o Botón de Envío",
      type: "text",
      placeholder: "Ej: form#login-form o button[type='submit']",
      required: true,
      validation: (value) => {
        if (!value) return "El selector es obligatorio.";
        return null;
      },
      hint: "Debe ser el selector del elemento <form> o del botón que dispara el envío.",
    },
    {
      name: "waitForNavigation",
      label: "¿Esperar Navegación?",
      type: "boolean",
      defaultValue: true,
      required: true,
      hint: "Si está activo, espera a que la página cargue después de enviar el formulario. Desactívalo si el envío es por AJAX.",
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 60000",
      defaultValue: 30000,
      min: 1,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El tiempo de espera debe ser al menos 1 ms.";
        return null;
      },
    },
  ],

  scroll: [
    {
      name: "selector",
      label: "Selector del Contenedor (Opcional)",
      type: "text",
      placeholder:
        "Ej: #contenedor-scroll. Si está vacío, desplaza toda la página.",
      required: false,
      hint: "Dejar vacío para desplazar la ventana principal del navegador. Usar un selector para desplazar un elemento específico.",
    },
    {
      name: "direction",
      label: "Dirección de Desplazamiento",
      type: "select",
      options: [
        { value: "down", label: "Abajo (Down)" },
        { value: "up", label: "Arriba (Up)" },
        { value: "right", label: "Derecha (Right)" },
        { value: "left", label: "Izquierda (Left)" },
      ],
      defaultValue: "down",
      required: true,
      hint: "La dirección en la que se desplaza el contenido.",
    },
    {
      name: "amount",
      label: "Cantidad de Píxeles",
      type: "number",
      placeholder: "Ej: 500",
      defaultValue: 100,
      min: 1,
      required: true,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "La cantidad de píxeles debe ser al menos 1.";
        return null;
      },
      hint: "Cantidad de píxeles a desplazar en la dirección especificada.",
    },
    {
      name: "behavior",
      label: "Comportamiento",
      type: "select",
      options: [
        { value: "auto", label: "Inmediato (Auto)" },
        { value: "smooth", label: "Suave (Smooth)" },
      ],
      defaultValue: "auto",
      required: true,
    },
  ],

  drag_drop: [
    {
      name: "sourceSelector",
      label: "Selector de Origen (Elemento a Arrastrar)",
      type: "text",
      placeholder: "Ej: #draggable-item",
      required: true,
      validation: (value) => {
        if (!value) return "El selector de origen es obligatorio.";
        return null;
      },
    },
    {
      name: "targetSelector",
      label: "Selector de Destino (Elemento donde Soltar)",
      type: "text",
      placeholder: "Ej: #droppable-area",
      required: true,
      validation: (value) => {
        if (!value) return "El selector de destino es obligatorio.";
        return null;
      },
    },
    {
      name: "steps",
      label: "Pasos de Animación",
      type: "number",
      placeholder: "Ej: 20",
      defaultValue: 10,
      min: 1,
      required: true,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El número de pasos debe ser al menos 1.";
        return null;
      },
      hint: "Número de pasos para simular el movimiento del ratón. Más pasos = animación más suave.",
    },
    {
      name: "force",
      label: "¿Forzar Acción?",
      type: "boolean",
      defaultValue: false,
      required: true,
      hint: "Si está activo, ignora las comprobaciones de visibilidad/editabilidad de Playwright antes de arrastrar.",
    },
  ],

  upload_file: [
    {
      name: "selector",
      label: "Selector del Input File",
      type: "text",
      placeholder: "Ej: input[type='file'] o #file-upload-input",
      required: true,
      validation: (value) => {
        if (!value) return "El selector del input file es obligatorio.";
        return null;
      },
    },
    {
      name: "files",
      label: "Rutas de Archivos (Separadas por coma si son varias)",
      type: "textarea", // Usamos textarea para múltiples rutas
      placeholder: "Ej: /ruta/a/archivo1.pdf, /ruta/a/archivo2.png",
      required: true,
      validation: (value) => {
        if (!value) return "Las rutas de los archivos son obligatorias.";
        return null;
      },
      hint: "Las rutas deben ser accesibles desde el entorno donde se ejecuta el backend (servidor de automatización).",
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 45000",
      defaultValue: 30000,
      min: 1,
      required: true,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El tiempo de espera debe ser al menos 1 ms.";
        return null;
      },
    },
  ],

  wait_visible: [
    {
      name: "selector",
      label: "Selector",
      type: "text",
      placeholder: '#modal-confirmacion-listo or //div[@id="modal"]',
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "Selector requerido";
        return null;
      },
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 15000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) < 0) return "Timeout no puede ser negativo";
        return null;
      },
    },
    {
      name: "scrollIntoView",
      label: "Hacer scroll al elemento antes de esperar",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/wait_visible",
    },
  ],

  wait_navigation: [
    {
      name: "waitUntil",
      label: "Esperar hasta",
      type: "select",
      defaultValue: "networkidle",
      options: [
        { value: "load", label: "load" },
        { value: "domcontentloaded", label: "domcontentloaded" },
        { value: "networkidle", label: "networkidle" },
      ],
      required: true,
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 10000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) <= 0) return "Timeout debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/wait_navigation",
    },
  ],

  wait_network: [
    {
      name: "idleTime",
      label: "Idle time (ms)",
      type: "number",
      defaultValue: 1000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "idleTime debe ser un número";
        if (Number(v) < 0) return "idleTime no puede ser negativo";
        return null;
      },
    },
    {
      name: "includeResources",
      label: "Incluir recursos (requests de recursos)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/wait_network",
    },
  ],

  wait_conditional: [
    {
      name: "conditionScript",
      label: "Condition Script (JS)",
      type: "textarea",
      placeholder: "return window.isDataLoaded === true;",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "El script de condición es obligatorio";
        return null;
      },
    },
    {
      name: "polling",
      label: "Polling (ms)",
      type: "number",
      defaultValue: 500,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Polling debe ser un número";
        if (Number(v) <= 0) return "Polling debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 20000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) <= 0) return "Timeout debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/wait_conditional",
    },
  ],

  take_screenshot: [
    {
      name: "selector",
      label: "Selector del Elemento (Opcional)",
      type: "text",
      placeholder: "Ej: #mi-banner. Si está vacío, captura la página/viewport.",
      required: false,
      hint: "Dejar vacío para capturar toda la ventana o página (según Full Page).",
    },
    {
      name: "path",
      label: "Ruta de Guardado (Opcional)",
      type: "text",
      placeholder: "Ej: ./screenshots/login.png",
      required: false,
      hint: "Ruta en el servidor de automatización. Si está vacía, devuelve la imagen en la respuesta (útil para IA).",
    },
    {
      name: "fullPage",
      label: "¿Capturar Página Completa?",
      type: "boolean",
      defaultValue: false,
      required: true,
      hint: "Si está activo, desplaza y captura toda la longitud de la página. Ignorado si se usa Selector.",
    },
    {
      name: "format",
      label: "Formato de Imagen",
      type: "select",
      options: [
        { value: "png", label: "PNG (Sin pérdida, por defecto)" },
        { value: "jpeg", label: "JPEG (Comprimido, permite calidad)" },
      ],
      defaultValue: "png",
      required: true,
    },
    {
      name: "quality",
      label: "Calidad (1-100)",
      type: "number",
      placeholder: "100",
      defaultValue: 100,
      min: 1,
      max: 100,
      required: true,
      validation: (value) => {
        if (value !== undefined && value !== null && (value < 1 || value > 100))
          return "La calidad debe estar entre 1 y 100.";
        return null;
      },
      hint: "Solo se aplica si el formato es JPEG.",
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 45000",
      defaultValue: 30000,
      min: 1,
      required: true,
    },
  ],

  save_dom: [
    {
      name: "selector",
      label: "Selector del Elemento (Opcional)",
      type: "text",
      placeholder: "Ej: #content-body. Si está vacío, guarda el DOM completo.",
      required: false,
      hint: "Dejar vacío para guardar todo el contenido HTML de la página.",
    },
    {
      name: "path",
      label: "Ruta de Guardado de Archivo (Opcional)",
      type: "text",
      placeholder: "Ej: ./snapshots/homepage.html",
      required: false,
      hint: "Si está vacío, el DOM se guardará en la variable especificada. (Ruta por defecto: storages/dom_snapshots/)",
    },
    {
      name: "variableName",
      label: "Nombre de la Variable de Salida",
      type: "text",
      placeholder: "Ej: html_content",
      required: false,
      // Lógica de visibilidad/requerimiento condicional
      conditional: {
        field: "path",
        is: null, // Si path está vacío o nulo
      },
      validation: (value, allParams) => {
        // Replicamos la lógica Joi: si path no está presente o está vacío, variableName es obligatorio.
        if (!allParams.path && (!value || value.trim() === "")) {
          return "Este campo es obligatorio si NO se proporciona una ruta de archivo (Path).";
        }
        return null;
      },
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 30000",
      defaultValue: 30000,
      min: 1,
      required: true,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El tiempo de espera debe ser al menos 1 ms.";
        return null;
      },
    },
  ],

  log_errors: [
    {
      name: "logToFile",
      label: "¿Registrar Errores a Archivo?",
      type: "boolean",
      defaultValue: false,
      required: true,
      hint: "Si está activo, los errores de consola y JS se guardarán en el archivo especificado. Si no, solo se imprimen en la consola del backend.",
    },
    {
      name: "filePath",
      label: "Ruta del Archivo de Logs",
      type: "text",
      placeholder: "Ej: ./logs/errores-test.log",
      required: false,
      // Lógica de visibilidad/requerimiento condicional
      conditional: {
        field: "logToFile",
        is: true,
      },
      validation: (value, allParams) => {
        // Replicamos la lógica Joi: si logToFile es true, filePath es obligatorio.
        if (allParams.logToFile === true && (!value || value.trim() === "")) {
          return "La ruta del archivo es obligatoria si 'Registrar Errores a Archivo' está activo.";
        }
        return null;
      },
      hint: "Ruta completa del archivo de logs. (Ruta por defecto sugerida: storages/browser_logs/errors.log)",
    },
    {
      name: "timeout",
      label: "Duración de Escucha (ms)",
      type: "number",
      placeholder: "0 (Indefinido)",
      defaultValue: 0,
      min: 0,
      required: true,
      hint: "Tiempo que el backend esperará errores después de esta acción. 0 significa que la escucha es indefinida y se cancela al finalizar la prueba.",
    },
  ],

  listen_events: [
    {
      name: "eventType",
      label: "Tipo de evento",
      type: "select",
      defaultValue: "click",
      options: [
        { value: "click", label: "click" },
        { value: "input", label: "input" },
        { value: "change", label: "change" },
        { value: "submit", label: "submit" },
        { value: "custom", label: "custom" },
      ],
      required: true,
    },
    {
      name: "selector",
      label: "Selector (donde escuchar)",
      type: "text",
      placeholder: "#boton-finalizar-compra (o dejar vacío para document)",
      required: false,
    },
    {
      name: "logToFile",
      label: "Loggear eventos a archivo",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "filePath",
      label: "Ruta del archivo (si logToFile=true)",
      type: "text",
      placeholder: "/ruta/logs/clicks_monitoreados.txt",
      defaultValue: "",
    },
    {
      name: "timeout",
      label: "Timeout (ms) — cuánto tiempo escuchar",
      type: "number",
      defaultValue: 60000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) <= 0) return "Timeout debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/listen_events",
    },
  ],

  intercept_request: [
    {
      name: "urlPattern",
      label: "URL Pattern",
      type: "text",
      placeholder: "**/api/usuarios/login",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "urlPattern es obligatorio" : null,
    },
    {
      name: "method",
      label: "Método HTTP",
      type: "select",
      defaultValue: "POST",
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "DELETE", label: "DELETE" },
        { value: "PATCH", label: "PATCH" },
        { value: "ALL", label: "ALL" },
      ],
    },
    {
      name: "action",
      label: "Acción sobre la request",
      type: "select",
      defaultValue: "mock",
      options: [
        { value: "mock", label: "mock (responder con payload simulado)" },
        { value: "block", label: "block (bloquear la request)" },
        { value: "modify", label: "modify (modificar request/response)" },
      ],
    },
    {
      name: "responseMock",
      label: "Response mock (JSON string)",
      type: "textarea",
      placeholder: '{"success": false, "message": "Fallo simulado"}',
      defaultValue: "",
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 60000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) < 0) return "Timeout no puede ser negativo";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/intercept_request",
    },
  ],

  mock_response: [
    {
      name: "urlPattern",
      label: "URL Pattern",
      type: "text",
      placeholder: "**/api/v1/productos/*",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "urlPattern es obligatorio";
        return null;
      },
    },
    {
      name: "method",
      label: "Método HTTP",
      type: "select",
      defaultValue: "GET",
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "DELETE", label: "DELETE" },
        { value: "ALL", label: "ALL (Cualquiera)" },
      ],
    },
    {
      name: "status",
      label: "Status Code",
      type: "number",
      defaultValue: 200,
      required: true,
      validation: (v) => {
        if (!v || Number.isNaN(Number(v)) || !Number.isInteger(Number(v)))
          return "Status debe ser un número entero";
        if (Number(v) < 100 || Number(v) > 599)
          return "Status fuera del rango válido (1xx-5xx)";
        return null;
      },
    },
    {
      name: "responseBody",
      label: "Cuerpo de la Respuesta (JSON/Texto)",
      type: "textarea",
      placeholder: '{"data": "mocked response"}',
      required: true,
    },
    {
      name: "headers",
      label: "Headers (JSON String)",
      type: "textarea",
      placeholder: '{"Content-Type": "application/json"}',
    },
    {
      name: "timeout",
      label: "Duración del Mock (ms) — 0 = persistente",
      type: "number",
      defaultValue: 120000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) < 0) return "Timeout no puede ser negativo";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/mock_response",
    },
  ],

  block_resource: [
    {
      name: "urlPattern",
      label: "URL Pattern",
      type: "text",
      placeholder: "https://tracking.analytics.com/**",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "urlPattern es obligatorio";
        return null;
      },
    },
    {
      name: "resourceType",
      label: "Tipo de recurso",
      type: "select",
      defaultValue: "script",
      options: [
        { value: "document", label: "document" },
        { value: "script", label: "script" },
        { value: "image", label: "image" },
        { value: "stylesheet", label: "stylesheet" },
        { value: "xhr", label: "xhr" },
        { value: "fetch", label: "fetch" },
        { value: "media", label: "media" },
        { value: "font", label: "font" },
        { value: "other", label: "other" },
      ],
    },
    {
      name: "timeout",
      label: "Timeout (ms) — 0 = inmediato",
      type: "number",
      defaultValue: 0,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) < 0) return "Timeout no puede ser negativo";
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/block_resource",
    },
  ],

  modify_headers: [
    {
      name: "urlPattern",
      label: "Patrón de URL",
      type: "text",
      placeholder: "**/api/v1/*",
      required: true,
    },
    {
      name: "headers",
      label: "Cabeceras (JSON)",
      type: "textarea",
      placeholder: '{"Authorization": "Bearer TOKEN", "X-Test": "true"}',
      required: true,
    },
    {
      name: "method",
      label: "Método HTTP",
      type: "select",
      options: [
        { label: "Cualquiera", value: "" },
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "DELETE", value: "DELETE" },
        { label: "PATCH", value: "PATCH" },
        { label: "OPTIONS", value: "OPTIONS" },
      ],
      defaultValue: "",
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      placeholder: "0 = indefinido",
      defaultValue: 0,
    },
    {
      name: "browserId",
      label: "ID del Navegador",
      type: "text",
      placeholder: "ID-REAL-DEL-NAVEGADOR",
    },
  ],

  manage_cookies: [
    {
      name: "action",
      label: "Acción",
      type: "select",
      defaultValue: "set",
      options: [
        { value: "set", label: "set" },
        { value: "get", label: "get" },
        { value: "delete", label: "delete" },
        { value: "clear", label: "clear" },
      ],
      required: true,
    },
    {
      name: "cookiesData",
      label: "Cookies data (JSON string o vacío según acción)",
      type: "textarea",
      placeholder:
        '[{"name":"auth_token","value":"...","domain":"ejemplo.com","secure":true}]',
      defaultValue: "",
      // validación ligera: si acción= set o delete, debe existir algo
      validation: (v, form) => {
        if (
          (form.action === "set" || form.action === "delete") &&
          (!v || String(v).trim() === "")
        ) {
          return "cookiesData es requerido para action=set/delete (puede ser JSON string)";
        }
        return null;
      },
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/manage_cookies",
    },
  ],

  manage_storage: [
    {
      name: "storageType",
      label: "Tipo de storage",
      type: "select",
      defaultValue: "local",
      options: [
        { value: "local", label: "localStorage" },
        { value: "session", label: "sessionStorage" },
      ],
      required: true,
    },
    {
      name: "action",
      label: "Acción",
      type: "select",
      defaultValue: "set",
      options: [
        { value: "set", label: "set" },
        { value: "get", label: "get" },
        { value: "remove", label: "remove" },
        { value: "clear", label: "clear" },
      ],
      required: true,
    },
    {
      name: "key",
      label: "Clave (key)",
      type: "text",
      placeholder: "userToken",
      defaultValue: "",
    },
    {
      name: "value",
      label: "Valor (solo para set)",
      type: "textarea",
      placeholder: "ABC-SESSION-XYZ-987",
      defaultValue: "",
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/manage_storage",
    },
  ],

  inject_tokens: [
    {
      name: "target",
      label: "Target",
      type: "select",
      defaultValue: "header",
      options: [
        { value: "header", label: "header" },
        { value: "query", label: "query" },
        { value: "cookie", label: "cookie" },
      ],
      required: true,
    },
    {
      name: "key",
      label: "Clave (header / query param / cookie name)",
      type: "text",
      placeholder: "Authorization",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "La clave es obligatoria" : null,
    },
    {
      name: "value",
      label: "Valor (token)",
      type: "text",
      placeholder: "Bearer ASDF-123-QWER-987",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "El valor es obligatorio" : null,
    },
    {
      name: "urlPattern",
      label: "URL Pattern",
      type: "text",
      placeholder: "**/api/v2/*",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "urlPattern es obligatorio" : null,
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/inject_tokens",
    },
  ],

  persist_session: [
    {
      name: "action",
      label: "Acción",
      type: "select",
      defaultValue: "save",
      options: [
        { value: "save", label: "Guardar sesión" },
        { value: "load", label: "Cargar sesión" },
        { value: "clear", label: "Limpiar sesión" },
      ],
      required: true,
    },
    {
      name: "path",
      label: "Ruta del archivo de sesión",
      type: "text",
      placeholder: "/data/sesion_admin_001.json",
      defaultValue: "",
      validation: (v, form) => {
        if (
          (form.action === "save" || form.action === "load") &&
          (!v || String(v).trim() === "")
        ) {
          return "La ruta (path) es obligatoria para guardar o cargar una sesión.";
        }
        return null;
      },
    },
    {
      name: "includeLocalStorage",
      label: "Incluir Local Storage",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "includeSessionStorage",
      label: "Incluir Session Storage",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/persist_session",
    },
  ],

  create_context: [
    {
      name: "browserId",
      label: "Browser ID (padre)",
      type: "text",
      placeholder: "ID del navegador padre (ej. 1)",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "Browser ID es obligatorio" : null,
    },
    {
      name: "storageState",
      label: "Storage state (ruta archivo, opcional)",
      type: "text",
      placeholder: "data/mobile_auth.json",
      defaultValue: "",
    },
    {
      name: "viewportWidth",
      label: "Viewport width (px)",
      type: "number",
      defaultValue: 375,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Viewport width debe ser un número";
        if (Number(v) <= 0) return "Viewport width debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "viewportHeight",
      label: "Viewport height (px)",
      type: "number",
      defaultValue: 667,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Viewport height debe ser un número";
        if (Number(v) <= 0) return "Viewport height debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "userAgent",
      label: "User Agent (opcional)",
      type: "text",
      placeholder: "Mozilla/5.0 (iPhone...)",
      defaultValue: "",
    },
    {
      name: "geolocation",
      label: "Geolocation (lat, lon) (opcional)",
      type: "text",
      placeholder: "34.0522, -118.2437",
      defaultValue: "",
    },
    {
      name: "locale",
      label: "Locale",
      type: "text",
      placeholder: "en-US",
      defaultValue: "",
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/create_context",
    },
  ],

  cleanup_state: [
    {
      name: "browserId",
      label: "Browser ID / Context",
      type: "text",
      placeholder: "ID del navegador o contexto (ej. 1)",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "Browser ID es obligatorio" : null,
    },
    {
      name: "target",
      label: "Target",
      type: "select",
      defaultValue: "context",
      options: [
        { value: "context", label: "context" },
        { value: "page", label: "page" },
        { value: "browser", label: "browser" },
      ],
      required: true,
    },
    {
      name: "includeCookies",
      label: "Incluir cookies",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "includeLocalStorage",
      label: "Incluir localStorage",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "includeSessionStorage",
      label: "Incluir sessionStorage",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "includeIndexedDB",
      label: "Incluir IndexedDB",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "includePermissions",
      label: "Incluir permisos (geoloc, notifications...)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/cleanup_state",
    },
  ],

  handle_hooks: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "Browser ID es obligatorio" : null,
    },
    {
      name: "hookType",
      label: "Hook Type",
      type: "select",
      defaultValue: "afterAction",
      options: [
        { value: "beforeAction", label: "beforeAction" },
        { value: "afterAction", label: "afterAction" },
        { value: "onError", label: "onError" },
        { value: "onStart", label: "onStart" },
        { value: "onStop", label: "onStop" },
      ],
      required: true,
    },
    {
      name: "actionName",
      label: "Action Name (scope del hook, opcional)",
      type: "text",
      placeholder: "click / type_text / * (leave blank for all)",
      defaultValue: "",
    },
    {
      name: "callbackCode",
      label: "Callback code (JS as string)",
      type: "textarea",
      placeholder: "async (page, action, params, result) => { /* ... */ }",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === ""
          ? "El código de callback es obligatorio"
          : null,
    },
    {
      name: "once",
      label: "Ejecutar una sola vez",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/handle_hooks",
    },
  ],

  control_exceptions: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "Browser ID es obligatorio";
        return null;
      },
    },
    {
      name: "exceptionType",
      label: "Tipo de excepción",
      type: "select",
      defaultValue: "elementNotFound",
      options: [
        { value: "all", label: "all" },
        { value: "navigation", label: "navigation" },
        { value: "timeout", label: "timeout" },
        { value: "elementNotFound", label: "elementNotFound" },
        { value: "network", label: "network" },
        { value: "custom", label: "custom" },
      ],
      required: true,
    },
    {
      name: "action",
      label: "Acción ante la excepción",
      type: "select",
      defaultValue: "retry",
      options: [
        { value: "ignore", label: "ignore" },
        { value: "log", label: "log" },
        { value: "retry", label: "retry" },
        { value: "abort", label: "abort" },
      ],
      required: true,
    },
    {
      name: "maxRetries",
      label: "Máx. reintentos (si action=retry)",
      type: "number",
      defaultValue: 3,
      validation: (v, form) => {
        if (form.action === "retry") {
          if (v === "" || v === undefined || Number.isNaN(Number(v)))
            return "maxRetries debe ser un número";
          if (Number(v) < 1)
            return "maxRetries debe ser al menos 1 cuando action=retry";
        }
        return null;
      },
    },
    {
      name: "logFile",
      label: "Ruta de log (requerida para log/retry)",
      type: "text",
      placeholder: "logs/reintentos_fallidos.txt",
      defaultValue: "",
      validation: (v, form) => {
        if (
          (form.action === "log" || form.action === "retry") &&
          (!v || String(v).trim() === "")
        ) {
          return "logFile es obligatorio cuando action es log o retry";
        }
        return null;
      },
    },
  ],

  read_data: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "sourceType",
      label: "Tipo de fuente",
      type: "select",
      defaultValue: "csv",
      options: [
        { value: "csv", label: "CSV" },
        { value: "json", label: "JSON" },
        { value: "txt", label: "Texto plano" },
      ],
      required: true,
    },
    {
      name: "path",
      label: "Ruta del archivo",
      type: "text",
      placeholder: "data/test_users.csv",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "La ruta del archivo es obligatoria";
        return null;
      },
    },
    {
      name: "variableName",
      label: "Nombre de variable",
      type: "text",
      placeholder: "userList",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "El nombre de la variable es obligatorio";
        return null;
      },
    },
    {
      name: "hasHeader",
      label: "Archivo tiene encabezado",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "encoding",
      label: "Codificación",
      type: "select",
      defaultValue: "utf-8",
      options: [
        { value: "utf-8", label: "UTF-8" },
        { value: "latin1", label: "Latin-1" },
        { value: "ascii", label: "ASCII" },
      ],
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/read_data",
    },
  ],

  save_results: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "destinationType",
      label: "Tipo de destino",
      type: "select",
      defaultValue: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV" },
        { value: "txt", label: "Texto plano (TXT)" },
      ],
      required: true,
    },
    {
      name: "path",
      label: "Ruta de guardado",
      type: "text",
      placeholder: "reports/final_report.json",
      required: true,
    },
    {
      name: "dataVariableName",
      label: "Variable con los datos",
      type: "text",
      placeholder: "finalReportObject",
      required: true,
    },
    {
      name: "encoding",
      label: "Codificación del archivo",
      type: "select",
      defaultValue: "utf-8",
      options: [
        { value: "utf-8", label: "UTF-8" },
        { value: "latin1", label: "Latin-1" },
        { value: "ascii", label: "ASCII" },
      ],
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/save_results",
    },
  ],

  handle_downloads: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "Browser ID es obligatorio" : null,
    },
    {
      name: "action",
      label: "Acción",
      type: "select",
      defaultValue: "saveAndValidate",
      options: [
        { value: "save", label: "Guardar" },
        { value: "validate", label: "Validar archivo existente" },
        { value: "saveAndValidate", label: "Guardar y validar" },
        { value: "waitOnly", label: "Solo esperar descarga" },
      ],
      required: true,
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 60000,
      validation: (v) => {
        if (v && (isNaN(Number(v)) || Number(v) < 0))
          return "Timeout debe ser un número positivo";
        return null;
      },
    },
    {
      name: "path",
      label: "Ruta destino (descarga)",
      type: "text",
      placeholder: "reports/reporte_generado_hoy.pdf",
      defaultValue: "",
      required: true,
      validation: (v) =>
        !v || String(v).trim() === "" ? "La ruta (path) es obligatoria" : null,
    },
    {
      name: "expectedFileName",
      label: "Nombre esperado del archivo",
      type: "text",
      placeholder: "reporte_de_ventas.pdf",
      defaultValue: "",
    },
    {
      name: "minSizeKB",
      label: "Tamaño mínimo (KB)",
      type: "number",
      defaultValue: 10,
      validation: (v) => {
        if (v && (isNaN(Number(v)) || Number(v) < 0))
          return "minSizeKB debe ser un número positivo";
        return null;
      },
    },
    {
      name: "maxSizeKB",
      label: "Tamaño máximo (KB)",
      type: "number",
      defaultValue: 5000,
      validation: (v) => {
        if (v && (isNaN(Number(v)) || Number(v) <= 0))
          return "maxSizeKB debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/handle_downloads",
    },
  ],

  call_llm: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder: "ID del navegador (ej. 1) — opcional",
      defaultValue: "",
    },
    {
      name: "model",
      label: "Modelo",
      type: "select",
      defaultValue: "gemini",
      options: [
        { value: "gemini", label: "gemini" },
        { value: "gpt4", label: "gpt4" },
        { value: "gpt4o", label: "gpt4o" },
        { value: "local", label: "local" },
      ],
      required: true,
    },
    {
      name: "prompt",
      label: "Prompt",
      type: "textarea",
      placeholder: "Escribe el prompt para el modelo",
      required: true,
    },
    {
      name: "variableName",
      label: "Nombre de variable",
      type: "text",
      placeholder: "adCopy",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "El nombre de la variable es obligatorio";
        return null;
      },
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "number",
      defaultValue: 0.7,
      validation: (v) => {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 2)
          return "Temperature debe estar entre 0 y 2";
        return null;
      },
    },
    {
      name: "maxTokens",
      label: "Max tokens",
      type: "number",
      defaultValue: 150,
      validation: (v) => {
        const n = Number(v);
        if (Number.isNaN(n) || n <= 0)
          return "maxTokens debe ser un número positivo";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/call_llm",
    },
  ],

  generate_data: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder:
        "ID del navegador (ej. 1) — opcional para acciones no ligadas al navegador",
      defaultValue: "",
    },
    {
      name: "model",
      label: "Modelo",
      type: "select",
      defaultValue: "gpt4",
      options: [
        { value: "gpt4", label: "gpt4" },
        { value: "gpt4o", label: "gpt4o" },
        { value: "gemini", label: "gemini" },
        { value: "local", label: "local" },
      ],
      required: true,
    },
    {
      name: "prompt",
      label: "Prompt",
      type: "textarea",
      placeholder: "Escribe el prompt que quieres enviar al modelo",
      required: true,
    },
    {
      name: "variableName",
      label: "Nombre de variable",
      type: "text",
      placeholder: "mockedUsers",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "El nombre de la variable es obligatorio";
        return null;
      },
    },
    {
      name: "expectedFormat",
      label: "Formato esperado",
      type: "select",
      defaultValue: "json",
      options: [
        { value: "json", label: "json" },
        { value: "csv", label: "csv" },
        { value: "text", label: "text" },
      ],
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "number",
      defaultValue: 0.7,
      validation: (v) => {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 2)
          return "Temperature debe estar entre 0 y 2";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/generate_data",
    },
  ],

  validate_semantic: [
    {
      name: "browserId",
      label: "Browser ID",
      type: "text",
      placeholder: "ID del navegador (ej. 1)",
      required: true,
    },
    {
      name: "model",
      label: "Modelo",
      type: "select",
      defaultValue: "gemini",
      options: [
        { value: "gemini", label: "gemini" },
        { value: "gpt-4o", label: "gpt-4o" },
        { value: "local", label: "local" },
      ],
      required: true,
    },
    {
      name: "sourceTextVariable",
      label: "Variable con texto fuente",
      type: "text",
      placeholder: "extracted_product_description",
      required: true,
    },
    {
      name: "validationPrompt",
      label: "Prompt de validación",
      type: "textarea",
      placeholder: "Inserta el prompt de validación que se enviará al modelo",
      required: true,
    },
    {
      name: "expectedAnswer",
      label: "Respuesta esperada",
      type: "text",
      placeholder: "APROBADO",
      required: true,
    },
    {
      name: "validationTimeout",
      label: "Timeout de validación (ms)",
      type: "number",
      defaultValue: 15000,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/validate_semantic",
    },
  ],

  run_tests: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder: "ID del navegador (ej. 1) — opcional",
      defaultValue: "",
    },
    {
      name: "testSuite",
      label: "Ruta del test / suite",
      type: "text",
      placeholder: "tests/flujo_critico.spec.js",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "")
          return "La ruta del test es obligatoria";
        return null;
      },
    },
    {
      name: "parallel",
      label: "Ejecutar en paralelo",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "retries",
      label: "Reintentos por test en fallo",
      type: "number",
      defaultValue: 0,
      validation: (v) => {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0) return "retries debe ser >= 0";
        return null;
      },
    },
    {
      name: "reportFormat",
      label: "Formato de reporte",
      type: "select",
      defaultValue: "junit",
      options: [
        { value: "junit", label: "junit" },
        { value: "html", label: "html" },
        { value: "json", label: "json" },
      ],
    },
    {
      name: "timeout",
      label: "Timeout total (ms)",
      type: "number",
      defaultValue: 900000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "timeout debe ser un número";
        if (Number(v) <= 0) return "timeout debe ser mayor que 0";
        return null;
      },
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/run_tests",
    },
  ],

  return_code: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder: "ID del navegador (ej. 1) — opcional",
      defaultValue: "",
    },
    {
      name: "successField",
      label: "Campo de éxito (dot notation)",
      type: "text",
      placeholder: "testResults.allTestsPassed",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "successField es obligatorio";
        return null;
      },
    },
    {
      name: "exitOnFail",
      label: "Salir con código en fallo",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "customCodes",
      label: "Custom codes (JSON string)",
      type: "textarea",
      placeholder: '{ "success": 0, "failed": 10, "warning": 5 }',
      defaultValue: '{ "success": 0, "failed": 10, "warning": 5 }',
    },
    {
      name: "verbose",
      label: "Verbose (logs detallados)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/return_code",
    },
  ],

  integrate_ci: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder: "ID del navegador (ej. 1) — opcional",
      defaultValue: "",
    },
    {
      name: "provider",
      label: "Proveedor CI",
      type: "select",
      defaultValue: "gitlab",
      options: [
        { value: "gitlab", label: "GitLab" },
        { value: "github", label: "GitHub" },
        { value: "jenkins", label: "Jenkins" },
        { value: "bitbucket", label: "Bitbucket" },
      ],
      required: true,
    },
    {
      name: "saveArtifacts",
      label: "Guardar artefactos",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "outputPath",
      label: "Ruta de salida (artifacts)",
      type: "text",
      placeholder: "gitlab-artifacts",
      defaultValue: "gitlab-artifacts",
    },
    {
      name: "uploadReports",
      label: "Subir reportes",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "envVariables",
      label: "Env variables (JSON string)",
      type: "textarea",
      placeholder: '{ "CI_TEST_LEVEL": "E2E_FULL" }',
      defaultValue: '{ "CI_TEST_LEVEL": "E2E_FULL" }',
    },
    {
      name: "retryOnFail",
      label: "Reintentos en fallo",
      type: "number",
      defaultValue: 0,
      validation: (v) => {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0) return "retryOnFail debe ser >= 0";
        return null;
      },
    },
    {
      name: "verbose",
      label: "Verbose (logs detallados)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/integrate_ci",
    },
  ],

  find_element: [
    {
      name: "selector",
      label: "Selector",
      type: "text",
      placeholder: '#id-del-boton-principal or //button[text()="OK"]',
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "Selector requerido";
        return null;
      },
    },
    {
      name: "selectorType",
      label: "Selector Type",
      type: "select",
      defaultValue: "css",
      options: [
        { value: "css", label: "css" },
        { value: "xpath", label: "xpath" },
      ],
      required: true,
    },
    {
      name: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 10000,
      validation: (v) => {
        if (v === "" || v === undefined || Number.isNaN(Number(v)))
          return "Timeout debe ser un número";
        if (Number(v) < 0) return "Timeout no puede ser negativo";
        return null;
      },
    },
    {
      name: "visible",
      label: "Visible (esperar a visible)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/find_element",
    },
  ],

  get_set_content: [
    {
      name: "selector",
      label: "Selector",
      type: "text",
      placeholder: "#elemento o .clase",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "Selector requerido";
        return null;
      },
    },
    {
      name: "action",
      label: "Acción",
      type: "select",
      defaultValue: "get",
      options: [
        { value: "get", label: "Obtener (GET)" },
        { value: "set", label: "Establecer (SET)" },
      ],
      required: true,
    },
    {
      name: "contentType",
      label: "Tipo de Contenido",
      type: "select",
      defaultValue: "text",
      options: [
        { value: "text", label: "Texto (textContent)" },
        { value: "html", label: "HTML (innerHTML)" },
        { value: "attribute", label: "Atributo HTML" },
      ],
      required: true,
      hint: "Especifica qué tipo de contenido obtener o establecer",
    },
    {
      name: "attribute",
      label: "Nombre del Atributo",
      type: "text",
      placeholder: "src, href, data-id, value, etc.",
      conditional: {
        field: "contentType",
        is: "attribute",
      },
      validation: (value, allParams) => {
        if (
          allParams.contentType === "attribute" &&
          (!value || value.trim() === "")
        ) {
          return "El nombre del atributo es requerido cuando se selecciona 'Atributo HTML'";
        }
        return null;
      },
      hint: "Nombre del atributo HTML a obtener o modificar",
    },
    {
      name: "value",
      label: "Valor a Establecer",
      type: "textarea",
      placeholder: "Nuevo contenido o valor",
      conditional: {
        field: "action",
        is: "set",
      },
      hint: "Contenido que se establecerá. Puede ser cadena vacía para limpiar.",
    },
    {
      name: "clearBeforeSet",
      label: "Limpiar antes de establecer",
      type: "checkbox",
      defaultValue: true,
      conditional: {
        field: "action",
        is: "set",
      },
      hint: "Si está activo, limpia el contenido existente antes de establecer el nuevo valor",
    },
  ],

  cli_params: [
    {
      name: "browserId",
      label: "Browser ID (opcional)",
      type: "text",
      placeholder: "ID del navegador (ej. 1) — opcional",
      defaultValue: "",
    },
    {
      name: "paramName",
      label: "Nombre del parámetro (CLI)",
      type: "text",
      placeholder: "--targetEnv",
      required: true,
      validation: (v) => {
        if (!v || String(v).trim() === "") return "paramName es obligatorio";
        return null;
      },
    },
    {
      name: "paramType",
      label: "Tipo de parámetro",
      type: "select",
      defaultValue: "string",
      options: [
        { value: "string", label: "string" },
        { value: "number", label: "number" },
        { value: "boolean", label: "boolean" },
        { value: "json", label: "json" },
      ],
      required: true,
    },
    {
      name: "defaultValue",
      label: "Valor por defecto",
      type: "text",
      placeholder: "staging",
      defaultValue: "",
    },
    {
      name: "required",
      label: "Requerido",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "validationCode",
      label: "Código de validación (JS, opcional)",
      type: "textarea",
      placeholder:
        "if (value !== 'dev' && value !== 'staging' && value !== 'prod') { throw new Error('El entorno debe ser dev, staging o prod.'); }",
      defaultValue: "",
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/cli_params",
    },
  ],

  wait_for_element: [
    {
      name: "selector",
      label: "Selector (CSS/XPath)",
      type: "text",
      placeholder: "Ej: #mi-id o .mi-clase",
      required: true,
      validation: (value) => {
        if (!value) return "El selector del elemento es obligatorio.";
        return null; // Validación básica de no vacío, el backend hace el resto.
      },
    },
    {
      name: "condition",
      label: "Condición de Espera",
      type: "select",
      options: [
        { value: "visible", label: "Visible (Aparece en la pantalla)" },
        { value: "hidden", label: "Oculto (Desaparece de la pantalla)" },
        { value: "attached", label: "Adjunto al DOM" },
        { value: "detached", label: "Desadjunto del DOM" },
      ],
      defaultValue: "visible",
      required: true,
    },
    {
      name: "timeout",
      label: "Tiempo de espera (ms)",
      type: "number",
      placeholder: "Ej: 15000",
      defaultValue: 30000,
      min: 1,
      validation: (value) => {
        if (value !== undefined && value !== null && value < 1)
          return "El tiempo de espera debe ser al menos 1 ms.";
        return null;
      },
    },
  ],

  execute_js: [
    {
      name: "script",
      label: "Código JavaScript (función)",
      type: "textarea", // Usamos textarea para bloques de código
      placeholder: "Ej: () => { return document.title; }",
      required: true,
      validation: (value) => {
        if (!value) return "El script de JavaScript es obligatorio.";
        return null;
      },
      hint: "El script debe ser una función anónima. Ej: () => { /* tu código */ }",
    },
    {
      name: "args",
      label: "Argumentos (JSON)",
      type: "text",
      placeholder: "Ej: ['valor1', 123, true] (deben ser JSON serializable)",
      required: false,
      hint: "Opcional. Argumentos que se pasarán a la función JavaScript.",
    },
    {
      name: "returnValue",
      label: "¿Esperar valor de retorno?",
      type: "boolean",
      defaultValue: false,
      required: true,
      hint: "Si está activo, el resultado del script se guardará en una variable.",
    },
    {
      name: "variableName",
      label: "Nombre de la Variable de Salida",
      type: "text",
      placeholder: "Ej: titulo_pagina",
      // Lógica de visibilidad condicional en el frontend
      conditional: {
        field: "returnValue",
        is: true,
      },
      // Lógica de validación condicional en el frontend (replicando el Joi)
      validation: (value, allParams) => {
        if (allParams.returnValue === true && (!value || value.trim() === "")) {
          return "Este campo es obligatorio cuando 'Esperar valor de retorno' está activo.";
        }
        return null;
      },
    },
  ],

  extract_text: [
    {
      name: "selector",
      label: "Selector CSS",
      type: "text",
      placeholder: ".content, #text",
      required: true,
    },
    {
      name: "variableName",
      label: "Guardar en variable",
      type: "text",
      placeholder: "myVariable",
      required: false,
    },
  ],

  execute_script: [
    {
      name: "script",
      label: "Código JavaScript",
      type: "textarea",
      placeholder: 'document.querySelector("...").click();',
      required: true,
      validation: (value) => {
        if (!value) return "El código es requerido";
        return null;
      },
    },
  ],

  launch_browser: [
    {
      name: "browserType",
      label: "Tipo de navegador",
      type: "select",
      options: [
        { value: "chromium", label: "Chromium" },
        { value: "firefox", label: "Firefox" },
      ],
      defaultValue: "chromium",
      required: true,
    },
    {
      name: "headless",
      label: "Modo headless (sin interfaz)",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "maximizeWindow",
      label: "Iniciar en modo maximizado",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "slowMo",
      label: "Ralentizar acciones (ms)",
      type: "number",
      placeholder: "Ej: 50. Retrasa cada acción para debug.",
      defaultValue: 0,
      min: 0,
    },
    {
      name: "args",
      label: "Argumentos del navegador",
      type: "text",
      placeholder:
        "Ej: --start-maximized, --disable-notifications. Separar por comas.",
      // Nota: En la implementación real, este string debe convertirse a un array de strings.
    },
    {
      name: "executablePath",
      label: "Ruta del ejecutable (personalizado)",
      type: "text",
      placeholder:
        "Ej: /ruta/a/chrome.exe. Usar ejecutable de navegador personalizado.",
    },
    // Se podrían añadir más como 'timeout', 'devtools', o 'downloadsPath' si son necesarios.
  ],

  // manage_tabs: Usa UI personalizada en NodeConfigurationPanel.jsx (líneas 661-729)
  // No se definen campos aquí para evitar renderizado duplicado y permitir
  // control total sobre la visibilidad condicional de campos según la acción seleccionada
  manage_tabs: [],

  hover: [
    {
      name: "selector",
      label: "Selector CSS",
      type: "text",
      placeholder: ".menu-item",
      required: true,
    },
  ],

  refresh: [],
  close_browser: [
    {
      name: "forceClose",
      label: "Forzar cierre (forceClose)",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "clearContext",
      label: "Limpiar contexto (clearContext)",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/close_browser",
    },
  ],
  go_back: [
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/go_back",
    },
    // Eliminado: El campo "steps"
  ],

  go_forward: [
    {
      name: "endpoint",
      label: "Endpoint (opcional)",
      type: "text",
      placeholder: "http://localhost:2001/api/actions/go_forward",
    },
    // Eliminado: El campo "steps"
  ],
};

/**
 * Configuración de colores para estados de nodos
 */
export const NODE_STATE_COLORS = {
  default: {
    background: "#2C2F33",
    border: "#B0B0B0",
    text: "#E5E5E5",
  },
  selected: {
    background: "#3A3E44",
    border: "#1A73E8",
    text: "#E5E5E5",
  },
  executed: {
    background: "#1A73E8",
    border: "#FF8C32",
    text: "#FFFFFF",
  },
  error: {
    background: "#FF2E2E",
    border: "#8B0000",
    text: "#FFFFFF",
  },
};

/**
 * Configuración de ReactFlow
 */
export const REACTFLOW_CONFIG = {
  defaultEdgeOptions: {
    animated: true,
    style: { stroke: "#1A73E8", strokeWidth: 2 },
  },
  connectionLineStyle: { stroke: "#1A73E8", strokeWidth: 2 },
  nodeOrigin: [0.5, 0.5],
  minZoom: 0.1,
  maxZoom: 2,
  defaultViewport: { x: 0, y: 0, zoom: 0.6 }, // Zoomed out to see more nodes
};

/**
 * Configuración de posicionamiento de nodos
 */
export const NODE_POSITION_CONFIG = {
  initial: { x: 200, y: 100 },
  offset: 30,
  gridSnap: 15,
};

/**
 * Configuración de almacenamiento
 */
export const STORAGE_KEYS = {
  SAVED_FLOW: "browserflow_saved",
  RECENT_FLOWS: "browserflow_recent",
  USER_PREFERENCES: "browserflow_preferences",
};
/**
 * Mapping of node types to their category key.
 * Used to determine the category color for each node.
 */
export const NODE_TYPE_TO_CATEGORY = {
  // Browser Management
  launch_browser: "browser_management",
  open_url: "browser_management",
  close_browser: "browser_management",
  manage_tabs: "browser_management",
  resize_viewport: "browser_management",
  go_back: "browser_management",
  go_forward: "browser_management",

  // DOM Manipulation
  find_element: "dom_manipulation",
  get_set_content: "dom_manipulation",
  wait_for_element: "dom_manipulation",
  execute_js: "dom_manipulation",

  // User Simulation
  click: "user_simulation",
  type_text: "user_simulation",
  select_option: "user_simulation",
  submit_form: "user_simulation",
  scroll: "user_simulation",
  drag_drop: "user_simulation",
  upload_file: "user_simulation",

  // Synchronization
  wait_visible: "synchronization",
  wait_navigation: "synchronization",
  wait_network: "synchronization",
  wait_conditional: "synchronization",

  // Diagnostics
  take_screenshot: "diagnostics",
  save_dom: "diagnostics",
  log_errors: "diagnostics",
  listen_events: "diagnostics",

  // Network Control
  intercept_request: "network_control",
  mock_response: "network_control",
  block_resource: "network_control",
  modify_headers: "network_control",

  // Session Management
  manage_cookies: "session_management",
  manage_storage: "session_management",
  inject_tokens: "session_management",
  persist_session: "session_management",

  // Test Execution
  create_context: "test_execution",
  cleanup_state: "test_execution",
  handle_hooks: "test_execution",
  control_exceptions: "test_execution",

  // File Data
  read_data: "file_data",
  save_results: "file_data",
  handle_downloads: "file_data",

  // LLM AI
  call_llm: "llm_ai",
  generate_data: "llm_ai",
  validate_semantic: "llm_ai",

  // Execution Interface
  run_tests: "execution_interface",
  cli_params: "execution_interface",
  return_code: "execution_interface",
  integrate_ci: "execution_interface",
};
