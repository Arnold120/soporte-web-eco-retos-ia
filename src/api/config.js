/**
 * Configuración central de la aplicación.
 *
 * Toda la comunicación con el backend pasa por este archivo. En MODO DEMO
 * (VITE_DEMO_MODE=true) la app funciona con datos locales; al ponerlo en
 * false comienza a llamar a la API real usando este contrato.
 */
const env = (key, fallback = '') => import.meta.env[key] ?? fallback;

/* ─── Comportamiento general ────────────────────────────────────────────── */

export const API_BASE_URL = env('VITE_API_BASE_URL', '').replace(/\/$/, '');

export const DEMO_MODE = env('VITE_DEMO_MODE', 'true') === 'true';

export const SUPPORT_NAME = env('VITE_SUPPORT_NAME', 'Centro de soporte Eco-Retos');

export const SUPPORT_WEB_URL = env(
  'VITE_SUPPORT_WEB_URL',
  typeof window !== 'undefined' ? window.location.origin : '',
);

/** Tiempo máximo de espera por petición (ms). */
export const API_TIMEOUT_MS = Number(env('VITE_API_TIMEOUT_MS', '20000'));

/** ngrok gratuito exige este header para no devolver su pantalla de aviso. */
export const IS_NGROK = /ngrok/i.test(API_BASE_URL);
export const NGROK_HEADERS = IS_NGROK ? { 'ngrok-skip-browser-warning': 'true' } : {};

/* ─── Bases por módulo ──────────────────────────────────────────────────── */

export const AUTH_BASE = env('VITE_AUTH_BASE', '/api/Auth');
export const SUPPORT_BASE = env('VITE_SUPPORT_BASE', '/api/soporte');
export const DENUNCIAS_BASE = env('VITE_DENUNCIAS_BASE', '/api/denuncias');
export const NOTIFICACIONES_BASE = env('VITE_NOTIFICACIONES_BASE', '/api/notificaciones');
export const IMAGENES_BASE = env('VITE_IMAGENES_BASE', '/api/imagenes');

const url = (base) => `${API_BASE_URL}${base}`;

/**
 * Mapa de endpoints.
 *
 * `existe: true`  -> el endpoint YA existe en el backend actual.
 * `existe: false` -> hace falta crearlo (ver CONECTAR.md).
 */
export const ENDPOINTS = {
  auth: {
    existe: true,
    login: url(`${AUTH_BASE}/login`),
    registrar: url(`${AUTH_BASE}/registrar`),
  },
  notificaciones: {
    existe: true,
    mias: (usuarioId) => url(`${NOTIFICACIONES_BASE}/usuario/${usuarioId}`),
    noLeidas: (usuarioId) => url(`${NOTIFICACIONES_BASE}/usuario/${usuarioId}/no-leidas`),
    totalNoLeidas: (usuarioId) => url(`${NOTIFICACIONES_BASE}/usuario/${usuarioId}/no-leidas/total`),
    marcarLeida: (id) => url(`${NOTIFICACIONES_BASE}/${id}/leida`),
    marcarTodas: (usuarioId) => url(`${NOTIFICACIONES_BASE}/usuario/${usuarioId}/leidas`),
    crear: url(NOTIFICACIONES_BASE),
  },
  imagenes: {
    existe: true,
    subir: url(IMAGENES_BASE),
    archivo: (subcarpeta, nombre) => url(`${IMAGENES_BASE}/archivo/${subcarpeta}/${nombre}`),
  },
  denuncias: {
    existe: 'parcial', // solo POST
    crear: url(DENUNCIAS_BASE),
    listar: url(DENUNCIAS_BASE), // PENDIENTE en backend
  },
  soporte: {
    existe: false, // módulo nuevo propuesto; ver CONECTAR.md
    consentimiento: url(`${SUPPORT_BASE}/consentimiento`),
    crearCaso: url(`${SUPPORT_BASE}/casos`),
    casosMios: url(`${SUPPORT_BASE}/casos/mios`),
    caso: (id) => url(`${SUPPORT_BASE}/casos/${id}`),
    mensajes: (id) => url(`${SUPPORT_BASE}/casos/${id}/mensajes`),
    enviarMensaje: (id) => url(`${SUPPORT_BASE}/casos/${id}/mensajes`),
    leidos: (id) => url(`${SUPPORT_BASE}/casos/${id}/leidos`),
    adminCasos: url(`${SUPPORT_BASE}/admin/casos`),
    adminCaso: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}`),
    adminAsignar: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}/asignar`),
    adminEstado: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}/estado`),
    adminPrioridad: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}/prioridad`),
    adminResolver: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}/resolver`),
    adminNotas: (id) => url(`${SUPPORT_BASE}/admin/casos/${id}/notas`),
    adminDashboard: url(`${SUPPORT_BASE}/admin/dashboard`),
    adminResumen: url(`${SUPPORT_BASE}/admin/resumen`),
    reportes: url(`${SUPPORT_BASE}/reportes`),
    reporte: (id) => url(`${SUPPORT_BASE}/reportes/${id}`),
    reporteAnalizar: (id) => url(`${SUPPORT_BASE}/reportes/${id}/analizar`),
    evidencias: url(`${SUPPORT_BASE}/evidencias`),
    evidencia: (id) => url(`${SUPPORT_BASE}/evidencias/${id}`),
    evidenciaAnalizar: (id) => url(`${SUPPORT_BASE}/evidencias/${id}/analizar`),
    auditoria: url(`${SUPPORT_BASE}/auditoria`),
    auditoriaAcceso: url(`${SUPPORT_BASE}/auditoria/acceso`),
    admins: url(`${SUPPORT_BASE}/admins`),
    admin: (id) => url(`${SUPPORT_BASE}/admins/${id}`),
    config: url(`${SUPPORT_BASE}/config`),
    moderacion: url(`${SUPPORT_BASE}/moderacion/contenido`),
    sesionCodigo: url(`${SUPPORT_BASE}/sesion/codigo`),
    sesionCanjear: url(`${SUPPORT_BASE}/sesion/canjear`),
  },
};
