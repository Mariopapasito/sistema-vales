# Asistencia: integración local y prueba de lector

## Prueba del Hamster Pro 20 — 20 de noviembre de 2026

Se agregó captura y comparación temporal de huellas mediante SecuGen WebAPI en Windows. Ver [instalación y pruebas](SECUGEN-WINDOWS.md). La estación abre **Reloj checador → Probar lector de huella**. También existe un paquete portátil independiente, sin base de datos, generado con `npm run build:reader --workspace=client`.

La prueba del hardware no habilita asistencias biométricas, enrolamiento persistente ni identificación 1:N. Las plantillas solo se mantienen temporalmente en memoria; no se envían al servidor. No sustituye la integración segura descrita más abajo. El simulador de turnos y los reportes manuales siguen separados.

## Estado y límites

Incluido: rol `rh`, catálogo separado de empleados y estaciones, vínculos explícitos entre cuentas de estación y estaciones, programación semanal, envío/aprobación RH, publicación directa de RH, bandeja de pendientes, solicitudes de cambio, control de versiones, auditoría transaccional, capturas manuales RH, correcciones sin sobrescribir originales, reporte semanal por estación/empleado, PDF con texto y CSV compatible con Excel, pantalla de reloj y simulador sin persistencia, envío privado de documentos PDF de estación a RH.

**No es todavía un checador biométrico de producción.** Hay adquisición y comparación temporal de diagnóstico, pero no enrolamiento persistente, credenciales de dispositivos, servicio Windows propio, almacenamiento de checadas sin conexión, sincronización, bloqueo del sistema operativo ni cierre definitivo de nómina/semanas. No existe un endpoint que acepte una supuesta huella desde JavaScript. El reloj distingue prueba del lector de simulación de turnos; toda simulación devuelve `saved: false`. Las capturas persistidas son exclusivamente `manual_rh`, con motivo. Todos los reportes son provisionales.

No se habilita una checada real porque el usuario seleccione un empleado. Cambiar después el adaptador visual no sustituye validar y construir la integración segura del hardware.

## Preparación local

1. Respaldar la base de datos antes de cualquier despliegue. No apuntar pruebas a producción.
2. Ejecutar `npm run test --workspace=server` y `npm run test --workspace=client`.
3. Configurar el modo local descrito debajo. Su inicialización crea tablas faltantes sin `force`/`alter`; se añade la migración `008_attendance_rh_role`, que amplía el ENUM de usuarios conservando roles anteriores.
4. Entrar como Sistemas o Jefe, ir a Usuarios y crear una cuenta **Recursos Humanos (RH)**. No se crean contraseñas predeterminadas ni usuarios automáticamente.
5. Entrar como RH. En **Asistencia RH → Estaciones y acceso**, crear las estaciones y vincular sus cuentas existentes. El vínculo usa el ID de cuenta, no el campo editable `users.estacion`.
6. Cada estación registra a su propio personal desde **Asistencia → Empleados**, con número de empleado, nombre y foto JPG/PNG/WebP de hasta 1 MB. RH también puede registrar empleados. No son usuarios de inicio de sesión. El número de empleado es único en toda la empresa; RH coordina la numeración. Las correcciones y bajas quedan exclusivamente en RH. En esta etapa no hay traslados de personal; no crear duplicados para simularlos.
7. Preparar una semana futura (lunes a domingo). Cada empleado activo requiere una fila de turno o descanso por día. La interfaz inicia en descanso; revisar antes de guardar.
8. Estación: guardar borrador y enviar a RH. RH: revisar en **Pendientes RH → Revisar programación**, escribir el motivo y aprobar/devolver. Si RH crea el horario usa **Guardar y publicar**, sin enviarlo a otra cuenta; al editar usa **Guardar cambios de RH**, con motivo auditable. Las semanas nuevas deben publicarse **antes del lunes 00:00, America/Mexico_City**; no hay publicación inicial retroactiva.
9. Abrir **Reloj checador → Probar interfaz sin guardar checadas**, elegir una semana guardada, empleado, día y hora. Sirve también con un borrador. No genera registros ni reportes de prueba mezclados con datos reales.
10. En **Asistencia RH → Reportes semanales**, seleccionar estación y semana (al entrar se muestra la actual). RH puede registrar omisiones pasadas justificadas de semanas aprobadas y descargar PDF/CSV. Fechas futuras se rechazan. El CSV se abre en Excel; no es un archivo XLSX. Jefe consulta y exporta estos reportes, sin corregirlos.
11. En **Documentos RH**, estación selecciona tipo y opcionalmente empleado, arrastra PDF o usa **Buscar archivos en mi computadora**, y confirma **Enviar documentos a RH**. RH filtra por estación, tipo y fecha para descargarlos. Esta pestaña es independiente de la semana de turnos.

