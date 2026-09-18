/**
 * Base de datos demo (MODO DEMO).
 *
 * Persistida en localStorage. Cada mutación emite el evento
 * 'er.db:change' para que la interfaz se refresque en vivo.
 *
 * La estructura replica las entidades que el backend real debería
 * exponer (SupportCase, Mensaje, Denuncia, Notificacion, AuditLog)
 * y está pensada para que el adaptador real solo reemplace estas
 * funciones por llamadas al API (ver src/services/*.js).
 */
import {
  ESTADO_CASO,
  ESTADO_REPORTE,
  ESTADO_EVIDENCIA,
  TIPO_REMITENTE,
  PRIORIDAD,
  CATEGORIA_CASO,
} from '../utils/states.js';
import { placeholderImg } from '../utils/format.js';

const KEY = 'er_soporte_db_v1';

const iso = (offsetMin = 0) => new Date(Date.now() - offsetMin * 60000).toISOString();

function mensaje(casoId, remitente, contenido, offsetMin, adjuntos = [], sugerencias = []) {
  return {
    id: auto(999), casoId, remitente, contenido, adjuntos, sugerencias, fecha: iso(offsetMin), leido: true,
  };
}

let _auto = 0;
function auto(base) {
  _auto += 1;
  return base + _auto;
}
function nextId() {
  _auto += 1;
  return Math.floor(Math.random() * 90000) + 10000 + _auto;
}

