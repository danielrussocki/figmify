# Tareas: MVP de Figmify

Cada tarea está acotada a un máximo de 20–30 minutos y debe completarse en orden. No se edita `code.js` manualmente.

- [x] **01. Verificar el entorno local de API v1 y fijar una URL de fixture pública controlada.**  
  **RF:** RF-01, RF-03, RF-05, RF-06.  
  **Hecho cuando:** `http://127.0.0.1:3000/v1/figma` responde para la fixture elegida y se registra el resultado esperado de éxito y de error.

- [x] **02. Añadir `esbuild` como dependencia de desarrollo y definir la compilación de las entradas del plugin.**
  **RF:** RF-01 a RF-06.  
  **Hecho cuando:** el comando de compilación genera los artefactos de las dos entradas sin modificar manualmente archivos generados.

- [x] **03. Añadir Vitest y los comandos de prueba unitaria e integración.**
  **RF:** RF-01 a RF-06.  
  **Hecho cuando:** existe un comando de tests que ejecuta una prueba vacía correctamente.

- [x] **04. Configurar el acceso de red del manifiesto para el MVP.**  
  **RF:** RF-03, RF-06.  
  **Hecho cuando:** el manifiesto contiene `allowedDomains: ["*"]`, la justificación aprobada en inglés y `http://127.0.0.1:3000` como dominio de desarrollo.

- [x] **05. Crear la estructura de módulos y las entradas de composición sin implementar comportamiento.**
  **RF:** RF-01 a RF-06.  
  **Hecho cuando:** las rutas de módulos previstas en `plan.md` compilan y las capas de dominio, aplicación, infraestructura e interfaz no se importan en dirección prohibida.

- [x] **06. Definir los tipos de éxito y error de API v1.**  
  **RF:** RF-01, RF-03, RF-05, RF-06.  
  **Hecho cuando:** `FigmaDocument`, los nodos v1 y `{code, message}` están tipados sin usar tipos implícitos.

- [x] **07. Implementar y probar la validación de cabecera de API v1.**  
  **RF:** RF-03, RF-05.  
  **Hecho cuando:** las pruebas aceptan `schemaVersion: "1.0"` y rechazan versión, origen o documento raíz ausentes.

- [x] **08. Implementar y probar la validación recursiva de nodos y rectángulos v1.**
  **RF:** RF-03, RF-05.  
  **Hecho cuando:** las pruebas rechazan nodos sin tipo, geometría, visibilidad o lista válida de hijos.

- [x] **09. Implementar y probar la validación de estilos, pinturas, recursos y catálogos v1.**
  **RF:** RF-03, RF-05.  
  **Hecho cuando:** las fixtures válidas se aceptan y las pinturas, recursos o catálogos malformados se rechazan antes de cualquier mutación de Figma.

- [x] **10. Definir los mensajes tipados y el `requestId` del protocolo de interfaz.**  
  **RF:** RF-01, RF-02, RF-03, RF-04, RF-05.  
  **Hecho cuando:** `IMPORT_REQUEST`, confirmación, selección de fuente, cancelación, cierre y estado están representados por uniones tipadas con `requestId`.

- [x] **11. Escribir pruebas de la máquina de estados de importación.**
  **RF:** RF-02, RF-05.  
  **Hecho cuando:** las pruebas cubren `idle`, confirmación, procesamiento, éxito, advertencia, error y cancelación.

- [x] **12. Implementar la máquina de estados y el descarte por `requestId`.**  
  **RF:** RF-02, RF-05.  
  **Hecho cuando:** una segunda solicitud durante procesamiento se rechaza y una respuesta tardía de una sesión inactiva no cambia el estado.

- [x] **13. Preparar el harness de integración contra la API local real.**  
  **RF:** RF-01, RF-05, RF-06.  
  **Hecho cuando:** los tests de integración pueden iniciar contra `127.0.0.1:3000` y fallan claramente si la API local no está disponible.

- [x] **14. Escribir la prueba de integración HTTP de solicitud correcta.**  
  **RF:** RF-01, RF-06.  
  **Hecho cuando:** la prueba real verifica `GET /v1/figma`, la URL transmitida como parámetro, `includeHidden=false` y la ausencia de autenticación.

- [x] **15. Implementar el cliente único de API v1.**
  **RF:** RF-01, RF-05, RF-06.  
  **Hecho cuando:** el cliente usa la base local, reenvía la URL sin validación semántica, propaga errores de API en inglés y admite cancelación.

