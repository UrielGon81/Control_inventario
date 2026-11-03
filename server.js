require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'control_inventario_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Importación automática del respaldo SQL al arrancar en la nube

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || '12345';
    if (password === adminPassword) res.json({ success: true });
    else res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
});

const verificarAcceso = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === (process.env.ADMIN_PASSWORD || '12345')) next();
    else res.status(403).json({ error: 'No autorizado' });
};

// Productos
app.get('/api/productos', verificarAcceso, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT p.*, (p.precio_venta - p.precio_compra) AS ganancia_unitaria FROM productos p');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos', verificarAcceso, async (req, res) => {
    try {
        const { nombre, precio_compra, precio_venta, stock_actual, talla, imagen } = req.body;
        const [result] = await pool.query(
            'INSERT INTO productos (nombre, precio_compra, precio_venta, stock_actual, talla, imagen) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, precio_compra, precio_venta, stock_actual, talla || 'Única', imagen || '']
        );
        res.json({ id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Venta Multi-Talla 
app.post('/api/ventas', verificarAcceso, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { producto_id, items, monto_pagado, fecha_venta } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'No hay tallas' });

        await connection.beginTransaction();

        const [rows] = await connection.query('SELECT precio_compra, precio_venta, stock_actual FROM productos WHERE id = ?', [producto_id]);
        if (rows.length === 0) throw new Error('Producto no encontrado');

        const prod = rows[0];
        const precioUnitario = parseFloat(prod.precio_venta) || 0;
        const costoUnitario = parseFloat(prod.precio_compra) || 0;
        const stockActual = parseInt(prod.stock_actual) || 0;
        const idProdSeguro = parseInt(producto_id) || 0;

        const totalPiezas = items.reduce((sum, item) => sum + (parseInt(item.cantidad) || 0), 0);
        if (stockActual < totalPiezas) throw new Error('Stock insuficiente');

        let fechaMysql = fecha_venta;
        if (!fechaMysql) fechaMysql = new Date().toISOString().slice(0, 19).replace('T', ' ');
        else if (fechaMysql.includes('T')) fechaMysql = fechaMysql.replace('T', ' ') + ':00';

        let anticipoRestante = parseFloat(monto_pagado) || 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const cantLinea = parseInt(item.cantidad) || 0;
            const subtotalLinea = precioUnitario * cantLinea;
            
            let anticipoLinea = 0;
            if (anticipoRestante >= subtotalLinea) {
                anticipoLinea = subtotalLinea;
                anticipoRestante -= subtotalLinea;
            } else {
                anticipoLinea = anticipoRestante;
                anticipoRestante = 0;
            }

            const pendienteLinea = subtotalLinea - anticipoLinea;
            const gananciaLinea = (precioUnitario - costoUnitario) * cantLinea;
            const estadoLinea = pendienteLinea <= 0 ? 'Liquidado' : 'Pendiente de Liquidación';

            await connection.query(
                `INSERT INTO ventas_diarias 
                (producto_id, cantidad_vendida, talla_vendida, precio_total_venta, monto_pagado, monto_pendiente, ganancia_neta_total, fecha_venta, estado_pago) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idProdSeguro, cantLinea, item.talla || 'Única', isNaN(subtotalLinea)?0:subtotalLinea, isNaN(anticipoLinea)?0:anticipoLinea, isNaN(pendienteLinea)?0:pendienteLinea, isNaN(gananciaLinea)?0:gananciaLinea, fechaMysql, estadoLinea]
            );
            await connection.query('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?', [cantLinea, idProdSeguro]);
        }

        await connection.commit();
        connection.release();
        res.json({ mensaje: 'Venta registrada' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
});

// Historial Individual
app.get('/api/ventas-historial', verificarAcceso, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.id, p.nombre, v.talla_vendida, v.cantidad_vendida, v.precio_total_venta, v.monto_pagado, v.monto_pendiente, v.ganancia_neta_total, v.fecha_venta, v.estado_pago 
            FROM ventas_diarias v JOIN productos p ON v.producto_id = p.id
            ORDER BY v.fecha_venta DESC LIMIT 50
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/ventas/:id/liquidar', verificarAcceso, async (req, res) => {
    try {
        const [ventaRows] = await pool.query('SELECT precio_total_venta FROM ventas_diarias WHERE id = ?', [req.params.id]);
        if (ventaRows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
        await pool.query(`UPDATE ventas_diarias SET monto_pagado = ?, monto_pendiente = 0, estado_pago = 'Liquidado' WHERE id = ?`, [ventaRows[0].precio_total_venta, req.params.id]);
        res.json({ mensaje: 'Liquidada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// HISTORIAL POR SEMANAS (Agrupa las ventas de Lunes a Domingo)
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

app.get('/', (req, res) => {
    res.send('¡Hola! El servidor de inventario está conectado y vivo 🚀');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT} 🎯`));