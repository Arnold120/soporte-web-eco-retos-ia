/**
 * Servicio de soporte — fachada única para la UI.
 *
 * - DEMO_MODE=true  → opera sobre mockDb (localStorage), todo inmediato.
 * - DEMO_MODE=false → llama a la API real (ver src/api/supportApi.js).
 *
 * Todas las funciones son asíncronas para que las páginas funcionen igual
 * en ambos modos. La IA de la demo vive en iaEngine.js; en modo real el
 * backend orquesta el LLM y devuelve la conversación actualizada.
 */
import { DEMO_MODE, ENDPOINTS } from '../api/config.js';
import { httpRequest } from '../api/httpClient.js';
import { soporteApi } from '../api/supportApi.js';
import * as mock from '../api/mockDb.js';
import { analizar, construirReporte } from './iaEngine.js';
import { ESTADO_CASO, ESTADO_REPORTE, TIPO_REMITENTE } from '../utils/states.js';
import { notificacionesDe as notifDe, marcarTodasLeidas } from './notificacionesService.js';

const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ─── Usuario (chat) ────────────────────────────────────────────────────── */

export async function casosMios(usuarioId) {
  if (!DEMO_MODE) return soporteApi.casosMios(usuarioId);
  return mock.getCasos({ usuarioId });
}

export async function obtenerCaso(id) {
  if (!DEMO_MODE) return soporteApi.obtenerCaso(id);
  return mock.getCaso(id);
}

export async function mensajesDe(casoId) {
  if (!DEMO_MODE) return soporteApi.mensajes(casoId);
  return mock.getMensajes(casoId);
}

export async function iniciarCaso(usuario, { titulo, descripcion, categoria, terminosVersion }) {
  if (!DEMO_MODE) {
    const caso = await soporteApi.crearCaso({
      usuarioId: usuario.id,
      titulo,
      descripcion,
      categoria,
      consentimiento: true,
      terminosVersion,
    });
    // El backend orquesta la primera respuesta de la IA; aquí se cargan los
    // mensajes para que el chat los muestre al abrir.
    return caso;
  }

  const caso = mock.crearCaso({
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombreUsuario,
    titulo,
    descripcion,
    categoria,
  });

  // La IA responde de inmediato a la descripción inicial del caso.
  const decision = await analizar({
    texto: descripcion || titulo,
    adjuntos: [],
    cantidadMensajesUsuario: 1,
    caso,
  });
  mock.agregarMensaje(caso.id, {
    remitente: TIPO_REMITENTE.IA,
    contenido: decision.mensajeIA,
    adjuntos: [],
    sugerencias: decision.sugerencias ?? [],
  });
  mock.actualizarCaso(caso.id, {
    estado: decision.estado,
    categoria: decision.categoria || caso.categoria,
    prioridad: decision.prioridad || caso.prioridad,
    ...(decision.escalar ? { motivoEscalamiento: decision.motivoEscalamiento } : {}),
  });
  if (decision.crearReporte) {
    mock.crearReporte(
      construirReporte({
        caso: mock.getCaso(caso.id),
        categoria: decision.categoria,
        prioridad: decision.prioridad,
        motivo: decision.motivoEscalamiento,
        adjuntos: [],
      }),
    );
  }
  return mock.getCaso(caso.id);
}

/**
 * Envía un mensaje del usuario y devuelve el estado actualizado.
 * En demo la IA responde con el motor de reglas; en real lo hace el backend.
 */
