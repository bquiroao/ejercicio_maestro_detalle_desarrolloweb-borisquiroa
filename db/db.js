// db/db.js
// Configuración de la conexión a SQL Server usando el driver "mssql".
// Se usa un pool de conexiones que se reutiliza en toda la app (patrón recomendado).

require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true, // necesario para Azure SQL
    trustServerCertificate: true, // útil en entornos de práctica/laboratorio
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// poolPromise se exporta y se reutiliza: mssql recomienda NO crear
// una conexión nueva en cada request, sino compartir el pool.
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("✅ Conectado a SQL Server:", process.env.DB_DATABASE);
    return pool;
  })
  .catch((err) => {
    console.error("❌ Error conectando a SQL Server:", err.message);
    throw err;
  });

module.exports = { sql, poolPromise };
