# 📥 Sistema de Importación Mejorado - Hal_Test

## Resumen

El sistema de importación de Hal_Test ha sido actualizado para integrarse completamente con el nuevo backend de importación, ofreciendo tres modos de importación diferentes y soporte para múltiples frameworks de testing.

---

## 🎯 Características Principales

### 1. **Tres Modos de Importación**

#### 📄 Modo: Archivo Individual

- Importa un solo archivo de test
- Detección automática del framework
- Conversión en tiempo real a flujo Hal_Test
- Soporta archivos JSON (flujos Hal_Test) y archivos de test nativos

**Formatos soportados:**

- `.json` - Flujos Hal_Test exportados
- `.js`, `.ts` - JavaScript/TypeScript
- `.spec.js`, `.spec.ts` - Archivos de especificación
- `.cy.js`, `.cy.ts` - Tests de Cypress
- `.py` - Python (Selenium)
- `.java` - Java (Selenium)
- `.cs` - C# (Selenium)
- `.groovy` - Groovy (Katalon)
- `.txt` - TestRigor

#### 📁 Modo: Directorio

- Escaneo recursivo de directorios
- Importación masiva de múltiples archivos de test
- Ignora automáticamente directorios comunes (`node_modules`, `.git`, etc.)
- Genera múltiples flujos organizados en el canvas

#### 📁+ Modo: Directorio + POM

- Todo lo del modo Directorio
- **Plus:** Resolución de Page Object Model
- Indexa clases y funciones del proyecto
- Resuelve referencias a Page Objects durante la conversión
- Ideal para proyectos con arquitectura POM

---

## 🔧 Frameworks Soportados

| Framework             | Extensiones        | Estado      |
| --------------------- | ------------------ | ----------- |
| **Playwright**        | `.js`, `.ts`       | ✅ Completo |
| **Cypress**           | `.cy.js`, `.cy.ts` | ✅ Completo |
| **Selenium (JS)**     | `.js`, `.ts`       | ✅ Completo |
| **Selenium (Python)** | `.py`              | ✅ Completo |
| **Selenium (Java)**   | `.java`            | ✅ Completo |
| **Selenium (C#)**     | `.cs`              | ✅ Completo |
| **TestCafe**          | `.js`, `.ts`       | ✅ Completo |
| **Puppeteer**         | `.js`, `.ts`       | ✅ Completo |
| **WebdriverIO**       | `.js`, `.ts`       | ✅ Completo |
| **Nightwatch**        | `.js`, `.ts`       | ✅ Completo |
| **Katalon**           | `.groovy`          | ✅ Completo |
| **TestRigor**         | `.txt`             | ✅ Completo |

---

## 🎨 Componentes de UI

### `ImportDialog.jsx`

Componente principal del diálogo de importación.

**Props:**

- `isOpen` (boolean): Controla la visibilidad del diálogo
- `onClose` (function): Callback cuando se cierra el diálogo
- `onImport` (function): Callback cuando se completa la importación

**Características:**

- Selector de modo visual
- Detección automática de framework
- Indicadores de progreso en tiempo real
- Manejo de errores con mensajes descriptivos
- Diseño responsive y accesible

### `ImportDialog.css`

Estilos modernos con:

- Glassmorphism effects
- Animaciones suaves
- Diseño responsive
- Estados visuales claros (loading, success, error)

---

## 🔄 Flujo de Trabajo

### Importación de Archivo Individual

```
1. Usuario hace clic en "Importar"
   ↓
2. Se abre ImportDialog
   ↓
3. Usuario selecciona modo "Archivo Individual"
   ↓
4. Usuario selecciona archivo
   ↓
5. Frontend detecta framework (análisis)
   ↓
6. Frontend envía a backend para conversión
   ↓
7. Backend retorna flujo convertido
   ↓
8. Frontend crea nodos y edges en el canvas
   ↓
9. Diálogo se cierra automáticamente
```

### Importación de Directorio

```
1. Usuario hace clic en "Importar"
   ↓
2. Se abre ImportDialog
   ↓
3. Usuario selecciona modo "Directorio" o "Directorio + POM"
   ↓
4. Usuario selecciona directorio (webkitdirectory)
   ↓
5. Frontend sube todos los archivos al backend
   ↓
6. Backend escanea y procesa archivos
   ↓
7. Backend retorna múltiples flujos convertidos
   ↓
8. Frontend organiza flujos en el canvas (layout en columnas)
   ↓
9. Diálogo muestra estadísticas de importación
   ↓
10. Diálogo se cierra automáticamente
```

---

## 🔌 Integración con Backend

### Endpoints Utilizados

#### 1. **POST /api/import/analyze**

Analiza un archivo y detecta el framework.

**Request:**

```json
{
  "content": "string (código del archivo)",
  "filename": "string (nombre del archivo)"
}
```

**Response:**

```json
{
  "detected": true,
  "framework": "playwright",
  "supported": true
}
```

#### 2. **POST /api/import/convert**

Convierte un archivo a flujo Hal_Test.

**Request:**

```json
{
  "content": "string (código del archivo)",
  "framework": "playwright"
}
```

**Response:**

```json
{
  "success": true,
  "flows": [
    {
      "meta": {
        "name": "Login Test",
        "framework": "playwright"
      },
      "flow": [
        {
          "action": "launch_browser",
          "browserType": "chromium"
        },
        {
          "action": "open_url",
          "url": "https://example.com"
        }
      ]
    }
  ]
}
```

#### 3. **POST /api/import/directory**

Importa un directorio completo.

**Request:** FormData con archivos

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalFiles": 10,
    "successfulConversions": 8,
    "failedConversions": 2
  },
  "flows": [
    /* array de flujos */
  ],
  "errors": [
    /* errores si los hay */
  ]
}
```

#### 4. **POST /api/import/directory-pom**

Importa un directorio con soporte POM.

**Request:** FormData con archivos

**Response:** Similar a `/api/import/directory` pero con resolución POM

---

## 📝 Uso en Código

### Ejemplo: Importar desde el hook

```javascript
import { useFlowManager } from "./components/hooks/useFlowManager";

