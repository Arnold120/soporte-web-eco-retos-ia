/**
 * Adaptador REAL del módulo de soporte.
 *
 * Se usa cuando VITE_DEMO_MODE=false. Consume los endpoints reales de
 * /api/soporte/* (backend .NET) y normaliza las respuestas al modelo de la
 * interfaz: casos, chat, reportes, evidencias, administradores, auditoría,
 * configuración y resumen de actualización automática.
 */
import { ENDPOINTS } from './config.js';
import { httpRequest } from './httpClient.js';
import { resolverUrlArchivo, parsearEvidencia } from '../utils/mediaUrl.js';

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

/**
 * Reporte de contenido al modelo que consume el panel.
 * Usa los nombres reales del backend (ReporteSoporteResponseDto) y resuelve
 * las URLs del contenido reportado para poder previsualizarlo.
 */
export function normalizarReporte(r = {}) {
  const multimedia = (r.contenidoMultimedia ?? []).map((a) => ({
    ...a,
    url: resolverUrlArchivo(a.url),
    tipo: (a.tipo ?? 'imagen').toLowerCase(),
  }));
  return {
    id: r.id,
    tipo: r.tipo ?? 'DENUNCIA',
    usuarioId: r.usuarioId,
    usuarioNombre: r.usuarioNombre ?? '',
    usuarioCorreo: r.usuarioCorreo ?? '',
    descripcion: r.descripcion ?? '',
    categoria: r.categoria ?? 'CONTENIDO',
    prioridad: r.prioridad ?? 'NORMAL',
    estado: r.estado ?? 'PENDIENTE',
    publicacionId: r.publicacionId ?? null,
    comentarioId: r.comentarioId ?? null,
    motivo: r.motivo ?? '',
    evidenciaUrl: resolverUrlArchivo(r.evidenciaUrl ?? ''),
    accion: r.accion ?? null,
    adminId: r.adminId ?? null,
    adminNombre: r.adminNombre ?? null,
    fecha: r.fecha ?? new Date().toISOString(),
    contenidoTipo: r.contenidoTipo ?? null,
    contenidoId: r.contenidoId ?? null,
    contenidoTexto: r.contenidoTexto ?? '',
    contenidoAutorId: r.contenidoAutorId ?? null,
    contenidoAutorNombre: r.contenidoAutorNombre ?? '',
    contenidoAutorCorreo: r.contenidoAutorCorreo ?? '',
    contenidoEstado: r.contenidoEstado ?? null,
    contenidoImagen: resolverUrlArchivo(r.contenidoImagen ?? ''),
    contenidoMultimedia: multimedia,
    enlace: r.enlace ?? null,
    motivoResolucion: r.motivoResolucion ?? null,
    fechaResolucion: r.fechaResolucion ?? null,
    casoId: r.casoId ?? null,
  };
}

/** Evidencia de reto (usuario + reto) al modelo que consume el panel. */
export function normalizarEvidencia(e = {}) {
  const cruda = e.evidencia ?? '';
  const parseada = parsearEvidencia(cruda);
  const adjuntosCrudos = Array.isArray(e.evidenciaAdjuntos) && e.evidenciaAdjuntos.length
    ? e.evidenciaAdjuntos.map((a) => ({ ...a, url: resolverUrlArchivo(a.url), tipo: (a.tipo ?? 'imagen').toLowerCase() }))
    : parseada.adjuntos;
  const tieneVideo = adjuntosCrudos.some((a) => a.tipo === 'video');

  return {
    id: e.id,
    usuarioId: e.usuarioId,
    usuario: e.usuario ?? e.usuarioNombre ?? '',
    usuarioCorreo: e.usuarioCorreo ?? '',
    retoId: e.retoId,
    reto: e.reto ?? e.retoTitulo ?? '',
    retoDescripcion: e.retoDescripcion ?? '',
    retoInstrucciones: e.retoInstrucciones ?? '',
    retoRequisitos: e.retoRequisitos ?? '',
    retoTipoEvidencia: e.retoTipoEvidencia ?? '',
    retoCantidadObjetivo: e.retoCantidadObjetivo ?? null,
    evidenciaCruda: cruda,
    texto: e.evidenciaTexto ?? parseada.texto,
    evidencias: adjuntosCrudos,
    tipo: tieneVideo && !adjuntosCrudos.some((a) => a.tipo === 'imagen') ? 'video' : 'imagen',
    estado: e.estado ?? 'EN_REVISION',
    motivoRechazo: e.motivoRechazo ?? null,
    admin: e.admin ?? null,
    puntosObtenidos: e.puntosObtenidos ?? 0,
    fecha: e.fecha ?? new Date().toISOString(),
    fechaCompletado: e.fechaCompletado ?? null,
    evaluacionIA: e.evaluacionIA ?? null,
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
    return (r.data ?? []).map(normalizarReporte);
  },

  async reporte(id) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.reporte(id) });
    return normalizarReporte(r.data);
  },

  async analizarReporte(id) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.reporteAnalizar(id), method: 'POST' });
    return r.data;
  },

  async evidencias(filtros = {}) {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const r = await httpRequest({ url: `${ENDPOINTS.soporte.evidencias}${qs ? `?${qs}` : ''}` });
    return (r.data ?? []).map(normalizarEvidencia);
  },

  async evidencia(id) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.evidencia(id) });
    return normalizarEvidencia(r.data);
  },

  async analizarEvidencia(id) {
    const r = await httpRequest({ url: ENDPOINTS.soporte.evidenciaAnalizar(id), method: 'POST' });
    return r.data;
  },

  async resumenAdmin() {
    const r = await httpRequest({ url: ENDPOINTS.soporte.adminResumen });
    return r.data;
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
      body: { activo: estado === 'ACTIVO' },
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
