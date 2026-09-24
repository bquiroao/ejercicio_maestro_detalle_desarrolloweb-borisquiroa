# Reto: API Maestro-Detalle con Catálogo y Control de Estado

Práctica para el examen de Desarrollo Web. Implementa exactamente lo que pide el
enunciado: un POST maestro-detalle que registra/actualiza un estudiante y sus
misiones, validando contra un catálogo.

## Estructura

```
reto-api/
├── server.js              # Punto de entrada, monta Express y las rutas
├── db/db.js                # Pool de conexión a SQL Server (mssql)
├── routes/registro.js      # POST /api/registro  (el endpoint clave del reto)
├── routes/misiones.js      # GET  /api/misiones   (catálogo)
├── routes/estudiantes.js   # GET  /api/estudiantes (listado con avance)
├── public/index.html       # Frontend: tablero de avance
├── .env                     # Credenciales de conexión (NO subir a GitHub)
└── .gitignore
```

## Cómo correrlo en tu máquina

1. Instalar dependencias:
   ```
   npm install
   ```
2. Levantar el servidor:
   ```
   npm start
   ```
3. Abrir `http://localhost:3000` para ver el tablero, o probar el endpoint con
   Postman/Insomnia/Thunder Client.

> **Nota:** este entorno donde armamos el código no tiene salida a internet
> hacia npm ni hacia el servidor SQL Server de la universidad (política de
> red del sandbox), así que no pude correrlo ni conectarlo de verdad aquí.
> El código está completo y revisado (sintaxis validada), pero pruébalo en tu
> computadora o en el hosting antes del examen para confirmar que conecta bien
> con esas credenciales.

## Probar el POST /api/registro

Con el JSON de ejemplo del enunciado:

```bash
curl -X POST http://localhost:3000/api/registro \
  -H "Content-Type: application/json" \
  -d '{
    "maestro": {
      "carnet": "1890-20-11489",
      "nombre": "MERCEDES AZUCENA LOPEZ PEREZ",
      "correo": "mlopezp58@miumg.edu.gt"
    },
    "detalle": [
      { "misionId": 1, "estado": true },
      { "misionId": 2, "estado": false },
      { "misionId": 3, "estado": true }
    ]
  }'
```

Si envías el mismo JSON otra vez, no debe duplicar filas: debe **actualizar**
(por eso se usa `MERGE`, no `INSERT` a secas).

Si mandas un `misionId` que no existe en la tabla `Misiones`, la API debe
responder con error 409 y **no** debe insertar nada de ese registro (por eso
todo corre dentro de una transacción).

## Puntos clave para el examen (por qué está hecho así)

- **Upsert con MERGE**: en SQL Server, `MERGE ... WHEN MATCHED ... WHEN NOT
  MATCHED` es la forma estándar de "insertar si no existe, actualizar si
  existe" en una sola sentencia. Se usa tanto para `Estudiantes` (maestro)
  como para `EstudianteMisiones` (detalle).
- **Validación de catálogo (integridad referencial a nivel de aplicación)**:
  antes de insertar en `EstudianteMisiones`, se hace un `SELECT` a `Misiones`
  para confirmar que el `MisionID` existe. Si no existe, se corta con un
  error 409 (conflicto/referencia inválida) en vez de dejar que SQL Server
  reviente con un error de FK menos claro.
- **Transacción (`sql.Transaction`)**: como el detalle es un arreglo con
  varias misiones, si una falla a mitad de camino, se hace `rollback()` de
  todo el registro para no dejar datos a medias (atomicidad).
- **Clave compuesta Carnet+MisionID**: por eso el `MERGE` de
  `EstudianteMisiones` compara por ambas columnas — coincide con el
  `UNIQUE (Carnet, MisionID)` del diagrama.
- **Pool de conexiones (`ConnectionPool`)**: nunca se abre una conexión nueva
  por cada request; se crea un pool una vez (`db/db.js`) y se reutiliza. Es
  el patrón que se espera en cualquier API con SQL Server.
- **Consulta con JOIN + agrupación en memoria (`/api/estudiantes`)**: el SQL
  regresa filas planas (una por cada misión de cada estudiante); el código
  las agrupa en un array de objetos anidados para que el frontend pueda
  pintar "estudiante -> lista de misiones" fácilmente. Es un patrón muy común
  cuando se arma un JSON maestro-detalle a partir de un JOIN relacional.

## Publicar (paso 6 del enunciado)

1. Sube el código a un repo de GitHub (el `.gitignore` ya excluye `.env` para
   no filtrar la contraseña de la base de datos).
2. Backend: despliega en algo como Render, Railway o Azure App Service, y
   configura ahí las mismas variables de entorno del `.env` (no subas el
   archivo, solo configúralas en el panel del hosting).
3. Frontend: si lo separas, puedes subir `public/index.html` a GitHub Pages,
   pero cambia el `fetch("/api/estudiantes")` para que apunte a la URL
   completa del backend desplegado.
