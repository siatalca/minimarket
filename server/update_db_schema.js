// Ejecuta solo la actualizacion de estructura (tablas/columnas/indices faltantes)
// sin iniciar el servidor HTTP.
process.env.DB_SCHEMA_SYNC_ONLY = '1';
process.env.DB_SCHEMA_CREATE_ONLY = '1';
require('./server');
