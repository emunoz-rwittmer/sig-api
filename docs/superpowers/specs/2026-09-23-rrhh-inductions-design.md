# Diseño — Dominio RRHH "Inducciones"

## Contexto

RRHH necesita publicar inducciones con material didáctico (archivos y/o
enlaces), un cuestionario de opción múltiple con respuesta correcta, una
calificación mínima configurable y un número máximo de intentos configurable.
Cada inducción se asigna a una o varias empresas y aplica automáticamente a
todo el personal activo de esas empresas, incluido el que ingrese después
(asignación dinámica vía `staff_companies`, no snapshot como en
`regulations`).

Patrón de referencia: `rrhh/regulations` (modelo, service, controller,
rutas). Ver `docs/CONVENTIONS.md` para manejo de errores, transacciones,
PK-encoding y validación de ids.

## Modelo de datos

Ver `2026-09-23-rrhh-inductions-migration.sql` para el DDL completo. Resumen:

- `inductions` — datos generales (nombre, descripción, `passing_score` %,
  `max_attempts`, `active`).
- `induction_companies` — empresas asignadas (N:M con `companies`).
- `induction_materials` — material didáctico: `kind` (`file`/`link`),
  `title`, `url`, `mime_type`, `sort_order`.
- `induction_questions` / `induction_options` — cuestionario normalizado;
  `is_correct` en `induction_options` nunca se expone a un trabajador
  rindiendo el intento (`inductionPresenters.toStaffDto`).
- `induction_progress` — 1 fila por (inducción, staff): `material_viewed_at`
  (gate para poder rendir) y `extra_attempts` (intento adicional habilitado
  por RRHH). Se crea de forma perezosa (lazy) al primer acceso del staff, no
  con un `bulkCreate` al publicar — porque la asignación es dinámica.
- `induction_attempts` — historial de intentos con `answers` (snapshot JSON
  de la respuesta elegida por pregunta), `score`, `passed`.

## Reglas de negocio (`src/utils/inductionScoring.js`, puro)

- Una inducción es válida si tiene ≥1 pregunta, cada pregunta tiene entre 2
  y 6 opciones y exactamente una marcada correcta.
- `score = round(correctCount / totalQuestions * 100, 2)`; `passed = score >=
  passingScore`.
- Intentos restantes = `maxAttempts + extraAttempts - intentosUsados`. En 0,
  el backend rechaza un intento nuevo con 400 hasta que RRHH otorgue uno
  extra (`POST .../extra-attempt`).
- Un intento nuevo requiere `material_viewed_at` no nulo (gate de lectura del
  material, igual que la aceptación de reglamentos).
- Estado por staff: `pending` (sin intentos) · `in_progress` (vio material,
  sin intento aprobado, con intentos restantes) · `failed` (sin intentos
  restantes y sin aprobar) · `passed`.

## Endpoints

Ver rutas documentadas con `@openapi` en
`src/routes/rrhh/inductions.routes.js`. Montadas en `/api/inductions` bajo
`authJwt.verifyToken`; los endpoints de administración además exigen
`authJwt.hasAnyRole(['admin', 'rrhh'])`. Los endpoints `/me...` resuelven el
staff desde `req.userId` (agregado en `verifyToken`), nunca desde la URL.

## Preguntas aleatorias por intento (2026-09-23, addendum)

`inductions.questionsToShow` (nullable) define cuántas preguntas del banco
se muestran por intento — `null` o `>=` al total muestra todas. En cada
intento nuevo el backend sortea (`inductionScoring.pickRandomQuestions`,
Fisher-Yates) un subconjunto y lo persiste en
`induction_progress.selected_question_ids` /
`.selected_for_attempt` (ver migración
`2026-09-23b-rrhh-inductions-random-questions-migration.sql`), así:

- Dos colaboradores (o dos aperturas de la misma sesión) ven, con alta
  probabilidad, preguntas distintas — dificulta copiarse.
- Un refresh de página en medio del mismo intento no cambia el
  subconjunto (se reutiliza mientras `attemptsUsed` no avance).
- `submitAttempt` valida y califica **solo** contra ese subconjunto —
  exige que la respuesta cubra exactamente esas preguntas, ni más ni
  menos.

## Bloqueo del lado del colaborador tras responder

En el front, una inducción con `attemptsUsed > 0` se considera
"bloqueada" para el trabajador: en vez de reabrir el cuestionario, la
tarjeta en `/inductions/me` abre un modal de resumen
(`InductionSummaryModal`) con estado, nota, intentos usados y — si
todavía tiene intentos restantes y no aprobó — un botón para rendir de
nuevo (dispara un sorteo nuevo). El acceso directo por URL a
`/inductions/me/:id` sigue la misma regla (`useTakeInduction.blocked`).
No es un cambio de contrato del backend: se deriva de `status` /
`remainingAttempts`, ya expuestos en la respuesta de `/inductions/me`.

## Fuera de alcance

- No se reutiliza el motor de encuestas (`operations/surveys`): no modela
  respuesta correcta ni calificación, según lo confirmado en la
  investigación previa.
- No se migra `regulations` a asignación dinámica — es un dominio aparte y
  no se toca fuera del alcance de esta tarea.