export async function enviarMensajeUsuario(casoId, { contenido, adjuntos = [] }) {
  if (!DEMO_MODE) {
    const res = await soporteApi.enviarMensaje(casoId, { contenido, adjuntos });
    return {
      caso: res.caso ?? (await soporteApi.obtenerCaso(casoId)),
      mensajes: res.mensajes?.length ? res.mensajes : await soporteApi.mensajes(casoId),
      ia: res.ia,
    };
  }

  const caso = mock.getCaso(casoId);
  if (!caso) throw new Error('Caso no encontrado');

  mock.agregarMensaje(casoId, {
    remitente: TIPO_REMITENTE.USUARIO,
    contenido,
    adjuntos,
  });

  const mensajesUsuario = mock
    .getMensajes(casoId)
    .filter((m) => m.remitente === TIPO_REMITENTE.USUARIO).length;

  const decision = await analizar({
    texto: contenido,
    adjuntos,
    cantidadMensajesUsuario: mensajesUsuario,
    caso,
  });

  mock.agregarMensaje(casoId, {
    remitente: TIPO_REMITENTE.IA,
    contenido: decision.mensajeIA,
    adjuntos: [],
    sugerencias: decision.sugerencias ?? [],
  });

  mock.actualizarCaso(casoId, {
    estado: decision.estado,
    categoria: decision.categoria || caso.categoria,
    prioridad: decision.prioridad || caso.prioridad,
    ...(decision.escalar ? { motivoEscalamiento: decision.motivoEscalamiento } : {}),
    ...(decision.resolver ? { resolucion: decision.mensajeIA } : {}),
  });

  if (decision.crearReporte) {
    mock.crearReporte(
      construirReporte({
        caso: mock.getCaso(casoId),
        categoria: decision.categoria,
        prioridad: decision.prioridad,
        motivo: decision.motivoEscalamiento,
        adjuntos,
      }),
    );
  }

  return {
    caso: mock.getCaso(casoId),
    mensajes: mock.getMensajes(casoId),
    ia: decision,
  };
}

export async function marcarLeidos(casoId) {
  if (!DEMO_MODE) {
    await httpRequest({ url: ENDPOINTS.soporte.leidos(casoId), method: 'POST' });
    return;
  }
  let cambiado = false;
  mock.getMensajes(casoId).forEach((m) => {
    if (m.remitente === TIPO_REMITENTE.USUARIO && !m.leido) {
      m.leido = true;
      cambiado = true;
    }
  });
  // Solo persistir si hubo cambios: evita bucles de refresco entre pantallas.
  if (cambiado) mock.save();
}

/* ─── Admin ─────────────────────────────────────────────────────────────── */

export async function casosAdmin(filtros = {}) {
  if (!DEMO_MODE) return soporteApi.casosAdmin(filtros);
  return mock.getCasos(filtros);
}

export async function ensenarAdminDashboard() {
  // En modo real NUNCA se usa el mock local: si el backend falla, la UI
  // muestra el error y el sondeo reintenta.
  if (!DEMO_MODE) return soporteApi.dashboard();

  const casos = mock.getCasos();
  const reportes = mock.getReportes();
  const act = (estados) => casos.filter((c) => estados.includes(c.estado)).length;
  const resueltos = casos.filter(
    (c) => c.fechaCierre && c.fechaCreacion && [ESTADO_CASO.RESUELTO, ESTADO_CASO.RESUELTO_POR_IA, ESTADO_CASO.CERRADO].includes(c.estado),
  );
  const horasPromedio = resueltos.length
    ? resueltos.reduce((acc, c) => {
        const ms = new Date(c.fechaCierre) - new Date(c.fechaCreacion);
        return acc + ms / 36e5;
      }, 0) / resueltos.length
    : 0;

  return {
    casosNuevos: act([ESTADO_CASO.NUEVO, ESTADO_CASO.IA_ATENDIENDO]),
    escalados: act([ESTADO_CASO.ESCALADO]),
    enAtencion: act([ESTADO_CASO.ASIGNADO, ESTADO_CASO.EN_REVISION]),
    urgencias: casos.filter((c) => c.prioridad === 'URGENTE' && c.estado !== 'CERRADO').length,
    reportesPendientes: reportes.filter(
      (r) => r.estado === ESTADO_REPORTE.PENDIENTE || r.estado === ESTADO_REPORTE.EN_REVISION,
    ).length,
    evidenciasPendientes: mock.getEvidencias({ estado: 'EN_REVISION' }).length,
    casosTotales: casos.length,
    adminsActivos: mock.getAdmins().filter((a) => a.estado === 'ACTIVO').length,
    horasPromedioResolucion: Number(horasPromedio.toFixed(1)),
    actividadReciente: mock.getAudit().slice(0, 8),
    ultimosCasos: casos.slice(0, 6),
  };
}

