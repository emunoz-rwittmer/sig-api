# Control manual de evaluaciones semanales por compañía

## Objetivo

Permitir que `generateWeeklyEvaluationCrew` omita temporalmente la creación de evaluaciones para una compañía específica, sin detener el cron ni afectar a las demás. Inicialmente se desactivará TipTop II mediante su `companyId: 2`.

Esta fase no incluye endpoints, cambios de base de datos ni interfaz de usuario.

## Diseño aprobado

Se añadirá un módulo pequeño de configuración en código para administrar excepciones por `companyId`. Toda compañía que no tenga una excepción explícita estará habilitada por defecto.

El módulo expondrá dos funciones:

- `setWeeklyEvaluationCrewEnabled({ companyId, enabled })`: activa o desactiva manualmente la generación para la compañía indicada durante la ejecución del proceso.
- `isWeeklyEvaluationCrewEnabled({ companyId })`: consulta el estado efectivo que debe usar el cron.

La configuración inicial contendrá TipTop II como desactivado. Así, el bloqueo se mantiene después de reiniciar el servicio. Para reactivarlo de forma permanente se cambiará esa configuración inicial; el setter también permitirá cambiar el estado en memoria y será el punto de integración para una futura API.

## Integración con el cron

Al recorrer cada embarque, el cron obtendrá el `companyId` ya disponible en `StaffCompany` y consultará `isWeeklyEvaluationCrewEnabled` antes de agregar al capitán o tripulante a las listas de evaluación. No será necesario consultar ni incluir el modelo `Yacht`.

Si la compañía está desactivada:

- no se crearán evaluaciones del capitán hacia la tripulación;
- no se crearán evaluaciones de la tripulación hacia el capitán;
- los demás barcos y compañías seguirán procesándose normalmente;
- no se modifican evaluaciones ya existentes;
- no se cambia el calendario del cron ni otros cron jobs;
- no se cambia en esta fase el comportamiento global del correo posterior al cron.

La desactivación afecta únicamente a la compañía configurada. Para TipTop II se utilizará `{ companyId: 2 }`.

## Validación y manejo de errores

Las funciones rechazarán un `companyId` ausente o no numérico y exigirán que `enabled` sea booleano. Ante datos incompletos provenientes de una asociación de embarque, el cron conservará su manejo defensivo actual y no interpretará accidentalmente el registro como una excepción válida.

## Pruebas

Se agregarán pruebas unitarias para demostrar que:

1. TipTop II inicia desactivado.
2. Una compañía no configurada inicia habilitada.
3. El setter puede activar TipTop II.
4. El setter puede desactivar otra compañía sin afectar a las demás.
5. Los argumentos inválidos son rechazados.

La integración del cron se verificará confirmando que consulta el control antes de construir cualquiera de los dos sentidos de evaluación.

## Evolución futura

En una fase posterior, el mismo contrato funcional podrá conservarse reemplazando el almacenamiento en memoria por una tabla de configuración. Sobre ese servicio se podrán agregar:

- endpoints protegidos para listar barcos con su compañía y consultar/cambiar el estado mediante `companyId`;
- registro de quién realizó el cambio, fecha y motivo;
- persistencia sin editar código ni reiniciar el servicio;
- una pantalla administrativa en el frontend con selector de barco y control de activación.

La futura migración no deberá cambiar la lógica principal del cron: solamente sustituirá la fuente consultada por `isWeeklyEvaluationCrewEnabled`.
