# LO ÚNICO QUE NECESITO PARA CONECTARLO

El soporte web está **funcionando hoy en modo demo** (`VITE_DEMO_MODE=true`, datos en
localStorage) y ya está **preparado para el backend real**. Esta es la lista exacta de lo que
falta para que quede conectado de punta a punta.

> Regla de oro: **la clave del LLM nunca va en el frontend**. Debe vivir en el backend o en una
> Netlify Function. El frontend solo llama a `/api/soporte/*`.

---

## 1. Lo que YA funciona contra el backend actual

Solo hay que poner `VITE_DEMO_MODE=false` (no requiere ningún cambio del backend):

| Función | Endpoint real | Estado |
|---|---|---|
| Login (JWT) | `POST /api/Auth/login` | ✅ Listo (`{ token, expiraEn, usuario }`) |
| Campana de notificaciones | `GET /api/Notificaciones/usuario/{id}`, `PATCH /{id}/leida`, `PATCH /usuario/{id}/leidas` | ✅ Listo |
| Subida de adjuntos (imagen/video) | `POST /api/Imagenes` (multipart, campo `archivo`) | ✅ Listo (8 MB imagen / 100 MB video) |
| Header de ngrok | `ngrok-skip-browser-warning` automático | ✅ Listo |
| Auto-login sin contraseña | Abrir la web con `?token=<JWT>` | ✅ Listo (la app puede usarlo) |

Además:
- **Timeout** de peticiones configurable (`VITE_API_TIMEOUT_MS`).
- **401** cierra la sesión automáticamente (solo si había token).
- Página **Configuración → Probar conexión** en el panel admin: diagnostica si el backend y
  CORS responden (botón "Probar conexión con el backend").

---

## 2. Lo que falta en el backend (solo AGREGAR, sin tocar lo existente)

### 2.1 CORS — obligatorio (bloquea el login real desde el navegador)

El backend no tiene CORS configurado. Sin esto, la web no puede llamar a la API (fallará el
login real aunque Swagger funcione). Se necesita:

```csharp
// Program.cs (solo agregar)
builder.Services.AddCors(o => o.AddPolicy("soporte", p => p
    .WithOrigins("https://ecoreto.app", "https://TU-SITIO.netlify.app")
    .AllowAnyHeader()
    .AllowAnyMethod()));

// antes de UseAuthentication():
app.UseCors("soporte");
```

Mientras se prueba con ngrok en local, agregar también `http://localhost:5173`.

### 2.2 Endpoints nuevos del módulo de soporte (`/api/soporte/*`)

