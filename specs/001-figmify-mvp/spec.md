# Especificación: MVP de Figmify

## Contexto y objetivo
Figmify permite partir de la URL de una web para obtener un diseño editable en Figma. El servicio externo valida la URL y el acceso a la web, transforma sus elementos HTML en JSON y comunica sus errores en inglés. El MVP consume exclusivamente la API v1 estable, cuyo contrato canónico está disponible en [API Figmify v1](https://github.com/danielrussocki/api.figmify).

La API v1 garantiza que cada respuesta de éxito contiene elementos y propiedades compatibles con Figma y dentro de sus límites de creación. El objetivo del MVP es reproducir, en la página donde se inició la importación, toda la información de esa respuesta con la máxima fidelidad, salvo los recursos externos que no estén disponibles.

## Usuarios
- Diseñadores y diseñadoras que trabajan en Figma y necesitan usar una web existente como punto de partida editable.
- Personas que desean iterar sobre un diseño web sin reconstruir manualmente sus elementos desde cero.

## Historias de usuario
- Como persona diseñadora, quiero introducir la URL de una web para obtener su diseño como elementos editables en Figma.
- Como persona diseñadora, quiero añadir un resultado derivado del JSON sin perder contenido existente.
- Como persona usuaria, quiero cancelar una importación en curso o reintentar tras un error sin crear elementos no deseados.
- Como persona usuaria, quiero saber si el diseño creado contiene recursos sustituidos por marcadores.

## Requisitos funcionales

### RF-01 — Solicitud desde una URL
- **Criterio de aceptación (EARS):** Cuando la persona usuaria solicite una importación, el sistema deberá enviar al servicio el valor de URL introducido sin modificarlo ni imponer límites propios de longitud, formato, redirecciones o accesibilidad.
- **Criterio de aceptación (EARS):** Cuando el servicio informe de que la URL es inválida, inaccesible o requiere acceso restringido, el sistema no deberá crear ni modificar elementos y deberá mostrar el error recibido en inglés.

### RF-02 — Estado, cancelación y cierre
- **Criterio de aceptación (EARS):** Mientras una importación esté en curso, el sistema deberá mostrar el estado de procesamiento e impedir solicitudes duplicadas.
- **Criterio de aceptación (EARS):** Mientras una importación esté en curso, la persona usuaria deberá poder cancelarla.
- **Criterio de aceptación (EARS):** Cuando la persona usuaria cancele una importación o cierre el plugin, el sistema deberá descartar cualquier respuesta posterior y no deberá crear ni modificar elementos.
- **Criterio de aceptación (EARS):** Cuando una importación finalice, se cancele o reciba un error, el sistema deberá abandonar el estado de procesamiento y permitir una nueva solicitud.

### RF-03 — Creación fiel del diseño
- **Criterio de aceptación (EARS):** Cuando el servicio devuelva una respuesta de éxito conforme al contrato de API v1, el sistema deberá crear en la página de inicio de la importación todos los elementos y propiedades descritos como elementos editables de Figma.
- **Criterio de aceptación (EARS):** El sistema deberá conservar la estructura, los estilos y los comportamientos descritos por la respuesta de API v1, con la máxima fidelidad permitida por Figma.
- **Criterio de aceptación (EARS):** Cuando un nodo de la respuesta de API v1 incluya un tag HTML, el sistema deberá conservarlo como nombre del nodo editable correspondiente en Figma para hacer identificable su estructura.
- **Criterio de aceptación (EARS):** Si un recurso externo que no sea una tipografía, como una imagen o un icono, no está disponible, el sistema deberá sustituirlo por un marcador editable que conserve su posición y espacio, e incluya una etiqueta en inglés que identifique el recurso no disponible.
- **Criterio de aceptación (EARS):** Si una tipografía descrita por la respuesta no está disponible en Figma, el sistema deberá mostrar un selector con las fuentes disponibles para que la persona usuaria elija una sustituta.
- **Criterio de aceptación (EARS):** Cuando la persona usuaria elija una sustituta para una familia y estilo de fuente ausentes, el sistema deberá aplicarla a todos los usos de esa fuente dentro de la importación.
- **Criterio de aceptación (EARS):** Si la persona usuaria cancela el selector de una fuente ausente, el sistema deberá aplicar la fuente predeterminada asignada por Figma a todos los usos de esa fuente dentro de la importación.
- **Criterio de aceptación (EARS):** Cuando una importación cree uno o más marcadores o use la fuente predeterminada de Figma por una selección cancelada, el sistema deberá comunicar un éxito con advertencia en inglés.
- **Criterio de aceptación (EARS):** Si la respuesta recibida no cumple el contrato de API v1, el sistema no deberá crear ni modificar elementos y deberá mostrar `The API response is not compatible with API v1.`.

### RF-04 — Convivencia con contenido existente
- **Criterio de aceptación (EARS):** Cuando la página de inicio contenga cualquier elemento, el sistema deberá ofrecer las opciones de añadir o cancelar antes de iniciar la importación.
- **Criterio de aceptación (EARS):** Cuando la página de inicio esté vacía, el sistema deberá crear el primer diseño importado en las coordenadas `(0, 0)` del lienzo.
- **Criterio de aceptación (EARS):** Cuando la persona usuaria elija añadir, el sistema deberá conservar sin cambios todos los elementos existentes y colocar el nuevo diseño como bloque independiente a 100 píxeles a la derecha del límite visual del contenido existente, sin solaparlo y alineado con su límite superior.
- **Criterio de aceptación (EARS):** Si la persona usuaria cancela cualquier confirmación, el sistema no deberá iniciar la importación ni modificar la página.

### RF-05 — Errores, reintento y cambios durante el proceso
- **Criterio de aceptación (EARS):** Si el servicio devuelve un error, el sistema no deberá crear ni modificar elementos, deberá mostrar el error recibido en inglés y deberá permitir introducir otra URL o iniciar manualmente un nuevo intento.
- **Criterio de aceptación (EARS):** Si la solicitud falla antes de recibir una respuesta del servicio, el sistema no deberá crear ni modificar elementos y deberá mostrar `Unable to reach Figmify API. Please try again.`.
- **Criterio de aceptación (EARS):** Si la creación del diseño en Figma falla, el sistema no deberá dejar elementos nuevos y deberá mostrar `The design could not be created.`.
- **Criterio de aceptación (EARS):** Cuando el servicio tarde en responder, el sistema deberá mantener el estado de procesamiento hasta recibir una respuesta, una cancelación o el cierre del plugin; no deberá aplicar límites de tiempo ni reintentos automáticos.
- **Criterio de aceptación (EARS):** Si la persona usuaria cambia de página mientras una importación está en curso, el sistema deberá aplicar el resultado únicamente en la página de inicio de esa importación.
- **Criterio de aceptación (EARS):** Si la página de inicio se elimina antes de que llegue la respuesta, el sistema deberá descartar el resultado, no deberá modificar ninguna página y deberá mostrar `The import page is no longer available.`.
- **Criterio de aceptación (EARS):** Si el contenido de la página de inicio cambia mientras la importación está en curso, el sistema deberá usar el estado existente al recibir la respuesta para conservar todo el contenido y ubicar el resultado a la derecha del contenido existente.
- **Criterio de aceptación (EARS):** Si la página de inicio estaba vacía al iniciar la importación y recibe contenido durante el proceso, el sistema deberá añadir el resultado automáticamente a la derecha del contenido existente, sin pedir una confirmación adicional.

### RF-06 — Acceso al servicio
- **Criterio de aceptación (EARS):** Cuando la persona usuaria solicite una importación, el sistema deberá usar la API v1 sin pedir ni requerir credenciales de la persona usuaria.

## Requisitos no funcionales
- Todos los mensajes visibles para la persona usuaria, incluidos estados, avisos y errores, estarán en inglés; la API v1 proporciona sus errores en inglés.
- La creación será atómica para elementos y propiedades: una respuesta no conforme a API v1 o un fallo de creación no dejará elementos nuevos parciales. Los recursos externos no tipográficos no disponibles se resolverán mediante marcadores y las tipografías ausentes mediante el selector de sustitución o la fuente predeterminada de Figma.
- El MVP no persistirá datos entre aperturas del plugin; nunca persistirá respuestas completas del servicio, URLs ni credenciales.
- La API v1 es la única versión admitida por el MVP. Las versiones posteriores quedan fuera de alcance.
- La validación de la URL, el acceso a la web de origen, la compatibilidad de la respuesta con Figma y sus límites de tamaño son responsabilidad de la API v1.

## Casos límite
- URL vacía, malformada, con redirecciones, inaccesible o que requiera autenticación para consultar la web de origen; la API v1 determina el resultado y comunica el error en inglés.
- Servicio no disponible, error de acceso restringido o respuesta lenta; la importación se mantiene en proceso hasta que haya respuesta, se cancele o se cierre el plugin, sin reintentos automáticos.
- Respuesta que no cumple el contrato de API v1; no se crea ni modifica contenido.
- Imagen, icono u otro recurso externo no tipográfico no disponible; se crea un marcador editable con el mismo espacio y posición, etiqueta en inglés y aviso final de éxito con advertencia.
- Tipografía no disponible; se muestra una selección única por familia y estilo ausentes y se aplica su resultado a todos sus usos; si se cancela, se usa la fuente predeterminada de Figma y se muestra un éxito con advertencia.
- Página de inicio vacía; el primer resultado se crea en `(0, 0)`.
- Página de inicio con contenido existente; solo se puede añadir o cancelar.
- Página inicialmente vacía que recibe contenido durante el proceso; el resultado se añade automáticamente a 100 píxeles a la derecha del límite visual y alineado arriba.
- Cambio de página durante el proceso; el resultado se aplica en la página de inicio.
- Eliminación de la página de inicio, cancelación de la importación o cierre del plugin; el resultado pendiente se descarta y no modifica contenido.
- Cambios en el contenido de la página de inicio durante el proceso; al completarse se usa el estado existente en ese momento.
- Solicitudes múltiples antes de que finalice la primera; solo se acepta la primera mientras esté en curso.

## Fuera de alcance
- Editar la web de origen, sincronizar cambios en ambos sentidos o actualizar automáticamente una importación previa.
- Importar contenido que no parta de una URL web.
- Añadir autenticación para acceder a la API v1 o a la web de origen.
- Admitir versiones de la API posteriores a v1.
- Reproducir información, recursos o comportamientos que no estén presentes en la respuesta de API v1.
- Sustituir o borrar elementos creados manualmente por la persona usuaria.
- Reconocer, modificar o reemplazar resultados de importaciones anteriores.
- Imponer límites de tiempo, reintentos automáticos o validaciones de URL adicionales a las realizadas por la API v1.
- Conservar datos entre aperturas del plugin.

## Criterios de finalización
- Todas las historias de usuario y los criterios de aceptación RF-01 a RF-06 están verificados.
- Una respuesta de éxito de API v1 crea un diseño editable y fiel a toda la información descrita, salvo recursos externos no tipográficos no disponibles, que se sustituyen por marcadores, y tipografías ausentes, que usan la sustitución definida.
- Las imágenes, iconos y recursos externos no tipográficos no disponibles generan marcadores; las tipografías ausentes se sustituyen mediante el selector o la fuente predeterminada de Figma.
- Los marcadores y el uso de la fuente predeterminada tras cancelar un selector generan un éxito con advertencia; las respuestas no conformes, los errores del servicio y los fallos locales no producen cambios.
- La cancelación, el cierre del plugin, el cambio o eliminación de la página de inicio y los cambios concurrentes de contenido cumplen los comportamientos definidos.
- Añadir conserva todo el contenido existente y coloca el resultado a su derecha.
- Toda lógica no visual de la funcionalidad y cada integración HTTP cuentan con pruebas automatizadas antes de integrar la funcionalidad.

## Dudas abiertas
No quedan dudas abiertas para el alcance definido del MVP.