export async function asignarCaso(id, adminNombre, adminId = null) {
  if (!DEMO_MODE) {
    return soporteApi.actualizarCaso(id, {
      estado: ESTADO_CASO.ASIGNADO,
      ...(adminId ? { adminUsuarioId: Number(adminId) } : {}),
    });
  }
  const admin = adminId
    ? mock.getAdmins().find((a) => a.id === Number(adminId))
    : mock.getAdmins().find((a) => a.nombre === adminNombre);
  return mock.actualizarCaso(id, {
    adminId: admin?.id ?? null,
    adminNombre,
    estado: ESTADO_CASO.ASIGNADO,
  });
}

export async function cambiarEstadoCaso(id, estado) {
  if (!DEMO_MODE) return soporteApi.actualizarCaso(id, { estado });
  return mock.actualizarCaso(id, { estado });
}

export async function cambiarPrioridadCaso(id, prioridad) {
  if (!DEMO_MODE) return soporteApi.actualizarCaso(id, { prioridad });
  return mock.actualizarCaso(id, { prioridad });
}

export async function cambiarCategoriaCaso(id, categoria) {
  if (!DEMO_MODE) return soporteApi.actualizarCaso(id, { categoria });
  return mock.actualizarCaso(id, { categoria });
}

export async function resolverCaso(id, resolucion, adminNombre) {
  if (!DEMO_MODE) {
    return soporteApi.actualizarCaso(id, { resolucion, adminNombre, estado: ESTADO_CASO.RESUELTO });
  }
  return mock.actualizarCaso(id, {
    resolucion,
    adminNombre,
    estado: ESTADO_CASO.RESUELTO,
    fechaCierre: new Date().toISOString(),
  });
}

export async function cerrarCaso(id) {
  if (!DEMO_MODE) return soporteApi.actualizarCaso(id, { estado: ESTADO_CASO.CERRADO });
  return mock.actualizarCaso(id, {
    estado: ESTADO_CASO.CERRADO,
    fechaCierre: new Date().toISOString(),
  });
}

export async function agregarNotasCaso(id, nota) {
  const caso = await obtenerCaso(id);
  const notasInternas = [caso?.notasInternas, nota].filter(Boolean).join('\n');
  if (!DEMO_MODE) return soporteApi.actualizarCaso(id, { notasInternas });
  return mock.actualizarCaso(id, { notasInternas });
}

export async function responderComoAdmin(casoId, contenido, adjuntos = []) {
  if (!DEMO_MODE) return soporteApi.responderComoAdmin(casoId, { contenido, adjuntos });

  const caso = mock.getCaso(casoId);
  if (!caso) throw new Error('Caso no encontrado');
  if (caso.estado !== ESTADO_CASO.ASIGNADO && caso.estado !== ESTADO_CASO.ESCALADO) {
    mock.actualizarCaso(casoId, { estado: ESTADO_CASO.ASIGNADO });
  }
  return mock.agregarMensaje(casoId, {
    remitente: TIPO_REMITENTE.ADMIN,
    contenido,
    adjuntos,
  });
}

/* ─── Reportes / evidencias / administradores ───────────────────────────── */

export async function reportesAdmin(filtros = {}) {
  if (!DEMO_MODE) return soporteApi.reportes(filtros);
  return mock.getReportes(filtros);
}

export async function obtenerReporteAdmin(id) {
  if (!DEMO_MODE) return soporteApi.reporte(id);
  return (mock.getReportes() ?? []).find((r) => r.id === Number(id)) ?? null;
}

export async function analizarReporteAdmin(id) {
  if (!DEMO_MODE) return soporteApi.analizarReporte(id);
  const reporte = (mock.getReportes() ?? []).find((r) => r.id === Number(id)) ?? {};
  const texto = `${reporte.motivo ?? ''} ${reporte.descripcion ?? ''}`.toLowerCase();
  const adultos = /\+18|18\+|adultos|pornograf|desnud|acoso|violencia|amenaza/.test(texto);
  return {
    recomendacion: adultos ? 'OCULTAR_ADVERTIR' : 'REVISAR',
    posibleContenidoAdultos: adultos,
    confianza: adultos ? 65 : 35,
    requiereRevisionHumana: true,
    motivo: adultos
      ? 'Indicios de contenido no permitido; se recomienda ocultar y advertir conservando el registro.'
      : 'No hay elementos suficientes para confirmar una infracción.',
    observaciones: 'Vista previa en modo demo.',
    categoriaSugerida: 'CONTENIDO',
    proveedor: 'reglas',
    fecha: new Date().toISOString(),
  };
}

