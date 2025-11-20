// payloadBuilders.js

// ---------------------------------------------
// Helpers de Validación y Normalización
// ---------------------------------------------

/**
 * Normaliza y valida un valor booleano.
 * Acepta strings "true"/"false" y "1"/"0".
 * @param {*} value - El valor de entrada.
 * @param {boolean} defaultValue - El valor a retornar si la entrada es inválida.
 * @returns {boolean}
 */
const asBoolean = (value, defaultValue) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return defaultValue;
};

/**
 * Normaliza y valida un número, asegurando que sea finito.
 * @param {*} value - El valor de entrada.
 * @param {number} defaultValue - El valor a retornar si la entrada no es un número.
 * @param {number} [min=-Infinity] - El valor mínimo permitido.
 * @param {number} [max=Infinity] - El valor máximo permitido.
 * @returns {number | undefined} - Retorna 'defaultValue' (que puede ser undefined) si es inválido.
 */
const asNumber = (value, defaultValue, min = -Infinity, max = Infinity) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return defaultValue;
  return Math.min(Math.max(Math.round(num), min), max);
};

/**
 * Normaliza y valida un número de punto flotante.
 * @param {*} value - El valor de entrada.
 * @param {number} defaultValue - El valor a retornar si la entrada no es un número.
 * @param {number} [min=-Infinity] - El valor mínimo permitido.
 * @param {number} [max=Infinity] - El valor máximo permitido.
 * @returns {number | undefined}
 */
const asFloat = (value, defaultValue, min = -Infinity, max = Infinity) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
};

/**
 * Normaliza un string, asegurando que no sea null/undefined y esté "trimeado".
 * @param {*} value - El valor de entrada.
 * @param {string} [defaultValue=''] - El valor a retornar si la entrada es null/undefined.
 * @returns {string}
 */
const asString = (value, defaultValue = "") => {
  return value != null ? String(value).trim() : defaultValue;
};

/**
 * Valida o normaliza un objeto JSON desde un string.
 * @param {*} value - El valor de entrada (string u objeto).
 * @param {boolean} [required=false] - Si es true, lanza un error si está vacío o es inválido.
 * @param {string} [fieldName='Campo'] - Nombre del campo para los mensajes de error.
 * @returns {string} - El JSON normalizado como string.
 */
const asJsonString = (value, required = false, fieldName = "Campo") => {
  if (value == null || value === "") {
    if (required) throw new Error(`${fieldName} es obligatorio.`);
    return "";
  }

  let jsonString = "";
  try {
    if (typeof value === "object") {
      jsonString = JSON.stringify(value);
    } else if (typeof value === "string") {
      // Validar y normalizar
      const parsed = JSON.parse(value);
      jsonString = JSON.stringify(parsed);
    } else {
      throw new Error("Debe ser un objeto o JSON string.");
    }
  } catch (err) {
    throw new Error(`${fieldName} no es JSON válido: ${err.message}`);
  }

  return jsonString;
};

// ELIMINADA la función auxiliar build_history_payload que ya no se utiliza.

// ---------------------------------------------
// Builders de Payload (Acciones del Navegador)
// ---------------------------------------------

export const close_browser = (payload) => {
  return {
    browserId: asString(payload?.browserId), // Puede ser vacío si es el primero
    forceClose: asBoolean(payload?.forceClose, false),
    clearContext: asBoolean(payload?.clearContext, true),
  };
};

export const resize_viewport = (payload = {}) => {
  // --- Manejo de Width ---
  const width = asNumber(payload.width);
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error("Width inválido. Debe ser un número positivo.");
  }

  // --- Manejo de Height ---
  const height = asNumber(payload.height);
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error("Height inválido. Debe ser un número positivo.");
  }

  // Construir el payload final
  const body = {
    width: Math.trunc(width),
    height: Math.trunc(height),
  };

  return body;
};

