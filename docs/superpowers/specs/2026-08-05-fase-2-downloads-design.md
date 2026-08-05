# Fase 2 — Dominio Downloads — diseño

**Fecha:** 2026-08-05  
**Estado:** Implementado

## Contexto y alcance

El dominio expone siete rutas protegidas bajo `/api/downloads`: seis sirven
archivos existentes en disco y una genera un reporte Excel de consumer cards.
Se conservaron todos los métodos y paths públicos, incluido el typo histórico
`/cruise/:cruise_id/download/pfd`, requerido por compatibilidad con el front.

El objetivo fue adoptar `AppError`/`next(error)`, clasificar correctamente 400,
404 y 500, reparar la descarga de solicitudes de staff, consolidar la lógica
de filesystem y cubrir el dominio con tests reales de DB y disco.

## Diseño

Los seis handlers de archivos persistidos comparten un helper local
`sendFileDownload` en `downloads.controller.js`. El helper permanece local
porque coordina Express (`res`), filesystem y MIME; no es una utilidad pura
para `src/utils/`.

El flujo es:

1. Decodificar y validar inmediatamente el hashid con `decodeId`.
2. Consultar el recurso y devolver 404 si no existe.
3. Validar que tenga una ruta asociada.
4. Normalizar separadores históricos de Windows.
5. Resolver una ruta absoluta y exigir containment estricto bajo `uploads/`.
6. Confirmar que el archivo exista antes de iniciar la respuesta.
7. Elegir MIME con fallback seguro y conservar la extensión real.
8. Descargar con un nombre público sanitizado, sin ID numérico interno.

`exportConsumerCardReport` conserva su generación de archivo temporal y su
limpieza posterior, pero ahora valida `yachtId`, devuelve 404 para un yate
inexistente y delega errores inesperados al middleware central.

## Bugs corregidos

- **Solicitud de staff rota al 100%:** el commit `46a9680` eliminó
  `FormatService.getRequestById` aunque `downloadSolicitud` seguía llamándolo.
  Se restauró el método y se agregó una regresión de dominio.
- **Path traversal desde datos de DB:** las rutas se confiaban y `path.join`
  colapsaba `..`, permitiendo salir de `uploads/`. Ahora se exige containment.
- **MIME desconocido:** `mime.lookup` devuelve `false`; el flujo anterior podía
  enviar `Content-Type: false` y generar nombres terminados en `.false`. Ahora
  usa `application/octet-stream` y `path.extname`.
- **Archivos ausentes:** formato médico y solicitud no comprobaban existencia
  antes de `res.download`. El guard aplica ahora a los seis endpoints.
- **Errores mal clasificados:** excepciones inesperadas se aplastaban a 400 y
  recursos inexistentes podían terminar en `TypeError`. Ahora los casos
  identificables usan `AppError` y el resto llega como 500 centralizado.
- **Respuesta ya iniciada:** `errorHandler` ahora delega si
  `res.headersSent`; los callbacks de descarga no intentan escribir JSON tras
  iniciar el stream.
- **Fuga de IDs internos:** los filenames se derivan del nombre, counter o code
  público del recurso.

## Contrato HTTP

La respuesta exitosa continúa siendo binaria. Los errores usan:

```json
{ "error": { "message": "mensaje", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Status |
|---|---:|
| Token ausente o inválido | 403 |
| Hashid inválido | 400 |
| Recurso inexistente | 404 |
| Recurso sin archivo asociado | 404 |
| Ruta fuera de `uploads/` | 404 |
| Archivo ausente en disco | 404 |
| Error inesperado antes de headers | 500 |
| Error de stream tras headers | conexión cerrada/delegada |

## Cambios conscientes de contrato

- La forma de las respuestas de error se unifica al estándar central.
- Cuatro filenames dejan de incluir IDs numéricos o basenames internos y usan
  el nombre público del recurso.
- Los reportes de crucero sin archivo asociado pasan a 404, consistente con
  los otros downloads.
- No se corrige `pfd`; cambiarlo rompería el contrato público.

## Seguridad preservada

`/api/downloads` sigue protegido por `authJwt.verifyToken`, sin agregar ni
retirar roles. El containment bajo `uploads/` es endurecimiento de filesystem,
no un cambio de política de autorización.

## Verificación

`tests/domain/downloads/downloads.test.js` contiene 40 pruebas con Sequelize y
archivos reales bajo `uploads/__test_downloads__/`, eliminados en `afterAll`.
Cubre los seis downloads persistidos, el reporte Excel generado, hashids
inválidos, recursos/archivos ausentes, MIME desconocido, filenames sin ID,
traversal, separadores Windows, sanitización de nombres y JWT ausente. La suite
pasó tres veces en aislamiento; el happy path del Excel también comprueba la
firma ZIP `PK` y la eliminación del temporal.

## Hallazgos fuera de alcance

- `FormatService.createRequesForStaff` guarda rutas no portables con
  backslashes en Windows; el lector las compensa, pero el fix real exige
  normalizar al escribir y migrar datos (`formats`).
- `RequestStaffs` no se registra en `src/models/init.models.js`, por lo que no
  tiene asociaciones/FKs inicializadas (`formats`/modelado).
- `ShippingGuideService.createItemsOfShippingGuide` es invocado por
  `shippingGuide.controller.js` pero no existe en el service
  (`shippingGuide`).
- `consumerCard.controller.js` importa `cos` desde `mathjs` sin usarlo (`bar`).
- La ruta genérica `GET /:rule_id/download` aparece primero en el router; hoy no
  colisiona, pero una futura ruta de dos segmentos podría quedar capturada.
