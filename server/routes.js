const express = require('express');
const router = express.Router();
const db = require('./db');

// --- GET Endpoints ---

// 1) GET /api/health
router.get('/health', (req, res) => {
    res.json({ ok: true });
});

// 2) GET /api/summary
router.get('/summary', async (req, res) => {
    try {
        const [mediciones] = await db.query('SELECT COUNT(*) as c FROM MEDICION');
        const [eventos] = await db.query('SELECT COUNT(*) as c FROM EVENTO_ACTUADOR');
        const [recolecciones] = await db.query('SELECT COUNT(*) as c FROM RECOLECCION');
        const [sensores] = await db.query('SELECT COUNT(*) as c FROM SENSOR');
        const [actuadores] = await db.query('SELECT COUNT(*) as c FROM ACTUADOR');
        const [botes] = await db.query('SELECT COUNT(*) as c FROM BOTE_BASURA');

        // Fetch sensors by boat
        const [sensorsByBoat] = await db.query(`
            SELECT b.id_bote, b.nombre, s.tipo_sensor as tipo, MAX(m.ts) as last_seen
            FROM BOTE_BASURA b
            JOIN SENSOR s ON b.id_bote = s.id_bote
            LEFT JOIN MEDICION m ON s.id_sensor = m.id_sensor
            GROUP BY b.id_bote, b.nombre, s.tipo_sensor
        `);

        // Fetch actuators by boat
        const [actuatorsByBoat] = await db.query(`
            SELECT b.id_bote, b.nombre, a.tipo_actuador as tipo, MAX(e.ts) as last_seen
            FROM BOTE_BASURA b
            JOIN ACTUADOR a ON b.id_bote = a.id_bote
            LEFT JOIN EVENTO_ACTUADOR e ON a.id_actuador = e.id_actuador
            GROUP BY b.id_bote, b.nombre, a.tipo_actuador
        `);

        // Process into nested structure
        const boatStatusMap = {};

        sensorsByBoat.forEach(row => {
            if (!boatStatusMap[row.id_bote]) {
                boatStatusMap[row.id_bote] = {
                    id_bote: row.id_bote,
                    nombre: row.nombre,
                    sensors: [],
                    actuators: []
                };
            }
            boatStatusMap[row.id_bote].sensors.push({ tipo: row.tipo, last_seen: row.last_seen });
        });

        actuatorsByBoat.forEach(row => {
            if (!boatStatusMap[row.id_bote]) {
                boatStatusMap[row.id_bote] = {
                    id_bote: row.id_bote,
                    nombre: row.nombre,
                    sensors: [],
                    actuators: []
                };
            }
            boatStatusMap[row.id_bote].actuators.push({ tipo: row.tipo, last_seen: row.last_seen });
        });

        const boatStatus = Object.values(boatStatusMap);

        res.json({
            counts: {
                mediciones: mediciones[0].c,
                eventos_actuador: eventos[0].c,
                recolecciones: recolecciones[0].c,
                sensores: sensores[0].c,
                actuadores: actuadores[0].c,
                botes: botes[0].c
            },
            boatStatus
        });
    } catch (error) {
        console.error('Error in /summary:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3) GET /api/series/mediciones?hours=24
router.get('/series/mediciones', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const query = `
            SELECT DATE_FORMAT(ts, '%Y-%m-%d %H:00:00') as bucket, COUNT(*) as total 
            FROM MEDICION 
            WHERE ts >= NOW() - INTERVAL ? HOUR 
            GROUP BY bucket 
            ORDER BY bucket ASC
        `;
        const [rows] = await db.query(query, [hours]);
        res.json(rows);
    } catch (error) {
        console.error('Error in /series/mediciones:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4) GET /api/recent
router.get('/recent', async (req, res) => {
    try {
        // Mediciones
        const [medRows] = await db.query(`
            SELECT m.ts, b.id_bote, s.tipo_sensor, 
                   m.distancia_cm, m.porcentaje_llenado, m.peso_kg, 
                   m.temperatura_celsius, m.humedad_porcentaje, 
                   m.aceleracion_x, m.aceleracion_y, m.aceleracion_z, m.detecta_caida
            FROM MEDICION m 
            JOIN SENSOR s ON m.id_sensor = s.id_sensor 
            JOIN BOTE_BASURA b ON s.id_bote = b.id_bote 
            ORDER BY m.ts DESC LIMIT 10
        `);

        const mediciones = medRows.map(row => {
            let valores = [];
            if (row.distancia_cm !== null) valores.push(`dist=${row.distancia_cm}cm`);
            if (row.porcentaje_llenado !== null) valores.push(`llenado=${row.porcentaje_llenado}%`);
            if (row.peso_kg !== null) valores.push(`peso=${row.peso_kg}kg`);
            if (row.temperatura_celsius !== null) valores.push(`temp=${row.temperatura_celsius}C`);
            if (row.humedad_porcentaje !== null) valores.push(`hum=${row.humedad_porcentaje}%`);
            if (row.aceleracion_x !== null) valores.push(`ax=${row.aceleracion_x} ay=${row.aceleracion_y} az=${row.aceleracion_z}`);
            if (row.detecta_caida) valores.push(`caida=${row.detecta_caida}`);

            return {
                ts: row.ts,
                id_bote: row.id_bote,
                tipo_sensor: row.tipo_sensor,
                valores: valores.join(' ')
            };
        });

        // Eventos
        const [eventRows] = await db.query(`
            SELECT e.ts, b.id_bote, a.tipo_actuador, e.descp 
            FROM EVENTO_ACTUADOR e 
            JOIN ACTUADOR a ON e.id_actuador = a.id_actuador 
            JOIN BOTE_BASURA b ON a.id_bote = b.id_bote 
            ORDER BY e.ts DESC LIMIT 10
        `);

        // Recolecciones
        const [recRows] = await db.query(`
            SELECT r.ts, r.id_bote, r.peso_recolectado_kg 
            FROM RECOLECCION r 
            ORDER BY r.ts DESC LIMIT 10
        `);

        res.json({
            mediciones,
            eventos: eventRows,
            recolecciones: recRows
        });
    } catch (error) {
        console.error('Error in /recent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5) GET /api/botes
router.get('/botes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_bote, nombre, latitud, longitud FROM BOTE_BASURA ORDER BY id_bote ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error in /botes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- POST Endpoints (Legacy/ESP8266) ---

router.post('/mediciones', async (req, res) => {
    try {
        const {
            id_sensor, distancia_cm, porcentaje_llenado, peso_kg,
            temperatura_celsius, humedad_porcentaje,
            aceleracion_x, aceleracion_y, aceleracion_z,
            detecta_caida, ts
        } = req.body;

        if (id_sensor === undefined || id_sensor === null) {
            return res.status(400).json({ error: 'id_sensor is required' });
        }

        const query = `
            INSERT INTO MEDICION 
            (id_sensor, distancia_cm, porcentaje_llenado, peso_kg, temperatura_celsius, humedad_porcentaje, aceleracion_x, aceleracion_y, aceleracion_z, detecta_caida, ts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
        `;

        const values = [
            id_sensor, distancia_cm || null, porcentaje_llenado || null, peso_kg || null,
            temperatura_celsius || null, humedad_porcentaje || null,
            aceleracion_x || null, aceleracion_y || null, aceleracion_z || null,
            detecta_caida ? 1 : 0, ts ? new Date(ts) : null
        ];

        const [result] = await db.execute(query, values);
        res.json({ insertedId: result.insertId });

    } catch (error) {
        console.error('Error in /mediciones:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/eventos-actuador', async (req, res) => {
    try {
        const { id_actuador, descp, ts } = req.body;

        if (id_actuador === undefined || id_actuador === null) {
            return res.status(400).json({ error: 'id_actuador is required' });
        }

        const query = `
            INSERT INTO EVENTO_ACTUADOR (id_actuador, descp, ts)
            VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
        `;

        const [result] = await db.execute(query, [id_actuador, descp || null, ts ? new Date(ts) : null]);
        res.json({ insertedId: result.insertId });

    } catch (error) {
        console.error('Error in /eventos-actuador:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/recolecciones', async (req, res) => {
    try {
        const { id_bote, peso_recolectado_kg, ts } = req.body;

        if (id_bote === undefined || id_bote === null || peso_recolectado_kg === undefined || peso_recolectado_kg === null) {
            return res.status(400).json({ error: 'id_bote and peso_recolectado_kg are required' });
        }

        const query = `
            INSERT INTO RECOLECCION (id_bote, peso_recolectado_kg, ts)
            VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
        `;

        const [result] = await db.execute(query, [id_bote, peso_recolectado_kg, ts ? new Date(ts) : null]);
        res.json({ insertedId: result.insertId });

    } catch (error) {
        console.error('Error in /recolecciones:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
