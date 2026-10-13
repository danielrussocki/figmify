# AGENTS.md — Figmify by DanRusso

## Proyecto
Plugin de Figma que consumirá una API para generar el diseño de una web. `code.ts` ejecuta el controlador en el sandbox de Figma y `ui.html` contiene la interfaz en un iframe; el proyecto usa TypeScript estricto (ES2020), Figma Plugin API, npm, ESLint y `tsc`.

## Comandos
- Ejecutar/compilar: `npm run build` (o `npm run watch` durante el desarrollo)
- Tests: no hay runner configurado; antes de añadir lógica no visual o integración HTTP, añadir uno mínimo y justificado, y ejecutar su comando.
- Lint: `npm run lint` (corrección: `npm run lint:fix`); no hay formateador configurado.

## Estilo y convenciones
TypeScript 5 en modo estricto; usar `camelCase` para valores y funciones, `PascalCase` para tipos e interfaces y nombres descriptivos. Todo archivo que no sea `.md`, incluidos código, comentarios, configuración, commits, mensajes de usuario y errores, debe estar en inglés.

## Reglas
- Lee `docs/constitution.md` y la spec activa antes de tocar código.
- Mantén la lógica de API, transformación y estado independiente de la interfaz; la UI solo intercambia mensajes tipados con el controlador.
- No añadas dependencias, frameworks, almacenamiento alternativo, permisos ni dominios de red sin una necesidad documentada y aprobación explícita.
- `figma.clientStorage` solo puede guardar preferencias o estado mínimo; nunca tokens ni respuestas completas de API.
- No edites `code.js` manualmente: es el resultado generado por TypeScript. Mantén `manifest.json` con dominios de red mínimos y específicos.

## Al terminar cualquier tarea
- Ejecuta `npm run build` y `npm run lint`; ejecuta todos los tests configurados y no des por terminada lógica no visual o HTTP sin sus tests automatizados.
