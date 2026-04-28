-- Script para eliminar toda la información relacionada con ventas y productos
-- Ejecutar en orden para evitar errores de foreign key

-- Eliminar detalles de venta primero
DELETE FROM detalle_venta;

-- Eliminar ventas
DELETE FROM ventas;

-- Eliminar productos
DELETE FROM productos;

-- Eliminar cortes de caja (relacionados con ventas)
DELETE FROM corte_caja;