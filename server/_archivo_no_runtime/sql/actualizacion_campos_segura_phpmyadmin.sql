-- ==========================================================
-- ACTUALIZACION SEGURA DE CAMPOS (IDEMPOTENTE)
-- Proyecto: Minimarket
-- Uso: Importar este archivo en phpMyAdmin dentro de la BD.
-- Objetivo:
--   - Agregar columnas faltantes
--   - Agregar indices faltantes
--   - Ajustar tipo de columna puntual (sin tocar datos)
-- NO hace:
--   - DELETE / TRUNCATE
--   - DROP COLUMN
--   - UPDATE de datos de negocio
-- ==========================================================

-- Opcional: descomenta si quieres fijar base de datos manualmente.
-- USE minimarket;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_add_column_if_missing $$
CREATE PROCEDURE sp_add_column_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_def TEXT
)
BEGIN
    DECLARE v_table_exists INT DEFAULT 0;
    DECLARE v_column_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO v_table_exists
      FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table_name;

    IF v_table_exists = 1 THEN
        SELECT COUNT(*)
          INTO v_column_exists
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND COLUMN_NAME = p_column_name;

        IF v_column_exists = 0 THEN
            SET @sql_stmt = CONCAT(
                'ALTER TABLE `', p_table_name,
                '` ADD COLUMN `', p_column_name, '` ',
                p_column_def
            );
            PREPARE stmt FROM @sql_stmt;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS sp_add_index_if_missing $$
CREATE PROCEDURE sp_add_index_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_clause TEXT
)
BEGIN
    DECLARE v_table_exists INT DEFAULT 0;
    DECLARE v_index_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO v_table_exists
      FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table_name;

    IF v_table_exists = 1 THEN
        SELECT COUNT(*)
          INTO v_index_exists
          FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND INDEX_NAME = p_index_name;

        IF v_index_exists = 0 THEN
            SET @sql_stmt = CONCAT(
                'ALTER TABLE `', p_table_name, '` ADD ',
                p_index_clause
            );
            PREPARE stmt FROM @sql_stmt;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END $$

DROP PROCEDURE IF EXISTS sp_modify_column_if_exists $$
CREATE PROCEDURE sp_modify_column_if_exists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_def TEXT
)
BEGIN
    DECLARE v_table_exists INT DEFAULT 0;
    DECLARE v_column_exists INT DEFAULT 0;

    SELECT COUNT(*)
      INTO v_table_exists
      FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table_name;

    IF v_table_exists = 1 THEN
        SELECT COUNT(*)
          INTO v_column_exists
          FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND COLUMN_NAME = p_column_name;

        IF v_column_exists = 1 THEN
            SET @sql_stmt = CONCAT(
                'ALTER TABLE `', p_table_name,
                '` MODIFY COLUMN `', p_column_name, '` ',
                p_column_def
            );
            PREPARE stmt FROM @sql_stmt;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END $$

DELIMITER ;

-- =========================
-- Columnas faltantes
-- =========================

CALL sp_add_column_if_missing('usuarios', 'es_administrador', 'TINYINT(1) NOT NULL DEFAULT 0');