function seed() {
  const users = [
    { id: 1, nombreUsuario: 'Admin', correo: 'admin@gmai.com', rol: 'ADMIN', activo: true, fechaRegistro: iso(90 * 24 * 60) },
    { id: 2, nombreUsuario: 'maria.lopez', correo: 'maria@eco-retos.test', rol: 'ESTUDIANTE', activo: true, fechaRegistro: iso(60 * 24 * 60) },
    { id: 3, nombreUsuario: 'carlos.martinez', correo: 'carlos@eco-retos.test', rol: 'ESTUDIANTE', activo: true, fechaRegistro: iso(50 * 24 * 60) },
    { id: 4, nombreUsuario: 'ana.gutierrez', correo: 'ana@eco-retos.test', rol: 'ESTUDIANTE', activo: true, fechaRegistro: iso(40 * 24 * 60) },
    { id: 5, nombreUsuario: 'sofia.ordonez', correo: 'sofia@eco-retos.test', rol: 'ADMIN', activo: true, fechaRegistro: iso(45 * 24 * 60) },
    { id: 6, nombreUsuario: 'luis.ramirez', correo: 'luis@eco-retos.test', rol: 'ADMIN', activo: true, fechaRegistro: iso(30 * 24 * 60) },
  ];

  const admins = users.filter((u) => u.rol === 'ADMIN').map((u) => ({
    id: u.id, nombre: u.nombreUsuario, correo: u.correo, estado: 'ACTIVO',
    rol: 'ADMIN', fechaCreacion: u.fechaRegistro, ultimaActividad: iso(180),
  }));

  const evidenciasImg = [
    placeholderImg('E1', '#2E7D32'),
    placeholderImg('E2', '#00695C'),
    placeholderImg('E3', '#B26A00'),
    placeholderImg('E4', '#6A1B9A'),
  ];

  const cases = [
    {
      id: 101,
      usuarioId: 2,
      usuarioNombre: 'maria.lopez',
      titulo: 'No puedo subir la evidencia de mi reto de reciclaje',
      descripcion: 'Estoy teniendo problemas con un reto.',
      categoria: CATEGORIA_CASO.EVIDENCIA,
      prioridad: PRIORIDAD.NORMAL,
      estado: ESTADO_CASO.ASIGNADO,
      consentimiento: true, fechaConsentimiento: iso(220),
      adminId: 1,
      motivoEscalamiento: 'El usuario no puede completar la acción y la IA requiere validación de la evidencia.',
      resolucion: null,
      notasInternas: 'Revisar si el error viene de la subida de imagen o del tipo de archivo.',
      fechaCreacion: iso(228),
      fechaActualizacion: iso(40),
      fechaCierre: null,
    },
    {
      id: 102,
      usuarioId: 3,
      usuarioNombre: 'carlos.martinez',
      titulo: 'Reporte de contenido inapropiado en el muro',
      descripcion: 'Vi una publicación con contenido +18 en el muro.',
      categoria: CATEGORIA_CASO.CONTENIDO,
      prioridad: PRIORIDAD.ALTA,
      estado: ESTADO_CASO.ESCALADO,
      consentimiento: true, fechaConsentimiento: iso(160),
      adminId: null,
      motivoEscalamiento: 'Reporte grave de contenido (posible contenido para adultos). Requiere moderación humana.',
      resolucion: null,
      notasInternas: '',
      fechaCreacion: iso(165),
      fechaActualizacion: iso(65),
      fechaCierre: null,
    },
    {
      id: 103,
      usuarioId: 4,
      usuarioNombre: 'ana.gutierrez',
      titulo: 'No me llegan las monedas del reto completado',
      descripcion: 'Completé un reto y no se me sumaron las monedas al monedero.',
      categoria: CATEGORIA_CASO.MONEDERO,
      prioridad: PRIORIDAD.ALTA,
      estado: ESTADO_CASO.RESUELTO_POR_IA,
      consentimiento: true, fechaConsentimiento: iso(400),
      adminId: null,
      motivoEscalamiento: null,
      resolucion: 'Se verificó el registro: el reto aparecía pendiente de revisión. Las monedas se acreditan 24 h después de aprobado el reto.',
      notasInternas: '',
      fechaCreacion: iso(410),
      fechaActualizacion: iso(300),
      fechaCierre: iso(300),
    },
    {
      id: 104,
      usuarioId: 2,
      usuarioNombre: 'maria.lopez',
      titulo: 'Quiero cambiar mi correo electrónico',
      descripcion: 'Necesito actualizar el correo de mi cuenta.',
      categoria: CATEGORIA_CASO.CUENTA,
      prioridad: PRIORIDAD.BAJA,
      estado: ESTADO_CASO.CERRADO,
      consentimiento: true, fechaConsentimiento: iso(3 * 24 * 60),
      adminId: 5,
      motivoEscalamiento: null,
      resolucion: 'El correo se actualizó correctamente desde Configuración.',
      notasInternas: '',
      fechaCreacion: iso((3 * 24 * 60) + 30),
      fechaActualizacion: iso((2 * 24 * 60) + 10),
      fechaCierre: iso(2 * 24 * 60),
    },
    {
      id: 105,
      usuarioId: 3,
      usuarioNombre: 'carlos.martinez',
      titulo: 'Error al cargar una trivia',
      descripcion: 'La trivia de reforestación se cierra al responder la pregunta 3.',
      categoria: CATEGORIA_CASO.OTRO,
      prioridad: PRIORIDAD.NORMAL,
      estado: ESTADO_CASO.NUEVO,
      consentimiento: true, fechaConsentimiento: iso(28),
      adminId: null,
      motivoEscalamiento: null,
      resolucion: null,
      notasInternas: '',
      fechaCreacion: iso(32),
      fechaActualizacion: iso(28),
      fechaCierre: null,
    },
    {
      id: 106,
      usuarioId: 4,
      usuarioNombre: 'ana.gutierrez',
      titulo: 'Evidencia rechazada por error',
      descripcion: 'Mi evidencia del reto de ahorro de agua fue rechazada y creo que sí cumple.',
      categoria: CATEGORIA_CASO.RETO,
      prioridad: PRIORIDAD.ALTA,
      estado: ESTADO_CASO.EN_REVISION,
      consentimiento: true, fechaConsentimiento: iso(120),
      adminId: 6,
      motivoEscalamiento: null,
      resolucion: null,
      notasInternas: '',
      fechaCreacion: iso(125),
      fechaActualizacion: iso(80),
      fechaCierre: null,
    },
  ];

  const messages = [
    // Caso 101 — chat con IA + admin
    mensaje(101, TIPO_REMITENTE.USUARIO, 'Estoy teniendo problemas con un reto.', 227),
    mensaje(101, TIPO_REMITENTE.IA, 'Hola María 👋 Entiendo, voy a ayudarte a identificar el problema. ¿Qué reto estás intentando completar y qué pasa exactamente al enviar la evidencia?', 226.5),
    mensaje(101, TIPO_REMITENTE.USUARIO, 'Es el reto de reciclaje "Separa tus residuos". Cuando subo la foto de la evidencia me queda en "En revisión" y no avanza.', 225),
    mensaje(101, TIPO_REMITENTE.IA, 'Gracias, eso me ayuda. ¿La foto que intentas subir es un archivo JPG o PNG tomado con tu celular? ¿Recibes algún mensaje de error en pantalla?', 224),
    mensaje(101, TIPO_REMITENTE.USUARIO, 'Sí, es JPG de mi celular. Sale un error que dice "archivo no válido".', 223),
    mensaje(101, TIPO_REMITENTE.IA, 'Entendido. El límite de imágenes es de 8 MB en el formato correcto (JPG/PNG/WEBP). Voy a escalar tu caso a un administrador porque puede que tu archivo supere el tamaño permitido o haya un problema de validación. Te notificaremos cuando te atiendan.', 220, [
      { url: placeholderImg('IMG', '#2E7D32'), tipo: 'imagen', nombre: 'screenshot_error.png' },
    ]),
    mensaje(101, TIPO_REMITENTE.ADMIN, 'Hola María, soy un administrador del soporte. Ya revisé tu captura: el archivo pesa 9.2 MB y supera el límite de 8 MB. Comprime la foto o reduce la resolución y vuelve a intentarlo.', 90),
    mensaje(101, TIPO_REMITENTE.ADMIN, 'En Configuración > Cambiar contraseña no hay vínculo con esto; utiliza cualquier app de compresión o reenvía la foto por WhatsApp para que se comprima automáticamente.', 89),
    mensaje(101, TIPO_REMITENTE.USUARIO, '¡Gracias! Comprimí la imagen y ya pude enviar la evidencia. 🙌', 42),
    mensaje(101, TIPO_REMITENTE.ADMIN, 'Perfecto, queda en revisión por el equipo. Cualquier cosa, aquí estamos.', 40),
    // Caso 102 — reporte de contenido escalado
    mensaje(102, TIPO_REMITENTE.USUARIO, 'Quiero reportar una publicación que vi en el muro, es inapropiada.', 164),
    mensaje(102, TIPO_REMITENTE.IA, 'Gracias, tus reportes nos ayudan a cuidar la comunidad. ¿Qué tipo de contenido es? (Contenido +18, fotografía/video inapropiado, enlace sospechoso, otro)', 163),
    mensaje(102, TIPO_REMITENTE.USUARIO, 'Es una fotografía con contenido +18.', 162),
    mensaje(102, TIPO_REMITENTE.IA, 'Este tipo de reporte es grave y requiere moderación por un humano. He creado el reporte y escalado el caso. La publicación quedará oculta para el público mientras se revisa.', 161, [
      { url: placeholderImg('+18', '#B71C1C'), tipo: 'imagen', nombre: 'captura_publicacion.png' },
    ]),
    mensaje(102, TIPO_REMITENTE.IA, 'Escalado al equipo de administradores. Tendrás notificación cuando se resuelva.', 161),
    // Caso 103 — resuelto por IA
    mensaje(103, TIPO_REMITENTE.USUARIO, 'Complete un reto de ahorro de agua y no recibo las monedas.', 409),
    mensaje(103, TIPO_REMITENTE.IA, 'Entiendo. ¿El reto figura como "Completado" en tu lista o sigue en "En revisión"?', 408),
    mensaje(103, TIPO_REMITENTE.USUARIO, 'Aparece como completado desde ayer.', 407),
    mensaje(103, TIPO_REMITENTE.IA, 'Gracias. Las monedas se acreditan automáticamente dentro de las 24 h posteriores a su aprobación. Si pasado ese tiempo no aparecen, este chat queda abierto para revisarlo. Tu caso lo resolví con esta información.', 406),
    mensaje(103, TIPO_REMITENTE.IA, 'Caso resuelto ✔️ Si después de 24 h no ves las monedas, abre un nuevo caso y lo escalamos a un administrador.', 406),
    // Caso 104 — cerrado tras admin
    mensaje(104, TIPO_REMITENTE.USUARIO, 'Quiero cambiar el correo de mi cuenta, ¿cómo lo hago?', (3 * 24 * 60) + 29),
    mensaje(104, TIPO_REMITENTE.IA, 'Claro. Si tu correo es para iniciar sesión, puedes cambiarlo desde Configuración > "Nombre de usuario y correo". ¿Necesitas ayuda con el proceso?', (3 * 24 * 60) + 28),
    mensaje(104, TIPO_REMITENTE.USUARIO, 'Encaja en mis planes. ¡Listo, lo hice! Pero al hacer login me pedía el nuevo correo y no lo tenía a mano.', (2 * 24 * 60) + 12),
    mensaje(104, TIPO_REMITENTE.ADMIN, 'Perfecto, confirmamos que el cambio fue correcto. Recuerda que al iniciar sesión debes usar el correo nuevo.', 2 * 24 * 60),
    // Caso 105 — nuevo, solo IA
    mensaje(105, TIPO_REMITENTE.USUARIO, 'La trivia de reforestación se cierra al responder la pregunta 3.', 31),
    mensaje(105, TIPO_REMITENTE.IA, 'Voy a ayudarte. ¿En qué dispositivo la jugaste (celular Android, iPhone o web) y con qué versión de la app?', 30),
    mensaje(105, TIPO_REMITENTE.USUARIO, 'En Android, la app actualizada de la semana pasada.', 28),
    mensaje(105, TIPO_REMITENTE.IA, 'Gracias. Estoy registrando el caso; un administrador revisará si es un problema generalizado. Te respondemos pronto.', 28),
    // Caso 106 — en revisión
    mensaje(106, TIPO_REMITENTE.USUARIO, 'Mi evidencia del reto de ahorro de agua fue rechazada, pero sí cumple con lo pedido.', 124),
    mensaje(106, TIPO_REMITENTE.IA, 'Vamos a revisarlo. El motivo del rechazo dice: "El contenido enviado no demuestra que el reto haya sido completado." ¿Puedes adjuntar la foto que enviaste para compararla?', 123),
    mensaje(106, TIPO_REMITENTE.USUARIO, 'Esta es la foto que envié.', 122, [
      { url: placeholderImg('AG', '#00695C'), tipo: 'imagen', nombre: 'evidencia_reto_agua.jpeg' },
    ]),
    mensaje(106, TIPO_REMITENTE.ADMIN, 'Hola Ana, revisamos tu caso: la foto sí muestra el medidor. Rechazo corregido, tu reto quedó aprobado. El motivo del rechazo anterior fue un error humano de captura.', 80),
  ];

  const reports = [
    {
      id: 501,
      usuarioId: 3,
      usuarioNombre: 'carlos.martinez',
      categoria: CATEGORIA_CASO.CONTENIDO,
      descripcion: 'Fotografía con contenido +18 publicado en el muro comunitario.',
      evidencia: placeholderImg('+18', '#B71C1C'),
      fecha: iso(162),
      prioridad: PRIORIDAD.URGENTE,
      estado: ESTADO_REPORTE.PENDIENTE,
      casoId: 102,
      motivoEscalamiento: 'Reporte grave: posible contenido para adultos.',
      accion: null,
      adminId: null,
    },
    {
      id: 502,
      usuarioId: 2,
      usuarioNombre: 'maria.lopez',
      categoria: CATEGORIA_CASO.CONTENIDO,
      descripcion: 'Publicidad no deseada en el muro.',
      evidencia: '', fecha: iso(900),
      prioridad: PRIORIDAD.NORMAL,
      estado: ESTADO_REPORTE.RESUELTA,
      casoId: null,
      motivoEscalamiento: null,
      accion: 'ADVERTENCIA',
      adminId: 1,
    },
    {
      id: 503,
      usuarioId: 4,
      usuarioNombre: 'ana.gutierrez',
      categoria: CATEGORIA_CASO.CONTENIDO,
      descripcion: 'Comentario con lenguaje ofensivo bajo una publicación.',
      evidencia: '', fecha: iso(2200),
      prioridad: PRIORIDAD.NORMAL,
      estado: ESTADO_REPORTE.DESCARTADA,
      casoId: null,
      motivoEscalamiento: null,
      accion: 'SIN_ACCION',
      adminId: 5,
    },
  ];

  const evidence = [
    {
      id: 601, usuarioId: 2, usuario: 'maria.lopez', reto: 'Separa tus residuos', evidencias: [evaluacionImg(7)], tipo: 'imagen', fecha: iso(55), estado: ESTADO_EVIDENCIA.EN_REVISION, motivoRechazo: null, admin: null,
    },
    {
      id: 602, usuarioId: 3, usuario: 'carlos.martinez', reto: 'Ahorro de agua en tu hogar', evidencias: [evaluacionImg(8)], tipo: 'imagen', fecha: iso(300), estado: ESTADO_EVIDENCIA.COMPLETADO, motivoRechazo: null, admin: 'admin',
    },
    {
      id: 603, usuarioId: 4, usuario: 'ana.gutierrez', reto: 'Movilidad sostenible: usa tu bici', evidencias: [evaluacionImg(9)], tipo: 'imagen', fecha: iso(1500), estado: ESTADO_EVIDENCIA.COMPLETADO, motivoRechazo: null, admin: 'sofia.ordonez',
    },
    {
      id: 604, usuarioId: 2, usuario: 'maria.lopez', reto: 'Planta un árbol', evidencias: [evaluacionImg(10)], tipo: 'video', fecha: iso(6000), estado: ESTADO_EVIDENCIA.RECHAZADO, motivoRechazo: 'El contenido enviado no demuestra que el reto haya sido completado. Por favor, vuelve a realizarlo y proporciona una fotografía donde se pueda comprobar el resultado.', admin: 'luis.ramirez',
    },
  ];

  const auditSeed = [
    audit(1, 'IA', 'CREAR_CASO', 'SupportCase', 101, null, ESTADO_CASO.NUEVO, 'Apertura automática por chat IA'),
    audit(1, 'IA', 'ESCALAR_CASO', 'SupportCase', 101, ESTADO_CASO.IA_ATENDIENDO, ESTADO_CASO.ESCALADO, 'No puede resolverse sin validación humana de la evidencia'),
    audit(1, 'admin', 'ASIGNAR_CASO', 'SupportCase', 101, ESTADO_CASO.ESCALADO, ESTADO_CASO.ASIGNADO, 'Asignado para revisión de subida de evidencia'),
    audit(1, 'IA', 'CREAR_REPORTE', 'Denuncia', 501, null, ESTADO_REPORTE.PENDIENTE, 'Reporte generado desde chat por contenido +18'),
    audit(1, 'IA', 'RESOLVER_CASO', 'SupportCase', 103, ESTADO_CASO.IA_ATENDIENDO, ESTADO_CASO.RESUELTO_POR_IA, 'Problema resuelto con preguntas de diagnóstico: monedas acreditadas en 24 h'),
    audit(1, 'admin', 'RESOLVER_REPORTE', 'Denuncia', 502, ESTADO_REPORTE.PENDIENTE, ESTADO_REPORTE.RESUELTA, 'Advertencia enviada al autor de la publicación'),
    audit(1, 'sofia.ordonez', 'RESOLVER_CASO', 'SupportCase', 104, ESTADO_CASO.ASIGNADO, ESTADO_CASO.RESUELTO, 'Se confirmó actualización de correo'),
    audit(1, 'admin', 'RECHAZAR_EVIDENCIA', 'UsuarioReto', 604, ESTADO_EVIDENCIA.COMPLETADO, ESTADO_EVIDENCIA.RECHAZADO, 'La evidencia no demuestra el resultado solicitado'),
  ];

  const notifications = [
    notif(2, 'Tus evidencias pendientes', 'La IA resolvió tu caso: comprime la imagen a menos de 8 MB para enviar tu evidencia.', 'SOPORTE', 101, false, 40),
    notif(2, 'Reto aprobado 🎉', 'Tu evidencia del reto "Separa tus residuos" fue aprobada.', 'RETO_APROBADO', 601, false, 30),
    notif(3, 'Caso escalado', 'Tu reporte de contenido fue escalado a un administrador humano.', 'CASO_ESCALADO', 102, false, 65),
    notif(4, 'Reto aprobado 🎉', 'Tu evidencia del reto "Movilidad sostenible" fue aprobada.', 'RETO_APROBADO', 603, false, 1500),
    notif(2, 'Reto rechazado', 'Tu evidencia del reto "Planta un árbol" fue rechazada. Revisa el motivo.', 'RETO_RECHAZADO', 604, true, 6000),
    notif(1, 'Nuevo caso escalado', 'maria.lopez escaló un caso: "No puedo subir la evidencia de mi reto de reciclaje".', 'CASO_ESCALADO', 101, false, 60),
    notif(5, 'Nuevo caso asignado', 'Se te asignó el caso #104 de maria.lopez.', 'CASO_ASIGNADO', 104, true, 300),
  ];

  return {
    users, admins, cases, messages, reports, evidence, audit: auditSeed, notifications,
    settings: {
      advertenciaContenido:
        'Su contenido fue revisado y se determinó que incumple las reglas de la comunidad. Por favor evite repetir este comportamiento para no afectar la experiencia de otros usuarios.',
      terminosSoporte:
        'Antes de continuar, debes aceptar que esta conversación podrá ser almacenada y revisada con fines de seguridad, soporte, moderación y resolución del problema.',
    },
  };
}

