// routes/api/sales.js
const express = require('express');
const router = express.Router();
const db = require('../../db');

router.post('/', async (req, res) => {
    const { fecha, numero_ticket, cajero_id, numero_caja, metodo_pago, productos } = req.body;

    if (!fecha || !numero_ticket || !cajero_id || !numero_caja || !metodo_pago || !Array.isArray(productos)) {
        return res.status(400).json({ error: 'Datos incompletos o inválidos' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const total = productos.reduce((sum, p) => sum + (p.precio_unitario * p.cantidad), 0);

        const [ventaResult] = await connection.query(`
            INSERT INTO ventas (fecha, numero_ticket, cajero_id, metodo_pago, numero_caja, total)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [fecha, numero_ticket, cajero_id, metodo_pago, numero_caja, total]
        );

        const venta_id = ventaResult.insertId;

        for (const p of productos) {
            await connection.query(`
                INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [venta_id, p.producto_id, p.cantidad, p.precio_unitario, p.precio_unitario * p.cantidad]
            );
        }

        await connection.commit();
        res.json({ success: true, venta_id });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al registrar la venta' });
    } finally {
        connection.release();
    }
});

module.exports = router;
