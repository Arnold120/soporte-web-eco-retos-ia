/**
 * Servicio de autenticación.
 *
 * MODO DEMO: el "login" local selecciona un usuario de ejemplo.
 * MODO REAL: llama a POST /api/Auth/login (ya existe en el backend) y
 * guarda el JWT que devuelve { token, expiraEn, usuario }.
 *
 * También admite auto-login con token externo (la app Flutter puede abrir
 * la web con ?token=JWT) y detecta sesiones expiradas.
 */
import { DEMO_MODE, ENDPOINTS } from '../api/config.js';
import { httpRequest, ApiError } from '../api/httpClient.js';
import { getUsuarios } from '../api/mockDb.js';
import { sesionDesdeToken, tokenExpirado, decodificarJwt, rolesDeJwt } from '../utils/jwt.js';

const SESION_KEY = 'er_sesion_v1';

export const rolesValidos = (roles) => (Array.isArray(roles) ? roles : []);

export function sesionGuardada() {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    // Sesión real expirada (en demo el token falso no expira).
    if (!DEMO_MODE && sesion?.token && tokenExpirado(sesion.token)) {
      cerrarSesion();
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  localStorage.setItem('er_token', sesion?.token ?? '');
}

export function cerrarSesion() {
  localStorage.removeItem(SESION_KEY);
  localStorage.removeItem('er_token');
}

/** Autentica un usuario contra el backend o el modo demo. */
export async function login({ correo, contrasena }) {
  if (DEMO_MODE) return loginDemo(correo, contrasena);
  return conectarLoginReal({ correo, contrasena });
}

/** Inicia sesión usando un JWT ya emitido (auto-login ?token=...). */
export async function loginConToken(token) {
  if (!token || tokenExpirado(token)) return null;
  const sesion = sesionDesdeToken(token);

  // Si el JWT no trae los roles, se completan llamando al backend real.
  if (!DEMO_MODE && sesion && sesion.usuario.roles.length === 0) {
    try {
      const payload = decodificarJwt(token);
      sesion.usuario.roles = rolesDeJwt(payload);
    } catch {
      /* sin roles: se resolverá al pedir datos */
    }
  }
  if (sesion?.usuario?.id == null && !DEMO_MODE) return null;
  if (sesion) guardarSesion(sesion);
  return sesion;
}

/**
 * Canjea un código de un solo uso emitido por el backend (abierto desde Flutter
 * con ?codigo=...). Devuelve una sesión real sin exponer el JWT en la URL.
 */
export async function loginConCodigo(codigo) {
  if (!codigo) return null;
  if (DEMO_MODE) {
    // En demo no existe el canje: se ignora y se pedirá login manual.
    return null;
  }
  const res = await httpRequest({
    url: ENDPOINTS.soporte.sesionCanjear,
    method: 'POST',
    body: { codigo },
  });
  const datos = res.data ?? {};
  const usuario = datos.usuario ?? {};
  const sesion = {
    token: datos.token ?? '',
    expiraEn: datos.expiraEn ?? null,
    usuario: {
      id: usuario.usuarioId ?? usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      roles: rolesValidos(usuario.roles),
    },
  };
  guardarSesion(sesion);
  return sesion;
}

async function loginDemo(correo, contrasena) {
  await new Promise((r) => setTimeout(r, 600));
  const usuario = getUsuarios().find(
    (u) => u.correo && u.correo.toLowerCase() === correo.trim().toLowerCase(),
  );
  if (!usuario || !contrasena) {
    throw new ApiError(401, 'Credenciales incorrectas o usuario inactivo.');
  }
  if (!usuario.activo) {
    throw new ApiError(403, 'Tu cuenta está inactiva. Contacta con soporte.');
  }
  const token = `demo.${btoa(JSON.stringify({ sub: usuario.id, rol: usuario.rol }))}.firma`;
  const sesion = {
    token,
    expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    usuario: {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      roles: [usuario.rol],
    },
  };
  guardarSesion(sesion);
  return sesion;
}

async function conectarLoginReal({ correo, contrasena }) {
  const res = await httpRequest({
    url: ENDPOINTS.auth.login,
    method: 'POST',
    body: { correo: correo.trim().toLowerCase(), contrasena },
  });

  // Contrato real: { token, expiraEn, usuario: { usuarioId, nombreUsuario, correo, roles } }.
  const datos = res.data ?? res;
  const usuario = datos.usuario ?? datos;
  const sesion = {
    token: datos.token ?? datos.accessToken ?? '',
    expiraEn: datos.expiraEn ?? null,
    usuario: {
      id: usuario.usuarioId ?? usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      roles: rolesValidos(usuario.roles),
    },
  };
  guardarSesion(sesion);
  return sesion;
}

/** Acepta la sesión demo sin validar credenciales (botones de demo). */
export async function entrarDemo(tipo) {
  const correoBase = tipo === 'ADMIN' ? 'admin@gmai.com' : 'maria@eco-retos.test';
  return login({ correo: correoBase, contrasena: 'demo' });
}