export const manage_tabs = (payload = {}) => {
  const action = asString(payload.action, "new").toLowerCase().trim();

  const allowed = ["new", "switch", "close", "list", "navigate"];
  const act = allowed.includes(action) ? action : "new";

  // body ya NO incluye browserId
  const body = {
    action: act,
  };

  // --- Manejo de tabIndex (para switch, close, navigate) ---
  if (["switch", "close", "navigate"].includes(act)) {
    const rawIndex = payload.tabIndex;
    const parsed = asNumber(rawIndex);

    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      throw new Error(
        `tabIndex inválido para la acción '${act}'. Debe ser un número entero >= 0.`,
      );
    }

    body.tabIndex = Math.trunc(parsed);
  }

  // --- Manejo de url (para new y navigate) ---
  const url = asString(payload.url);

  if (act === "new") {
    if (url !== "") {
      body.url = url;
    }
  } else if (act === "navigate") {
    if (url === "") {
      throw new Error("Para 'navigate' la propiedad 'url' es obligatoria.");
    }
    body.url = url;
  }

  return body;
};

/**
 * Crea el payload para go_back.
 * @param {object} _payload - Datos del formulario (se ignora).
 * @returns {object} Un objeto vacío.
 */
export const go_back = (_payload = {}) => {
  console.log(_payload);
  return {};
};

/**
 * Crea el payload para go_forward.
 * @param {object} payload - Datos del formulario (se ignora).
 * @returns {object} Un objeto vacío.
 */
export const go_forward = (_payload = {}) => {
  console.log(_payload);
  return {};
};

// ---------------------------------------------
// Builders (Interacción de Elementos)
// ---------------------------------------------

export const find_element = (payload) => {
  return {
    selector: asString(payload?.selector),
    selectorType: asString(payload?.selectorType, "css"),
    timeout: asNumber(payload?.timeout, 10000, 0),
    visible: asBoolean(payload?.visible, true),
    browserId: asString(payload?.browserId),
  };
};

export const get_set_content = (payload) => {
  const action = asString(payload?.action, "get");
  const body = {
    selector: asString(payload?.selector),
    action: action,
    browserId: asString(payload?.browserId),
  };

  if (action === "set") {
    body.value = asString(payload?.value); // El valor puede ser intencionalmente vacío
    body.clearBeforeSet = asBoolean(payload?.clearBeforeSet, true);
  }

  return body;
};

export const execute_js = (payload) => {
  const returnValue = asBoolean(payload?.returnValue, false);
  return {
    script: asString(payload?.script), // Aquí se normaliza el script (la función anónima como string)
    returnValue: returnValue,
    variableName: returnValue
      ? asString(payload?.variableName, "resultado_js")
      : "",
    args: asString(payload?.args), // Los argumentos serializados como string JSON
    browserId: asString(payload?.browserId),
  };
};

export const click = (payload = {}) => {
  // const browserId = asString(payload.browserId); // ELIMINADO: Ya no se obtiene
  const selector = asString(payload.selector);

  // ELIMINADA la validación de browserId

  if (selector === "") {
    throw new Error("El 'selector' es obligatorio.");
  }

  // Normalizar el botón
  const button = asString(payload.button, "left").toLowerCase();
  const allowedButtons = ["left", "right", "middle"];
  const finalButton = allowedButtons.includes(button) ? button : "left";

  // Construir el payload final
  const body = {
    selector: selector,
    button: finalButton,
  };

  return body;
};

export const type_text = (payload = {}) => {
  const selector = asString(payload?.selector);
  const text = payload?.text; // No trimear ni convertir a string aún, para respetar el Joi.

  // Validaciones estrictas del frontend (aunque Joi las repite en backend)
  if (selector === "") {
    throw new Error("El selector es obligatorio.");
  }
  if (text === null || text === undefined) {
    throw new Error("El texto a ingresar es obligatorio.");
  }

  // Construir el payload
  const body = {
    selector: selector,
    text: asString(text, ""), // El texto se envía, si es string vacío, Joi lo manejará si es necesario
    clearBeforeType: asBoolean(payload?.clearBeforeType, true), // Default: true (según Joi)
    delay: asNumber(payload?.delay, 0, 0), // Default: 0, Mín: 0 (según Joi)
    timeout: asNumber(payload?.timeout, 30000, 1), // Default: 30000, Mín: 1 (según Joi)
  };

  // browserId no se incluye, ya que lo maneja el backend.

  return body;
};

export const select_option = (payload) => {
  return {
    selector: asString(payload?.selector),
    selectionCriteria: asString(payload?.selectionCriteria, "label"),
    selectionValue: asString(payload?.selectionValue),
    browserId: asString(payload?.browserId),
  };
};

export const submit_form = (payload) => {
  return {
    selector: asString(payload?.selector),
    waitForNavigation: asBoolean(payload?.waitForNavigation, true),
    browserId: asString(payload?.browserId),
  };
};

