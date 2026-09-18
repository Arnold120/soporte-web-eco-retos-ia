/** Utilidades para leer JWT del backend (sin librerías externas). */

const CLAIM_ROL = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
];
const CLAIM_NOMBRE = [
  'unique_name',
  'name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
];
const CLAIM_CORREO = [
  'email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
];
const CLAIM_ID = [
  'nameid',
  'sub',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
];

function primero(payload, claves) {
  for (const k of claves) {
    if (payload?.[k] !== undefined && payload?.[k] !== null) return payload[k];
  }
  return undefined;
}

export function decodificarJwt(token) {
  try {
    const parte = String(token).split('.')[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function rolesDeJwt(payload) {
  const raw = primero(payload, CLAIM_ROL);
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/** Construye una sesión local a partir de un JWT (auto-login por URL). */
export function sesionDesdeToken(token) {
  const payload = decodificarJwt(token);
  if (!payload) return null;
  const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
  return {
    token,
    expiraEn: exp,
    usuario: {
      id: Number(primero(payload, CLAIM_ID)) || null,
      nombreUsuario: primero(payload, CLAIM_NOMBRE) || 'Usuario',
      correo: primero(payload, CLAIM_CORREO) || '',
      roles: rolesDeJwt(payload),
    },
  };
}

export function tokenExpirado(token) {
  const payload = decodificarJwt(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}
