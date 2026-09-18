/**
 * Adaptador REAL del módulo de soporte.
 *
 * Se usa cuando VITE_DEMO_MODE=false. Los endpoints de /api/soporte/* aún no
 * existen en el backend actual; este archivo fija el contrato que deben cumplir
 * (ver CONECTAR.md) y normaliza las respuestas al modelo de la interfaz.
 */
import { ENDPOINTS } from './config.js';
import { httpRequest } from './httpClient.js';

/* ─── Normalizadores (DTO backend -> modelo UI) ─────────────────────────── */

export function normalizarCaso(c = {}) {
  return {
    id: c.id ?? c.casoId ?? c.supportCaseId,
    usuarioId: c.usuarioId,
    usuarioNombre: c.usuarioNombre ?? c.nombreUsuario,
    titulo: c.titulo ?? c.asunto ?? 'Caso de soporte',
    descripcion: c.descripcion ?? '',
    categoria: c.categoria ?? 'OTRO',
    prioridad: c.prioridad ?? 'NORMAL',
    estado: c.estado ?? 'NUEVO',
    consentimiento: c.consentimiento ?? true,
    adminId: c.adminId ?? null,
    adminNombre: c.adminNombre ?? null,
    motivoEscalamiento: c.motivoEscalamiento ?? null,
    resolucion: c.resolucion ?? null,
    notasInternas: c.notasInternas ?? '',
    fechaCreacion: c.fechaCreacion ?? c.fecha ?? new Date().toISOString(),
    fechaActualizacion: c.fechaActualizacion ?? c.fecha ?? new Date().toISOString(),
    fechaCierre: c.fechaCierre ?? null,
  };
}

export function normalizarMensaje(m = {}) {
  return {
    id: m.id ?? m.mensajeId,
    casoId: m.casoId ?? m.supportCaseId,
    remitente: m.remitente ?? m.tipoRemitente ?? 'USUARIO',
    contenido: m.contenido ?? '',
    adjuntos: m.adjuntos ?? [],
    sugerencias: m.sugerencias ?? [],
    fecha: m.fecha ?? new Date().toISOString(),
    leido: m.leido ?? true,
  };
}

export function normalizarNotificacion(n = {}) {
  return {
    id: n.id ?? n.notificacionId,
    usuarioId: n.usuarioId,
    titulo: n.titulo ?? '',
    mensaje: n.mensaje ?? '',
    tipo: n.tipo ?? 'SOPORTE',
    leida: Boolean(n.leida),
    fecha: n.fecha ?? new Date().toISOString(),
    referenciaTipo: n.referenciaTipo ?? null,
    referenciaId: n.referenciaId ?? null,
  };
}

/* ─── Casos (usuario) ───────────────────────────────────────────────────── */

export const soporteApi = {
  async casosMios(usuarioId) {
    const r = await httpRequest({ url: `${ENDPOINTS.soporte.casosMios}?usuarioId=${usuarioId}` });
    return (r.data ?? []).map(normalizarCaso);
  },

  async obtenerCaso(id) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.caso(id) });
    return normalizarCaso(r.data);
  },

  async mensajes(casoId) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.mensajes(casoId) });
    return (r.data ?? []).map(normalizarMensaje);
  },

  async crearCaso(payload) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.crearCaso, method: 'POST', body: payload });
    return normalizarCaso(r.data);
  },

  async enviarMensaje(casoId, payload) {
    const r = await httpRequest({
      url: ENDPOINTS.soporte.enviarMensaje(casoId),
      method: 'POST',
      body: payload,
    });
    const datos = r.data ?? {};
    return {
      usuario: datos.usuario ?? null,
      ia: datos.ia ?? datos.respuestaIA ?? null,
      caso: datos.caso ? normalizarCaso(datos.caso) : null,
      mensajes: (datos.mensajes ?? []).map(normalizarMensaje),
    };
  },

  async responderComoAdmin(casoId, payload) {
    const r = await httpRequest({
      url: ENDPOINTS.soporte.adminCaso(casoId),
      method: 'PATCH',
      body: { respuestaAdmin: payload.contenido, adjuntos: payload.adjuntos ?? [] },
    });
    return normalizarCaso(r.data);
  },

  async actualizarCaso(casoId, cambios) {
    const r = await httpRequest({
      url: ENDPOINTS.soporte.adminCaso(casoId),
      method: 'PATCH',
      body: cambios,
    });
    return normalizarCaso(r.data);
  },

  async casosAdmin(filtros = {}) {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const r = await httpRequest({ url: `${ENDPOINTS.soporte.adminCasos}${qs ? `?${qs}` : ''}` });
    return (r.data ?? []).map(normalizarCaso);
  },

  async dashboard() {
    const r = await httpRequest({ url: ENDPOINTS.soporte.adminDashboard });
    return r.data;
  },

  async reportes(filtros = {}) {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const r = await httpRequest({ url: `${ENDPOINTS.soporte.reportes}${qs ? `?${qs}` : ''}` });
    return r.data ?? [];
  },

  async evidencias(filtros = {}) {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const r = await httpRequest({ url: `${ENDPOINTS.soporte.evidencias}${qs ? `?${qs}` : ''}` });
    return r.data ?? [];
  },

  async auditoria() {
    const r = await httpRequest({ url: ENDPOINTS.soporte.auditoria });
    return r.data ?? [];
  },

  async admins() {
    const r = await httpRequest({ url: ENDPOINTS.soporte.admins });
    return r.data ?? [];
  },

  async crearAdmin(payload) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.admins, method: 'POST', body: payload });
    return r.data;
  },

  async estadoAdmin(id, estado) {
    const r = await httpRequest({
      url: ENDPOINTS.soporte.admin(id),
      method: 'PATCH',
      body: { estado },
    });
    return r.data;
  },

  async config() {
    const r = await httpRequest({ url: ENDPOINTS.soporte.config });
    return r.data ?? {};
  },

  async guardarConfig(cambios) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.config, method: 'PATCH', body: cambios });
    return r.data ?? cambios;
  },

  async registrarDenuncia(payload) {
    const r = await httpRequest({ url: ENDPOINTS.denuncias.crear, method: 'POST', body: payload });
    return r.data;
  },
};
