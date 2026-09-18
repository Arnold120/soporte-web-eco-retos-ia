/**
 * Motor de IA (MODO DEMO).
 *
 * Motor de reglas que simula el razonamiento de la IA real: clasifica,
 * pregunta, pide evidencia, resuelve casos sencillos y decide cuándo escalar
 * a un administrador humano. Devuelve además `sugerencias` (respuestas
 * rápidas) para guiar al usuario.
 *
 * En la integración real la decisión la toma un LLM orquestado desde el
 * backend; este archivo solo define el CONTRATO de la respuesta para que el
 * chat no cambie.
 */
import { CATEGORIA_CASO, ESTADO_CASO, PRIORIDAD } from '../utils/states.js';
import { placeholderImg } from '../utils/format.js';

const CLAVES_ESCALAR = [
  'hablar con un humano', 'hablar con alguien', 'persona real', 'administrador',
  'urgente', 'grave', 'seguridad', 'amenaza', 'suplantacion', 'suplantar',
  'hack', 'hackear', 'robar', 'robo', 'estafa', 'fraude', 'extorsion',
  'phishing', 'enlace sospechoso', 'doble cobro', 'cobro indebido', 'reclamo',
  'banearon', 'me banearon', 'bloquearon mi cuenta', 'no puedo entrar a mi cuenta',
];

const CLAVES_GRAVES = [
  '+18', '18+', 'contenido para adultos', 'pornografico', 'pornografia',
  'inapropiado', 'acoso', 'acoso sexual', 'bullying', 'ofensivo', 'violencia',
  'desnudo', 'desnuda', 'fotografia inapropiada', 'video inapropiado',
  'enlace inapropiado', 'discurso de odio', 'gore',
];

const CLAVES_CONFIRMACION = [
  'ya funciona', 'se resolvio', 'se soluciono', 'solucionado', 'resuelto',
  'ya quedo', 'ya quedó', 'ya pude', 'funciono', 'funcionó', 'perfecto, gracias',
  'muchas gracias', 'listo, gracias', 'todo bien',
];

const CLAVES_PERSISTE = [
  'sigue', 'sigue fallando', 'no funciona', 'no me funciona', 'persiste',
  'otra vez', 'de nuevo', 'no se arreglo', 'no se arregló', 'sigue igual',
  'no sirvio', 'no sirvió', 'sin solucion', 'mismo error', 'mismo problema',
];

const CLAVES_EVIDENCIA = [
  'adjunto', 'adjunte', 'adjunté', 'esta es la captura', 'captura', 'foto',
  'imagen', 'archivo', 'evidencia', 'mira', 'te envio', 'te envío',
];

const CLAVES_DINERO = ['moneda', 'monedas', 'monedero', 'saldo', 'puntos', 'recompensa', 'compra', 'pago'];
const CLAVES_CUENTA = ['correo', 'contrasena', 'contraseña', 'login', 'cuenta', 'sesion', 'sesión', 'password', 'email', 'registrar'];
const CLAVES_CONTENIDO = ['reportar', 'reporte', 'publicacion', 'publicación', 'muro', 'comunidad', 'contenido', 'denuncia', 'comentario', 'usuario'];
const CLAVES_RETO = ['reto', 'retos', 'evidencia', 'rechazado', 'aprobado', 'residuo', 'recicla', 'trivia', 'pregunta', 'quiz', 'insignia', 'racha'];
const CLAVES_ERROR_TECNICO = ['error', 'falla', 'bug', 'cierra', 'crash', 'no abre', 'no carga', 'pantalla', 'se queda', 'actualizacion', 'actualización', 'version', 'versión'];

function contiene(texto, lista) {
  const t = texto.toLowerCase();
  return lista.some((k) => t.includes(k));
}

function clasificar(texto) {
  const t = texto.toLowerCase();
  if (/(reto|retos|evidencia|evidencias|insignia|racha|trivia|quiz|reto de|complete|completé)/.test(t)) {
    return CATEGORIA_CASO.RETO;
  }
  if (/(reportar|reporte|publicacion|publicación|muro|comunidad|denuncia|comentario)/.test(t)) {
    return CATEGORIA_CASO.CONTENIDO;
  }
  if (contiene(t, CLAVES_DINERO)) return CATEGORIA_CASO.MONEDERO;
  if (contiene(t, CLAVES_CUENTA)) return CATEGORIA_CASO.CUENTA;
  if (contiene(t, CLAVES_ERROR_TECNICO)) return CATEGORIA_CASO.OTRO;
  return CATEGORIA_CASO.OTRO;
}

function prioridadDe(categoria, escalar) {
  if (escalar) return PRIORIDAD.URGENTE;
  if (categoria === CATEGORIA_CASO.CONTENIDO) return PRIORIDAD.ALTA;
  return PRIORIDAD.NORMAL;
}

