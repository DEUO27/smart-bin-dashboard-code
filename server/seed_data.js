const db = require('./db');

async function seedData() {
    try {
        const connection = await db.getConnection();
        console.log("Connected to database.");

        // 1. Insert BOTE_BASURA
        console.log("Inserting BOTE_BASURA...");
        const [boteResult] = await connection.query(`
            INSERT INTO BOTE_BASURA (nombre, ubicacion, altura, peso_maximo_kg) 
            VALUES ('Bote Principal', 'Entrada Edificio A', 120.5, 50.0)
        `);
        const idBote = boteResult.insertId;
        console.log(`Created Bote ID: ${idBote}`);

        // 2. Insert SENSOR
        console.log("Inserting SENSOR...");
        // We force ID 101 to match the curl example if possible, or just let it auto-increment
        // Since it's auto-increment, we can't easily force it unless we turn off checks or specify it explicitly if allowed.
        // Let's just insert and print the ID the user should use.
        const [sensorResult] = await connection.query(`
            INSERT INTO SENSOR (id_bote, tipo_sensor) 
            VALUES (?, 'Ultrasonico+Peso')
        `, [idBote]);
        const idSensor = sensorResult.insertId;
        console.log(`Created Sensor ID: ${idSensor}`);

        // 3. Insert ACTUADOR
        console.log("Inserting ACTUADOR...");
        const [actuadorResult] = await connection.query(`
            INSERT INTO ACTUADOR (id_bote, tipo_actuador) 
            VALUES (?, 'Motor Tapa')
        `, [idBote]);
        const idActuador = actuadorResult.insertId;
        console.log(`Created Actuador ID: ${idActuador}`);

        console.log("\n✅ DATA SEEDED SUCCESSFULLY");
        console.log("=================================");
        console.log(`👉 USA ESTE ID_SENSOR EN TUS REQUESTS: ${idSensor}`);
        console.log(`👉 USA ESTE ID_ACTUADOR EN TUS REQUESTS: ${idActuador}`);
        console.log(`👉 USA ESTE ID_BOTE EN TUS REQUESTS: ${idBote}`);
        console.log("=================================");

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
}

seedData();
