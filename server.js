// server.js
// Punto de entrada de la API. Levanta Express, habilita CORS (necesario
// porque el frontend puede quedar en otro dominio/puerto), sirve el
// frontend estático desde /public y monta las rutas bajo /api.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const registroRoutes = require("./routes/registro");
const misionesRoutes = require("./routes/misiones");
const estudiantesRoutes = require("./routes/estudiantes");

const app = express();

app.use(cors());
app.use(express.json());

// Frontend estático (tablero de avance)
app.use(express.static(path.join(__dirname, "public")));

// Rutas de la API
app.use("/api", registroRoutes);
app.use("/api", misionesRoutes);
app.use("/api", estudiantesRoutes);

// Ruta de salud, útil para verificar que el server responde tras el deploy
app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "API funcionando correctamente." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
