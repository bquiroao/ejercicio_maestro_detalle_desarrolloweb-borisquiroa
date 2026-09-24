// routes/estudiantes.js
// Endpoint GET /api/estudiantes -> lista estudiantes con sus misiones y estado
// Se arma un JSON anidado (maestro-detalle) para que el frontend pueda
// pintar fácilmente el tablero de avance.

const express = require("express");
const router = express.Router();
const { poolPromise } = require("../db/db");

router.get("/estudiantes", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        e.Carnet,
        e.Nombre,
        e.Correo,
        m.MisionID,
        m.Nombre AS MisionNombre,
        em.Estado,
        em.FechaRegistro
      FROM Estudiantes e
      LEFT JOIN EstudianteMisiones em ON em.Carnet = e.Carnet
      LEFT JOIN Misiones m ON m.MisionID = em.MisionID
      ORDER BY e.Carnet, m.MisionID;
    `);

    // Agrupamos las filas planas del JOIN en estructura maestro-detalle
    const estudiantesMap = new Map();

    for (const row of result.recordset) {
      if (!estudiantesMap.has(row.Carnet)) {
        estudiantesMap.set(row.Carnet, {
          carnet: row.Carnet,
          nombre: row.Nombre,
          correo: row.Correo,
          misiones: [],
          completadas: 0,
          pendientes: 0,
        });
      }

      const estudiante = estudiantesMap.get(row.Carnet);

      if (row.MisionID !== null) {
        estudiante.misiones.push({
          misionId: row.MisionID,
          nombre: row.MisionNombre,
          estado: row.Estado,
          fechaRegistro: row.FechaRegistro,
        });

        if (row.Estado) estudiante.completadas++;
        else estudiante.pendientes++;
      }
    }

    res.status(200).json({ ok: true, data: Array.from(estudiantesMap.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error consultando estudiantes." });
  }
});

module.exports = router;
