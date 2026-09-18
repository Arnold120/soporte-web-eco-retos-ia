/**
 * Utilidades de medios.
 *
 * El backend guarda a veces rutas relativas (/api/Imagenes/archivo/...) y, en
 * despliegues detrás de proxy, URLs http. La web se sirve por https, por lo que
 * hay que:
 *   1. Convertir rutas relativas a absolutas usando VITE_API_BASE_URL.
 *   2. Elevar http -> https cuando la página es https (evita contenido mixto).
 */
import { API_BASE_URL } from '../api/config.js';

const EXT_VIDEO = /\.(mp4|mov|webm|m4v)(\?.*)?$/i;
const EXT_IMAGEN = /\.(png|jpe?g|webp|gif)(\?.*)?$/i;
const URL_REGEX = /https?:\/\/[^\s,;]+/gi;

export function resolverUrlArchivo(url) {
  if (!url) return '';
  const texto = String(url).trim();
  if (!texto) return '';
  if (texto.startsWith('data:') || texto.startsWith('blob:')) return texto;

  if (/^https?:\/\//i.test(texto)) {
    // Contenido mixto: nunca cargar http dentro de una página https.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && texto.startsWith('http://')) {
      return `https://${texto.slice('http://'.length)}`;
    }
    return texto;
  }

  if (!API_BASE_URL) return texto;
  return `${API_BASE_URL}${texto.startsWith('/') ? '' : '/'}${texto}`;
}

export function esVideoUrl(url = '') {
  return EXT_VIDEO.test(String(url));
}

export function esImagenUrl(url = '') {
  const texto = String(url);
  return EXT_IMAGEN.test(texto) || texto.startsWith('data:image');
}

function clasificar(url, resultado) {
  const limpia = url.trim().replace(/[.,;)\]]+$/, '');
  if (!limpia) return;
  if (esVideoUrl(limpia)) {
    if (!resultado.videos.includes(limpia)) resultado.videos.push(limpia);
    return;
  }
  if (esImagenUrl(limpia)) {
    if (!resultado.imagenes.includes(limpia)) resultado.imagenes.push(limpia);
    return;
  }
  if (!resultado.enlaces.includes(limpia)) resultado.enlaces.push(limpia);
}

/**
 * Interpreta el campo UsuarioReto.Evidencia real:
 *
 *   Cantidad: 3
 *   Comentario: texto libre
 *   Fotos: https://..., https://...
 *
 * Devuelve texto, adjuntos clasificados y URLs ya resueltas.
 */
export function parsearEvidencia(cruda) {
  const resultado = { texto: '', imagenes: [], videos: [], enlaces: [], adjuntos: [] };
  if (!cruda) return resultado;

  const lineas = String(cruda).replace(/\r\n/g, '\n').split('\n');
  const partesTexto = [];

  for (const lineaOriginal of lineas) {
    const linea = lineaOriginal.trim();
    if (!linea) continue;

    const esLineaFotos = /^fotos\s*:/i.test(linea);
    const contenido = esLineaFotos ? linea.replace(/^fotos\s*:/i, '').trim() : linea;

    const urls = contenido.match(URL_REGEX) ?? [];
    urls.forEach((u) => clasificar(u, resultado));

    const sinUrls = contenido.replace(URL_REGEX, '').trim().replace(/^[\s,;-]+|[\s,;-]+$/g, '');
    if (!esLineaFotos && sinUrls) partesTexto.push(sinUrls);
  }

  resultado.texto = partesTexto.join('\n').trim();
  resultado.adjuntos = [
    ...resultado.imagenes.map((url) => ({ url: resolverUrlArchivo(url), tipo: 'imagen', nombre: 'evidencia' })),
    ...resultado.videos.map((url) => ({ url: resolverUrlArchivo(url), tipo: 'video', nombre: 'evidencia' })),
  ];
  return resultado;
}