const preguntas = {
  [CATEGORIA_CASO.RETO]: {
    primera:
      '¡Gracias por escribirnos! Voy a ayudarte con tu reto. ¿Qué reto estabas realizando y qué ocurre exactamente al completarlo o enviar la evidencia?',
    segunda:
      'Entiendo. ¿Puedes adjuntar una captura donde se vea el error o la evidencia que enviaste? Con eso reviso con precisión qué pasó.',
  },
  [CATEGORIA_CASO.CONTENIDO]: {
    primera:
      'Gracias por cuidar la comunidad. ¿Qué tipo de contenido deseas reportar? (contenido +18, acoso, violencia, enlace sospechoso, otro)',
    segunda:
      '¿Puedes adjuntar una captura del contenido? No es obligatorio, pero ayuda a que el equipo de moderación lo revise más rápido.',
  },
  [CATEGORIA_CASO.MONEDERO]: {
    primera:
      'Voy a revisarlo contigo. ¿El reto figura como "Completado" en tu lista o sigue "En revisión" cuando no te llegan las monedas?',
    segunda:
      '¿Hace cuánto completaste la actividad? Las monedas se acreditan automáticamente hasta 24 horas después de la aprobación.',
  },
  [CATEGORIA_CASO.CUENTA]: {
    primera:
      'Claro, te ayudo con tu cuenta. ¿Qué necesitas exactamente? (cambiar correo, recuperar contraseña, desbloquear cuenta, otro)',
    segunda:
      '¿Ya intentaste hacerlo desde Configuración en la app? Cuéntame qué mensaje o error aparece exactamente.',
  },
  [CATEGORIA_CASO.OTRO]: {
    primera:
      'Entiendo. Para ubicar el problema: ¿en qué momento ocurre y en qué dispositivo lo usas? (Android, iPhone o web)',
    segunda:
      '¿La app está actualizada a la última versión? ¿Te aparece algún mensaje de error? Si puedes, adjunta una captura.',
  },
};

const respuestasResueltas = {
  [CATEGORIA_CASO.MONEDERO]:
    'Con lo que me cuentas puedo resolverlo: las monedas se acreditan automáticamente dentro de las 24 horas posteriores a la aprobación del reto. Si después de ese tiempo no aparecen, escribe de nuevo aquí y lo escalamos a un administrador.',
  [CATEGORIA_CASO.CUENTA]:
    'Puedo guiarte: cambia tu correo o contraseña desde Configuración → "Nombre de usuario y correo" o "Cambiar contraseña". Si no recuerdas tu contraseña, usa "Olvidé mi contraseña" en la pantalla de inicio de sesión.',
};

const sugerenciasPorCategoria = {
  [CATEGORIA_CASO.RETO]: ['📎 Adjuntar captura', 'No me deja enviar la evidencia', 'El reto no me aparece'],
  [CATEGORIA_CASO.CONTENIDO]: ['📎 Adjuntar captura', 'Es contenido +18', 'Es acoso o violencia'],
  [CATEGORIA_CASO.MONEDERO]: ['Completé el reto', 'Sigue en revisión', 'No me llegaron las monedas'],
  [CATEGORIA_CASO.CUENTA]: ['Quiero cambiar mi correo', 'Olvidé mi contraseña', 'No puedo iniciar sesión'],
  [CATEGORIA_CASO.OTRO]: ['📎 Adjuntar captura', 'La app se cierra', 'Es un error de la app'],
};

export function IA_NOMBRE() {
  return 'Asistente Eco-Retos';
}

/**
 * Procesa la entrada del usuario y decide la siguiente acción de la IA.
 * @returns {Promise<{mensajeIA:string, estado:string, categoria:string,
 *   prioridad:string, crearReporte:boolean, escalar:boolean, resolver:boolean,
 *   motivoEscalamiento?:string, sugerencias:string[]}>}
 */