export const scroll = (payload) => {
  return {
    direction: asString(payload?.direction, "down"),
    amount: asNumber(payload?.amount, 0),
    behavior: asString(payload?.behavior, "smooth"),
    browserId: asString(payload?.browserId),
  };
};

export const drag_drop = (payload) => {
  return {
    sourceSelector: asString(payload?.sourceSelector),
    targetSelector: asString(payload?.targetSelector),
    steps: asNumber(payload?.steps, 20, 1),
    force: asBoolean(payload?.force, false),
    browserId: asString(payload?.browserId),
  };
};

export const upload_file = (payload) => {
  return {
    selector: asString(payload?.selector),
    files: asString(payload?.files), // Puede ser una ruta o varias
    browserId: asString(payload?.browserId),
  };
};

// ---------------------------------------------
// Builders (Esperas)
// ---------------------------------------------

export const wait_for_element = (payload) => {
  return {
    selector: asString(payload?.selector),
    condition: asString(payload?.condition, "hidden"),
    timeout: asNumber(payload?.timeout, 15000, 0),
    browserId: asString(payload?.browserId),
  };
};

export const wait_conditional = (payload) => {
  return {
    conditionScript: asString(payload?.conditionScript),
    polling: asNumber(payload?.polling, 500, 1),
    timeout: asNumber(payload?.timeout, 20000, 1),
    browserId: asString(payload?.browserId),
  };
};

export const wait_network = (payload) => {
  return {
    idleTime: asNumber(payload?.idleTime, 1000, 0),
    includeResources: asBoolean(payload?.includeResources, true),
    browserId: asString(payload?.browserId),
  };
};

export const wait_navigation = (payload) => {
  return {
    waitUntil: asString(payload?.waitUntil, "networkidle"),
    timeout: asNumber(payload?.timeout, 10000, 1),
    browserId: asString(payload?.browserId),
  };
};

export const wait_visible = (payload) => {
  return {
    selector: asString(payload?.selector),
    timeout: asNumber(payload?.timeout, 15000, 0),
    scrollIntoView: asBoolean(payload?.scrollIntoView, true),
    browserId: asString(payload?.browserId),
  };
};

// ---------------------------------------------
// Builders (Manejo de Eventos y Datos)
// ---------------------------------------------

export const listen_events = (payload) => {
  return {
    eventType: asString(payload?.eventType, "click"),
    selector: asString(payload?.selector), // Selector es opcional aquí
    logToFile: asBoolean(payload?.logToFile, false),
    filePath: asString(payload?.filePath),
    timeout: asNumber(payload?.timeout, 60000, 1),
    browserId: asString(payload?.browserId),
  };
};

export const log_errors = (payload) => {
  return {
    logToFile: asBoolean(payload?.logToFile, false),
    filePath: asString(payload?.filePath),
    timeout: asNumber(payload?.timeout, 15000, 1),
    browserId: asString(payload?.browserId),
  };
};

export const save_dom = (payload) => {
  return {
    selector:
      payload?.selector != null && payload.selector !== ""
        ? asString(payload.selector)
        : null,
    variableName: asString(payload?.variableName, "html_guardado"),
    path:
      payload?.path != null && payload.path !== ""
        ? asString(payload.path)
        : null,
    browserId: asString(payload?.browserId),
  };
};

export const take_screenshot = (payload) => {
  return {
    path: asString(payload?.path),
    fullPage: asBoolean(payload?.fullPage, true),
    format: asString(payload?.format, "jpeg").toLowerCase(),
    quality: asNumber(payload?.quality, 85, 1, 100),
    browserId: asString(payload?.browserId),
  };
};

// ---------------------------------------------
// Builders (Red e Interceptación)
// ---------------------------------------------

export const modify_headers = (payload) => {
  const headersString = asJsonString(payload?.headers, true, '"headers"');

  let method = asString(payload?.method).toUpperCase();
  const allowedMethods = [
    "",
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
  ];
  if (!allowedMethods.includes(method)) {
    method = ""; // Default a "todos" si es inválido
  }

  return {
    urlPattern: asString(payload?.urlPattern),
    headers: headersString, // Debe ser string JSON
    method: method,
    timeout: asNumber(payload?.timeout, 0, 0),
    browserId: asString(payload?.browserId),
  };
};