- [x] **16. Escribir pruebas del cliente para error de API, error de red y respuesta no conforme.**  
  **RF:** RF-01, RF-03, RF-05.  
  **Hecho cuando:** cada caso termina sin un documento de éxito y produce el mensaje en inglés definido por la spec.

- [x] **17. Implementar la lectura de la página de inicio y su existencia.**
  **RF:** RF-04, RF-05.  
  **Hecho cuando:** el adaptador obtiene la página activa al inicio, puede comprobar si sigue existiendo y distingue si tiene nodos.

- [x] **18. Escribir pruebas de política de confirmación y ubicación.**  
  **RF:** RF-04, RF-05.  
  **Hecho cuando:** las pruebas cubren página vacía, añadir, cancelar, contenido añadido durante la espera, separación de 100 px y alineación superior.

- [x] **19. Implementar el cálculo de límites visibles y destino.**  
  **RF:** RF-04, RF-05.  
  **Hecho cuando:** una página vacía devuelve `(0, 0)` y una página con contenido devuelve `(right + 100, top)` sin incluir la raíz temporal.

- [x] **20. Implementar el formulario de URL y la solicitud de añadir/cancelar.**  
  **RF:** RF-01, RF-04.  
  **Hecho cuando:** la interfaz emite `IMPORT_REQUEST`, presenta `add`/`cancel` cuando corresponde y no llama directamente a la API.

- [x] **21. Implementar estados visuales de procesamiento, cancelación y reintento.**  
  **RF:** RF-02, RF-05.  
  **Hecho cuando:** la interfaz bloquea envíos duplicados durante `processing`, permite cancelar y vuelve a aceptar solicitudes tras éxito, error o cancelación.

- [x] **22. Implementar la selección de fuente en la interfaz.**  
  **RF:** RF-03.  
  **Hecho cuando:** para cada familia y estilo ausentes se muestra una única selección de fuentes disponibles y se emite `FONT_SUBSTITUTION_DECISION`.

- [x] **23. Implementar el catálogo de fuentes de Figma y su carga.**  
  **RF:** RF-03.  
  **Hecho cuando:** el adaptador lista fuentes disponibles, detecta fuentes ausentes y carga la elegida o la fuente predeterminada de Figma antes de crear texto.

- [x] **24. Escribir pruebas de agrupación y sustitución tipográfica.**  
  **RF:** RF-03.  
  **Hecho cuando:** las pruebas prueban una elección por familia/estilo, su aplicación a todos los usos y el uso de la fuente predeterminada al cancelar.

- [x] **25. Implementar el plan puro de sustituciones tipográficas.**  
  **RF:** RF-03.  
  **Hecho cuando:** el plan de renderizado asigna a cada uso de fuente ausente la selección única correspondiente o la fuente predeterminada.

- [x] **26. Escribir pruebas de resolución de imágenes, iconos y marcadores.**  
  **RF:** RF-03.  
  **Hecho cuando:** las pruebas cubren recurso resoluble, fallo de `createImageAsync`, marcador con misma geometría y etiqueta en inglés.

- [x] **27. Implementar el resolvedor de recursos no tipográficos.**  
  **RF:** RF-03.  
  **Hecho cuando:** imágenes e iconos se resuelven mediante `figma.createImageAsync(URL)` y los fallos se convierten en entradas de marcador sin abortar la importación.

- [x] **28. Escribir pruebas del plan de renderizado de jerarquía y geometría.**
  **RF:** RF-03.  
  **Hecho cuando:** las pruebas verifican nodos `FRAME`, `TEXT` e `IMAGE`, hijos, coordenadas relativas, visibilidad y opacidad.

- [x] **29. Implementar el mapeo de `FRAME`, geometría, visibilidad y opacidad.**
  **RF:** RF-03.  
  **Hecho cuando:** una fixture v1 de marcos anidados genera un plan equivalente sin llamar a Figma ni a la interfaz.

- [x] **30. Implementar y probar el mapeo de pinturas sólidas y bordes.**
  **RF:** RF-03.  
  **Hecho cuando:** los rellenos sólidos, trazos y pesos de borde de una fixture v1 se conservan en el plan de renderizado.

- [x] **31. Implementar y probar el mapeo de radios y efectos.**  
  **RF:** RF-03.  
  **Hecho cuando:** radios de esquina, sombras y efectos de una fixture v1 se reflejan individualmente en el plan.

