
// Rutas del backend

// Helpers
function parseDecimal(value, defaultValue = 0) {
  const cleaned = String(value || '')
    .replace(/[^0-9,\.\-+]/g, '') // keep digits, comma, dot, minus, plus
    .replace(/\,/g, '.') // normalize comma to dot
    .replace(/\.(?=.*\.)/g, ''); // keep only first dot
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseIntOrNull(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseBool(value) {
  if (typeof value === 'boolean') return value;
  const str = String(value || '').trim().toLowerCase();
  return str === '1' || str === 'true' || str === 'yes';
}

//GETs

app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      `SELECT p.*, fv.descripcion AS formato_venta, d.nombre AS departamento, s.name AS supplier_name
       FROM productos p
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       LEFT JOIN departamento d ON d.id_departamento = p.id_departamento
       LEFT JOIN service_suppliers s ON s.id = p.supplier_id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Base de datos error' });
  }
});

// Search product by code
app.get('/api/productos/code/:code', async (req, res) => {
  const code = String(req.params?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Codigo invalido' });
  }

  try {
    const [results] = await pool.promise().query(
      `SELECT p.*, fv.descripcion AS formato_venta, d.nombre AS departamento, s.name AS supplier_name
       FROM productos p
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       LEFT JOIN departamento d ON d.id_departamento = p.id_departamento
       LEFT JOIN service_suppliers s ON s.id = p.supplier_id
       WHERE TRIM(p.codigo_barras) = ?
          OR (
              ? REGEXP '^[0-9]+$'
              AND TRIM(p.codigo_barras) REGEXP '^[0-9]+$'
              AND CAST(TRIM(p.codigo_barras) AS UNSIGNED) = CAST(? AS UNSIGNED)
          )
       ORDER BY p.id_producto ASC
       LIMIT 1`,
      [code, code, code]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Base de datos error' });
  }
});

// Search product by name
app.get('/api/productos/name/:name', async (req, res) => {
  const name = String(req.params?.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Nombre invalido' });
  }

  try {
    const [results] = await pool.promise().query(
      `SELECT p.*, fv.descripcion AS formato_venta, d.nombre AS departamento, s.name AS supplier_name
       FROM productos p
       LEFT JOIN formato_venta fv ON fv.id_formato = p.id_formato
       LEFT JOIN departamento d ON d.id_departamento = p.id_departamento
       LEFT JOIN service_suppliers s ON s.id = p.supplier_id
       WHERE p.descripcion = ?
       LIMIT 1`,
      [name]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Base de datos error' });
  }
});

//POSTs

// Validacion de usuario
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Realizamos la consulta en la base de datos
    const result = await pool.promise().query(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );

    // Imprimimos el resultado completo para depuración

    // Asegúrate de que el resultado contiene datos
    const rows = result[0];  // El primer elemento de `result` es un array de filas

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    // Obtenemos al primer usuario (ya que la consulta devuelve un array)
    const user = rows[0];

    // Compara la contraseña ingresada con la almacenada en la base de datos
    if (user.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Si la validación es exitosa, generamos un token ficticio
    const fakeToken = `token-${Date.now()}`;
    return res.json({ message: 'Login exitoso', token: fakeToken });

  } catch (error) {
    console.error('Error durante el login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});



// Ingresar producto
app.post('/api/productos', async (req, res) => {
  const {
    codigo_barras,
    descripcion,
    formato_venta,
    costo,
    ganancia,
    precio_venta,
    precio_mayoreo,
    utiliza_inventario,
    cantidad_actual,
    cantidad_minima,
    cantidad_maxima,
    departamento,
    supplier_id,
    exento_iva,
  } = req.body;

  if (!codigo_barras || !descripcion) {
    return res.status(400).json({ message: 'Código y descripción son obligatorios' });
  }

  const parsedCosto = parseDecimal(costo, 0);
  const parsedGanancia = parseDecimal(ganancia, 0);
  const parsedPrecioVenta = parseDecimal(precio_venta, 0);
  const parsedPrecioMayoreo = parseDecimal(precio_mayoreo, null);
  const parsedCantidadActual = parseDecimal(cantidad_actual, 0);
  const parsedCantidadMinima = parseDecimal(cantidad_minima, 0);
  const parsedCantidadMaxima = parseDecimal(cantidad_maxima, 0);
  const parsedUtilizaInventario = parseBool(utiliza_inventario) ? 1 : 0;
  const parsedSupplierId = parseIntOrNull(supplier_id);
  const parsedExentoIva = parseBool(exento_iva) ? 1 : 0;

  try {
    const [formatoRows] = await pool.promise().query(
      'SELECT id_formato FROM formato_venta WHERE descripcion = ?',
      [String(formato_venta || 'unidad').trim()]
    );
    if (formatoRows.length === 0) {
      return res.status(400).json({ message: 'Formato de venta no válido' });
    }
    const id_formato = formatoRows[0].id_formato;

    const [departamentoRows] = await pool.promise().query(
      'SELECT id_departamento FROM departamento WHERE nombre = ?',
      [String(departamento || '').trim()]
    );
    if (departamentoRows.length === 0) {
      return res.status(400).json({ message: 'Departamento no válido' });
    }
    const id_departamento = departamentoRows[0].id_departamento;

    await pool.promise().query(
      `INSERT INTO productos (
          codigo_barras, descripcion, id_formato, costo, ganancia, precio_venta,
          precio_mayoreo, utiliza_inventario, cantidad_actual, cantidad_minima,
          cantidad_maxima, id_departamento, supplier_id, exento_iva
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(codigo_barras).trim(),
        String(descripcion).trim(),
        id_formato,
        parsedCosto,
        parsedGanancia,
        parsedPrecioVenta,
        parsedPrecioMayoreo,
        parsedUtilizaInventario,
        parsedCantidadActual,
        parsedCantidadMinima,
        parsedCantidadMaxima,
        id_departamento,
        parsedSupplierId,
        parsedExentoIva,
      ]
    );

    res.status(201).json({ message: 'Producto añadido exitosamente' });
  } catch (error) {
    console.error('Error al añadir producto:', error);
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El código de producto ya existe' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Update product
app.put('/api/productos/:code', async (req, res) => {
  const code = String(req.params?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Codigo invalido' });
  }

  const {
    descripcion,
    formato_venta,
    costo,
    ganancia,
    precio_venta,
    precio_mayoreo,
    utiliza_inventario,
    cantidad_actual,
    cantidad_minima,
    cantidad_maxima,
    departamento,
    supplier_id,
    exento_iva,
  } = req.body;

  const parsedCosto = parseDecimal(costo, 0);
  const parsedGanancia = parseDecimal(ganancia, 0);
  const parsedPrecioVenta = parseDecimal(precio_venta, 0);
  const parsedPrecioMayoreo = parseDecimal(precio_mayoreo, null);
  const parsedCantidadActual = parseDecimal(cantidad_actual, 0);
  const parsedCantidadMinima = parseDecimal(cantidad_minima, 0);
  const parsedCantidadMaxima = parseDecimal(cantidad_maxima, 0);
  const parsedUtilizaInventario = parseBool(utiliza_inventario) ? 1 : 0;
  const parsedSupplierId = parseIntOrNull(supplier_id);
  const parsedExentoIva = parseBool(exento_iva) ? 1 : 0;

  try {
    const [existingRows] = await pool.promise().query(
      'SELECT id_producto, id_formato, id_departamento FROM productos WHERE codigo_barras = ? LIMIT 1',
      [code]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    let id_formato = existingRows[0].id_formato;
    if (formato_venta) {
      const [fRows] = await pool.promise().query(
        'SELECT id_formato FROM formato_venta WHERE descripcion = ?',
        [String(formato_venta || '').trim()]
      );
      if (fRows.length) id_formato = fRows[0].id_formato;
    }

    let id_departamento = existingRows[0].id_departamento;
    if (departamento) {
      const [dRows] = await pool.promise().query(
        'SELECT id_departamento FROM departamento WHERE nombre = ?',
        [String(departamento || '').trim()]
      );
      if (dRows.length) id_departamento = dRows[0].id_departamento;
    }

    await pool.promise().query(
      `UPDATE productos SET
         descripcion = ?, id_formato = ?, costo = ?, ganancia = ?, precio_venta = ?, precio_mayoreo = ?,
         utiliza_inventario = ?, cantidad_actual = ?, cantidad_minima = ?, cantidad_maxima = ?,
         id_departamento = ?, supplier_id = ?, exento_iva = ?
       WHERE codigo_barras = ?`,
      [
        String(descripcion || '').trim(),
        id_formato,
        parsedCosto,
        parsedGanancia,
        parsedPrecioVenta,
        parsedPrecioMayoreo,
        parsedUtilizaInventario,
        parsedCantidadActual,
        parsedCantidadMinima,
        parsedCantidadMaxima,
        id_departamento,
        parsedSupplierId,
        parsedExentoIva,
        code,
      ]
    );

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: 'Base de datos error' });
  }
});

