# Control manual de evaluaciones semanales por barco

## Objetivo

Permitir que `generateWeeklyEvaluationCrew` omita temporalmente la creación de evaluaciones para un barco y compañía específicos, sin detener el cron ni afectar a los demás barcos. Inicialmente se desactivará TipTop II (`yachtId: 1`, `companyId: 2`).

Esta fase no incluye endpoints, cambios de base de datos ni interfaz de usuario.

## Diseño aprobado

Se añadirá un módulo pequeño de configuración en código para administrar excepciones por la combinación exacta `yachtId + companyId`. Todo barco que no tenga una excepción explícita estará habilitado por defecto.

El módulo expondrá dos funciones:

- `setWeeklyEvaluationCrewEnabled({ yachtId, companyId, enabled })`: activa o desactiva manualmente la generación para la combinación indicada durante la ejecución del proceso.
- `isWeeklyEvaluationCrewEnabled({ yachtId, companyId })`: consulta el estado efectivo que debe usar el cron.

La configuración inicial contendrá TipTop II como desactivado. Así, el bloqueo se mantiene después de reiniciar el servicio. Para reactivarlo de forma permanente se cambiará esa configuración inicial; el setter también permitirá cambiar el estado en memoria y será el punto de integración para una futura API.

## Integración con el cron

La consulta de embarques incluirá el yate asociado a la compañía. Al recorrer cada embarque, el cron obtendrá `companyId` y `yachtId` y consultará `isWeeklyEvaluationCrewEnabled` antes de agregar al capitán o tripulante a las listas de evaluación.

Si la combinación está desactivada:

- no se crearán evaluaciones del capitán hacia la tripulación;
- no se crearán evaluaciones de la tripulación hacia el capitán;
- los demás barcos y compañías seguirán procesándose normalmente;
- no se modifican evaluaciones ya existentes;
- no se cambia el calendario del cron ni otros cron jobs;
- no se cambia en esta fase el comportamiento global del correo posterior al cron.

El filtro exige que coincidan ambos identificadores. Desactivar `{ yachtId: 1, companyId: 2 }` no bloqueará por separado a todos los registros del yate 1 ni a todos los de la compañía 2.

## Validación y manejo de errores

Las funciones rechazarán identificadores ausentes o no numéricos y exigirán que `enabled` sea booleano. Ante datos incompletos provenientes de una asociación de embarque, el cron conservará su manejo defensivo actual y no interpretará accidentalmente esa combinación como una excepción válida.

## Pruebas

Se agregarán pruebas unitarias para demostrar que:

1. TipTop II inicia desactivado.
2. Una combinación no configurada inicia habilitada.
3. El setter puede activar TipTop II.
4. El setter puede desactivar otro barco sin afectar TipTop II ni otras combinaciones.
5. La coincidencia requiere simultáneamente `yachtId` y `companyId`.
6. Los argumentos inválidos son rechazados.

La integración del cron se verificará confirmando que consulta el control antes de construir cualquiera de los dos sentidos de evaluación.

## Evolución futura

En una fase posterior, el mismo contrato funcional podrá conservarse reemplazando el almacenamiento en memoria por una tabla de configuración. Sobre ese servicio se podrán agregar:

- endpoints protegidos para listar barcos y consultar/cambiar su estado;
- registro de quién realizó el cambio, fecha y motivo;
- persistencia sin editar código ni reiniciar el servicio;
- una pantalla administrativa en el frontend con selector de barco y control de activación.

La futura migración no deberá cambiar la lógica principal del cron: solamente sustituirá la fuente consultada por `isWeeklyEvaluationCrewEnabled`.