- [x] **32. Implementar y probar el mapeo de Auto Layout.**  
  **RF:** RF-03.  
  **Hecho cuando:** dirección, alineación, espaciado, relleno y ajuste de tamaño de un nodo con Auto Layout se conservan en el plan.

- [x] **33. Implementar y probar el catálogo de colores y estilos reutilizables.**  
  **RF:** RF-03.  
  **Hecho cuando:** las referencias de color y estilo definidas en el catálogo v1 se resuelven correctamente en los nodos que las usan.

- [x] **34. Corregir y verificar el dominio de desarrollo del manifiesto.**  
  **RF:** RF-01, RF-06.  
  **Hecho cuando:** `devAllowedDomains` usa `http://localhost:3000` como URL de desarrollo válida y Figma carga el manifiesto sin errores de validación.

- [x] **35. Implementar y probar el mapeo de caracteres y propiedades de texto.**  
  **RF:** RF-03.  
  **Hecho cuando:** caracteres, tamaño, alineación, espaciado, altura de línea y sustituciones de fuente se conservan en el plan.

- [x] **36. Implementar y probar el mapeo de pinturas de imagen y marcadores.**  
  **RF:** RF-03.  
  **Hecho cuando:** una imagen resuelta se asigna como pintura y una no resuelta se sustituye por el marcador definido.

- [x] **37. Escribir pruebas de atomicidad del renderizador de Figma.**  
  **RF:** RF-03, RF-04, RF-05.  
  **Hecho cuando:** los fallos de nodo, fuente o recurso eliminan la raíz temporal y preservan todos los nodos previos.

- [ ] **38. Implementar la raíz temporal invisible y su limpieza.**  
  **RF:** RF-03, RF-05.  
  **Hecho cuando:** la raíz temporal permanece oculta y se elimina ante error, cancelación o desaparición de la página.

- [ ] **39. Implementar el renderizado recursivo del plan completo.**  
  **RF:** RF-03.  
  **Hecho cuando:** el renderizador crea la jerarquía, propiedades y recursos del plan dentro de la raíz temporal.

- [ ] **40. Implementar la confirmación final y la visibilidad del diseño.**  
  **RF:** RF-03, RF-04, RF-05.  
  **Hecho cuando:** el diseño se hace visible en la página de inicio y se mueve al destino calculado solo después de completar el renderizado.

- [ ] **41. Escribir pruebas de orquestación de la ruta de éxito.**  
  **RF:** RF-01, RF-02, RF-03, RF-04, RF-06.  
  **Hecho cuando:** una respuesta v1 válida recorre solicitud, fuentes, recursos, renderizado, ubicación y estado final de éxito o advertencia.

- [ ] **42. Implementar la orquestación desde solicitud hasta respuesta validada.**  
  **RF:** RF-01, RF-02, RF-05, RF-06.  
  **Hecho cuando:** el caso de uso conecta mensajes, sesión, confirmación inicial, cliente API y validación de respuesta.

- [ ] **43. Integrar fuentes, recursos y renderizador en el caso de uso.**  
  **RF:** RF-03, RF-04.  
  **Hecho cuando:** una respuesta validada genera el selector de fuentes cuando corresponde y confirma el diseño renderizado en el destino correcto.

- [ ] **44. Escribir pruebas de errores de orquestación.**  
  **RF:** RF-01, RF-03, RF-05.  
  **Hecho cuando:** las pruebas verifican error de API, red, contrato inválido, página eliminada y fallo de creación con sus mensajes definidos.

- [ ] **45. Implementar los caminos de error y reintento de la orquestación.**  
  **RF:** RF-01, RF-03, RF-05.  
  **Hecho cuando:** cada error termina la sesión sin mutaciones y la interfaz queda lista para solicitar otra importación.

- [ ] **46. Escribir pruebas de carrera y ciclo de vida.**  
  **RF:** RF-02, RF-04, RF-05.  
  **Hecho cuando:** las pruebas cubren cancelación, cierre, respuesta tardía, cambio de página, eliminación de la página inicial y cambios de contenido durante la espera.

- [ ] **47. Implementar el descarte de resultados en carreras y cierres.**  
  **RF:** RF-02, RF-05.  
  **Hecho cuando:** ningún resultado tardío, cancelado o asociado a una página eliminada añade o modifica elementos.

- [ ] **48. Ejecutar la verificación final de manifiesto, build, lint y suites.**  
  **RF:** RF-01 a RF-06.  
  **Hecho cuando:** la verificación de manifiesto, build, lint, tests unitarios e integración HTTP local real finalizan correctamente.
