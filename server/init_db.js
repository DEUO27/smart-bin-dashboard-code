const db = require('./db');
const fs = require('fs');
const path = require('path');

async function initDB() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to get individual statements, filtering out empty ones
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        const connection = await db.getConnection();
        console.log("Connected to database.");

        for (const stmt of statements) {
            console.log(`Executing: ${stmt.substring(0, 50)}...`);
            await connection.query(stmt);
        }

        console.log("Database initialized successfully!");
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("Error initializing database:", error);
        process.exit(1);
    }
}

initDB();
