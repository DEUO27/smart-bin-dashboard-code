const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Handle SSL CA file if provided
if (process.env.DB_SSL_CA) {
    try {
        // Resolve path relative to current working directory if it's a relative path
        const caPath = path.resolve(process.env.DB_SSL_CA);
        if (fs.existsSync(caPath)) {
            dbConfig.ssl = {
                ca: fs.readFileSync(caPath)
            };
            console.log(`Loaded SSL CA from ${caPath}`);
        } else {
            console.warn(`Warning: SSL CA file not found at ${caPath}. Connecting without specific CA.`);
        }
    } catch (err) {
        console.warn("Warning: Could not load SSL CA file. Connecting without specific CA.", err.message);
    }
}

const pool = mysql.createPool(dbConfig);

// Simple connection test
pool.getConnection()
    .then(conn => {
        console.log("Database connected successfully");
        conn.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err);
    });

module.exports = pool;