//DELETEs

/*app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM producto WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Product deleted' });
  });
});*/

// Delete product
app.delete('/api/productos/:code', async (req, res) => {
  const code = String(req.params?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Codigo invalido' });
  }

  try {
    await pool.promise().query('DELETE FROM productos WHERE codigo_barras = ?', [code]);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Base de datos error' });
  }
});

//USEs

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal!');
});


// Simula un nuevo dispositivo conectándose
app.post('/connect', async (req, res) => {
  const  caja = req.body;                // número recibido
  console.log('Servidor agrega:', caja.caja);
  try {
    await pool.promise().query(
      'INSERT INTO conectados (id,caja) VALUES (?,?)',
      [caja.caja,caja.caja]                                // id es AUTO_INCREMENT
    );
    res.json({ message: 'Nueva caja registrada', total: caja });
  } catch (error) {
    console.error('Error al insertar caja:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Devuelve la cantidad de dispositivos conectados
app.get('/devices', async (req, res) => {
  try {
    const [rows] = await pool.promise().query(
      'SELECT COUNT(caja) AS connected FROM conectados'
    );
    console.log('Servidor responde:', rows[0].connected);
    res.json({ connected: rows[0].connected }); // { connected: 5 }
  } catch (error) {
    console.error('Error al contar cajas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Simula la desconexión de un dispositivo
app.delete('/disconnect', async (req, res) => {
  try {
    await pool.promise().query(
      'DELETE FROM conectados ORDER BY id DESC LIMIT 1'
    );
    res.json({ message: 'Dispositivo eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar caja:', err);
    res.status(500).json({ error: 'Base de datos error' });
  }
});















