// routes/registro.js
// Endpoint principal del reto: POST /api/registro
// Recibe un JSON "maestro-detalle" (estudiante + misiones) y hace:
//   1) upsert del estudiante (Carnet es la PK / clave de negocio)
//   2) validación de que cada misionId exista en el catálogo Misiones
//   3) upsert de cada fila del detalle en EstudianteMisiones

const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db/db");

router.post("/registro", async (req, res) => {
  const { maestro, detalle } = req.body;

  // --- Validaciones básicas de forma del JSON ---
  if (!maestro || !maestro.carnet || !maestro.nombre || !maestro.correo) {
    return res.status(400).json({
      ok: false,
      error: "El objeto 'maestro' debe incluir carnet, nombre y correo.",
    });
  }

  if (!Array.isArray(detalle) || detalle.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "El 'detalle' debe ser un arreglo con al menos una misión.",
    });
  }

  const { carnet, nombre, correo } = maestro;

  try {
    const pool = await poolPromise;

    // Usamos una transacción: si algo falla (p.ej. una misión no existe),
    // no queremos dejar al estudiante insertado a medias.
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ---------- 1) UPSERT del ESTUDIANTE (maestro) ----------
      // MERGE es la forma clásica de hacer upsert en SQL Server.
      const requestMaestro = new sql.Request(transaction);
      requestMaestro.input("Carnet", sql.VarChar(25), carnet);
      requestMaestro.input("Nombre", sql.NVarChar(150), nombre);
      requestMaestro.input("Correo", sql.NVarChar(150), correo);

      await requestMaestro.query(`
        MERGE Estudiantes AS target
        USING (SELECT @Carnet AS Carnet) AS source
        ON target.Carnet = source.Carnet
        WHEN MATCHED THEN
          UPDATE SET Nombre = @Nombre, Correo = @Correo
        WHEN NOT MATCHED THEN
          INSERT (Carnet, Nombre, Correo)
          VALUES (@Carnet, @Nombre, @Correo);
      `);

      const resultadoDetalle = [];

      // ---------- 2) y 3) Procesar cada línea del detalle ----------
      for (const item of detalle) {
        const { misionId, estado } = item;

        if (misionId === undefined || estado === undefined) {
          throw {
            codigo: 400,
            mensaje: `Cada detalle debe incluir misionId y estado. Recibido: ${JSON.stringify(
              item
            )}`,
          };
        }

        // Validar que la misión exista en el catálogo
        const requestValidar = new sql.Request(transaction);
        requestValidar.input("MisionID", sql.Int, misionId);
        const misionExiste = await requestValidar.query(
          `SELECT MisionID FROM Misiones WHERE MisionID = @MisionID`
        );

        if (misionExiste.recordset.length === 0) {
          // Error de referencia: el ID de misión no existe en el catálogo
          throw {
            codigo: 409,
            mensaje: `La misión con ID ${misionId} no existe en el catálogo (error de referencia).`,
          };
        }

        // Upsert en EstudianteMisiones (clave: Carnet + MisionID)
        const requestDetalle = new sql.Request(transaction);
        requestDetalle.input("Carnet", sql.VarChar(25), carnet);
        requestDetalle.input("MisionID", sql.Int, misionId);
        requestDetalle.input("Estado", sql.Bit, estado);

        await requestDetalle.query(`
          MERGE EstudianteMisiones AS target
          USING (SELECT @Carnet AS Carnet, @MisionID AS MisionID) AS source
          ON target.Carnet = source.Carnet AND target.MisionID = source.MisionID
          WHEN MATCHED THEN
            UPDATE SET Estado = @Estado
          WHEN NOT MATCHED THEN
            INSERT (Carnet, MisionID, Estado)
            VALUES (@Carnet, @MisionID, @Estado);
        `);

        resultadoDetalle.push({ misionId, estado, procesado: true });
      }

      await transaction.commit();

      return res.status(200).json({
        ok: true,
        mensaje: "Registro procesado correctamente.",
        maestro: { carnet, nombre, correo },
        detalle: resultadoDetalle,
      });
    } catch (errInterno) {
      await transaction.rollback();

      const codigo = errInterno.codigo || 500;
      const mensaje = errInterno.mensaje || "Error procesando el detalle.";
      return res.status(codigo).json({ ok: false, error: mensaje });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, error: "Error de conexión o del servidor.", detalle: err.message });
  }
});

module.exports = router;