function evaluacionImg(n) {
  const colores = ['#2E7D32', '#00695C', '#1B5E20', '#558B2F'];
  return { url: placeholderImg(String(n), colores[n % colores.length]), tipo: 'imagen', nombre: `evidencia_${n}.jpg` };
}

function audit(id, actor, accion, entidadTipo, entidadId, anterior, nuevo, motivo) {
  return { id, actor, accion, entidadTipo, entidadId, estadoAnterior: anterior, estadoNuevo: nuevo, motivo, fecha: iso(id * 40) };
}

function notif(usuarioId, titulo, mensaje, tipo, refId, leida, offsetMin) {
  return { id: nextId(), usuarioId, titulo, mensaje, tipo, leida, fecha: iso(offsetMin), referenciaTipo: 'CASO', referenciaId: refId };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Núcleo de la base de datos demo
 * ──────────────────────────────────────────────────────────────────────── */

let db = null;

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : seed();
  } catch {
    db = seed();
  }
  db.settings = db.settings ?? seed().settings;
  if (!Array.isArray(db.notifications) || db.notifications.length === 0) db.notifications = seed().notifications;
  return db;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('No se pudo persistir el estado demo', e);
  }
  window.dispatchEvent(new CustomEvent('er.db:change'));
}

export function resetDb() {
  db = null;
  localStorage.removeItem(KEY);
  load();
  save();
}