### Arranque aislado de producción

Se requiere MySQL local funcionando y una base exclusiva `sistema_vales_local` (o un nombre terminado en `_local`/`_test`), con usuario propio. No reutilizar la conexión de Railway. La base debe existir antes de migrar; estos comandos no instalan MySQL ni crean el usuario del motor.

1. Crear `server/.env.local` usando `server/.env.local.example`, con las credenciales del motor local y secretos JWT exclusivos de prueba. Conservar `PORT=3001` para el arranque conjunto.
2. Ejecutar `npm run db:migrate:local --workspace=server`.
3. Opcional: `npm run seed:attendance:local --workspace=server`. Crea cuentas DEMO de RH, Jefe, Sistemas y ocho estaciones con un empleado ficticio cada una. No crea checadas ni modifica cuentas existentes. Las contraseñas aleatorias se guardan en `server/local-credentials.json`, excluido de Git; no hay contraseña universal.
4. Ejecutar `npm run dev:local` desde la raíz. El frontend usa exclusivamente `http://localhost:3001/api`; el backend carga `.env.local`, ignora URLs heredadas de Railway y rechaza hosts remotos o nombres de base no marcados como locales. Ambos escuchan solo en loopback.
5. Abrir la dirección que indique Vite e iniciar sesión con una cuenta DEMO. No usar `npm run dev` para estas pruebas: ese comando conserva la configuración habitual.

El modo especial del frontend solo se aplica al servir desarrollo, nunca a la compilación de producción. Ni `.env.local` ni `local-credentials.json` se deben subir a GitHub. El sembrado DEMO solo puede ejecutarse con las restricciones locales anteriores.

## Reglas actuales

- Las estaciones dan de alta empleados únicamente en su estación vinculada; no crean cuentas de acceso ni asignan roles. RH puede dar de alta, corregir e inactivar empleados, administrar estaciones y vínculos y corregir asistencia. Sistemas/Jefe pueden crear la cuenta RH desde Usuarios.
- Jefe consulta empleados, programación, solicitudes, historial, vínculos y reportes de **todas** las estaciones y descarga PDF/CSV, sin modificar asistencia. Los formularios de escritura se ocultan y el servidor bloquea las mutaciones persistentes. La pantalla y el botón del reloj son exclusivos de Estación; la API de vista previa no persistente sigue permitida para Jefe. Sistemas y Compras no reciben acceso a asistencia.
- Estación consulta y da de alta a su personal, prepara borradores futuros, envía y solicita cambios. No exporta ni captura/corrige asistencia. El alta se audita con la cuenta que la realizó y no modifica semanas ya aprobadas.
- RH tiene acceso únicamente a asistencia y a su perfil, sin heredar APIs antiguas que daban acceso a cualquier usuario autenticado.
- Publicación, edición y resolución usan versiones y transacciones. Las aprobaciones de semanas adyacentes se serializan por estación para comprobar superposiciones nocturnas.
- Una solicitud de estación no modifica el horario aprobado. RH debe resolverla con motivo. RH ya no crea solicitudes: publica o ajusta directamente, con versiones e historial. Puede resolver las antiguas solicitudes creadas por su propia cuenta. Las solicitudes basadas en una versión antigua no pueden aprobarse sobre cambios nuevos; deben rechazarse y volver a solicitarse.
- El catálogo actual no vincula un empleado a una cuenta de encargado/RH. Por tanto, aún no verifica que una persona esté aprobando su propio turno. Esa vinculación y la identificación individual de encargados deben definirse antes de producción. El historial identifica la **cuenta**, no necesariamente a la persona si comparten credenciales.
- Tolerancia fija de 15 minutos: 15:00 está dentro; 15:01 está fuera. Se muestran minutos desde inicio y exceso sobre tolerancia, redondeados hacia arriba. No hay descuentos automáticos.
- Un turno por empleado/día, máximo 16 horas; salida menor o igual que entrada se interpreta como día siguiente (24 horas se rechaza). No se permiten superposiciones, incluso entre semanas aprobadas. Turnos partidos no están implementados.
- Las plantillas históricas aprobadas mantienen su conjunto de empleados aunque se inactive a alguien después. Altas o traslados efectivos dentro de una semana aprobada requieren una evolución del modelo antes de producción.
- El huso inicial es `America/Mexico_City`, no seleccionable. No usar en otra zona sin añadir conversión y pruebas específicas.
- Una checada manual solo pertenece a un turno aprobado, no puede ser futura y debe estar dentro de seis horas antes/después del turno. Salida siempre posterior a entrada. Se admite una entrada y una salida por jornada. Para reemplazar una marca anulada se añade otra corrección al original, no se inserta otra checada.
- Originales y correcciones se almacenan por separado; no hay API de borrar checadas. La auditoría no almacena fotos ni huellas.
- Los faltantes se muestran como **Sin checadas: revisar**, no como falta definitiva. Tiempo entre entrada/salida no equivale a horas extra autorizadas. Descanso con registros requiere revisión.
- No hay simulaciones persistidas, cola de navegador ni funcionamiento offline prometido. Un error de conexión no se muestra como guardado.
- El simulador permite volver libremente a programación porque es una herramienta de preparación, no un quiosco cerrado para empleados.