CALL sp_add_column_if_missing('corte_caja', 'monto_declarado', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('corte_caja', 'diferencia_efectivo', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('corte_caja', 'monto_declarado_tarjeta', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('corte_caja', 'diferencia_tarjeta', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('corte_caja', 'sucursal_id', 'INT NOT NULL DEFAULT 1');

CALL sp_add_column_if_missing('ticket_settings', 'paper_width_mm', 'INT NOT NULL DEFAULT 58');
CALL sp_add_column_if_missing('ticket_settings', 'print_engine', 'ENUM(''auto'',''gdi'',''out_printer'') NOT NULL DEFAULT ''auto''');
CALL sp_add_column_if_missing('ticket_settings', 'feed_lines_after_print', 'INT NOT NULL DEFAULT 2');

CALL sp_add_column_if_missing('personalization_settings', 'cut_show_business_info', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_shift_info', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_sales_overview', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_cash_summary', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_entries_section', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_entries_detail', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_exits_section', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_exits_detail', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_sales_methods', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_department_totals', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_show_footer', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('personalization_settings', 'cut_print_labels_json', 'LONGTEXT NULL');
CALL sp_add_column_if_missing('personalization_settings', 'cut_print_styles_json', 'LONGTEXT NULL');
CALL sp_add_column_if_missing('personalization_settings', 'migrated_from_legacy', 'TINYINT(1) NOT NULL DEFAULT 0');

CALL sp_add_column_if_missing('device_settings', 'scanner_prefix_to_strip', 'VARCHAR(16) NOT NULL DEFAULT ''''');

CALL sp_add_column_if_missing('ventas', 'monto_efectivo', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('ventas', 'monto_tarjeta', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('ventas', 'turno_id', 'INT NULL');
CALL sp_add_column_if_missing('ventas', 'folio_ticket', 'VARCHAR(16) NULL');
CALL sp_add_column_if_missing('ventas', 'pago_modificado', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('ventas', 'pago_modificado_at', 'DATETIME NULL');
CALL sp_add_column_if_missing('ventas', 'pago_modificado_por', 'INT NULL');
CALL sp_add_column_if_missing('ventas', 'sucursal_id', 'INT NOT NULL DEFAULT 1');

CALL sp_add_column_if_missing('cash_movements', 'turno_id', 'INT NULL');

CALL sp_add_column_if_missing('detalle_venta', 'descripcion', 'VARCHAR(255) NULL');

CALL sp_add_column_if_missing('productos', 'supplier_id', 'INT NULL');
CALL sp_add_column_if_missing('productos', 'exento_iva', 'TINYINT(1) NOT NULL DEFAULT 0');

CALL sp_add_column_if_missing('cajas', 'sucursal_id', 'INT NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('device_caja_bindings', 'sucursal_id', 'INT NULL');

CALL sp_add_column_if_missing('service_buyers', 'contact_name', 'VARCHAR(120) NULL');

CALL sp_add_column_if_missing('product_promotions', 'promo_type', 'ENUM(''single'',''combo'') NOT NULL DEFAULT ''single''');
CALL sp_add_column_if_missing('product_promotions', 'combo_price', 'DECIMAL(10,2) NULL');

CALL sp_add_column_if_missing('purchase_orders', 'assigned_buyer_id', 'INT NULL');
CALL sp_add_column_if_missing('purchase_orders', 'assigned_by_user_id', 'INT NULL');
CALL sp_add_column_if_missing('purchase_orders', 'assigned_by_name', 'VARCHAR(120) NULL');
CALL sp_add_column_if_missing('purchase_orders', 'assignment_note', 'VARCHAR(255) NULL');
CALL sp_add_column_if_missing('purchase_orders', 'assignment_sent_at', 'DATETIME NULL');
CALL sp_add_column_if_missing('purchase_orders', 'reception_closed_at', 'DATETIME NULL');
CALL sp_add_column_if_missing('purchase_orders', 'reception_result', 'ENUM(''pending'',''complete'',''incomplete'') NOT NULL DEFAULT ''pending''');

CALL sp_add_column_if_missing('purchase_order_items', 'order_id', 'INT NOT NULL');
CALL sp_add_column_if_missing('purchase_order_items', 'product_id', 'INT NULL');
CALL sp_add_column_if_missing('purchase_order_items', 'barcode', 'VARCHAR(80) NOT NULL DEFAULT ''''');
CALL sp_add_column_if_missing('purchase_order_items', 'description', 'VARCHAR(255) NOT NULL DEFAULT ''''');
CALL sp_add_column_if_missing('purchase_order_items', 'requested_qty', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('purchase_order_items', 'received_qty', 'DECIMAL(10,2) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('purchase_order_items', 'requester_names', 'VARCHAR(255) NULL');
CALL sp_add_column_if_missing('purchase_order_items', 'last_requested_by_user_id', 'INT NULL');
CALL sp_add_column_if_missing('purchase_order_items', 'last_requested_by_name', 'VARCHAR(120) NULL');

CALL sp_add_column_if_missing('user_auth_sessions', 'sucursal_id', 'INT NULL');

-- =========================
-- cajero_permisos
-- =========================

CALL sp_add_column_if_missing('cajero_permisos', 'ventas_producto_comun', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_aplicar_mayoreo', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_aplicar_descuento', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_historial', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_entrada_efectivo', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_salida_efectivo', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_cobrar_ticket', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_cobrar_credito', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_cancelar_ticket', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_eliminar_articulo', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_facturar', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_pago_servicio', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_recarga_electronica', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'ventas_buscar_producto', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'clientes_admin', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'clientes_asignar_venta', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'clientes_credito_admin', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'clientes_ver_cuentas', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_crear', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_modificar', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_eliminar', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_reporte_ventas', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_crear_promociones', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'productos_modificar_varios', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'inventario_agregar_mercancia', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'inventario_reportes_existencia', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'inventario_movimientos', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'inventario_ajustar', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'corte_turno', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL sp_add_column_if_missing('cajero_permisos', 'corte_todos_turnos', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'corte_dia', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'corte_ver_ganancia_dia', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'configuracion_acceso', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'reportes_ver', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'compras_crear_orden', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sp_add_column_if_missing('cajero_permisos', 'compras_recibir_orden', 'TINYINT(1) NOT NULL DEFAULT 0');

-- =========================
-- Indices faltantes
-- =========================

CALL sp_add_index_if_missing('ventas', 'idx_ventas_turno_id', 'INDEX `idx_ventas_turno_id` (`turno_id`)');
CALL sp_add_index_if_missing('cash_movements', 'idx_cash_movements_turno', 'INDEX `idx_cash_movements_turno` (`turno_id`)');
CALL sp_add_index_if_missing('productos', 'idx_productos_supplier', 'INDEX `idx_productos_supplier` (`supplier_id`)');
CALL sp_add_index_if_missing('cajas', 'idx_cajas_sucursal', 'INDEX `idx_cajas_sucursal` (`sucursal_id`)');
CALL sp_add_index_if_missing('ventas', 'idx_ventas_sucursal', 'INDEX `idx_ventas_sucursal` (`sucursal_id`)');
CALL sp_add_index_if_missing('corte_caja', 'idx_corte_sucursal', 'INDEX `idx_corte_sucursal` (`sucursal_id`)');
CALL sp_add_index_if_missing('device_caja_bindings', 'idx_device_caja_sucursal', 'INDEX `idx_device_caja_sucursal` (`sucursal_id`)');
CALL sp_add_index_if_missing('purchase_orders', 'idx_purchase_orders_status', 'INDEX `idx_purchase_orders_status` (`status`)');
CALL sp_add_index_if_missing('purchase_orders', 'idx_purchase_orders_buyer', 'INDEX `idx_purchase_orders_buyer` (`assigned_buyer_id`)');
CALL sp_add_index_if_missing('purchase_order_items', 'uq_purchase_order_item_barcode', 'UNIQUE KEY `uq_purchase_order_item_barcode` (`order_id`, `barcode`)');
CALL sp_add_index_if_missing('purchase_order_items', 'idx_purchase_order_items_order', 'INDEX `idx_purchase_order_items_order` (`order_id`)');
CALL sp_add_index_if_missing('purchase_order_items', 'idx_purchase_order_items_product', 'INDEX `idx_purchase_order_items_product` (`product_id`)');

-- =========================
-- Ajustes de definicion seguros
-- =========================

CALL sp_modify_column_if_exists('detalle_venta', 'producto_id', 'INT NULL');

-- Limpieza de helpers
DROP PROCEDURE IF EXISTS sp_modify_column_if_exists;
DROP PROCEDURE IF EXISTS sp_add_index_if_missing;
DROP PROCEDURE IF EXISTS sp_add_column_if_missing;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

