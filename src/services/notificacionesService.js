/**
 * Notificaciones — usa el backend real si está disponible.
 *
 * Endpoints reales (ya existen, requieren JWT):
 *   GET   /api/Notificaciones/usuario/{id}
 *   PATCH /api/Notificaciones/{id}/leida
 *   PATCH /api/Notificaciones/usuario/{id}/leidas
 */
import { DEMO_MODE, ENDPOINTS } from '../api/config.js';
import { httpRequest } from '../api/httpClient.js';
import { normalizarNotificacion } from '../api/supportApi.js';
import {
  getNotificaciones,
  marcarNotificacion,
  marcarNotificaciones,
} from '../api/mockDb.js';

export async function notificacionesDe(usuarioId) {
  if (DEMO_MODE) return getNotificaciones(usuarioId);
  const r = await httpRequest({ url: ENDPOINTS.notificaciones.mias(usuarioId) });
  return (r.data ?? []).map(normalizarNotificacion);
}

export async function marcarLeida(id, usuarioId) {
  if (DEMO_MODE) {
    marcarNotificacion(id);
    return;
  }
  await httpRequest({ url: ENDPOINTS.notificaciones.marcarLeida(id), method: 'PATCH' });
}

export async function marcarTodasLeidas(usuarioId) {
  if (DEMO_MODE) {
    marcarNotificaciones(usuarioId);
    return;
  }
  await httpRequest({ url: ENDPOINTS.notificaciones.marcarTodas(usuarioId), method: 'PATCH' });
}
