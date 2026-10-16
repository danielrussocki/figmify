# Plan técnico: MVP de Figmify

## Alcance y trazabilidad

Este plan implementa exclusivamente la [especificación del MVP](spec.md) y el contrato de [API Figmify v1](https://github.com/danielrussocki/api.figmify). La base de API v1 para el MVP es `http://localhost:3000`. No se añadirán autenticación, persistencia entre aperturas, reconocimiento de importaciones anteriores ni versiones posteriores de la API.

| Área | RF cubiertos |
| --- | --- |
| Solicitud, contrato, red y errores | RF-01, RF-05, RF-06 |
| Estado, cancelación, cierre y fuentes | RF-02, RF-03, RF-05 |
| Validación y construcción del diseño | RF-03 |
| Confirmación, ubicación y conservación del lienzo | RF-04, RF-05 |
| Pruebas automatizadas | RF-01 a RF-06 |

## Estructura de módulos

```text
code.ts                         Composición del contexto principal de Figma
ui.html                         Documento de la interfaz
src/
  contracts/
    api-v1.ts                   Modelo completo y validación de API v1
    messages.ts                 Mensajes tipados entre interfaz y aplicación
  domain/
    import-session.ts           Máquina de estados, requestId y cancelación
    placement.ts                Confirmación, límites visibles y ubicación
    font-substitution.ts        Agrupación de fuentes ausentes por familia y estilo
    render-plan.ts              Plan puro de nodos, estilos y marcadores
  application/
    import-web-design.ts        Orquestación de una importación
  infrastructure/
    api/
      figmify-client.ts         Única capa HTTP propia; consulta API v1
    figma/
      page-reader.ts            Lectura de página, contenido y límites visuales
      font-catalog.ts           Fuentes disponibles, carga y fuente predeterminada
      resource-loader.ts        Resolución nativa de imágenes y otros recursos
      document-renderer.ts      Construcción temporal, visibilidad y limpieza
  ui/
    controller.ts               Presentación, selector de fuentes y mensajes
test/
  unit/                         Lógica pura y validación de contratos
  integration/                  Aplicación con Figma simulado y API local real
  fixtures/                     Respuestas y páginas controladas de API v1
```

### Límites de dependencias

- `ui/` solo conoce `contracts/messages.ts`; no importa dominio, HTTP ni Figma. **RF-01, RF-02, RF-03, RF-04, RF-05.**
- `domain/` es determinista y no importa interfaz, HTTP ni Figma. **RF-02 a RF-05.**
- `application/` coordina puertos, sesiones y mensajes; no manipula la interfaz ni nodos de Figma directamente. **RF-01 a RF-06.**
- Solo `infrastructure/api/figmify-client.ts` usa `fetch` y constituye la capa HTTP propia. `resource-loader.ts` usa `figma.createImageAsync` como primitiva nativa de Figma, aprobada como excepción que no crea una segunda capa HTTP propia. **RF-01, RF-03, RF-06.**
- Solo `infrastructure/figma/` lee o modifica el documento de Figma. Las confirmaciones y el selector pertenecen a `application/` y `ui/`, no a `document-renderer.ts`. **RF-03 a RF-05.**

## Modelo de datos JSON

La fuente de verdad es `FigmaDocument` de API v1, con `schemaVersion: "1.1"`. Antes de modificar el lienzo se validan recursivamente el documento y todas las propiedades definidas por el contrato canónico v1. La transformación cubre todos los nodos y propiedades que API v1 declara compatibles con Figma, incluidos geometría, visibilidad, Auto Layout, estilos de texto, pinturas, bordes, efectos, recursos y catálogos reutilizables. **RF-03, RF-05.**

| Entidad | Campos relevantes |
| --- | --- |
| `FigmaDocument` | `schemaVersion`, `source`, `styles`, `assets`, `document` |
| `source` | `url`, `viewport.width`, `viewport.height`, `viewport.deviceScaleFactor` |
| `FigmaNode` | `id`, `tag`, `type`, rectángulos, visibilidad, opacidad, Auto Layout, estilos, pinturas, efectos, texto y `children` conforme a API v1 |
| Rectángulos | `x`, `y`, `width`, `height`, `top`, `left` en píxeles CSS |
| Recursos | Pinturas, imágenes, iconos, familias y estilos tipográficos referenciados por nodos |
| Error de API | `code`, `message`; la API v1 proporciona el mensaje en inglés |

Ejemplo reducido de respuesta de éxito:

```json
{
  "schemaVersion": "1.1",
  "source": {
    "url": "https://example.com/",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "deviceScaleFactor": 1
    }
  },
  "styles": {
    "colors": [],
    "typographies": []
  },
  "assets": [],
  "document": {
    "id": "root",
    "tag": "body",
    "type": "FRAME",
    "rect": {
      "x": 0,
      "y": 0,
      "width": 1440,
      "height": 900,
      "top": 0,
      "left": 0
    },
    "isVisible": true,
    "fills": [
      {
        "type": "SOLID",
        "color": { "r": 1, "g": 1, "b": 1, "a": 1 }
      }
    ],
    "children": [
      {
        "id": "headline",
        "tag": "h1",
        "type": "TEXT",
        "rect": {
          "x": 80,
          "y": 96,
          "width": 500,
          "height": 72,
          "top": 96,
          "left": 80
        },
        "isVisible": true,
        "characters": "Build faster",
        "children": []
      },
      {
        "id": "hero-image",
        "tag": "img",
        "type": "IMAGE",
        "rect": {
          "x": 80,
          "y": 208,
          "width": 640,
          "height": 360,
          "top": 208,
          "left": 80
        },
        "isVisible": true,
        "fills": [
          {
            "type": "IMAGE",
            "src": "https://images.example.com/hero.jpg",
            "scaleMode": "FILL"
          }
        ],
        "children": []
      }
    ]
  }
}
```

## Contratos

### API Figmify v1

| Aspecto | Contrato |
| --- | --- |
| Base | `http://localhost:3000` |
| Operación | `GET /v1/figma` |
| Parámetros | `url` contiene el valor original codificado solo para transporte; `includeHidden=false` |
| Viewport | Se usan los valores predeterminados de API v1; el MVP no expone controles de viewport. |
| Autenticación | No se envían credenciales ni cabeceras de autenticación. |
| Éxito | `FigmaDocument` con `schemaVersion: "1.1"`. |
| Error de API | Cuerpo `{ "code": string, "message": string }`; el mensaje se presenta en inglés. |
| Error previo a respuesta | `Unable to reach Figmify API. Please try again.` |
| Respuesta no conforme | `The API response is not compatible with API v1.` |
| Error de creación | `The design could not be created.` |
| Página eliminada | `The import page is no longer available.` |
| Tiempo y reintentos | Sin límite impuesto por el plugin y sin reintentos automáticos. |

La capa HTTP conserva semánticamente la URL introducida: la codificación del parámetro de consulta es únicamente el requisito de transporte. **RF-01, RF-05, RF-06.**

### Acceso de red

El manifiesto declarará `allowedDomains: ["*"]` y el campo `reasoning` en inglés con el texto `Figmify imports web designs and their public image resources from domains returned by API v1.`. El entorno de desarrollo incluirá `http://localhost:3000` en `devAllowedDomains`. Figma rechaza `http://127.0.0.1:3000` en este campo porque no es una URL de desarrollo válida; por ello el cliente y el manifiesto usarán siempre el origen `localhost`. La amplitud del permiso está aprobada para que Figma resuelva directamente las imágenes de las URLs devueltas por API v1. **RF-03, RF-06.**

### Protocolo entre interfaz y aplicación

Todos los mensajes incluyen `requestId` para correlacionar una sesión y descartar respuestas tardías.

| Origen | Mensaje | Carga y propósito |
| --- | --- | --- |
| Interfaz | `IMPORT_REQUEST` | `url`; inicia una solicitud. |
| Aplicación | `CONFIRM_APPEND` | Solicita `add` o `cancel` si la página contiene nodos. |
| Interfaz | `IMPORT_DECISION` | `add` o `cancel`; confirma el flujo inicial. |
| Aplicación | `FONT_SUBSTITUTION_REQUIRED` | Fuente ausente y catálogo de fuentes disponibles. |
| Interfaz | `FONT_SUBSTITUTION_DECISION` | Sustituta elegida o `default` al cancelar el selector. |
| Interfaz | `CANCEL_IMPORT` | Invalida la sesión activa. |
| Interfaz | `CLOSE_PLUGIN` | Invalida la sesión antes del cierre. |
| Aplicación | `IMPORT_STATUS` | `processing`, `success`, `warning` o `error`, con mensaje en inglés cuando corresponda. |

Los nombres de mensajes, valores técnicos y textos visibles estarán en inglés. La interfaz presenta estado y recoge decisiones, pero no toma decisiones de negocio ni llama a la API. **RF-01 a RF-05.**

## Algoritmo de construcción del diseño

```text
FUNCTION startImport(inputUrl):
  IF an import session is active:
    RETURN

  startPage = readCurrentPage()
  IF startPage has nodes:
    decision = requestAppendConfirmation()
    IF decision is cancel:
      RETURN

  session = createActiveSession(startPage.id)
  publishStatus("processing")

  TRY:
    response = requestFigmaDocument(inputUrl, includeHidden=false, session.signal)
  CATCH networkFailure:
    endSessionWithError("Unable to reach Figmify API. Please try again.")
    RETURN

  IF session is no longer active:
    DISCARD response
    RETURN

  IF startPage no longer exists:
    endSessionWithError("The import page is no longer available.")
    RETURN

  IF response is an API error:
    endSessionWithError(response.message)
    RETURN

  IF response does not conform to every required API v1 property:
    endSessionWithError("The API response is not compatible with API v1.")
    RETURN

  fontGroups = findUnavailableFonts(response.document)
  FOR EACH sourceFont IN fontGroups:
    choice = requestFontSubstitution(sourceFont, availableFigmaFonts)
    IF session is no longer active:
      DISCARD choices
      RETURN
    substitution[sourceFont] = choice OR figmaDefaultFont

  resourcePlan = resolveNonTypographyResources(response.document)
  IF session is no longer active:
    DISCARD resourcePlan
    RETURN

  renderPlan = buildFullV1RenderPlan(response.document, substitution, resourcePlan)
  stagingRoot = createHiddenTemporaryRoot(startPage)

  TRY:
    renderCompleteTree(renderPlan, stagingRoot)
  CATCH renderFailure:
    remove(stagingRoot)
    endSessionWithError("The design could not be created.")
    RETURN

  IF session is no longer active OR startPage no longer exists:
    remove(stagingRoot)
    DISCARD result
    RETURN

  visibleBounds = getVisibleContentBounds(startPage, excluding stagingRoot)
  destination = (0, 0) IF visibleBounds is empty
                ELSE (visibleBounds.right + 100, visibleBounds.top)
  move(stagingRoot, destination)
  makeVisible(stagingRoot)

  IF resourcePlan contains markers OR substitution contains figmaDefaultFont:
    publishStatus("warning")
  ELSE:
    publishStatus("success")
  endSession()
END FUNCTION
```

- La raíz temporal permanece invisible y fuera del contenido hasta terminar el árbol completo. Ante fallo, cancelación o eliminación de la página, se elimina antes de que pueda confirmarse. La atomicidad se aplica a nodos y propiedades del lienzo. **RF-02, RF-03, RF-05.**
- `resolveNonTypographyResources` usa `figma.createImageAsync(URL)` para imágenes e iconos. Si Figma no puede resolverlos, el plan crea un marcador con la geometría original y etiqueta en inglés. **RF-03.**
- `findUnavailableFonts` agrupa por familia y estilo. La interfaz solicita una selección una vez por grupo; una cancelación selecciona la fuente predeterminada de Figma para todos sus usos. **RF-03.**
- La ubicación se calcula después de construir y justo antes de confirmar. Por ello conserva el contenido existente, aplica el resultado en la página de inicio aunque se cambie de página y añade automáticamente si una página inicialmente vacía recibió contenido durante la espera. **RF-04, RF-05.**
- La sesión solo contiene identificador, página de inicio, estado, señal de cancelación y elecciones de fuente en memoria. Se descarta al cancelar, cerrar o terminar; no se escribe en `figma.clientStorage` ni en el documento. **RF-02, RF-05.**

## Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Usar TypeScript, Figma Plugin API y `fetch` nativo en una sola capa HTTP propia | Cumple el stack mínimo y concentra la llamada a API v1, el tratamiento de errores y la cancelación. **RF-01, RF-05, RF-06.** | SDK HTTP, cliente adicional o peticiones desde la interfaz. |
| Considerar `figma.createImageAsync(URL)` una primitiva nativa de Figma | Está aprobada para resolver imágenes editables sin gestionar bytes ni crear otra capa HTTP propia. **RF-03.** | Descargar bytes con un cliente HTTP adicional. |
| Permitir cualquier dominio de red con justificación explícita | Está aprobado para la API local y los recursos públicos de cualquier dominio devueltos por API v1. **RF-03, RF-06.** | Restringir al dominio de API o usar un proxy, que impediría recursos externos o exigiría ampliar API v1. |
| Validar manualmente el contrato completo v1 antes de mutar el lienzo | Evita dependencias de validación y protege la atomicidad para un contrato estable. **RF-03.** | Biblioteca de esquemas en ejecución. |
| Separar dominio, aplicación, adaptadores Figma y presentación | Hace testeable la lógica y evita que estado, transformación o API dependan de la interfaz. **RF-01 a RF-05.** | Manipular Figma y la UI desde el manejador de mensajes. |
| Construir en una raíz temporal invisible | Evita elementos visuales parciales y preserva el contenido previo si ocurre un fallo. **RF-03 a RF-05.** | Crear nodos directamente en el destino. |
| Selector de fuentes una vez por familia y estilo | Mantiene la elección consistente en todos los usos de una fuente ausente; una cancelación usa la fuente predeterminada de Figma. **RF-03.** | Marcador de texto, una decisión por nodo o cancelar toda la importación. |
| No persistir estado de importación | Cumple el alcance MVP y la política de datos; no se guardan URL, JSON, credenciales ni identificadores entre aperturas. **RF-02, RF-04, RF-05.** | Registrar importaciones para reconocerlas después. |
| Mantener una interfaz HTML sin framework | Formulario, confirmación, selector de fuentes, cancelación y estados se cubren con el DOM nativo. **RF-01 a RF-05.** | React u otro framework. |
| Añadir `esbuild` solo como dependencia de desarrollo | Empaqueta módulos TypeScript para las dos entradas del plugin sin incorporar un framework de ejecución. | Conservar solo `tsc`, que no empaqueta de forma fiable la estructura modular propuesta. |
| Añadir Vitest solo como dependencia de desarrollo | Permite pruebas aisladas de TypeScript, adaptadores simulados y pruebas de integración HTTP. | Pruebas manuales o sin runner. |

## Estrategia de tests

| Nivel | Cobertura | RF |
| --- | --- | --- |
| Unitario: contrato API | URL transmitida sin validación semántica, `includeHidden=false`, ausencia de autenticación, respuesta v1 completa, error `{code,message}` y respuesta no conforme. | RF-01, RF-03, RF-05, RF-06 |
| Unitario: sesión y mensajes | Estados, `requestId`, bloqueo de duplicados, cancelación, cierre, respuestas tardías, errores locales, sin reintentos ni límite propio. | RF-02, RF-05 |
| Unitario: fuentes y recursos | Agrupación por familia/estilo, selección única, cancelación con fuente predeterminada, marcadores no tipográficos y avisos de éxito. | RF-03 |
| Unitario: ubicación | `(0, 0)` sin contenido, confirmación de añadir/cancelar, límites de nodos visibles, separación de 100 px, alineación superior y conservación de nodos existentes. | RF-04, RF-05 |
| Unitario: plan de renderizado | Mapeo recursivo de todos los nodos y propiedades API v1: geometría, Auto Layout, texto, estilos, pinturas, bordes, efectos, recursos y visibilidad. | RF-03 |
| Integración: API local real | API v1 en `localhost:3000` con páginas y fixtures controlados; verifica solicitud HTTP real, errores, contrato y falta de autenticación. | RF-01, RF-05, RF-06 |
| Integración: aplicación | API local real y Figma simulado: éxito, respuesta inválida, recurso inaccesible, selector de fuente, cancelación, cambio de página, página eliminada y cambios de contenido durante la espera. | RF-01 a RF-06 |
| Integración: atomicidad | Fallo al cargar recurso, fuente o nodo; se elimina la raíz temporal y el contenido existente permanece intacto. | RF-03, RF-04, RF-05 |
| Verificación de manifiesto | Se comprueba el permiso global, su justificación en inglés y el dominio local de desarrollo antes de publicar. | RF-03, RF-06 |

Las pruebas HTTP de integración usan la API local real; los adaptadores de Figma se simulan para aislar el documento y hacer reproducibles los fallos de renderizado. Las comprobaciones manuales en Figma complementan, pero no reemplazan, las pruebas automatizadas de toda la lógica no visual y de la integración HTTP.
