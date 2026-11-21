# Prueba del SecuGen Hamster Pro 20 — Windows 11

## Qué permite probar

Captura real con el lector, calidad y comparación 1:1 de dos lecturas. Disponible como paquete independiente y en la sesión de Estación → Reloj checador → Probar lector de huella.

**No genera checadas, no enrola empleados permanentemente ni modifica reportes de RH.** El resultado es de diagnóstico. La comprobación segura de identidad, el enrolamiento autorizado, dispositivos autenticados y el guardado de asistencias son una fase posterior; una coincidencia declarada por JavaScript no debe autorizar una checada real.

## Instalar en la computadora de Windows

1. Usa Windows 11 de 64 bits en Intel/AMD. No está validado en macOS M1 ni Windows ARM virtualizado.
2. Conecta el Hamster Pro 20. Instala el controlador oficial recomendado para WebAPI (WBF) desde https://secugen.com/drivers/ . Requiere permisos de administrador.
3. Desde https://webapi.secugen.com/ instala **Windows 64 bit WebAPI Client**. Acepta la licencia del fabricante solo después de revisarla y reinicia si el instalador lo solicita. Este software instala el servicio local SgiBioSrv y su configuración de certificados.
4. Instala **Node.js LTS para Windows x64** desde https://nodejs.org/ si no lo tienes. Solo se usa para servir la pantalla local; no necesitas npm install, MySQL, Git ni contraseñas del sistema.
5. Copia `secugen-windows.zip` a Windows, clic derecho → **Extraer todo**. No abras archivos dentro del ZIP ni ejecutes `web/index.html` directamente.
6. Abre `INICIAR-PRUEBA.cmd`. Deja la terminal abierta. Se abrirá el navegador; si no ocurre, abre Edge o Chrome en **http://localhost:8765**.
7. Si Windows o el navegador bloquean la ejecución, verifica el origen del paquete y consulta a Sistemas; no desactives Defender ni las protecciones del navegador. No se requiere una excepción entrante de firewall: el servidor solo escucha en 127.0.0.1.

No copies el repositorio ni archivos `.env` a la estación para esta prueba. El ZIP no contiene el sistema completo, credenciales ni información de empleados. No se contacta a Railway.

## Prueba guiada

1. Mantén la pestaña visible y confirma el consentimiento para la prueba. La pantalla no presenta imágenes ni permite exportar plantillas biométricas.
2. Puerto **8443** para la versión actual. Si el cliente instalado usa el puerto antiguo, elige **8000**. Solo se permite HTTPS hacia localhost.
3. Pulsa **Capturar referencia**, coloca un dedo y espera la confirmación de calidad. Se rechazan capturas con calidad inferior a 50/100. NFIQ va de 1 (mejor) a 5 (peor).
4. Retira el dedo. Pulsa **Capturar segunda lectura**, vuelve a colocar el mismo dedo y después pulsa **Comparar huellas**. Debe mostrar una coincidencia.
5. Repite solo la segunda lectura con otro dedo: debe mostrar que no coincide. El umbral 100/199 sigue el ejemplo del fabricante y sirve únicamente para diagnóstico; no constituye una calibración productiva ni una garantía de identidad.
6. Desconecta el lector e intenta capturar. Debe aparecer un error, nunca una confirmación de asistencia. Reconéctalo y repite.
7. Pulsa **Borrar capturas** al terminar. También se descartan las referencias de esta página al ocultar/cerrar/recargar la pestaña y después de 5 minutos sin nuevas capturas. La aplicación no usa localStorage, IndexedDB, caché ni archivos para guardar huellas. SecuGen procesa las lecturas en su propio servicio local.

Captura y comparación no prueban detección de dedos falsos: `FakeDetection=0` en este diagnóstico. No usarlo para control de acceso o nómina.

## Si no conecta

- Prueba el demo oficial: https://webapi.secugen.com/ . Usa solo tu huella de prueba y ten presente que es una web del proveedor. Regresa y captura de nuevo: salir de nuestra pestaña borra sus lecturas.
- **55 / 56:** lector o controlador no disponible; revisa Administrador de dispositivos, USB y driver WBF.
- **54:** tiempo agotado; coloca el dedo completo y repite.
- **59:** lector ocupado; cierra demos, aplicaciones de captura y otras pestañas que lo utilicen. Cancelar en la página no necesariamente detiene inmediatamente la captura del servicio; espera hasta 10 segundos antes de repetir.
- **Error de conexión:** comprueba SgiBioSrv, puerto y el permiso del navegador para conexión a la red local. Un error de certificado se resuelve reparando la instalación oficial; no omitas la validación TLS ni ejecutes el navegador con seguridad deshabilitada.
- **10001–10004:** licencia, dominio, periodo expirado u origen ausente. Consulta a SecuGen; no cambies relojes ni reinstales para evadir licencias.
- **Puerto 8765 ocupado:** cierra la otra ventana de prueba o consulta a Sistemas. El lanzador no termina procesos ajenos.

## Licencia y alcance

SecuGen publica un periodo de prueba de WebAPI de **60 días** y licencia por dominio/subdominio. Si ya venció o tu origen no está habilitado, solicita una licencia de evaluación para `localhost` y, posteriormente, para el dominio real. El equipo no incorpora una licencia ajena ni instaladores del proveedor. No se ha adquirido ni aceptado ninguna licencia automáticamente.

Fuentes: https://secugen.com/products/webapi/ , https://webapi.secugen.com/Demo3.aspx , https://webapi.secugen.com/docs/SECUGEN_WEB_SERVICE_API_DOC.pdf . Consultadas el 20 de noviembre de 2026. El demo actual usa 8443; el manual anterior documenta 8000.

## Para Sistemas

Generar con `npm run build:reader --workspace=client`. Salida: `.local-data/secugen-windows`. Comprimir esa carpeta completa como ZIP. Verificar con `npm run test:reader --workspace=client` y `npm run test --workspace=client`.

Solo el controlador y WebAPI requieren instalación administrativa. El lanzador Node no requiere elevar privilegios. La aplicación de prueba está compilada, no instala dependencias y sirve únicamente archivos estáticos locales, con política de contenido que limita conexiones a los dos puertos de SecuGen. `SHA256SUMS.txt` permite comprobar la integridad de los archivos del paquete.

Las pruebas automáticas usan respuestas simuladas. La captura física, los certificados y permisos de Windows, la licencia para localhost y el comportamiento del servicio deben comprobarse en la computadora de Windows con el lector conectado. No afirmar que el hardware pasó pruebas hasta completar este procedimiento.

Verificación del paquete: 15 pruebas del adaptador aprobadas; compilación Vite y comprobación TypeScript de la pantalla independiente aprobadas. Prueba Chromium con respuestas simuladas: consentimiento, captura, comparación positiva/negativa, error de lector, calidad, puertos 8443/8000, limpieza, caducidad en memoria y diseño móvil. Se comprobó que la pantalla no enviara solicitudes a la API del sistema ni escribiera en localStorage/sessionStorage, y que el servidor estático rechazara rutas ajenas y escrituras. La comprobación completa del cliente se interrumpió por dependencias pendientes de descargar desde iCloud; no se considera validada toda la aplicación ni la ejecución física en Windows.
