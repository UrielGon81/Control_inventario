require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cors());

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Demasiados intentos fallidos. Inténtalo de nuevo en 15 minutos.' }
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'control_inventario_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

async function inicializarBD() {
    try {
        const [t] = await pool.query("SHOW TABLES LIKE 'productos'");
        if (t.length > 0) {
            console.log('✅ BD lista: la tabla productos ya existe');
            return;
        }
        const ruta = path.join(__dirname, 'backup.sql');
        if (!fs.existsSync(ruta)) return;
        let sql = fs.readFileSync(ruta, 'utf8');
        sql = sql.replace(/^\s*(CREATE DATABASE|USE)\b.*;\s*$/gim, '');
        await pool.query(sql);
        console.log('✅ backup.sql importado correctamente');
    } catch (err) {
        console.error('❌ Error inicializando BD:', err.message);
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_cambiar_en_produccion';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, db: 'conectada' });
    } catch (err) {
        res.status(500).json({ ok: false, db: err.message });
    }
});

app.post('/api/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
    }
});

const verificarAcceso = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'Token no proporcionado' });

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7, authHeader.length) : authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Sesión expirada o no autorizada' });
        req.user = decoded;
        next();
    });
};

// --- PRODUCTOS ---
app.get('/api/productos', verificarAcceso, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT p.*, (p.precio_venta - p.precio_compra) AS ganancia_unitaria FROM productos p');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos', verificarAcceso, async (req, res) => {
    try {
        let { nombre, precio_compra, precio_venta, stock_actual, talla, color, imagen } = req.body;
        nombre = nombre ? nombre.trim() : 'Sin nombre';
        precio_compra = parseFloat(precio_compra) || 0;
        precio_venta = parseFloat(precio_venta) || 0;
        stock_actual = parseInt(stock_actual) || 0;
        talla = talla ? talla.trim() : 'Única';
        color = color ? color.trim() : 'General';
        imagen = imagen ? imagen.trim() : '';

        const [result] = await pool.query(
            'INSERT INTO productos (nombre, precio_compra, precio_venta, stock_actual, talla, color, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, precio_compra, precio_venta, stock_actual, talla, color, imagen]
        );
        res.json({ id: result.insertId, success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.put('/api/productos/:id', verificarAcceso, async (req, res) => {
    try {
        const { id } = req.params;
        let { nombre, precio_compra, precio_venta, stock_actual, talla, color, imagen } = req.body;
        nombre = nombre ? nombre.trim() : 'Sin nombre';
        precio_compra = parseFloat(precio_compra) || 0;
        precio_venta = parseFloat(precio_venta) || 0;
        stock_actual = parseInt(stock_actual) || 0;
        talla = talla ? talla.trim() : 'Única';
        color = color ? color.trim() : 'General';
        imagen = imagen ? imagen.trim() : '';

        await pool.query(
            'UPDATE productos SET nombre = ?, precio_compra = ?, precio_venta = ?, stock_actual = ?, talla = ?, color = ?, imagen = ? WHERE id = ?',
            [nombre, precio_compra, precio_venta, stock_actual, talla, color, imagen, id]
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- VARIANTES ---
app.get('/api/productos/:id/variantes', verificarAcceso, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM variantes_productos WHERE producto_id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos/:id/variantes', verificarAcceso, async (req, res) => {
    const productoId = req.params.id;
    const { variantes } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM variantes_productos WHERE producto_id = ?', [productoId]);
        if (variantes && variantes.length > 0) {
            for (const v of variantes) {
                await connection.query(
                    'INSERT INTO variantes_productos (producto_id, color, talla, stock) VALUES (?, ?, ?, ?)',
                    [productoId, v.color || 'General', v.talla || 'Única', parseInt(v.stock) || 0]
                );
            }
        }
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// --- VENTAS Y APARTADOS (Actualización dinámica de variantes y stock general) ---
app.post('/api/ventas', verificarAcceso, async (req, res) => {
    const { producto_id, items, monto_pagado, fecha_venta } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No hay variantes seleccionadas' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query('SELECT precio_compra, precio_venta, stock_actual FROM productos WHERE id = ?', [producto_id]);
        if (rows.length === 0) throw new Error('Producto no encontrado');

        const prod = rows[0];
        const precioUnitario = parseFloat(prod.precio_venta) || 0;
        const costoUnitario = parseFloat(prod.precio_compra) || 0;

        let totalPiezasVendidas = 0;
        let fechaMysql = fecha_venta ? fecha_venta.replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
        if (fechaMysql.length === 16) fechaMysql += ':00';

        let anticipoRestante = parseFloat(monto_pagado) || 0;

        // 1. Validar existencia y stock suficiente en cada variante específica
        for (const item of items) {
            const cantLinea = parseInt(item.cantidad) || 0;
            if (cantLinea <= 0) continue;
            totalPiezasVendidas += cantLinea;

            const tallaItem = item.talla ? item.talla.trim() : 'Única';
            const colorItem = item.color ? item.color.trim() : 'General';

            const [varRows] = await connection.query(
                'SELECT id, stock FROM variantes_productos WHERE producto_id = ? AND color = ? AND talla = ?',
                [producto_id, colorItem, tallaItem]
            );

            if (varRows.length === 0) {
                throw new Error(`La variante (Color: ${colorItem}, Talla: ${tallaItem}) no existe registrada en el inventario.`);
            }

            if (varRows[0].stock < cantLinea) {
                throw new Error(`Stock insuficiente para ${colorItem} - Talla ${tallaItem}. Disponible: ${varRows[0].stock} pzas.`);
            }
        }

        // 2. Registrar ventas y descontar tanto de la variante como del stock global
        let anticipoRestanteLinea = anticipoRestante;

        for (const item of items) {
            const cantLinea = parseInt(item.cantidad) || 0;
            if (cantLinea <= 0) continue;
            const subtotalLinea = precioUnitario * cantLinea;

            let anticipoLinea = anticipoRestanteLinea >= subtotalLinea ? subtotalLinea : anticipoRestanteLinea;
            anticipoRestanteLinea = Math.max(0, anticipoRestanteLinea - subtotalLinea);

            const pendienteLinea = subtotalLinea - anticipoLinea;
            const gananciaLinea = (precioUnitario - costoUnitario) * cantLinea;
            const estadoLinea = pendienteLinea <= 0 ? 'Liquidado' : 'Pendiente de Liquidación';
            const detalleTallaColor = `${item.talla.trim()} / ${item.color.trim()}`;

            // Insertar en historial de ventas
            await connection.query(
                `INSERT INTO ventas_diarias
                (producto_id, cantidad_vendida, talla_vendida, precio_total_venta, monto_pagado, monto_pendiente, ganancia_neta_total, fecha_venta, estado_pago)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [producto_id, cantLinea, detalleTallaColor, subtotalLinea, anticipoLinea, pendienteLinea, gananciaLinea, fechaMysql, estadoLinea]
            );

            // Descontar stock de la variante específica
            await connection.query(
                'UPDATE variantes_productos SET stock = stock - ? WHERE producto_id = ? AND color = ? AND talla = ?',
                [cantLinea, producto_id, item.color.trim(), item.talla.trim()]
            );
        }

        // Descontar stock general del producto
        await connection.query('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?', [totalPiezasVendidas, producto_id]);

        await connection.commit();
        res.json({ success: true, mensaje: 'Venta registrada y stock actualizado correctamente' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/ventas-historial', verificarAcceso, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.id, p.nombre, p.imagen, v.talla_vendida, v.cantidad_vendida, v.precio_total_venta, v.monto_pagado, v.monto_pendiente, v.ganancia_neta_total, v.fecha_venta, v.estado_pago
            FROM ventas_diarias v JOIN productos p ON v.producto_id = p.id
            ORDER BY v.fecha_venta DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ventas/:id/abonar', verificarAcceso, async (req, res) => {
    const ventaId = req.params.id;
    const { monto_abonado } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT precio_total_venta, monto_pagado FROM ventas_diarias WHERE id = ?', [ventaId]);
        if (rows.length === 0) throw new Error('Venta no encontrada');

        const venta = rows[0];
        const nuevoPagado = parseFloat(venta.monto_pagado) + parseFloat(monto_abonado);
        const nuevoPendiente = Math.max(0, parseFloat(venta.precio_total_venta) - nuevoPagado);
        const nuevoEstado = nuevoPendiente === 0 ? 'Liquidado' : 'Pendiente de Liquidación';

        await connection.query(
            'UPDATE ventas_diarias SET monto_pagado = ?, monto_pendiente = ?, estado_pago = ? WHERE id = ?',
            [nuevoPagado, nuevoPendiente, nuevoEstado, ventaId]
        );

        await connection.commit();
        res.json({ success: true, mensaje: 'Abono registrado correctamente', nuevoPendiente, estado: nuevoEstado });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/corte-semanal', verificarAcceso, async (req, res) => {
    try {
        const [semanas] = await pool.query(`
            SELECT
                DATE_FORMAT(DATE_ADD(DATE(fecha_venta), INTERVAL -WEEKDAY(fecha_venta) DAY), '%Y-%m-%d') as lunes,
                DATE_FORMAT(DATE_ADD(DATE(fecha_venta), INTERVAL 6 - WEEKDAY(fecha_venta) DAY), '%Y-%m-%d') as domingo,
                IFNULL(SUM(precio_total_venta), 0) as total_vendido,
                IFNULL(SUM(monto_pagado), 0) as total_caja,
                IFNULL(SUM(ganancia_neta_total), 0) as total_ganancia,
                IFNULL(SUM(monto_pendiente), 0) as total_adeudos
            FROM ventas_diarias
            GROUP BY YEARWEEK(fecha_venta, 1), lunes, domingo
            ORDER BY lunes DESC
        `);
        res.json(semanas);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/corte-semanal/detalle', verificarAcceso, async (req, res) => {
    const { inicio, fin } = req.query;
    try {
        const [rows] = await pool.query(`
            SELECT v.id, p.nombre, p.imagen, v.talla_vendida, v.cantidad_vendida, 
                   v.precio_total_venta, v.monto_pagado, v.monto_pendiente, 
                   v.ganancia_neta_total, v.fecha_venta, v.estado_pago
            FROM ventas_diarias v 
            JOIN productos p ON v.producto_id = p.id
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
            ORDER BY v.fecha_venta DESC
        `, [inicio, fin]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
inicializarBD().finally(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Servidor seguro en puerto ${PORT} 🛡️`));
});