## Documentos privados de personal

- Tipos: expediente, oficio, nómina firmada y acta administrativa. Cada archivo conserva estación, empleado opcional, cuenta que lo subió, fecha, tamaño y SHA-256.
- Solo estación sube, exclusivamente a su estación vinculada. Solo RH descarga. Jefe consulta metadatos sin descargar estos PDF; esto no limita su descarga de reportes semanales de asistencia.
- Se aceptan PDF de hasta 10 MB, hasta 10 archivos en la cola visual, enviados individualmente. Se validan extensión, tamaño y marcadores PDF en servidor. Esta validación **no es un antivirus ni garantiza la ausencia de contenido activo**; no se previsualizan automáticamente.
- Los bytes se almacenan en `attendance_documents` (BLOB), no en `public/`, rutas estáticas ni enlaces públicos. El listado nunca devuelve los bytes; la descarga requiere autenticación RH, comprueba integridad, usa `attachment` y `no-store`, y se audita.
- La descarga bloqueada para estación aplica al sistema; no impide que quien seleccionó el archivo conserve su original en la computadora.
- No hay eliminación, reemplazo ni retención automática en esta etapa. Los respaldos posteriores deben incluir esta tabla, y la capacidad de almacenamiento debe vigilarse al incorporar expedientes.

## Contrato previsto para el lector (a implementar y validar con hardware)

Flujo previsto: lector USB → servicio Windows/SDK → verificación de identidad → API autenticada de dispositivos → registro transaccional → confirmación del servidor → pantalla.

- Servicio emparejado por RH/Sistemas con una estación; credencial por instalación revocable y cifrada, nunca una clave de producción en el frontend.
- Identificación 1:N local para admitir operación sin internet. Confirmar licencias, distribución, controladores firmados, calidad de lectura y capacidad real en Windows 11.
- Payload previsto: `eventId` UUID, `deviceId`, secuencia, `employeeId` verificado, movimiento explícito `entry|exit`, instante de captura UTC, versión del servicio y contexto de sincronización. La estación se obtiene de la credencial, nunca se confía en un `stationId` enviado por el navegador.
- Solo aceptar eventos de dispositivos provisionados. Validar empleado activo, estación, orden/duplicación y turno; eventos ambiguos a revisión, nunca alternar entrada/salida a ciegas.
- Cola cifrada local y durable, persistencia antes de confirmar captura, reintentos con el mismo `eventId`, unicidad servidor, confirmación de recepción antes de retirar de cola. Conservar instante original y hora de recepción.
- La tolerancia y programación vigente se resuelven con versiones aprobadas; cambios retroactivos conservan evidencia. Reloj desfasado, secuencia inesperada o revisión obsoleta producen incidencia.
- Monitorear última conexión, cola pendiente, lector desconectado, reinicios y desfase. No cerrar semanas con sincronizaciones pendientes.
- Para producción: autorización individual de encargado, no autoaprobación de su propio horario, procedimiento ante huella ilegible, privacidad/retención, bajas y revocación offline, cierres semanales auditados, restauración de respaldos y política ante fallas de energía.
- Prueba de piloto con el Hamster Pro 20 antes de extenderlo a las ocho estaciones. La interfaz y las pruebas simuladas no certifican el funcionamiento físico del lector en Windows 11.

