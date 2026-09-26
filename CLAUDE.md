@AGENTS.md

# Documentación de diseño

El diseño del sistema está en dos documentos en la raíz del repo:

- `spec-tecnica.html` — contexto técnico completo (esquema, reglas, permisos, gotchas). Es el que se pasa como contexto a Claude.
- `spec-sistema.html` — especificación funcional (módulos, roles, flujos, precios, roadmap).

**Regla:** al cerrar una sesión que cambie el modelo de datos, una regla de negocio, el flujo de estados, los permisos o una decisión de arquitectura, actualizar la spec correspondiente **en el mismo commit** que el cambio de código. No hace falta para bug fixes, ajustes visuales o refactors internos.

Al actualizar:
1. Verificar contra el código y la base real; no copiar de memoria ni de la versión anterior.
2. Subir la versión y agregar una fila al "Registro de cambios" al final de `spec-tecnica.html`; actualizar el número de versión en ambos documentos.
3. Si cambia el esquema, regenerar también `src/types/database.ts` y `docs/proyecto-javier/03-esquema-tablas.md`.