export async function resolverReporteAdmin(id, accion, adminNombre, motivo = '') {
  if (!DEMO_MODE) {
    return httpRequest({
      url: ENDPOINTS.soporte.reporte(id),
      method: 'PATCH',
      body: { accion, estado: ESTADO_REPORTE.RESUELTA, motivo },
    });
  }
  return mock.resolverReporte(id, { accion, adminNombre, motivo });
}

export async function descartarReporteAdmin(id, adminNombre, motivo = '') {
  if (!DEMO_MODE) {
    return httpRequest({
      url: ENDPOINTS.soporte.reporte(id),
      method: 'PATCH',
      body: { estado: ESTADO_REPORTE.DESCARTADA, motivo },
    });
  }
  return mock.resolverReporte(id, { adminNombre, estado: ESTADO_REPORTE.DESCARTADA, motivo });
}

export async function evidenciasAdmin(filtros = {}) {
  if (!DEMO_MODE) return soporteApi.evidencias(filtros);
  return mock.getEvidencias(filtros);
}

export async function obtenerEvidenciaAdmin(id) {
  if (!DEMO_MODE) return soporteApi.evidencia(id);
  return (mock.getEvidencias() ?? []).find((e) => e.id === Number(id)) ?? null;
}

export async function analizarEvidenciaAdmin(id) {
  if (!DEMO_MODE) return soporteApi.analizarEvidencia(id);
  const evidencia = await obtenerEvidenciaAdmin(id);
  if (!evidencia) return null;
  const adjuntos = evidencia.evidencias ?? [];
  const texto = (evidencia.texto ?? '').trim();
  const tipo = (evidencia.retoTipoEvidencia ?? '').toUpperCase();
  const pideImagen = ['FOTO', 'GALERIA', 'VIDEO'].includes(tipo);
  const pideTexto = ['TEXTO', 'RESPUESTA'].includes(tipo);
  const faltantes = [];
  if (pideImagen && adjuntos.length === 0) faltantes.push('Fotografía de la evidencia');
  if (pideTexto && texto.length === 0) faltantes.push('Texto de la evidencia');
  return {
    cumple: faltantes.length === 0,
    confianza: faltantes.length === 0 ? 40 : 85,
    requiereRevisionHumana: true,
    motivo: faltantes.length === 0
      ? 'La evidencia contiene los elementos solicitados por el reto.'
      : 'Faltan elementos obligatorios para validar la evidencia.',
    elementosFaltantes: faltantes,
    observaciones: 'Vista previa en modo demo.',
    proveedor: 'reglas',
    fecha: new Date().toISOString(),
  };
}

export async function decidirEvidencia(id, resultado, motivoRechazo = '') {
  if (!DEMO_MODE) {
    return httpRequest({
      url: ENDPOINTS.soporte.evidencia(id),
      method: 'PATCH',
      body: { estado: resultado, motivoRechazo, puntosObtenidos: 0 },
    });
  }
  return mock.actualizarEvidencia(id, resultado, resultado === 'RECHAZADO' ? motivoRechazo : '');
}

export async function adminsLista() {
  if (!DEMO_MODE) return soporteApi.admins();
  return mock.getAdmins();
}

export function obtenerAdminPorNombre(nombre) {
  return mock.getAdmins().find((a) => a.nombre === nombre) ?? null;
}

export async function crearAdmin({ nombre, correo, contrasena }) {
  if (!DEMO_MODE) return soporteApi.crearAdmin({ nombre, correo, contrasena });
  const admin = mock.agregarAdmin({ nombre, correo });
  if (!admin) return { admin: null, contrasenaTemporal: null, usuarioExistente: true };
  return { admin, contrasenaTemporal: null, usuarioExistente: false };
}

