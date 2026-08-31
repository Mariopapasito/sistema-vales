# Respaldos de la base de datos

Los respaldos se crean comprimidos, con permisos de archivo restringidos y una firma SHA-256 para detectar corrupción.

```bash
npm run backup --workspace=server
npm run backup:verify --workspace=server -- /ruta/al/respaldo.json.gz
```

Guarda el directorio `server/backups/` en almacenamiento persistente externo. En un servidor se recomienda programar el primer comando diariamente y verificar periódicamente una copia.

La restauración reemplaza los registros de las tablas existentes y por eso requiere dos confirmaciones explícitas:

```bash
ALLOW_DATABASE_RESTORE=YES npm run backup:restore --workspace=server -- /ruta/al/respaldo.json.gz --confirm
```

Haz la prueba de restauración primero contra una base de datos separada configurando las variables `DB_*` o `DATABASE_URL` para esa base.