export const block_resource = (payload) => {
  return {
    urlPattern: asString(payload?.urlPattern),
    resourceType: asString(payload?.resourceType, "script"),
    timeout: asNumber(payload?.timeout, 0, 0),
    browserId: asString(payload?.browserId),
  };
};

export const mock_response = (payload) => {
  return {
    urlPattern: asString(payload?.urlPattern),
    method: asString(payload?.method, "GET").toUpperCase(),
    status: asNumber(payload?.status, 200, 100, 599),
    responseBody: asString(payload?.responseBody),
    headers: asJsonString(payload?.headers, false, '"headers"'), // Opcional
    timeout: asNumber(payload?.timeout, 120000, 0),
    browserId: asString(payload?.browserId),
  };
};

export const intercept_request = (payload) => {
  return {
    urlPattern: asString(payload?.urlPattern),
    method: asString(payload?.method, "POST").toUpperCase(),
    action: asString(payload?.action, "mock"),
    responseMock: asString(payload?.responseMock),
    timeout: asNumber(payload?.timeout, 60000, 0),
    browserId: asString(payload?.browserId),
  };
};

// ---------------------------------------------
// Builders (Sesión y Almacenamiento)
// ---------------------------------------------

export const manage_cookies = (payload) => {
  const action = asString(payload?.action, "set");
  const body = {
    action: action,
    browserId: asString(payload?.browserId),
  };

  if (action === "set" || action === "delete") {
    // Asume que cookiesData es un string JSON o un objeto
    body.cookiesData = asJsonString(
      payload?.cookiesData,
      true,
      '"cookiesData"',
    );
  }

  return body;
};

export const persist_session = (payload) => {
  const action = asString(payload?.action, "save");
  const body = {
    action: action,
    browserId: asString(payload?.browserId),
    includeLocalStorage: asBoolean(payload?.includeLocalStorage, true),
    includeSessionStorage: asBoolean(payload?.includeSessionStorage, true),
  };

  if (action === "save" || action === "load") {
    const path = asString(payload?.path);
    if (!path) throw new Error('path es obligatorio para "save" o "load".');
    body.path = path;
  }

  return body;
};

export const inject_tokens = (payload) => {
  return {
    target: asString(payload?.target, "header"),
    key: asString(payload?.key),
    value: asString(payload?.value),
    urlPattern: asString(payload?.urlPattern),
    browserId: asString(payload?.browserId),
  };
};

export const manage_storage = (payload) => {
  const action = asString(payload?.action, "set");
  const body = {
    storageType: asString(payload?.storageType, "local"),
    action: action,
    browserId: asString(payload?.browserId),
  };

  if (action === "set") {
    body.key = asString(payload?.key);
    body.value = asString(payload?.value);
  } else if (action === "get" || action === "remove") {
    body.key = asString(payload?.key);
  }
  // 'clear' no necesita key/value

  return body;
};

export const cleanup_state = (payload) => {
  const browserId = asString(payload?.browserId);
  if (!browserId) {
    throw new Error("browserId es obligatorio para cleanup_state.");
  }
  return {
    browserId: browserId,
    target: asString(payload?.target, "context"),
    includeCookies: asBoolean(payload?.includeCookies, true),
    includeLocalStorage: asBoolean(payload?.includeLocalStorage, true),
    includeSessionStorage: asBoolean(payload?.includeSessionStorage, true),
    includeIndexedDB: asBoolean(payload?.includeIndexedDB, false),
    includePermissions: asBoolean(payload?.includePermissions, false),
  };
};

export const create_context = (payload) => {
  const browserId = asString(payload?.browserId);
  if (!browserId) {
    throw new Error("browserId es obligatorio para create_context.");
  }

  const body = { browserId };

  const storageState = asString(payload?.storageState);
  const viewportWidth = asNumber(payload?.viewportWidth, undefined, 1);
  const viewportHeight = asNumber(payload?.viewportHeight, undefined, 1);
  const userAgent = asString(payload?.userAgent);
  const geolocation = asString(payload?.geolocation);
  const locale = asString(payload?.locale);

  if (storageState) body.storageState = storageState;
  if (viewportWidth !== undefined) body.viewportWidth = viewportWidth;
  if (viewportHeight !== undefined) body.viewportHeight = viewportHeight;
  if (userAgent) body.userAgent = userAgent;
  if (geolocation) body.geolocation = geolocation;
  if (locale) body.locale = locale;

  return body;
};