function MyComponent() {
  const { importFlow } = useFlowManager();

  // Importar archivo individual
  const handleFileImport = async (file) => {
    const content = await file.text();
    await importFlow({
      mode: "file",
      content,
      filename: file.name,
    });
  };

  // Importar directorio
  const handleDirectoryImport = async (result) => {
    await importFlow({
      mode: "directory",
      result, // Resultado del backend
    });
  };

  // Importar directorio con POM
  const handlePOMImport = async (result) => {
    await importFlow({
      mode: "directory-pom",
      result, // Resultado del backend
    });
  };
}
```

---

## 🎯 Mejoras Futuras

### En Desarrollo

- [ ] Resolución completa de Page Object Model
- [ ] Selector de flujos cuando se importan múltiples tests
- [ ] Preview de flujos antes de importar
- [ ] Importación incremental (agregar a flujo existente)

### Planeadas

- [ ] Soporte para más frameworks
- [ ] Importación desde URL (GitHub, GitLab)
- [ ] Importación desde clipboard
- [ ] Validación de flujos antes de importar
- [ ] Merge inteligente de flujos similares

---

## 🐛 Solución de Problemas

### Error: "No se pudo detectar el framework"

**Causa:** El archivo no contiene patrones reconocibles del framework.
**Solución:** Asegúrate de que el archivo sea un test válido del framework soportado.

### Error: "No se generaron flujos desde el directorio"

**Causa:** El directorio no contiene archivos de test válidos.
**Solución:** Verifica que el directorio contenga archivos con extensiones soportadas.

### Error: "Error al analizar el archivo"

**Causa:** Problema de comunicación con el backend.
**Solución:** Verifica que el backend esté corriendo y accesible.

---

## 📚 Referencias

- [Documentación del Backend](../../../Hal_Test_Backend/README.md)
- [API de Importación](../../../Hal_Test_Backend/docs/import-api.md)
- [Guía de Frameworks](./FRAMEWORKS.md)

---

**Última actualización:** 2025-11-24
**Versión:** 2.0
