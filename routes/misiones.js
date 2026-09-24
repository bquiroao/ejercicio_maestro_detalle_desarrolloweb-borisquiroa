// routes/misiones.js
// Endpoint GET /api/misiones -> devuelve el catálogo completo de misiones

const express = require("express");
const router = express.Router();
const { poolPromise } = require("../db/db");

router.get("/misiones", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT MisionID, Nombre, Descripcion FROM Misiones ORDER BY MisionID");

    res.status(200).json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error consultando el catálogo de misiones." });
  }
});

module.exports = router;
