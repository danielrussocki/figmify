# Constitución del proyecto

1. **Stack mínimo:** TypeScript, Figma Plugin API y una única capa HTTP; toda dependencia debe justificar una necesidad no nativa.
2. **Spec antes que código:** ninguna funcionalidad se implementa sin requisito documentado y trazable a sus archivos.
3. **Límites claros:** la lógica de API, transformación y estado no puede importar ni manipular la interfaz.
4. **Tests obligatorios:** toda lógica no visual y cada integración HTTP deben tener tests automatizados antes de fusionarse.
5. **Datos persistentes:** solo se persisten preferencias y estado imprescindible mediante `figma.clientStorage`; nunca tokens ni respuestas completas.
6. **Idioma consistente:** únicamente los archivos `.md` estarán en español; código, mensajes de usuario, errores, commits y configuración estarán en inglés.