export async function activarAdmin(id, activo) {
  const estado = activo ? 'ACTIVO' : 'INACTIVO';
  if (!DEMO_MODE) return soporteApi.estadoAdmin(id, estado);
  return mock.setAdminEstado(id, estado);
}

/* ─── Auditoría / notificaciones / configuración ────────────────────────── */

export async function auditoria() {
  if (!DEMO_MODE) return soporteApi.auditoria();
  return mock.getAudit();
}

export async function notificacionesDe(usuarioId) {
  return notifDe(usuarioId);
}

export async function notificacionesLeidasAdmin(usuarioId) {
  return marcarTodasLeidas(usuarioId);
}

export async function configuracionSoporte() {
  if (!DEMO_MODE) return soporteApi.config();
  return mock.getSettings();
}

export async function guardarConfiguracion(cambios) {
  if (!DEMO_MODE) return soporteApi.guardarConfig(cambios);
  mock.actualizarSettings(cambios);
  return cambios;
}

/** Registra en auditoría el acceso al panel (se llama una vez por sesión). */
export async function registrarAccesoPanel() {
  if (!DEMO_MODE) {
    try {
      await httpRequest({ url: ENDPOINTS.soporte.auditoriaAcceso, method: 'POST' });
    } catch {
      /* la auditoría no debe bloquear el panel */
    }
    return;
  }
  mock.registrarAuditoria('ADMIN', 'ACCESO_PANEL', 'Panel', null, null, null, 'Acceso al panel de administración');
}

/** Moderación de contenido: ocultar publicación o comentario (sin eliminarlo). */
export async function moderarContenido({ objetivo, id, accion, motivo, reporteId = null }) {
  if (!DEMO_MODE) {
    return httpRequest({
      url: ENDPOINTS.soporte.moderacion,
      method: 'POST',
      body: { objetivo, id, accion, motivo, reporteId },
    });
  }
  mock.registrarAuditoria(
    'ADMIN',
    accion === 'OCULTAR' ? 'OCULTAR_PUBLICACION' : 'OCULTAR_COMENTARIO',
    objetivo === 'PUBLICACION' ? 'Publicacion' : 'Comentario',
    id,
    null,
    accion,
    motivo,
  );
  return true;
}

/** Resumen ligero para la actualización automática del panel. */
export async function resumenAdmin() {
  if (!DEMO_MODE) return soporteApi.resumenAdmin();
  const casos = mock.getCasos();
  const reportes = mock.getReportes();
  const evidencias = mock.getEvidencias({ estado: 'EN_REVISION' });
  const ultimo = (lista) => lista.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const resumen = {
    casosTotales: casos.length,
    casosNuevos: casos.filter((c) => ['NUEVO', 'IA_ATENDIENDO'].includes(c.estado)).length,
    escalados: casos.filter((c) => c.estado === 'ESCALADO').length,
    enAtencion: casos.filter((c) => ['ASIGNADO', 'EN_REVISION'].includes(c.estado)).length,
    urgencias: casos.filter((c) => c.prioridad === 'URGENTE' && c.estado !== 'CERRADO').length,
    reportesPendientes: reportes.filter((r) => ['PENDIENTE', 'EN_REVISION'].includes(r.estado)).length,
    evidenciasPendientes: evidencias.length,
    ultimoCasoId: ultimo(casos),
    ultimoReporteId: ultimo(reportes),
    ultimaEvidenciaId: ultimo(evidencias),
  };
  resumen.firma = [
    resumen.casosTotales, resumen.casosNuevos, resumen.escalados, resumen.enAtencion,
    resumen.urgencias, resumen.reportesPendientes, resumen.evidenciasPendientes,
    resumen.ultimoCasoId, resumen.ultimoReporteId, resumen.ultimaEvidenciaId,
  ].join('|');
  return resumen;
}

export async function quitarAdmin(id) {
  if (!DEMO_MODE) {
    return httpRequest({ url: ENDPOINTS.soporte.admin(id), method: 'DELETE' });
  }
  return mock.eliminarAdmin(id);
}

export function registrarAuditoria() {
  // En demo la auditoría la escriben las mutaciones de mockDb; en real la escribe el backend.
  return null;
}
