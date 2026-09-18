/**
 * Cliente HTTP único de la aplicación.
 *
 * Características:
 *  - Añade Authorization: Bearer <JWT> automáticamente.
 *  - Añade el header de ngrok para que no devuelva su pantalla de aviso.
 *  - Timeout configurable con AbortController.
 *  - Emite 'er.session:expired' ante un 401 (el AppContext cierra sesión).
 *  - Soporta JSON y multipart/form-data.
 *  - Traduce errores de red/CORS a mensajes claros para el usuario.
 */
import { API_TIMEOUT_MS, NGROK_HEADERS } from './config.js';

export class ApiError extends Error {
  constructor(status, message, detail) {
    super(message || 'Error de servidor');
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function tokenActual() {
  try {
    return localStorage.getItem('er_token');
  } catch {
    return null;
  }
}

function mensajeDeError(status, data) {
  const delServidor = data?.mensaje || data?.message || data?.title;
  if (delServidor) return delServidor;
  if (status === 400) return 'La solicitud tiene datos inválidos.';
  if (status === 401) return 'Tu sesión expiró o las credenciales no son válidas.';
  if (status === 403) return 'No tienes permisos para realizar esta acción.';
  if (status === 404) return 'No se encontró el recurso solicitado.';
  if (status === 409) return 'Ya existe un registro con esos datos.';
  if (status === 429) return 'Demasiadas solicitudes. Espera un momento.';
  if (status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo.';
  return `Error ${status}`;
}

export async function httpRequest({
  url,
  method = 'GET',
  body,
  token = null,
  headers = {},
  timeout = API_TIMEOUT_MS,
  signal: signalExterno = null,
}) {
  const tokenFinal = token ?? tokenActual();
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const controller = new AbortController();
  const temporizador = setTimeout(() => controller.abort(), timeout);

  const señales = [controller.signal];
  if (signalExterno) señales.push(signalExterno);
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.any
    ? AbortSignal.any(señales)
    : controller.signal;

  try {
    const res = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !esFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(tokenFinal ? { Authorization: `Bearer ${tokenFinal}` } : {}),
        ...NGROK_HEADERS,
        ...headers,
      },
      body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
    });

    let data = null;
    const texto = await res.text();
    if (texto) {
      try {
        data = JSON.parse(texto);
      } catch {
        data = texto;
      }
    }

    if (res.status === 401 && tokenFinal) {
      try {
        window.dispatchEvent(new CustomEvent('er.session:expired'));
      } catch {
        /* entorno sin window */
      }
    }

    if (!res.ok) {
      throw new ApiError(res.status, mensajeDeError(res.status, data), data);
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'La solicitud tardó demasiado. Revisa tu conexión.');
    }
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que permita CORS.',
      err,
    );
  } finally {
    clearTimeout(temporizador);
  }
}

/** Sube un archivo (imagen/video) al endpoint de imágenes del backend. */
export async function subirArchivoMultipart(url, archivo, { token = null, campo = 'archivo' } = {}) {
  const form = new FormData();
  form.append(campo, archivo, archivo.name);
  return httpRequest({ url, method: 'POST', body: form, token, timeout: 120000 });
}