// ---------------------------------------------
// Builders (Manejo de Excepciones y Hooks)
// ---------------------------------------------

export const control_exceptions = (payload) => {
  const browserId = asString(payload?.browserId);
  if (!browserId) {
    throw new Error("browserId es obligatorio para control_exceptions.");
  }

  const exceptionType = asString(payload?.exceptionType, "elementNotFound");
  const action = asString(payload?.action, "retry");
  const maxRetries = asNumber(payload?.maxRetries, undefined, 1);
  const logFile = asString(payload?.logFile);

  const allowedExceptionTypes = [
    "all",
    "navigation",
    "timeout",
    "elementNotFound",
    "network",
    "custom",
  ];
  if (!allowedExceptionTypes.includes(exceptionType)) {
    throw new Error(
      `exceptionType inválido. Permitidos: ${allowedExceptionTypes.join(", ")}`,
    );
  }

  const allowedActions = ["ignore", "log", "retry", "abort"];
  if (!allowedActions.includes(action)) {
    throw new Error(
      `action inválida. Permitidas: ${allowedActions.join(", ")}`,
    );
  }

  const body = { browserId, exceptionType, action };

  if (action === "retry") {
    if (maxRetries === undefined) {
      throw new Error('maxRetries debe ser al menos 1 cuando action="retry".');
    }
    if (!logFile) {
      throw new Error('logFile es obligatorio cuando action="retry".');
    }
    body.maxRetries = maxRetries;
    body.logFile = logFile;
  } else if (action === "log") {
    if (!logFile) {
      throw new Error('logFile es obligatorio cuando action="log".');
    }
    body.logFile = logFile;
  }

  return body;
};

export const handle_hooks = (payload) => {
  const browserId = asString(payload?.browserId);
  if (!browserId) {
    throw new Error("browserId es obligatorio para handle_hooks.");
  }
  const callbackCode = asString(payload?.callbackCode);
  if (!callbackCode) {
    throw new Error("callbackCode (JS) es obligatorio para handle_hooks.");
  }

  const body = {
    browserId: browserId,
    hookType: asString(payload?.hookType, "afterAction"),
    callbackCode: callbackCode,
    once: asBoolean(payload?.once, false),
  };

  const actionName = asString(payload?.actionName);
  if (actionName) {
    body.actionName = actionName;
  }

  return body;
};

// ---------------------------------------------
// Builders (Archivos y Datos)
// ---------------------------------------------

export const handle_downloads = (payload) => {
  const action = asString(payload?.action);
  const browserId = asString(payload?.browserId);

  if (!browserId) {
    throw new Error("browserId es obligatorio para handle_downloads.");
  }

  const allowedActions = ["wait", "save", "validate", "saveAndValidate"];
  if (!allowedActions.includes(action)) {
    throw new Error(
      `action inválida. Permitidas: ${allowedActions.join(", ")}`,
    );
  }

  const saveActions = ["save", "saveAndValidate"];
  const validateActions = ["validate", "saveAndValidate"];

  const path = asString(payload?.path);
  const expectedFileName = asString(payload?.expectedFileName);
  const minSizeKB = asNumber(payload?.minSizeKB, undefined, 0);
  const maxSizeKB = asNumber(payload?.maxSizeKB, undefined, 0);

  if (saveActions.includes(action) && !path) {
    throw new Error(
      'path es obligatorio para acciones "save" o "saveAndValidate".',
    );
  }
  if (validateActions.includes(action) && !expectedFileName) {
    throw new Error(
      'expectedFileName es obligatorio para acciones que incluyen "validate".',
    );
  }
  if (
    minSizeKB !== undefined &&
    maxSizeKB !== undefined &&
    minSizeKB > maxSizeKB
  ) {
    throw new Error("minSizeKB no puede ser mayor que maxSizeKB.");
  }

  const body = {
    action: action,
    timeout: asNumber(payload?.timeout, 30000, 1),
    browserId: browserId,
  };

  if (path) body.path = path;
  if (expectedFileName) body.expectedFileName = expectedFileName;
  if (minSizeKB !== undefined) body.minSizeKB = minSizeKB;
  if (maxSizeKB !== undefined) body.maxSizeKB = maxSizeKB;

  return body;
};