/* ─── Consultas ─────────────────────────────────────────────────────────── */

export function getUsuarios() {
  return load().users;
}

export function getAdmins() {
  return load().admins;
}

export function getUsuariosRol(rol) {
  return load().users.filter((u) => u.rol === rol);
}

export function getCasos(filtros = {}) {
  let lista = [...load().cases];
  if (filtros.usuarioId) lista = lista.filter((c) => c.usuarioId === filtros.usuarioId);
  if (filtros.estado) lista = lista.filter((c) => c.estado === filtros.estado);
  if (filtros.estados?.length) lista = lista.filter((c) => filtros.estados.includes(c.estado));
  if (filtros.prioridad) lista = lista.filter((c) => c.prioridad === filtros.prioridad);
  if (filtros.categoria) lista = lista.filter((c) => c.categoria === filtros.categoria);
  if (filtros.q) {
    const q = filtros.q.toLowerCase();
    lista = lista.filter((c) =>
      (c.titulo?.toLowerCase() || '').includes(q) ||
      (c.usuarioNombre?.toLowerCase() || '').includes(q) ||
      String(c.id).includes(q),
    );
  }
  return lista.sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));
}

export function getCaso(id) {
  return load().cases.find((c) => c.id === Number(id)) ?? null;
}

export function getMensajes(casoId) {
  return load().messages
    .filter((m) => m.casoId === Number(casoId))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function getReportes(filtros = {}) {
  let lista = [...load().reports];
  if (filtros.estado) lista = lista.filter((r) => r.estado === filtros.estado);
  if (filtros.categoria) lista = lista.filter((r) => r.categoria === filtros.categoria);
  if (filtros.q) {
    const q = filtros.q.toLowerCase();
    lista = lista.filter((r) =>
      (r.usuarioNombre?.toLowerCase() || '').includes(q) ||
      (r.descripcion?.toLowerCase() || '').includes(q),
    );
  }
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getEvidencias(filtros = {}) {
  let lista = [...load().evidence];
  if (filtros.estado) lista = lista.filter((e) => e.estado === filtros.estado);
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getAudit() {
  return [...load().audit].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getNotificaciones(usuarioId) {
  return load().notifications
    .filter((n) => n.usuarioId === Number(usuarioId))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export function getSettings() {
  return load().settings;
}

/* ─── Mutaciones ────────────────────────────────────────────────────────── */

export function crearCaso({ usuarioId, usuarioNombre, titulo, descripcion, categoria }) {
  const c = load();
  const caso = {
    id: nextId(),
    usuarioId,
    usuarioNombre,
    titulo,
    descripcion,
    categoria: categoria || CATEGORIA_CASO.OTRO,
    prioridad: PRIORIDAD.NORMAL,
    estado: ESTADO_CASO.NUEVO,
    consentimiento: true,
    fechaConsentimiento: iso(),
    adminId: null,
    motivoEscalamiento: null,
    resolucion: null,
    notasInternas: '',
    fechaCreacion: iso(),
    fechaActualizacion: iso(),
    fechaCierre: null,
  };
  c.cases.unshift(caso);
  c.messages.push(mensaje(caso.id, TIPO_REMITENTE.USUARIO, descripcion || titulo, 0));
  c.audit.push(audit(caso.id, 'IA', 'CREAR_CASO', 'SupportCase', caso.id, null, ESTADO_CASO.NUEVO, 'Apertura automática por chat IA'));
  save();
  return caso;
}

export function actualizarCaso(id, cambios) {
  const c = load();
  const caso = c.cases.find((x) => x.id === Number(id));
  if (!caso) return null;
  Object.assign(caso, cambios, { fechaActualizacion: iso() });
  if (cambios.estado === ESTADO_CASO.CERRADO || cambios.estado === ESTADO_CASO.RESUELTO) {
    caso.fechaCierre = iso();
  }
  save();
  return caso;
}

/** Registra un mensaje. Si remitente es IA/ADMIN se autocompleta leido=true. */
export function agregarMensaje(casoId, { remitente, contenido, adjuntos = [], sugerencias = [] }) {
  const c = load();
  const m = mensaje(casoId, remitente, contenido, 0, adjuntos, sugerencias);
  m.leido = remitente === TIPO_REMITENTE.USUARIO ? false : true;
  c.messages.push(m);
  actualizarCaso(casoId, {}); // toca fechaActualización
  return m;
}

export function crearReporte({ usuarioId, usuarioNombre, categoria, descripcion, evidencia, prioridad, casoId, motivoEscalamiento }) {
  const c = load();
  const reporte = {
    id: nextId(),
    usuarioId,
    usuarioNombre,
    categoria,
    descripcion,
    evidencia: evidencia || '',
    fecha: iso(),
    prioridad,
    estado: ESTADO_REPORTE.PENDIENTE,
    casoId: casoId ?? null,
    motivoEscalamiento: motivoEscalamiento ?? null,
    accion: null,
    adminId: null,
  };
  c.reports.unshift(reporte);
  c.audit.push(audit(reporte.id, 'IA', 'CREAR_REPORTE', 'Denuncia', reporte.id, null, ESTADO_REPORTE.PENDIENTE, 'Reporte generado desde chat IA'));
  save();
  return reporte;
}

export function resolverReporte(id, { accion, adminId, adminNombre, estado }) {
  const c = load();
  const r = c.reports.find((x) => x.id === Number(id));
  if (!r) return null;
  r.accion = accion || (estado === ESTADO_REPORTE.DESCARTADA ? 'SIN_ACCION' : r.accion);
  r.adminId = adminId ?? r.adminId;
  r.estado = estado || ESTADO_REPORTE.RESUELTA;
  c.audit.push(audit(r.id, adminNombre || 'admin', estado === ESTADO_REPORTE.DESCARTADA ? 'DESCARTAR_REPORTE' : 'RESOLVER_REPORTE', 'Denuncia', r.id, ESTADO_REPORTE.PENDIENTE, r.estado, `Acción: ${r.accion}`));
  save();
  return r;
}

export function actualizarEvidencia(id, estado, motivoRechazo) {
  const c = load();
  const e = c.evidence.find((x) => x.id === Number(id));
  if (!e) return null;
  e.estado = estado;
  if (motivoRechazo !== undefined) e.motivoRechazo = motivoRechazo;
  c.audit.push(audit(e.id, 'admin', estado === 'COMPLETADO' ? 'APROBAR_EVIDENCIA' : 'RECHAZAR_EVIDENCIA', 'UsuarioReto', e.id, null, estado, motivoRechazo || ''));
  save();
  return e;
}

export function agregarAdmin({ nombre, correo }) {
  const c = load();
  if (c.admins.some((a) => a.correo.toLowerCase() === correo.toLowerCase())) return null;
  const id = nextId();
  const nuevo = {
    id,
    nombre,
    correo,
    estado: 'ACTIVO',
    rol: 'ADMIN',
    fechaCreacion: iso(),
    ultimaActividad: iso(),
  };
  c.admins.push(nuevo);
  c.audit.push(audit(id, 'admin', 'AGREGAR_ADMIN', 'Usuario', id, null, 'ADMIN', `Nuevo administrador: ${correo}`));
  save();
  return nuevo;
}

export function setAdminEstado(id, estado) {
  const c = load();
  const a = c.admins.find((x) => x.id === Number(id));
  if (a) {
    a.estado = estado;
    save();
  }
  return a;
}

export function agregarNotificacion({ usuarioId, titulo, mensaje, tipo, refId }) {
  const c = load();
  c.notifications.push(notif(usuarioId, titulo, mensaje, tipo, refId, false, 0));
  save();
}

export function marcarNotificaciones(usuarioId) {
  const c = load();
  c.notifications.forEach((n) => {
    if (n.usuarioId === Number(usuarioId)) n.leida = true;
  });
  save();
}

export function marcarNotificacion(id) {
  const c = load();
  const n = c.notifications.find((x) => x.id === Number(id));
  if (n) {
    n.leida = true;
    save();
  }
  return n;
}

export function actualizarSettings(cambios) {
  const c = load();
  Object.assign(c.settings, cambios);
  save();
}