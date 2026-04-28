Archivos movidos desde `server/` para mantener la carpeta limpia.

Estos archivos **no son necesarios para iniciar** el backend normal (`server.js`) ni el print bridge (`local_print_bridge.js`).

Contenido:
- `sql/`: scripts SQL de importacion/ajuste y respaldos.
- `routes/`: rutas legacy que no estaban conectadas al arranque actual.
- `convertCsvToSql.js`: utilidad offline para generar SQL de importacion.

Si necesitas restaurar algo, solo mueve el archivo de vuelta a `server/`.