El contrato está fijado en `src/api/supportApi.js` y `src/api/config.js`. Se proponen:

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/soporte/casos` | Crear caso `{ usuarioId, titulo, descripcion, categoria, consentimiento }` |
| GET | `/api/soporte/casos/mios?usuarioId=` | Casos del usuario |
| GET | `/api/soporte/casos/{id}` | Detalle |
| GET | `/api/soporte/casos/{id}/mensajes` | Conversación |
| POST | `/api/soporte/casos/{id}/mensajes` | Mensaje del usuario; **el backend orquesta la IA** y devuelve `{ caso, mensajes, ia }` |
| PATCH | `/api/soporte/casos/{id}` | Responder como admin / asignar / estado / prioridad / categoría / resolución / notas |
| GET | `/api/soporte/reportes` + `PATCH /{id}` | Listar / resolver / descartar denuncias |
| GET | `/api/soporte/evidencias` + `PATCH /{id}` | Moderar evidencias |
| GET | `/api/soporte/auditoria` | Registro de acciones |
| GET/POST/PATCH | `/api/soporte/admins` | Alta y estado de administradores |
| GET/PATCH | `/api/soporte/config` | Términos y texto de advertencia |
| GET | `/api/soporte/admin/dashboard` | Métricas del panel (opcional: la web las calcula si no existe) |

El adaptador real ya está escrito: al crear los endpoints con estos nombres, la web funciona
sin tocar ni una línea del frontend.

### 2.3 IA (la decisión la debe tomar el backend)

Contrato de respuesta ya fijado en `src/services/iaEngine.js`. El backend debe responder a
`POST /api/soporte/casos/{id}/mensajes` con algo equivalente a:

```json
{
  "caso": { "...": "SupportCase actualizado" },
  "mensajes": [ { "id": 1, "remitente": "IA", "contenido": "…", "sugerencias": ["…"] } ],
  "ia": { "estado": "IA_ATENDIENDO", "categoria": "RETO", "prioridad": "NORMAL",
          "escalar": false, "crearReporte": false, "sugerencias": ["…"] }
}
```

El LLM (OpenAI/Anthropic/otro) se llama desde el backend o una Netlify Function con la clave
en variable de servidor.

### 2.4 Notificaciones automáticas (opcional pero recomendado)

Al escalar, asignar o resolver un caso, crear una fila en `Notificacion` con
`{ usuarioId, titulo, mensaje, tipo, referenciaTipo: "CASO", referenciaId }`. La campana de la
web las mostrará automáticamente (los endpoints ya existen).

---

## 3. Base de datos (propuesta aditiva, sin romper nada)

- Reutilizar `Conversacion` + `Mensaje` con columnas **nuevas y opcionales**:
  `TipoRemitente` (USUARIO/IA/ADMIN) y `Adjuntos`.
- Nueva entidad `SupportCase`: estado, categoría, prioridad, consentimiento, escalamiento,
  resolución, notas internas, admin asignado.
- Nueva entidad `AuditLog` para auditoría (o reutilizar notificaciones + logs).
- No se elimina ni modifica ninguna tabla/columna existente.

---

## 4. Flutter (no hace falta tocarlo)

La pantalla Configuración → "Reportar un problema" ya abre la URL del soporte con
`url_launcher`. Dos opciones:

1. **Sin cambios (funciona ya):** mantiene `https://ecoreto.app/soporte` y el usuario inicia
   sesión manualmente en la web.
2. **SSO automático (recomendado, cambio mínimo):** abrir
   `https://ecoreto.app/soporte?token=<JWT_DE_LA_APP>`. La web detecta el token y entra
   directo. No es obligatorio; el punto 1 ya funciona.

---

## 5. Netlify

Variables de entorno del sitio (Site settings → Environment variables):

```
VITE_API_BASE_URL=https://TU-DOMINIO-O-NGROK
VITE_AUTH_BASE=/api/Auth
VITE_SUPPORT_BASE=/api/soporte
VITE_DENUNCIAS_BASE=/api/denuncias
VITE_NOTIFICACIONES_BASE=/api/notificaciones
VITE_IMAGENES_BASE=/api/imagenes
VITE_SUPPORT_NAME="Centro de soporte Eco-Retos"
VITE_SUPPORT_WEB_URL=https://ecoreto.app/soporte
VITE_API_TIMEOUT_MS=20000
VITE_DEMO_MODE=false        # ← activa el backend real
```

`netlify.toml` ya está configurado (build `npm run build`, publish `dist`, redirect SPA).
El repositorio/carpeta a desplegar es `D:\eco_retos\soporte-web`.

---

## 6. Orden recomendado para conectar

1. Backend: habilitar **CORS** (paso 2.1).
2. Netlify: poner `VITE_DEMO_MODE=false` y las demás variables.
3. Probar login real con `admin@gmai.com` / `admin123` → panel admin.
4. Backend: crear los endpoints de `/api/soporte/*` (paso 2.2) e IA (2.3).
5. Probar el chat: crear caso → IA responde → escalar → responder como admin.
6. Opcional: notificaciones automáticas (2.4) y SSO desde Flutter (4.2).

## 7. Qué NO se toca

- Backend actual (controllers, SQL, BD, JWT, roles): solo **se agregan** endpoints nuevos.
- Flutter: ninguna dependencia ni pantalla nueva (la URL actual ya funciona).
- Datos reales: mientras `VITE_DEMO_MODE=true`, todo es local.
