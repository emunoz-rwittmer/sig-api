# Cron `generateWeeklyEvaluationCrew` — diagnóstico y fix (0 evaluaciones generadas)

**Fecha:** 2026-08-06
**Estado:** Resuelto
**Archivo:** `src/controllers/cronJobs.controller.js` (función `generateWeeklyEvaluationCrew`)
**Script de verificación:** `src/scripts/diagnoseWeeklyEvaluationCrew.js` (`npm run diagnose:weekly-eval`)

## Reglas de negocio (precedente — válidas para cualquier trabajo futuro sobre este flujo)

- Las semanas de evaluación se miden **viernes a viernes**.
- El cron corre **jueves a las 14:00 (America/Guayaquil)**, un día antes de que cierre
  la semana, por tema de logística (`src/utils/cronJobs.js`, expresión `0 14 * * 4`).
- Se genera una evaluación por cada tripulante **embarcado en el momento exacto en
  que se dispara la tarea** (no al inicio ni al fin de la semana calendario).
- Si un tripulante **se está embarcando** (su `shipmentDate` todavía no llegó al
  momento de disparar la tarea), **no se evalúa esta corrida** — se evaluará la
  semana siguiente, cuando ya lleve embarcado.
- Si un tripulante **se está desembarcando** (su `dischargeDate` es futuro o nulo
  al momento de disparar la tarea), **sí se evalúa**, porque formó parte de la
  semana que se está cerrando.
- Cada capitán evalúa a su tripulación (un form por posición) y cada tripulante
  evalúa al capitán (excepto forms marcados `isAdministrative`).

## Modelo de datos importante: `ShipmentDates` es un calendario de rotaciones, no un estado

Cada `StaffCompany` (tripulante ↔ empresa/yate) tiene **múltiples filas en
`ShipmentDates`**, cargadas con meses de anticipación (ej. embarca 6 semanas,
desembarca ~3 semanas, repite, con fechas ya definidas hasta 2027). **No existe
una sola fila "activa"**: hay que encontrar, de todas las filas de una persona,
la que contiene a "ahora" dentro de `[shipmentDate, dischargeDate]` (o
`dischargeDate` nulo = indefinido).

Esto es clave para cualquier query futura sobre embarque/desembarque: nunca
asumir "una fila = un tripulante". Filtrar siempre por rango de fecha que
contenga el instante de referencia, no por existencia de la fila.

## Causas encontradas (fueron 2 bugs de código + 1 dato de entorno, los 3 simultáneos)

1. **Comparación de posición sin tilde.** El código comparaba
   `positionName === "Capitan"`, pero el catálogo real (`Positions.name`) usa
   `"Capitán"` (con tilde). Nunca había match → `captainByCompany` quedaba
   vacío para todas las empresas → todo tripulante se saltaba con
   `if (!captain) continue;`. **Fix:** usar el string real `"Capitán"`.

2. **`HASHIDS_SALT` desincronizado con `Form.positions`.** Los `Form.positions`
   guardados en BD son IDs de posición codificados con Hashids
   (`Utils.encode(position.id)`). El `.env` había cambiado de salt un día antes
   (5 de agosto) sin re-codificar los forms existentes, así que
   `Utils.decode(form.positions[0])` daba `undefined` para todos los forms —
   ningún form matcheaba ninguna posición. **Fix:** lo corrigió el usuario
   (restauró/ajustó el salt correcto). Verificado con
   `Utils.encode(position.id)` == valores en `Form.positions` para los 9 forms
   activos.

3. **Filtro de fecha de embarque demasiado estricto (introducido en un primer
   intento de fix, y corregido en el mismo día).** Un primer intento usó
   `shipmentDate < evaluationWeekStart` (excluir a cualquiera con embarque
   dentro de la semana en curso). Esto excluía por error a tripulantes que
   embarcaron **justo el viernes en que arrancó la semana** — llevaban casi
   toda la semana a bordo y sí debían evaluarse. La regla correcta no depende
   del inicio de semana, sino del instante exacto del disparo:

   ```js
   shipmentDate: { [Op.lte]: evaluationRunAt },   // now >= shipmentDate
   [Op.or]: [
       { dischargeDate: null },
       { dischargeDate: { [Op.gte]: evaluationRunAt } }   // now <= dischargeDate (o indefinido)
   ]
   ```

   Es decir: `evaluationRunAt` (el `now` de cuando corre el cron) debe caer
   dentro de `[shipmentDate, dischargeDate]`. Simple, y cubre las 3 reglas de
   negocio sin lógica adicional de "semana".

## Verificación (dry-run contra datos reales, sin escribir en BD)

Con los 3 fixes aplicados, `npm run diagnose:weekly-eval` reportó:

- 29 tripulantes embarcados en el instante de la corrida.
- Capitanes válidos detectados en las compañías **1** (Rolf Wittmer),
  **3** (Galamarex) y **4** (Johny Pesantes).
- **38 evaluaciones** se generarían (12 + 14 + 12 por barco).
- La compañía **2** (Galanautical) no genera evaluaciones automáticas porque,
  según los datos reales, su capitán titular (Carlos Sánchez) recién embarca
  el 21 de agosto — no hay capitán a bordo en el momento de la corrida. Esto
  es correcto según la regla de negocio, no un bug.

## Notas para trabajo futuro sobre este flujo

- Antes de tocar `generateWeeklyEvaluationCrew`, correr
  `npm run diagnose:weekly-eval` (no escribe nada) para ver el estado real:
  tripulantes embarcados, capitanes detectados por compañía, forms activos y
  cuántas evaluaciones se generarían, desglosado por compañía.
- El dedup de evaluaciones (`existingSet`) se arma solo con lo creado **hoy**
  (`createdAt` entre inicio y fin del día actual) y la clave
  `companyId_formId_evaluator_evaluated` usa **nombres completos como texto**,
  no IDs de `Staff`. Dos personas con el mismo nombre completo en la misma
  empresa/form colisionarían en el dedup. No es un problema hoy pero es una
  fragilidad a tener en cuenta si se toca esa lógica.
- El acoplamiento a `Utils.encode/decode` con `HASHIDS_SALT` para relacionar
  `Form.positions` con `Positions.id` es frágil: cualquier rotación de salt
  sin re-codificar los forms existentes rompe el matching **en silencio** (sin
  excepción, sin log de error — simplemente 0 evaluaciones). Si se retoca este
  flujo, vale la pena evaluar guardar `positions` como IDs numéricos planos en
  vez de strings codificados.