## Pruebas

`server/src/tests/attendance.test.ts`: fechas, huso, tolerancia, nocturnos, cobertura, superposiciones, bloqueo temporal, versiones, alcance de estación y CSV seguro.

`server/src/tests/attendanceRoutes.test.ts`: flujo de rutas con autenticación real y persistencia doble en memoria (sin conectar a MySQL), aislamiento entre estaciones, RH, Jefe de solo lectura (incluido rechazo de mutaciones), simulación, solicitudes, idempotencia, cronología, correcciones y reportes. No sustituye pruebas de migración/constraints/concurrencia en MySQL ni una prueba de navegador y lector real.

`server/src/tests/localEnvironment.test.ts`: rechazo de destinos remotos, nombres de base no locales y puertos inválidos.

`server/src/tests/attendanceModels.test.ts`: cada atributo debe corresponder a su propia columna e índice. Las definiciones se copian por atributo: Sequelize las modifica internamente y reutilizarlas produce columnas incorrectas que las pruebas con persistencia simulada no detectan.

`server/src/tests/attendanceDocuments.test.ts`: subida multipart, rechazo por tamaño/formato, aislamiento entre estaciones, filtros, listas sin contenido binario, descarga exclusiva de RH e integridad. Las pruebas usan persistencia simulada y no guardan documentos reales.

Validar en una base MySQL de prueba antes del despliegue: inicialización nueva, migración desde esquema anterior, dos aprobaciones simultáneas, dos capturas iguales, reinicio después de guardar y consulta desde otra sesión. No se ejecuta `sync({ force: true })` ni se borran tablas existentes.

Verificación realizada durante la integración: compilación TypeScript/Vite y suite de servidor; prueba Chromium con API simulada de guardado, envío, aprobación/bloqueo, permisos visibles RH/estación, simulador sin persistencia, descarga PDF y vistas móviles sin desbordamiento horizontal. Se inspeccionó la vista previa del PDF. Estas pruebas no usaron la base de datos real ni dispositivos biométricos.

Verificación adicional del 4 de octubre de 2026, autorizada sobre MySQL de Railway: respaldo consistente con esquema/datos y SHA-256 en `server/backups` (excluido de Git), preparación de las ocho tablas de asistencia y ampliación del rol `rh`. Una prueba real dentro de una transacción verificó usuarios RH, empleados, planes JSON, estado/versiones, unicidad de checadas, correcciones que conservan el original y auditoría; después se revirtió y se comprobó que no quedaran filas de prueba. Esto no sustituye una prueba completa de todos los flujos del sistema ni del futuro lector.

Para probar el código local con Railway, usar el arranque habitual `npm run dev`, no `dev:local` (que deliberadamente bloquea bases remotas). La aplicación local comparte los datos de Railway: cualquier alta real o corrección que se confirme en pantalla queda en esa base aunque el código no se publique en GitHub. No ejecutar el sembrado DEMO contra Railway. Crear la cuenta real de RH desde **Usuarios → Nuevo usuario → Recursos Humanos (RH)**, iniciar sesión como RH y vincular las cuentas de estación antes de registrar personal.

Actualización del 5 de octubre de 2026: la cuenta RH revisada conservaba correctamente su rol; la confusión provenía del flujo compartido de borradores/solicitudes. Se separó publicación directa de RH, se agregó Pendientes RH y se muestra el rol confirmado por el servidor. Se creó únicamente `attendance_documents` y se comprobó la recuperación íntegra de un PDF en una transacción revertida; no se alteraron roles ni semanas guardadas. Pasaron 35 pruebas de servidor y una prueba Chromium con API simulada de publicación/ajuste RH, aprobación de pendientes, reportes, selector/arrastre de PDF, aislamiento visual de descarga, filtros y vista móvil. No se publicaron cambios en GitHub.