export async function analizar(input) {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));

  const texto = (input.texto || '').trim();
  const adjuntos = input.adjuntos || [];
  const n = input.cantidadMensajesUsuario || 1;
  const casoPrevio = typeof input.caso === 'object' ? input.caso : null;

  const grave = contiene(texto, CLAVES_GRAVES) || contiene(texto, CLAVES_ESCALAR);
  const confirmacion = contiene(texto, CLAVES_CONFIRMACION);
  const persiste = contiene(texto, CLAVES_PERSISTE);
  const mencionaEvidencia = contiene(texto, CLAVES_EVIDENCIA) || adjuntos.length > 0;

  // La categoría elegida por el usuario al crear el caso manda; la detección
  // automática solo se usa si el caso no tiene una o si el reporte es grave.
  const detectada = clasificar(texto);
  const categoria = casoPrevio?.categoria && !grave ? casoPrevio.categoria : detectada;
  const yaResuelto = [
    ESTADO_CASO.RESUELTO_POR_IA,
    ESTADO_CASO.RESUELTO,
  ].includes(casoPrevio?.estado);

  /* 1. El usuario confirma que se solucionó. */
  if (confirmacion && !grave) {
    return {
      mensajeIA:
        '¡Qué bueno saberlo! 🌱 Marco el caso como resuelto. Si el problema vuelve a aparecer, puedes abrir una nueva conversación y te ayudamos de inmediato.',
      estado: ESTADO_CASO.RESUELTO_POR_IA,
      categoria,
      prioridad: prioridadDe(categoria, false),
      crearReporte: false,
      escalar: false,
      resolver: true,
      sugerencias: ['¡Gracias!', 'Tengo otro problema'],
    };
  }

  /* 2. Caso grave o petición explícita de humano → escalar y crear reporte. */
  if (grave) {
    const esContenidoGrave = contiene(texto, CLAVES_GRAVES);
    const motivo = esContenidoGrave
      ? 'Reporte grave detectado por la IA (posible contenido inapropiado). Requiere moderación humana.'
      : 'El usuario solicitó intervención humana tras el diagnóstico de la IA.';

    return {
      mensajeIA: esContenidoGrave
        ? 'Esto es importante y requiere revisión humana. He creado un reporte estructurado y escalado tu caso a un administrador, que lo revisará lo antes posible. Te notificaremos el resultado.'
        : 'Entiendo, voy a escalar tu caso a un administrador humano para que te atienda personalmente. He dejado todo el contexto del problema en el reporte. Te responderán por aquí.',
      estado: ESTADO_CASO.ESCALADO,
      categoria,
      prioridad: PRIORIDAD.URGENTE,
      crearReporte: true,
      escalar: true,
      resolver: false,
      motivoEscalamiento: motivo,
      sugerencias: ['Gracias, espero respuesta'],
    };
  }

  /* 3. El problema sigue después de haber intentado resolverlo → escalar. */
  if (persiste && (yaResuelto || n >= 3)) {
    return {
      mensajeIA:
        'Comprendo que el problema continúa. Como ya intentamos la solución y sigue ocurriendo, lo escalo a un administrador para que lo revise a fondo. Te avisaremos por aquí.',
      estado: ESTADO_CASO.ESCALADO,
      categoria,
      prioridad: prioridadDe(categoria, false),
      crearReporte: true,
      escalar: true,
      resolver: false,
      motivoEscalamiento: 'La solución propuesta por la IA no funcionó; requiere revisión humana.',
      sugerencias: ['Gracias'],
    };
  }

  /* 4. Primer mensaje → pregunta de diagnóstico. */
  if (n === 1) {
    return {
      mensajeIA: preguntas[categoria].primera,
      estado: ESTADO_CASO.IA_ATENDIENDO,
      categoria,
      prioridad: prioridadDe(categoria, false),
      crearReporte: false,
      escalar: false,
      resolver: false,
      sugerencias: sugerenciasPorCategoria[categoria],
    };
  }

  /* 5. Segundo mensaje. */
  if (n === 2) {
    if (adjuntos.length || mencionaEvidencia) {
      return {
        mensajeIA:
          'Recibí tu información ✔️ Voy a revisarla. Si el problema no puede resolverse automáticamente, lo escalaré a un administrador con toda la evidencia adjunta.',
        estado: ESTADO_CASO.EN_REVISION,
        categoria,
        prioridad: prioridadDe(categoria, false),
        crearReporte: false,
        escalar: false,
        resolver: false,
        sugerencias: ['Gracias', 'Sigue sin funcionar'],
      };
    }
    if (respuestasResueltas[categoria]) {
      return {
        mensajeIA: `${respuestasResueltas[categoria]} ¿Te sirvió esta información?`,
        estado: ESTADO_CASO.RESUELTO_POR_IA,
        categoria,
        prioridad: prioridadDe(categoria, false),
        crearReporte: false,
        escalar: false,
        resolver: true,
        sugerencias: ['Sí, gracias ✔️', 'No, sigue igual'],
      };
    }
    return {
      mensajeIA: preguntas[categoria].segunda,
      estado: ESTADO_CASO.IA_ATENDIENDO,
      categoria,
      prioridad: prioridadDe(categoria, false),
      crearReporte: false,
      escalar: false,
      resolver: false,
      sugerencias: sugerenciasPorCategoria[categoria],
    };
  }

  /* 6. Mensajes siguientes → escalar con contexto. */
  const motivo =
    categoria === CATEGORIA_CASO.RETO
      ? 'El usuario necesita validación de la evidencia o del reto, algo que solo puede hacer un humano.'
      : 'La IA no pudo resolver el problema con la información disponible; requiere intervención humana.';

  return {
    mensajeIA:
      'He agotado las alternativas que puedo resolver por aquí. Voy a escalar tu caso a un administrador humano con todo el historial para darte una solución definitiva. Gracias por tu paciencia.',
    estado: ESTADO_CASO.ESCALADO,
    categoria,
    prioridad: prioridadDe(categoria, false),
    crearReporte: true,
    escalar: true,
    resolver: false,
    motivoEscalamiento: motivo,
    sugerencias: ['Gracias'],
  };
}

/** Resumen que se guarda como reporte estructurado cuando la IA lo crea. */
export function construirReporte({ caso, categoria, prioridad, motivo, adjuntos }) {
  return {
    usuarioId: caso.usuarioId,
    usuarioNombre: caso.usuarioNombre,
    categoria: categoria || caso.categoria,
    descripcion: caso.descripcion || caso.titulo,
    evidencia: adjuntos?.[0]?.url || '',
    fecha: new Date().toISOString(),
    prioridad,
    casoId: caso.id,
    motivoEscalamiento: motivo,
  };
}