export const save_results = (payload) => {
  const browserId = asString(payload?.browserId);
  const path = asString(payload?.path);
  const dataVariableName = asString(payload?.dataVariableName);

  if (!browserId)
    throw new Error("browserId es obligatorio para save_results.");
  if (!path) throw new Error("path es obligatorio para save_results.");
  if (!dataVariableName)
    throw new Error("dataVariableName es obligatorio para save_results.");

  const destinationType = asString(
    payload?.destinationType,
    "json",
  ).toLowerCase();
  const allowedDestinations = ["json", "csv", "txt"];
  if (!allowedDestinations.includes(destinationType)) {
    throw new Error(
      `destinationType inválido. Permitidos: ${allowedDestinations.join(", ")}`,
    );
  }

  const encoding = asString(payload?.encoding, "utf-8").toLowerCase();
  const allowedEncodings = ["utf-8", "latin1", "ascii"];
  if (!allowedEncodings.includes(encoding)) {
    throw new Error(
      `encoding inválido. Permitidos: ${allowedEncodings.join(", ")}`,
    );
  }

  return {
    browserId: browserId,
    destinationType: destinationType,
    path: path,
    dataVariableName: dataVariableName,
    encoding: encoding,
  };
};

export const read_data = (payload) => {
  const path = asString(payload?.path);
  if (!path) throw new Error("path es obligatorio para read_data.");

  return {
    browserId: asString(payload?.browserId),
    sourceType: asString(payload?.sourceType, "csv"),
    path: path,
    variableName: asString(payload?.variableName, "dataVar"),
    hasHeader: asBoolean(payload?.hasHeader, true),
    encoding: asString(payload?.encoding, "utf-8"),
  };
};

// ---------------------------------------------
// Builders (IA y LLM)
// ---------------------------------------------

export const validate_semantic = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    model: asString(payload?.model, "gemini"),
    sourceTextVariable: asString(payload?.sourceTextVariable),
    validationPrompt: asString(payload?.validationPrompt),
    expectedAnswer: asString(payload?.expectedAnswer),
    validationTimeout: asNumber(payload?.validationTimeout, 15000, 0),
  };
};

export const generate_data = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    model: asString(payload?.model, "gpt4"),
    prompt: asString(payload?.prompt),
    variableName: asString(payload?.variableName, "generatedData"),
    expectedFormat: asString(payload?.expectedFormat, "json").toLowerCase(),
    temperature: asFloat(payload?.temperature, 0.7, 0.0, 2.0),
  };
};

export const call_llm = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    model: asString(payload?.model, "gemini"),
    prompt: asString(payload?.prompt),
    variableName: asString(payload?.variableName, "llmResult"),
    temperature: asFloat(payload?.temperature, 0.7, 0.0, 2.0),
    maxTokens: asNumber(payload?.maxTokens, 150, 1),
  };
};

// ---------------------------------------------
// Builders (Integración CI/CD y Pruebas)
// ---------------------------------------------

export const integrate_ci = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    provider: asString(payload?.provider, "gitlab"),
    saveArtifacts: asBoolean(payload?.saveArtifacts, false),
    outputPath: asString(payload?.outputPath, "gitlab-artifacts"),
    uploadReports: asBoolean(payload?.uploadReports, false),
    envVariables: asJsonString(payload?.envVariables, false, '"envVariables"'),
    retryOnFail: asNumber(payload?.retryOnFail, 0, 0),
    verbose: asBoolean(payload?.verbose, false),
  };
};

export const run_tests = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    testSuite: asString(payload?.testSuite),
    parallel: asBoolean(payload?.parallel, false),
    retries: asNumber(payload?.retries, 0, 0),
    reportFormat: asString(payload?.reportFormat, "junit"),
    timeout: asNumber(payload?.timeout, 900000, 1),
  };
};

// ---------------------------------------------
// Builders (Metadatos y CLI)
// ---------------------------------------------

export const cli_params = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    paramName: asString(payload?.paramName),
    paramType: asString(payload?.paramType, "string"),
    defaultValue: asString(payload?.defaultValue),
    required: asBoolean(payload?.required, false),
    validationCode: asString(payload?.validationCode),
  };
};

export const return_code = (payload) => {
  return {
    browserId: asString(payload?.browserId),
    successField: asString(payload?.successField),
    exitOnFail: asBoolean(payload?.exitOnFail, false),
    customCodes: asJsonString(payload?.customCodes, false, '"customCodes"'),
    verbose: asBoolean(payload?.verbose, false),
  };
};
