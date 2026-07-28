# Fase 2 — Operaciones: Comment Card — diseño

**Fecha:** 2026-07-28  
**Estado:** Implementado

## Contexto y alcance

Primer dominio de operaciones después de completar los catálogos. El alcance
incluye los 12 endpoints montados en `/api/coment_cards`, su controller,
servicio, rutas Swagger y pruebas de dominio. Se conservan los paths existentes
y la forma de las respuestas exitosas.

## Hallazgos y decisiones

- Los 12 handlers atrapaban todo error y respondían 400 con un string. Ahora
  delegan a `errorHandler` mediante `next(error)`.
- Los IDs hashids malformados se clasifican como 400. Los recursos individuales
  inexistentes (comment card, QR o link activo por fecha) responden 404.
- Los payloads de creación, actualización y respuesta se validan antes de tocar
  la base de datos.
- Las preguntas usadas al actualizar o responder deben pertenecer a la comment
  card correspondiente. Una FK por sí sola no evita mezclar preguntas de otro
  formulario.
- `updateComentCard` escribía `opciones`, pero el atributo Sequelize es
  `options`; el update podía ignorar silenciosamente las opciones. Se corrigió
  y se cubrió con una prueba de regresión.
- Los campos `scaleMin` y `scaleMax` se preservan tanto al crear como al
  actualizar preguntas.
- `getComentCardByDates` recibía `:yacht_id`, pero lo comparaba directamente
  contra `coment_card_yacht_id`. Funcionaba por accidente cuando ambos
  autoincrementos coincidían. Ahora filtra `card_yacht.yachtId` mediante la
  asociación y la prueba desincroniza expresamente ambos IDs.
- Las transacciones manuales fueron reemplazadas por transacciones administradas
  para garantizar rollback y conservar el error original.
- Las respuestas se insertan con `bulkCreate`; las consultas simples ya no
  contienen `try/catch` que solo vuelve a lanzar el mismo error.
- Se eliminaron imports sin uso (`mathjs`, `xlsx`, `dayjs`, `dotenv`) y
  mutaciones con `map` usado solo por efectos secundarios.
- Se preservan nombres JSON legados como `access_link` y `nombre_completo`,
  aunque el modelo exponga atributos camelCase, para no romper consumidores.
- El reporte conserva la compatibilidad con `yacht_id=undefined`, pero ahora
  exige que `startDate` y `endDate` se envíen juntos y sean fechas válidas.

## Contrato de errores

| Caso | Status |
|---|---:|
| Hashid, fecha o payload inválido | 400 |
| Comment card/QR/link individual inexistente | 404 |
| Token ausente o inválido en rutas administrativas | 403 |
| Sequelize, DB o error inesperado | 500 |

Todos los errores que llegan al handler global usan:

```json
{ "error": { "message": "mensaje", "code": "AppError|INTERNAL_ERROR" } }
```

## Seguridad preservada

Se mantiene el comportamiento previo de rutas:

- Con JWT: listado administrativo, get/create/update/delete y asignaciones a
  yates.
- Públicas: links, formulario por QR/fecha, envío de respuesta y reporting.

La exposición actual de links y reporting no se amplía ni se corrige dentro de
este refactor para evitar un cambio de autorización no solicitado. Debe
reevaluarse expresamente en una fase de hardening.

## Verificación

Las pruebas de dominio cubren casos felices, 400, 404, propagación a 500,
persistencia de opciones/escalas, relaciones y transacciones. Swagger documenta
los 12 endpoints y distingue rutas públicas de rutas con bearer token.

## Reglas reutilizables para siguientes fases

Las decisiones generales derivadas de este dominio quedaron añadidas a
`docs/CONVENTIONS.md`: validación de hashids, transacciones administradas,
atributos Sequelize frente a columnas físicas y validación de pertenencia de
relaciones.
