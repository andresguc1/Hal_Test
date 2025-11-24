# 💻 Ejemplos de Uso - Sistema de Importación

## Tabla de Contenidos

1. [Uso Básico](#uso-básico)
2. [Importación Programática](#importación-programática)
3. [Integración con Backend](#integración-con-backend)
4. [Casos de Uso Avanzados](#casos-de-uso-avanzados)

---

## Uso Básico

### Importar desde la UI

El usuario simplemente:

1. Hace clic en el botón "Importar" en el footer
2. Selecciona el modo deseado
3. Elige archivo(s) o directorio
4. Hace clic en "Importar"

¡Eso es todo! El sistema maneja todo automáticamente.

---

## Importación Programática

### Ejemplo 1: Importar un archivo de Playwright

```javascript
import { useFlowManager } from "./components/hooks/useFlowManager";

function MyComponent() {
  const { importFlow } = useFlowManager();

  const handlePlaywrightImport = async () => {
    const fileContent = `
      const { test, expect } = require('@playwright/test');
      
      test('login test', async ({ page }) => {
        await page.goto('https://example.com');
        await page.fill('#username', 'testuser');
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('https://example.com/dashboard');
      });
    `;

    await importFlow({
      mode: "file",
      content: fileContent,
      filename: "login.spec.js",
      framework: "playwright", // Opcional, se detecta automáticamente
    });
  };

  return (
    <button onClick={handlePlaywrightImport}>
      Importar Test de Playwright
    </button>
  );
}
```

### Ejemplo 2: Importar un archivo de Cypress

```javascript
const handleCypressImport = async () => {
  const fileContent = `
    describe('Shopping Cart', () => {
      it('should add items to cart', () => {
        cy.visit('https://shop.example.com');
        cy.get('.product-card').first().click();
        cy.get('.add-to-cart').click();
        cy.get('.cart-count').should('contain', '1');
      });
    });
  `;

  await importFlow({
    mode: "file",
    content: fileContent,
    filename: "shopping-cart.cy.js",
  });
};
```

### Ejemplo 3: Importar un flujo JSON existente

```javascript
const handleJSONImport = async () => {
  const flowData = {
    nodes: [
      {
        id: "node_1",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          label: "Launch Browser",
          type: "launch_browser",
          configuration: { browserType: "chromium" },
        },
      },
      // ... más nodos
    ],
    edges: [
      {
        id: "e_1_2",
        source: "node_1",
        target: "node_2",
      },
    ],
    version: "2.0",
  };

  await importFlow({
    mode: "file",
    content: JSON.stringify(flowData),
    filename: "my-flow.json",
  });
};
```

---

## Integración con Backend

### Ejemplo 4: Importar directorio completo

```javascript
const handleDirectoryImport = async (files) => {
  // Crear FormData con los archivos
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file, file.webkitRelativePath);
  });

  // Enviar al backend
  const response = await fetch("/api/import/directory", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  // Importar el resultado
  await importFlow({
    mode: "directory",
    result,
  });

  console.log(`Importados ${result.flows.length} flujos`);
};
```

### Ejemplo 5: Importar con Page Object Model

```javascript
const handlePOMImport = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file, file.webkitRelativePath);
  });

  // Usar endpoint POM
  const response = await fetch("/api/import/directory-pom", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  await importFlow({
    mode: "directory-pom",
    result,
  });

  console.log("POM resolution:", result.pomResolution);
};
```

### Ejemplo 6: Analizar archivo antes de importar

```javascript
const analyzeBeforeImport = async (fileContent, filename) => {
  // 1. Analizar primero
  const analyzeResponse = await fetch("/api/import/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: fileContent, filename }),
  });

  const analysis = await analyzeResponse.json();

  if (!analysis.detected) {
    alert("Framework no detectado");
    return;
  }

  console.log(`Framework detectado: ${analysis.framework}`);

  // 2. Confirmar con el usuario
  const confirmed = confirm(
    `Se detectó ${analysis.framework}. ¿Desea continuar?`,
  );

  if (!confirmed) return;

  // 3. Importar
  await importFlow({
    mode: "file",
    content: fileContent,
    filename,
    framework: analysis.framework,
  });
};
```

---

## Casos de Uso Avanzados

### Ejemplo 7: Importación con validación personalizada

```javascript
const importWithValidation = async (fileContent, filename) => {
  try {
    // Validaciones personalizadas
    if (fileContent.length > 1000000) {
      throw new Error("Archivo demasiado grande (máx 1MB)");
    }

    if (!filename.match(/\.(js|ts|py|java|cs|groovy|txt)$/)) {
      throw new Error("Extensión de archivo no soportada");
    }

    // Importar
    await importFlow({
      mode: "file",
      content: fileContent,
      filename,
    });

    console.log("✓ Importación exitosa");
  } catch (error) {
    console.error("✗ Error:", error.message);
    alert(`Error al importar: ${error.message}`);
  }
};
```

### Ejemplo 8: Importación con transformación previa

```javascript
const importWithTransform = async (fileContent, filename) => {
  // Transformar el contenido antes de importar
  let transformedContent = fileContent;

  // Ejemplo: Reemplazar URLs de staging por producción
  transformedContent = transformedContent.replace(
    /https:\/\/staging\.example\.com/g,
    "https://example.com",
  );

  // Ejemplo: Agregar timeouts
  transformedContent = transformedContent.replace(
    /await page\.click/g,
    "await page.click({ timeout: 5000 })",
  );

  await importFlow({
    mode: "file",
    content: transformedContent,
    filename,
  });
};
```

### Ejemplo 9: Importación batch con progreso

```javascript
const importMultipleFiles = async (files) => {
  const total = files.length;
  let completed = 0;

  for (const file of files) {
    try {
      const content = await file.text();

      await importFlow({
        mode: "file",
        content,
        filename: file.name,
      });

      completed++;
      console.log(`Progreso: ${completed}/${total}`);

      // Actualizar UI de progreso
      updateProgressBar(completed, total);
    } catch (error) {
      console.error(`Error en ${file.name}:`, error);
    }
  }

  console.log(`Completado: ${completed}/${total} archivos`);
};
```

### Ejemplo 10: Importación con merge de flujos

```javascript
const importAndMerge = async (newFileContent, filename) => {
  // Obtener flujo actual
  const currentNodes = getCurrentNodes();
  const currentEdges = getCurrentEdges();

  // Importar nuevo flujo
  await importFlow({
    mode: "file",
    content: newFileContent,
    filename,
  });

  // El nuevo flujo se agrega al canvas
  // Los nodos se posicionan automáticamente

  console.log("Flujo agregado al canvas existente");
};
```

### Ejemplo 11: Importación con preview

```javascript
const importWithPreview = async (fileContent, filename) => {
  // 1. Convertir sin importar
  const convertResponse = await fetch("/api/import/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: fileContent, framework: "auto" }),
  });

  const conversion = await convertResponse.json();
  const flow = conversion.flows[0].flow;

  // 2. Mostrar preview
  console.log("Preview del flujo:");
  flow.forEach((action, index) => {
    console.log(`${index + 1}. ${action.action}`);
  });

  // 3. Confirmar
  const confirmed = confirm(`El flujo tiene ${flow.length} pasos. ¿Importar?`);

  if (confirmed) {
    await importFlow({
      mode: "file",
      content: fileContent,
      filename,
    });
  }
};
```

### Ejemplo 12: Importación desde URL

```javascript
const importFromURL = async (url) => {
  try {
    // 1. Descargar el archivo
    const response = await fetch(url);
    const content = await response.text();

    // 2. Extraer nombre del archivo
    const filename = url.split("/").pop();

    // 3. Importar
    await importFlow({
      mode: "file",
      content,
      filename,
    });

    console.log(`✓ Importado desde ${url}`);
  } catch (error) {
    console.error("Error descargando archivo:", error);
  }
};

// Uso:
// importFromURL('https://github.com/user/repo/blob/main/tests/login.spec.js');
```

### Ejemplo 13: Importación desde clipboard

```javascript
const importFromClipboard = async () => {
  try {
    // 1. Leer del clipboard
    const content = await navigator.clipboard.readText();

    // 2. Detectar tipo de contenido
    let filename = "clipboard.js";
    if (content.includes("describe(")) {
      filename = "clipboard.cy.js";
    } else if (content.includes("test(")) {
      filename = "clipboard.spec.js";
    }

    // 3. Importar
    await importFlow({
      mode: "file",
      content,
      filename,
    });

    console.log("✓ Importado desde clipboard");
  } catch (error) {
    console.error("Error leyendo clipboard:", error);
  }
};
```

---

## Manejo de Errores

### Ejemplo 14: Manejo robusto de errores

```javascript
const robustImport = async (fileContent, filename) => {
  try {
    await importFlow({
      mode: "file",
      content: fileContent,
      filename,
    });
  } catch (error) {
    // Clasificar el error
    if (error.message.includes("Framework no detectado")) {
      console.error("El archivo no es un test válido");
      // Sugerir frameworks soportados
      showSupportedFrameworks();
    } else if (error.message.includes("Error al analizar")) {
      console.error("El archivo tiene errores de sintaxis");
      // Mostrar línea del error si está disponible
      showSyntaxError(error);
    } else if (error.message.includes("Error del servidor")) {
      console.error("Problema de conexión con el backend");
      // Reintentar
      retryImport(fileContent, filename);
    } else {
      console.error("Error desconocido:", error);
      // Reportar el error
      reportError(error);
    }
  }
};
```

---

## Testing

### Ejemplo 15: Test de importación

```javascript
import { renderHook, act } from "@testing-library/react";
import { useFlowManager } from "./useFlowManager";

describe("Import Flow", () => {
  it("should import a Playwright test", async () => {
    const { result } = renderHook(() => useFlowManager());

    const fileContent = `
      test('example', async ({ page }) => {
        await page.goto('https://example.com');
      });
    `;

    await act(async () => {
      await result.current.importFlow({
        mode: "file",
        content: fileContent,
        filename: "test.spec.js",
      });
    });

    expect(result.current.nodes.length).toBeGreaterThan(0);
  });
});
```

---

## Mejores Prácticas

### ✅ DO:

- Validar archivos antes de importar
- Manejar errores apropiadamente
- Mostrar feedback al usuario
- Usar el modo correcto para cada caso
- Verificar el framework detectado

### ❌ DON'T:

- Importar archivos sin validación
- Ignorar errores silenciosamente
- Bloquear la UI durante importación
- Asumir que la detección siempre funciona
- Importar archivos muy grandes sin advertencia

---

**Última actualización:** 2025-11-24
**Versión:** 2.0
