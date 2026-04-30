PAQUETE CLIENTE DB - MINIMARKET

Objetivo:
- Ejecutar backend local en cada caja (localhost:3002)
- Conectar ese backend a la base de datos central 192.168.1.91

Archivos incluidos:
- iniciar_servicios_ocultos.bat
- detener_servicios_ocultos.bat
- server/server.js
- server/config.js
- server/db.js
- server/local_print_bridge.js
- server/package.json
- server/package-lock.json
- server/.env.example

Instalacion en cada cliente:
1) Copiar estos archivos respetando estructura dentro de la carpeta del sistema en el cliente.
2) Crear server/.env copiando server/.env.example.
3) Editar server/.env y poner credenciales reales en DB_USER y DB_PASSWORD.
4) Si falta node_modules en el cliente, abrir terminal en carpeta server y ejecutar:
   npm install
5) Ejecutar iniciar_servicios_ocultos.bat como Administrador.
6) Abrir en navegador del cliente:
   http://localhost/minimarket/

Prueba rapida:
- En el cliente, abrir: http://localhost:3002/api/getInfo
- Debe responder JSON.

Si falla conexion BD:
- Revisar que 192.168.1.91 responda en red local.
- Revisar puerto 3306 abierto en firewall del servidor BD.
- Revisar permisos del usuario MySQL para conexiones desde la red 192.168.1.x.
