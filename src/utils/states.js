/**
 * Catálogo central de estados y etiquetas de la aplicación.
 * Los nombres de estado están alineados con la convención del backend
 * (mayúsculas, estilo 'EN_REVISION').
 */

export const ESTADO_CASO = {
  NUEVO: 'NUEVO',
  IA_ATENDIENDO: 'IA_ATENDIENDO',
  EN_REVISION: 'EN_REVISION',
  RESUELTO_POR_IA: 'RESUELTO_POR_IA',
  ESCALADO: 'ESCALADO',
  ASIGNADO: 'ASIGNADO',
  RESUELTO: 'RESUELTO',
  CERRADO: 'CERRADO',
};

export const ESTADO_REPORTE = {
  PENDIENTE: 'PENDIENTE',
  EN_REVISION: 'EN_REVISION',
  RESUELTA: 'RESUELTA',
  DESCARTADA: 'DESCARTADA',
};

export const ESTADO_EVIDENCIA = {
  EN_REVISION: 'EN_REVISION',
  COMPLETADO: 'COMPLETADO',
  RECHAZADO: 'RECHAZADO',
};

export const PRIORIDAD = { BAJA: 'BAJA', NORMAL: 'NORMAL', ALTA: 'ALTA', URGENTE: 'URGENTE' };

export const TIPO_REMITENTE = { USUARIO: 'USUARIO', IA: 'IA', ADMIN: 'ADMIN' };

export const CATEGORIA_CASO = {
  RETO: 'RETO',
  EVIDENCIA: 'EVIDENCIA',
  CONTENIDO: 'CONTENIDO',
  CUENTA: 'CUENTA',
  MONEDERO: 'MONEDERO',
  OTRO: 'OTRO',
};

const MAPA_CASO = {
  [ESTADO_CASO.NUEVO]: { etiqueta: 'Nuevo', color: 'slate' },
  [ESTADO_CASO.IA_ATENDIENDO]: { etiqueta: 'IA atendiendo', color: 'info' },
  [ESTADO_CASO.EN_REVISION]: { etiqueta: 'En revisión', color: 'amber' },
  [ESTADO_CASO.RESUELTO_POR_IA]: { etiqueta: 'Resuelto por IA', color: 'success' },
  [ESTADO_CASO.ESCALADO]: { etiqueta: 'Escalado', color: 'error' },
  [ESTADO_CASO.ASIGNADO]: { etiqueta: 'En atención por admin', color: 'purple' },
  [ESTADO_CASO.RESUELTO]: { etiqueta: 'Resuelto', color: 'success' },
  [ESTADO_CASO.CERRADO]: { etiqueta: 'Cerrado', color: 'muted' },
};

const MAPA_REPORTE = {
  [ESTADO_REPORTE.PENDIENTE]: { etiqueta: 'Pendiente', color: 'amber' },
  [ESTADO_REPORTE.EN_REVISION]: { etiqueta: 'En revisión', color: 'info' },
  [ESTADO_REPORTE.RESUELTA]: { etiqueta: 'Resuelta', color: 'success' },
  [ESTADO_REPORTE.DESCARTADA]: { etiqueta: 'Descartada', color: 'muted' },
};

const MAPA_EVIDENCIA = {
  [ESTADO_EVIDENCIA.EN_REVISION]: { etiqueta: 'En revisión', color: 'amber' },
  [ESTADO_EVIDENCIA.COMPLETADO]: { etiqueta: 'Aceptada', color: 'success' },
  [ESTADO_EVIDENCIA.RECHAZADO]: { etiqueta: 'Rechazada', color: 'error' },
};

const MAPA_PRIORIDAD = {
  [PRIORIDAD.BAJA]: { etiqueta: 'Baja', color: 'muted' },
  [PRIORIDAD.NORMAL]: { etiqueta: 'Normal', color: 'info' },
  [PRIORIDAD.ALTA]: { etiqueta: 'Alta', color: 'amber' },
  [PRIORIDAD.URGENTE]: { etiqueta: 'Urgente', color: 'error' },
};

const MAPA_CATEGORIA = {
  [CATEGORIA_CASO.RETO]: { etiqueta: 'Retos', color: 'success' },
  [CATEGORIA_CASO.EVIDENCIA]: { etiqueta: 'Evidencias', color: 'info' },
  [CATEGORIA_CASO.CONTENIDO]: { etiqueta: 'Contenido', color: 'purple' },
  [CATEGORIA_CASO.CUENTA]: { etiqueta: 'Cuenta', color: 'amber' },
  [CATEGORIA_CASO.MONEDERO]: { etiqueta: 'Monedero', color: 'slate' },
  [CATEGORIA_CASO.OTRO]: { etiqueta: 'Otro', color: 'muted' },
};

export const infoCaso = (estado) => MAPA_CASO[estado] ?? { etiqueta: estado, color: 'muted' };
export const infoReporte = (estado) => MAPA_REPORTE[estado] ?? { etiqueta: estado, color: 'muted' };
export const infoEvidencia = (estado) => MAPA_EVIDENCIA[estado] ?? { etiqueta: estado, color: 'muted' };
export const infoPrioridad = (p) => MAPA_PRIORIDAD[p] ?? { etiqueta: p, color: 'muted' };
export const infoCategoria = (c) => MAPA_CATEGORIA[c] ?? { etiqueta: c, color: 'muted' };

export const ESTADOS_CASO_ORDEN = [
  ['Nuevos', [ESTADO_CASO.NUEVO, ESTADO_CASO.IA_ATENDIENDO]],
  ['Escalados', [ESTADO_CASO.ESCALADO, ESTADO_CASO.ASIGNADO, ESTADO_CASO.EN_REVISION]],
  ['Resueltos', [ESTADO_CASO.RESUELTO, ESTADO_CASO.RESUELTO_POR_IA]],
  ['Cerrados', [ESTADO_CASO.CERRADO]],
];

export const FLUJO_CASO = [
  ESTADO_CASO.NUEVO,
  ESTADO_CASO.IA_ATENDIENDO,
  ESTADO_CASO.EN_REVISION,
  ESTADO_CASO.ESCALADO,
  ESTADO_CASO.ASIGNADO,
  ESTADO_CASO.RESUELTO,
  ESTADO_CASO.CERRADO,
];