# Centralizacion de Minimarket en Debian

Fecha: 2026-10-02

## Objetivo

Ejecutar una sola instancia de Minimarket en `debian-servidor-SIA`
(`100.80.110.10`) para que los cuatro equipos del local funcionen como
clientes. El servidor Windows actual se conserva sin cambios durante la
transicion.

## Arquitectura

- Nginx recibe las solicitudes por la interfaz privada de Tailscale.
- PHP-FPM sirve las paginas PHP.
- El backend Node.js escucha solo en `127.0.0.1:3002` y Nginx publica la API
  bajo el mismo origen que la pagina.
- MariaDB se ejecuta en el mismo servidor Debian y no se expone publicamente.
- Cada caja usa el navegador y mantiene localmente solo el puente de impresion
  en `127.0.0.1:7357`.
- Los procesos de Nginx, PHP, Node y MariaDB se administran como servicios con
  reinicio automatico.

## Acceso y seguridad

- El piloto se accede exclusivamente mediante Tailscale.
- MariaDB no se abre a Internet ni se conecta directamente desde los cuatro
  PC una vez centralizada la aplicacion.
- Las credenciales se guardan en archivos `.env` fuera de Git.
- El subdominio privado y HTTPS se incorporan despues de validar el piloto;
  el certificado se obtendra sin publicar MariaDB ni el backend Node.

## Migracion de datos

1. Crear en Debian una base piloto a partir de un volcado del servidor Windows.
2. Validar desde Caja 2 ventas, inventario, anulaciones, cortes, correo e
   impresion.
3. No mezclar ventas reales entre la base antigua y la piloto.
4. Para el cambio definitivo, detener escrituras, generar un volcado final,
   importarlo y apuntar los cuatro equipos a la instancia central.
5. Conservar el servidor Windows como retorno hasta completar la validacion.

## Retorno

Antes de abrir el local, todos los equipos deben apuntar a una sola base. Si
la validacion central falla antes de registrar ventas reales, se vuelve al
servidor Windows sin transformar sus datos. Si la base nueva recibe ventas
reales, cualquier retorno exige copiar primero esos cambios al servidor
Windows para evitar perdida de informacion.

## Respaldos y operacion

- Respaldo nocturno completo de MariaDB.
- Retencion inicial: siete diarios, cuatro semanales y seis mensuales.
- Registro y correo de exito o error para despliegues y respaldos.
- Comprobacion de salud de Nginx, PHP, Node y MariaDB despues de cada cambio.

## Criterios de aceptacion

- Caja 2 inicia sesion y opera desde la URL privada central.
- Ventas, inventario, anulaciones y cortes afectan una unica base.
- Los correos se envian desde el backend central.
- La impresora local funciona mediante el puente de Caja 2.
- Un reinicio del servidor recupera automaticamente todos los servicios.
- La base Windows permanece disponible como retorno durante la transicion.
